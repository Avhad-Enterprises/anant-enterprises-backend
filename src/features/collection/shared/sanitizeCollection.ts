import { Collection } from './collection.schema';

/**
 * Sanitized collection type without sensitive or internal fields
 */
export type SanitizedCollection = Omit<Collection, 'created_by'>;

/**
 * Remove sensitive/internal fields from a single collection object
 * Ensures internal data never leaks in API responses
 */
export const sanitizeCollection = (collection: Collection): SanitizedCollection => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { created_by, ...sanitized } = collection;
  return sanitized;
};

/**
 * Remove sensitive fields from an array of collection objects
 */
export const sanitizeCollections = (collections: Collection[]): SanitizedCollection[] => {
  return collections.map(sanitizeCollection);
};
