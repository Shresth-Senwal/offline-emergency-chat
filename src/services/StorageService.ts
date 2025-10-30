/**
 * StorageService - Persistent data management for the Offline Emergency Mesh Chat.
 *
 * This service provides a clean abstraction over React Native's AsyncStorage for
 * persisting critical application data including:
 * - X25519 cryptographic key pairs (base64 encoded)
 * - Message history per peer
 * - Duplicate detection cache for mesh relay
 * - Peer trust verification status
 *
 * All storage operations are asynchronous and handle errors gracefully.
 * Data is stored in JSON format where applicable, with binary data (Uint8Array)
 * encoded as base64 strings for storage compatibility.
 *
 * Requirements addressed:
 * - 2.1: Persist X25519 key pairs for end-to-end encryption
 * - 5.3: Store message history locally for offline operation
 * - 7.4: Persist duplicate detection cache across app restarts
 * - 3.3: Store peer trust verification status
 *
 * Dependencies:
 * - @react-native-async-storage/async-storage: Cross-platform persistent storage
 * - ../context/types: Message interface definition
 * - ../utils/constants: Storage key constants
 *
 * @module StorageService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../context/types';
import {
  STORAGE_KEY_KEYPAIR,
  STORAGE_KEY_MESSAGES_PREFIX,
  STORAGE_KEY_DUPLICATE_CACHE,
  STORAGE_KEY_TRUSTED_PEER_PREFIX,
} from '../utils/constants';

// Polyfill for base64 encoding/decoding in React Native
// These are available globally in React Native but TypeScript doesn't know about them
declare const btoa: (str: string) => string;
declare const atob: (str: string) => string;

/**
 * Key pair storage format.
 * Both keys are stored as base64-encoded strings for AsyncStorage compatibility.
 */
interface StoredKeyPair {
  publicKey: string; // Base64-encoded X25519 public key
  privateKey: string; // Base64-encoded X25519 private key
}

/**
 * StorageService class providing persistent data management.
 *
 * This class wraps AsyncStorage with type-safe methods for storing and retrieving
 * application data. All methods are async and should be awaited.
 *
 * Usage:
 * ```typescript
 * const storage = new StorageService();
 * await storage.storeKeyPair(publicKey, privateKey);
 * const keyPair = await storage.getKeyPair();
 * ```
 */
