# Business Central API Documentation

Complete guide for using Business Central REST APIs with the Bria Outlet POS application.

## Table of Contents

1. [Configuration](#configuration)
2. [Authentication](#authentication)
3. [Standard API Endpoints](#standard-api-endpoints)
4. [Custom API Endpoints](#custom-api-endpoints)
5. [JavaScript Examples](#javascript-examples)
6. [Error Handling](#error-handling)

---

## Configuration

### Environment Values

The application supports three Business Central environments:

- **Sandbox**: `Sandbox`
- **Development**: `Development`
- **Production**: `Production` ⭐ (Current default)

### Base URLs

```javascript
// Configuration constants
const TENANT_ID = '175862a9-19e0-4fbb-abf2-742b5c035292';
const CLIENT_ID = 'a38aab29-9e9f-41bf-8ee1-396dac50bb3d';
const BUSINESS_CENTRAL_API_ROOT = 'https://api.businesscentral.dynamics.com/v2.0/';

// Environment-specific base URLs
function getBusinessCentralBaseUrl(environment) {
  return `${BUSINESS_CENTRAL_API_ROOT}${TENANT_ID}/${environment}/api/v2.0`;
}

function getBusinessCentralCustomApiUrl(environment) {
  return `${BUSINESS_CENTRAL_API_ROOT}${TENANT_ID}/${environment}/api/briaoutlet/pos/v1.0`;
}

// Production URLs (current default)
const PRODUCTION_BASE_URL = getBusinessCentralBaseUrl('Production');
const PRODUCTION_CUSTOM_API_URL = getBusinessCentralCustomApiUrl('Production');
```

### Example URLs

**Production Standard API:**
```
https://api.businesscentral.dynamics.com/v2.0/175862a9-19e0-4fbb-abf2-742b5c035292/Production/api/v2.0
```

**Production Custom API:**
```
https://api.businesscentral.dynamics.com/v2.0/175862a9-19e0-4fbb-abf2-742b5c035292/Production/api/briaoutlet/pos/v1.0
```

---

## Authentication

All API requests require OAuth2 Bearer token authentication.

### Required Scopes

```
openid
profile
offline_access
https://api.businesscentral.dynamics.com/user_impersonation
```

### Request Headers

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

---

## Standard API Endpoints

### 1. Get Companies

**Endpoint:** `GET /api/v2.0/companies`

**Description:** Retrieve all available companies in Business Central.

**Request:**
```javascript
const url = `${PRODUCTION_BASE_URL}/companies`;
const response = await fetch(url, { headers });
const data = await response.json();
const companies = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "company-guid-here",
      "name": "Bria Quartz N.Y.",
      "displayName": "Bria Quartz N.Y.",
      "systemVersion": "12345678"
    }
  ]
}
```

---

### 2. Get Products/Items

**Endpoint:** `GET /api/v2.0/companies({companyId})/items`

**Description:** Retrieve all products/items for a company.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/items`;

// With filter
const urlWithFilter = `${url}?$filter=displayName eq 'Product Name'`;

const response = await fetch(url, { headers });
const data = await response.json();
const products = data.value;
```

**Response Fields:**
- `id` - Item system ID
- `number` - Item number/SKU
- `displayName` - Product name
- `unitPrice` - Unit price
- `inventory` - Current inventory quantity
- `itemCategoryCode` - Category code
- `baseUnitOfMeasure` - Base unit
- `picture` - Picture URL (if available)
- Custom fields: `costFOB`, `landingCost`, `briaCostingMethod`, `factoryBarcode`, `slabsColorCode`, `slabsDescription`, `size`, `color`, `thickness`, `imperfection`

**Response:**
```json
{
  "value": [
    {
      "id": "item-guid",
      "number": "ITEM001",
      "displayName": "Quartz Slab - White",
      "unitPrice": 150.00,
      "inventory": 25,
      "itemCategoryCode": "SLABS",
      "baseUnitOfMeasure": "PCS",
      "costFOB": 100.00,
      "landingCost": 120.00,
      "briaCostingMethod": "Specific",
      "factoryBarcode": "FBC123456",
      "slabsColorCode": "WHITE-001",
      "slabsDescription": "Premium White Quartz",
      "size": "120x60",
      "color": "White",
      "thickness": "2cm",
      "imperfection": "None"
    }
  ]
}
```

---

### 3. Get Single Product

**Endpoint:** `GET /api/v2.0/companies({companyId})/items({itemId})`

**Description:** Retrieve a single product by ID.

**Request:**
```javascript
const companyId = 'your-company-id';
const itemId = 'item-guid';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/items(${encodeURIComponent(itemId)})`;

const response = await fetch(url, { headers });
const product = await response.json();
```

---

### 4. Get Customers

**Endpoint:** `GET /api/v2.0/companies({companyId})/customers`

**Description:** Retrieve all customers for a company.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/customers`;

// With filter
const urlWithFilter = `${url}?$filter=displayName eq 'Customer Name'`;

const response = await fetch(url, { headers });
const data = await response.json();
const customers = data.value;
```

**Response Fields:**
- `id` - Customer system ID
- `number` - Customer number
- `displayName` - Customer name
- `email` - Email address
- `phone` - Phone number
- `address` - Address object
- `balance` - Account balance
- `creditLimit` - Credit limit
- Custom field: `pricingLevel` - Pricing level (Level 1-5)

**Response:**
```json
{
  "value": [
    {
      "id": "customer-guid",
      "number": "CUST001",
      "displayName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "US",
        "postalCode": "10001"
      },
      "balance": 5000.00,
      "creditLimit": 10000.00,
      "pricingLevel": "Level 2"
    }
  ]
}
```

---

### 5. Get Single Customer

**Endpoint:** `GET /api/v2.0/companies({companyId})/customers({customerId})`

**Request:**
```javascript
const companyId = 'your-company-id';
const customerId = 'customer-guid';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/customers(${encodeURIComponent(customerId)})`;

const response = await fetch(url, { headers });
const customer = await response.json();
```

---

### 6. Get Inventory Items (Item Ledger Entries)

**Endpoint:** `GET /api/v2.0/companies({companyId})/itemLedgerEntries`

**Description:** Retrieve inventory ledger entries showing stock movements.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/itemLedgerEntries`;

// With filter by location
const urlWithFilter = `${url}?$filter=locationCode eq 'MAIN'`;

const response = await fetch(url, { headers });
const data = await response.json();
const entries = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "entry-guid",
      "itemNumber": "ITEM001",
      "entryType": "Sale",
      "quantity": -5,
      "locationCode": "MAIN",
      "postingDate": "2024-01-15"
    }
  ]
}
```

---

### 7. Get Item Categories

**Endpoint:** `GET /api/v2.0/companies({companyId})/itemCategories`

**Description:** Retrieve all item categories.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/itemCategories`;

const response = await fetch(url, { headers });
const data = await response.json();
const categories = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "code": "SLABS",
      "displayName": "Quartz Slabs"
    }
  ]
}
```

---

### 8. Get Units of Measure

**Endpoint:** `GET /api/v2.0/companies({companyId})/unitsOfMeasure`

**Description:** Retrieve all units of measure.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/unitsOfMeasure`;

const response = await fetch(url, { headers });
const data = await response.json();
const units = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "code": "PCS",
      "displayName": "Pieces"
    }
  ]
}
```

---

### 9. Get Sales Invoices

**Endpoint:** `GET /api/v2.0/companies({companyId})/salesInvoices`

**Description:** Retrieve sales invoices.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/salesInvoices`;

// With filter
const urlWithFilter = `${url}?$filter=customerNumber eq 'CUST001'`;

const response = await fetch(url, { headers });
const data = await response.json();
const invoices = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "invoice-guid",
      "number": "SI-001",
      "customerNumber": "CUST001",
      "customerName": "John Doe",
      "postingDate": "2024-01-15",
      "dueDate": "2024-02-15",
      "amountIncludingTax": 1500.00,
      "status": "Open"
    }
  ]
}
```

---

### 10. Get Purchase Invoices

**Endpoint:** `GET /api/v2.0/companies({companyId})/purchaseInvoices`

**Description:** Retrieve purchase invoices.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/purchaseInvoices`;

const response = await fetch(url, { headers });
const data = await response.json();
const invoices = data.value;
```

---

### 11. Get Customer Ledger Entries

**Endpoint:** `GET /api/v2.0/companies({companyId})/customerLedgerEntries`

**Description:** Retrieve customer payment history and financial transactions.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/customerLedgerEntries`;

// Filter by customer
const urlWithFilter = `${url}?$filter=customerNumber eq 'CUST001'`;

const response = await fetch(url, { headers });
const data = await response.json();
const entries = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "entry-guid",
      "entryNumber": 12345,
      "customerNumber": "CUST001",
      "postingDate": "2024-01-15",
      "documentType": "Payment",
      "documentNumber": "PAY-001",
      "amount": -500.00,
      "remainingAmount": 0.00
    }
  ]
}
```

---

### 12. Get Product Picture

**Endpoint:** `GET /api/v2.0/companies({companyId})/items({itemId})/picture({size})`

**Description:** Retrieve product image as binary data.

**Request:**
```javascript
const companyId = 'your-company-id';
const itemId = 'item-guid';
const size = 'small'; // Options: small, medium, large
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/items(${encodeURIComponent(itemId)})/picture(${size})`;

const response = await fetch(url, { headers });
const imageBlob = await response.blob();
```

---

### 13. Get Customer Picture

**Endpoint:** `GET /api/v2.0/companies({companyId})/customers({customerId})/picture`

**Description:** Retrieve customer profile image.

**Request:**
```javascript
const companyId = 'your-company-id';
const customerId = 'customer-guid';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/customers(${encodeURIComponent(customerId)})/picture`;

const response = await fetch(url, { headers });
const imageBlob = await response.blob();
```

---

## Custom API Endpoints

All custom APIs use the base URL: `/api/briaoutlet/pos/v1.0`

### 1. Get Discount Requests

**Endpoint:** `GET /api/briaoutlet/pos/v1.0/companies({companyId})/discountRequests`

**Description:** Retrieve discount approval requests.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/discountRequests`;

// Filter by status
const urlWithFilter = `${url}?$filter=status eq 'Pending'`;

const response = await fetch(url, { headers });
const data = await response.json();
const requests = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "request-guid",
      "requestNumber": "DR-001",
      "customerId": "customer-guid",
      "customerName": "John Doe",
      "productId": "item-guid",
      "productName": "Quartz Slab",
      "originalPrice": 150.00,
      "requestedPrice": 120.00,
      "discountAmount": 30.00,
      "discountPercent": 20,
      "status": "Pending",
      "requestedDate": "2024-01-15",
      "approvedDate": null,
      "approvedBy": null,
      "notes": "Bulk order discount"
    }
  ]
}
```

---

### 2. Create Discount Request

**Endpoint:** `POST /api/briaoutlet/pos/v1.0/companies({companyId})/discountRequests`

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/discountRequests`;

const requestData = {
  customerId: 'customer-guid',
  productId: 'item-guid',
  originalPrice: 150.00,
  requestedPrice: 120.00,
  discountAmount: 30.00,
  discountPercent: 20,
  notes: 'Bulk order discount'
};

const response = await fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(requestData)
});

const newRequest = await response.json();
```

---

### 3. Update Discount Request Status

**Endpoint:** `PATCH /api/briaoutlet/pos/v1.0/companies({companyId})/discountRequests({requestId})`

**Request:**
```javascript
const companyId = 'your-company-id';
const requestId = 'request-guid';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/discountRequests(${encodeURIComponent(requestId)})`;

const updateData = {
  status: 'Approved',
  approvedDate: new Date().toISOString(),
  approvedBy: 'user-id'
};

const response = await fetch(url, {
  method: 'PATCH',
  headers: headers,
  body: JSON.stringify(updateData)
});
```

---

### 4. Get Reservations

**Endpoint:** `GET /api/briaoutlet/pos/v1.0/companies({companyId})/reservations`

**Description:** Retrieve product reservations.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/reservations`;

// Filter by status
const urlWithFilter = `${url}?$filter=status eq 'Active'`;

const response = await fetch(url, { headers });
const data = await response.json();
const reservations = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "reservation-guid",
      "reservationNumber": "RES-001",
      "customerId": "customer-guid",
      "customerName": "John Doe",
      "productId": "item-guid",
      "productName": "Quartz Slab - White",
      "quantity": 5,
      "reservedDate": "2024-01-15",
      "expiryDate": "2024-01-22",
      "status": "Active",
      "notes": "Customer will pick up next week"
    }
  ]
}
```

---

### 5. Create Reservation

**Endpoint:** `POST /api/briaoutlet/pos/v1.0/companies({companyId})/reservations`

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/reservations`;

const reservationData = {
  customerId: 'customer-guid',
  productId: 'item-guid',
  quantity: 5,
  expiryDate: '2024-01-22',
  notes: 'Customer will pick up next week'
};

const response = await fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(reservationData)
});

