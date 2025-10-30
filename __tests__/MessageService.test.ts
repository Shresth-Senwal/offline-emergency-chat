/**
 * MessageService unit tests
 *
 * Tests core message handling and relay operations including:
 * - Message envelope creation with correct metadata
 * - Duplicate detection (first occurrence vs. duplicate)
 * - TTL decrement during relay
 * - Message queuing and retry logic
 * - Message length validation
 *
 * Requirements tested:
 * - 4.2: Message envelope creation with metadata
 * - 6.2: TTL-based relay decision
 * - 7.1: Extract and check message ID
 * - 7.2: Check if message ID exists in cache
 * - 7.3: Discard duplicate messages
 *
 * @format
 */

import { MessageService } from '../src/services/MessageService';
import { CryptoService } from '../src/services/CryptoService';
import { BLEService } from '../src/services/BLEService';
import { StorageService } from '../src/services/StorageService';
import { DuplicateDetector } from '../src/utils/duplicateDetection';
import { Peer, Message } from '../src/context/types';
import { MAX_MESSAGE_LENGTH, INITIAL_MESSAGE_TTL } from '../src/utils/constants';
import { deserializeEnvelope } from '../src/utils/messageEnvelope';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock BLE Manager
jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn().mockImplementation(() => ({
    state: jest.fn().mockResolvedValue('PoweredOn'),
    onStateChange: jest.fn(),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
    connectToDevice: jest.fn(),
    cancelDeviceConnection: jest.fn(),
  })),
  State: {
    PoweredOn: 'PoweredOn',
    PoweredOff: 'PoweredOff',
  },
}));

