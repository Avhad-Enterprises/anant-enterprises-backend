/**
 * Data Formatter for Export Operations
 * 
 * Formats data before export to CSV/Excel with consistent formatting rules.
 */

import { DataFormatterOptions } from './types';

/**
 * Format data array for export
 * 
 * Applies consistent formatting rules:
 * - Dates → ISO string or custom format
 * - Booleans → "Yes"/"No" or custom format
 * - Arrays → Joined string
 * - Nulls → Empty string or custom
 * - Objects → JSON string
 * 
 * @param data - Array of objects to format
 * @param options - Formatting options
 * @returns Formatted data array
 */
export function formatExportData(
  data: Record<string, any>[],
  options: DataFormatterOptions = {}
): Record<string, any>[] {
  const {
    columns,
    dateFormat = 'iso',
    booleanFormat = 'yes-no',
    arrayJoin = ', ',
    nullValue = '',
    customFormatters = {},
  } = options;

  return data.map(row => {
    const formatted: Record<string, any> = {};
    const columnsToProcess = columns || Object.keys(row);

    columnsToProcess.forEach(column => {
      const value = row[column];

      // Apply custom formatter if exists
      if (customFormatters[column]) {
        formatted[column] = customFormatters[column](value);
        return;
      }

      // Apply default formatting
      formatted[column] = formatValue(value, {
        dateFormat,
        booleanFormat,
        arrayJoin,
        nullValue,
      });
    });

    return formatted;
  });
}

/**
 * Format a single value
 */
function formatValue(
  value: any,
  options: {
    dateFormat: 'iso' | 'date-only' | 'datetime';
    booleanFormat: 'yes-no' | 'true-false' | '1-0' | 'active-inactive';
    arrayJoin: string;
    nullValue: string;
  }
): any {
  const { dateFormat, booleanFormat, arrayJoin, nullValue } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return nullValue;
  }

  // Handle Date
  if (value instanceof Date) {
    return formatDate(value, dateFormat);
  }

  // Handle Boolean
  if (typeof value === 'boolean') {
    return formatBoolean(value, booleanFormat);
  }

  // Handle Array
  if (Array.isArray(value)) {
    if (value.length === 0) return nullValue;
    return value.map(v => String(v ?? '')).join(arrayJoin);
  }

  // Handle Object (but not Date)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Return primitives as-is
  return value;
}

/**
 * Format date value
 */
function formatDate(
  date: Date,
  format: 'iso' | 'date-only' | 'datetime'
): string {
  switch (format) {
    case 'date-only':
      return date.toISOString().split('T')[0];
    case 'datetime':
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    case 'iso':
    default:
      return date.toISOString();
  }
}

/**
 * Format boolean value
 */
function formatBoolean(
  value: boolean,
  format: 'yes-no' | 'true-false' | '1-0' | 'active-inactive'
): string {
  switch (format) {
    case 'true-false':
      return value ? 'true' : 'false';
    case '1-0':
      return value ? '1' : '0';
    case 'active-inactive':
      return value ? 'Active' : 'Inactive';
    case 'yes-no':
    default:
      return value ? 'Yes' : 'No';
  }
}

/**
 * Filter columns from data
 * 
 * Returns only selected columns in specified order
 */
export function filterColumns(
  data: Record<string, any>[],
  columns: string[]
): Record<string, any>[] {
  return data.map(row => {
    const filtered: Record<string, any> = {};
    columns.forEach(column => {
      if (column in row) {
        filtered[column] = row[column];
      }
    });
    return filtered;
  });
}

/**
 * Flatten nested objects for export
 * 
 * Converts { user: { name: 'John' } } to { 'user.name': 'John' }
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0
): Record<string, any> {
  if (currentDepth >= maxDepth) {
    return { [prefix]: JSON.stringify(obj) };
  }

  const flattened: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey, maxDepth, currentDepth + 1));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Flatten array of objects
 */
export function flattenData(
  data: Record<string, any>[],
  maxDepth: number = 3
): Record<string, any>[] {
  return data.map(row => flattenObject(row, '', maxDepth));
}
