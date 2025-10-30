# QuickBooks API - Postman Testing Guide

This guide shows you how to test the QuickBooks Desktop API endpoints using Postman.

## Prerequisites

1. **Running Application**: Make sure your Next.js app is running
   ```bash
   pnpm dev
   ```

2. **Authentication Token**: You need a valid authentication token from your app
   - Sign in to your app at `http://localhost:3000`
   - Open browser DevTools → Application/Storage → Cookies
   - Copy the session cookie value (usually named `sb-access-token` or similar)

3. **Conductor End User ID**: You need your Conductor end user ID
   - Get this from your Conductor dashboard at https://dashboard.conductor.is
   - Example: `end_usr_1234567abcdefg`

## Postman Setup

### Step 1: Create a New Collection

1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: `QuickBooks Desktop API`
4. Click **"Create"**

### Step 2: Set Collection Variables

1. Click on your collection
2. Go to **"Variables"** tab
3. Add these variables:

| Variable | Type | Initial Value | Current Value |
|----------|------|---------------|---------------|
| `baseUrl` | default | `http://localhost:3000` | `http://localhost:3000` |
| `authToken` | secret | `your-jwt-token-here` | `your-jwt-token-here` |
| `endUserId` | default | `end_usr_1234567abcdefg` | `end_usr_1234567abcdefg` |
| `customerId` | default | (leave empty for now) | (leave empty for now) |

4. Click **"Save"**

### Step 3: Configure Collection Authorization

1. Still in your collection settings
2. Go to **"Authorization"** tab
3. Select **Type**: `Bearer Token`
4. **Token**: `{{authToken}}`
5. Click **"Save"**

This will automatically add the authorization header to all requests in the collection.

## API Endpoints

### 1. Health Check

**Purpose**: Check if QuickBooks Desktop connection is active

**Request Setup**:
```
Method: GET
URL: {{baseUrl}}/api/quickbooks/health-check?endUserId={{endUserId}}
```

**Postman Steps**:
1. Create new request in your collection
2. Name it: `Health Check`
3. Method: `GET`
4. URL: `{{baseUrl}}/api/quickbooks/health-check?endUserId={{endUserId}}`
5. Click **"Send"**

**Expected Response** (200 OK):
```json
{
  "success": true,
  "status": "ok",
  "duration": 100,
  "message": "QuickBooks Desktop connection is active and ready to process requests"
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "success": false,
  "status": "error",
  "error": "Connection timeout",
  "userFacingMessage": "Cannot connect to QuickBooks Desktop. Please ensure QuickBooks is running, the correct company file is open, and no modal dialogs are blocking the connection."
}
```

---

### 2. List Customers

**Purpose**: Get a paginated list of customers from QuickBooks

**Request Setup**:
```
Method: GET
URL: {{baseUrl}}/api/quickbooks/customers?endUserId={{endUserId}}&limit=50
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endUserId` | string | Yes | Your Conductor end user ID |
| `limit` | number | No | Number of results (1-100, default: 50) |
| `cursor` | string | No | Pagination cursor for next page |

**Postman Steps**:
1. Create new request: `List Customers`
2. Method: `GET`
3. URL: `{{baseUrl}}/api/quickbooks/customers`
4. Go to **"Params"** tab
5. Add query parameters:
   - `endUserId`: `{{endUserId}}`
   - `limit`: `50`
