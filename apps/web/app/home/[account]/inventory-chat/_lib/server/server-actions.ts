'use server';

import { enhanceAction } from '@kit/next/actions';
import { z } from 'zod';

import { createExcelService } from '~/lib/quickbooks/excel.service';
import { createInventoryService } from '~/lib/quickbooks/inventory.service';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  CreateInventoryAdjustmentSchema,
} from '~/lib/quickbooks/inventory-schemas';
import { createOpenAIService } from '~/lib/quickbooks/openai.service';

/**
 * Schema for chat message input
 */
const ChatMessageSchema = z.object({
  message: z.string().optional(),
  file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => {
        if (!file) return true;
        return file.name.match(/\.(xlsx?|csv)$/i);
      },
      {
        message: 'File must be an Excel or CSV file (.xlsx, .xls, .csv)',
      },
    ),
});

/**
 * Process a chat message and execute the corresponding inventory operation
 */
export const processChatMessage = enhanceAction(
  async (data) => {
    const { message, file } = data;

    // Get the end user ID from environment
    const endUserId = process.env.CONDUCTOR_END_USER_ID;

    if (!endUserId) {
      return {
        success: false,
        error: 'CONDUCTOR_END_USER_ID not configured',
        reply:
          'QuickBooks Desktop connection is not configured. Please contact your administrator.',
      };
    }

    try {
      // Handle Excel file upload
      if (file) {
        const excelService = createExcelService();
        const inventoryService = createInventoryService();

        // Read file as buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse Excel file
        const parseResult = await excelService.parseInventoryExcel(
          buffer,
          file.name,
        );

        if (!parseResult.success || parseResult.rows.length === 0) {
          return {
            success: false,
            error: 'Failed to parse Excel file',
            reply: `Failed to process Excel file "${file.name}":
${parseResult.errors.length > 0 ? `\n${parseResult.errors.map((e) => `Row ${e.rowNumber}: ${e.error}`).join('\n')}` : '\nNo valid rows found'}

Please check the file format and try again.`,
            data: parseResult,
          };
        }

        // Process each row
        const results = {
          total: parseResult.rows.length,
          successful: 0,
          failed: 0,
          created: 0,
          updated: 0,
          errors: [] as Array<{ rowNumber: number; error: string }>,
          successfulItems: [] as Array<{ rowNumber: number; action: string; name: string }>,
        };

        for (const row of parseResult.rows) {
          try {
            if (row.action === 'create') {
              const createData = {
                name: row.name!,
                sku: row.sku,
                salesPrice: row.salesPrice,
                purchaseCost: row.purchaseCost,
                salesDescription: row.salesDescription,
                purchaseDescription: row.purchaseDescription,
                quantityOnHand: row.quantityOnHand,
                reorderPoint: row.reorderPoint,
                maximumQuantityOnHand: row.maximumQuantityOnHand,
                incomeAccountId: row.incomeAccountId!,
                cogsAccountId: row.cogsAccountId!,
                assetAccountId: row.assetAccountId!,
                salesTaxCodeId: row.salesTaxCodeId,
                purchaseTaxCodeId: row.purchaseTaxCodeId,
                isActive: row.isActive,
                barcode: row.barcode ? { value: row.barcode } : undefined,
                preferredVendorId: row.preferredVendorId,
                classId: row.classId,
                parentId: row.parentId,
              };

              const validation = CreateInventoryItemSchema.safeParse(createData);

              if (!validation.success) {
                throw new Error(
                  `Validation failed: ${validation.error.errors.map((e) => e.message).join(', ')}`,
                );
              }

              await inventoryService.createInventoryItem({
                endUserId,
                item: validation.data,
              });

              results.successful++;
              results.created++;
              results.successfulItems.push({
                rowNumber: row.rowNumber,
                action: 'CREATED',
                name: row.name!,
              });
            } else if (row.action === 'update') {
              // Find item ID if not provided
              let itemId = row.itemId;

              if (!itemId && row.name) {
                const items = await inventoryService.listInventoryItems({
                  endUserId,
                  filters: {
                    nameContains: row.name,
                    limit: 10,
                  },
                });

                if (items.data.length === 0) {
                  throw new Error(`Item "${row.name}" not found`);
                }

                if (items.data.length > 1) {
                  throw new Error(
                    `Multiple items found matching "${row.name}". Please use ItemId instead.`,
                  );
                }

                itemId = items.data[0]!.id;
              }

              if (!itemId) {
                throw new Error('ItemId or Name is required for UPDATE');
              }

              // Get current item to retrieve revision number
              const currentItem = await inventoryService.getInventoryItem({
                endUserId,
                itemId,
              });

              const updateData = {
                revisionNumber: currentItem.revisionNumber,
                name: row.name,
                sku: row.sku,
                salesPrice: row.salesPrice,
                purchaseCost: row.purchaseCost,
                salesDescription: row.salesDescription,
                purchaseDescription: row.purchaseDescription,
                quantityOnHand: row.quantityOnHand,
                reorderPoint: row.reorderPoint,
                maximumQuantityOnHand: row.maximumQuantityOnHand,
                salesTaxCodeId: row.salesTaxCodeId,
                purchaseTaxCodeId: row.purchaseTaxCodeId,
                isActive: row.isActive,
                barcode: row.barcode ? { value: row.barcode } : undefined,
                preferredVendorId: row.preferredVendorId,
                classId: row.classId,
                parentId: row.parentId,
              };

              const validation = UpdateInventoryItemSchema.safeParse(updateData);

              if (!validation.success) {
                throw new Error(
                  `Validation failed: ${validation.error.errors.map((e) => e.message).join(', ')}`,
                );
              }

              await inventoryService.updateInventoryItem({
                endUserId,
                itemId,
                item: validation.data,
              });

              results.successful++;
              results.updated++;
              results.successfulItems.push({
                rowNumber: row.rowNumber,
                action: 'UPDATED',
                name: row.name || currentItem.name || itemId,
              });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              rowNumber: row.rowNumber,
              error:
                error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Generate summary message
        const reply = `Excel file processing completed!

📊 Summary:
- Total rows processed: ${results.total}
- Successful: ${results.successful}
- Failed: ${results.failed}
- Items created: ${results.created}
- Items updated: ${results.updated}

${results.successfulItems.length > 0 ? `✅ Successfully processed:\n${results.successfulItems.map((item) => `Row ${item.rowNumber}: ${item.action} - ${item.name}`).join('\n')}\n` : ''}
${results.errors.length > 0 ? `\n❌ Errors:\n${results.errors.map((e) => `Row ${e.rowNumber}: ${e.error}`).join('\n')}` : ''}`;

        return {
          success: results.failed === 0,
          data: results,
          reply,
        };
      }

      // Handle text message (existing logic)
      if (!message) {
        return {
          success: false,
          error: 'No message or file provided',
          reply: 'Please provide a message or upload an Excel file.',
        };
      }
      // Parse the message with OpenAI
      const openaiService = createOpenAIService();
      const operation = await openaiService.parseInventoryCommand(message);

      // Check if operation is unknown
      if (operation.operation === 'unknown') {
        return {
          success: false,
          error: 'Could not understand the request',
          reply: `I'm not sure what you want me to do. ${operation.intent || 'Could you please rephrase your request?'}

Examples:
- "Create a new item called Widget with price $50"
- "Update Widget price to $75"
- "Show me item with ID 12345"
- "List all active items"`,
          parsedOperation: operation,
        };
      }

      const inventoryService = createInventoryService();
      let result;

      // Execute the operation
      switch (operation.operation) {
        case 'list': {
          const items = await inventoryService.listInventoryItems({
            endUserId,
            filters: {
              limit: operation.filters?.limit ?? undefined,
              status: operation.filters?.status ?? undefined,
              nameContains: operation.filters?.nameContains ?? undefined,
              nameStartsWith: operation.filters?.nameStartsWith ?? undefined,
              nameEndsWith: operation.filters?.nameEndsWith ?? undefined,
            },
            fetchAll: !operation.filters?.limit,
          });

          result = items;
          break;
        }

        case 'read': {
          if (!operation.itemId) {
            // Try to search by name if itemId not provided
            if (operation.itemName) {
              const items = await inventoryService.listInventoryItems({
                endUserId,
                filters: {
                  nameContains: operation.itemName,
                  limit: 10,
                },
              });

              if (items.data.length === 0) {
                return {
                  success: false,
                  error: 'Item not found',
                  reply: `I couldn't find any items matching "${operation.itemName}". Please check the name and try again.`,
                  parsedOperation: operation,
                };
              }

              if (items.data.length > 1) {
                return {
                  success: true,
                  data: items,
                  reply: `I found ${items.data.length} items matching "${operation.itemName}". Here they are:

${items.data
  .map(
    (item: any, idx: number) =>
      `${idx + 1}. ${item.name || item.fullName} (ID: ${item.id})${item.salesPrice ? ` - $${item.salesPrice}` : ''}`,
  )
  .join('\n')}

Please specify the exact item ID to view details.`,
                  parsedOperation: operation,
                };
              }

              result = items.data[0];
            } else {
              return {
                success: false,
                error: 'Missing item identifier',
                reply:
                  'Please provide either an item ID or item name to retrieve.',
                parsedOperation: operation,
              };
            }
          } else {
            result = await inventoryService.getInventoryItem({
              endUserId,
              itemId: operation.itemId,
            });
          }
          break;
        }

        case 'create': {
          // Check if we have required account IDs
          if (operation.needsAccountIds && !operation.data?.incomeAccountId) {
            return {
              success: false,
              error: 'Missing required account IDs',
              reply: `To create an inventory item, I need the following account IDs from your QuickBooks Desktop:
- Income Account ID (for sales revenue tracking)
- COGS Account ID (for cost of goods sold)
- Asset Account ID (for inventory asset tracking)

Please provide these IDs or create the item directly in QuickBooks Desktop with the following information:
- Name: ${operation.data?.name || 'Not specified'}
${operation.data?.salesPrice ? `- Sales Price: $${operation.data.salesPrice}` : ''}
${operation.data?.purchaseCost ? `- Purchase Cost: $${operation.data.purchaseCost}` : ''}
${operation.data?.sku ? `- SKU: ${operation.data.sku}` : ''}`,
              parsedOperation: operation,
              needsAccountIds: true,
            };
          }

          // Validate required fields
          const validation = CreateInventoryItemSchema.safeParse(
            operation.data,
          );

          if (!validation.success) {
            return {
              success: false,
              error: 'Validation failed',
              reply: `Missing required fields: ${validation.error.errors.map((e) => e.path.join('.')).join(', ')}`,
              parsedOperation: operation,
            };
          }

          result = await inventoryService.createInventoryItem({
            endUserId,
            item: validation.data,
          });
          break;
        }

        case 'update': {
          // Need to get the item first to get revision number
          let itemId = operation.itemId;

          if (!itemId && operation.itemName) {
            const items = await inventoryService.listInventoryItems({
              endUserId,
              filters: {
                nameContains: operation.itemName,
                limit: 10,
              },
            });

            if (items.data.length === 0) {
              return {
                success: false,
                error: 'Item not found',
                reply: `I couldn't find any items matching "${operation.itemName}". Please check the name and try again.`,
                parsedOperation: operation,
              };
            }

            if (items.data.length > 1) {
              return {
                success: false,
                error: 'Multiple items found',
                reply: `I found ${items.data.length} items matching "${operation.itemName}". Please specify which one:

${items.data
  .map(
    (item: any, idx: number) =>
      `${idx + 1}. ${item.name || item.fullName} (ID: ${item.id})`,
  )
  .join('\n')}`,
                parsedOperation: operation,
                data: items,
              };
            }

            const firstItem = items.data[0];

            if (!firstItem) {
              return {
                success: false,
                error: 'Item not found',
                reply: `I couldn't find any items matching "${operation.itemName}".`,
                parsedOperation: operation,
              };
            }

            itemId = firstItem.id;
          }

          if (!itemId) {
            return {
              success: false,
              error: 'Missing item identifier',
              reply:
                'Please provide either an item ID or item name to update.',
              parsedOperation: operation,
            };
          }

          // Get current item to retrieve revision number
          const currentItem = await inventoryService.getInventoryItem({
            endUserId,
            itemId,
          });

          // Handle quantity on hand updates separately via inventory adjustment
          const quantityOnHand = operation.data?.quantityOnHand;
          let adjustmentResult = null;

          if (quantityOnHand !== null && quantityOnHand !== undefined) {
            const adjustmentAccountId = process.env.QUICKBOOKS_INVENTORY_ADJUSTMENT_ACCOUNT_ID;

            if (!adjustmentAccountId) {
              return {
                success: false,
                error: 'Missing adjustment account ID',
                reply: `To adjust quantity on hand, you need to configure QUICKBOOKS_INVENTORY_ADJUSTMENT_ACCOUNT_ID in your environment variables.

In QuickBooks Desktop, find your inventory adjustment account ID from the Chart of Accounts and add it to your .env file:
QUICKBOOKS_INVENTORY_ADJUSTMENT_ACCOUNT_ID=your_account_id_here`,
                parsedOperation: operation,
              };
            }

            const adjustmentData = {
              accountId: adjustmentAccountId,
              transactionDate: new Date().toISOString().split('T')[0],
              memo: `Quantity adjustment via chat interface for ${currentItem.name || itemId}`,
              lines: [
                {
                  itemId,
                  adjustQuantity: {
                    newQuantity: quantityOnHand,
                  },
                },
              ],
            };

            const adjustmentValidation = CreateInventoryAdjustmentSchema.safeParse(adjustmentData);

            if (!adjustmentValidation.success) {
              return {
                success: false,
                error: 'Invalid adjustment data',
                reply: `Failed to create inventory adjustment: ${adjustmentValidation.error.errors.map((e) => e.message).join(', ')}`,
                parsedOperation: operation,
              };
            }

            adjustmentResult = await inventoryService.createInventoryAdjustment({
              endUserId,
              adjustment: adjustmentValidation.data,
            });
          }

          // Remove quantityOnHand from operation data as it's not supported in item updates
          const { quantityOnHand: _removed, ...otherData } = operation.data || {};

          // Only perform item update if there are other fields to update
          if (Object.keys(otherData).length > 0) {
            const updateData = {
              revisionNumber: currentItem.revisionNumber,
              ...otherData,
            };

            const validation = UpdateInventoryItemSchema.safeParse(updateData);

            if (!validation.success) {
              return {
                success: false,
                error: 'Validation failed',
                reply: `Invalid update data: ${validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
                parsedOperation: operation,
              };
            }

            result = await inventoryService.updateInventoryItem({
              endUserId,
              itemId,
              item: validation.data,
            });
          } else {
            // If only quantity was being updated, use the adjustment result
            result = adjustmentResult || currentItem;
          }
          break;
        }

        default:
          return {
            success: false,
            error: 'Unknown operation',
            reply: 'I could not determine what operation to perform.',
            parsedOperation: operation,
          };
      }

      // Generate a friendly response
      let reply: string;

      // For list operations, format the response ourselves to show all items
      if (operation.operation === 'list' && result?.data) {
        const items = result.data;
        const itemCount = items.length;

        if (itemCount === 0) {
          reply = 'No inventory items found matching your criteria.';
        } else {
          const itemList = items
            .map((item: any, idx: number) => {
              const parts = [
                `${idx + 1}. ${item.name || item.fullName}`,
                item.sku ? `SKU: ${item.sku}` : null,
                item.salesPrice ? `Price: $${item.salesPrice}` : null,
                item.quantityOnHand !== undefined ? `Qty: ${item.quantityOnHand}` : null,
                `ID: ${item.id}`,
              ].filter(Boolean);

              return parts.join(' | ');
            })
            .join('\n');

          reply = `Found ${itemCount} inventory item${itemCount > 1 ? 's' : ''}:\n\n${itemList}`;
        }
      } else {
        // For other operations, use OpenAI to generate a friendly response
        reply = await openaiService.generateResponse({
          operation: operation.operation,
          success: true,
          data: result,
        });
      }

      return {
        success: true,
        data: result,
        reply,
        parsedOperation: operation,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      const openaiService = createOpenAIService();
      const reply = await openaiService.generateResponse({
        operation: 'unknown',
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        reply,
      };
    }
  },
  {
    schema: ChatMessageSchema,
  },
);

/**
 * List available accounts for inventory setup
 * This is a helper action to get account IDs needed for creating inventory items and adjustments
 */
export const listAccounts = enhanceAction(
  async () => {
    const endUserId = process.env.CONDUCTOR_END_USER_ID;

    if (!endUserId) {
      throw new Error('CONDUCTOR_END_USER_ID not configured');
    }

    const inventoryService = createInventoryService();

    try {
      const accounts = await inventoryService.listAccounts({
        endUserId,
        limit: 150,
      });

      // Filter to show the most relevant account types for inventory
      const relevantAccounts = accounts.data?.filter((account: any) =>
        ['Income', 'Cost of Goods Sold', 'Other Current Asset', 'Other Expense'].includes(account.type)
      );

      return {
        success: true,
        data: relevantAccounts || accounts.data,
        message: `Found ${relevantAccounts?.length || accounts.data?.length} accounts. Look for:\n- Income accounts for sales revenue\n- COGS accounts for cost of goods sold\n- Asset accounts for inventory tracking\n- Expense accounts for inventory adjustments`,
      };
    } catch (error) {
      throw error;
    }
  },
  {
    schema: z.object({}),
  },
);