export class StorageService {
  /**
   * Store X25519 key pair to persistent storage.
   *
   * Keys are converted from Uint8Array to base64 strings for storage.
   * Both keys are stored together in a single JSON object.
   *
   * @param publicKey - X25519 public key (32 bytes)
   * @param privateKey - X25519 private key (32 bytes)
   * @throws Error if storage operation fails
   *
   * @example
   * ```typescript
   * const publicKey = new Uint8Array(32);
   * const privateKey = new Uint8Array(32);
   * await storage.storeKeyPair(publicKey, privateKey);
   * ```
   */
  async storeKeyPair(
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<void> {
    try {
      const keyPair: StoredKeyPair = {
        publicKey: this.uint8ArrayToBase64(publicKey),
        privateKey: this.uint8ArrayToBase64(privateKey),
      };
      await AsyncStorage.setItem(STORAGE_KEY_KEYPAIR, JSON.stringify(keyPair));
    } catch (error) {
      console.error('Failed to store key pair:', error);
      throw new Error('Failed to store key pair to persistent storage');
    }
  }

  /**
   * Retrieve X25519 key pair from persistent storage.
   *
   * Keys are converted from base64 strings back to Uint8Array format.
   * Returns null if no key pair has been stored yet (first launch).
   *
   * @returns Key pair object with publicKey and privateKey as Uint8Array, or null if not found
   * @throws Error if stored data is corrupted or cannot be parsed
   *
   * @example
   * ```typescript
   * const keyPair = await storage.getKeyPair();
   * if (keyPair) {
   *   console.log('Public key:', keyPair.publicKey);
   * } else {
   *   console.log('No key pair found, need to generate');
   * }
   * ```
   */
  async getKeyPair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  } | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_KEYPAIR);
      if (!stored) {
        return null;
      }

      const keyPair: StoredKeyPair = JSON.parse(stored);
      return {
        publicKey: this.base64ToUint8Array(keyPair.publicKey),
        privateKey: this.base64ToUint8Array(keyPair.privateKey),
      };
    } catch (error) {
      console.error('Failed to retrieve key pair:', error);
      throw new Error('Failed to retrieve key pair from persistent storage');
    }
  }

  /**
   * Store a message to persistent storage.
   *
   * Messages are stored in peer-specific arrays. This method appends the new
   * message to the existing array for the peer, or creates a new array if this
   * is the first message with that peer.
   *
   * @param message - Message object to store
   * @throws Error if storage operation fails
   *
   * @example
   * ```typescript
   * const message: Message = {
   *   id: 'msg-123',
   *   peerId: 'peer-456',
   *   text: 'Hello',
   *   timestamp: Date.now(),
   *   sent: true,
   *   delivered: false,
   *   failed: false,
   * };
   * await storage.storeMessage(message);
   * ```
   */
  async storeMessage(message: Message): Promise<void> {
    try {
      const storageKey = `${STORAGE_KEY_MESSAGES_PREFIX}${message.peerId}`;
      const stored = await AsyncStorage.getItem(storageKey);

      let messages: Message[] = [];
      if (stored) {
        messages = JSON.parse(stored);
      }

      // Append new message to array
      messages.push(message);

      await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to store message:', error);
      throw new Error('Failed to store message to persistent storage');
    }
  }

  /**
   * Retrieve all messages for a specific peer from persistent storage.
   *
   * Returns an empty array if no messages exist for the peer yet.
   * Messages are returned in the order they were stored (chronological).
   *
   * @param peerId - Unique identifier of the peer
   * @returns Array of messages for the peer, or empty array if none found
   * @throws Error if stored data is corrupted or cannot be parsed
   *
   * @example
   * ```typescript
   * const messages = await storage.getMessages('peer-456');
   * console.log(`Found ${messages.length} messages`);
   * ```
   */
  async getMessages(peerId: string): Promise<Message[]> {
    try {
      const storageKey = `${STORAGE_KEY_MESSAGES_PREFIX}${peerId}`;
      const stored = await AsyncStorage.getItem(storageKey);

      if (!stored) {
        return [];
      }

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      throw new Error('Failed to retrieve messages from persistent storage');
    }
  }

  /**
   * Store duplicate detection cache to persistent storage.
   *
   * The cache is a Map of message ID to timestamp. It's serialized to JSON
   * by converting the Map to an array of [key, value] pairs.
   *
   * This allows the cache to persist across app restarts, preventing duplicate
   * processing of messages that were seen before the app was closed.
   *
   * @param cache - Map of message ID to timestamp (milliseconds)
   * @throws Error if storage operation fails
   *
   * @example
   * ```typescript
   * const cache = new Map<string, number>();
   * cache.set('msg-123', Date.now());
   * await storage.storeDuplicateCache(cache);
   * ```
   */
  async storeDuplicateCache(cache: Map<string, number>): Promise<void> {
    try {
      // Convert Map to array of entries for JSON serialization
      const cacheArray = Array.from(cache.entries());
      await AsyncStorage.setItem(
        STORAGE_KEY_DUPLICATE_CACHE,
        JSON.stringify(cacheArray),
      );
    } catch (error) {
      console.error('Failed to store duplicate cache:', error);
      throw new Error('Failed to store duplicate cache to persistent storage');
    }
  }

  /**
   * Retrieve duplicate detection cache from persistent storage.
   *
   * The cache is deserialized from JSON array format back to a Map.
   * Returns an empty Map if no cache has been stored yet.
   *
   * @returns Map of message ID to timestamp, or empty Map if not found
   * @throws Error if stored data is corrupted or cannot be parsed
   *
   * @example
   * ```typescript
   * const cache = await storage.getDuplicateCache();
   * if (cache.has('msg-123')) {
   *   console.log('Message already processed');
   * }
   * ```
   */
  async getDuplicateCache(): Promise<Map<string, number>> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_DUPLICATE_CACHE);

      if (!stored) {
        return new Map<string, number>();
      }

      // Convert array of entries back to Map
      const cacheArray: [string, number][] = JSON.parse(stored);
      return new Map<string, number>(cacheArray);
    } catch (error) {
      console.error('Failed to retrieve duplicate cache:', error);
      throw new Error(
        'Failed to retrieve duplicate cache from persistent storage',
      );
    }
  }

  /**
   * Store peer trust verification status to persistent storage.
   *
   * Records whether a peer has been verified via QR fingerprint scanning.
   * This status persists across app restarts.
   *
   * @param peerId - Unique identifier of the peer
   * @param verified - True if peer is verified, false otherwise
   * @throws Error if storage operation fails
   *
   * @example
   * ```typescript
   * await storage.storeTrustedPeer('peer-456', true);
   * ```
   */
  async storeTrustedPeer(peerId: string, verified: boolean): Promise<void> {
    try {
      const storageKey = `${STORAGE_KEY_TRUSTED_PEER_PREFIX}${peerId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(verified));
    } catch (error) {
      console.error('Failed to store trusted peer status:', error);
      throw new Error(
        'Failed to store trusted peer status to persistent storage',
      );
    }
  }

  /**
   * Check if a peer is verified (trusted) from persistent storage.
   *
   * Returns false if no verification status has been stored for the peer,
   * which is the default state for newly discovered peers.
   *
   * @param peerId - Unique identifier of the peer
   * @returns True if peer is verified, false otherwise
   * @throws Error if stored data is corrupted or cannot be parsed
   *
   * @example
   * ```typescript
   * const isVerified = await storage.isTrustedPeer('peer-456');
   * if (isVerified) {
   *   console.log('Peer is trusted');
   * }
   * ```
   */
  async isTrustedPeer(peerId: string): Promise<boolean> {
    try {
      const storageKey = `${STORAGE_KEY_TRUSTED_PEER_PREFIX}${peerId}`;
      const stored = await AsyncStorage.getItem(storageKey);

      if (!stored) {
        return false; // Default to not verified
      }

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to retrieve trusted peer status:', error);
      throw new Error(
        'Failed to retrieve trusted peer status from persistent storage',
      );
    }
  }

  /**
   * Convert Uint8Array to base64 string for storage.
   *
   * Uses a manual implementation compatible with React Native.
   * Converts bytes to binary string, then uses btoa for base64 encoding.
   *
   * @param data - Uint8Array to convert
   * @returns Base64-encoded string
   * @private
   */
  private uint8ArrayToBase64(data: Uint8Array): string {
    // Convert Uint8Array to binary string
    let binaryString = '';
    for (let i = 0; i < data.length; i++) {
      binaryString += String.fromCharCode(data[i]);
    }
    // Encode binary string to base64
    return btoa(binaryString);
  }

  /**
   * Convert base64 string back to Uint8Array.
   *
   * Uses a manual implementation compatible with React Native.
   * Decodes base64 to binary string, then converts to Uint8Array.
   *
   * @param base64 - Base64-encoded string
   * @returns Uint8Array
   * @private
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    // Decode base64 to binary string
    const binaryString = atob(base64);
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
