/**
 * Message Envelope Utilities for BLE Transmission
 * 
 * This module provides functions for creating, serializing, deserializing, and validating
 * message envelopes used in the mesh network. The envelope format is optimized for
 * BLE transmission with a compact binary representation.
 * 
 * Binary Format Specification:
 * ┌─────────────┬──────┬─────────────────────────────────────────────────┐
 * │ Field       │ Size │ Description                                     │
 * ├─────────────┼──────┼─────────────────────────────────────────────────┤
 * │ version     │ 1    │ Protocol version (currently 1)                  │
 * │ messageId   │ 16   │ UUID v4 as 16 bytes (binary, not string)        │
 * │ senderId    │ 16   │ Sender public key hash (16 hex chars as bytes)  │
 * │ recipientId │ 16   │ Recipient public key hash (16 hex chars)        │
 * │ timestamp   │ 8    │ Unix timestamp in milliseconds (64-bit)         │
 * │ ttl         │ 1    │ Time-to-live hop count (0-255)                  │
 * │ nonceLength │ 2    │ Length of nonce in bytes (16-bit)               │
 * │ nonce       │ var  │ AES-GCM nonce (typically 12 bytes)              │
 * │ tagLength   │ 2    │ Length of auth tag in bytes (16-bit)            │
 * │ tag         │ var  │ AES-GCM authentication tag (typically 16 bytes) │
 * │ payloadLen  │ 4    │ Length of encrypted payload (32-bit)            │
 * │ payload     │ var  │ Encrypted message data                          │
 * └─────────────┴──────┴─────────────────────────────────────────────────┘
 * 
 * Total header size: 66 bytes (fixed) + variable crypto data + payload
 * 
 * Requirements addressed:
 * - 4.2: Message envelope structure with metadata
 * - 5.1: Envelope validation for integrity checking
 * - 6.1: Message ID for duplicate detection
 * - 6.2: TTL field for multi-hop relay control
 * 
 * Dependencies:
 * - types.ts: MessageEnvelope and EncryptedMessage interfaces
 * - constants.ts: MESSAGE_ENVELOPE_VERSION
 */

import { MessageEnvelope, EncryptedMessage } from '../context/types';
import { MESSAGE_ENVELOPE_VERSION } from './constants';

/**
 * Error thrown when envelope serialization or deserialization fails.
 */
export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

/**
 * Creates a message envelope from encrypted message data and metadata.
 * 
 * This function constructs a complete MessageEnvelope object ready for
 * serialization and BLE transmission. It combines the encrypted payload
 * with routing and relay metadata.
 * 
 * @param encrypted - Encrypted message data (ciphertext, nonce, tag)
 * @param messageId - Unique message identifier (UUID v4 string)
 * @param senderId - Sender's public key hash (first 16 hex characters)
 * @param recipientId - Recipient's public key hash or "broadcast"
 * @param timestamp - Unix timestamp in milliseconds when message was created
 * @param ttl - Time-to-live hop count (0-255, typically starts at 10)
 * @returns Complete MessageEnvelope object
 * 
 * @throws {EnvelopeError} If any parameter is invalid or missing
 * 
 * @example
 * ```typescript
 * const encrypted = cryptoService.encryptMessage("Hello", sharedSecret);
 * const envelope = createEnvelope(
 *   encrypted,
 *   "550e8400-e29b-41d4-a716-446655440000",
 *   "a1b2c3d4e5f6g7h8",
 *   "9i0j1k2l3m4n5o6p",
 *   Date.now(),
 *   10
 * );
 * ```
 */
