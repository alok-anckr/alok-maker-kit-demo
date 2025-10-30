# QuickBooks Desktop Integration - Implementation Summary

This document provides a quick reference for the QuickBooks Desktop customers CRUD implementation using the Conductor SDK.

## Files Created

### 1. Service Layer
**`apps/web/lib/quickbooks/conductor.service.ts`**
- Centralized service for all Conductor SDK interactions
- Methods: `healthCheck`, `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`
- Includes comprehensive error handling and logging
- Factory pattern: use `createConductorService()` to instantiate

### 2. Validation Schemas
**`apps/web/lib/quickbooks/schemas.ts`**
- Zod schemas for all API operations
- Type-safe validation with TypeScript inference
- Schemas: `CreateCustomerSchema`, `UpdateCustomerSchema`, `ListCustomersSchema`, `GetCustomerSchema`, `HealthCheckSchema`

### 3. API Routes
**`apps/web/app/api/quickbooks/health-check/route.ts`**
- GET endpoint to check QuickBooks connection status
- Returns connection health and response time

**`apps/web/app/api/quickbooks/customers/route.ts`**
- GET: List customers with pagination
- POST: Create new customer

**`apps/web/app/api/quickbooks/customers/[id]/route.ts`**
- GET: Retrieve single customer by ID
- PATCH: Update existing customer

### 4. Documentation
**`apps/web/QUICKBOOKS.md`**
- Complete API documentation
- Setup instructions
- Usage examples
- Error handling guide
- Best practices

**`apps/web/lib/quickbooks/README.md`**
- Module-level documentation
- Service layer usage guide
- Type reference

## Quick Start

### 1. Setup Environment Variables
```bash
# Add to .env file
CONDUCTOR_API_KEY=sk_conductor_your_secret_key_here
CONDUCTOR_END_USER_ID=end_usr_your_end_user_id_here
```

**Note**: The `CONDUCTOR_END_USER_ID` is automatically read by all APIs for security. You don't need to pass it in requests.

### 2. Health Check
```bash
curl -X GET "http://localhost:3000/api/quickbooks/health-check"
```

### 3. Create Customer
```bash
curl -X POST "http://localhost:3000/api/quickbooks/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

### 4. List Customers
```bash
curl -X GET "http://localhost:3000/api/quickbooks/customers?limit=50"
```

### 5. Get Customer
```bash
curl -X GET "http://localhost:3000/api/quickbooks/customers/CUSTOMER_ID"
```

### 6. Update Customer
```bash
curl -X PATCH "http://localhost:3000/api/quickbooks/customers/CUSTOMER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "revisionNumber": "123456789",
    "email": "newemail@example.com",
    "isActive": true
  }'
```

## Important Notes

### Customer Naming
- QuickBooks uses `name` (short name, max 41 chars) and `fullName` (hierarchical name)
- For top-level customers, `name` and `fullName` are usually the same
- `name` is required when creating customers

### Revision Numbers
- Always provide `revisionNumber` when updating
- This prevents concurrent update conflicts (optimistic locking)
- Get the current revision number by fetching the customer first

### No Delete Operation
- QuickBooks Desktop doesn't support deleting customers via API
- Instead, set `isActive: false` to deactivate/hide customers
- This preserves historical transaction data

### Error Handling
- All endpoints return consistent error responses
- `userFacingMessage` property contains user-friendly error text
- Common errors: QB not running, wrong company file open, modal dialogs blocking

## Architecture

```
┌─────────────────────────────────────────────┐
│         API Routes (Next.js)                │
│  - Authentication enforcement               │
│  - Request/response handling                │
│  - User-friendly error messages             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Service Layer (conductor.service)      │
│  - Conductor SDK wrapper                    │
│  - Error handling & logging                 │
│  - Type-safe methods                        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│     Validation Layer (schemas.ts)           │
│  - Zod schemas for validation               │
│  - TypeScript type inference                │
│  - Runtime type checking                    │
└─────────────────────────────────────────────┘
```

## Code Examples

### Using the Service Layer
```typescript
import { createConductorService } from '~/lib/quickbooks/conductor.service';

const service = createConductorService();

// List customers
const customers = await service.listCustomers({
  endUserId: 'end_usr_xxx',
  limit: 50,
});

// Create customer
const newCustomer = await service.createCustomer({
  endUserId: 'end_usr_xxx',
  customer: {
    name: 'Acme Corp',
    email: 'contact@acme.com',
  },
});

// Update customer
const updated = await service.updateCustomer({
  endUserId: 'end_usr_xxx',
  customerId: 'cust_123',
  revisionNumber: '987654321',
  customer: {
    name: 'Acme Corporation',
  },
});
```

### React Hook with React Query
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useQuickBooksCustomers(endUserId: string) {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['qb-customers', endUserId],
    queryFn: async () => {
      const response = await fetch(
        `/api/quickbooks/customers?endUserId=${endUserId}`
      );
      const data = await response.json();
      return data.data;
    },
  });

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
    createCustomer: createMutation.mutate,
  };
}
```

## Testing

### Manual Testing Checklist
- [ ] Health check returns 200 OK
- [ ] List customers returns array
- [ ] Create customer succeeds with minimal fields
- [ ] Create customer succeeds with all fields
- [ ] Get customer by ID returns full data
- [ ] Update customer with revision number succeeds
- [ ] Update without revision number fails
- [ ] Setting isActive=false hides customer
- [ ] Pagination works with cursor
- [ ] Error messages are user-friendly

### Common Test Scenarios
1. **QuickBooks not running**: Should return 503 with helpful message
2. **Wrong company file**: Should fail with descriptive error
3. **Modal dialog open**: Should timeout with guidance
4. **Invalid end user ID**: Should return authentication error
5. **Concurrent updates**: Second update should fail (optimistic locking)

## Next Steps

### Extending the Integration
To add support for other QuickBooks entities (invoices, products, etc.):

1. Add methods to `conductor.service.ts`
2. Create Zod schemas in `schemas.ts`
3. Create API routes following the same pattern
4. Update `QUICKBOOKS.md` documentation
5. Add usage examples

### Recommended Additions
- [ ] Invoices CRUD
- [ ] Products/Items management
- [ ] Payments processing
- [ ] Webhooks for real-time sync
- [ ] Batch operations
- [ ] Advanced filtering and search
- [ ] Reports generation

## Troubleshooting

### "Cannot connect to QuickBooks Desktop"
- Ensure QuickBooks Desktop is running
- Verify Conductor Desktop Connector is installed
- Check that correct company file is open

### "Validation error"
- Check all required fields are provided
- Verify field lengths match schema requirements
- Ensure `endUserId` is valid

### "Failed to create/update customer"
- Verify QuickBooks is in multi-user mode
- Close any modal dialogs in QuickBooks
- Check customer name is unique (if required)

## Resources

- [Conductor Documentation](https://docs.conductor.is)
- [Conductor Dashboard](https://dashboard.conductor.is)
- [QuickBooks Desktop API Reference](https://docs.conductor.is/api-ref/qbd)
- [Conductor Node.js SDK](https://www.npmjs.com/package/conductor-node)

## Support

For issues with:
- **This implementation**: Check `QUICKBOOKS.md` and `lib/quickbooks/README.md`
- **Conductor SDK**: Visit [Conductor Docs](https://docs.conductor.is)
- **QuickBooks Desktop**: Refer to Intuit's official documentation

