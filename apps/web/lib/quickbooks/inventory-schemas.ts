import { z } from 'zod';

/**
 * Schema for creating a new inventory item
 */
export const CreateInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(31, 'Item name must be less than 31 characters'),
  incomeAccountId: z.string().min(1, 'Income account ID is required'),
  cogsAccountId: z.string().min(1, 'COGS account ID is required'),
  assetAccountId: z.string().min(1, 'Asset account ID is required'),
  barcode: z
    .object({
      value: z.string(),
      assignEvenIfUsed: z.boolean().optional(),
      allowOverride: z.boolean().optional(),
    })
    .optional(),
  isActive: z.boolean().optional().default(true),
  classId: z.string().optional(),
  parentId: z.string().optional(),
  sku: z.string().optional(),
  unitOfMeasureSetId: z.string().optional(),
  salesTaxCodeId: z.string().optional(),
  salesDescription: z.string().optional(),
  salesPrice: z.string().optional(),
  purchaseDescription: z.string().optional(),
  purchaseCost: z.string().optional(),
  purchaseTaxCodeId: z.string().optional(),
  preferredVendorId: z.string().optional(),
  reorderPoint: z.number().optional(),
  maximumQuantityOnHand: z.number().optional(),
  quantityOnHand: z.number().optional(),
  totalValue: z.string().optional(),
  inventoryDate: z.string().optional(),
  externalId: z.string().optional(),
});

/**
 * Schema for updating an existing inventory item
 */
export const UpdateInventoryItemSchema = z.object({
  revisionNumber: z
    .string()
    .min(1, 'Revision number is required for updates'),
  name: z
    .string()
    .min(1)
    .max(31, 'Item name must be less than 31 characters')
    .optional(),
  barcode: z
    .object({
      value: z.string(),
      assignEvenIfUsed: z.boolean().optional(),
      allowOverride: z.boolean().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  classId: z.string().optional(),
  parentId: z.string().optional(),
  sku: z.string().optional(),
  unitOfMeasureSetId: z.string().optional(),
  forceUnitOfMeasureChange: z.boolean().optional(),
  salesTaxCodeId: z.string().optional(),
  salesDescription: z.string().optional(),
  salesPrice: z.string().optional(),
  incomeAccountId: z.string().optional(),
  updateExistingTransactionsIncomeAccount: z.boolean().optional(),
  purchaseDescription: z.string().optional(),
  purchaseCost: z.string().optional(),
  purchaseTaxCodeId: z.string().optional(),
  cogsAccountId: z.string().optional(),
  updateExistingTransactionsCogsAccount: z.boolean().optional(),
  preferredVendorId: z.string().optional(),
  assetAccountId: z.string().optional(),
  reorderPoint: z.number().optional(),
  maximumQuantityOnHand: z.number().optional(),
});

/**
 * Schema for listing inventory items
 */
export const ListInventoryItemsSchema = z.object({
  limit: z.number().int().min(1).max(150).optional().default(150),
  cursor: z.string().optional(),
  ids: z.array(z.string()).optional(),
  fullNames: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  updatedAfter: z.string().optional(),
  updatedBefore: z.string().optional(),
  nameContains: z.string().optional(),
  nameStartsWith: z.string().optional(),
  nameEndsWith: z.string().optional(),
  nameFrom: z.string().optional(),
  nameTo: z.string().optional(),
  classIds: z.array(z.string()).optional(),
});

/**
 * Schema for getting a single inventory item
 */
export const GetInventoryItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

/**
 * Schema for creating an inventory adjustment
 * Used to adjust quantity on hand for inventory items
 */
export const CreateInventoryAdjustmentSchema = z.object({
  accountId: z.string().min(1, 'Adjustment account ID is required'),
  transactionDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
  lines: z.array(
    z.object({
      itemId: z.string().min(1, 'Item ID is required'),
      adjustQuantity: z.object({
        newQuantity: z.number().optional(),
        quantityDifference: z.number().optional(),
        serialNumber: z.string().optional(),
        lotNumber: z.string().optional(),
        expirationDate: z.string().optional(),
        inventorySiteLocationId: z.string().optional(),
      }),
    }),
  ).min(1, 'At least one line item is required'),
});

// Type exports for TypeScript
export type CreateInventoryItemInput = z.infer<
  typeof CreateInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof UpdateInventoryItemSchema
>;
export type ListInventoryItemsInput = z.infer<
  typeof ListInventoryItemsSchema
>;
export type GetInventoryItemInput = z.infer<typeof GetInventoryItemSchema>;
export type CreateInventoryAdjustmentInput = z.infer<
  typeof CreateInventoryAdjustmentSchema
>;
