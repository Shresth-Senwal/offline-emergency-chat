/**
 * Duplicate Detection Utility for Mesh Network Message Handling
 * 
 * This module implements duplicate detection to prevent message loops and
 * redundant processing in the mesh network. When messages are relayed through
 * multiple hops, the same message may arrive via different paths. The
 * DuplicateDetector maintains a cache of recently seen message IDs to identify
 * and discard duplicates.
 * 
 * Key features:
 * - Fast O(1) lookup for duplicate checking using Map data structure
 * - Automatic cache pruning to prevent unbounded memory growth
 * - Timestamp-based expiration (300 seconds)
 * - Thread-safe for single-threaded JavaScript environment
 * 
 * Requirements addressed:
 * - 7.1: Extract and check message ID from envelope
 * - 7.2: Check if message ID exists in cache
 * - 7.3: Discard duplicate messages
 * - 7.4: Add new message IDs to cache with timestamp
 * - 7.5: Remove expired entries after 300 seconds
 * 
 * Usage:
 * ```typescript
 * const detector = new DuplicateDetector();
 * 
 * if (detector.isDuplicate(messageId)) {
 *   // Discard duplicate message
 *   return;
 * }
 * 
 * // Process new message
 * detector.markAsProcessed(messageId);
 * ```
 * 
 * Dependencies:
 * - constants.ts: CACHE_EXPIRATION_MS for expiration time
 */

import { CACHE_EXPIRATION_MS } from './constants';

/**
 * DuplicateDetector class for tracking and identifying duplicate messages.
 * 
 * Maintains an in-memory cache of message IDs with timestamps. The cache
 * is automatically pruned on every insertion to remove expired entries.
 * 
 * Implementation notes:
 * - Uses Map<string, number> for O(1) lookup performance
 * - Stores Unix timestamps in milliseconds for expiration checking
 * - Prunes expired entries on every markAsProcessed call
 * - Does not persist cache to storage (intentional for MVP)
 * 
 * Memory considerations:
 * - Each entry: ~50-100 bytes (UUID string + timestamp + Map overhead)
 * - 1000 entries: ~50-100 KB
 * - Automatic pruning prevents unbounded growth
 */
export class DuplicateDetector {
  /**
   * Internal cache mapping message ID to timestamp.
   * 
   * Key: Message ID (UUID v4 string)
   * Value: Unix timestamp in milliseconds when message was first seen
   * 
   * The timestamp is used for expiration checking during pruning.
   */
  private cache: Map<string, number>;

  /**
   * Constructs a new DuplicateDetector with an empty cache.
   * 
   * The cache can optionally be initialized with existing data
   * (e.g., loaded from persistent storage on app startup).
   * 
   * @param initialCache - Optional pre-populated cache for restoration
   */
  constructor(initialCache?: Map<string, number>) {
    this.cache = initialCache || new Map<string, number>();
  }

  /**
   * Checks if a message ID has been previously processed.
   * 
   * This method performs a simple cache lookup without modifying state.
   * It should be called before processing any incoming message to determine
   * if the message is a duplicate.
   * 
   * Performance: O(1) average case
   * 
   * @param messageId - The unique message identifier to check (UUID v4)
   * @returns true if message ID exists in cache (duplicate), false otherwise (new message)
   * 
   * @example
   * ```typescript
   * if (detector.isDuplicate('550e8400-e29b-41d4-a716-446655440000')) {
   *   console.log('Duplicate message detected, discarding');
   *   return;
   * }
   * ```
   * 
   * Requirements: 7.2, 7.3
   */
  isDuplicate(messageId: string): boolean {
    return this.cache.has(messageId);
  }

  /**
   * Marks a message ID as processed by adding it to the cache.
   * 
   * This method should be called after successfully processing a new message
   * to prevent future duplicates. It automatically triggers cache pruning
   * to remove expired entries.
   * 
   * Side effects:
   * - Adds entry to cache with current timestamp
   * - Triggers automatic pruning of expired entries
   * 
   * Performance: O(n) worst case due to pruning, but amortized O(1)
   * 
   * @param messageId - The unique message identifier to mark as processed (UUID v4)
   * 
   * @example
   * ```typescript
   * // After successfully processing a message
   * detector.markAsProcessed('550e8400-e29b-41d4-a716-446655440000');
   * ```
   * 
   * Requirements: 7.4, 7.5 (automatic pruning)
   */
  markAsProcessed(messageId: string): void {
    // Add message ID to cache with current timestamp
    const currentTimestamp = Date.now();
    this.cache.set(messageId, currentTimestamp);

    // Automatically prune expired entries to prevent unbounded growth
    // This ensures cache stays within reasonable memory bounds
    this.pruneCache();
  }

  /**
   * Removes expired entries from the cache.
   * 
   * Iterates through all cache entries and removes those older than
   * CACHE_EXPIRATION_MS (300 seconds / 5 minutes). This prevents
   * unbounded memory growth while maintaining recent message history.
   * 
   * Pruning strategy:
   * - Called automatically on every markAsProcessed
   * - Removes entries where (currentTime - timestamp) > CACHE_EXPIRATION_MS
   * - Preserves entries within expiration window
   * 
   * Performance: O(n) where n is cache size
   * 
   * Memory impact:
   * - Typical case: Removes 0-10 entries per call
   * - Worst case: Removes all entries if app was idle for >5 minutes
   * 
   * @example
   * ```typescript
   * // Manual pruning (usually not needed due to automatic pruning)
   * detector.pruneCache();
   * ```
   * 
   * Requirements: 7.5
   */
  pruneCache(): void {
    const currentTimestamp = Date.now();
    const expirationThreshold = currentTimestamp - CACHE_EXPIRATION_MS;

    // Iterate through cache and remove expired entries
    // Using for...of with entries() for efficient iteration and deletion
    for (const [messageId, timestamp] of this.cache.entries()) {
      if (timestamp < expirationThreshold) {
        // Entry has expired, remove it from cache
        this.cache.delete(messageId);
      }
    }
  }

  /**
   * Returns the current cache for persistence or inspection.
   * 
   * This method provides read-only access to the internal cache state.
   * Useful for:
   * - Persisting cache to storage on app shutdown
   * - Debugging and monitoring cache size
   * - Testing cache behavior
   * 
   * Note: Returns the actual Map reference, not a copy. Callers should
   * not modify the returned Map directly.
   * 
   * @returns The internal cache Map
   * 
   * @example
   * ```typescript
   * const cache = detector.getCache();
   * console.log(`Cache size: ${cache.size} entries`);
   * 
   * // Persist to storage
   * await storageService.storeDuplicateCache(cache);
   * ```
   */
  getCache(): Map<string, number> {
    return this.cache;
  }

  /**
   * Returns the current number of entries in the cache.
   * 
   * Useful for monitoring memory usage and cache effectiveness.
   * 
   * @returns Number of message IDs currently in cache
   * 
   * @example
   * ```typescript
   * console.log(`Cache contains ${detector.getCacheSize()} entries`);
   * ```
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clears all entries from the cache.
   * 
   * This method is primarily useful for:
   * - Testing and resetting state
   * - Manual cache management in edge cases
   * - Recovering from potential cache corruption
   * 
   * Warning: Clearing the cache may allow duplicate messages to be
   * processed if they arrive again. Use with caution.
   * 
   * @example
   * ```typescript
   * // Clear cache on user logout or app reset
   * detector.clearCache();
   * ```
   */
  clearCache(): void {
    this.cache.clear();
  }
}
