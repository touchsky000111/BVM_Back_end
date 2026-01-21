import express from "express";
import { askOpenAI } from "../../openai.js";
import { getUsers } from "../graph/queries.js";

const router = express.Router();

// General query endpoint
router.get("/", async (req, res) => {
  try {
    const { query } = req.query;
    console.log("query => ", query)
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const users = await getUsers();
    console.log("users => ", users)

    const prompt = `Based on the following Business Central users: ${JSON.stringify(users)}, answer the query: ${query}`;
    const answer = await askOpenAI(prompt);
    console.log("answer => ", { query, answer })

    res.json({ query, answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;