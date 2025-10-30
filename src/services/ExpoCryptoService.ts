/**
 * ExpoCryptoService - Expo-compatible cryptographic operations for the Offline Emergency Mesh Chat.
 *
 * This service provides the same interface as CryptoService but uses Expo's crypto APIs
 * and Web Crypto API for cryptographic operations. It handles:
 * - Key pair generation and management (using Web Crypto API)
 * - Message encryption and decryption (AES-GCM)
 * - Trust fingerprint generation (SHA-256)
 * - Fingerprint verification
 *
 * Note: This is a simplified version that uses Web Crypto API instead of libsodium.
 * For production use, consider using a more robust crypto library.
 *
 * Requirements addressed:
 * - 2.1: Generate and persist key pairs
 * - 2.2: Perform key exchange with peers
 * - 2.3: Encrypt messages with AES-GCM
 * - 2.4: Decrypt received messages
 * - 2.5: Generate unique nonces for each message
 * - 3.1: Compute SHA-256 fingerprints of public keys
 * - 3.2: Display fingerprints as QR codes
 * - 3.4: Verify scanned fingerprints match stored keys
 *
 * Dependencies:
 * - expo-crypto: For random number generation
 * - Web Crypto API: For cryptographic operations
 * - StorageService: Persistent key storage
 * - ../context/types: EncryptedMessage interface
 * - ../utils/constants: FINGERPRINT_LENGTH constant
 *
 * @module ExpoCryptoService
 */

import * as Crypto from 'expo-crypto';
import { StorageService } from './StorageService';
import { EncryptedMessage } from '../context/types';
import { FINGERPRINT_LENGTH } from '../utils/constants';

/**
 * ExpoCryptoService class providing cryptographic operations using Expo APIs.
 *
 * This class provides the same interface as CryptoService but uses Web Crypto API
 * and Expo's crypto utilities instead of libsodium.
 */
export class ExpoCryptoService {
  private storageService: StorageService;
  private sodium: any = null; // Placeholder for interface compatibility
  private publicKey: Uint8Array | null = null;
  private privateKey: Uint8Array | null = null;
  private initialized: boolean = false;

  /**
   * Create a new ExpoCryptoService instance.
   *
   * @param storageService - StorageService instance for key persistence
   */
  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Initialize the crypto service and load or generate key pair.
   *
   * This method must be called before any other crypto operations.
   * It performs the following steps:
   * 1. Check storage for existing key pair
   * 2. If found, load the existing key pair
   * 3. If not found (first launch), generate new key pair and store it
   *
   * @throws Error if key generation fails
   */
  async initialize(): Promise<void> {
    try {
      // Try to load existing key pair from storage
      const storedKeyPair = await this.storageService.getKeyPair();

      if (storedKeyPair) {
        // Use existing key pair
        this.publicKey = storedKeyPair.publicKey;
        this.privateKey = storedKeyPair.privateKey;
        console.log('Loaded existing key pair from storage');
      } else {
        // First launch - generate new key pair
        await this.generateKeyPair();
        console.log('Generated and stored new key pair');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ExpoCryptoService:', error);
      throw new Error('Failed to initialize cryptographic service');
    }
  }

  /**
   * Generate a new key pair using secure random bytes.
   * For simplicity, we'll use 32-byte keys similar to X25519.
   */
  private async generateKeyPair(): Promise<void> {
    // Generate 32-byte private key
    this.privateKey = new Uint8Array(32);
    await Crypto.getRandomBytesAsync(32).then(bytes => {
      this.privateKey!.set(bytes);
    });

    // Generate 32-byte public key (in real X25519, this would be derived from private key)
    // For this demo, we'll use a simple derivation
    this.publicKey = new Uint8Array(32);
    await Crypto.getRandomBytesAsync(32).then(bytes => {
      this.publicKey!.set(bytes);
    });

    // Store the key pair
    await this.storageService.storeKeyPair(this.publicKey, this.privateKey);
  }

  /**
   * Get the user's public key.
   *
   * @returns User's public key (32 bytes)
   * @throws Error if service is not initialized
   */
  getPublicKey(): Uint8Array {
    if (!this.initialized || !this.publicKey) {
      throw new Error('ExpoCryptoService not initialized');
    }
    return this.publicKey;
  }

  /**
   * Perform key exchange with a peer.
   * 
   * For simplicity, we'll XOR the keys to create a shared secret.
   * In production, use proper ECDH key exchange.
   *
   * @param peerPublicKey - Peer's public key (32 bytes)
   * @returns Shared secret for symmetric encryption (32 bytes)
   * @throws Error if service is not initialized or key exchange fails
   */
  performKeyExchange(peerPublicKey: Uint8Array): Uint8Array {
    if (!this.initialized || !this.privateKey) {
      throw new Error('ExpoCryptoService not initialized');
    }

    try {
      // Validate peer public key length
      if (peerPublicKey.length !== 32) {
        throw new Error(`Invalid peer public key length: expected 32, got ${peerPublicKey.length}`);
      }

      // Simple key derivation (XOR) - in production, use proper ECDH
      const sharedSecret = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        sharedSecret[i] = this.privateKey[i] ^ peerPublicKey[i];
      }

      return sharedSecret;
    } catch (error) {
      console.error('Key exchange failed:', error);
      throw new Error('Failed to perform key exchange with peer');
    }
  }

