import "dotenv/config";
import {
  getBCToken,
  getBCCompanies,
  getBCItemsMin,
  getBCItem,
  getBCCustomersMin,
  getBCCustomer,
  getBCItemLedgerEntriesMin,
  getBCItemCategoriesMin,
  getBCUnitsOfMeasureMin,
  getBCSalesInvoicesMin,
  getBCPurchaseInvoicesMin,
  getBCCustomerLedgerEntriesMin,
  getBCItemPicture,
  getBCCustomerPicture,
} from "./src/bc/bcApi.js";

const {
  BC_TENANT_ID,
  BC_CLIENT_ID,
  BC_SECRET_KEY,
  BC_ITEM_ID,
  BC_CUSTOMER_ID,
} = process.env;

const BC_TENANT = BC_TENANT_ID || process.env.TENANT_ID;
const BC_CLIENT = BC_CLIENT_ID || process.env.CLIENT_ID;
const BC_SECRET = BC_SECRET_KEY || process.env.BC_CLIENT_SECRET || process.env.CLIENT_SECRET;

function printSection(title, data) {
  console.log("\n====================");
  console.log(title);
  console.dir(data, { depth: 4 });
}

async function testCase1(bcAccessToken) {
  const companies = await getBCCompanies(bcAccessToken);
  printSection("1. Get Companies", {
    count: companies.length,
    companies: companies.map((c) => ({ id: c.id, name: c.displayName || c.name })),
  });
  return companies;
}

async function testCase2(bcAccessToken, companyId, companyName) {
  const items = await getBCItemsMin(bcAccessToken, companyId, { top: 10 });
  printSection(`2. Get Products/Items - ${companyName}`, {
    companyId,
    companyName,
    count: items.length,
    sample: items[0] || null,
  });
}

async function testCase3(bcAccessToken, companyId, companyName) {
  if (BC_ITEM_ID) {
    const item = await getBCItem(bcAccessToken, companyId, BC_ITEM_ID);
    printSection(`3. Get Single Product - ${companyName}`, { companyId, companyName, item });
  } else {
    const items = await getBCItemsMin(bcAccessToken, companyId, { top: 5 });
    printSection(`3. Get Single Product - ${companyName} (no BC_ITEM_ID)`, {
      hint: "Set BC_ITEM_ID to fetch a single item",
      sampleItems: items.slice(0, 3),
    });
  }
}

async function testCase4(bcAccessToken, companyId, companyName) {
  const customers = await getBCCustomersMin(bcAccessToken, companyId, { top: 10 });
  printSection(`4. Get Customers - ${companyName}`, {
    companyId,
    companyName,
    count: customers.length,
    sample: customers[0] || null,
  });
}

async function testCase5(bcAccessToken, companyId, companyName) {
  if (BC_CUSTOMER_ID) {
    const customer = await getBCCustomer(bcAccessToken, companyId, BC_CUSTOMER_ID);
    printSection(`5. Get Single Customer - ${companyName}`, { companyId, companyName, customer });
  } else {
    const customers = await getBCCustomersMin(bcAccessToken, companyId, { top: 5 });
    printSection(`5. Get Single Customer - ${companyName} (no BC_CUSTOMER_ID)`, {
      hint: "Set BC_CUSTOMER_ID to fetch a single customer",
      sampleCustomers: customers.slice(0, 3),
    });
  }
}

async function testCase6(bcAccessToken, companyId, companyName) {
  const entries = await getBCItemLedgerEntriesMin(bcAccessToken, companyId, { top: 25 });
  printSection(`6. Get Inventory Items (Item Ledger Entries) - ${companyName}`, {
    companyId,
    companyName,
    count: entries.length,
    sample: entries[0] || null,
  });
}

async function testCase7(bcAccessToken, companyId, companyName) {
  const cats = await getBCItemCategoriesMin(bcAccessToken, companyId, { top: 50 });
  printSection(`7. Get Item Categories - ${companyName}`, {
    companyId,
    companyName,
    count: cats.length,
    sample: cats[0] || null,
  });
}

