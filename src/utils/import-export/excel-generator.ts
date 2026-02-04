/**
 * Excel Generator Utility
 * 
 * Generates Excel (XLSX) files from JSON data using ExcelJS.
 * Handles formatting, column widths, headers, and styling.
 */

import ExcelJS from 'exceljs';
import { ExcelGeneratorOptions } from './types';

/**
 * Generate Excel workbook from data array
 * 
 * @param data - Array of objects to convert to Excel
 * @param columns - Column names to include (uses object keys if not provided)
 * @param options - Excel generation options
 * @returns ExcelJS Workbook instance
 * 
 * @example
 * const data = [
 *   { id: '1', name: 'Product A', price: 100 },
 *   { id: '2', name: 'Product B', price: 200 }
 * ];
 * const workbook = await generateExcel(data, ['id', 'name', 'price']);
 * const buffer = await workbook.xlsx.writeBuffer();
 */
export async function generateExcel(
  data: Record<string, any>[],
  columns: string[],
  options: ExcelGeneratorOptions = {}
): Promise<ExcelJS.Workbook> {
  const {
    sheetName = 'Sheet1',
    columnWidth = 15,
    includeHeaders = true,
    freezeHeader = true,
    autoFilter = true,
  } = options;

  // Validate inputs
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Columns must be a non-empty array');
  }

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Configure columns
  worksheet.columns = columns.map(column => {
    const width = typeof columnWidth === 'number' 
      ? columnWidth 
      : columnWidth[column] || 15;

    return {
      header: includeHeaders ? formatColumnHeader(column) : '',
      key: column,
      width,
    };
  });

  // Style header row
  if (includeHeaders) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  // Add data rows
  if (data.length > 0) {
    data.forEach(row => {
      const formattedRow: Record<string, any> = {};
      columns.forEach(column => {
        formattedRow[column] = formatExcelValue(row[column]);
      });
      worksheet.addRow(formattedRow);
    });
  }

  // Freeze header row
  if (freezeHeader && includeHeaders) {
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  // Apply auto-filter
  if (autoFilter && includeHeaders && data.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  return workbook;
}

/**
 * Generate Excel buffer from data
 * 
 * @param data - Array of objects
 * @param columns - Column names
 * @param options - Excel options
 * @returns Buffer containing Excel file
 */
export async function generateExcelBuffer(
  data: Record<string, any>[],
  columns: string[],
  options?: ExcelGeneratorOptions
): Promise<Buffer> {
  const workbook = await generateExcel(data, columns, options);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Format column header (convert snake_case to Title Case)
 */
function formatColumnHeader(column: string): string {
  return column
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format a value for Excel cell
 */
function formatExcelValue(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.join(', ');
  }

  // Handle objects (stringify)
  if (typeof value === 'object') {
    // Handle Date objects specially
    if (value instanceof Date) {
      return value;
    }
    return JSON.stringify(value);
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Return as-is for primitives
  return value;
}

/**
 * Add multiple worksheets to a workbook
 * 
 * @param datasets - Object with sheet names as keys and data arrays as values
 * @param options - Excel options (applied to all sheets)
 * @returns ExcelJS Workbook with multiple sheets
 * 
 * @example
 * const datasets = {
 *   Products: productsData,
 *   Categories: categoriesData
 * };
 * const workbook = await generateMultiSheetExcel(datasets);
 */
export async function generateMultiSheetExcel(
  datasets: Record<string, { data: Record<string, any>[]; columns: string[] }>,
  options: ExcelGeneratorOptions = {}
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  for (const [sheetName, { data, columns }] of Object.entries(datasets)) {
    const sheetOptions = { ...options, sheetName };
    const sheetWorkbook = await generateExcel(data, columns, sheetOptions);
    
    // Copy worksheet to main workbook
    const worksheet = sheetWorkbook.getWorksheet(sheetName);
    if (worksheet) {
      const newWorksheet = workbook.addWorksheet(sheetName);
      
      // Copy columns
      newWorksheet.columns = worksheet.columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width,
      }));

      // Copy rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Header row
          const headerRow = newWorksheet.getRow(1);
          headerRow.values = row.values;
          headerRow.font = row.font;
          headerRow.fill = row.fill;
          headerRow.alignment = row.alignment;
        } else {
          newWorksheet.addRow(row.values);
        }
      });

      // Copy views (frozen panes)
      if (worksheet.views) {
        newWorksheet.views = worksheet.views;
      }

      // Copy auto-filter
      if (worksheet.autoFilter) {
        newWorksheet.autoFilter = worksheet.autoFilter;
      }
    }
  }

  return workbook;
}
