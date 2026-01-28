import serverless from "serverless-http";
import app from "../../src/app.js";

// Wrap Express app with serverless-http for Netlify
export const handler = serverless(app);
