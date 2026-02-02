/**
 * CSV Generator Utility
 * 
 * Generates CSV files from JSON data with proper escaping and formatting.
 * Handles special characters, arrays, nulls, and edge cases.
 */

import { CSVGeneratorOptions } from './types';

/**
 * Generate CSV string from data array
 * 
 * @param data - Array of objects to convert to CSV
 * @param columns - Column names to include (uses object keys if not provided)
 * @param options - CSV generation options
 * @returns CSV string with proper escaping
 * 
 * @example
 * const data = [
 *   { id: '1', name: 'Product A', tags: ['tag1', 'tag2'], price: 100 },
 *   { id: '2', name: 'Product "B"', tags: [], price: 200 }
 * ];
 * const csv = generateCSV(data, ['id', 'name', 'tags', 'price']);
 * // Result:
 * // id,name,tags,price
 * // 1,Product A,"tag1; tag2",100
 * // 2,"Product ""B""",,200
 */
export function generateCSV(
  data: Record<string, any>[],
  columns: string[],
  options: CSVGeneratorOptions = {}
): string {
  const {
    headers = columns,
    delimiter = ',',
    arraySeparator = '; ',
    includeHeaders = true,
  } = options;

  // Validate inputs
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Columns must be a non-empty array');
  }

  const rows: string[] = [];

  // Add header row
  if (includeHeaders) {
    rows.push(headers.map(header => escapeCsvValue(header, delimiter)).join(delimiter));
  }

  // Add data rows
  for (const row of data) {
    const values = columns.map(column => {
      const value = row[column];
      return formatCsvValue(value, { delimiter, arraySeparator });
    });
    rows.push(values.join(delimiter));
  }

  return rows.join('\n');
}

/**
 * Format a value for CSV output
 */
function formatCsvValue(
  value: any,
  options: { delimiter: string; arraySeparator: string }
): string {
  const { delimiter, arraySeparator } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    // Empty array
    if (value.length === 0) {
      return '';
    }
    // Join array elements
    const joined = value.map(v => String(v ?? '')).join(arraySeparator);
    return escapeCsvValue(joined, delimiter);
  }

  // Handle objects (stringify them)
  if (typeof value === 'object') {
    return escapeCsvValue(JSON.stringify(value), delimiter);
  }

  // Handle primitives
  const stringValue = String(value);
  return escapeCsvValue(stringValue, delimiter);
}

/**
 * Escape a string value for CSV
 * 
 * Rules:
 * - If value contains delimiter, newline, or double quote, wrap in quotes
 * - Double any existing quotes
 */
function escapeCsvValue(value: string, delimiter: string): string {
  // Check if escaping is needed
  const needsEscaping =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');

  if (!needsEscaping) {
    return value;
  }

  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '""');

  // Wrap in double quotes
  return `"${escaped}"`;
}

/**
 * Parse CSV string to array of objects
 * 
 * Note: This is a simple parser. For complex CSV parsing,
 * consider using a library like 'csv-parse' or 'papaparse'
 * 
 * @param csv - CSV string to parse
 * @param options - Parsing options
 * @returns Array of objects
 */
export function parseCSV(
  csv: string,
  options: { delimiter?: string; hasHeaders?: boolean } = {}
): Record<string, string>[] {
  const { delimiter = ',', hasHeaders = true } = options;

  const lines = csv.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headers = hasHeaders ? parseCSVLine(lines[0], delimiter) : [];
  const dataStartIndex = hasHeaders ? 1 : 0;

  // Parse data rows
  const result: Record<string, string>[] = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);

    if (hasHeaders) {
      // Map values to headers
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      result.push(row);
    } else {
      // Use numeric indices
      const row: Record<string, string> = {};
      values.forEach((value, index) => {
        row[String(index)] = value;
      });
      result.push(row);
    }
  }

  return result;
}

/**
 * Parse a single CSV line respecting quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Convert data to CSV buffer
 */
export function generateCSVBuffer(
  data: Record<string, any>[],
  columns: string[],
  options?: CSVGeneratorOptions
): Buffer {
  const csvString = generateCSV(data, columns, options);
  return Buffer.from(csvString, 'utf-8');
}
