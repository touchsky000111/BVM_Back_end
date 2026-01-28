import express from "express";
import { getUsers, searchAll, getEmailInboxOfUser, getTeamsId, getTeamMessages } from "../graph/queries.js";
import { ClientSecretCredential } from "@azure/identity";
import { getBCToken, getBCCompanies } from "../bc/bcApi.js";

const router = express.Router();

router.get("/users", async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) {
      const users = await getUsers();
      return res.json({ users });
    }

    const results = await searchAll(q);
    res.json({ results });

  } catch (err) {
    console.error(err);
    
    // Check if it's a Graph API permission error
    if (err.statusCode === 403 || err.code === 'Authorization_RequestDenied') {
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        message: 'The Azure AD app registration needs API permissions granted and consented.',
        hint: 'Required permissions: User.Read.All (Application), and for search: Mail.Read, Calendars.Read, Files.Read.All',
        details: err.message 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', async (req, res) => {
  res.json({
    msg: "ok"
  })
})

router.get("/emailInbox/:id?", async (req, res) => {
  try {
    const id =
      (typeof req.params.id === "string" && req.params.id.trim()) ||
      (typeof req.query.id === "string" && req.query.id.trim());

    if (!id) {
      return res.status(400).json({ error: "id is required (path param or ?id=)" });
    }

    const emailInbox = await getEmailInboxOfUser(id);
      // const emailInbox = {        msg: 'okokokokok'      };
      return res.json({ emailInbox });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/team-id", async (req, res) => {
  try {
    const emailInbox = await getTeamsId();
    return res.json({ emailInbox });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/team-messages/:id?", async (req, res) => {
  try {
    const id =
      (typeof req.params.id === "string" && req.params.id.trim()) ||
      (typeof req.query.id === "string" && req.query.id.trim());

    if (!id) {
      return res.status(400).json({ error: "id is required (path param or ?id=)" });
    }

    const teamMessages = await getTeamMessages(id);
    return res.json({ teamMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/business-central/companies', async (req, res) => {
  try {
    const bcTenantId = process.env.BC_TENANT_ID || process.env.TENANT_ID;
    const bcClientId = process.env.BC_CLIENT_ID || process.env.CLIENT_ID;
    const bcClientSecret =
      process.env.BC_CLIENT_SECRET ||
      process.env.BC_SECRET_KEY ||
      process.env.CLIENT_SECRET;

    if (!bcTenantId || !bcClientId || !bcClientSecret) {
      return res.status(500).json({
        error: "Missing Business Central auth env vars",
        details: {
          BC_TENANT_ID: !!process.env.BC_TENANT_ID,
          TENANT_ID: !!process.env.TENANT_ID,
          BC_CLIENT_ID: !!process.env.BC_CLIENT_ID,
          CLIENT_ID: !!process.env.CLIENT_ID,
          BC_CLIENT_SECRET: !!process.env.BC_CLIENT_SECRET,
          BC_SECRET_KEY: !!process.env.BC_SECRET_KEY,
          CLIENT_SECRET: !!process.env.CLIENT_SECRET
        }
      });
    }

    console.log("Fetching Business Central access token...");
    const bcAccessToken = await getBCToken(bcTenantId, bcClientId, bcClientSecret);
    console.log("Fetching all companies (BC API)...");
    const companies = await getBCCompanies(bcAccessToken);
    return res.json({ companies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
export default router;


