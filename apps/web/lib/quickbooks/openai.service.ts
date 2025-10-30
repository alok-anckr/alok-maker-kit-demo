import 'server-only';

import OpenAI from 'openai';
import { z } from 'zod';

import { getLogger } from '@kit/shared/logger';

/**
 * Operation types for inventory management
 */
const OperationType = z.enum(['create', 'read', 'update', 'list', 'unknown']);

/**
 * Schema for the parsed inventory operation
 */
const InventoryOperationSchema = z.object({
  operation: OperationType,
  intent: z.string().nullish().describe('A clear description of what the user wants to do'),
  itemId: z.string().nullish().describe('Item ID for read/update operations'),
  itemName: z.string().nullish().describe('Item name for search or identification'),
  data: z
    .object({
      name: z.string().nullish(),
      sku: z.string().nullish(),
      salesPrice: z.string().nullish(),
      purchaseCost: z.string().nullish(),
      salesDescription: z.string().nullish(),
      purchaseDescription: z.string().nullish(),
      quantityOnHand: z.number().nullish(),
      reorderPoint: z.number().nullish(),
      maximumQuantityOnHand: z.number().nullish(),
      isActive: z.boolean().nullish(),
      barcode: z.string().nullish(),
      incomeAccountId: z.string().nullish(),
      cogsAccountId: z.string().nullish(),
      assetAccountId: z.string().nullish(),
      salesTaxCodeId: z.string().nullish(),
      purchaseTaxCodeId: z.string().nullish(),
      preferredVendorId: z.string().nullish(),
      classId: z.string().nullish(),
      parentId: z.string().nullish(),
      unitOfMeasureSetId: z.string().nullish(),
    })
    .nullish()
    .describe('Extracted data for the operation'),
  filters: z
    .object({
      nameContains: z.string().nullish(),
      nameStartsWith: z.string().nullish(),
      nameEndsWith: z.string().nullish(),
      status: z.enum(['active', 'inactive', 'all']).nullish(),
      limit: z.number().nullish(),
    })
    .nullish()
    .describe('Filters for list operations'),
  needsAccountIds: z
    .boolean()
    .nullish()
    .describe(
      'Whether the operation needs account IDs (income, COGS, asset) to proceed',
    ),
  missingFields: z
    .array(z.string())
    .nullish()
    .describe('List of required fields that are missing'),
});

export type InventoryOperation = z.infer<typeof InventoryOperationSchema>;

/**
 * OpenAI Service for natural language processing
 * @description Parses natural language input and converts it to structured inventory operations
 */
class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. Please add it to your .env file.',
      );
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Parse natural language message and extract inventory operation
   */
  async parseInventoryCommand(message: string): Promise<InventoryOperation> {
    const logger = await getLogger();

    const ctx = {
      name: 'openai.parseInventoryCommand',
      messageLength: message.length,
    };

    logger.info(ctx, 'Parsing inventory command with OpenAI...');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps users manage QuickBooks Desktop inventory items through natural language.

Your job is to parse user messages and determine:
1. What operation they want to perform (create, read, update, list)
2. Extract relevant data from their message
3. Identify if any required fields are missing

You must respond with valid JSON that matches this structure:
{
  "operation": "create" | "read" | "update" | "list" | "unknown",
  "intent": "description of what the user wants to do",
  "itemId": "optional item ID",
  "itemName": "optional item name",
  "data": { /* extracted data fields */ },
  "filters": { /* optional filter criteria */ },
  "needsAccountIds": true | false,
  "missingFields": ["list", "of", "missing", "fields"]
}

IMPORTANT RULES:
- For CREATE operations, these fields are REQUIRED: name, incomeAccountId, cogsAccountId, assetAccountId
- If the user doesn't provide account IDs for CREATE, set needsAccountIds to true
- For UPDATE operations, you need either itemId or itemName to identify the item
- For READ operations, you need either itemId or itemName
- For LIST operations, extract any filter criteria mentioned
- Parse prices as strings in decimal format (e.g., "50.00", "19.99")
- Parse quantities as numbers
- Be flexible with synonyms (e.g., "price" → salesPrice, "cost" → purchaseCost)
- If the intent is unclear or you need more info, set operation to "unknown"

EXAMPLES:

"Create a new product called Widget with price $50"
→ operation: create, data: { name: "Widget", salesPrice: "50.00" }, needsAccountIds: true

"Add inventory item Gadget, SKU: GAD-001, cost $30, sell for $60"
→ operation: create, data: { name: "Gadget", sku: "GAD-001", purchaseCost: "30.00", salesPrice: "60.00" }, needsAccountIds: true

"Update Widget price to $55"
→ operation: update, itemName: "Widget", data: { salesPrice: "55.00" }

"Show me item with ID 80000001-1234567890"
→ operation: read, itemId: "80000001-1234567890"

"List all items containing 'Widget'"
→ operation: list, filters: { nameContains: "Widget" }

"Show active items"
→ operation: list, filters: { status: "active" }

"Deactivate the Gadget item"
→ operation: update, itemName: "Gadget", data: { isActive: false }`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const messageContent = completion.choices[0]?.message.content;

      if (!messageContent) {
        throw new Error('No response from OpenAI');
      }

      const jsonResponse = JSON.parse(messageContent);
      const parsed = InventoryOperationSchema.parse(jsonResponse);

      if (!parsed) {
        throw new Error('Failed to parse message with OpenAI');
      }

      logger.info(
        { ...ctx, operation: parsed.operation },
        'Successfully parsed inventory command',
      );

      return parsed;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to parse inventory command');
      throw error;
    }
  }

  /**
   * Generate a user-friendly response message
   */
  async generateResponse(params: {
    operation: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }): Promise<string> {
    const logger = await getLogger();

    const ctx = {
      name: 'openai.generateResponse',
      operation: params.operation,
      success: params.success,
    };

    logger.info(ctx, 'Generating response message...');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for QuickBooks Desktop inventory management.

Generate a concise, friendly response to the user based on the operation result.

- If successful, confirm what was done and show key details
- If failed, explain the error in simple terms and suggest what to do
- Keep responses brief (2-3 sentences max)
- Use a professional but friendly tone
- Format data in a readable way`,
          },
          {
            role: 'user',
            content: `Operation: ${params.operation}
Success: ${params.success}
${params.data ? `Data: ${JSON.stringify(params.data, null, 2)}` : ''}
${params.error ? `Error: ${params.error}` : ''}

Generate a response message for the user.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message.content || 'Operation completed.';

      logger.info(ctx, 'Successfully generated response');

      return response;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to generate response');

      // Fallback response if OpenAI fails
      if (params.success) {
        return `Successfully performed ${params.operation} operation.`;
      } else {
        return `Failed to perform ${params.operation} operation: ${params.error}`;
      }
    }
  }
}

/**
 * Factory function to create a new OpenAI service instance
 */
export function createOpenAIService() {
  return new OpenAIService();
}
