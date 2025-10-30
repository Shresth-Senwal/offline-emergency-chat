/**
 * CryptoService unit tests
 *
 * Tests core cryptographic operations including:
 * - Key pair generation and initialization
 * - Key exchange (Diffie-Hellman)
 * - Encryption and decryption
 * - Fingerprint generation and verification
 *
 * @format
 */

import { CryptoService } from '../src/services/CryptoService';
import { StorageService } from '../src/services/StorageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('CryptoService', () => {
  let cryptoService: CryptoService;
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
    cryptoService = new CryptoService(storageService);
  });

  test('initializes successfully and generates key pair', async () => {
    await cryptoService.initialize();
    const publicKey = cryptoService.getPublicKey();

    expect(publicKey).toBeDefined();
    expect(publicKey.length).toBe(32); // X25519 public key is 32 bytes
  });

  test('performs key exchange and derives shared secret', async () => {
    // Initialize two crypto services (simulating two peers)
    const crypto1 = new CryptoService(storageService);
    const crypto2 = new CryptoService(storageService);

    await crypto1.initialize();
    await crypto2.initialize();

    const publicKey1 = crypto1.getPublicKey();
    const publicKey2 = crypto2.getPublicKey();

    // Perform key exchange
    const sharedSecret1 = crypto1.performKeyExchange(publicKey2);
    const sharedSecret2 = crypto2.performKeyExchange(publicKey1);

    // Both should derive the same shared secret
    expect(sharedSecret1).toBeDefined();
    expect(sharedSecret2).toBeDefined();
    expect(sharedSecret1.length).toBe(32);
    expect(sharedSecret2.length).toBe(32);
    expect(sharedSecret1).toEqual(sharedSecret2);
  });

  test('encrypts and decrypts message successfully', async () => {
    const crypto1 = new CryptoService(storageService);
    const crypto2 = new CryptoService(storageService);

    await crypto1.initialize();
    await crypto2.initialize();

    const publicKey1 = crypto1.getPublicKey();
    const publicKey2 = crypto2.getPublicKey();

    const sharedSecret1 = crypto1.performKeyExchange(publicKey2);
    const sharedSecret2 = crypto2.performKeyExchange(publicKey1);

    const originalMessage = 'Hello, this is a test message!';

    // Encrypt with crypto1
    const encrypted = crypto1.encryptMessage(originalMessage, sharedSecret1);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.nonce.length).toBe(24); // XChaCha20 nonce is 24 bytes
    expect(encrypted.tag.length).toBe(16); // Poly1305 tag is 16 bytes

    // Decrypt with crypto2
    const decrypted = crypto2.decryptMessage(encrypted, sharedSecret2);

    expect(decrypted).toBe(originalMessage);
  });

  test('decryption fails with wrong shared secret', async () => {
    const crypto1 = new CryptoService(storageService);
    const crypto2 = new CryptoService(storageService);
    const crypto3 = new CryptoService(storageService);

    await crypto1.initialize();
    await crypto2.initialize();
    await crypto3.initialize();

    const publicKey2 = crypto2.getPublicKey();
    const publicKey3 = crypto3.getPublicKey();

    const sharedSecret12 = crypto1.performKeyExchange(publicKey2);
    const sharedSecret13 = crypto1.performKeyExchange(publicKey3);

    const originalMessage = 'Secret message';

    // Encrypt with shared secret between 1 and 2
    const encrypted = crypto1.encryptMessage(originalMessage, sharedSecret12);

    // Try to decrypt with wrong shared secret (1 and 3)
    const decrypted = crypto1.decryptMessage(encrypted, sharedSecret13);

    expect(decrypted).toBeNull(); // Should fail
  });

  test('generates consistent fingerprint for same public key', async () => {
    await cryptoService.initialize();
    const publicKey = cryptoService.getPublicKey();

    const fingerprint1 = cryptoService.generateTrustFingerprint(publicKey);
    const fingerprint2 = cryptoService.generateTrustFingerprint(publicKey);

    expect(fingerprint1).toBe(fingerprint2);
    expect(fingerprint1.length).toBe(32); // 32 hex characters
    expect(/^[0-9a-f]{32}$/.test(fingerprint1)).toBe(true); // Valid hex
  });

  test('verifies matching fingerprints', async () => {
    await cryptoService.initialize();
    const publicKey = cryptoService.getPublicKey();

    const fingerprint = cryptoService.generateTrustFingerprint(publicKey);
    const isValid = cryptoService.verifyFingerprint(fingerprint, publicKey);

    expect(isValid).toBe(true);
  });

  test('rejects non-matching fingerprints', async () => {
    const crypto1 = new CryptoService(storageService);
    const crypto2 = new CryptoService(storageService);

    await crypto1.initialize();
    await crypto2.initialize();

    const publicKey1 = crypto1.getPublicKey();
    const publicKey2 = crypto2.getPublicKey();

    const fingerprint1 = crypto1.generateTrustFingerprint(publicKey1);

    // Try to verify fingerprint1 against publicKey2 (should fail)
    const isValid = crypto1.verifyFingerprint(fingerprint1, publicKey2);

    expect(isValid).toBe(false);
  });

  test('encrypts different messages with unique nonces', async () => {
    await cryptoService.initialize();
    const publicKey = cryptoService.getPublicKey();
    const sharedSecret = cryptoService.performKeyExchange(publicKey);

    const message = 'Same message';

    const encrypted1 = cryptoService.encryptMessage(message, sharedSecret);
    const encrypted2 = cryptoService.encryptMessage(message, sharedSecret);

    // Nonces should be different
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    // Ciphertexts should be different due to different nonces
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
});
