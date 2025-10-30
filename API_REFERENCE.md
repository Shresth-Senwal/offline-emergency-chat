# API Reference - Offline Emergency Mesh Chat

This document provides technical specifications for the Offline Emergency Mesh Chat application, including BLE GATT schema, message envelope format, encryption scheme, and service interfaces.

## Table of Contents

1. [BLE GATT Schema](#ble-gatt-schema)
2. [Message Envelope Format](#message-envelope-format)
3. [Encryption Scheme](#encryption-scheme)
4. [Service Interfaces](#service-interfaces)
5. [Data Models](#data-models)
6. [Constants and Configuration](#constants-and-configuration)
7. [Known Limitations](#known-limitations)

## BLE GATT Schema

### Service UUID

The application uses a custom GATT service for emergency mesh chat communication:

```
Service UUID: 0000FE9F-0000-1000-8000-00805F9B34FB
```

All devices advertise and scan for this service UUID to discover peers.

### Characteristics

#### TX Characteristic (Transmit)

Used for sending messages from client to server.

```
UUID: 0000FEA0-0000-1000-8000-00805F9B34FB
Properties: WRITE, WRITE_WITHOUT_RESPONSE
Permissions: WRITE
Max Length: 512 bytes
```

**Usage**:
- Client writes message envelope to this characteristic
- Uses WRITE_WITHOUT_RESPONSE for low latency
- Server receives notification of write operation

**Data Format**: Binary serialized MessageEnvelope (see [Message Envelope Format](#message-envelope-format))

#### RX Characteristic (Receive)

Used for receiving messages from server to client.

```
UUID: 0000FEA1-0000-1000-8000-00805F9B34FB
Properties: NOTIFY
Permissions: READ
Max Length: 512 bytes
```

**Usage**:
- Client subscribes to notifications on this characteristic
- Server writes message envelope when data is available
- Client receives notification with message data

**Data Format**: Binary serialized MessageEnvelope (see [Message Envelope Format](#message-envelope-format))

### Connection Parameters

```
Connection Interval: 15-30ms (negotiated)
Slave Latency: 0
Supervision Timeout: 2000ms
MTU: 512 bytes (negotiated, minimum 23 bytes)
```

### Discovery and Connection Flow

```
1. Device A starts advertising GATT service (0000FE9F...)
2. Device B scans for service UUID (0000FE9F...)
3. Device B discovers Device A
4. Device B connects to Device A
5. Device B discovers services and characteristics
6. Device B subscribes to RX characteristic notifications
7. Devices exchange public keys for encryption
8. Devices can now send/receive encrypted messages
```

## Message Envelope Format

### Overview

Messages are transmitted as binary-encoded envelopes containing metadata and encrypted payload. The format is optimized for BLE transmission with minimal overhead.

### Binary Structure

```
┌─────────────┬──────┬─────────────────────────────────────────────────┐
│ Field       │ Size │ Description                                     │
├─────────────┼──────┼─────────────────────────────────────────────────┤
│ version     │ 1    │ Protocol version (currently 1)                  │
│ messageId   │ 16   │ UUID v4 as 16 bytes (binary, not string)        │
│ senderId    │ 8    │ Sender public key hash (16 hex chars as bytes)  │
│ recipientId │ 8    │ Recipient public key hash (16 hex chars)        │
│ timestamp   │ 8    │ Unix timestamp in milliseconds (64-bit)         │
│ ttl         │ 1    │ Time-to-live hop count (0-255)                  │
│ nonceLength │ 2    │ Length of nonce in bytes (16-bit)               │
│ nonce       │ var  │ XChaCha20 nonce (typically 24 bytes)            │
│ tagLength   │ 2    │ Length of auth tag in bytes (16-bit)            │
│ tag         │ var  │ Poly1305 authentication tag (typically 16 bytes)│
│ payloadLen  │ 4    │ Length of encrypted payload (32-bit)            │
│ payload     │ var  │ Encrypted message data                          │
└─────────────┴──────┴─────────────────────────────────────────────────┘
```

**Total Size**: 50 bytes (fixed header) + nonce + tag + payload

**Typical Size**: 50 + 24 + 16 + payload = 90 bytes + payload

### Field Descriptions

#### version (1 byte)

Protocol version number. Current version is `1`.

- **Type**: uint8
- **Range**: 0-255
- **Current Value**: 1

#### messageId (16 bytes)

Unique message identifier (UUID v4) stored as 16 raw bytes.

- **Type**: UUID v4 (binary)
- **Format**: 16 bytes (not hyphenated string)
- **Example**: `550e8400-e29b-41d4-a716-446655440000` → 16 bytes
- **Purpose**: Duplicate detection, message tracking

#### senderId (8 bytes)

First 16 hexadecimal characters of sender's public key SHA-512 hash, stored as 8 bytes.

- **Type**: Binary (8 bytes from 16 hex chars)
- **Derivation**: `SHA512(publicKey).substring(0, 16)` → 8 bytes
- **Example**: `a1b2c3d4e5f6g7h8` → 8 bytes
- **Purpose**: Identify sender for decryption key lookup

#### recipientId (8 bytes)

First 16 hexadecimal characters of recipient's public key SHA-512 hash, stored as 8 bytes.

- **Type**: Binary (8 bytes from 16 hex chars)
- **Derivation**: `SHA512(publicKey).substring(0, 16)` → 8 bytes
- **Example**: `9i0j1k2l3m4n5o6p` → 8 bytes
- **Purpose**: Identify intended recipient

#### timestamp (8 bytes)

Unix timestamp in milliseconds when message was created.

- **Type**: uint64 (big-endian)
- **Range**: 0 to 2^64-1
- **Example**: `1698765432000` (milliseconds since epoch)
- **Purpose**: Message ordering, expiration

#### ttl (1 byte)

Time-to-live hop count. Decrements by 1 at each relay. Message is not relayed when TTL reaches 0.

- **Type**: uint8
- **Range**: 0-255
- **Initial Value**: 10
- **Purpose**: Limit message propagation, prevent infinite loops

#### nonceLength (2 bytes)

Length of the nonce field in bytes.

- **Type**: uint16 (big-endian)
- **Range**: 0-1024
- **Typical Value**: 24 (XChaCha20 nonce size)
- **Purpose**: Variable-length nonce support

#### nonce (variable)

Cryptographic nonce used for encryption. Must be unique for each message.

- **Type**: Binary data
- **Length**: Specified by nonceLength (typically 24 bytes)
- **Generation**: Random bytes from secure RNG
- **Purpose**: Ensure encryption uniqueness, prevent replay attacks

#### tagLength (2 bytes)

Length of the authentication tag in bytes.

- **Type**: uint16 (big-endian)
- **Range**: 0-1024
- **Typical Value**: 16 (Poly1305 tag size)
- **Purpose**: Variable-length tag support

#### tag (variable)

Authentication tag for message integrity verification.

- **Type**: Binary data
- **Length**: Specified by tagLength (typically 16 bytes)
- **Generation**: Computed by XChaCha20-Poly1305 encryption
- **Purpose**: Detect tampering, authenticate sender

#### payloadLength (4 bytes)

Length of the encrypted payload in bytes.

- **Type**: uint32 (big-endian)
- **Range**: 0 to 2^32-1
- **Typical Range**: 50-600 bytes (for 500 char messages)
- **Purpose**: Parse variable-length payload

#### payload (variable)

Encrypted message data.

- **Type**: Binary data (ciphertext)
- **Length**: Specified by payloadLength
- **Encryption**: XChaCha20-Poly1305
- **Content**: UTF-8 encoded message text (encrypted)

### Serialization Example

**Input**:
```typescript
{
  version: 1,
  messageId: "550e8400-e29b-41d4-a716-446655440000",
  senderId: "a1b2c3d4e5f6g7h8",
  recipientId: "9i0j1k2l3m4n5o6p",
  timestamp: 1698765432000,
  ttl: 10,
  nonce: Uint8Array(24) [random bytes],
  tag: Uint8Array(16) [auth tag],
  encryptedPayload: Uint8Array(50) [ciphertext]
}
```

**Output**: Uint8Array(140) containing binary serialized data

### Deserialization Process

1. Read version (1 byte) and validate
2. Read messageId (16 bytes) and convert to UUID string
3. Read senderId (8 bytes) and convert to hex string
4. Read recipientId (8 bytes) and convert to hex string
5. Read timestamp (8 bytes) as uint64
6. Read ttl (1 byte) as uint8
7. Read nonceLength (2 bytes) as uint16
8. Read nonce (nonceLength bytes)
9. Read tagLength (2 bytes) as uint16
10. Read tag (tagLength bytes)
11. Read payloadLength (4 bytes) as uint32
12. Read payload (payloadLength bytes)
13. Validate envelope structure
14. Return MessageEnvelope object

## Encryption Scheme

### Overview

The application uses **XChaCha20-Poly1305** authenticated encryption, which provides:
- **Confidentiality**: Message content is encrypted
- **Authenticity**: Message integrity is verified
- **Forward Secrecy**: Compromise of long-term keys doesn't compromise past messages

XChaCha20-Poly1305 is equivalent to AES-256-GCM in security but with better nonce misuse resistance.

### Key Exchange

#### Algorithm: X25519 (Curve25519 Diffie-Hellman)

**Key Generation**:
```
1. Generate random 32-byte private key
2. Compute public key = X25519(privateKey, basepoint)
3. Store private key securely (AsyncStorage)
4. Share public key with peers
```

**Shared Secret Derivation**:
```
sharedSecret = X25519(myPrivateKey, peerPublicKey)
```

Both parties compute the same 32-byte shared secret.

**Properties**:
- **Key Size**: 32 bytes (256 bits)
- **Security Level**: ~128 bits (equivalent to AES-256)
- **Forward Secrecy**: Yes (if keys are rotated)

### Message Encryption

#### Algorithm: XChaCha20-Poly1305

**Encryption Process**:
```
1. Generate random 24-byte nonce
2. Convert plaintext to UTF-8 bytes
3. Encrypt: ciphertext || tag = XChaCha20-Poly1305-Encrypt(
     key: sharedSecret,
     nonce: nonce,
     plaintext: plaintextBytes,
     additionalData: null
   )
4. Return { ciphertext, nonce, tag }
```

**Parameters**:
- **Key**: 32 bytes (shared secret from X25519)
- **Nonce**: 24 bytes (random, unique per message)
- **Tag**: 16 bytes (authentication tag)
- **Additional Data**: None (null)

**Security Properties**:
- **Confidentiality**: XChaCha20 stream cipher
- **Authenticity**: Poly1305 MAC
- **Nonce Size**: 192 bits (safe for random generation)
- **Tag Size**: 128 bits (strong authentication)

### Message Decryption

**Decryption Process**:
```
1. Reconstruct ciphertext || tag
2. Decrypt: plaintext = XChaCha20-Poly1305-Decrypt(
     key: sharedSecret,
     nonce: nonce,
     ciphertext: ciphertext || tag,
     additionalData: null
   )
3. If tag verification fails, return null (tampering detected)
4. Convert plaintext bytes to UTF-8 string
5. Return plaintext
```

**Error Handling**:
- **Invalid Tag**: Decryption fails, message discarded
- **Wrong Key**: Decryption fails, message discarded
- **Corrupted Data**: Decryption fails, message discarded

### Trust Verification

#### Fingerprint Generation

**Algorithm**: SHA-512 hash of public key

```
1. Compute hash = SHA512(publicKey)
2. Convert hash to hexadecimal string
3. Take first 32 hex characters
4. Display as QR code
```

**Fingerprint Format**:
- **Length**: 32 hexadecimal characters
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Collision Resistance**: ~128 bits

#### Verification Process

```
1. User A displays fingerprint as QR code
2. User B scans QR code
3. User B computes fingerprint of User A's public key
4. Compare scanned fingerprint with computed fingerprint
5. If match: Trust verified
6. If mismatch: Possible MITM attack, warn user
```

## Service Interfaces

### BLEService

Manages Bluetooth Low Energy operations.

```typescript
interface BLEService {
  // Initialize BLE manager and request permissions
  initialize(): Promise<void>;
  
  // Start advertising GATT service
  startAdvertising(): Promise<void>;
  
  // Start scanning for peers (runs every 5 seconds)
  startScanning(): void;
  
  // Stop active scan
  stopScanning(): void;
  
  // Connect to discovered peer
  connectToPeer(deviceId: string): Promise<void>;
  
  // Disconnect from peer
  disconnectFromPeer(deviceId: string): Promise<void>;
  
  // Send binary data to peer via TX characteristic
  sendData(deviceId: string, data: Uint8Array): Promise<void>;
  
  // Register callback for device discovery
  onDeviceDiscovered(callback: (device: Device) => void): void;
  
  // Register callback for received data (RX characteristic)
  onDataReceived(callback: (deviceId: string, data: Uint8Array) => void): void;
  
  // Register callback for connection state changes
  onConnectionStateChange(callback: (deviceId: string, connected: boolean) => void): void;
}

interface Device {
  id: string;           // BLE device ID
  name: string | null;  // Device name (may be null)
  rssi: number;         // Signal strength (dBm)
}
```

### CryptoService

Handles cryptographic operations.

```typescript
interface CryptoService {
  // Initialize libsodium and load/generate key pair
  initialize(): Promise<void>;
  
  // Get user's public key
  getPublicKey(): Uint8Array;
  
  // Perform X25519 key exchange with peer
  performKeyExchange(peerPublicKey: Uint8Array): Uint8Array;
  
  // Encrypt message with shared secret
  encryptMessage(plaintext: string, sharedSecret: Uint8Array): EncryptedMessage;
  
  // Decrypt message with shared secret
  decryptMessage(encrypted: EncryptedMessage, sharedSecret: Uint8Array): string | null;
  
  // Generate SHA-512 fingerprint of public key
  generateTrustFingerprint(publicKey: Uint8Array): string;
  
  // Verify scanned fingerprint matches public key
  verifyFingerprint(scannedFingerprint: string, peerPublicKey: Uint8Array): boolean;
}

interface EncryptedMessage {
  ciphertext: Uint8Array;  // Encrypted data
  nonce: Uint8Array;       // 24-byte nonce
  tag: Uint8Array;         // 16-byte auth tag
}
```

### MessageService

Manages message handling and relay logic.

```typescript
interface MessageService {
  // Send message to recipient
  sendMessage(recipientId: string, text: string): Promise<void>;
  
  // Handle incoming message from peer
  handleIncomingMessage(senderId: string, envelope: MessageEnvelope): Promise<void>;
  
  // Relay message to other peers (if TTL > 0)
  relayMessage(envelope: MessageEnvelope, excludePeerId: string): Promise<void>;
  
  // Check if message ID is duplicate
  isDuplicate(messageId: string): boolean;
  
  // Mark message ID as processed
  markAsProcessed(messageId: string): void;
}

interface MessageEnvelope {
  version: number;              // Protocol version (1)
  messageId: string;            // UUID v4
  senderId: string;             // Sender's public key hash (16 hex chars)
  recipientId: string;          // Recipient's public key hash
  timestamp: number;            // Unix timestamp (ms)
  ttl: number;                  // Remaining hops (0-255)
  encryptedPayload: Uint8Array; // Encrypted message
  nonce: Uint8Array;            // Encryption nonce
  tag: Uint8Array;              // Authentication tag
}
```

### StorageService

Provides persistent storage.

```typescript
interface StorageService {
  // Store X25519 key pair
  storeKeyPair(publicKey: Uint8Array, privateKey: Uint8Array): Promise<void>;
  
  // Retrieve stored key pair
  getKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array } | null>;
  
  // Store message in history
  storeMessage(message: StoredMessage): Promise<void>;
  
  // Retrieve messages for peer
  getMessages(peerId: string): Promise<StoredMessage[]>;
  
  // Store duplicate detection cache
  storeDuplicateCache(cache: Map<string, number>): Promise<void>;
  
  // Retrieve duplicate detection cache
  getDuplicateCache(): Promise<Map<string, number>>;
  
  // Store peer trust verification status
  storeTrustedPeer(peerId: string, verified: boolean): Promise<void>;
  
  // Check if peer is trusted
  isTrustedPeer(peerId: string): Promise<boolean>;
}

interface StoredMessage {
  id: string;          // Message ID
  peerId: string;      // Associated peer
  text: string;        // Decrypted text
  timestamp: number;   // Unix timestamp
  sent: boolean;       // True if sent by user
  delivered: boolean;  // Delivery status
}
```

## Data Models

### Peer

```typescript
interface Peer {
  id: string;                    // BLE device ID
  publicKey: Uint8Array | null;  // X25519 public key (after exchange)
  sharedSecret: Uint8Array | null; // Derived shared secret
  name: string;                  // Display name (from public key hash)
  connected: boolean;            // Connection status
  verified: boolean;             // Trust verification status
  rssi: number;                  // Signal strength (dBm)
  lastSeen: number;              // Timestamp of last activity
}
```

### Message

```typescript
interface Message {
  id: string;          // UUID v4
  peerId: string;      // Associated peer ID
  text: string;        // Decrypted message text
  timestamp: number;   // Unix timestamp (ms)
  sent: boolean;       // True if sent by user, false if received
  delivered: boolean;  // Delivery status (for sent messages)
  failed: boolean;     // Transmission failure flag
}
```

### AppState

```typescript
interface AppState {
  peers: Map<string, Peer>;              // All peers (connected and discovered)
  messages: Map<string, Message[]>;      // Messages grouped by peer ID
  currentPeerId: string | null;          // Currently selected peer
  ownPublicKey: Uint8Array | null;       // User's public key
  duplicateCache: Map<string, number>;   // Message ID → timestamp
  bleEnabled: boolean;                   // BLE availability
  scanning: boolean;                     // Scanning state
}
```

## Constants and Configuration

### BLE Configuration

```typescript
// GATT Service and Characteristics
BLE_SERVICE_UUID = '0000FE9F-0000-1000-8000-00805F9B34FB'
BLE_TX_CHARACTERISTIC_UUID = '0000FEA0-0000-1000-8000-00805F9B34FB'
BLE_RX_CHARACTERISTIC_UUID = '0000FEA1-0000-1000-8000-00805F9B34FB'

// Timing
SCAN_INTERVAL_MS = 5000           // Scan every 5 seconds
CONNECTION_TIMEOUT_MS = 3000      // 3 second connection timeout
RECONNECT_DELAY_MS = 2000         // 2 second delay before reconnect
```

### Message Configuration

```typescript
MAX_MESSAGE_LENGTH = 500          // Maximum characters per message
INITIAL_MESSAGE_TTL = 10          // Initial hop count
MAX_RELAY_LATENCY_MS = 500        // Target relay latency
```

### Cache Configuration

```typescript
CACHE_EXPIRATION_MS = 300000      // 5 minutes
MAX_CACHE_ENTRIES = 1000          // Maximum cache size
```

### Crypto Configuration

```typescript
FINGERPRINT_LENGTH = 32           // Hex characters in fingerprint
MESSAGE_ENVELOPE_VERSION = 1      // Current protocol version
```

### Storage Keys

```typescript
STORAGE_KEY_KEYPAIR = '@emergency_chat:keypair'
STORAGE_KEY_MESSAGES_PREFIX = '@emergency_chat:messages:'
STORAGE_KEY_DUPLICATE_CACHE = '@emergency_chat:duplicate_cache'
STORAGE_KEY_TRUSTED_PEER_PREFIX = '@emergency_chat:trusted:'
```

## Known Limitations

### Platform Limitations

1. **Foreground Only**
   - App must be in foreground to maintain BLE connections
   - iOS and Android restrict background BLE operations
   - Connections drop when app is backgrounded

2. **Connection Limit**
   - iOS: Maximum 7 concurrent BLE connections
   - Android: Varies by device (typically 4-7)
   - Affects mesh network size

3. **BLE Range**
   - Direct range: ~10-30 meters (environment dependent)
   - Obstacles reduce range significantly
   - Metal, water, and walls block signals

### Protocol Limitations

4. **Hop Limit**
   - Maximum 10 hops (TTL=10)
   - Effective range: ~100-300 meters with relay
   - Messages expire after 10 hops

5. **Message Size**
   - Maximum 500 characters per message
   - No fragmentation support in MVP
   - Larger messages require multiple sends

6. **No Message History Sync**
   - Each device maintains local history only
   - No synchronization between devices
   - Reinstalling app loses history

### Security Limitations

7. **No Key Rotation**
   - Keys generated once on first launch
   - No automatic key rotation
   - Compromise requires app reinstall

8. **Manual Trust Verification**
   - Requires out-of-band QR code scanning
   - No automatic trust establishment
   - Vulnerable to MITM without verification

9. **No Forward Secrecy (per-message)**
   - Shared secret used for all messages with peer
   - Compromise of shared secret compromises all messages
   - Future: Implement ratcheting for per-message keys

### Functional Limitations

10. **No Group Chat**
    - Peer-to-peer only in MVP
    - No broadcast or multicast support
    - Future enhancement

11. **No File Sharing**
    - Text messages only
    - No images, audio, or files
    - Future enhancement

12. **No Message Acknowledgments**
    - No delivery confirmation from recipient
    - No read receipts
    - Status shows sent, not delivered

13. **No Message Editing/Deletion**
    - Messages cannot be edited after sending
    - Messages cannot be deleted from peer's device
    - Local deletion only

## Performance Characteristics

### Latency

- **Direct message**: 50-200ms
- **1-hop relay**: 200-500ms
- **10-hop relay**: 2-5 seconds
- **Connection establishment**: 1-3 seconds

### Throughput

- **BLE MTU**: 512 bytes (negotiated)
- **Message overhead**: ~90 bytes (envelope + crypto)
- **Effective payload**: ~400 bytes per message
- **Messages per second**: 2-5 (limited by BLE)

### Battery Impact

- **Continuous scanning**: ~5-10% per hour
- **Connected idle**: ~2-5% per hour
- **Active messaging**: ~10-15% per hour
- **Recommendation**: Close app when not needed

## Version History

### Version 1.0 (Current)

- Initial MVP implementation
- X25519 key exchange
- XChaCha20-Poly1305 encryption
- Multi-hop mesh relay (TTL=10)
- QR code trust verification
- iOS and Android support
- Foreground operation only

### Future Versions (Planned)

- Version 1.1: Background operation support
- Version 1.2: Group messaging
- Version 1.3: File sharing
- Version 2.0: Ratcheting for forward secrecy
