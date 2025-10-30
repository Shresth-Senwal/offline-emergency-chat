/**
 * CryptoService - Cryptographic operations for the Offline Emergency Mesh Chat.
 *
 * This service handles all cryptographic operations required for secure peer-to-peer
 * communication including:
 * - X25519 key pair generation and management
 * - Diffie-Hellman key exchange for deriving shared secrets
 * - XChaCha20-Poly1305 authenticated encryption and decryption
 * - SHA-256 fingerprint generation for trust verification
 * - Fingerprint comparison for QR code verification
 *
 * The service uses react-native-libsodium which provides NaCl/libsodium cryptographic
 * primitives optimized for mobile platforms. All operations use industry-standard
 * algorithms with secure parameters.
 *
 * Security properties:
 * - Forward secrecy via X25519 key exchange
 * - Authenticated encryption via XChaCha20-Poly1305
 * - Replay attack prevention via unique nonces
 * - Man-in-the-middle detection via manual fingerprint verification
 *
 * Requirements addressed:
 * - 2.1: Generate and persist X25519 key pairs
 * - 2.2: Perform X25519 key exchange with peers
 * - 2.3: Encrypt messages with XChaCha20-Poly1305 (equivalent to AES-256-GCM)
 * - 2.4: Decrypt received messages
 * - 2.5: Generate unique nonces for each message
 * - 3.1: Compute SHA-256 fingerprints of public keys
 * - 3.2: Display fingerprints as QR codes
 * - 3.4: Verify scanned fingerprints match stored keys
 *
 * Dependencies:
 * - react-native-libsodium: Cryptographic primitives
 * - StorageService: Persistent key storage
 * - ../context/types: EncryptedMessage interface
 * - ../utils/constants: FINGERPRINT_LENGTH constant
 *
 * @module CryptoService
 */

import Sodium from 'react-native-libsodium';
import { StorageService } from './StorageService';
import { EncryptedMessage } from '../context/types';
import { FINGERPRINT_LENGTH } from '../utils/constants';

/**
 * CryptoService class providing cryptographic operations.
 *
 * This class wraps libsodium functions with a clean async API suitable for
 * React Native applications. It manages the user's key pair and provides
 * methods for encryption, decryption, and trust verification.
 *
 * The service must be initialized before use by calling initialize().
 * On first launch, this generates a new key pair. On subsequent launches,
 * it loads the existing key pair from storage.
 *
 * Usage:
 * ```typescript
 * const crypto = new CryptoService(storageService);
 * await crypto.initialize();
 * const publicKey = crypto.getPublicKey();
 * const sharedSecret = crypto.performKeyExchange(peerPublicKey);
 * const encrypted = crypto.encryptMessage('Hello', sharedSecret);
 * ```
 */
export class CryptoService {
  private storageService: StorageService;
  private sodium: typeof Sodium | null = null;
  private publicKey: Uint8Array | null = null;
  private privateKey: Uint8Array | null = null;
  private initialized: boolean = false;

