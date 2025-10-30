/**
 * Unit tests for message envelope utilities.
 * 
 * Tests the core functionality of envelope creation, serialization,
 * deserialization, and validation. Ensures that envelopes can be
 * correctly transmitted over BLE and reconstructed on the receiving end.
 * 
 * Test coverage:
 * - Envelope creation with valid inputs
 * - Serialization to binary format
 * - Deserialization from binary format
 * - Round-trip serialization/deserialization
 * - Validation of envelope structure
 * - Error handling for invalid inputs
 * 
 * Requirements tested:
 * - 4.2: Message envelope structure
 * - 5.1: Envelope validation
 * - 6.1: Message ID handling
 */

import {
  createEnvelope,
  serializeEnvelope,
  deserializeEnvelope,
  validateEnvelope,
  EnvelopeError,
} from '../src/utils/messageEnvelope';
import { EncryptedMessage, MessageEnvelope } from '../src/context/types';
import { MESSAGE_ENVELOPE_VERSION } from '../src/utils/constants';

describe('messageEnvelope', () => {
  // Test data
  const mockEncrypted: EncryptedMessage = {
    ciphertext: new Uint8Array([1, 2, 3, 4, 5]),
    nonce: new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]),
    tag: new Uint8Array([30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]),
  };
  
  const messageId = '550e8400-e29b-41d4-a716-446655440000';
  const senderId = 'a1b2c3d4e5f67890'; // 16 hex characters
  const recipientId = '9a0b1c2d3e4f5678'; // 16 hex characters
  const timestamp = 1234567890123;
  const ttl = 10;

  describe('createEnvelope', () => {
    it('should create a valid envelope with all fields', () => {
      const envelope = createEnvelope(
        mockEncrypted,
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
      expect(envelope.encryptedPayload).toEqual(mockEncrypted.ciphertext);
      expect(envelope.nonce).toEqual(mockEncrypted.nonce);
      expect(envelope.tag).toEqual(mockEncrypted.tag);
    });

    it('should throw error for invalid encrypted message', () => {
      const invalidEncrypted = { ciphertext: new Uint8Array([1]) } as EncryptedMessage;
      
      expect(() => {
        createEnvelope(invalidEncrypted, messageId, senderId, recipientId, timestamp, ttl);
      }).toThrow(EnvelopeError);
    });

    it('should throw error for invalid senderId length', () => {
      expect(() => {
        createEnvelope(mockEncrypted, messageId, 'short', recipientId, timestamp, ttl);
      }).toThrow(EnvelopeError);
    });

    it('should throw error for invalid TTL', () => {
      expect(() => {
        createEnvelope(mockEncrypted, messageId, senderId, recipientId, timestamp, -1);
      }).toThrow(EnvelopeError);
      
      expect(() => {
        createEnvelope(mockEncrypted, messageId, senderId, recipientId, timestamp, 256);
      }).toThrow(EnvelopeError);
    });
  });

  describe('serializeEnvelope and deserializeEnvelope', () => {
    it('should serialize and deserialize envelope correctly (round-trip)', () => {
      const envelope = createEnvelope(
        mockEncrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );

      const serialized = serializeEnvelope(envelope);
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = deserializeEnvelope(serialized);
      
      expect(deserialized.version).toBe(envelope.version);
      expect(deserialized.messageId).toBe(envelope.messageId);
      expect(deserialized.senderId).toBe(envelope.senderId);
      expect(deserialized.recipientId).toBe(envelope.recipientId);
      expect(deserialized.timestamp).toBe(envelope.timestamp);
      expect(deserialized.ttl).toBe(envelope.ttl);
      expect(deserialized.encryptedPayload).toEqual(envelope.encryptedPayload);
      expect(deserialized.nonce).toEqual(envelope.nonce);
      expect(deserialized.tag).toEqual(envelope.tag);
    });

    it('should handle different TTL values', () => {
      const testTTLs = [0, 1, 5, 10, 255];
      
      testTTLs.forEach(testTTL => {
        const envelope = createEnvelope(
          mockEncrypted,
          messageId,
          senderId,
          recipientId,
          timestamp,
          testTTL
        );
        
        const serialized = serializeEnvelope(envelope);
        const deserialized = deserializeEnvelope(serialized);
        
        expect(deserialized.ttl).toBe(testTTL);
      });
    });

    it('should throw error for malformed binary data', () => {
      const tooShort = new Uint8Array([1, 2, 3]);
      
      expect(() => {
        deserializeEnvelope(tooShort);
      }).toThrow(EnvelopeError);
    });
  });

  describe('validateEnvelope', () => {
    it('should validate a correct envelope', () => {
      const envelope = createEnvelope(
        mockEncrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );

      expect(() => validateEnvelope(envelope)).not.toThrow();
      expect(validateEnvelope(envelope)).toBe(true);
    });

    it('should reject envelope with invalid version', () => {
      const envelope = createEnvelope(
        mockEncrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );
      envelope.version = 99;

      expect(() => validateEnvelope(envelope)).toThrow(EnvelopeError);
    });

    it('should reject envelope with invalid TTL', () => {
      const envelope = createEnvelope(
        mockEncrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );
      envelope.ttl = -1;

      expect(() => validateEnvelope(envelope)).toThrow(EnvelopeError);
    });

    it('should reject envelope with missing fields', () => {
      const envelope = createEnvelope(
        mockEncrypted,
        messageId,
        senderId,
        recipientId,
        timestamp,
        ttl
      );
      
      // Test missing messageId
      const invalidEnvelope1 = { ...envelope, messageId: '' };
      expect(() => validateEnvelope(invalidEnvelope1 as MessageEnvelope)).toThrow(EnvelopeError);
      
      // Test missing nonce
      const invalidEnvelope2 = { ...envelope, nonce: new Uint8Array([]) };
      expect(() => validateEnvelope(invalidEnvelope2 as MessageEnvelope)).toThrow(EnvelopeError);
    });
  });
});
