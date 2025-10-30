/**
 * Core TypeScript type definitions for the Offline Emergency Mesh Chat application.
 * 
 * This file defines all the primary data models used throughout the application:
 * - Peer: Represents a connected or discovered peer device
 * - Message: Represents a chat message (sent or received)
 * - MessageEnvelope: Wire format for encrypted messages transmitted over BLE
 * - EncryptedMessage: Encrypted payload with cryptographic metadata
 * - AppState: Global application state structure
 * 
 * These types ensure type safety across the application and serve as the contract
 * between different layers (UI, services, storage).
 * 
 * Requirements addressed:
 * - 1.1: Peer discovery and connection tracking
 * - 2.1: End-to-end encryption data structures
 * - 4.2: Message envelope format for BLE transmission
 * - 6.2: Multi-hop relay metadata (TTL, message ID)
 */

/**
 * Represents a peer device in the mesh network.
 * 
 * A peer can be in various states:
 * - Discovered but not connected (connected=false, publicKey=null)
 * - Connected but keys not exchanged (connected=true, publicKey=null)
 * - Fully established (connected=true, publicKey set, sharedSecret derived)
 * - Verified (verified=true after QR fingerprint verification)
 * 
 * @property id - Unique BLE device identifier
 * @property publicKey - X25519 public key (null until key exchange completes)
 * @property sharedSecret - Derived shared secret for encryption (null until key exchange)
 * @property name - Display name derived from public key hash
 * @property connected - Current BLE connection status
 * @property verified - Trust verification status via QR fingerprint
 * @property rssi - Signal strength indicator (negative dBm value)
 * @property lastSeen - Unix timestamp of last activity (ms)
 */
export interface Peer {
  id: string;
  publicKey: Uint8Array | null;
  sharedSecret: Uint8Array | null;
  name: string;
  connected: boolean;
  verified: boolean;
  rssi: number;
  lastSeen: number;
}

/**
 * Represents a chat message in the application.
 * 
 * Messages are stored locally and associated with a specific peer.
 * The 'sent' flag distinguishes outgoing from incoming messages.
 * Status flags (delivered, failed) track transmission state for sent messages.
 * 
 * @property id - Unique message identifier (UUID v4)
 * @property peerId - ID of the peer this message is associated with
 * @property text - Decrypted message content (plaintext)
 * @property timestamp - Unix timestamp when message was created/received (ms)
 * @property sent - True if sent by user, false if received from peer
 * @property delivered - Delivery confirmation status (for sent messages)
 * @property failed - Transmission failure flag (for sent messages)
 */
export interface Message {
  id: string;
  peerId: string;
  text: string;
  timestamp: number;
  sent: boolean;
  delivered: boolean;
  failed: boolean;
}

/**
 * Wire format for messages transmitted over BLE.
 * 
 * The envelope wraps encrypted message data with metadata required for
 * routing, relay, and duplicate detection in the mesh network.
 * 
 * Protocol version 1 format:
 * - Supports multi-hop relay with TTL countdown
 * - Includes sender/recipient IDs for routing
 * - Contains cryptographic nonce and authentication tag
 * - Message ID enables duplicate detection
 * 
 * @property version - Protocol version (currently 1)
 * @property messageId - Unique message identifier for duplicate detection
 * @property senderId - Sender's public key hash (first 16 chars of SHA-256)
 * @property recipientId - Recipient's public key hash or "broadcast"
 * @property timestamp - Unix timestamp when message was created (ms)
 * @property ttl - Time-to-live hop count (decremented on each relay, 0-10)
 * @property encryptedPayload - AES-256-GCM encrypted message data
 * @property nonce - AES-256-GCM nonce (96 bits / 12 bytes)
 * @property tag - AES-256-GCM authentication tag (128 bits / 16 bytes)
 */
export interface MessageEnvelope {
  version: number;
  messageId: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  ttl: number;
  encryptedPayload: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

/**
 * Encrypted message data structure.
 * 
 * Represents the output of AES-256-GCM encryption operation.
 * All three components are required for successful decryption and
 * authentication verification.
 * 
 * @property ciphertext - Encrypted message payload
 * @property nonce - Unique nonce used for this encryption (must never be reused)
 * @property tag - Authentication tag for verifying message integrity
 */
export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

/**
 * Global application state structure.
 * 
 * Managed by React Context, this represents the complete runtime state
 * of the application including:
 * - All discovered and connected peers
 * - Message history for all conversations
 * - Current UI state (selected peer, scanning status)
 * - User's cryptographic identity
 * - Duplicate detection cache
 * 
 * @property peers - Map of peer ID to Peer object
 * @property messages - Map of peer ID to array of messages
 * @property currentPeerId - Currently selected peer for conversation view (null = peer list)
 * @property ownPublicKey - User's X25519 public key (null until initialized)
 * @property duplicateCache - Map of message ID to timestamp for duplicate detection
 * @property bleEnabled - BLE availability status on device
 * @property scanning - Current BLE scanning state
 */
export interface AppState {
  peers: Map<string, Peer>;
  messages: Map<string, Message[]>;
  currentPeerId: string | null;
  ownPublicKey: Uint8Array | null;
  duplicateCache: Map<string, number>;
  bleEnabled: boolean;
  scanning: boolean;
}
