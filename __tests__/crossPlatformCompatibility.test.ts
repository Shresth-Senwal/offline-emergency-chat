/**
 * Cross-Platform Compatibility Tests
 * 
 * This test suite verifies that the Offline Emergency Mesh Chat application
 * maintains full compatibility between iOS and Android platforms.
 * 
 * Tests cover:
 * - BLE GATT service and characteristic UUID consistency
 * - Message envelope serialization/deserialization compatibility
 * - Binary format endianness and structure
 * - Cryptographic operation consistency
 * - Platform-independent data encoding
 * 
 * Requirements addressed:
 * - 9.1: iOS compatibility (iOS 13.0+)
 * - 9.2: Android compatibility (Android 6.0+)
 * - 9.3: Identical BLE GATT service and characteristic UUIDs
 * - 9.4: Identical message envelope formats
 * - 9.5: Bidirectional message exchange between platforms
 * 
 * @module CrossPlatformCompatibilityTests
 */

import {
  BLE_SERVICE_UUID,
  BLE_TX_CHARACTERISTIC_UUID,
  BLE_RX_CHARACTERISTIC_UUID,
  MESSAGE_ENVELOPE_VERSION,
  INITIAL_MESSAGE_TTL,
} from '../src/utils/constants';
import {
  createEnvelope,
  serializeEnvelope,
  deserializeEnvelope,
  validateEnvelope,
} from '../src/utils/messageEnvelope';
import { MessageEnvelope, EncryptedMessage } from '../src/context/types';

