/**
 * Mock implementation of react-native-libsodium for testing.
 * 
 * This mock provides simplified implementations of libsodium cryptographic
 * functions for unit testing purposes. The implementations use basic
 * JavaScript operations to simulate the behavior of the real library
 * without requiring native code.
 * 
 * Note: These are NOT cryptographically secure implementations and should
 * ONLY be used for testing purposes.
 */

// Store key pairs to enable proper DH key exchange simulation
const keyPairRegistry = new Map<string, Uint8Array>();

// Simple XOR-based mock encryption (NOT secure, only for testing)
function mockEncrypt(plaintext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(plaintext.length + 16); // +16 for tag
  
  // XOR plaintext with key (cycling through key bytes)
  for (let i = 0; i < plaintext.length; i++) {
    result[i] = plaintext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }
  
  // Add mock authentication tag (last 16 bytes)
  for (let i = 0; i < 16; i++) {
    result[plaintext.length + i] = key[i % key.length] ^ nonce[i % nonce.length];
  }
  
  return result;
}

// Simple XOR-based mock decryption (NOT secure, only for testing)
function mockDecrypt(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
  const dataLength = ciphertext.length - 16; // Remove tag length
  const result = new Uint8Array(dataLength);
  
  // Verify mock tag
  for (let i = 0; i < 16; i++) {
    const expectedTag = key[i % key.length] ^ nonce[i % nonce.length];
    if (ciphertext[dataLength + i] !== expectedTag) {
      throw new Error('Authentication tag verification failed');
    }
  }
  
  // XOR ciphertext with key (cycling through key bytes)
  for (let i = 0; i < dataLength; i++) {
    result[i] = ciphertext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }
  
  return result;
}

// Simple hash function (NOT secure, only for testing)
function mockHash(data: Uint8Array): Uint8Array {
  const hash = new Uint8Array(64); // SHA-512 produces 64 bytes
  
  // Simple hash: sum bytes with position weighting
  for (let i = 0; i < data.length; i++) {
    const pos = i % 64;
    hash[pos] = (hash[pos] + data[i] * (i + 1)) % 256;
  }
  
  return hash;
}

// Helper to create a key from public key bytes (for registry lookup)
function publicKeyToString(publicKey: Uint8Array): string {
  return Array.from(publicKey).join(',');
}

// Mock libsodium module
const mockSodium = {
  ready: Promise.resolve(),
  
  // Key generation constants
  crypto_box_PUBLICKEYBYTES: 32,
  crypto_box_SECRETKEYBYTES: 32,
  crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24,
  crypto_aead_xchacha20poly1305_ietf_ABYTES: 16,
  
  // Generate a key pair
  crypto_box_keypair: () => {
    const publicKey = new Uint8Array(32);
    const privateKey = new Uint8Array(32);
    
    // Generate deterministic but unique keys based on timestamp
    const seed = Date.now() + Math.random() * 1000000;
    for (let i = 0; i < 32; i++) {
      publicKey[i] = Math.floor((seed * (i + 1)) % 256);
      privateKey[i] = Math.floor((seed * (i + 1) * 2) % 256);
    }
    
    // Store the key pair in registry for DH simulation
    const pubKeyStr = publicKeyToString(publicKey);
    keyPairRegistry.set(pubKeyStr, privateKey);
    
    return { publicKey, privateKey };
  },
  
  // Perform scalar multiplication (Diffie-Hellman)
  // In real DH: sharedSecret = privateKeyA * publicKeyB = privateKeyB * publicKeyA
  // Mock: We simulate this by combining both keys in a commutative way
  crypto_scalarmult: (privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array => {
    const sharedSecret = new Uint8Array(32);
    
    // To ensure commutativity (same result regardless of order), we need to:
    // 1. Get the private key associated with the public key (if available)
    // 2. Combine both private keys in a commutative way
    
    const pubKeyStr = publicKeyToString(publicKey);
    const otherPrivateKey = keyPairRegistry.get(pubKeyStr);
    
    if (otherPrivateKey) {
      // We have both private keys, combine them commutatively
      // Use addition (mod 256) which is commutative
      for (let i = 0; i < 32; i++) {
        sharedSecret[i] = (privateKey[i] + otherPrivateKey[i]) % 256;
      }
    } else {
      // Fallback: just combine the keys we have
      // This won't be perfectly commutative but works for basic tests
      for (let i = 0; i < 32; i++) {
        sharedSecret[i] = (privateKey[i] + publicKey[i]) % 256;
      }
    }
    
    return sharedSecret;
  },
  
  // Encrypt with authenticated encryption
  crypto_aead_xchacha20poly1305_ietf_encrypt: (
    plaintext: Uint8Array,
    additionalData: Uint8Array | null,
    secretNonce: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array => {
    return mockEncrypt(plaintext, publicNonce, key);
  },
  
  // Decrypt with authenticated encryption
  crypto_aead_xchacha20poly1305_ietf_decrypt: (
    secretNonce: Uint8Array | null,
    ciphertext: Uint8Array,
    additionalData: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array,
  ): Uint8Array => {
    return mockDecrypt(ciphertext, publicNonce, key);
  },
  
  // Generate random bytes
  randombytes_buf: (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  },
  
  // Hash function (SHA-512)
  crypto_hash: (data: Uint8Array): Uint8Array => {
    return mockHash(data);
  },
};

export default mockSodium;
