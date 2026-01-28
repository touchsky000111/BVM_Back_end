import express from "express";
import { askOpenAI } from "../../openai.js";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Helper function to determine what Business Central data is needed based on query
async function determineRelevantDataTypes(query) {
  const analysisPrompt = `Analyze this query and determine which data types are relevant. 
Query: "${query}"

Respond with a JSON object containing:
- needsUsers: true if query mentions users, employees, staff, team members, people, or specific person names
- specificUserNames: array of specific person names mentioned in the query (e.g., ["Hasegawa", "John Smith"]). Extract first names, last names, or full names. Return empty array [] if no specific names mentioned.
- needsCompanies: true if query mentions companies, business entities, or organizations
- needsCustomers: true if query mentions customers, clients, or customer-related information
- needsItems: true if query mentions products, items, inventory, or stock
- needsInvoices: true if query mentions invoices, sales, billing, or financial transactions

Only respond with JSON, no other text. Example: {"needsUsers":true,"specificUserNames":["Hasegawa"],"needsCompanies":false,"needsCustomers":false,"needsItems":false,"needsInvoices":false}`;

  try {
    const response = await askOpenAI(analysisPrompt);
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure all fields exist with defaults
      return {
        needsUsers: parsed.needsUsers ?? true,
        specificUserNames: Array.isArray(parsed.specificUserNames) ? parsed.specificUserNames : [],
        needsCompanies: parsed.needsCompanies ?? false,
        needsCustomers: parsed.needsCustomers ?? false,
        needsItems: parsed.needsItems ?? false,
        needsInvoices: parsed.needsInvoices ?? false
      };
    }
    // Default: fetch users, but not all Business Central data
    return { needsUsers: true, specificUserNames: [], needsCompanies: false, needsCustomers: false, needsItems: false, needsInvoices: false };
  } catch (e) {
    console.error("Error analyzing query:", e);
    // Default: fetch users, but not all Business Central data
    return { needsUsers: true, specificUserNames: [], needsCompanies: false, needsCustomers: false, needsItems: false, needsInvoices: false };
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

// Helper function to limit and summarize data
function limitData(data, maxRecords = 50) {
  if (!Array.isArray(data)) return data;
  return data.slice(0, maxRecords);
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

    // Determine what data is needed based on query
    console.log("Analyzing query to determine relevant data types...");
    const dataTypes = await determineRelevantDataTypes(query);
    console.log("Relevant data types:", dataTypes);

    let users = [];
    let usersEmailData = [];

    // Fetch users only if needed
    if (dataTypes.needsUsers) {
      console.log("Fetching users...");
      const usersRes = await graphClientWithToken
        .api("/users")
        .select("id,displayName,mail")
        .get();
      const allUsers = usersRes.value;
      console.log(`Fetched ${allUsers.length} users`);

      // Find matching users based on specific names mentioned in query
      if (dataTypes.specificUserNames && dataTypes.specificUserNames.length > 0) {
        console.log(`Looking for specific users: ${dataTypes.specificUserNames.join(", ")}`);
        users = findMatchingUsers(allUsers, dataTypes.specificUserNames);
        console.log(`Found ${users.length} matching user(s) out of ${allUsers.length} total`);
        
        // If specific users are mentioned, fetch their email inboxes
        console.log(`Fetching email inboxes for ${users.length} specific user(s)...`);
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
              emailInbox: inboxRes.value || []
            };
          } catch (e) {
            console.error(`Graph error for user ${user.id}:`, e?.statusCode, e?.code, e?.message);
            return {
              userId: user.id,
              displayName: user.displayName,
              mail: user.mail,
              emailInbox: []
            };
          }
        });

        usersEmailData = await Promise.all(emailInboxPromises);
        console.log(`Fetched email inboxes for ${usersEmailData.length} user(s)`);

      } else {
        // If no specific users mentioned, fetch all users and their email inboxes
        users = allUsers;
        console.log(`Fetching email inboxes for all ${users.length} users...`);
        const emailInboxPromises = users.map(async (user) => {
          try {
            const inboxRes = await graphClientWithToken
              .api(`/users/${user.id}/messages`)
              .top(15)
              .select("id,subject,from,receivedDateTime,bodyPreview")
              .get();

              console.log("featched email inbox", inboxRes)
            return {
              userId: user.id,
              displayName: user.displayName,
              mail: user.mail,
              emailInbox: inboxRes.value || []
            };
          } catch (e) {
            console.error(`Graph error for user ${user.id}:`, e?.statusCode, e?.code, e?.message);
            return {
              userId: user.id,
              displayName: user.displayName,
              mail: user.mail,
              emailInbox: []
            };
          }
        });

        usersEmailData = await Promise.all(emailInboxPromises);
        console.log(`Fetched email inboxes for ${usersEmailData.length} users`);
      }
    }

    const businessCentralData = {};

    // Fetch only relevant Business Central data
    try {
      if (dataTypes.needsCompanies) {
        console.log("Fetching companies...");
        const companiesRes = await graphClientWithToken.api("/financials/companies").get();
        businessCentralData.companies = limitData(companiesRes.value, 10);
      }

      if (dataTypes.needsCustomers && businessCentralData.companies?.length > 0) {
        console.log("Fetching customers...");
        const companyId = businessCentralData.companies[0].id;
        try {
          const customersRes = await graphClientWithToken
            .api(`/financials/companies/${companyId}/customers`)
            .top(50) // Limit to 50 customers
            .get();
          businessCentralData.customers = limitData(customersRes.value, 50);
        } catch (e) {
          console.error("Error fetching customers:", e.message);
        }
      }

      if (dataTypes.needsItems && businessCentralData.companies?.length > 0) {
        console.log("Fetching items...");
        const companyId = businessCentralData.companies[0].id;
        try {
          const itemsRes = await graphClientWithToken
            .api(`/financials/companies/${companyId}/items`)
            .top(50) // Limit to 50 items
            .get();
          businessCentralData.items = limitData(itemsRes.value, 50);
        } catch (e) {
          console.error("Error fetching items:", e.message);
        }
      }

      if (dataTypes.needsInvoices && businessCentralData.companies?.length > 0) {
        console.log("Fetching sales invoices...");
        const companyId = businessCentralData.companies[0].id;
        try {
          const invoicesRes = await graphClientWithToken
            .api(`/financials/companies/${companyId}/salesInvoices`)
            .top(50) // Limit to 50 invoices
            .get();
          businessCentralData.salesInvoices = limitData(invoicesRes.value, 50);
        } catch (e) {
          console.error("Error fetching invoices:", e.message);
        }
      }
    } catch (bcError) {
      console.error("Business Central data fetch error:", bcError.message);
      // Continue without Business Central data if it fails
    }

    // Build a concise summary instead of full JSON
    const  usersWithEmails = usersEmailData.filter(u => u.emailInbox.length > 0);
    const dataSummary = {
      users: users.length,
      usersWithEmails: usersWithEmails,
      businessCentral: {
        companies: businessCentralData.companies?.length || 0,
        customers: businessCentralData.customers?.length || 0,
        items: businessCentralData.items?.length || 0,
        invoices: businessCentralData.salesInvoices?.length || 0
      }
    };

    console.dir(dataSummary, { depth: null })

    // Create prompt with summarized data
    let prompt = `Based on the following company data, answer the query: "${query}"\n\n`;

    if (usersEmailData.length > 0) {
      const hasEmails = usersEmailData.some(u => u.emailInbox.length > 0);
      prompt += `Company Users (${dataSummary.users} total${hasEmails ? `, ${dataSummary.usersWithEmails} with emails` : ''}):\n`;
      prompt += usersEmailData.map(u => `- ${u.displayName} (${u.mail})${u.emailInbox.length > 0 ? `: ${u.emailInbox.length} recent emails` : ''}`).join('\n');
      prompt += '\n\n';

      if (hasEmails) {
        prompt += `Recent Email Summary:\n`;
        prompt += usersEmailData.filter(u => u.emailInbox.length > 0).map(u => 
          `${u.displayName}:\n${u.emailInbox.map(e => `- Subject: "${e.subject}"\n  From: ${e.from?.emailAddress?.name || 'Unknown'} (${e.from?.emailAddress?.address || 'Unknown'})\n  Date: ${e.receivedDateTime}\n  Preview: ${e.bodyPreview || 'No preview available'}`).join('\n\n')}`
        ).join('\n\n');
        prompt += '\n\n';
      }
    }

    if (businessCentralData.companies?.length > 0) {
      prompt += `Business Central Companies: ${JSON.stringify(businessCentralData.companies.slice(0, 5))}\n`;
    }
    if (businessCentralData.customers?.length > 0) {
      prompt += `Business Central Customers (sample): ${JSON.stringify(businessCentralData.customers.slice(0, 10))}\n`;
    }
    if (businessCentralData.items?.length > 0) {
      prompt += `Business Central Items (sample): ${JSON.stringify(businessCentralData.items.slice(0, 10))}\n`;
    }
    if (businessCentralData.salesInvoices?.length > 0) {
      prompt += `Business Central Sales Invoices (sample): ${JSON.stringify(businessCentralData.salesInvoices.slice(0, 10))}\n`;
    }

    prompt += `\nAnswer the query based on this information.`;

    const answer = await askOpenAI(prompt);
    console.log("answer => ", { query, answer })

    res.json({ query, answer, dataSummary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;