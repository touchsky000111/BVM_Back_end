import { graphClient } from "./client.js";

export async function getUsers() {
  const res = await graphClient
    .api("/users")
    .select("id,displayName,mail")
    .get();

  return res.value;
}



export async function getEmailInboxOfUser(id) {
  try {
    const res = await graphClient
      .api(`/users/${id}/messages`)
      .top(10)
      .select("id,subject,from,receivedDateTime,bodyPreview")
      .get();

    return res.value;
  } catch (e) {
    console.error("Graph error:", e?.statusCode, e?.code, e?.message, e?.body);
    return null
  }
}

export async function searchAll(query) {
  const res = await graphClient
    .api("/search/query")
    .post({
      requests: [
        {
          entityTypes: ["message", "event", "driveItem"],
          query: { queryString: query },
          from: 0,
          size: 10
        }
      ]
    });

  return res.value[0].hitsContainers;
}

// Business Central queries
export async function getCompanies() {
  const res = await graphClient
    .api("/financials/companies")
    .get();

  return res.value;
}

export async function getCustomers(companyId) {
  const res = await graphClient
    .api(`/financials/companies/${companyId}/customers`)
    .get();

  return res.value;
}

export async function getItems(companyId) {
  const res = await graphClient
    .api(`/financials/companies/${companyId}/items`)
    .get();

  return res.value;
}

export async function getSalesInvoices(companyId) {
  const res = await graphClient
    .api(`/financials/companies/${companyId}/salesInvoices`)
    .get();

  return res.value;
}


export async function getTeamsId() {
  console.log("Getting Teams ID ")
  const res = await graphClient.api(`/teams`).get();
  return res.value;
}

export async function getTeamMessages(id) {
  console.log("Getting Team Messages for ID: ", id)
  const res = await graphClient.api(`/teams/${id}/channels/`).get();
  return res.value;
}