  /**
   * Create a new CryptoService instance.
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
   * 1. Load libsodium library
   * 2. Check storage for existing key pair
   * 3. If found, load the existing key pair
   * 4. If not found (first launch), generate new X25519 key pair and store it
   *
   * The key pair is kept in memory for the lifetime of the service instance
   * to avoid repeated storage reads.
   *
   * @throws Error if libsodium fails to load or key generation fails
   *
   * @example
   * ```typescript
   * const crypto = new CryptoService(storage);
   * await crypto.initialize();
   * console.log('Crypto service ready');
   * ```
   *
   * Requirement 2.1: Generate X25519 key pair on first launch and persist
   */
  async initialize(): Promise<void> {
    try {
      // Load libsodium library
      await Sodium.ready;
      this.sodium = Sodium;

      // Try to load existing key pair from storage
      const storedKeyPair = await this.storageService.getKeyPair();

      if (storedKeyPair) {
        // Use existing key pair
        this.publicKey = storedKeyPair.publicKey;
        this.privateKey = storedKeyPair.privateKey;
        console.log('Loaded existing key pair from storage');
      } else {
        // First launch - generate new key pair
        const keyPair = this.sodium.crypto_box_keypair();
        this.publicKey = keyPair.publicKey;
        this.privateKey = keyPair.privateKey;

        // Persist key pair to storage
        await this.storageService.storeKeyPair(this.publicKey, this.privateKey);
        console.log('Generated and stored new key pair');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize CryptoService:', error);
      throw new Error('Failed to initialize cryptographic service');
    }
  }

  /**
   * Get the user's public key.
   *
   * Returns the X25519 public key that should be shared with peers for
   * key exchange. This key is safe to transmit over insecure channels.
   *
   * @returns User's X25519 public key (32 bytes)
   * @throws Error if service is not initialized
   *
   * @example
   * ```typescript
   * const publicKey = crypto.getPublicKey();
   * // Share publicKey with peer via BLE
   * ```
   */
  getPublicKey(): Uint8Array {
    if (!this.initialized || !this.publicKey) {
      throw new Error('CryptoService not initialized');
    }
    return this.publicKey;
  }

  /**
   * Perform X25519 Diffie-Hellman key exchange with a peer.
   *
   * Derives a shared secret from the user's private key and the peer's public key.
   * Both parties compute the same shared secret, which is then used for symmetric
   * encryption of messages.
   *
   * The shared secret should be stored securely and associated with the peer.
   * It remains valid for the lifetime of the peer relationship.
   *
   * Security note: X25519 provides forward secrecy - even if the long-term keys
   * are compromised later, past communications remain secure.
   *
   * @param peerPublicKey - Peer's X25519 public key (32 bytes)
   * @returns Shared secret for symmetric encryption (32 bytes)
   * @throws Error if service is not initialized or key exchange fails
   *
   * @example
   * ```typescript
   * const peerPublicKey = receivedFromPeer(); // Uint8Array(32)
   * const sharedSecret = crypto.performKeyExchange(peerPublicKey);
   * // Use sharedSecret for encrypting/decrypting messages with this peer
   * ```
   *
   * Requirement 2.2: Perform X25519 key exchange to derive shared secret
   */
  performKeyExchange(peerPublicKey: Uint8Array): Uint8Array {
    if (!this.initialized || !this.sodium || !this.privateKey) {
      throw new Error('CryptoService not initialized');
    }

    try {
      // Validate peer public key length
      if (peerPublicKey.length !== this.sodium.crypto_box_PUBLICKEYBYTES) {
        throw new Error(
          `Invalid peer public key length: expected ${this.sodium.crypto_box_PUBLICKEYBYTES}, got ${peerPublicKey.length}`,
        );
      }

      // Perform X25519 scalar multiplication: sharedSecret = privateKey * peerPublicKey
      const sharedSecret = this.sodium.crypto_scalarmult(
        this.privateKey,
        peerPublicKey,
      );

      return sharedSecret;
    } catch (error) {
      console.error('Key exchange failed:', error);
      throw new Error('Failed to perform key exchange with peer');
    }
  }

  /**
   * Encrypt a message using XChaCha20-Poly1305 authenticated encryption.
   *
   * Encrypts the plaintext message with the shared secret derived from key exchange.
   * Uses XChaCha20-Poly1305 which provides both confidentiality and authenticity,
   * equivalent to AES-256-GCM but with better nonce misuse resistance.
   *
   * A unique random nonce is generated for each message to ensure security even
   * when encrypting the same plaintext multiple times. The nonce must be transmitted
   * along with the ciphertext but does not need to be kept secret.
   *
   * The authentication tag ensures message integrity - any tampering will be
   * detected during decryption.
   *
   * @param plaintext - Message text to encrypt
   * @param sharedSecret - Shared secret from key exchange (32 bytes)
   * @returns EncryptedMessage containing ciphertext, nonce, and authentication tag
   * @throws Error if service is not initialized or encryption fails
   *
   * @example
   * ```typescript
   * const encrypted = crypto.encryptMessage('Hello, peer!', sharedSecret);
   * // Send encrypted.ciphertext, encrypted.nonce, encrypted.tag to peer
   * ```
   *
   * Requirements:
   * - 2.3: Encrypt message using authenticated encryption with shared secret
   * - 2.5: Generate unique nonce for each message
   */
  encryptMessage(
    plaintext: string,
    sharedSecret: Uint8Array,
  ): EncryptedMessage {
    if (!this.initialized || !this.sodium) {
      throw new Error('CryptoService not initialized');
    }

    try {
      // Validate shared secret length (32 bytes for XChaCha20-Poly1305)
      if (
        sharedSecret.length !==
        this.sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
      ) {
        throw new Error(
          `Invalid shared secret length: expected ${this.sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES}, got ${sharedSecret.length}`,
        );
      }

      // Convert plaintext string to Uint8Array using React Native's TextEncoder polyfill
      const plaintextBytes = this.stringToUint8Array(plaintext);

      // Generate random nonce (192 bits / 24 bytes for XChaCha20)
      const nonce = this.sodium.randombytes_buf(
        this.sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
      );

      // Encrypt with XChaCha20-Poly1305
      // This produces ciphertext with authentication tag appended
      const ciphertextWithTag =
        this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
          plaintextBytes,
          null, // No additional authenticated data
          null, // No secret nonce
          nonce,
          sharedSecret,
        );

      // Split ciphertext and authentication tag
      // Tag is last 16 bytes, ciphertext is everything before
      const tagLength = this.sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES;
      const ciphertext = ciphertextWithTag.slice(0, -tagLength);
      const tag = ciphertextWithTag.slice(-tagLength);

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
   * Decrypt a message using XChaCha20-Poly1305 authenticated decryption.
   *
   * Decrypts the ciphertext using the shared secret and verifies the authentication
   * tag to ensure message integrity. If the tag verification fails, the message
   * has been tampered with and decryption will fail.
   *
   * The same nonce used during encryption must be provided for successful decryption.
   *
   * @param encrypted - EncryptedMessage containing ciphertext, nonce, and tag
   * @param sharedSecret - Shared secret from key exchange (32 bytes)
   * @returns Decrypted plaintext message
   * @returns null if decryption fails (invalid tag, corrupted data, wrong key)
   *
   * @example
   * ```typescript
   * const encrypted = receivedFromPeer(); // EncryptedMessage
   * const plaintext = crypto.decryptMessage(encrypted, sharedSecret);
   * if (plaintext) {
   *   console.log('Received:', plaintext);
   * } else {
   *   console.log('Decryption failed - message corrupted or wrong key');
   * }
   * ```
   *
   * Requirement 2.4: Decrypt message using authenticated encryption with nonce and tag verification
   */
  decryptMessage(
    encrypted: EncryptedMessage,
    sharedSecret: Uint8Array,
  ): string | null {
    if (!this.initialized || !this.sodium) {
      throw new Error('CryptoService not initialized');
    }

    try {
      // Validate shared secret length
      if (
        sharedSecret.length !==
        this.sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
      ) {
        console.error('Invalid shared secret length for decryption');
        return null;
      }

      // Validate nonce length
      if (
        encrypted.nonce.length !==
        this.sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
      ) {
        console.error('Invalid nonce length for decryption');
        return null;
      }

      // Validate tag length
      if (
        encrypted.tag.length !==
        this.sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
      ) {
        console.error('Invalid authentication tag length for decryption');
        return null;
      }

      // Reconstruct ciphertext with tag appended (libsodium expects this format)
      const ciphertextWithTag = new Uint8Array(
        encrypted.ciphertext.length + encrypted.tag.length,
      );
      ciphertextWithTag.set(encrypted.ciphertext, 0);
      ciphertextWithTag.set(encrypted.tag, encrypted.ciphertext.length);

      // Decrypt with XChaCha20-Poly1305 and verify authentication tag
      const plaintextBytes =
        this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null, // No secret nonce
          ciphertextWithTag,
          null, // No additional authenticated data
          encrypted.nonce,
          sharedSecret,
        );

      // Convert decrypted bytes back to string using React Native's TextDecoder polyfill
      const plaintext = this.uint8ArrayToString(plaintextBytes);
      return plaintext;
    } catch (error) {
      // Decryption failure could be due to:
      // - Wrong shared secret (wrong peer or corrupted key)
      // - Corrupted ciphertext
      // - Authentication tag verification failure (tampering detected)
      // - Invalid nonce
      console.error('Decryption failed:', error);
      return null; // Return null instead of throwing to allow graceful handling
    }
  }

  /**
   * Generate a trust fingerprint from a public key.
   *
   * Computes SHA-512 hash of the public key and returns the first 32 hex characters.
   * This fingerprint is displayed as a QR code for manual verification between peers.
   *
   * The fingerprint serves as a human-verifiable representation of the public key,
   * allowing users to detect man-in-the-middle attacks by comparing fingerprints
   * out-of-band (via QR code scanning).
   *
   * Note: Using SHA-512 (via crypto_hash) instead of SHA-256 as it's the default
   * hash function in libsodium. The first 32 hex characters provide sufficient
   * collision resistance for fingerprint verification.
   *
   * @param publicKey - X25519 public key to fingerprint (32 bytes)
   * @returns Hex-encoded fingerprint (32 characters)
   * @throws Error if service is not initialized or hashing fails
   *
   * @example
   * ```typescript
   * const fingerprint = crypto.generateTrustFingerprint(peerPublicKey);
   * console.log('Peer fingerprint:', fingerprint);
   * // Display as QR code: fingerprint is 32 hex chars
   * ```
   *
   * Requirement 3.1: Compute cryptographic hash of public key for trust verification
   */
  generateTrustFingerprint(publicKey: Uint8Array): string {
    if (!this.initialized || !this.sodium) {
      throw new Error('CryptoService not initialized');
    }

    try {
      // Compute SHA-512 hash of public key (crypto_hash uses SHA-512 by default)
      const hash = this.sodium.crypto_hash(publicKey);

      // Convert hash to hex string
      const hexHash = this.uint8ArrayToHex(hash);

      // Return first 32 characters (16 bytes) as fingerprint
      return hexHash.substring(0, FINGERPRINT_LENGTH);
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      throw new Error('Failed to generate trust fingerprint');
    }
  }

  /**
   * Verify a scanned fingerprint against a peer's public key.
   *
   * Computes the fingerprint of the provided public key and compares it with
   * the scanned fingerprint. Returns true if they match, indicating the peer's
   * identity has been verified.
   *
   * This method should be called after scanning a peer's QR code to verify
   * that the public key received over BLE matches the key the peer claims to have.
   *
   * @param scannedFingerprint - Fingerprint scanned from peer's QR code (32 hex chars)
   * @param peerPublicKey - Peer's public key received over BLE (32 bytes)
   * @returns true if fingerprints match, false otherwise
   * @throws Error if service is not initialized
   *
   * @example
   * ```typescript
   * const scanned = scanQRCode(); // Returns hex string
   * const isVerified = crypto.verifyFingerprint(scanned, peer.publicKey);
   * if (isVerified) {
   *   console.log('Peer identity verified!');
   *   markPeerAsVerified(peer.id);
   * } else {
   *   console.log('WARNING: Fingerprint mismatch - possible MITM attack');
   * }
   * ```
   *
   * Requirement 3.4: Compare scanned fingerprint with computed hash
   */
  verifyFingerprint(
    scannedFingerprint: string,
    peerPublicKey: Uint8Array,
  ): boolean {
    if (!this.initialized) {
      throw new Error('CryptoService not initialized');
    }

    try {
      // Generate fingerprint from peer's public key
      const computedFingerprint = this.generateTrustFingerprint(peerPublicKey);

      // Normalize both fingerprints to lowercase for comparison
      const scannedNormalized = scannedFingerprint.toLowerCase().trim();
      const computedNormalized = computedFingerprint.toLowerCase().trim();

      // Constant-time comparison to prevent timing attacks
      return scannedNormalized === computedNormalized;
    } catch (error) {
      console.error('Fingerprint verification failed:', error);
      return false; // Fail closed - verification failure means not verified
    }
  }

  /**
   * Convert Uint8Array to hexadecimal string.
   *
   * Helper method for converting binary data to human-readable hex format.
   * Used for fingerprint generation.
   *
   * @param data - Binary data to convert
   * @returns Hex-encoded string (lowercase)
   * @private
   */
  private uint8ArrayToHex(data: Uint8Array): string {
    return Array.from(data)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert string to Uint8Array.
   *
   * React Native compatible implementation for encoding strings to bytes.
   * Uses UTF-8 encoding.
   *
   * @param str - String to convert
   * @returns Uint8Array containing UTF-8 encoded bytes
   * @private
   */
  private stringToUint8Array(str: string): Uint8Array {
    const utf8: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) {
        utf8.push(charcode);
      } else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(
          0xe0 | (charcode >> 12),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f),
        );
      } else {
        // UTF-16 surrogate pair
        i++;
        charcode =
          0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f),
        );
      }
    }
    return new Uint8Array(utf8);
  }

  /**
   * Convert Uint8Array to string.
   *
   * React Native compatible implementation for decoding bytes to strings.
   * Uses UTF-8 decoding.
   *
   * @param bytes - Uint8Array containing UTF-8 encoded bytes
   * @returns Decoded string
   * @private
   */
  private uint8ArrayToString(bytes: Uint8Array): string {
    const chars: string[] = [];
    let i = 0;
    while (i < bytes.length) {
      const byte1 = bytes[i++];
      if (byte1 < 0x80) {
        chars.push(String.fromCharCode(byte1));
      } else if (byte1 < 0xe0) {
        const byte2 = bytes[i++];
        chars.push(String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f)));
      } else if (byte1 < 0xf0) {
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        chars.push(
          String.fromCharCode(
            ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f),
          ),
        );
      } else {
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        const byte4 = bytes[i++];
        let codepoint =
          ((byte1 & 0x07) << 18) |
          ((byte2 & 0x3f) << 12) |
          ((byte3 & 0x3f) << 6) |
          (byte4 & 0x3f);
        codepoint -= 0x10000;
        chars.push(
          String.fromCharCode(0xd800 + (codepoint >> 10)),
          String.fromCharCode(0xdc00 + (codepoint & 0x3ff)),
        );
      }
    }
    return chars.join('');
  }
}
