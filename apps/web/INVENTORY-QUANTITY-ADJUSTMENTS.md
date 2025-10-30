# Inventory Quantity Adjustments Guide

## Overview

In QuickBooks Desktop, **quantity on hand cannot be updated directly** on inventory items. Instead, you must create an **inventory adjustment transaction** to modify quantities.

## Why This Matters

When you try to update an inventory item's quantity through the chat interface (e.g., "Update Widget quantity to 50"), the system now:

1. Creates an **inventory adjustment transaction** (not an item update)
2. Posts the adjustment to a designated QuickBooks account
3. Updates the quantity on hand through the proper QuickBooks workflow

## Setup Required

### Step 1: Find Your Inventory Adjustment Account

In QuickBooks Desktop:
1. Go to **Lists** → **Chart of Accounts**
2. Look for an account used for inventory adjustments (typically an "Other Expense" account)
3. Double-click the account and note the **Account ID** from the URL or account details
   - Example ID format: `80000001-1234567890`

### Step 2: Configure the Account ID

Add this to your `.env` file:

```env
QUICKBOOKS_INVENTORY_ADJUSTMENT_ACCOUNT_ID=80000001-1234567890
```

Replace `80000001-1234567890` with your actual account ID.

## How It Works

### Chat Interface Commands

You can now use natural language to adjust quantities:

```
"Update Widget quantity to 50"
"Set quantity on hand for Product ABC to 100"
"Adjust inventory for SKU-123 to 25"
```

### What Happens Behind the Scenes

1. **OpenAI parses** your message and extracts:
   - Item name/ID: "Widget"
   - New quantity: 50

2. **System finds the item** in QuickBooks

3. **Creates an inventory adjustment** with:
   - Account: Your configured adjustment account
   - Date: Today's date
   - Memo: "Quantity adjustment via chat interface for Widget"
   - Line item: Item ID + new quantity

4. **QuickBooks processes** the adjustment and updates quantity on hand

### API Details

The system uses the Conductor API endpoint:
```
POST /v1/quickbooks-desktop/inventory-adjustments
```

Request structure:
```json
{
  "accountId": "80000001-1234567890",
  "transactionDate": "2025-10-30",
  "memo": "Quantity adjustment via chat interface",
  "lines": [
    {
      "itemId": "80000002-9876543210",
      "adjustQuantity": {
        "newQuantity": 50
      }
    }
  ]
}
```

## Troubleshooting

### Error: "Missing adjustment account ID"

**Solution**: Add `QUICKBOOKS_INVENTORY_ADJUSTMENT_ACCOUNT_ID` to your `.env` file (see Step 2 above)

### Error: "Unrecognized parameter: quantityOnHand"

This error occurred in the old version where we tried to update quantity directly on the item. The new implementation fixes this by using inventory adjustments instead.

### How to Find Available Accounts

Use the `listAccounts` server action to see all available accounts:

```typescript
import { listAccounts } from '@/app/home/[account]/inventory-chat/_lib/server/server-actions';

const result = await listAccounts();
console.log(result.data); // Shows all relevant accounts
```

Look for accounts with type:
- "Other Expense" (common for adjustments)
- "Cost of Goods Sold"
- "Other Current Asset"

## Excel Upload Support

The same logic applies when uploading Excel files with quantity adjustments. Your Excel file should include:

```
| Action | ItemId | Name   | QuantityOnHand |
|--------|--------|--------|----------------|
| UPDATE | 80...  | Widget | 50             |
```

The system will automatically create inventory adjustments for any quantity changes.

## Technical Implementation

### Key Files Modified

1. **`lib/quickbooks/inventory-schemas.ts`**
   - Added `CreateInventoryAdjustmentSchema`
   - Removed `quantityOnHand` from `UpdateInventoryItemSchema`

2. **`lib/quickbooks/inventory.service.ts`**
   - Added `createInventoryAdjustment()` method
   - Added `listAccounts()` method

3. **`app/home/[account]/inventory-chat/_lib/server/server-actions.ts`**
   - Updated `update` case to handle quantity adjustments
   - Enhanced `listAccounts` action

### Schema Structure

```typescript
export const CreateInventoryAdjustmentSchema = z.object({
  accountId: z.string().min(1),
  transactionDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
  lines: z.array(
    z.object({
      itemId: z.string().min(1),
      adjustQuantity: z.object({
        newQuantity: z.number().optional(),
        quantityDifference: z.number().optional(),
        // ... additional fields for serial/lot tracking
      }),
    }),
  ).min(1),
});
```

## Best Practices

1. **Always verify** the adjustment account is correct before processing large batches
2. **Include descriptive memos** so adjustments are traceable in QuickBooks
3. **Review adjustment reports** in QuickBooks Desktop regularly
4. **Use absolute quantities** (`newQuantity`) rather than differences when possible for clarity

## References

- [Conductor Inventory Adjustments API](https://docs.conductor.is/api-ref/qbd/inventory-adjustments/create)
- [QuickBooks Desktop Inventory Management](https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-adjustment/adjust-inventory-quantity-value-quickbooks-desktop/)
