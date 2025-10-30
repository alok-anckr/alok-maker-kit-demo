import 'server-only';

import * as XLSX from 'xlsx';

import { getLogger } from '@kit/shared/logger';

/**
 * Represents a parsed row from the Excel file
 */
export interface ExcelInventoryRow {
  rowNumber: number;
  action: 'create' | 'update';
  itemId?: string;
  name?: string;
  sku?: string;
  salesPrice?: string;
  purchaseCost?: string;
  salesDescription?: string;
  purchaseDescription?: string;
  quantityOnHand?: number;
  reorderPoint?: number;
  maximumQuantityOnHand?: number;
  incomeAccountId?: string;
  cogsAccountId?: string;
  assetAccountId?: string;
  salesTaxCodeId?: string;
  purchaseTaxCodeId?: string;
  isActive?: boolean;
  barcode?: string;
  preferredVendorId?: string;
  classId?: string;
  parentId?: string;
}

/**
 * Result of parsing an Excel file
 */
export interface ExcelParseResult {
  success: boolean;
  rows: ExcelInventoryRow[];
  errors: Array<{ rowNumber: number; error: string }>;
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

/**
 * Excel Service for parsing inventory upload files
 */
class ExcelService {
  /**
   * Parse Excel file buffer and extract inventory items
   */
  async parseInventoryExcel(
    buffer: Buffer,
    filename: string,
  ): Promise<ExcelParseResult> {
    const logger = await getLogger();

    const ctx = {
      name: 'excel.parseInventoryExcel',
      filename,
    };

    logger.info(ctx, 'Parsing Excel file...');

    try {
      // Read the Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error('Excel file is empty or has no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error('Could not read worksheet');
      }

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: undefined,
      }) as Record<string, unknown>[];

      logger.info({ ...ctx, rowCount: jsonData.length }, 'Extracted rows from Excel');

      // Parse each row
      const rows: ExcelInventoryRow[] = [];
      const errors: Array<{ rowNumber: number; error: string }> = [];

      for (let i = 0; i < jsonData.length; i++) {
        const rowNumber = i + 2; // Excel rows start at 1, header is row 1
        const row = jsonData[i];

        if (!row) {
          continue;
        }

        try {
          const parsed = this.parseRow(row, rowNumber);

          if (!parsed) {
            continue;
          }

          rows.push(parsed);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown parsing error';
          errors.push({ rowNumber, error: errorMessage });
          logger.warn(
            { ...ctx, rowNumber, error: errorMessage },
            'Failed to parse row',
          );
        }
      }

      const result: ExcelParseResult = {
        success: errors.length === 0,
        rows,
        errors,
        totalRows: jsonData.length,
        validRows: rows.length,
        invalidRows: errors.length,
      };

      logger.info(
        {
          ...ctx,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
        },
        'Excel parsing completed',
      );