const newReservation = await response.json();
```

---

### 6. Get Tasks

**Endpoint:** `GET /api/briaoutlet/pos/v1.0/companies({companyId})/tasks`

**Description:** Retrieve POS tasks.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/tasks`;

const response = await fetch(url, { headers });
const data = await response.json();
const tasks = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "task-guid",
      "title": "Restock Item ITEM001",
      "description": "Item is running low on inventory",
      "type": "Inventory",
      "status": "Pending",
      "priority": "High",
      "assignedTo": "user-id",
      "assignedToName": "John Manager",
      "dueDate": "2024-01-20",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 7. Create Task

**Endpoint:** `POST /api/briaoutlet/pos/v1.0/companies({companyId})/tasks`

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/tasks`;

const taskData = {
  title: 'Restock Item ITEM001',
  description: 'Item is running low on inventory',
  type: 'Inventory',
  status: 'Pending',
  priority: 'High',
  assignedTo: 'user-id',
  dueDate: '2024-01-20'
};

const response = await fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(taskData)
});

const newTask = await response.json();
```

---

### 8. Get App Settings

**Endpoint:** `GET /api/v2.0/companies({companyId})/appSettings`

**Description:** Retrieve cloud-synchronized app settings.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_BASE_URL}/companies(${encodeURIComponent(companyId)})/appSettings`;

// Filter by user ID
const urlWithFilter = `${url}?$filter=userId eq 'user-id'`;

const response = await fetch(url, { headers });
const data = await response.json();
const settings = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "id": "settings-guid",
      "userId": "user-id",
      "key": "theme",
      "value": "dark",
      "lastUpdated": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 9. Get Item Location Stock

**Endpoint:** `GET /api/briaoutlet/pos/v1.0/companies({companyId})/briaItemLocationStocks`

**Description:** Retrieve inventory stock across all locations.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/briaItemLocationStocks`;