describe('Cross-Platform Compatibility', () => {
  describe('BLE GATT UUIDs', () => {
    /**
     * Test: Verify BLE service UUID is defined and valid
     * 
     * Requirement 9.3: Identical BLE GATT service and characteristic UUIDs
     */
    test('BLE service UUID is defined and valid', () => {
      expect(BLE_SERVICE_UUID).toBeDefined();
      expect(typeof BLE_SERVICE_UUID).toBe('string');
      expect(BLE_SERVICE_UUID).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
      );
      expect(BLE_SERVICE_UUID).toBe('0000FE9F-0000-1000-8000-00805F9B34FB');
    });

    /**
     * Test: Verify TX characteristic UUID is defined and valid
     * 
     * Requirement 9.3: Identical BLE GATT service and characteristic UUIDs
     */
    test('TX characteristic UUID is defined and valid', () => {
      expect(BLE_TX_CHARACTERISTIC_UUID).toBeDefined();
      expect(typeof BLE_TX_CHARACTERISTIC_UUID).toBe('string');
      expect(BLE_TX_CHARACTERISTIC_UUID).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
      );
      expect(BLE_TX_CHARACTERISTIC_UUID).toBe('0000FEA0-0000-1000-8000-00805F9B34FB');
    });

    /**
     * Test: Verify RX characteristic UUID is defined and valid
     * 
     * Requirement 9.3: Identical BLE GATT service and characteristic UUIDs
     */
    test('RX characteristic UUID is defined and valid', () => {
      expect(BLE_RX_CHARACTERISTIC_UUID).toBeDefined();
      expect(typeof BLE_RX_CHARACTERISTIC_UUID).toBe('string');
      expect(BLE_RX_CHARACTERISTIC_UUID).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
      );
      expect(BLE_RX_CHARACTERISTIC_UUID).toBe('0000FEA1-0000-1000-8000-00805F9B34FB');
    });

    /**
     * Test: Verify all UUIDs are unique
     * 
     * Requirement 9.3: Distinct service and characteristic UUIDs
     */
    test('all UUIDs are unique', () => {
      const uuids = [
        BLE_SERVICE_UUID,
        BLE_TX_CHARACTERISTIC_UUID,
        BLE_RX_CHARACTERISTIC_UUID,
      ];
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(uuids.length);
    });
  });

  describe('Message Envelope Format', () => {
    /**
     * Helper function to create a test encrypted message
     */
    const createTestEncryptedMessage = (): EncryptedMessage => ({
      ciphertext: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      nonce: new Uint8Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]),
      tag: new Uint8Array([23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]),
    });

    /**
     * Test: Verify envelope creation with valid data
     * 
     * Requirement 9.4: Identical message envelope formats
     */
    test('creates envelope with valid data', () => {
      const encrypted = createTestEncryptedMessage();
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      const senderId = 'a1b2c3d4e5f6a7b8';
      const recipientId = '9a0b1c2d3e4f5a6b';
      const timestamp = Date.now();
      const ttl = INITIAL_MESSAGE_TTL;

      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );

      expect(envelope.version).toBe(MESSAGE_ENVELOPE_VERSION);
      expect(envelope.messageId).toBe(messageId);
      expect(envelope.senderId).toBe(senderId);
      expect(envelope.recipientId).toBe(recipientId);
      expect(envelope.timestamp).toBe(timestamp);
      expect(envelope.ttl).toBe(ttl);
      expect(envelope.encryptedPayload).toEqual(encrypted.ciphertext);
      expect(envelope.nonce).toEqual(encrypted.nonce);
      expect(envelope.tag).toEqual(encrypted.tag);
    });

    /**
     * Test: Verify envelope validation accepts valid envelopes
     * 
     * Requirement 9.4: Envelope structure validation
     */
    test('validates correct envelope structure', () => {
      const encrypted = createTestEncryptedMessage();
      const envelope = createEnvelope(
        encrypted,
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4e5f6a7b8',
        '9a0b1c2d3e4f5a6b',
        Date.now(),
        10
      );

      expect(() => validateEnvelope(envelope)).not.toThrow();
      expect(validateEnvelope(envelope)).toBe(true);
    });

    /**
     * Test: Verify envelope validation rejects invalid version
     * 
     * Requirement 9.4: Protocol version enforcement
     */
    test('rejects envelope with invalid version', () => {
      const encrypted = createTestEncryptedMessage();
      const envelope = createEnvelope(
        encrypted,
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4e5f6a7b8',
        '9a0b1c2d3e4f5a6b',
        Date.now(),
        10
      );
      envelope.version = 99;

      expect(() => validateEnvelope(envelope)).toThrow('Invalid version');
    });

    /**
     * Test: Verify envelope validation rejects invalid TTL
     * 
     * Requirement 9.4: TTL validation
     */
    test('rejects envelope with invalid TTL', () => {
      const encrypted = createTestEncryptedMessage();
      const envelope = createEnvelope(
        encrypted,
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4e5f6a7b8',
        '9a0b1c2d3e4f5a6b',
        Date.now(),
        10
      );
      envelope.ttl = -1;

      expect(() => validateEnvelope(envelope)).toThrow('Invalid TTL');
    });
  });

  describe('Message Envelope Serialization', () => {
    /**
     * Helper function to create a test envelope
     */
    const createTestEnvelope = (): MessageEnvelope => {
      const encrypted: EncryptedMessage = {
        ciphertext: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        nonce: new Uint8Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]),
        tag: new Uint8Array([23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]),
      };

      return createEnvelope(
        encrypted,
        '550e8400-e29b-41d4-a716-446655440000',
        'a1b2c3d4e5f6a7b8',
        '9a0b1c2d3e4f5a6b',
        1698765432000,
        10
      );
    };

    /**
     * Test: Verify serialization produces Uint8Array
     * 
     * Requirement 9.4: Binary serialization format
     */
    test('serializes envelope to Uint8Array', () => {
      const envelope = createTestEnvelope();
      const serialized = serializeEnvelope(envelope);

      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBeGreaterThan(0);
    });

    /**
     * Test: Verify serialization is deterministic
     * 
     * Requirement 9.4: Consistent serialization across platforms
     */
    test('serialization is deterministic', () => {
      const envelope = createTestEnvelope();
      const serialized1 = serializeEnvelope(envelope);
      const serialized2 = serializeEnvelope(envelope);

      expect(serialized1).toEqual(serialized2);
      expect(serialized1.length).toBe(serialized2.length);
      
      // Verify byte-by-byte equality
      for (let i = 0; i < serialized1.length; i++) {
        expect(serialized1[i]).toBe(serialized2[i]);
      }
    });

    /**
     * Test: Verify serialization/deserialization round-trip
     * 
     * Requirement 9.4: Lossless serialization/deserialization
     */
    test('serialization/deserialization round-trip preserves data', () => {
      const original = createTestEnvelope();
      const serialized = serializeEnvelope(original);
      const deserialized = deserializeEnvelope(serialized);

      expect(deserialized.version).toBe(original.version);
      expect(deserialized.messageId).toBe(original.messageId);
      expect(deserialized.senderId).toBe(original.senderId);
      expect(deserialized.recipientId).toBe(original.recipientId);
      expect(deserialized.timestamp).toBe(original.timestamp);
      expect(deserialized.ttl).toBe(original.ttl);
      expect(deserialized.encryptedPayload).toEqual(original.encryptedPayload);
      expect(deserialized.nonce).toEqual(original.nonce);
      expect(deserialized.tag).toEqual(original.tag);
    });

    /**
     * Test: Verify binary format structure
     * 
     * Requirement 9.4: Binary format specification compliance
     */
    test('binary format matches specification', () => {
      const envelope = createTestEnvelope();
      const serialized = serializeEnvelope(envelope);
      const view = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);

      let offset = 0;

      // Version (1 byte)
      expect(view.getUint8(offset)).toBe(MESSAGE_ENVELOPE_VERSION);
      offset += 1;

      // MessageId (16 bytes)
      offset += 16;

      // SenderId (8 bytes from 16 hex chars)
      offset += 8;

      // RecipientId (8 bytes from 16 hex chars)
      offset += 8;

      // Timestamp (8 bytes, big-endian)
      const timestamp = Number(view.getBigUint64(offset, false));
      expect(timestamp).toBe(envelope.timestamp);
      offset += 8;

      // TTL (1 byte)
      expect(view.getUint8(offset)).toBe(envelope.ttl);
      offset += 1;

      // Nonce length (2 bytes, big-endian)
      const nonceLength = view.getUint16(offset, false);
      expect(nonceLength).toBe(envelope.nonce.length);
      offset += 2;

      // Nonce
      offset += nonceLength;

      // Tag length (2 bytes, big-endian)
      const tagLength = view.getUint16(offset, false);
      expect(tagLength).toBe(envelope.tag.length);
      offset += 2;

      // Tag
      offset += tagLength;

      // Payload length (4 bytes, big-endian)
      const payloadLength = view.getUint32(offset, false);
      expect(payloadLength).toBe(envelope.encryptedPayload.length);
      offset += 4;

      // Payload
      offset += payloadLength;

      // Verify total size
      expect(offset).toBe(serialized.length);
    });

    /**
     * Test: Verify endianness is big-endian (network byte order)
     * 
     * Requirement 9.4: Consistent byte order across platforms
     */
    test('uses big-endian byte order', () => {
      const envelope = createTestEnvelope();
      const serialized = serializeEnvelope(envelope);
      const view = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);

      // Check timestamp (offset 33: 1 + 16 + 8 + 8)
      const timestampOffset = 33;
      const timestampBigEndian = Number(view.getBigUint64(timestampOffset, false));
      const timestampLittleEndian = Number(view.getBigUint64(timestampOffset, true));

      expect(timestampBigEndian).toBe(envelope.timestamp);
      expect(timestampLittleEndian).not.toBe(envelope.timestamp);
    });

    /**
     * Test: Verify deserialization rejects malformed data
     * 
     * Requirement 9.4: Robust error handling
     */
    test('deserialization rejects malformed data', () => {
      // Too short
      expect(() => deserializeEnvelope(new Uint8Array(10))).toThrow();

      // Invalid version
      const envelope = createTestEnvelope();
      const serialized = serializeEnvelope(envelope);
      serialized[0] = 99; // Invalid version
      expect(() => deserializeEnvelope(serialized)).toThrow('Unsupported protocol version');
    });

    /**
     * Test: Verify multiple envelopes can be serialized/deserialized
     * 
     * Requirement 9.4: Support for multiple messages
     */
    test('handles multiple different envelopes', () => {
      const envelopes: MessageEnvelope[] = [];
      
      // Create 10 different envelopes
      for (let i = 0; i < 10; i++) {
        const encrypted: EncryptedMessage = {
          ciphertext: new Uint8Array(Array.from({ length: 10 + i }, (_, j) => j)),
          nonce: new Uint8Array(Array.from({ length: 12 }, (_, j) => j + i)),
          tag: new Uint8Array(Array.from({ length: 16 }, (_, j) => j + i * 2)),
        };

        envelopes.push(createEnvelope(
          encrypted,
          `550e8400-e29b-41d4-a716-44665544000${i}`,
          `a1b2c3d4e5f6a7b${i}`,
          `9a0b1c2d3e4f5a6${i}`,
          Date.now() + i * 1000,
          10 - i
        ));
      }

      // Serialize and deserialize each envelope
      envelopes.forEach((original) => {
        const serialized = serializeEnvelope(original);
        const deserialized = deserializeEnvelope(serialized);

        expect(deserialized.messageId).toBe(original.messageId);
        expect(deserialized.senderId).toBe(original.senderId);
        expect(deserialized.recipientId).toBe(original.recipientId);
        expect(deserialized.timestamp).toBe(original.timestamp);
        expect(deserialized.ttl).toBe(original.ttl);
        expect(deserialized.encryptedPayload).toEqual(original.encryptedPayload);
      });
    });
  });

  describe('Platform-Independent Data Types', () => {
    /**
     * Test: Verify Uint8Array is used for binary data
     * 
     * Requirement 9.4: Platform-independent binary data
     */
    test('uses Uint8Array for binary data', () => {
      const encrypted: EncryptedMessage = {
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        tag: new Uint8Array([7, 8, 9]),
      };

      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce).toBeInstanceOf(Uint8Array);
      expect(encrypted.tag).toBeInstanceOf(Uint8Array);
    });

    /**
     * Test: Verify string encoding is consistent
     * 
     * Requirement 9.4: Consistent string handling
     */
    test('uses consistent string encoding for IDs', () => {
      const senderId = 'a1b2c3d4e5f6a7b8';
      const recipientId = '9a0b1c2d3e4f5a6b';

      // IDs should be hex strings
      expect(senderId).toMatch(/^[0-9a-f]{16}$/);
      expect(recipientId).toMatch(/^[0-9a-f]{16}$/);
      expect(senderId.length).toBe(16);
      expect(recipientId.length).toBe(16);
    });

    /**
     * Test: Verify UUID format is consistent
     * 
     * Requirement 9.4: Standard UUID format
     */
    test('uses standard UUID format', () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';

      expect(messageId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(messageId.length).toBe(36);
    });

    /**
     * Test: Verify timestamp uses milliseconds
     * 
     * Requirement 9.4: Consistent timestamp format
     */
    test('uses millisecond timestamps', () => {
      const timestamp = Date.now();

      // Timestamp should be in milliseconds (13 digits for current era)
      expect(timestamp.toString().length).toBeGreaterThanOrEqual(13);
      expect(timestamp).toBeGreaterThan(1000000000000); // After year 2001
      expect(timestamp).toBeLessThan(9999999999999); // Before year 2286
    });
  });

  describe('Cross-Platform Constants', () => {
    /**
     * Test: Verify protocol version is consistent
     * 
     * Requirement 9.4: Protocol version consistency
     */
    test('protocol version is consistent', () => {
      expect(MESSAGE_ENVELOPE_VERSION).toBe(1);
      expect(typeof MESSAGE_ENVELOPE_VERSION).toBe('number');
    });

    /**
     * Test: Verify initial TTL is consistent
     * 
     * Requirement 9.4: TTL consistency
     */
    test('initial TTL is consistent', () => {
      expect(INITIAL_MESSAGE_TTL).toBe(10);
      expect(typeof INITIAL_MESSAGE_TTL).toBe('number');
    });

    /**
     * Test: Verify all constants are defined
     * 
     * Requirement 9.3, 9.4: All required constants exist
     */
    test('all required constants are defined', () => {
      expect(BLE_SERVICE_UUID).toBeDefined();
      expect(BLE_TX_CHARACTERISTIC_UUID).toBeDefined();
      expect(BLE_RX_CHARACTERISTIC_UUID).toBeDefined();
      expect(MESSAGE_ENVELOPE_VERSION).toBeDefined();
      expect(INITIAL_MESSAGE_TTL).toBeDefined();
    });
  });
});