6. Click **"Send"**

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "80000001-1234567890",
      "name": "ABC Corporation",
      "fullName": "ABC Corporation",
      "companyName": "ABC Corporation",
      "email": "contact@abc.com",
      "phone": "+1234567890",
      "billingAddress": {
        "line1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001"
      },
      "balance": "1500.00",
      "isActive": true,
      "revisionNumber": "1234567890",
      "createdAt": "2024-01-15T10:30:00-05:00",
      "updatedAt": "2024-01-20T14:15:00-05:00"
    }
  ],
  "nextCursor": "cursor_for_next_page"
}
```

**Tips**:
- Save the `id` of a customer to use in subsequent tests
- Copy `nextCursor` to get the next page of results

---

### 3. Get Single Customer

**Purpose**: Retrieve detailed information about a specific customer

**Request Setup**:
```
Method: GET
URL: {{baseUrl}}/api/quickbooks/customers/{{customerId}}?endUserId={{endUserId}}
```

**Postman Steps**:
1. First, get a customer ID from the "List Customers" request
2. Update your collection variable `customerId` with a real customer ID
3. Create new request: `Get Customer`
4. Method: `GET`
5. URL: `{{baseUrl}}/api/quickbooks/customers/{{customerId}}`
6. Go to **"Params"** tab
7. Add query parameter:
   - `endUserId`: `{{endUserId}}`
8. Click **"Send"**

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "80000001-1234567890",
    "name": "ABC Corporation",
    "fullName": "ABC Corporation",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "ABC Corporation",
    "email": "contact@abc.com",
    "phone": "+1234567890",
    "fax": "+1234567891",
    "billingAddress": {
      "line1": "123 Main St",
      "line2": "Suite 100",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "shippingAddress": {
      "line1": "456 Shipping Ave",
      "city": "Brooklyn",
      "state": "NY",
      "postalCode": "11201",
      "country": "USA"
    },
    "balance": "1500.00",
    "isActive": true,
    "note": "VIP Customer",
    "revisionNumber": "1234567890",
    "createdAt": "2024-01-15T10:30:00-05:00",
    "updatedAt": "2024-01-20T14:15:00-05:00"
  }
}
```

**Important**: Save the `revisionNumber` - you'll need it for updates!

---

### 4. Create Customer

**Purpose**: Create a new customer in QuickBooks Desktop

**Request Setup**:
```
Method: POST
URL: {{baseUrl}}/api/quickbooks/customers
Content-Type: application/json
```

**Postman Steps**:
1. Create new request: `Create Customer`
2. Method: `POST`
3. URL: `{{baseUrl}}/api/quickbooks/customers`
4. Go to **"Headers"** tab (should already have Authorization from collection)
5. Go to **"Body"** tab
6. Select **"raw"** and **"JSON"**
7. Paste the request body below
8. Click **"Send"**

**Request Body** (Minimal):
```json
{
  "endUserId": "{{endUserId}}",
  "name": "Test Customer Company",
  "email": "test@example.com"
}
```

**Request Body** (Complete):
```json
{
  "endUserId": "{{endUserId}}",
  "name": "Acme Corporation",
  "firstName": "Jane",
  "lastName": "Smith",
  "companyName": "Acme Corporation",
  "email": "jane@acme.com",
  "phone": "+1-555-0100",
  "fax": "+1-555-0101",
  "billingAddress": {
    "line1": "789 Business Blvd",
    "line2": "Floor 5",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "USA"
  },
  "shippingAddress": {
    "line1": "789 Business Blvd",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "USA"
  },
  "note": "New client onboarded via API",
  "isActive": true
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "80000002-9876543210",
    "name": "Acme Corporation",
    "fullName": "Acme Corporation",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@acme.com",
    "revisionNumber": "0987654321",
    // ... other fields
  },
  "message": "Customer created successfully"
}
```

**After Success**:
- Save the `id` and `revisionNumber` from the response
- Update your `customerId` collection variable with this new ID

---

### 5. Update Customer

**Purpose**: Update an existing customer in QuickBooks Desktop

**Request Setup**:
```
Method: PATCH
URL: {{baseUrl}}/api/quickbooks/customers/{{customerId}}
Content-Type: application/json
```

**Postman Steps**:
1. **IMPORTANT**: First, get the customer's current `revisionNumber` using "Get Customer"
2. Create new request: `Update Customer`
3. Method: `PATCH`
4. URL: `{{baseUrl}}/api/quickbooks/customers/{{customerId}}`
5. Go to **"Body"** tab
6. Select **"raw"** and **"JSON"**
7. Paste the request body below (update `revisionNumber` with the actual value)
8. Click **"Send"**

**Request Body** (Minimal Update):
```json
{
  "endUserId": "{{endUserId}}",
  "revisionNumber": "1234567890",
  "email": "newemail@example.com"
}
```

**Request Body** (Multiple Fields):
```json
{
  "endUserId": "{{endUserId}}",
  "revisionNumber": "1234567890",
  "name": "Acme Corp (Updated)",
  "email": "updated@acme.com",
  "phone": "+1-555-0200",
  "note": "Updated via API",
  "isActive": true
}
```

**Request Body** (Deactivate Customer):
```json
{
  "endUserId": "{{endUserId}}",
  "revisionNumber": "1234567890",
  "isActive": false
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "80000001-1234567890",
    "name": "Acme Corp (Updated)",
    "email": "updated@acme.com",
    "revisionNumber": "1234567891",
    // ... other fields
  },
  "message": "Customer updated successfully"
}
```

