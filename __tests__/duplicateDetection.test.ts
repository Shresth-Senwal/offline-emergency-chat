/**
 * Unit tests for duplicate detection utility.
 * 
 * Tests the core functionality of the DuplicateDetector class including
 * duplicate checking, cache management, and automatic pruning.
 * 
 * Test coverage:
 * - Duplicate detection (first occurrence vs. duplicate)
 * - Cache insertion and retrieval
 * - Automatic pruning on markAsProcessed
 * - Manual pruning of expired entries
 * - Cache size management
 * - Edge cases (empty cache, expired entries, etc.)
 * 
 * Requirements tested:
 * - 7.1: Extract and check message ID
 * - 7.2: Check if message ID exists in cache
 * - 7.3: Discard duplicate messages
 * - 7.4: Add message ID to cache with timestamp
 * - 7.5: Remove entries older than 300 seconds
 */

import { DuplicateDetector } from '../src/utils/duplicateDetection';
import { CACHE_EXPIRATION_MS } from '../src/utils/constants';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    detector = new DuplicateDetector();
  });

  describe('isDuplicate', () => {
    it('should return false for new message ID', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      
      expect(detector.isDuplicate(messageId)).toBe(false);
    });

    it('should return true for previously processed message ID', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      
      detector.markAsProcessed(messageId);
      
      expect(detector.isDuplicate(messageId)).toBe(true);
    });

    it('should handle multiple different message IDs', () => {
      const messageId1 = '550e8400-e29b-41d4-a716-446655440000';
      const messageId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const messageId3 = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
      
      detector.markAsProcessed(messageId1);
      detector.markAsProcessed(messageId2);
      
      expect(detector.isDuplicate(messageId1)).toBe(true);
      expect(detector.isDuplicate(messageId2)).toBe(true);
      expect(detector.isDuplicate(messageId3)).toBe(false);
    });
  });

  describe('markAsProcessed', () => {
    it('should add message ID to cache', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      
      detector.markAsProcessed(messageId);
      
      expect(detector.isDuplicate(messageId)).toBe(true);
      expect(detector.getCacheSize()).toBe(1);
    });

    it('should update timestamp if same message ID is marked again', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      
      detector.markAsProcessed(messageId);
      const firstSize = detector.getCacheSize();
      
      detector.markAsProcessed(messageId);
      const secondSize = detector.getCacheSize();
      
      // Size should remain the same (no duplicate entries)
      expect(secondSize).toBe(firstSize);
      expect(detector.isDuplicate(messageId)).toBe(true);
    });

    it('should handle multiple message IDs', () => {
      const messageIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      ];
      
      messageIds.forEach(id => detector.markAsProcessed(id));
      
      expect(detector.getCacheSize()).toBe(3);
      messageIds.forEach(id => {
        expect(detector.isDuplicate(id)).toBe(true);
      });
    });
  });

  describe('pruneCache', () => {
    it('should remove expired entries', () => {
      const messageId1 = '550e8400-e29b-41d4-a716-446655440000';
      const messageId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      // Create a cache with an expired entry
      const expiredTimestamp = Date.now() - CACHE_EXPIRATION_MS - 1000;
      const recentTimestamp = Date.now();
      
      const initialCache = new Map<string, number>([
        [messageId1, expiredTimestamp],
        [messageId2, recentTimestamp],
      ]);
      
      detector = new DuplicateDetector(initialCache);
      expect(detector.getCacheSize()).toBe(2);
      
      detector.pruneCache();
      
      // Expired entry should be removed
      expect(detector.getCacheSize()).toBe(1);
      expect(detector.isDuplicate(messageId1)).toBe(false);
      expect(detector.isDuplicate(messageId2)).toBe(true);
    });

    it('should not remove recent entries', () => {
      const messageId1 = '550e8400-e29b-41d4-a716-446655440000';
      const messageId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      detector.markAsProcessed(messageId1);
      detector.markAsProcessed(messageId2);
      
      expect(detector.getCacheSize()).toBe(2);
      
      detector.pruneCache();
      
      // Both entries should still be present
      expect(detector.getCacheSize()).toBe(2);
      expect(detector.isDuplicate(messageId1)).toBe(true);
      expect(detector.isDuplicate(messageId2)).toBe(true);
    });

    it('should handle empty cache', () => {
      expect(detector.getCacheSize()).toBe(0);
      
      detector.pruneCache();
      
      expect(detector.getCacheSize()).toBe(0);
    });

    it('should be called automatically on markAsProcessed', () => {
      const messageId1 = '550e8400-e29b-41d4-a716-446655440000';
      const messageId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      // Create a cache with an expired entry
      const expiredTimestamp = Date.now() - CACHE_EXPIRATION_MS - 1000;
      const initialCache = new Map<string, number>([
        [messageId1, expiredTimestamp],
      ]);
      
      detector = new DuplicateDetector(initialCache);
      expect(detector.getCacheSize()).toBe(1);
      
      // markAsProcessed should trigger automatic pruning
      detector.markAsProcessed(messageId2);
      
      // Expired entry should be removed, new entry added
      expect(detector.getCacheSize()).toBe(1);
      expect(detector.isDuplicate(messageId1)).toBe(false);
      expect(detector.isDuplicate(messageId2)).toBe(true);
    });
  });

  describe('getCache', () => {
    it('should return the internal cache', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      
      detector.markAsProcessed(messageId);
      
      const cache = detector.getCache();
      
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(1);
      expect(cache.has(messageId)).toBe(true);
    });

    it('should return empty map for new detector', () => {
      const cache = detector.getCache();
      
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(detector.getCacheSize()).toBe(0);
    });

    it('should return correct size after adding entries', () => {
      detector.markAsProcessed('550e8400-e29b-41d4-a716-446655440000');
      expect(detector.getCacheSize()).toBe(1);
      
      detector.markAsProcessed('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(detector.getCacheSize()).toBe(2);
      
      detector.markAsProcessed('6ba7b811-9dad-11d1-80b4-00c04fd430c8');
      expect(detector.getCacheSize()).toBe(3);
    });
  });

  describe('clearCache', () => {
    it('should remove all entries from cache', () => {
      detector.markAsProcessed('550e8400-e29b-41d4-a716-446655440000');
      detector.markAsProcessed('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      
      expect(detector.getCacheSize()).toBe(2);
      
      detector.clearCache();
      
      expect(detector.getCacheSize()).toBe(0);
      expect(detector.isDuplicate('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should handle clearing empty cache', () => {
      expect(detector.getCacheSize()).toBe(0);
      
      detector.clearCache();
      
      expect(detector.getCacheSize()).toBe(0);
    });
  });

  describe('constructor with initial cache', () => {
    it('should initialize with provided cache', () => {
      const messageId1 = '550e8400-e29b-41d4-a716-446655440000';
      const messageId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      const initialCache = new Map<string, number>([
        [messageId1, Date.now()],
        [messageId2, Date.now()],
      ]);
      
      detector = new DuplicateDetector(initialCache);
      
      expect(detector.getCacheSize()).toBe(2);
      expect(detector.isDuplicate(messageId1)).toBe(true);
      expect(detector.isDuplicate(messageId2)).toBe(true);
    });

    it('should work without initial cache', () => {
      detector = new DuplicateDetector();
      
      expect(detector.getCacheSize()).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical message flow', () => {
      // Simulate receiving messages in a mesh network
      const message1 = '550e8400-e29b-41d4-a716-446655440000';
      const message2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      // First message arrives
      expect(detector.isDuplicate(message1)).toBe(false);
      detector.markAsProcessed(message1);
      
      // Second message arrives
      expect(detector.isDuplicate(message2)).toBe(false);
      detector.markAsProcessed(message2);
      
      // First message arrives again via different path (duplicate)
      expect(detector.isDuplicate(message1)).toBe(true);
      
      // Second message arrives again (duplicate)
      expect(detector.isDuplicate(message2)).toBe(true);
    });

    it('should handle cache restoration from storage', () => {
      // Simulate app startup with persisted cache
      const persistedCache = new Map<string, number>([
        ['550e8400-e29b-41d4-a716-446655440000', Date.now() - 60000], // 1 minute ago
        ['6ba7b810-9dad-11d1-80b4-00c04fd430c8', Date.now() - 120000], // 2 minutes ago
      ]);
      
      detector = new DuplicateDetector(persistedCache);
      
      // Both messages should still be detected as duplicates
      expect(detector.isDuplicate('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(detector.isDuplicate('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      
      // New message should not be duplicate
      expect(detector.isDuplicate('6ba7b811-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
    });
  });
});
