# Inventory Excel/CSV Upload Format

This document describes the Excel/CSV format for bulk creating/updating QuickBooks Desktop inventory items.

## Excel Column Structure

### Required Columns

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Action` | Text | Must be "CREATE" or "UPDATE" | CREATE |
| `Name` | Text | Item name (required for CREATE) | Widget Pro 2000 |

### Optional Columns for Identification

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `ItemId` | Text | QuickBooks item ID (required for UPDATE) | 80000001-1234567890 |
| `SKU` | Text | Stock Keeping Unit | WID-2000 |

### Product Information

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `SalesPrice` | Number | Selling price | 99.99 |
| `PurchaseCost` | Number | Cost to purchase | 50.00 |
| `SalesDescription` | Text | Description shown on sales forms | High-quality widget for industrial use |
| `PurchaseDescription` | Text | Description shown on purchase orders | Industrial grade widget |

### Inventory Tracking

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `QuantityOnHand` | Number | Current inventory quantity | 100 |
| `ReorderPoint` | Number | Minimum quantity before reordering | 20 |
| `MaximumQuantityOnHand` | Number | Maximum inventory quantity | 500 |

### Account Information (Required for CREATE)

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `IncomeAccountId` | Text | Income account ID for sales revenue | 80000010-1234567890 |
| `CogsAccountId` | Text | Cost of Goods Sold account ID | 80000011-1234567890 |
| `AssetAccountId` | Text | Inventory asset account ID | 80000012-1234567890 |

### Tax Information

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `SalesTaxCodeId` | Text | Sales tax code ID | 80000020-1234567890 |
| `PurchaseTaxCodeId` | Text | Purchase tax code ID | 80000021-1234567890 |

### Additional Information

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `IsActive` | Boolean | Whether item is active (TRUE/FALSE) | TRUE |
| `Barcode` | Text | Item barcode | 1234567890123 |
| `PreferredVendorId` | Text | Default vendor ID | 80000030-1234567890 |
| `ClassId` | Text | QuickBooks class ID | 80000040-1234567890 |
| `ParentId` | Text | Parent item ID for sub-items | 80000050-1234567890 |

## Excel Template Example

### For CREATE operations:

| Action | Name | SKU | SalesPrice | PurchaseCost | QuantityOnHand | IncomeAccountId | CogsAccountId | AssetAccountId | IsActive |
|--------|------|-----|------------|--------------|----------------|-----------------|---------------|----------------|----------|
| CREATE | Widget A | WID-001 | 50.00 | 25.00 | 100 | 80000010-1234567890 | 80000011-1234567890 | 80000012-1234567890 | TRUE |
| CREATE | Gadget B | GAD-001 | 75.00 | 35.00 | 50 | 80000010-1234567890 | 80000011-1234567890 | 80000012-1234567890 | TRUE |

### For UPDATE operations:

| Action | ItemId | Name | SalesPrice | QuantityOnHand | IsActive |
|--------|--------|------|------------|----------------|----------|
| UPDATE | 80000001-1234567890 | Widget A Pro | 55.00 | 150 | TRUE |
| UPDATE | 80000002-1234567890 | Gadget B Plus | 80.00 | 75 | TRUE |

### For MIXED operations:

| Action | ItemId | Name | SKU | SalesPrice | PurchaseCost | QuantityOnHand | IncomeAccountId | CogsAccountId | AssetAccountId |
|--------|--------|------|-----|------------|--------------|----------------|-----------------|---------------|----------------|
| CREATE | | New Product | NEW-001 | 100.00 | 50.00 | 200 | 80000010-1234567890 | 80000011-1234567890 | 80000012-1234567890 |
| UPDATE | 80000001-1234567890 | Updated Name | | 110.00 | | 250 | | | |

## Rules

1. **Action Column**: Must contain either "CREATE" or "UPDATE" (case-insensitive)
2. **CREATE Requirements**:
   - `Name` is required
   - `IncomeAccountId`, `CogsAccountId`, and `AssetAccountId` are required
3. **UPDATE Requirements**:
   - Either `ItemId` or `Name` is required to identify the item
   - If using `Name`, the system will search for the item by name
4. **Empty Cells**: Empty cells are ignored (won't update those fields)
5. **Boolean Values**: Use TRUE/FALSE, true/false, 1/0, or YES/NO
6. **Numbers**: Can include decimals (use . as decimal separator)
7. **File Format**: .xlsx, .xls, or .csv format

## CSV File Format

For CSV files:
- First row must be the header row with column names
- Use commas (`,`) as the delimiter
- Enclose text values with quotes if they contain commas or special characters
- Example:
  ```csv
  Action,Name,SKU,SalesPrice,PurchaseCost,QuantityOnHand,IncomeAccountId,CogsAccountId,AssetAccountId,IsActive
  CREATE,Widget A,WID-001,50.00,25.00,100,80000010-1234567890,80000011-1234567890,80000012-1234567890,TRUE
  CREATE,"Gadget B",GAD-001,75.00,35.00,50,80000010-1234567890,80000011-1234567890,80000012-1234567890,TRUE
  ```

## Error Handling

- Invalid rows will be skipped with an error message
- Partial success is supported (some items may succeed while others fail)
- A detailed report will be provided showing:
  - Number of items processed
  - Number of successful creates/updates
  - Number of failures with reasons
  - List of successfully processed items
  - List of failed items with error messages