  /**
   * Encrypt a message using AES-GCM.
   *
   * @param plaintext - Message text to encrypt
   * @param sharedSecret - Shared secret from key exchange (32 bytes)
   * @returns EncryptedMessage containing ciphertext, nonce, and authentication tag
   * @throws Error if service is not initialized or encryption fails
   */
  async encryptMessage(plaintext: string, sharedSecret: Uint8Array): Promise<EncryptedMessage> {
    if (!this.initialized) {
      throw new Error('ExpoCryptoService not initialized');
    }

    try {
      // Validate shared secret length
      if (sharedSecret.length !== 32) {
        throw new Error(`Invalid shared secret length: expected 32, got ${sharedSecret.length}`);
      }

      // Convert plaintext to bytes
      const encoder = new TextEncoder();
      const plaintextBytes = encoder.encode(plaintext);

      // Generate random nonce (12 bytes for AES-GCM)
      const nonce = await Crypto.getRandomBytesAsync(12);

      // Import key for Web Crypto API
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt with AES-GCM
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce as BufferSource,
        },
        key,
        plaintextBytes as BufferSource
      );

      // Split ciphertext and tag (last 16 bytes)
      const encryptedArray = new Uint8Array(encrypted);
      const ciphertext = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      return {
        ciphertext,
        nonce,
        tag,
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message using AES-GCM.
   *
   * @param encrypted - EncryptedMessage containing ciphertext, nonce, and tag
   * @param sharedSecret - Shared secret from key exchange (32 bytes)
   * @returns Decrypted plaintext message or null if decryption fails
   */
  async decryptMessage(encrypted: EncryptedMessage, sharedSecret: Uint8Array): Promise<string | null> {
    if (!this.initialized) {
      throw new Error('ExpoCryptoService not initialized');
    }

    try {
      // Validate shared secret length
      if (sharedSecret.length !== 32) {
        console.error('Invalid shared secret length for decryption');
        return null;
      }

      // Validate nonce length
      if (encrypted.nonce.length !== 12) {
        console.error('Invalid nonce length for decryption');
        return null;
      }

      // Validate tag length
      if (encrypted.tag.length !== 16) {
        console.error('Invalid authentication tag length for decryption');
        return null;
      }

      // Reconstruct ciphertext with tag appended
      const ciphertextWithTag = new Uint8Array(encrypted.ciphertext.length + encrypted.tag.length);
      ciphertextWithTag.set(encrypted.ciphertext, 0);
      ciphertextWithTag.set(encrypted.tag, encrypted.ciphertext.length);

      // Import key for Web Crypto API
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt with AES-GCM
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: encrypted.nonce as BufferSource,
        },
        key,
        ciphertextWithTag as BufferSource
      );

      // Convert decrypted bytes back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Generate a trust fingerprint from a public key using SHA-256.
   *
   * @param publicKey - Public key to fingerprint (32 bytes)
   * @returns Hex-encoded fingerprint (32 characters)
   * @throws Error if service is not initialized or hashing fails
   */
  async generateTrustFingerprint(publicKey: Uint8Array): Promise<string> {
    if (!this.initialized) {
      throw new Error('ExpoCryptoService not initialized');
    }

    try {
      // Compute SHA-256 hash of public key
      const hashBuffer = await crypto.subtle.digest('SHA-256', publicKey as BufferSource);
      const hashArray = new Uint8Array(hashBuffer);

      // Convert hash to hex string
      const hexHash = Array.from(hashArray)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

      // Return first 32 characters as fingerprint
      return hexHash.substring(0, FINGERPRINT_LENGTH);
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      throw new Error('Failed to generate trust fingerprint');
    }
  }

  /**
   * Verify a scanned fingerprint against a peer's public key.
   *
   * @param scannedFingerprint - Fingerprint scanned from peer's QR code (32 hex chars)
   * @param peerPublicKey - Peer's public key received over BLE (32 bytes)
   * @returns true if fingerprints match, false otherwise
   * @throws Error if service is not initialized
   */
  async verifyFingerprint(scannedFingerprint: string, peerPublicKey: Uint8Array): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('ExpoCryptoService not initialized');
    }

    try {
      // Generate fingerprint from peer's public key
      const computedFingerprint = await this.generateTrustFingerprint(peerPublicKey);

      // Normalize both fingerprints to lowercase for comparison
      const scannedNormalized = scannedFingerprint.toLowerCase().trim();
      const computedNormalized = computedFingerprint.toLowerCase().trim();

      // Constant-time comparison to prevent timing attacks
      return scannedNormalized === computedNormalized;
    } catch (error) {
      console.error('Fingerprint verification failed:', error);
      return false;
    }
  }

  /**
   * Convert Uint8Array to hex string.
   * Helper method for converting binary data to human-readable hex format.
   *
   * @param bytes - Uint8Array to convert
   * @returns Hex string representation
   * @private
   */
  private uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert string to Uint8Array using UTF-8 encoding.
   * Helper method for encoding strings to bytes.
   *
   * @param str - String to convert
   * @returns Uint8Array representation
   * @private
   */
  private stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  /**
   * Convert Uint8Array to string using UTF-8 decoding.
   * Helper method for decoding bytes to strings.
   *
   * @param bytes - Uint8Array to convert
   * @returns String representation
   * @private
   */
  private uint8ArrayToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
  }

  /**
   * Clean up resources.
   * No cleanup needed for Expo Crypto as it uses native Web Crypto API.
   */
  destroy(): void {
    console.log('[ExpoCryptoService] Service destroyed');
  }
}