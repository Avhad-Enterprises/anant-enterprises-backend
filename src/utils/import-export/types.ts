/**
 * Common Types for Import/Export Utilities
 * 
 * Shared across all features for consistent import/export behavior
 */

/**
 * Import operation modes
 */
export type ImportMode = 'create' | 'update' | 'upsert';

/**
 * Export file formats
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Export scope
 */
export type ExportScope = 'all' | 'selected';

/**
 * Result of an import operation
 */
export interface ImportResult<T = any> {
  /** Number of successfully imported records */
  success: number;
  /** Number of failed records */
  failed: number;
  /** Number of skipped records (e.g., already exists) */
  skipped: number;
  /** Detailed error information for failed records */
  errors: ImportError<T>[];
  /** Optional: IDs of created/updated records */
  createdIds?: string[];
  updatedIds?: string[];
}

/**
 * Error details for a failed import row
 */
export interface ImportError<T = any> {
  /** Row number (1-indexed) */
  row: number;
  /** Original data that failed */
  data?: Partial<T>;
  /** Error message */
  error: string;
  /** Optional: Field that caused the error */
  field?: string;
}

/**
 * Options for CSV generation
 */
export interface CSVGeneratorOptions {
  /** Column headers (if different from keys) */
  headers?: string[];
  /** Delimiter (default: ',') */
  delimiter?: string;
  /** Array value separator (default: '; ') */
  arraySeparator?: string;
  /** Include header row (default: true) */
  includeHeaders?: boolean;
}

/**
 * Options for Excel generation
 */
export interface ExcelGeneratorOptions {
  /** Sheet name (default: 'Sheet1') */
  sheetName?: string;
  /** Column widths (default: 15) */
  columnWidth?: number | Record<string, number>;
  /** Include header row (default: true) */
  includeHeaders?: boolean;
  /** Freeze header row (default: true) */
  freezeHeader?: boolean;
  /** Apply auto-filter (default: true) */
  autoFilter?: boolean;
}

/**
 * Options for data formatting before export
 */
export interface DataFormatterOptions {
  /** Columns to include (if not all) */
  columns?: string[];
  /** Date format (default: 'iso') */
  dateFormat?: 'iso' | 'date-only' | 'datetime';
  /** Boolean format (default: 'yes-no') */
  booleanFormat?: 'yes-no' | 'true-false' | '1-0' | 'active-inactive';
  /** Array join separator (default: ', ') */
  arrayJoin?: string;
  /** Null value representation (default: '') */
  nullValue?: string;
  /** Custom formatters for specific columns */
  customFormatters?: Record<string, (value: any) => string>;
}

/**
 * Options for sending file response
 */
export interface FileResponseOptions {
  /** File format */
  format: ExportFormat;
  /** Base filename (without extension and timestamp) */
  filename: string;
  /** Include timestamp in filename (default: true) */
  includeTimestamp?: boolean;
}

/**
 * Base export request options
 */
export interface BaseExportOptions {
  /** Export scope */
  scope: ExportScope;
  /** Export format */
  format: ExportFormat;
  /** Selected IDs (when scope is 'selected') */
  selectedIds?: string[];
  /** Columns to include in export */
  selectedColumns: string[];
  /** Optional date range filter */
  dateRange?: {
    from?: string;
    to?: string;
    field?: string;
  };
}

/**
 * Base import request options
 */
export interface BaseImportOptions<T> {
  /** Data to import */
  data: T[];
  /** Import mode */
  mode: ImportMode;
  /** Optional: User ID for audit trail */
  userId?: string;
}
