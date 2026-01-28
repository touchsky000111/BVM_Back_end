import express from "express";
import { askOpenAI } from "../../openai.js";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import {
  getBCToken,
  getBCCompanies,
  getBCItem,
  getBCCustomer,
  getBCItemsMin,
  getBCCustomersMin,
  getBCItemCategoriesMin,
  getBCUnitsOfMeasureMin,
  getBCSalesInvoicesMin,
  getBCPurchaseInvoicesMin,
  getBCItemPicture,
  getBCCustomerPicture,
} from "../bc/bcApi.js";
import "isomorphic-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

function safeParseFirstJsonObject(text) {
  const jsonMatch = typeof text === "string" ? text.match(/\{[\s\S]*\}/) : null;
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// Classify user query into the 11 Business Central intents.
async function classifyQuery(query) {
  const analysisPrompt = `You classify a user query into Business Central data intents and whether email inbox data is required.

Query: "${query}"

Choose bestFit from this list (exact strings):
1. Get Companies
2. Get Products/Items
3. Get Single Product
4. Get Customers
5. Get Single Customer
6. Get Item Categories
7. Get Units of Measure
8. Get Sales Invoices
9. Get Purchase Invoices
10. Get Product Picture
11. Get Customer Picture

Return ONLY JSON with keys:
- bestFit: one of the exact strings above
- needsInbox: boolean (true if user asks about emails/inbox/messages/communication, OR if bestFit is "4. Get Customers" or "5. Get Single Customer" - these automatically fetch inboxes)
- needsUsers: boolean (true if query references people/users/staff, or if needsInbox is true to identify mailbox owners)
- specificUserNames: string[] extracted from query ([] if none)
- companyHint: string | null (company name mentioned, if any)
- itemHint: string | null (item number/name mentioned, if any)
- customerHint: string | null (customer number/name mentioned, if any)
- limits: { topCompanies: number, topRecords: number } with small numbers (e.g. 5 and 25)

Example: {"bestFit":"8. Get Sales Invoices","needsInbox":false,"needsUsers":false,"specificUserNames":[],"companyHint":null,"itemHint":null,"customerHint":"Trey","limits":{"topCompanies":3,"topRecords":25}}`;

  try {
    const response = await askOpenAI(analysisPrompt);
    const parsed = safeParseFirstJsonObject(response);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON from classifier");

    const limits = parsed.limits && typeof parsed.limits === "object" ? parsed.limits : {};
    const bestFit = typeof parsed.bestFit === "string" ? parsed.bestFit : "1. Get Companies";
    
    // Options 4 and 5 (Get Customers / Get Single Customer) 
    // require email inbox fetching to find communications related to those customers
    const needsInboxForCustomers = bestFit === "4. Get Customers" || 
                                   bestFit === "5. Get Single Customer";
    
    return {
      bestFit,
      needsInbox: needsInboxForCustomers || !!parsed.needsInbox,
      needsUsers: needsInboxForCustomers || !!parsed.needsUsers, // Also need users to fetch their inboxes
      specificUserNames: Array.isArray(parsed.specificUserNames) ? parsed.specificUserNames.filter(Boolean) : [],
      companyHint: typeof parsed.companyHint === "string" ? parsed.companyHint : null,
      itemHint: typeof parsed.itemHint === "string" ? parsed.itemHint : null,
      customerHint: typeof parsed.customerHint === "string" ? parsed.customerHint : null,
      limits: {
        topCompanies: Number.isFinite(limits.topCompanies) ? Math.max(1, Math.min(10, limits.topCompanies)) : 3,
        topRecords: Number.isFinite(limits.topRecords) ? Math.max(1, Math.min(100, limits.topRecords)) : 25,
      },
    };
  } catch (e) {
    console.error("Error classifying query:", e);
    return {
      bestFit: "1. Get Companies",
      needsInbox: false,
      needsUsers: false,
      specificUserNames: [],
      companyHint: null,
      itemHint: null,
      customerHint: null,
      limits: { topCompanies: 3, topRecords: 25 },
    };
  }
}

// Helper function to match user names against users list
function findMatchingUsers(users, specificNames) {
  if (!specificNames || specificNames.length === 0) {
    return users; // Return all users if no specific names
  }

  const matchedUsers = [];
  const lowerNames = specificNames.map(n => n.toLowerCase().trim());

  for (const user of users) {
    const displayNameLower = user.displayName.toLowerCase();
    const mailLower = user.mail.toLowerCase();
    
    // Check if any of the specific names match the user's display name or email
    for (const name of lowerNames) {
      if (displayNameLower.includes(name) || mailLower.includes(name)) {
        matchedUsers.push(user);
        break; // Found a match, no need to check other names for this user
      }
    }
  }

  return matchedUsers.length > 0 ? matchedUsers : users; // Fallback to all users if no matches found
}

async function fetchUsersAndMaybeInbox(graphClientWithToken, { needsUsers, needsInbox, specificUserNames }) {
  if (!needsUsers && !needsInbox) return { users: [], usersEmailData: [] };

  const usersRes = await graphClientWithToken
    .api("/users")
    .select("id,displayName,mail")
    .get();
  const allUsers = usersRes.value || [];

  const users = specificUserNames?.length ? findMatchingUsers(allUsers, specificUserNames) : allUsers;

  if (!needsInbox) return { users, usersEmailData: [] };

  // Keep inbox minimal to avoid huge payloads
  const emailInboxPromises = users.map(async (user) => {
    try {
      const inboxRes = await graphClientWithToken
        .api(`/users/${user.id}/messages`)
        .top(5)
        .select("id,subject,from,receivedDateTime,bodyPreview")
        .get();
      return {
        userId: user.id,
        displayName: user.displayName,
        mail: user.mail,
        emailInbox: inboxRes.value || [],
      };
    } catch (e) {
      console.error(`Graph inbox error for user ${user.id}:`, e?.statusCode, e?.code, e?.message);
      return { userId: user.id, displayName: user.displayName, mail: user.mail, emailInbox: [] };
    }
  });

  return { users, usersEmailData: await Promise.all(emailInboxPromises) };
}

// General query endpoint
router.get("/", async (req, res) => {
  try {
    const { query } = req.query;
    console.log("query => ", query)
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Fetch access token once and reuse for all requests
    console.log("Fetching access token...");
    const credential = new ClientSecretCredential(
      process.env.TENANT_ID,
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET
    );
    const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
    const accessToken = tokenResponse.token;
    console.log("Access token fetched successfully");

    // Create a graph client with cached token
    const graphClientWithToken = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => accessToken
      }
    });

    console.log("Classifying query into best-fit option...");
    const classification = await classifyQuery(query);
    console.log("Classification:", classification);

    const { users, usersEmailData } = await fetchUsersAndMaybeInbox(graphClientWithToken, classification);

    const bc = {
      companies: [],
      bestFit: classification.bestFit,
      payload: null,
      pictures: null,
    };

    // Fetch BC data for all cases (1-11)
    try {
      const bcTenantId = process.env.BC_TENANT_ID || process.env.TENANT_ID;
      const bcClientId = process.env.BC_CLIENT_ID || process.env.CLIENT_ID;
      const bcClientSecret =
        process.env.BC_CLIENT_SECRET || process.env.BC_SECRET_KEY || process.env.CLIENT_SECRET;

      const bcAccessToken = await getBCToken(bcTenantId, bcClientId, bcClientSecret);
      const companiesAll = await getBCCompanies(bcAccessToken);
      bc.companies = companiesAll.slice(0, classification.limits.topCompanies);

      if (bc.companies.length === 0) {
        bc.payload = { error: "No companies returned from Business Central." };
      } else {
        const top = classification.limits.topRecords;

        switch (classification.bestFit) {
          case "1. Get Companies":
            bc.payload = { companies: bc.companies.map(c => ({ id: c.id, name: c.displayName || c.name })) };
            break;
          case "2. Get Products/Items": {
            const itemsByCompany = [];
            for (const company of bc.companies) {
              try {
                const items = await getBCItemsMin(bcAccessToken, company.id, { top });
                itemsByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, items });
              } catch (e) {
                console.error(`Error fetching items for company ${company.id}:`, e.message);
                itemsByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { itemsByCompany };
            break;
          }
          case "3. Get Single Product": {
            // If itemHint is an ID, try all companies. Otherwise return small lists per company.
            if (classification.itemHint && /^[0-9a-fA-F-]{12,}$/.test(classification.itemHint)) {
              const results = [];
              for (const company of bc.companies) {
                try {
                  const item = await getBCItem(bcAccessToken, company.id, classification.itemHint);
                  results.push({ companyId: company.id, companyName: company.displayName || company.name, item });
                } catch (e) {
                  // Item not found in this company, skip
                }
              }
              bc.payload = results.length > 0 ? { itemByCompany: results } : { error: "Item not found in any company", itemHint: classification.itemHint };
            } else {
              const itemsByCompany = [];
              for (const company of bc.companies) {
                try {
                  const items = await getBCItemsMin(bcAccessToken, company.id, { top: Math.min(10, top) });
                  itemsByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, items });
                } catch (e) {
                  console.error(`Error fetching items for company ${company.id}:`, e.message);
                }
              }
              bc.payload = { hint: classification.itemHint, itemsByCompany };
            }
            break;
          }
          case "4. Get Customers": {
            const customersByCompany = [];
            for (const company of bc.companies) {
              try {
                const customers = await getBCCustomersMin(bcAccessToken, company.id, { top });
                customersByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, customers });
              } catch (e) {
                console.error(`Error fetching customers for company ${company.id}:`, e.message);
                customersByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { customersByCompany };
            break;
          }
          case "5. Get Single Customer": {
            if (classification.customerHint && /^[0-9a-fA-F-]{12,}$/.test(classification.customerHint)) {
              const results = [];
              for (const company of bc.companies) {
                try {
                  const customer = await getBCCustomer(bcAccessToken, company.id, classification.customerHint);
                  results.push({ companyId: company.id, companyName: company.displayName || company.name, customer });
                } catch (e) {
                  // Customer not found in this company, skip
                }
              }
              bc.payload = results.length > 0 ? { customerByCompany: results } : { error: "Customer not found in any company", customerHint: classification.customerHint };
            } else {
              const customersByCompany = [];
              for (const company of bc.companies) {
                try {
                  const customers = await getBCCustomersMin(bcAccessToken, company.id, { top: Math.min(10, top) });
                  customersByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, customers });
                } catch (e) {
                  console.error(`Error fetching customers for company ${company.id}:`, e.message);
                }
              }
              bc.payload = { hint: classification.customerHint, customersByCompany };
            }
            break;
          }
          case "6. Get Item Categories": {
            const categoriesByCompany = [];
            for (const company of bc.companies) {
              try {
                const categories = await getBCItemCategoriesMin(bcAccessToken, company.id, { top: Math.min(100, top) });
                categoriesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, itemCategories: categories });
              } catch (e) {
                console.error(`Error fetching item categories for company ${company.id}:`, e.message);
                categoriesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { itemCategoriesByCompany: categoriesByCompany };
            break;
          }
          case "7. Get Units of Measure": {
            const uomsByCompany = [];
            for (const company of bc.companies) {
              try {
                const uoms = await getBCUnitsOfMeasureMin(bcAccessToken, company.id, { top: Math.min(100, top) });
                uomsByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, unitsOfMeasure: uoms });
              } catch (e) {
                console.error(`Error fetching units of measure for company ${company.id}:`, e.message);
                uomsByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { unitsOfMeasureByCompany: uomsByCompany };
            break;
          }
          case "8. Get Sales Invoices": {
            const invoicesByCompany = [];
            for (const company of bc.companies) {
              try {
                const invoices = await getBCSalesInvoicesMin(bcAccessToken, company.id, { top });
                invoicesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, salesInvoices: invoices });
              } catch (e) {
                console.error(`Error fetching sales invoices for company ${company.id}:`, e.message);
                invoicesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { salesInvoicesByCompany: invoicesByCompany };
            break;
          }
          case "9. Get Purchase Invoices": {
            const invoicesByCompany = [];
            for (const company of bc.companies) {
              try {
                const invoices = await getBCPurchaseInvoicesMin(bcAccessToken, company.id, { top });
                invoicesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, purchaseInvoices: invoices });
              } catch (e) {
                console.error(`Error fetching purchase invoices for company ${company.id}:`, e.message);
                invoicesByCompany.push({ companyId: company.id, companyName: company.displayName || company.name, error: e.message });
              }
            }
            bc.payload = { purchaseInvoicesByCompany: invoicesByCompany };
            break;
          }
          case "10. Get Product Picture": {
            if (classification.itemHint && /^[0-9a-fA-F-]{12,}$/.test(classification.itemHint)) {
              const results = [];
              for (const company of bc.companies) {
                try {
                  const pic = await getBCItemPicture(bcAccessToken, company.id, classification.itemHint, "small");
                  results.push({
                    companyId: company.id,
                    companyName: company.displayName || company.name,
                    itemId: classification.itemHint,
                    contentType: pic.contentType,
                    bytesBase64: Buffer.from(pic.bytes).toString("base64"),
                  });
                } catch (e) {
                  // Picture not found in this company, skip
                }
              }
              if (results.length > 0) {
                bc.pictures = results; // Store all pictures
                bc.payload = { itemId: classification.itemHint, note: "Returned as base64 bytesBase64 in pictures array." };
              } else {
                bc.payload = { error: "Product picture not found in any company.", itemHint: classification.itemHint };
              }
            } else {
              bc.payload = { error: "Provide an item id in the query to fetch a picture.", hint: classification.itemHint };
            }
            break;
          }
          case "11. Get Customer Picture": {
            if (classification.customerHint && /^[0-9a-fA-F-]{12,}$/.test(classification.customerHint)) {
              const results = [];
              for (const company of bc.companies) {
                try {
                  const pic = await getBCCustomerPicture(bcAccessToken, company.id, classification.customerHint);
                  results.push({
                    companyId: company.id,
                    companyName: company.displayName || company.name,
                    customerId: classification.customerHint,
                    contentType: pic.contentType,
                    bytesBase64: Buffer.from(pic.bytes).toString("base64"),
                  });
                } catch (e) {
                  // Picture not found in this company, skip
                }
              }
              if (results.length > 0) {
                bc.pictures = results; // Store all pictures
                bc.payload = { customerId: classification.customerHint, note: "Returned as base64 bytesBase64 in pictures array." };
              } else {
                bc.payload = { error: "Customer picture not found in any company.", customerHint: classification.customerHint };
              }
            } else {
              bc.payload = { error: "Provide a customer id in the query to fetch a picture.", hint: classification.customerHint };
            }
            break;
          }
          case "14. Get person email inbox content":
            // This case is handled before BC fetch (skipBCFetch), payload already set above
            break;
          default:
            bc.payload = { companies: bc.companies.map(c => ({ id: c.id, name: c.displayName || c.name })) };
        }
      }
    } catch (e) {
      console.error("Business Central fetch error:", e?.message);
      bc.payload = { error: e?.message || String(e) };
    }

    const dataSummary = {
      classification,
      usersCount: users.length,
      usersWithInboxCount: usersEmailData.filter(u => (u.emailInbox || []).length > 0).length,
      bc: {
        companiesCount: bc.companies.length,
        companies: bc.companies.map(c => ({ id: c.id, name: c.displayName || c.name })),
        bestFit: bc.bestFit,
        payloadKeys: bc.payload && typeof bc.payload === "object" ? Object.keys(bc.payload) : null,
        hasPictures: !!bc.pictures,
      },
    };

    let prompt = `You are an assistant answering using ONLY the provided minimal data.\n\n`;
    prompt += `Query: "${query}"\n`;
    prompt += `Chosen best-fit: "${classification.bestFit}"\n\n`;
    prompt += `--- DATA ---\n`;
    prompt += `Users (count=${users.length}): ${JSON.stringify(users.slice(0, 10))}\n`;
    if (usersEmailData.length) {
      prompt += `Email inbox (top per user=5): ${JSON.stringify(usersEmailData)}\n`;
    }
    prompt += `Business Central (companies=${bc.companies.length}): ${JSON.stringify({ payload: bc.payload, pictures: bc.pictures })}\n\n`;
    prompt += `--- INSTRUCTIONS ---\n`;
    prompt += `Answer the query. If data is insufficient (e.g., missing item/customer id), say what identifier is needed.\n`;

    const answer = await askOpenAI(prompt);
    
    res.json({ query, answer, dataSummary, bc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;