import express from "express";
import { getUsers, searchAll, getEmailInboxOfUser } from "../graph/queries.js";

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

router.get("/emailInbox", async (req, res) => {
  try {
      const emailInbox = await getEmailInboxOfUser();
      // const emailInbox = {        msg: 'okokokokok'      };
      return res.json({ emailInbox });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