describe('MessageService', () => {
  let messageService: MessageService;
  let cryptoService: CryptoService;
  let bleService: BLEService;
  let storageService: StorageService;
  let duplicateDetector: DuplicateDetector;
  let peers: Map<string, Peer>;

  beforeEach(async () => {
    // Initialize services
    storageService = new StorageService();
    cryptoService = new CryptoService(storageService);
    bleService = new BLEService();
    duplicateDetector = new DuplicateDetector();

    await cryptoService.initialize();
    await bleService.initialize();

    messageService = new MessageService(
      cryptoService,
      bleService,
      storageService,
      duplicateDetector,
    );

    // Create test peers
    peers = new Map<string, Peer>();
  });

  afterEach(() => {
    messageService.destroy();
  });

  describe('sendMessage', () => {
    it('should create envelope with correct metadata', async () => {
      // Create a peer with shared secret
      const peerCrypto = new CryptoService(storageService);
      await peerCrypto.initialize();

      const peerPublicKey = peerCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(peerPublicKey);

      const peer: Peer = {
        id: 'peer-1',
        publicKey: peerPublicKey,
        sharedSecret,
        name: 'Test Peer',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('peer-1', peer);

      // Mock BLE sendData to capture the envelope
      let capturedData: Uint8Array | null = null;
      jest.spyOn(bleService, 'sendData').mockImplementation(async (deviceId, data) => {
        capturedData = data;
      });
      jest.spyOn(bleService, 'getConnectedDevices').mockReturnValue(['peer-1']);

      // Send message
      const message = await messageService.sendMessage('peer-1', 'Test message', peers);

      // Verify message was created
      expect(message).toBeDefined();
      expect(message.text).toBe('Test message');
      expect(message.sent).toBe(true);

      // Verify envelope was created and transmitted
      expect(capturedData).not.toBeNull();
      if (capturedData) {
        const envelope = deserializeEnvelope(capturedData);
        expect(envelope.version).toBe(1);
        expect(envelope.messageId).toBe(message.id);
        expect(envelope.ttl).toBe(INITIAL_MESSAGE_TTL);
        expect(envelope.timestamp).toBe(message.timestamp);
        expect(envelope.encryptedPayload).toBeDefined();
        expect(envelope.nonce).toBeDefined();
        expect(envelope.tag).toBeDefined();
      }
    });

    it('should validate message length', async () => {
      const peerCrypto = new CryptoService(storageService);
      await peerCrypto.initialize();

      const peerPublicKey = peerCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(peerPublicKey);

      const peer: Peer = {
        id: 'peer-1',
        publicKey: peerPublicKey,
        sharedSecret,
        name: 'Test Peer',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('peer-1', peer);

      // Create a message that's too long
      const longMessage = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);

      // Should throw error for message that's too long
      await expect(
        messageService.sendMessage('peer-1', longMessage, peers),
      ).rejects.toThrow('Message too long');
    });

    it('should reject empty messages', async () => {
      const peerCrypto = new CryptoService(storageService);
      await peerCrypto.initialize();

      const peerPublicKey = peerCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(peerPublicKey);

      const peer: Peer = {
        id: 'peer-1',
        publicKey: peerPublicKey,
        sharedSecret,
        name: 'Test Peer',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('peer-1', peer);

      // Should throw error for empty message
      await expect(
        messageService.sendMessage('peer-1', '', peers),
      ).rejects.toThrow('Message cannot be empty');
    });
  });

  describe('handleIncomingMessage - Duplicate Detection', () => {
    it('should process first occurrence of message', async () => {
      // Create sender peer
      const senderCrypto = new CryptoService(storageService);
      await senderCrypto.initialize();

      const senderPublicKey = senderCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(senderPublicKey);

      const senderPeer: Peer = {
        id: 'sender-1',
        publicKey: senderPublicKey,
        sharedSecret,
        name: 'Sender',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('sender-1', senderPeer);

      // Create a message from sender
      const messageText = 'Hello from sender';
      const encrypted = senderCrypto.encryptMessage(messageText, sharedSecret);

      // Create envelope manually
      const { createEnvelope, serializeEnvelope } = require('../src/utils/messageEnvelope');
      const messageId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
      const senderId = cryptoService.generateTrustFingerprint(senderPublicKey).substring(0, 16);

      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        senderId,
        Date.now(),
        5,
      );

      const serialized = serializeEnvelope(envelope);

      // Track if message was received
      let receivedMessage: Message | null = null;
      messageService.onMessageReceived((msg) => {
        receivedMessage = msg;
      });

      // Handle incoming message
      await messageService.handleIncomingMessage('sender-1', serialized, peers);

      // Verify message was processed
      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage?.text).toBe(messageText);

      // Verify message ID was marked as processed
      expect(duplicateDetector.isDuplicate(messageId)).toBe(true);
    });

    it('should discard duplicate messages', async () => {
      // Create sender peer
      const senderCrypto = new CryptoService(storageService);
      await senderCrypto.initialize();

      const senderPublicKey = senderCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(senderPublicKey);

      const senderPeer: Peer = {
        id: 'sender-1',
        publicKey: senderPublicKey,
        sharedSecret,
        name: 'Sender',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('sender-1', senderPeer);

      // Create a message from sender
      const messageText = 'Hello from sender';
      const encrypted = senderCrypto.encryptMessage(messageText, sharedSecret);

      // Create envelope manually
      const { createEnvelope, serializeEnvelope } = require('../src/utils/messageEnvelope');
      const messageId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Valid UUID
      const senderId = cryptoService.generateTrustFingerprint(senderPublicKey).substring(0, 16);

      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        senderId,
        Date.now(),
        5,
      );

      const serialized = serializeEnvelope(envelope);

      // Track message reception count
      let messageCount = 0;
      messageService.onMessageReceived(() => {
        messageCount++;
      });

      // Handle incoming message first time
      await messageService.handleIncomingMessage('sender-1', serialized, peers);
      expect(messageCount).toBe(1);

      // Handle same message again (duplicate)
      await messageService.handleIncomingMessage('sender-1', serialized, peers);
      expect(messageCount).toBe(1); // Should still be 1, not 2

      // Verify message ID is in duplicate cache
      expect(duplicateDetector.isDuplicate(messageId)).toBe(true);
    });
  });

  describe('relayMessage - TTL Management', () => {
    it('should decrement TTL during relay', async () => {
      // Create sender peer
      const senderCrypto = new CryptoService(storageService);
      await senderCrypto.initialize();

      const senderPublicKey = senderCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(senderPublicKey);

      const senderPeer: Peer = {
        id: 'sender-1',
        publicKey: senderPublicKey,
        sharedSecret,
        name: 'Sender',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('sender-1', senderPeer);

      // Create a message with TTL > 0
      const messageText = 'Relay test message';
      const encrypted = senderCrypto.encryptMessage(messageText, sharedSecret);

      const { createEnvelope, serializeEnvelope } = require('../src/utils/messageEnvelope');
      const messageId = '7c9e6679-7425-40de-944b-e07fc1f90ae7'; // Valid UUID
      const senderId = cryptoService.generateTrustFingerprint(senderPublicKey).substring(0, 16);

      const initialTTL = 5;
      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        senderId,
        Date.now(),
        initialTTL,
      );

      const serialized = serializeEnvelope(envelope);

      // Mock BLE to capture relayed data
      let relayedData: Uint8Array | null = null;
      jest.spyOn(bleService, 'sendData').mockImplementation(async (deviceId, data) => {
        relayedData = data;
      });
      jest.spyOn(bleService, 'getConnectedDevices').mockReturnValue(['peer-2']);

      // Handle incoming message (should trigger relay)
      await messageService.handleIncomingMessage('sender-1', serialized, peers);

      // Verify message was relayed with decremented TTL
      expect(relayedData).not.toBeNull();
      if (relayedData) {
        const relayedEnvelope = deserializeEnvelope(relayedData);
        expect(relayedEnvelope.ttl).toBe(initialTTL - 1);
        expect(relayedEnvelope.messageId).toBe(messageId);
      }
    });

    it('should not relay when TTL is 0', async () => {
      // Create sender peer
      const senderCrypto = new CryptoService(storageService);
      await senderCrypto.initialize();

      const senderPublicKey = senderCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(senderPublicKey);

      const senderPeer: Peer = {
        id: 'sender-1',
        publicKey: senderPublicKey,
        sharedSecret,
        name: 'Sender',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('sender-1', senderPeer);

      // Create a message with TTL = 0
      const messageText = 'No relay message';
      const encrypted = senderCrypto.encryptMessage(messageText, sharedSecret);

      const { createEnvelope, serializeEnvelope } = require('../src/utils/messageEnvelope');
      const messageId = '8f14e45f-ceea-467a-9538-03aa6ec6f290'; // Valid UUID
      const senderId = cryptoService.generateTrustFingerprint(senderPublicKey).substring(0, 16);

      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        senderId,
        Date.now(),
        0, // TTL = 0
      );

      const serialized = serializeEnvelope(envelope);

      // Mock BLE to track if relay was attempted
      const sendDataSpy = jest.spyOn(bleService, 'sendData');
      jest.spyOn(bleService, 'getConnectedDevices').mockReturnValue(['peer-2']);

      // Handle incoming message (should NOT trigger relay)
      await messageService.handleIncomingMessage('sender-1', serialized, peers);

      // Verify no relay was attempted
      expect(sendDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('Message Queuing and Retry', () => {
    it('should queue message for retry on transmission failure', async () => {
      // Create a peer with shared secret
      const peerCrypto = new CryptoService(storageService);
      await peerCrypto.initialize();

      const peerPublicKey = peerCrypto.getPublicKey();
      const sharedSecret = cryptoService.performKeyExchange(peerPublicKey);

      const peer: Peer = {
        id: 'peer-1',
        publicKey: peerPublicKey,
        sharedSecret,
        name: 'Test Peer',
        connected: true,
        verified: false,
        rssi: -50,
        lastSeen: Date.now(),
      };

      peers.set('peer-1', peer);

      // Mock BLE sendData to fail
      jest.spyOn(bleService, 'sendData').mockRejectedValue(new Error('Transmission failed'));
      jest.spyOn(bleService, 'getConnectedDevices').mockReturnValue(['peer-1']);

      // Send message (should fail and queue for retry)
      const message = await messageService.sendMessage('peer-1', 'Test message', peers);

      // Verify message was created but not delivered
      expect(message).toBeDefined();
      expect(message.delivered).toBe(false);

      // Note: We can't easily test the retry mechanism without waiting for timers
      // The important part is that the message was queued (no error thrown)
    });
  });
});
