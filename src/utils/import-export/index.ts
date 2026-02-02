/**
 * Import/Export Utilities
 * 
 * Common utilities for CSV/Excel import and export operations.
 * Provides consistent behavior across all features.
 * 
 * @module utils/import-export
 */

// Type definitions
export * from './types';

// CSV utilities
export {
  generateCSV,
  parseCSV,
  generateCSVBuffer,
} from './csv-generator';

// Excel utilities
export {
  generateExcel,
  generateExcelBuffer,
  generateMultiSheetExcel,
} from './excel-generator';

// Validation helpers
export {
  numberParser,
  nullableNumberParser,
  booleanParser,
  dateParser,
  caseInsensitiveEnum,
  arrayParser,
  jsonParser,
  trimString,
  emptyStringToNull,
  trimAndNullify,
  percentageParser,
} from './validation-helpers';

// Result aggregation
export {
  createImportResult,
  recordSuccess,
  recordFailure,
  recordSkipped,
  processImportResult,
  batchProcessImport,
  formatImportSummary,
  getImportErrorSummary,
} from './result-aggregator';

// Data formatting
export {
  formatExportData,
  filterColumns,
  flattenObject,
  flattenData,
} from './data-formatter';

// Response helpers
export {
  sendFileResponse,
  createDownloadData,
} from './response-helpers';

// Schemas
export {
  importModeSchema,
  exportFormatSchema,
  exportScopeSchema,
  dateRangeSchema,
  baseExportSchema,
  createImportRequestSchema,
  paginationSchema,
  sortSchema,
} from './schemas';
