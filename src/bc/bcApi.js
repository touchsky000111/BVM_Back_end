/**
 * Business Central API client per BC_API_DOCUMENTATION.md
 * Base URL: https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environment}/api/v2.0
 * Endpoints: GET /companies, GET /companies({companyId})/items, GET /companies({companyId})/salesInvoices
 * Token must have aud: "https://api.businesscentral.dynamics.com" (use Azure AD v1.0 endpoint with resource).
 */

import dotenv from "dotenv";
dotenv.config();

const BUSINESS_CENTRAL_API_ROOT = "https://api.businesscentral.dynamics.com/v2.0/";
const BC_AUDIENCE = "https://api.businesscentral.dynamics.com";
const TENANT_ID = process.env.TENANT_ID || process.env.BC_TENANT_ID;
const ENVIRONMENT = process.env.BC_ENVIRONMENT || "Production";

function getBCBaseUrl() {
  if (!TENANT_ID) {
    throw new Error("Missing TENANT_ID or BC_TENANT_ID for Business Central API");
  }
  return `${BUSINESS_CENTRAL_API_ROOT}${TENANT_ID}/${ENVIRONMENT}/api/v2.0`;
}

/**
 * Get a Business Central access token with aud: "https://api.businesscentral.dynamics.com"
 * Uses Azure AD v1.0 token endpoint with resource= so the token audience is correct.
 * @param {string} tenantId - Azure AD tenant ID
 * @param {string} clientId - Azure AD app (client) ID
 * @param {string} clientSecret - Azure AD app client secret
 * @returns {Promise<string>} access_token
 */
export async function getBCToken(tenantId, clientId, clientSecret) {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    resource: BC_AUDIENCE,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`BC token request failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("BC token response missing access_token");
  }
  return data.access_token;
}

/**
 * Call Business Central REST API (per BC_API_DOCUMENTATION.md)
 * @param {string} accessToken - Bearer token with scope https://api.businesscentral.dynamics.com/.default
 * @param {string} endpoint - e.g. "/companies" or "/companies(id)/items"
 * @returns {Promise<{ value: Array }>}
 */
export async function fetchBCAPI(accessToken, endpoint) {
  const baseUrl = getBCBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`BC API ${response.status}: ${response.statusText} - ${errBody}`);
  }

  return response.json();
}

/**
 * Build a BC API url with OData query options ($select, $filter, $top, $orderby, $expand).
 * Pass values without the leading "$" (e.g. { select: "id,number", top: 10 }).
 */
export function withOData(endpoint, odata = {}) {
  const qp = new URLSearchParams();
  if (odata.select) qp.set("$select", String(odata.select));
  if (odata.filter) qp.set("$filter", String(odata.filter));
  if (odata.top != null) qp.set("$top", String(odata.top));
  if (odata.orderby) qp.set("$orderby", String(odata.orderby));
  if (odata.expand) qp.set("$expand", String(odata.expand));
  const qs = qp.toString();
  return qs ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}${qs}` : endpoint;
}

/**
 * Call Business Central API and return binary content (pictures).
 * @returns {Promise<{ contentType: string | null, bytes: Uint8Array }>}
 */
export async function fetchBCBinary(accessToken, endpoint) {
  const baseUrl = getBCBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  console.log("res => ", response)
  console.log("fetching BC API (binary)", url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`BC API ${response.status}: ${response.statusText} - ${errBody}`);
  }

  const contentType = response.headers.get("content-type");
  const buf = await response.arrayBuffer();
  return { contentType, bytes: new Uint8Array(buf) };
}

/**
 * Get all companies (GET /companies)
 */
export async function getBCCompanies(accessToken) {
  const data = await fetchBCAPI(accessToken, "/companies");
  return data.value || [];
}

/**
 * Get all items for a company (GET /companies({companyId})/items)
 */
