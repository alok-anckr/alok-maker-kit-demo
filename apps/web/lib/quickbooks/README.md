# QuickBooks Integration Module

This module provides the business logic layer for integrating with QuickBooks Desktop using the Conductor SDK.

## Files

- **`conductor.service.ts`**: Service layer that wraps the Conductor SDK
  - Provides type-safe methods for all QB operations
  - Includes error handling and logging
  - Centralizes SDK initialization

- **`schemas.ts`**: Zod validation schemas for all API operations
  - Request validation
  - Type inference
  - Runtime type checking

## Usage

### Import the Service

```typescript
import { createConductorService } from '~/lib/quickbooks/conductor.service';

const service = createConductorService();
```

### Available Methods

#### Health Check
```typescript
const health = await service.healthCheck(endUserId);
// Returns: { status: 'ok', duration: 100 }
```

#### List Customers
```typescript
const customers = await service.listCustomers({
  endUserId: 'end_usr_123',
  limit: 50,
  cursor: 'optional-cursor',
});
// Returns: { data: [...], nextCursor: '...', previousCursor: null }
```

#### Get Customer
```typescript
const customer = await service.getCustomer({
  endUserId: 'end_usr_123',
  customerId: 'customer_123',
});
// Returns: Customer object
```

#### Create Customer
```typescript
const newCustomer = await service.createCustomer({
  endUserId: 'end_usr_123',
  customer: {
    displayName: 'John Doe',
    email: 'john@example.com',
    // ... other fields
  },
});
// Returns: Created customer with ID
```

#### Update Customer
```typescript
const updated = await service.updateCustomer({
  endUserId: 'end_usr_123',
  customerId: 'customer_123',
  revisionNumber: '123456789', // Required for optimistic locking
  customer: {
    displayName: 'John Doe Updated',
    // ... fields to update
  },
});
// Returns: Updated customer
```

#### Delete Customer
```typescript
await service.deleteCustomer({
  endUserId: 'end_usr_123',
  customerId: 'customer_123',
});
// Returns: { success: true }
```

## Error Handling

All methods include proper error handling and logging. Errors are logged with context and then re-thrown for handling at the API layer.

```typescript
try {
  const customer = await service.getCustomer({ ... });
} catch (error) {
  // Error is already logged
  // Handle appropriately in your API route
}
```

## Schemas

Import validation schemas for use in API routes:

```typescript
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ListCustomersSchema,
  GetCustomerSchema,
  DeleteCustomerSchema,
  HealthCheckSchema,
} from '~/lib/quickbooks/schemas';

// Use with enhanceRouteHandler
export const POST = enhanceRouteHandler(
  async ({ body }) => {
    // body is automatically validated
    // ...
  },
  {
    schema: CreateCustomerSchema,
    auth: true,
  }
);
```

## Type Safety

All schemas export TypeScript types:

```typescript
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
  GetCustomerInput,
  DeleteCustomerInput,
  HealthCheckInput,
  Address,
} from '~/lib/quickbooks/schemas';
```

## Configuration

The service automatically reads the `CONDUCTOR_API_KEY` from environment variables. Make sure it's set in your `.env` file:

```env
CONDUCTOR_API_KEY=sk_conductor_your_secret_key_here
```

## Logging

All operations are logged using the `@kit/shared/logger` package. Logs include:
- Operation name
- End user ID
- Success/failure status
- Error details (if any)
- Performance metrics (where applicable)

Example log output:
```
[INFO] conductor.getCustomer - Fetching customer from QuickBooks Desktop...
[INFO] conductor.getCustomer - Successfully fetched customer (customerId: customer_123)
```

## Best Practices

1. **Always use the service layer** - Don't call the Conductor SDK directly from API routes
2. **Validate all inputs** - Use the provided Zod schemas
3. **Handle errors gracefully** - Catch errors and provide user-friendly messages
4. **Use TypeScript types** - Import types from schemas for type safety
5. **Log operations** - The service already logs, but add context in your API routes
6. **Check health before operations** - Use health check to verify QB connection
7. **Handle revision numbers** - Always include revision number for updates

## Extension

To add support for more QuickBooks entities (invoices, products, etc.):

1. Add new methods to `ConductorService` class
2. Create corresponding Zod schemas in `schemas.ts`
3. Export types for TypeScript
4. Create API routes in `apps/web/app/api/quickbooks/`
5. Document in the main QUICKBOOKS.md file


