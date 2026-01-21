import express from "express";
import { getCompanies, getCustomers, getItems, getSalesInvoices } from "../graph/queries.js";
import { graphClient } from "../graph/client.js";

const router = express.Router();

// Test Graph API connection
router.get("/test", async (req, res) => {
  try {
    const me = await graphClient.api("/me").get();
    res.json({ message: "Graph API connected successfully", user: me.displayName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Graph API connection failed", details: err.message });
  }
});

// Get all companies
router.get("/companies", async (req, res) => {
  try {
    const companies = await getCompanies();
    res.json({ companies });
  } catch (err) {
    console.error(err);
    if (err.statusCode === 403 || err.code === 'Authorization_RequestDenied') {
      return res.status(403).json({
        error: 'Insufficient privileges',
        message: 'The Azure AD app registration needs API permissions for Business Central.',
        hint: 'Required permissions: Financials.ReadWrite.All (Application) - ensure admin consent is granted',
        details: err.message
      });
    }
    if (err.message && err.message.includes("Resource not found")) {
      return res.status(404).json({
        error: 'Business Central API not available',
        message: 'The financials API may not be enabled for your tenant.',
        hints: [
          'Ensure Business Central is provisioned and licensed in your Azure AD tenant',
          'Check if you have access to Business Central at https://businesscentral.dynamics.com',
          'Verify your Azure subscription includes Business Central',
          'The API might be in beta for your region/environment'
        ],
        details: err.message
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get customers for a company
router.get("/companies/:companyId/customers", async (req, res) => {
  try {
    const { companyId } = req.params;
    const customers = await getCustomers(companyId);
    res.json({ customers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get items for a company
router.get("/companies/:companyId/items", async (req, res) => {
  try {
    const { companyId } = req.params;
    const items = await getItems(companyId);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get sales invoices for a company
router.get("/companies/:companyId/salesInvoices", async (req, res) => {
  try {
    const { companyId } = req.params;
    const salesInvoices = await getSalesInvoices(companyId);
    res.json({ salesInvoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;