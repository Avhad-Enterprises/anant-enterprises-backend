/**
 * UUID v7 Generator Utilities
 * 
 * UUID v7 is a time-ordered UUID that combines:
 * - 48 bits: Unix timestamp (millisecond precision)
 * - 4 bits: Version identifier (0111 for v7)
 * - 12 bits: Random data
 * - 2 bits: Variant identifier (10)
 * - 62 bits: Random data
 * 
 * Benefits over UUID v4:
 * - Time-ordered for better database performance
 * - Sequential IDs reduce index fragmentation
 * - Can extract creation timestamp
 * - Better B-tree locality
 */

import { uuidv7 } from 'uuidv7';

/**
 * Generate UUID v7 (time-ordered)
 * 
 * Format: 8-4-4-4-12 (same as UUID v4)
 * Example: 018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f
 * 
 * First 48 bits: Unix timestamp (millisecond precision)
 * Remaining 74 bits: Random data with version and variant markers
 * 
 * @returns UUID v7 string
 */
export function generateUuidV7(): string {
  return uuidv7();
}

/**
 * Extract timestamp from UUID v7
 * 
 * @param uuid UUID v7 string
 * @returns Date object or null if invalid UUID v7
 * 
 * @example
 * const uuid = generateUuidV7();
 * const timestamp = extractTimestampFromUuidV7(uuid);
 * console.log(timestamp); // Date object
 */
export function extractTimestampFromUuidV7(uuid: string): Date | null {
  try {
    // Validate UUID format
    if (!uuid || typeof uuid !== 'string') {
      return null;
    }

    // Remove hyphens and validate length
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) {
      return null;
    }

    // Check if it's UUID v7 (14th character should be '7')
    if (uuid.charAt(14) !== '7') {
      return null;
    }

    // Extract first 48 bits (12 hex characters = 48 bits)
    const timestampHex = hex.substring(0, 12);
    const timestamp = parseInt(timestampHex, 16);

    // Validate timestamp is reasonable (between 2020 and 2100)
    const MIN_TIMESTAMP = new Date('2020-01-01').getTime();
    const MAX_TIMESTAMP = new Date('2100-01-01').getTime();
    
    if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
      return null;
    }

    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Check if UUID is v7
 * 
 * @param uuid UUID string to check
 * @returns true if UUID is version 7
 * 
 * @example
 * isUuidV7('018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f') // true
 * isUuidV7('f47ac10b-58cc-4372-a567-0e02b2c3d479') // false (v4)
 */
export function isUuidV7(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string' || uuid.length !== 36) {
    return false;
  }
  
  // UUID v7 has '7' at position 14 (version field)
  return uuid.charAt(14) === '7';
}

/**
 * Check if UUID is v4
 * 
 * @param uuid UUID string to check
 * @returns true if UUID is version 4
 * 
 * @example
 * isUuidV4('f47ac10b-58cc-4372-a567-0e02b2c3d479') // true
 * isUuidV4('018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f') // false (v7)
 */
export function isUuidV4(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string' || uuid.length !== 36) {
    return false;
  }
  
  // UUID v4 has '4' at position 14 (version field)
  return uuid.charAt(14) === '4';
}

/**
 * Get UUID version
 * 
 * @param uuid UUID string
 * @returns Version number (4, 7, etc.) or null if invalid
 * 
 * @example
 * getUuidVersion('018d3f6c-7a2b-7f3c-8d9e-1a2b3c4d5e6f') // 7
 * getUuidVersion('f47ac10b-58cc-4372-a567-0e02b2c3d479') // 4
 */
export function getUuidVersion(uuid: string): number | null {
  if (!uuid || typeof uuid !== 'string' || uuid.length !== 36) {
    return null;
  }
  
  const version = uuid.charAt(14);
  const versionNum = parseInt(version, 10);
  
  return isNaN(versionNum) ? null : versionNum;
}

/**
 * Compare two UUID v7s by their timestamps
 * Useful for sorting or determining which came first
 * 
 * @param uuid1 First UUID v7
 * @param uuid2 Second UUID v7
 * @returns Negative if uuid1 < uuid2, 0 if equal, positive if uuid1 > uuid2
 * @throws Error if either UUID is not v7
 * 
 * @example
 * const id1 = generateUuidV7();
 * await sleep(100);
 * const id2 = generateUuidV7();
 * compareUuidV7Timestamps(id1, id2) // < 0 (id1 came before id2)
 */
export function compareUuidV7Timestamps(uuid1: string, uuid2: string): number {
  if (!isUuidV7(uuid1) || !isUuidV7(uuid2)) {
    throw new Error('Both UUIDs must be version 7');
  }

  const ts1 = extractTimestampFromUuidV7(uuid1);
  const ts2 = extractTimestampFromUuidV7(uuid2);

  if (!ts1 || !ts2) {
    throw new Error('Failed to extract timestamps');
  }

  return ts1.getTime() - ts2.getTime();
}

/**
 * Generate multiple UUID v7s
 * Useful for bulk operations
 * 
 * @param count Number of UUIDs to generate
 * @returns Array of UUID v7 strings
 * 
 * @example
 * const ids = generateMultipleUuidV7(100);
 * // All IDs are time-ordered and can be sorted naturally
 */
export function generateMultipleUuidV7(count: number): string[] {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new Error('Count must be a positive integer');
  }

  return Array.from({ length: count }, () => generateUuidV7());
}