export function createEnvelope(
  encrypted: EncryptedMessage,
  messageId: string,
  senderId: string,
  recipientId: string,
  timestamp: number,
  ttl: number
): MessageEnvelope {
  // Validate inputs
  if (!encrypted || !encrypted.ciphertext || !encrypted.nonce || !encrypted.tag) {
    throw new EnvelopeError('Invalid encrypted message: missing required fields');
  }
  
  if (!messageId || messageId.length === 0) {
    throw new EnvelopeError('Invalid messageId: must be non-empty string');
  }
  
  if (!senderId || senderId.length !== 16) {
    throw new EnvelopeError('Invalid senderId: must be 16 hex characters');
  }
  
  if (!recipientId || recipientId.length !== 16) {
    throw new EnvelopeError('Invalid recipientId: must be 16 hex characters');
  }
  
  if (timestamp <= 0 || !Number.isFinite(timestamp)) {
    throw new EnvelopeError('Invalid timestamp: must be positive finite number');
  }
  
  if (ttl < 0 || ttl > 255 || !Number.isInteger(ttl)) {
    throw new EnvelopeError('Invalid TTL: must be integer between 0 and 255');
  }

  return {
    version: MESSAGE_ENVELOPE_VERSION,
    messageId,
    senderId,
    recipientId,
    timestamp,
    ttl,
    encryptedPayload: encrypted.ciphertext,
    nonce: encrypted.nonce,
    tag: encrypted.tag,
  };
}

/**
 * Serializes a MessageEnvelope to binary format for BLE transmission.
 * 
 * Converts the envelope object into a compact Uint8Array suitable for
 * transmission over BLE GATT characteristics. The binary format is
 * designed to minimize overhead while maintaining all necessary metadata.
 * 
 * Binary layout:
 * - Fixed-size header fields (version, IDs, timestamp, TTL)
 * - Variable-size crypto fields (nonce, tag) with length prefixes
 * - Variable-size payload with length prefix
 * 
 * @param envelope - MessageEnvelope object to serialize
 * @returns Uint8Array containing serialized binary data
 * 
 * @throws {EnvelopeError} If envelope is invalid or serialization fails
 * 
 * @example
 * ```typescript
 * const envelope = createEnvelope(...);
 * const binary = serializeEnvelope(envelope);
 * await bleService.sendData(peerId, binary);
 * ```
 */