// Filter by item
const urlWithFilter = `${url}?$filter=itemNo eq 'ITEM001'`;

const response = await fetch(url, { headers });
const data = await response.json();
const stock = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "itemNo": "ITEM001",
      "locationCode": "MAIN",
      "quantity": 25,
      "availableQuantity": 20,
      "lastUpdated": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 10. Get Item Pricing Levels

**Endpoint:** `GET /api/briaoutlet/pos/v1.0/companies({companyId})/briaItemPricingLevels`

**Description:** Retrieve tiered pricing for items.

**Request:**
```javascript
const companyId = 'your-company-id';
const url = `${PRODUCTION_CUSTOM_API_URL}/companies(${encodeURIComponent(companyId)})/briaItemPricingLevels`;

// Filter by item
const urlWithFilter = `${url}?$filter=itemNo eq 'ITEM001'`;

const response = await fetch(url, { headers });
const data = await response.json();
const pricing = data.value;
```

**Response:**
```json
{
  "value": [
    {
      "itemNo": "ITEM001",
      "pricingLevel": "Level 1",
      "unitPrice": 150.00,
      "minimumQuantity": 1
    },
    {
      "itemNo": "ITEM001",
      "pricingLevel": "Level 2",
      "unitPrice": 140.00,
      "minimumQuantity": 10
    }
  ]
}
```

