import { z } from 'zod';

/**
 * Address schema for customer billing and shipping addresses
 */
export const AddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Schema for creating a new customer
 * Note: endUserId is read from CONDUCTOR_END_USER_ID environment variable
 */
export const CreateCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'Customer name is required')
    .max(41, 'Customer name must be less than 41 characters')
    .describe('Customer name in QuickBooks'),
  firstName: z.string().max(25).optional(),
  lastName: z.string().max(25).optional(),
  companyName: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  note: z.string().max(4095).optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating an existing customer
 * Note: endUserId is read from CONDUCTOR_END_USER_ID environment variable
 */
export const UpdateCustomerSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .describe('QuickBooks customer ID')
    .optional(), // Made optional since it comes from URL params
  revisionNumber: z
    .string()
    .min(1, 'Revision number is required')
    .describe(
      'QuickBooks revision number for optimistic locking - prevents conflicts',
    ),
  name: z
    .string()
    .min(1)
    .max(41, 'Customer name must be less than 41 characters')
    .optional(),
  firstName: z.string().max(25).optional(),
  lastName: z.string().max(25).optional(),
  companyName: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  note: z.string().max(4095).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for listing customers with pagination
 * Note: endUserId is read from CONDUCTOR_END_USER_ID environment variable
 */
export const ListCustomersSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Number of results per page (1-100)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor for the next page of results'),
});

/**
 * Schema for getting a single customer
 * Note: endUserId is read from CONDUCTOR_END_USER_ID environment variable
 */
export const GetCustomerSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .describe('QuickBooks customer ID'),
});


/**
 * Schema for health check request
 * Note: endUserId is read from CONDUCTOR_END_USER_ID environment variable
 */
export const HealthCheckSchema = z.object({});

// Type exports for TypeScript
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type ListCustomersInput = z.infer<typeof ListCustomersSchema>;
export type GetCustomerInput = z.infer<typeof GetCustomerSchema>;
export type HealthCheckInput = z.infer<typeof HealthCheckSchema>;
export type Address = z.infer<typeof AddressSchema>;

