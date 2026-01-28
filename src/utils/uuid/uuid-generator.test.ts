/**
 * UUID v7 Generator Tests
 * 
 * Tests for time-ordered UUID generation utilities
 */

import {
  generateUuidV7,
  extractTimestampFromUuidV7,
  isUuidV7,
  isUuidV4,
  getUuidVersion,
  compareUuidV7Timestamps,
  generateMultipleUuidV7,
} from './uuid-generator';

describe('UUID v7 Generator', () => {
  describe('generateUuidV7', () => {
    it('should generate a valid UUID v7', () => {
      const uuid = generateUuidV7();
      
      // UUID format: 8-4-4-4-12
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUuidV7();
      const uuid2 = generateUuidV7();
      
      expect(uuid1).not.toBe(uuid2);
    });

    it('should be version 7', () => {
      const uuid = generateUuidV7();
      expect(uuid.charAt(14)).toBe('7');
    });

    it('should be time-ordered (sequential)', async () => {
      const uuid1 = generateUuidV7();
      
      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const uuid2 = generateUuidV7();
      
      // UUID v7 should be lexicographically sortable
      expect(uuid1.localeCompare(uuid2)).toBeLessThan(0);
    });

    it('should generate 1000 unique UUIDs', () => {
      const uuids = new Set();
      
      for (let i = 0; i < 1000; i++) {
        uuids.add(generateUuidV7());
      }
      
      expect(uuids.size).toBe(1000);
    });
  });

  describe('extractTimestampFromUuidV7', () => {
    it('should extract timestamp from UUID v7', () => {
      const before = new Date();
      const uuid = generateUuidV7();
      const after = new Date();
      
      const extracted = extractTimestampFromUuidV7(uuid);
      
      expect(extracted).toBeInstanceOf(Date);
      expect(extracted!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1);
      expect(extracted!.getTime()).toBeLessThanOrEqual(after.getTime() + 1);
    });

    it('should return null for invalid UUID', () => {
      expect(extractTimestampFromUuidV7('invalid')).toBeNull();
      expect(extractTimestampFromUuidV7('')).toBeNull();
      expect(extractTimestampFromUuidV7('123')).toBeNull();
    });

    it('should return null for UUID v4', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(extractTimestampFromUuidV7(uuidV4)).toBeNull();
    });

    it('should handle timestamps accurately', async () => {
      const timestamps: Date[] = [];
      const uuids: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        timestamps.push(new Date());
        uuids.push(generateUuidV7());
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const extractedTimestamps = uuids.map(uuid => extractTimestampFromUuidV7(uuid));
      
      // All timestamps should be extracted successfully
      extractedTimestamps.forEach(ts => {
        expect(ts).toBeInstanceOf(Date);
      });
      
      // Timestamps should be in ascending order
      for (let i = 1; i < extractedTimestamps.length; i++) {
        expect(extractedTimestamps[i]!.getTime()).toBeGreaterThanOrEqual(
          extractedTimestamps[i - 1]!.getTime()
        );
      }
    });
  });

  describe('isUuidV7', () => {
    it('should return true for UUID v7', () => {
      const uuid = generateUuidV7();
      expect(isUuidV7(uuid)).toBe(true);
    });

    it('should return false for UUID v4', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(isUuidV7(uuidV4)).toBe(false);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUuidV7('invalid')).toBe(false);
      expect(isUuidV7('')).toBe(false);
      expect(isUuidV7('123')).toBe(false);
      expect(isUuidV7('f47ac10b-58cc-4372-a567')).toBe(false); // Too short
    });

    it('should return false for null/undefined', () => {
      expect(isUuidV7(null as any)).toBe(false);
      expect(isUuidV7(undefined as any)).toBe(false);
    });
  });

  describe('isUuidV4', () => {
    it('should return true for UUID v4', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(isUuidV4(uuidV4)).toBe(true);
    });

    it('should return false for UUID v7', () => {
      const uuid = generateUuidV7();
      expect(isUuidV4(uuid)).toBe(false);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUuidV4('invalid')).toBe(false);
      expect(isUuidV4('')).toBe(false);
      expect(isUuidV4(null as any)).toBe(false);
    });
  });

  describe('getUuidVersion', () => {
    it('should return 7 for UUID v7', () => {
      const uuid = generateUuidV7();
      expect(getUuidVersion(uuid)).toBe(7);
    });

    it('should return 4 for UUID v4', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(getUuidVersion(uuidV4)).toBe(4);
    });

    it('should return null for invalid UUIDs', () => {
      expect(getUuidVersion('invalid')).toBeNull();
      expect(getUuidVersion('')).toBeNull();
      expect(getUuidVersion(null as any)).toBeNull();
    });
  });

  describe('compareUuidV7Timestamps', () => {
    it('should compare two UUID v7 timestamps correctly', async () => {
      const uuid1 = generateUuidV7();
      await new Promise(resolve => setTimeout(resolve, 10));
      const uuid2 = generateUuidV7();
      
      const comparison = compareUuidV7Timestamps(uuid1, uuid2);
      expect(comparison).toBeLessThan(0); // uuid1 came before uuid2
    });

    it('should throw error for non-v7 UUIDs', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const uuidV7 = generateUuidV7();
      
      expect(() => {
        compareUuidV7Timestamps(uuidV4, uuidV7);
      }).toThrow('Both UUIDs must be version 7');
    });

    it('should handle same-millisecond UUIDs', () => {
      const uuid1 = generateUuidV7();
      const uuid2 = generateUuidV7();
      
      const comparison = compareUuidV7Timestamps(uuid1, uuid2);
      
      // Should be very close or equal (same millisecond)
      expect(Math.abs(comparison)).toBeLessThanOrEqual(1);
    });
  });

  describe('generateMultipleUuidV7', () => {
    it('should generate specified number of UUIDs', () => {
      const count = 100;
      const uuids = generateMultipleUuidV7(count);
      
      expect(uuids).toHaveLength(count);
    });

    it('should generate all unique UUIDs', () => {
      const count = 1000;
      const uuids = generateMultipleUuidV7(count);
      const uniqueUuids = new Set(uuids);
      
      expect(uniqueUuids.size).toBe(count);
    });

    it('should generate all UUID v7s', () => {
      const uuids = generateMultipleUuidV7(50);
      
      uuids.forEach(uuid => {
        expect(isUuidV7(uuid)).toBe(true);
      });
    });

    it('should generate time-ordered UUIDs', () => {
      const uuids = generateMultipleUuidV7(100);
      
      // Check if UUIDs are in ascending order (time-ordered)
      for (let i = 1; i < uuids.length; i++) {
        const comparison = uuids[i - 1].localeCompare(uuids[i]);
        expect(comparison).toBeLessThanOrEqual(0);
      }
    });

    it('should throw error for invalid count', () => {
      expect(() => generateMultipleUuidV7(0)).toThrow('Count must be a positive integer');
      expect(() => generateMultipleUuidV7(-1)).toThrow('Count must be a positive integer');
      expect(() => generateMultipleUuidV7(1.5)).toThrow('Count must be a positive integer');
    });
  });

  describe('Performance comparison', () => {
    it('should generate UUIDs quickly', () => {
      const iterations = 10000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        generateUuidV7();
      }
      
      const duration = Date.now() - start;
      const perSecond = (iterations / duration) * 1000;
      
      console.log(`Generated ${iterations} UUID v7s in ${duration}ms (${perSecond.toFixed(0)} per second)`);
      
      // Should be fast (>10k per second on most systems)
      expect(perSecond).toBeGreaterThan(1000);
    });
  });

  describe('Real-world scenarios', () => {
    it('should work with database-like operations', () => {
      // Simulate creating multiple records with timestamps
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: generateUuidV7(),
        name: `Record ${i}`,
        createdAt: new Date(),
      }));
      
      // Sort by ID (should be same as sort by creation)
      const sortedById = [...records].sort((a, b) => a.id.localeCompare(b.id));
      
      // IDs should maintain time ordering
      expect(sortedById[0].id).toBe(records[0].id);
      expect(sortedById[sortedById.length - 1].id).toBe(records[records.length - 1].id);
    });

    it('should handle mixed UUID versions gracefully', () => {
      const uuidV4 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const uuidV7 = generateUuidV7();
      
      // Both should be valid UUID format
      expect(uuidV4).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(uuidV7).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      // Can distinguish between versions
      expect(isUuidV4(uuidV4)).toBe(true);
      expect(isUuidV7(uuidV7)).toBe(true);
      expect(isUuidV4(uuidV7)).toBe(false);
      expect(isUuidV7(uuidV4)).toBe(false);
    });
  });
});
