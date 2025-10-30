# QuickBooks Desktop Integration with Conductor SDK

This application integrates with QuickBooks Desktop using the [Conductor SDK](https://docs.conductor.is). The integration provides CRUD operations for customers and other QuickBooks entities.

## Setup

### 1. Install Dependencies

The Conductor SDK is already included in the project dependencies:

```bash
npm install conductor-node
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Conductor API Key
# Get your API key from https://dashboard.conductor.is
CONDUCTOR_API_KEY=sk_conductor_your_secret_key_here

# Conductor End User ID
# This identifies your QuickBooks Desktop connection
# Get this from Conductor dashboard after connecting QuickBooks Desktop
CONDUCTOR_END_USER_ID=your_end_user_id_here
```

**Important**: Never commit your API key or end user ID to version control. Keep them in your `.env` file which should be listed in `.gitignore`.

### 3. Get Your Conductor API Key

1. Sign up or log in at [https://dashboard.conductor.is](https://dashboard.conductor.is)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key and add it to your `.env` file

### 4. Connect QuickBooks Desktop

Follow Conductor's documentation to connect your QuickBooks Desktop instance:
- Install the Conductor Desktop Connector
- Link your QuickBooks Desktop application
- Get your `endUserId` from the Conductor dashboard
- Add the `endUserId` to your `.env` file as `CONDUCTOR_END_USER_ID`

## API Endpoints

**Note**: Authentication is currently disabled for easier testing and development. All endpoints are publicly accessible. The `endUserId` is automatically read from the `CONDUCTOR_END_USER_ID` environment variable.

⚠️ **Security Warning**: In production, you should enable authentication by setting `auth: true` in the API route handlers.

### Health Check

Check if QuickBooks Desktop connection is active and ready.

```http
GET /api/quickbooks/health-check
```

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "duration": 100,
  "message": "QuickBooks Desktop connection is active and ready to process requests"
}
```

### List Customers

Retrieve a paginated list of customers from QuickBooks Desktop.

```http
GET /api/quickbooks/customers?limit={limit}&cursor={cursor}
```

**Query Parameters:**
- `limit` (optional): Number of results per page (1-100, default: 50)
- `cursor` (optional): Pagination cursor for next page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "customer_123",
      "displayName": "John Doe",
      "email": "john@example.com",
      // ... other customer fields
    }
  ],
  "nextCursor": "cursor_for_next_page",
  "previousCursor": null
}
```

### Get Single Customer

Retrieve details of a specific customer.

```http
GET /api/quickbooks/customers/{customerId}
```

**Parameters:**
- `customerId` (path): QuickBooks customer ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer_123",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "billingAddress": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001"
    },
    "revisionNumber": "123456789",
    // ... other fields
  }
}
```

### Create Customer

Create a new customer in QuickBooks Desktop.

```http
POST /api/quickbooks/customers
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Doe Enterprises",
  "email": "john@example.com",
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
  "note": "VIP Customer",
  "isActive": true
}
```

**Required Fields:**
- `name`: Customer name (max 41 characters) - used in QuickBooks lists and hierarchies

**Optional Fields:**
- `firstName`, `lastName`, `companyName`
- `email`, `phone`, `fax`
- `billingAddress`, `shippingAddress`
- `note` (max 4095 characters)
- `isActive` (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer_123",
    "name": "John Doe",
    "fullName": "John Doe",
    "revisionNumber": "123456789",
    // ... other fields
  },
  "message": "Customer created successfully"
}
```

**Note:** QuickBooks uses `name` for the customer's short name and `fullName` for the fully-qualified hierarchical name. For top-level customers, these are often the same.

### Update Customer

Update an existing customer in QuickBooks Desktop.

```http
PATCH /api/quickbooks/customers/{customerId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "revisionNumber": "123456789",
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "phone": "+1987654321",
  "isActive": true
}
```

**Required Fields:**
- `revisionNumber`: Current revision number (for optimistic locking - prevents conflicts)

**Optional Fields:**
- All fields from create operation can be updated

**Important**: The `revisionNumber` is required to prevent update conflicts. Get it from the customer data when you retrieve it.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer_123",
    "name": "John Doe Updated",
    "fullName": "John Doe Updated",
    "revisionNumber": "123456790",
    // ... other fields
  },
  "message": "Customer updated successfully"
}
```

**Tip:** To "delete" a customer, set `isActive` to `false`. This hides the customer from most QuickBooks views while preserving all historical data.

### Note on Deleting Customers

**Important:** QuickBooks Desktop does not support deleting customers through the API. Instead, you can mark a customer as inactive by setting `isActive` to `false` when updating the customer. This will hide the customer from most views in QuickBooks while preserving historical data.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Technical error message",
  "userFacingMessage": "User-friendly error message to display in your app"
}
```

**Common Error Scenarios:**

1. **QuickBooks Desktop not running**
   - HTTP 503
   - Message: "Cannot connect to QuickBooks Desktop..."