**Important Notes**:
- The `revisionNumber` MUST match the current value in QuickBooks
- If someone else updated the customer, you'll get an error - fetch the customer again to get the new revision number
- The `revisionNumber` changes with every update

---

## Testing Workflow

### Complete Test Sequence

1. **Health Check** → Verify QuickBooks is connected
2. **Create Customer** → Save the returned `id` and `revisionNumber`
3. **Get Customer** → Verify the customer was created correctly
4. **List Customers** → See the new customer in the list
5. **Update Customer** → Modify some fields using the saved `revisionNumber`
6. **Get Customer** → Verify the updates were applied

### Using Test Scripts in Postman

You can automate saving values using Postman's test scripts:

**For "Create Customer" request**, add this to the **"Tests"** tab:
```javascript
// Save customer ID and revision number to collection variables
const response = pm.response.json();
if (response.success && response.data) {
    pm.collectionVariables.set("customerId", response.data.id);
    pm.collectionVariables.set("revisionNumber", response.data.revisionNumber);
    console.log("Saved customerId:", response.data.id);
    console.log("Saved revisionNumber:", response.data.revisionNumber);
}
```

**For "Get Customer" request**, add this to the **"Tests"** tab:
```javascript
// Save revision number for updates
const response = pm.response.json();
if (response.success && response.data) {
    pm.collectionVariables.set("revisionNumber", response.data.revisionNumber);
    console.log("Updated revisionNumber:", response.data.revisionNumber);
}
```

**For "Update Customer" request**, add this to the **"Pre-request Script"** tab:
```javascript
// Automatically use the saved revision number in request body
const revisionNumber = pm.collectionVariables.get("revisionNumber");
const requestBody = JSON.parse(pm.request.body.raw);
requestBody.revisionNumber = revisionNumber;
pm.request.body.raw = JSON.stringify(requestBody, null, 2);
```

---

## Common Issues & Solutions

### 401 Unauthorized
**Problem**: Invalid or expired authentication token

**Solution**:
1. Sign in to your app again
2. Get a fresh token from browser cookies
3. Update the `authToken` collection variable in Postman
4. Try the request again

### 503 Service Unavailable (Health Check)
**Problem**: Cannot connect to QuickBooks Desktop

**Solutions**:
- Ensure QuickBooks Desktop is running
- Verify the correct company file is open
- Check Conductor Desktop Connector is running
- Close any modal dialogs in QuickBooks
- Verify `endUserId` is correct

### 500 Internal Server Error (Create/Update)
**Problem**: Invalid data or QuickBooks error

**Solutions**:
- Check all required fields are provided
- Verify field lengths don't exceed limits
- For updates: ensure `revisionNumber` is current
- Check server logs for detailed error message

### 400 Bad Request
**Problem**: Validation error in request data

**Solutions**:
- Check the error message in response
- Verify all required fields are present
- Check field formats (email, phone numbers, etc.)
- Ensure field lengths are within limits

---

## Environment Setup (Production)

For testing against production:

1. Duplicate your collection
2. Rename it to `QuickBooks Desktop API (Production)`
3. Update variables:
   - `baseUrl`: `https://your-production-domain.com`
   - `authToken`: Production auth token
   - `endUserId`: Production end user ID

---

## Postman Collection Export

Want to share this collection? 

1. Click on your collection
2. Click the three dots (•••)
3. Select **"Export"**
4. Choose **"Collection v2.1"**
5. Save the JSON file
6. Share with your team!

---

## Tips & Best Practices

1. **Use Variables**: Store commonly used values as collection variables
2. **Use Tests**: Automate saving of IDs and revision numbers
3. **Use Folders**: Organize requests into folders (Health, Customers, etc.)
4. **Save Examples**: Save successful responses as examples for documentation
5. **Use Environments**: Create separate environments for dev/staging/production
6. **Monitor Logs**: Check console logs for detailed information
7. **Version Control**: Export and commit your Postman collection to Git

---

## Need Help?

- **API Documentation**: See `QUICKBOOKS.md` for complete API reference
- **Implementation Guide**: See `QUICKBOOKS-IMPLEMENTATION.md` for code examples
- **Conductor Docs**: https://docs.conductor.is
- **Postman Docs**: https://learning.postman.com