export async function getBCItems(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/items`);
  return data.value || [];
}

export async function getBCItemsMin(accessToken, companyId, { top = 25 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/items`, {
    select: "id,number,displayName,baseUnitOfMeasureId,itemCategoryId,unitPrice,inventory",
    top,
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get a single item by id (GET /companies({companyId})/items({itemId}))
 */
export async function getBCItem(accessToken, companyId, itemId) {
  const c = encodeURIComponent(companyId);
  const i = encodeURIComponent(itemId);
  return fetchBCAPI(accessToken, `/companies(${c})/items(${i})`);
}

/**
 * Get all sales invoices for a company (GET /companies({companyId})/salesInvoices)
 */
export async function getBCSalesInvoices(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/salesInvoices`);
  return data.value || [];
}

export async function getBCSalesInvoicesMin(accessToken, companyId, { top = 25 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/salesInvoices`, {
    select: "id,number,customerId,customerName,invoiceDate,dueDate,status,totalAmountIncludingTax,currencyCode",
    top,
    orderby: "invoiceDate desc",
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get all purchase invoices for a company (GET /companies({companyId})/purchaseInvoices)
 */
export async function getBCPurchaseInvoices(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/purchaseInvoices`);
  return data.value || [];
}

export async function getBCPurchaseInvoicesMin(accessToken, companyId, { top = 25 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/purchaseInvoices`, {
    select: "id,number,vendorId,vendorName,invoiceDate,dueDate,status,totalAmountIncludingTax,currencyCode",
    top,
    orderby: "invoiceDate desc",
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get all customers for a company (GET /companies({companyId})/customers)
 */
export async function getBCCustomers(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/customers`);
  return data.value || [];
}

export async function getBCCustomersMin(accessToken, companyId, { top = 25 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/customers`, {
    select: "id,number,displayName,type,phoneNumber,email,website,currencyCode,blocked,balance",
    top,
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get a single customer by id (GET /companies({companyId})/customers({customerId}))
 */
export async function getBCCustomer(accessToken, companyId, customerId) {
  const c = encodeURIComponent(companyId);
  const cust = encodeURIComponent(customerId);
  return fetchBCAPI(accessToken, `/companies(${c})/customers(${cust})`);
}

/**
 * Get inventory item ledger entries (GET /companies({companyId})/itemLedgerEntries)
 */
export async function getBCItemLedgerEntries(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/itemLedgerEntries`);
  return data.value || [];
}

export async function getBCItemLedgerEntriesMin(accessToken, companyId, { top = 50 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/itemLedgerEntries`, {
    select: "id,postingDate,entryType,documentNumber,itemId,description,quantity,unitOfMeasureCode,locationCode",
    top,
    orderby: "postingDate desc",
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get item categories (GET /companies({companyId})/itemCategories)
 */
export async function getBCItemCategories(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/itemCategories`);
  return data.value || [];
}

export async function getBCItemCategoriesMin(accessToken, companyId, { top = 100 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/itemCategories`, {
    select: "id,code,displayName,parentCategoryId",
    top,
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get units of measure (GET /companies({companyId})/unitsOfMeasure)
 */
export async function getBCUnitsOfMeasure(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/unitsOfMeasure`);
  return data.value || [];
}

export async function getBCUnitsOfMeasureMin(accessToken, companyId, { top = 100 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/unitsOfMeasure`, {
    select: "id,code,displayName,internationalStandardCode",
    top,
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get customer ledger entries (GET /companies({companyId})/customerLedgerEntries)
 */
export async function getBCCustomerLedgerEntries(accessToken, companyId) {
  const encoded = encodeURIComponent(companyId);
  const data = await fetchBCAPI(accessToken, `/companies(${encoded})/customerLedgerEntries`);
  return data.value || [];
}

export async function getBCCustomerLedgerEntriesMin(accessToken, companyId, { top = 50 } = {}) {
  const encoded = encodeURIComponent(companyId);
  const endpoint = withOData(`/companies(${encoded})/customerLedgerEntries`, {
    select: "id,postingDate,documentNumber,documentType,customerId,customerNumber,customerName,amount,remainingAmount,currencyCode,open",
    top,
    orderby: "postingDate desc",
  });
  const data = await fetchBCAPI(accessToken, endpoint);
  return data.value || [];
}

/**
 * Get product picture (GET /companies({companyId})/items({itemId})/picture({size}))
 * size: small | medium | large
 */
export async function getBCItemPicture(accessToken, companyId, itemId, size = "small") {
  const c = encodeURIComponent(companyId);
  const i = encodeURIComponent(itemId);
  const s = encodeURIComponent(size);
  return fetchBCBinary(accessToken, `/companies(${c})/items(${i})/picture(${s})`);
}

/**
 * Get customer picture (GET /companies({companyId})/customers({customerId})/picture)
 */
export async function getBCCustomerPicture(accessToken, companyId, customerId) {
  const c = encodeURIComponent(companyId);
  const cust = encodeURIComponent(customerId);
  return fetchBCBinary(accessToken, `/companies(${c})/customers(${cust})/picture`);
}