async function testCase8(bcAccessToken, companyId, companyName) {
  const uoms = await getBCUnitsOfMeasureMin(bcAccessToken, companyId, { top: 50 });
  printSection(`8. Get Units of Measure - ${companyName}`, {
    companyId,
    companyName,
    count: uoms.length,
    sample: uoms[0] || null,
  });
}

async function testCase9(bcAccessToken, companyId, companyName) {
  const inv = await getBCSalesInvoicesMin(bcAccessToken, companyId, { top: 25 });
  printSection(`9. Get Sales Invoices - ${companyName}`, {
    companyId,
    companyName,
    count: inv.length,
    sample: inv[0] || null,
  });
}

async function testCase10(bcAccessToken, companyId, companyName) {
  const inv = await getBCPurchaseInvoicesMin(bcAccessToken, companyId, { top: 25 });
  printSection(`10. Get Purchase Invoices - ${companyName}`, {
    companyId,
    companyName,
    count: inv.length,
    sample: inv[0] || null,
  });
}

async function testCase11(bcAccessToken, companyId, companyName) {
  const entries = await getBCCustomerLedgerEntriesMin(bcAccessToken, companyId, { top: 25 });
  printSection(`11. Get Customer Ledger Entries - ${companyName}`, {
    companyId,
    companyName,
    count: entries.length,
    sample: entries[0] || null,
  });
}

async function testCase12(bcAccessToken, companyId, companyName) {
  if (!BC_ITEM_ID) {
    printSection(`12. Get Product Picture - ${companyName} (no BC_ITEM_ID)`, {
      hint: "Set BC_ITEM_ID to fetch picture bytes",
    });
    return;
  }
  const pic = await getBCItemPicture(bcAccessToken, companyId, BC_ITEM_ID, "small");
  printSection(`12. Get Product Picture - ${companyName}`, {
    companyId,
    companyName,
    itemId: BC_ITEM_ID,
    contentType: pic.contentType,
    bytes: pic.bytes?.length || 0,
  });
}

async function testCase13(bcAccessToken, companyId, companyName) {
  if (!BC_CUSTOMER_ID) {
    printSection(`13. Get Customer Picture - ${companyName} (no BC_CUSTOMER_ID)`, {
      hint: "Set BC_CUSTOMER_ID to fetch picture bytes",
    });
    return;
  }
  const pic = await getBCCustomerPicture(bcAccessToken, companyId, BC_CUSTOMER_ID);
  printSection(`13. Get Customer Picture - ${companyName}`, {
    companyId,
    companyName,
    customerId: BC_CUSTOMER_ID,
    contentType: pic.contentType,
    bytes: pic.bytes?.length || 0,
  });
}

(async () => {
  try {
    if (!BC_TENANT || !BC_CLIENT || !BC_SECRET) {
      throw new Error("Missing env vars: BC_TENANT_ID/TENANT_ID, BC_CLIENT_ID/CLIENT_ID, BC_SECRET_KEY/BC_CLIENT_SECRET/CLIENT_SECRET");
    }

    console.log("Fetching BC access token...");
    const bcAccessToken = await getBCToken(BC_TENANT, BC_CLIENT, BC_SECRET);

    console.log("Fetching all companies...");
    const companies = await testCase1(bcAccessToken);

    if (!companies || companies.length === 0) {
      throw new Error("No companies found from Business Central");
    }

    console.log(`\nFound ${companies.length} company/companies. Testing all 13 functionalities for each...\n`);

    // Test cases 2-13 for each company
    for (const company of companies) {
      const companyId = company.id;
      const companyName = company.displayName || company.name || companyId;

      console.log(`\n>>> Testing company: ${companyName} (${companyId})\n`);

      try {
        await testCase2(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 2 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase3(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 3 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase4(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 4 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase5(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 5 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase6(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 6 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase7(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 7 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase8(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 8 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase9(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 9 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase10(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 10 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase11(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 11 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase12(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 12 failed for ${companyName}:`, e.message);
      }

      try {
        await testCase13(bcAccessToken, companyId, companyName);
      } catch (e) {
        console.error(`Case 13 failed for ${companyName}:`, e.message);
      }
    }

    console.log("\n\n✅ All tests completed!");
  } catch (err) {
    console.error("Error:", err?.message || err);
    process.exit(1);
  }
})();