---

## JavaScript Examples

### Complete Example: Fetch Products

```javascript
// Configuration
const TENANT_ID = '175862a9-19e0-4fbb-abf2-742b5c035292';
const ENVIRONMENT = 'Production'; // Options: Sandbox, Development, Production
const BASE_URL = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENVIRONMENT}/api/v2.0`;
const CUSTOM_API_URL = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENVIRONMENT}/api/briaoutlet/pos/v1.0`;

// Get access token (from OAuth2 flow)
const accessToken = 'your-access-token-here';

// Helper function for API calls
async function fetchBCAPI(endpoint, options = {}) {
  const url = endpoint.startsWith('/api/briaoutlet')
    ? `${CUSTOM_API_URL}${endpoint.replace('/api/briaoutlet/pos/v1.0', '')}`
    : `${BASE_URL}${endpoint}`;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Example: Get all companies
async function getCompanies() {
  const data = await fetchBCAPI('/companies');
  return data.value;
}

// Example: Get all products
async function getProducts(companyId) {
  const encodedCompanyId = encodeURIComponent(companyId);
  const data = await fetchBCAPI(`/companies(${encodedCompanyId})/items`);
  return data.value;
}

// Example: Get products with filter
async function searchProducts(companyId, searchTerm) {
  const encodedCompanyId = encodeURIComponent(companyId);
  const filter = `$filter=contains(displayName, '${searchTerm}')`;
  const data = await fetchBCAPI(`/companies(${encodedCompanyId})/items?${filter}`);
  return data.value;
}

// Example: Get customers
async function getCustomers(companyId) {
  const encodedCompanyId = encodeURIComponent(companyId);
  const data = await fetchBCAPI(`/companies(${encodedCompanyId})/customers`);
  return data.value;
}

// Example: Get discount requests
async function getDiscountRequests(companyId, status = null) {
  const encodedCompanyId = encodeURIComponent(companyId);
  let endpoint = `/companies(${encodedCompanyId})/discountRequests`;

  if (status) {
    endpoint += `?$filter=status eq '${status}'`;
  }

  const data = await fetchBCAPI(endpoint);
  return data.value;
}

// Example: Create discount request
async function createDiscountRequest(companyId, requestData) {
  const encodedCompanyId = encodeURIComponent(companyId);
  const data = await fetchBCAPI(`/companies(${encodedCompanyId})/discountRequests`, {
    method: 'POST',
    body: JSON.stringify(requestData)
  });
  return data;
}

// Usage example
(async () => {
  try {
    // Get companies
    const companies = await getCompanies();
    console.log('Companies:', companies);

    if (companies.length > 0) {
      const companyId = companies[0].id;

      // Get products
      const products = await getProducts(companyId);
      console.log('Products:', products);

      // Get customers
      const customers = await getCustomers(companyId);
      console.log('Customers:', customers);

      // Get discount requests
      const discountRequests = await getDiscountRequests(companyId, 'Pending');
      console.log('Pending Discount Requests:', discountRequests);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

---

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid access token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "error": {
    "code": "BadRequest",
    "message": "Invalid filter expression",
    "target": "items",
    "details": []
  }
}
```

