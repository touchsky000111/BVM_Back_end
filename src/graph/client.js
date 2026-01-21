import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.TENANT_ID || !process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error(`Missing required environment variables: TENANT_ID=${!!process.env.TENANT_ID}, CLIENT_ID=${!!process.env.CLIENT_ID}, CLIENT_SECRET=${!!process.env.CLIENT_SECRET}`);
}

const credential = new ClientSecretCredential(
  process.env.TENANT_ID,
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

export const graphClient = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );

      console.log("token => ", token)
      return token.token;
    }
  }
});