2. **Wrong company file open**
   - HTTP 500
   - Message: "Failed to process request. Please ensure the correct company file is open."

3. **Modal dialog blocking**
   - HTTP 500
   - Message: "QuickBooks Desktop is busy. Please close any open dialogs."

4. **Invalid data**
   - HTTP 400
   - Message: Validation error details from Zod schema

5. **Authentication required**
   - HTTP 401
   - Message: "Unauthorized"

## Usage Examples

### JavaScript/TypeScript (Frontend)

```typescript
// Health check
async function checkQuickBooksConnection(endUserId: string) {
  const response = await fetch(
    `/api/quickbooks/health-check?endUserId=${endUserId}`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log('QuickBooks is connected!', data.status);
  } else {
    console.error('Connection failed:', data.userFacingMessage);
  }
}

// List customers
async function getCustomers(endUserId: string, limit = 50) {
  const response = await fetch(
    `/api/quickbooks/customers?endUserId=${endUserId}&limit=${limit}`
  );
  const data = await response.json();
  
  return data.data; // Array of customers
}

// Create customer
async function createCustomer(endUserId: string, customerData: any) {
  const response = await fetch('/api/quickbooks/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endUserId,
      ...customerData,
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Customer created:', data.data);
  } else {
    console.error('Failed:', data.userFacingMessage);
  }
  
  return data;
}

// Update customer
async function updateCustomer(
  endUserId: string,
  customerId: string,
  revisionNumber: string,
  updates: any
) {
  const response = await fetch(`/api/quickbooks/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endUserId,
      revisionNumber,
      ...updates,
    }),
  });
  
  return await response.json();
}

// Mark customer as inactive (QuickBooks doesn't support true deletion)
async function deactivateCustomer(
  endUserId: string,
  customerId: string,
  revisionNumber: string
) {
  return await updateCustomer(endUserId, customerId, revisionNumber, {
    isActive: false,
  });
}
```

### React Hook Example

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useQuickBooksCustomers(endUserId: string) {
  // List customers
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['qb-customers', endUserId],
    queryFn: async () => {
      const response = await fetch(
        `/api/quickbooks/customers?endUserId=${endUserId}`
      );
      const data = await response.json();
      return data.data;
    },
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch('/api/quickbooks/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endUserId, ...customerData }),
      });
      return await response.json();
    },
  });

  return {
    customers,
    isLoading,
    error,
    createCustomer: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

## Architecture

The integration follows a clean architecture pattern:

```
apps/web/
├── app/api/quickbooks/          # API route handlers
│   ├── health-check/
│   │   └── route.ts            # Health check endpoint
│   └── customers/
│       ├── route.ts            # List & Create customers
│       └── [id]/
│           └── route.ts        # Get, Update, Delete customer
├── lib/quickbooks/              # Business logic layer
│   ├── conductor.service.ts    # Conductor SDK wrapper service
│   └── schemas.ts              # Zod validation schemas
```

### Service Layer (`conductor.service.ts`)

Encapsulates all Conductor SDK interactions with:
- Error handling and logging
- Type-safe API wrapper methods
- Centralized SDK initialization

### Validation Layer (`schemas.ts`)

Zod schemas for:
- Request validation
- Type inference
- Runtime type checking
- Consistent error messages

### API Layer (`route.ts` files)

Next.js API routes using `enhanceRouteHandler`:
- Authentication enforcement
- Request/response handling
- User-friendly error messages
- Logging and monitoring

## Best Practices

1. **Always check connection health** before performing operations
2. **Store `endUserId` securely** per user/organization
3. **Handle the `revisionNumber`** properly for updates to prevent conflicts
4. **Display `userFacingMessage`** to end users instead of technical errors
5. **Use pagination** for listing large datasets
6. **Implement retry logic** for transient failures
7. **Cache customer data** when appropriate to reduce API calls

## Troubleshooting

### "Cannot connect to QuickBooks Desktop"
- Ensure QuickBooks Desktop is running
- Verify the Conductor Desktop Connector is installed and running
- Check that the correct company file is open

### "Validation error"
- Check that all required fields are provided
- Verify field lengths and formats match schema requirements
- Ensure `endUserId` is valid and active

### "Failed to create/update customer"
- Verify QuickBooks Desktop is not in single-user mode (should be in multi-user mode)
- Close any modal dialogs in QuickBooks
- Check that the customer display name is unique (if required by QB)

## Additional Resources

- [Conductor Documentation](https://docs.conductor.is)
- [Conductor Dashboard](https://dashboard.conductor.is)
- [QuickBooks Desktop API Reference](https://docs.conductor.is/api-ref/qbd)
- [Conductor Node.js SDK](https://www.npmjs.com/package/conductor-node)

## Future Enhancements

Potential additions to this integration:

- [ ] Invoices CRUD operations
- [ ] Products/Items management
- [ ] Payments processing
- [ ] Reports generation
- [ ] Webhooks for real-time updates
- [ ] Batch operations for bulk updates
- [ ] Advanced filtering and search
- [ ] Customer portal integration

