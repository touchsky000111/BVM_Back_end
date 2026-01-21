import { graphClient } from "./client.js";

export async function getUsers() {
  const res = await graphClient
    .api("/users")
    .select("id,displayName,mail")
    .get();

  return res.value;
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
