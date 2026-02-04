/**
 * Result Aggregator for Import Operations
 * 
 * Tracks and aggregates results from batch import operations.
 * Provides consistent error reporting across all import features.
 */

import { ImportResult, ImportMode } from './types';

/**
 * Create a new import result tracker
 */
export function createImportResult<T = any>(): ImportResult<T> {
  return {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    createdIds: [],
    updatedIds: [],
  };
}

/**
 * Record a successful import
 */
export function recordSuccess<T>(
  result: ImportResult<T>,
  mode: ImportMode,
  recordId?: string
): void {
  result.success++;
  
  if (recordId) {
    if (mode === 'create' || mode === 'upsert') {
      result.createdIds = result.createdIds || [];
      result.createdIds.push(recordId);
    } else if (mode === 'update') {
      result.updatedIds = result.updatedIds || [];
      result.updatedIds.push(recordId);
    }
  }
}

/**
 * Record a failed import
 */
export function recordFailure<T>(
  result: ImportResult<T>,
  row: number,
  error: string,
  data?: Partial<T>,
  field?: string
): void {
  result.failed++;
  result.errors.push({
    row,
    error,
    data,
    field,
  });
}

/**
 * Record a skipped import (e.g., already exists)
 */
export function recordSkipped<T>(
  result: ImportResult<T>,
  row: number,
  reason: string,
  data?: Partial<T>
): void {
  result.skipped++;
  result.errors.push({
    row,
    error: reason,
    data,
  });
}

/**
 * Process import result based on operation outcome
 * 
 * @param result - Import result tracker
 * @param row - Row number (1-indexed)
 * @param operationResult - Result from import operation
 * @param data - Original row data
 * 
 * @example
 * const result = createImportResult();
 * for (let i = 0; i < data.length; i++) {
 *   const operationResult = await importRow(data[i], mode, userId);
 *   processImportResult(result, i + 1, operationResult, data[i]);
 * }
 */
export function processImportResult<T>(
  result: ImportResult<T>,
  row: number,
  operationResult: {
    success: boolean;
    error?: string;
    recordId?: string;
    skipped?: boolean;
  },
  mode: ImportMode,
  data?: Partial<T>
): void {
  if (operationResult.success) {
    recordSuccess(result, mode, operationResult.recordId);
  } else if (operationResult.skipped || operationResult.error?.toLowerCase().includes('already exists')) {
    recordSkipped(result, row, operationResult.error || 'Already exists', data);
  } else {
    recordFailure(result, row, operationResult.error || 'Unknown error', data);
  }
}

/**
 * Batch process import results
 * 
 * Executes import operations in batches and aggregates results
 * 
 * @param data - Array of data to import
 * @param importFn - Function to import a single record
 * @param mode - Import mode
 * @param options - Batch options
 * 
 * @example
 * const result = await batchProcessImport(
 *   data,
 *   (row, mode) => importProduct(row, mode, userId),
 *   'create',
 *   { batchSize: 50 }
 * );
 */
export async function batchProcessImport<T>(
  data: T[],
  importFn: (
    row: T,
    mode: ImportMode,
    index: number
  ) => Promise<{ success: boolean; error?: string; recordId?: string; skipped?: boolean }>,
  mode: ImportMode,
  options: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<ImportResult<T>> {
  const { batchSize = 100, onProgress } = options;
  const result = createImportResult<T>();

  // Process in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, Math.min(i + batchSize, data.length));
    
    // Process batch
    const batchPromises = batch.map((row, batchIndex) => {
      const globalIndex = i + batchIndex;
      return importFn(row, mode, globalIndex).then(operationResult => ({
        row: globalIndex + 1,
        operationResult,
        data: row,
      }));
    });

    const batchResults = await Promise.allSettled(batchPromises);

    // Aggregate batch results
    batchResults.forEach((promiseResult, batchIndex) => {
      const rowNumber = i + batchIndex + 1;
      
      if (promiseResult.status === 'fulfilled') {
        const { operationResult, data: rowData } = promiseResult.value;
        processImportResult(result, rowNumber, operationResult, mode, rowData);
      } else {
        // Promise rejected (unexpected error)
        recordFailure(
          result,
          rowNumber,
          `Unexpected error: ${promiseResult.reason}`,
          batch[batchIndex]
        );
      }
    });

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, data.length), data.length);
    }
  }

  return result;
}

/**
 * Format import result as summary message
 * 
 * @example
 * const message = formatImportSummary(result);
 * // "Successfully imported 45 records. Failed: 3, Skipped: 2"
 */
export function formatImportSummary(result: ImportResult): string {
  const parts: string[] = [];

  if (result.success > 0) {
    parts.push(`Successfully imported ${result.success} record${result.success !== 1 ? 's' : ''}`);
  }

  if (result.failed > 0) {
    parts.push(`Failed: ${result.failed}`);
  }

  if (result.skipped > 0) {
    parts.push(`Skipped: ${result.skipped}`);
  }

  return parts.join('. ') || 'No records processed';
}

/**
 * Get import error summary
 * 
 * Returns first N errors in readable format
 */
export function getImportErrorSummary<T>(
  result: ImportResult<T>,
  maxErrors: number = 10
): string[] {
  return result.errors
    .slice(0, maxErrors)
    .map(err => `Row ${err.row}: ${err.error}${err.field ? ` (field: ${err.field})` : ''}`);
}