export function serializeEnvelope(envelope: MessageEnvelope): Uint8Array {
  // Validate envelope before serialization
  validateEnvelope(envelope);
  
  try {
    // Convert UUID string to 16 bytes
    // UUID format: "550e8400-e29b-41d4-a716-446655440000"
    // Remove hyphens and convert hex pairs to bytes
    const messageIdHex = envelope.messageId.replace(/-/g, '');
    if (messageIdHex.length !== 32) {
      throw new EnvelopeError('Invalid messageId format: must be valid UUID');
    }
    const messageIdBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      messageIdBytes[i] = parseInt(messageIdHex.substr(i * 2, 2), 16);
    }
    
    // Convert sender ID (16 hex chars) to 8 bytes
    if (envelope.senderId.length !== 16) {
      throw new EnvelopeError('Invalid senderId: must be 16 hex characters');
    }
    const senderIdBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      senderIdBytes[i] = parseInt(envelope.senderId.substr(i * 2, 2), 16);
    }
    
    // Convert recipient ID (16 hex chars) to 8 bytes
    if (envelope.recipientId.length !== 16) {
      throw new EnvelopeError('Invalid recipientId: must be 16 hex characters');
    }
    const recipientIdBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      recipientIdBytes[i] = parseInt(envelope.recipientId.substr(i * 2, 2), 16);
    }
    
    // Calculate total size
    const totalSize = 
      1 +  // version
      16 + // messageId
      8 +  // senderId (8 bytes from 16 hex chars)
      8 +  // recipientId (8 bytes from 16 hex chars)
      8 +  // timestamp
      1 +  // ttl
      2 +  // nonceLength
      envelope.nonce.length +
      2 +  // tagLength
      envelope.tag.length +
      4 +  // payloadLength
      envelope.encryptedPayload.length;
    
    // Create buffer and DataView for writing
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;
    
    // Write version (1 byte)
    view.setUint8(offset, envelope.version);
    offset += 1;
    
    // Write messageId (16 bytes)
    bytes.set(messageIdBytes, offset);
    offset += 16;
    
    // Write senderId (8 bytes)
    bytes.set(senderIdBytes, offset);
    offset += 8;
    
    // Write recipientId (8 bytes)
    bytes.set(recipientIdBytes, offset);
    offset += 8;
    
    // Write timestamp (8 bytes, big-endian)
    view.setBigUint64(offset, BigInt(envelope.timestamp), false);
    offset += 8;
    
    // Write TTL (1 byte)
    view.setUint8(offset, envelope.ttl);
    offset += 1;
    
    // Write nonce length (2 bytes, big-endian)
    view.setUint16(offset, envelope.nonce.length, false);
    offset += 2;
    
    // Write nonce
    bytes.set(envelope.nonce, offset);
    offset += envelope.nonce.length;
    
    // Write tag length (2 bytes, big-endian)
    view.setUint16(offset, envelope.tag.length, false);
    offset += 2;
    
    // Write tag
    bytes.set(envelope.tag, offset);
    offset += envelope.tag.length;
    
    // Write payload length (4 bytes, big-endian)
    view.setUint32(offset, envelope.encryptedPayload.length, false);
    offset += 4;
    
    // Write payload
    bytes.set(envelope.encryptedPayload, offset);
    offset += envelope.encryptedPayload.length;
    
    return bytes;
  } catch (error) {
    if (error instanceof EnvelopeError) {
      throw error;
    }
    throw new EnvelopeError(`Serialization failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Deserializes binary data back into a MessageEnvelope object.
 * 
 * Parses the binary format received over BLE and reconstructs the
 * MessageEnvelope object. Performs validation to ensure data integrity
 * and detect malformed or corrupted envelopes.
 * 
 * @param data - Uint8Array containing serialized envelope data
 * @returns Deserialized MessageEnvelope object
 * 
 * @throws {EnvelopeError} If data is malformed, corrupted, or invalid
 * 
 * @example
 * ```typescript
 * bleService.onDataReceived((peerId, data) => {
 *   try {
 *     const envelope = deserializeEnvelope(data);
 *     await messageService.handleIncomingMessage(peerId, envelope);
 *   } catch (error) {
 *     console.error('Failed to deserialize envelope:', error);
 *   }
 * });
 * ```
 */
export function deserializeEnvelope(data: Uint8Array): MessageEnvelope {
  if (!data || data.length < 50) {
    throw new EnvelopeError('Invalid data: too short to be valid envelope');
  }
  
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;
    
    // Read version (1 byte)
    const version = view.getUint8(offset);
    offset += 1;
    
    if (version !== MESSAGE_ENVELOPE_VERSION) {
      throw new EnvelopeError(`Unsupported protocol version: ${version}`);
    }
    
    // Read messageId (16 bytes) and convert to UUID string
    const messageIdBytes = data.slice(offset, offset + 16);
    offset += 16;
    const messageIdHex = Array.from(messageIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const messageId = `${messageIdHex.substr(0, 8)}-${messageIdHex.substr(8, 4)}-${messageIdHex.substr(12, 4)}-${messageIdHex.substr(16, 4)}-${messageIdHex.substr(20, 12)}`;
    
    // Read senderId (8 bytes) and convert to 16 hex chars
    const senderIdBytes = data.slice(offset, offset + 8);
    offset += 8;
    const senderId = Array.from(senderIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Read recipientId (8 bytes) and convert to 16 hex chars
    const recipientIdBytes = data.slice(offset, offset + 8);
    offset += 8;
    const recipientId = Array.from(recipientIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Read timestamp (8 bytes, big-endian)
    const timestamp = Number(view.getBigUint64(offset, false));
    offset += 8;
    
    // Read TTL (1 byte)
    const ttl = view.getUint8(offset);
    offset += 1;
    
    // Read nonce length (2 bytes, big-endian)
    const nonceLength = view.getUint16(offset, false);
    offset += 2;
    
    if (nonceLength > 1024) {
      throw new EnvelopeError(`Invalid nonce length: ${nonceLength} (max 1024)`);
    }
    
    if (offset + nonceLength > data.length) {
      throw new EnvelopeError('Malformed envelope: nonce extends beyond data');
    }
    
    // Read nonce
    const nonce = data.slice(offset, offset + nonceLength);
    offset += nonceLength;
    
    // Read tag length (2 bytes, big-endian)
    if (offset + 2 > data.length) {
      throw new EnvelopeError('Malformed envelope: missing tag length');
    }
    const tagLength = view.getUint16(offset, false);
    offset += 2;
    
    if (tagLength > 1024) {
      throw new EnvelopeError(`Invalid tag length: ${tagLength} (max 1024)`);
    }
    
    if (offset + tagLength > data.length) {
      throw new EnvelopeError('Malformed envelope: tag extends beyond data');
    }
    
    // Read tag
    const tag = data.slice(offset, offset + tagLength);
    offset += tagLength;
    
    // Read payload length (4 bytes, big-endian)
    if (offset + 4 > data.length) {
      throw new EnvelopeError('Malformed envelope: missing payload length');
    }
    const payloadLength = view.getUint32(offset, false);
    offset += 4;
    
    if (payloadLength > 10 * 1024 * 1024) {
      throw new EnvelopeError(`Invalid payload length: ${payloadLength} (max 10MB)`);
    }
    
    if (offset + payloadLength !== data.length) {
      throw new EnvelopeError(`Malformed envelope: payload length mismatch (expected ${payloadLength}, got ${data.length - offset})`);
    }
    
    // Read payload
    const encryptedPayload = data.slice(offset, offset + payloadLength);
    offset += payloadLength;
    
    const envelope: MessageEnvelope = {
      version,
      messageId,
      senderId,
      recipientId,
      timestamp,
      ttl,
      encryptedPayload,
      nonce,
      tag,
    };
    
    // Validate the deserialized envelope
    validateEnvelope(envelope);
    
    return envelope;
  } catch (error) {
    if (error instanceof EnvelopeError) {
      throw error;
    }
    throw new EnvelopeError(`Deserialization failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Validates the structure and integrity of a MessageEnvelope.
 * 
 * Checks that all required fields are present and have valid values.
 * This function is called during both serialization and deserialization
 * to ensure data integrity.
 * 
 * Validation rules:
 * - Version must be 1 (current protocol version)
 * - TTL must be >= 0 and <= 255
 * - All required fields must be present and non-null
 * - IDs must have correct format and length
 * - Timestamp must be positive
 * - Crypto fields (nonce, tag, payload) must be non-empty
 * 
 * @param envelope - MessageEnvelope to validate
 * @returns true if envelope is valid
 * 
 * @throws {EnvelopeError} If envelope is invalid with specific error message
 * 
 * @example
 * ```typescript
 * try {
 *   validateEnvelope(envelope);
 *   // Envelope is valid, proceed with processing
 * } catch (error) {
 *   console.error('Invalid envelope:', error.message);
 * }
 * ```
 */
export function validateEnvelope(envelope: MessageEnvelope): boolean {
  // Check version
  if (envelope.version !== MESSAGE_ENVELOPE_VERSION) {
    throw new EnvelopeError(`Invalid version: expected ${MESSAGE_ENVELOPE_VERSION}, got ${envelope.version}`);
  }
  
  // Check TTL
  if (envelope.ttl < 0 || envelope.ttl > 255 || !Number.isInteger(envelope.ttl)) {
    throw new EnvelopeError(`Invalid TTL: must be integer between 0 and 255, got ${envelope.ttl}`);
  }
  
  // Check required fields are present
  if (!envelope.messageId || typeof envelope.messageId !== 'string') {
    throw new EnvelopeError('Missing or invalid messageId');
  }
  
  if (!envelope.senderId || typeof envelope.senderId !== 'string') {
    throw new EnvelopeError('Missing or invalid senderId');
  }
  
  if (!envelope.recipientId || typeof envelope.recipientId !== 'string') {
    throw new EnvelopeError('Missing or invalid recipientId');
  }
  
  if (!envelope.timestamp || envelope.timestamp <= 0 || !Number.isFinite(envelope.timestamp)) {
    throw new EnvelopeError('Missing or invalid timestamp');
  }
  
  // Check crypto fields
  if (!envelope.nonce || envelope.nonce.length === 0) {
    throw new EnvelopeError('Missing or empty nonce');
  }
  
  if (!envelope.tag || envelope.tag.length === 0) {
    throw new EnvelopeError('Missing or empty tag');
  }
  
  if (!envelope.encryptedPayload || envelope.encryptedPayload.length === 0) {
    throw new EnvelopeError('Missing or empty encrypted payload');
  }
  
  return true;
}