### Error Handling Example

```javascript
async function safeFetchBCAPI(endpoint, options = {}) {
  try {
    const data = await fetchBCAPI(endpoint, options);
    return { success: true, data };
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

// Usage
const result = await safeFetchBCAPI('/companies');
if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## OData Query Options

Business Central APIs support OData query options:

### $filter
Filter results based on conditions:
```
?$filter=displayName eq 'Product Name'
?$filter=inventory gt 10
?$filter=contains(displayName, 'Quartz')
```

### $select
Select specific fields:
```
?$select=id,number,displayName,unitPrice
```

### $orderby
Sort results:
```
?$orderby=displayName asc
?$orderby=unitPrice desc
```

### $top
Limit number of results:
```
?$top=10
```

### $skip
Skip a number of results:
```
?$skip=20
```

### Combined Example
```
?$filter=inventory gt 0&$select=id,number,displayName,inventory&$orderby=displayName asc&$top=50
```

---

## Notes

1. **Environment**: Always use `Production` for production environment
2. **Company ID**: Must be URL-encoded when used in URLs
3. **Authentication**: Access tokens expire; implement token refresh
4. **Rate Limiting**: Be mindful of API rate limits
5. **Custom Fields**: Custom fields are available via the custom API endpoints
6. **Pagination**: Use `$top` and `$skip` for large datasets

---

## Support

For issues or questions:
- Check Business Central API documentation
- Verify extension installation in BC Admin Center
- Ensure proper permissions are assigned
- Check access token validity