      return result;
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to parse Excel file');
      throw error;
    }
  }

  /**
   * Parse a single row from the Excel data
   */
  private parseRow(
    row: Record<string, unknown>,
    rowNumber: number,
  ): ExcelInventoryRow | null {
    // Get action (case insensitive)
    const actionRaw = this.getColumnValue(row, [
      'Action',
      'action',
      'ACTION',
    ]);

    if (!actionRaw) {
      throw new Error('Missing required column: Action');
    }

    const action = actionRaw.toLowerCase().trim();

    if (action !== 'create' && action !== 'update') {
      throw new Error(
        `Invalid action "${actionRaw}". Must be "CREATE" or "UPDATE"`,
      );
    }

    // Parse the row based on action
    const parsed: ExcelInventoryRow = {
      rowNumber,
      action: action as 'create' | 'update',
      itemId: this.getColumnValue(row, ['ItemId', 'itemid', 'ITEMID', 'Item ID']),
      name: this.getColumnValue(row, ['Name', 'name', 'NAME']),
      sku: this.getColumnValue(row, ['SKU', 'sku', 'Sku']),
      salesPrice: this.getColumnValue(row, [
        'SalesPrice',
        'salesprice',
        'SALESPRICE',
        'Sales Price',
      ]),
      purchaseCost: this.getColumnValue(row, [
        'PurchaseCost',
        'purchasecost',
        'PURCHASECOST',
        'Purchase Cost',
      ]),
      salesDescription: this.getColumnValue(row, [
        'SalesDescription',
        'salesdescription',
        'SALESDESCRIPTION',
        'Sales Description',
      ]),
      purchaseDescription: this.getColumnValue(row, [
        'PurchaseDescription',
        'purchasedescription',
        'PURCHASEDESCRIPTION',
        'Purchase Description',
      ]),
      quantityOnHand: this.getNumberValue(row, [
        'QuantityOnHand',
        'quantityonhand',
        'QUANTITYONHAND',
        'Quantity On Hand',
        'Quantity',
      ]),
      reorderPoint: this.getNumberValue(row, [
        'ReorderPoint',
        'reorderpoint',
        'REORDERPOINT',
        'Reorder Point',
      ]),
      maximumQuantityOnHand: this.getNumberValue(row, [
        'MaximumQuantityOnHand',
        'maximumquantityonhand',
        'MAXIMUMQUANTITYONHAND',
        'Maximum Quantity On Hand',
      ]),
      incomeAccountId: this.getColumnValue(row, [
        'IncomeAccountId',
        'incomeaccountid',
        'INCOMEACCOUNTID',
        'Income Account ID',
      ]),
      cogsAccountId: this.getColumnValue(row, [
        'CogsAccountId',
        'cogsaccountid',
        'COGSACCOUNTID',
        'COGS Account ID',
      ]),
      assetAccountId: this.getColumnValue(row, [
        'AssetAccountId',
        'assetaccountid',
        'ASSETACCOUNTID',
        'Asset Account ID',
      ]),
      salesTaxCodeId: this.getColumnValue(row, [
        'SalesTaxCodeId',
        'salestaxcodeid',
        'SALESTAXCODEID',
        'Sales Tax Code ID',
      ]),
      purchaseTaxCodeId: this.getColumnValue(row, [
        'PurchaseTaxCodeId',
        'purchasetaxcodeid',
        'PURCHASETAXCODEID',
        'Purchase Tax Code ID',
      ]),
      isActive: this.getBooleanValue(row, [
        'IsActive',
        'isactive',
        'ISACTIVE',
        'Is Active',
        'Active',
      ]),
      barcode: this.getColumnValue(row, ['Barcode', 'barcode', 'BARCODE']),
      preferredVendorId: this.getColumnValue(row, [
        'PreferredVendorId',
        'preferredvendorid',
        'PREFERREDVENDORID',
        'Preferred Vendor ID',
      ]),
      classId: this.getColumnValue(row, [
        'ClassId',
        'classid',
        'CLASSID',
        'Class ID',
      ]),
      parentId: this.getColumnValue(row, [
        'ParentId',
        'parentid',
        'PARENTID',
        'Parent ID',
      ]),
    };

    // Validation for CREATE operations
    if (parsed.action === 'create') {
      if (!parsed.name) {
        throw new Error('CREATE operation requires Name');
      }

      if (!parsed.incomeAccountId || !parsed.cogsAccountId || !parsed.assetAccountId) {
        throw new Error(
          'CREATE operation requires IncomeAccountId, CogsAccountId, and AssetAccountId',
        );
      }
    }

    // Validation for UPDATE operations
    if (parsed.action === 'update') {
      if (!parsed.itemId && !parsed.name) {
        throw new Error('UPDATE operation requires either ItemId or Name');
      }
    }

    return parsed;
  }

  /**
   * Get column value with multiple possible names (case insensitive)
   */
  private getColumnValue(
    row: Record<string, unknown>,
    possibleNames: string[],
  ): string | undefined {
    // First try exact match
    for (const name of possibleNames) {
      const value = row[name];

      if (value !== undefined && value !== null && value !== '') {
        return String(value).trim();
      }
    }

    // If no exact match, try normalized comparison (trim and lowercase)
    const normalizedPossibleNames = possibleNames.map((n) =>
      n.toLowerCase().trim(),
    );

    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase().trim();

      if (normalizedPossibleNames.includes(normalizedKey)) {
        const value = row[key];

        if (value !== undefined && value !== null && value !== '') {
          return String(value).trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Get numeric column value
   */
  private getNumberValue(
    row: Record<string, unknown>,
    possibleNames: string[],
  ): number | undefined {
    const value = this.getColumnValue(row, possibleNames);

    if (value === undefined) {
      return undefined;
    }

    const num = parseFloat(value);

    if (isNaN(num)) {
      return undefined;
    }

    return num;
  }

  /**
   * Get boolean column value
   */
  private getBooleanValue(
    row: Record<string, unknown>,
    possibleNames: string[],
  ): boolean | undefined {
    const value = this.getColumnValue(row, possibleNames);

    if (value === undefined) {
      return undefined;
    }

    const lowerValue = value.toLowerCase();

    if (
      lowerValue === 'true' ||
      lowerValue === '1' ||
      lowerValue === 'yes' ||
      lowerValue === 'y'
    ) {
      return true;
    }

    if (
      lowerValue === 'false' ||
      lowerValue === '0' ||
      lowerValue === 'no' ||
      lowerValue === 'n'
    ) {
      return false;
    }

    return undefined;
  }
}

/**
 * Factory function to create a new Excel service instance
 */
export function createExcelService() {
  return new ExcelService();
}
