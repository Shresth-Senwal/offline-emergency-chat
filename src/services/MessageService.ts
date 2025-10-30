/**
 * MessageService - Core message handling and mesh relay service
 *
 * This service implements the core messaging logic for the emergency mesh chat application:
 * - Message composition and encryption
 * - Message envelope creation and serialization
 * - BLE transmission to connected peers
 * - Incoming message reception and decryption
 * - Multi-hop mesh relay with TTL management
 * - Duplicate detection to prevent message loops
 * - Message queuing and retry logic for failed transmissions
 *
 * The service coordinates between CryptoService (encryption), BLEService (transmission),
 * StorageService (persistence), and DuplicateDetector (loop prevention) to provide
 * reliable end-to-end encrypted messaging over the mesh network.
 *
 * Architecture:
 * - Stateless service design (state managed by AppContext)
 * - Callback-based event system for message reception
 * - Automatic retry with exponential backoff for failed sends
 * - Efficient relay logic to minimize latency
 *
 * Requirements addressed:
 * - 4.1: Message composition with length validation
 * - 4.2: Message envelope creation with metadata
 * - 4.3: Transmission to all connected peers
 * - 4.4: Display sent messages with status
 * - 4.5: Error handling and retry for failed sends
 * - 5.1: Envelope validation and extraction
 * - 5.2: Message decryption with shared secret
 * - 5.5: Error handling for decryption failures
 * - 6.1: Duplicate detection before processing
 * - 6.2: TTL-based relay decision
 * - 6.3: Discard duplicates without forwarding
 * - 6.4: Fast relay processing (<500ms)
 * - 6.5: Stop relay when TTL reaches 0
 *
 * Dependencies:
 * - CryptoService: Encryption and decryption
 * - BLEService: BLE transmission
 * - StorageService: Message persistence
 * - DuplicateDetector: Duplicate detection
 * - messageEnvelope.ts: Envelope serialization/deserialization
 * - constants.ts: Configuration values
 *
 * @module MessageService
 */

import { CryptoService } from './CryptoService';
import { BLEService } from './BLEService';
import { StorageService } from './StorageService';
import { DuplicateDetector } from '../utils/duplicateDetection';
import {
  createEnvelope,
  serializeEnvelope,
  deserializeEnvelope,
  validateEnvelope,
  EnvelopeError,
} from '../utils/messageEnvelope';
import { Message, MessageEnvelope, Peer } from '../context/types';
import {
  MAX_MESSAGE_LENGTH,
  INITIAL_MESSAGE_TTL,
  MAX_SEND_RETRIES,
  RETRY_BASE_DELAY_MS,
} from '../utils/constants';

/**
 * Callback type for message reception events.
 * Invoked when a new message is successfully received and decrypted.
 */
type MessageReceivedCallback = (message: Message) => void;

/**
 * Callback type for message status update events.
 * Invoked when a sent message's status changes (delivered, failed).
 */
type MessageStatusCallback = (messageId: string, status: 'delivered' | 'failed') => void;

/**
 * Queued message for retry logic.
 * Tracks retry attempts and timing for failed message sends.
 */
interface QueuedMessage {
  messageId: string;
  peerId: string;
  envelope: MessageEnvelope;
  serialized: Uint8Array;
  attempts: number;
  nextRetryTime: number;
}

/**
 * MessageService class - Core messaging and relay logic
 *
 * This class provides high-level methods for sending, receiving, and relaying
 * messages through the mesh network. It handles all the complexity of encryption,
 * serialization, transmission, duplicate detection, and retry logic.
 *
 * Usage:
 * ```typescript
 * const messageService = new MessageService(crypto, ble, storage, duplicateDetector);
 * messageService.onMessageReceived((message) => {
 *   console.log('New message:', message.text);
 * });
 * await messageService.sendMessage(peerId, 'Hello!', peers);
 * ```
 */
export class MessageService {
  private cryptoService: CryptoService;
  private bleService: BLEService;
  private storageService: StorageService;
  private duplicateDetector: DuplicateDetector;

  // Callback registrations
  private messageReceivedCallback: MessageReceivedCallback | null = null;
  private messageStatusCallback: MessageStatusCallback | null = null;

  // Message retry queue
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Constructor - Initializes the message service with required dependencies
   *
   * @param cryptoService - CryptoService instance for encryption/decryption
   * @param bleService - BLEService instance for BLE transmission
   * @param storageService - StorageService instance for message persistence
   * @param duplicateDetector - DuplicateDetector instance for loop prevention
   */
  constructor(
    cryptoService: CryptoService,
    bleService: BLEService,
    storageService: StorageService,
    duplicateDetector: DuplicateDetector,
  ) {
    this.cryptoService = cryptoService;
    this.bleService = bleService;
    this.storageService = storageService;
    this.duplicateDetector = duplicateDetector;

    // Start retry timer for processing queued messages
    this.startRetryTimer();
  }

  /**
   * Send a message to a specific peer
   *
   * This method performs the complete message sending workflow:
   * 1. Validate message length (max 500 characters)
   * 2. Generate unique message ID (UUID v4)
   * 3. Derive sender ID from own public key
   * 4. Encrypt message with peer's shared secret
   * 5. Create message envelope with TTL=10
   * 6. Serialize envelope to binary format
   * 7. Transmit to all connected peers via BLE
   * 8. Store message locally
   * 9. Queue for retry if transmission fails
   *
   * @param recipientId - Peer ID to send message to
   * @param text - Message text (max 500 characters)
   * @param peers - Map of all peers (to get recipient's shared secret)
   * @returns Promise that resolves with the created Message object
   * @throws Error if message is too long, peer not found, or encryption fails
   *
   * @example
   * ```typescript
   * try {
   *   const message = await messageService.sendMessage(
   *     'peer-123',
   *     'Emergency at location X',
   *     peersMap
   *   );
   *   console.log('Message sent:', message.id);
   * } catch (error) {
   *   console.error('Failed to send:', error);
   * }
   * ```
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async sendMessage(
    recipientId: string,
    text: string,
    peers: Map<string, Peer>,
  ): Promise<Message> {
    try {
      // Validate message length
      if (text.length > MAX_MESSAGE_LENGTH) {
        throw new Error(
          `Message too long: ${text.length} characters (max ${MAX_MESSAGE_LENGTH})`,
        );
      }

      if (text.length === 0) {
        throw new Error('Message cannot be empty');
      }

      // Get recipient peer
      const recipient = peers.get(recipientId);
      if (!recipient) {
        throw new Error(`Recipient peer not found: ${recipientId}`);
      }

      if (!recipient.sharedSecret) {
        throw new Error(
          `No shared secret with peer ${recipientId} - key exchange not complete`,
        );
      }

      // Generate message ID (UUID v4)
      const messageId = this.generateUUID();

      // Generate timestamp
      const timestamp = Date.now();

      // Derive sender ID (first 16 characters of SHA-256 hash of public key)
      const ownPublicKey = this.cryptoService.getPublicKey();
      const senderId = this.deriveSenderId(ownPublicKey);

      // Derive recipient ID from their public key
      const recipientIdHash = recipient.publicKey
        ? this.deriveSenderId(recipient.publicKey)
        : recipientId.substring(0, 16);

      console.log('[MessageService] Sending message:', {
        messageId,
        senderId,
        recipientId: recipientIdHash,
        textLength: text.length,
      });

      // Encrypt message
      const encrypted = this.cryptoService.encryptMessage(
        text,
        recipient.sharedSecret,
      );

      // Create message envelope
      const envelope = createEnvelope(
        encrypted,
        messageId,
        senderId,
        recipientIdHash,
        timestamp,
        INITIAL_MESSAGE_TTL,
      );

      // Serialize envelope
      const serialized = serializeEnvelope(envelope);

      console.log(
        '[MessageService] Envelope created, size:',
        serialized.length,
        'bytes',
      );

      // Create message object for local storage
      const message: Message = {
        id: messageId,
        peerId: recipientId,
        text,
        timestamp,
        sent: true,
        delivered: false,
        failed: false,
      };

      // Store message locally
      await this.storageService.storeMessage(message);

      // Transmit to all connected peers
      const transmitSuccess = await this.transmitToAllPeers(
        serialized,
        null, // No exclusion for initial send
      );

      if (!transmitSuccess) {
        // Queue for retry if transmission failed
        console.log('[MessageService] Initial transmission failed, queuing for retry');
        this.queueMessageForRetry(messageId, recipientId, envelope, serialized);
      } else {
        console.log('[MessageService] Message transmitted successfully');
        // Mark as delivered
        message.delivered = true;
        if (this.messageStatusCallback) {
          this.messageStatusCallback(messageId, 'delivered');
        }
      }

      return message;
    } catch (error) {
      console.error('[MessageService] Send message failed:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message from a peer
   *
   * This method processes messages received over BLE:
   * 1. Deserialize envelope from binary data
   * 2. Validate envelope structure
   * 3. Check for duplicates using message ID
   * 4. Decrypt payload with sender's shared secret
   * 5. Store message locally
   * 6. Invoke message received callback
   * 7. Relay message if TTL > 0
   *
   * @param senderId - BLE device ID of the sender
   * @param data - Raw binary data received over BLE
   * @param peers - Map of all peers (to get sender's shared secret)
   * @returns Promise that resolves when message is processed
   *
   * @example
   * ```typescript
   * bleService.onDataReceived((deviceId, data) => {
   *   messageService.handleIncomingMessage(deviceId, data, peersMap)
   *     .catch(err => console.error('Failed to handle message:', err));
   * });
   * ```
   *
   * Requirements: 5.1, 5.2, 5.5, 6.1, 6.2, 6.3
   */
  async handleIncomingMessage(
    senderId: string,
    data: Uint8Array,
    peers: Map<string, Peer>,
  ): Promise<void> {
    try {
      console.log(
        '[MessageService] Handling incoming message from:',
        senderId,
        'size:',
        data.length,
      );

      // Deserialize envelope
      let envelope: MessageEnvelope;
      try {
        envelope = deserializeEnvelope(data);
      } catch (error) {
        if (error instanceof EnvelopeError) {
          console.error('[MessageService] Invalid envelope:', error.message);
          return; // Discard malformed envelope
        }
        throw error;
      }

      // Validate envelope
      try {
        validateEnvelope(envelope);
      } catch (error) {
        if (error instanceof EnvelopeError) {
          console.error('[MessageService] Envelope validation failed:', error.message);
          return; // Discard invalid envelope
        }
        throw error;
      }

      console.log('[MessageService] Envelope deserialized:', {
        messageId: envelope.messageId,
        senderId: envelope.senderId,
        ttl: envelope.ttl,
        timestamp: envelope.timestamp,
      });

      // Check for duplicates
      if (this.duplicateDetector.isDuplicate(envelope.messageId)) {
        console.log(
          '[MessageService] Duplicate message detected, discarding:',
          envelope.messageId,
        );
        return; // Discard duplicate
      }

      // Mark as processed to prevent future duplicates
      this.duplicateDetector.markAsProcessed(envelope.messageId);

      // Find sender peer by matching sender ID hash
      let senderPeer: Peer | null = null;
      for (const peer of peers.values()) {
        if (peer.publicKey) {
          const peerIdHash = this.deriveSenderId(peer.publicKey);
          if (peerIdHash === envelope.senderId) {
            senderPeer = peer;
            break;
          }
        }
      }

      // If we can't find the sender peer, try using the BLE device ID
      if (!senderPeer) {
        senderPeer = peers.get(senderId) || null;
      }

      if (!senderPeer || !senderPeer.sharedSecret) {
        console.error(
          '[MessageService] Cannot decrypt: sender peer not found or no shared secret',
        );
        // Still relay the message even if we can't decrypt it
        if (envelope.ttl > 0) {
          await this.relayMessage(envelope, senderId);
        }
        return;
      }

      // Decrypt message
      const plaintext = this.cryptoService.decryptMessage(
        {
          ciphertext: envelope.encryptedPayload,
          nonce: envelope.nonce,
          tag: envelope.tag,
        },
        senderPeer.sharedSecret,
      );

      if (plaintext === null) {
        console.error('[MessageService] Decryption failed for message:', envelope.messageId);
        // Still relay the message even if we can't decrypt it
        if (envelope.ttl > 0) {
          await this.relayMessage(envelope, senderId);
        }
        return;
      }

      console.log('[MessageService] Message decrypted successfully');

      // Create message object
      const message: Message = {
        id: envelope.messageId,
        peerId: senderPeer.id,
        text: plaintext,
        timestamp: envelope.timestamp,
        sent: false,
        delivered: true,
        failed: false,
      };

      // Store message locally
      await this.storageService.storeMessage(message);

      // Invoke callback to update UI
      if (this.messageReceivedCallback) {
        this.messageReceivedCallback(message);
      }

      console.log('[MessageService] Message processed successfully');

      // Relay message if TTL > 0
      if (envelope.ttl > 0) {
        await this.relayMessage(envelope, senderId);
      }
    } catch (error) {
      console.error('[MessageService] Handle incoming message failed:', error);
      // Don't throw - we don't want to crash on bad messages
    }
  }

  /**
   * Relay a message to other peers
   *
   * This method implements the mesh relay logic:
   * 1. Decrement TTL by 1
   * 2. Serialize updated envelope
   * 3. Forward to all connected peers except the sender
   *
   * Relay is performed quickly (<500ms target) to minimize latency
   * in multi-hop scenarios.
   *
   * @param envelope - Message envelope to relay
   * @param excludePeerId - Peer ID to exclude from relay (original sender)
   * @returns Promise that resolves when relay is complete
   *
   * @example
   * ```typescript
   * if (envelope.ttl > 0) {
   *   await messageService.relayMessage(envelope, senderId);
   * }
   * ```
   *
   * Requirements: 6.2, 6.4, 6.5
   */
  async relayMessage(
    envelope: MessageEnvelope,
    excludePeerId: string,
  ): Promise<void> {
    try {
      const relayStartTime = Date.now();

      // Decrement TTL
      const relayEnvelope: MessageEnvelope = {
        ...envelope,
        ttl: envelope.ttl - 1,
      };

      console.log('[MessageService] Relaying message:', {
        messageId: relayEnvelope.messageId,
        newTTL: relayEnvelope.ttl,
        excludePeer: excludePeerId,
      });

      // Log relay event for demonstration purposes
      // This helps verify mesh relay functionality in the 3-device demo
      console.log('[RELAY]', {
        messageId: relayEnvelope.messageId.substring(0, 8),
        ttl: relayEnvelope.ttl,
        timestamp: new Date().toISOString(),
      });

      // Serialize updated envelope
      const serialized = serializeEnvelope(relayEnvelope);

      // Forward to all connected peers except sender
      const success = await this.transmitToAllPeers(serialized, excludePeerId);

      const relayDuration = Date.now() - relayStartTime;
      console.log(
        '[MessageService] Relay complete in',
        relayDuration,
        'ms',
        success ? 'SUCCESS' : 'FAILED',
      );

      // Log relay result
      console.log('[RELAY]', success ? 'SUCCESS' : 'FAILED', {
        messageId: relayEnvelope.messageId.substring(0, 8),
        duration: relayDuration,
      });
    } catch (error) {
      console.error('[MessageService] Relay failed:', error);
      console.log('[RELAY] ERROR', {
        messageId: envelope.messageId.substring(0, 8),
        error: String(error),
      });
      // Don't throw - relay failures shouldn't crash the app
    }
  }

  /**
   * Transmit data to all connected peers
   *
   * Sends the serialized envelope to all connected peers via BLE.
   * Optionally excludes a specific peer (used during relay to avoid
   * sending back to the original sender).
   *
   * @param data - Serialized envelope data
   * @param excludePeerId - Optional peer ID to exclude from transmission
   * @returns Promise that resolves to true if at least one transmission succeeded
   * @private
   */
  private async transmitToAllPeers(
    data: Uint8Array,
    excludePeerId: string | null,
  ): Promise<boolean> {
    const connectedDevices = this.bleService.getConnectedDevices();
    const devicesToSend = excludePeerId
      ? connectedDevices.filter(id => id !== excludePeerId)
      : connectedDevices;

    if (devicesToSend.length === 0) {
      console.log('[MessageService] No connected peers to send to');
      return false;
    }

    console.log(
      '[MessageService] Transmitting to',
      devicesToSend.length,
      'peers',
    );

    // Send to all peers in parallel
    const sendPromises = devicesToSend.map(async deviceId => {
      try {
        await this.bleService.sendData(deviceId, data);
        console.log('[MessageService] Sent to peer:', deviceId);
        return true;
      } catch (error) {
        console.error('[MessageService] Send failed to peer:', deviceId, error);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(success => success).length;

    console.log(
      '[MessageService] Transmission complete:',
      successCount,
      'of',
      devicesToSend.length,
      'succeeded',
    );

    return successCount > 0;
  }

  /**
   * Queue a message for retry after failed transmission
   *
   * Adds the message to the retry queue with exponential backoff.
   * Messages are retried up to MAX_SEND_RETRIES times.
   *
   * @param messageId - Message ID
   * @param peerId - Peer ID
   * @param envelope - Message envelope
   * @param serialized - Serialized envelope data
   * @private
   */
  private queueMessageForRetry(
    messageId: string,
    peerId: string,
    envelope: MessageEnvelope,
    serialized: Uint8Array,
  ): void {
    const queuedMessage: QueuedMessage = {
      messageId,
      peerId,
      envelope,
      serialized,
      attempts: 0,
      nextRetryTime: Date.now() + RETRY_BASE_DELAY_MS,
    };

    this.messageQueue.set(messageId, queuedMessage);
    console.log('[MessageService] Message queued for retry:', messageId);
  }

  /**
   * Start the retry timer for processing queued messages
   *
   * Checks the queue every second and retries messages that are due.
   * Uses exponential backoff: 1s, 2s, 4s for successive retries.
   *
   * @private
   */
  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.processRetryQueue();
    }, 1000);
  }

  /**
   * Process the retry queue
   *
   * Attempts to resend queued messages that are due for retry.
   * Removes messages that have exceeded MAX_SEND_RETRIES.
   *
   * @private
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();

    for (const [messageId, queuedMessage] of this.messageQueue.entries()) {
      if (now >= queuedMessage.nextRetryTime) {
        queuedMessage.attempts++;

        console.log(
          '[MessageService] Retrying message:',
          messageId,
          'attempt',
          queuedMessage.attempts,
        );

        // Attempt to resend
        const success = await this.transmitToAllPeers(
          queuedMessage.serialized,
          null,
        );

        if (success) {
          // Success - remove from queue
          console.log('[MessageService] Retry successful:', messageId);
          this.messageQueue.delete(messageId);
          if (this.messageStatusCallback) {
            this.messageStatusCallback(messageId, 'delivered');
          }
        } else if (queuedMessage.attempts >= MAX_SEND_RETRIES) {
          // Max retries exceeded - mark as failed
          console.log('[MessageService] Max retries exceeded:', messageId);
          this.messageQueue.delete(messageId);
          if (this.messageStatusCallback) {
            this.messageStatusCallback(messageId, 'failed');
          }
        } else {
          // Schedule next retry with exponential backoff
          const backoffDelay =
            RETRY_BASE_DELAY_MS * Math.pow(2, queuedMessage.attempts);
          queuedMessage.nextRetryTime = now + backoffDelay;
          console.log(
            '[MessageService] Next retry in',
            backoffDelay,
            'ms',
          );
        }
      }
    }
  }

  /**
   * Register callback for message reception events
   *
   * @param callback - Function to call when a message is received
   */
  onMessageReceived(callback: MessageReceivedCallback): void {
    this.messageReceivedCallback = callback;
  }

  /**
   * Register callback for message status updates
   *
   * @param callback - Function to call when message status changes
   */
  onMessageStatus(callback: MessageStatusCallback): void {
    this.messageStatusCallback = callback;
  }

  /**
   * Generate a UUID v4 string
   *
   * Creates a random UUID for message identification.
   * Uses Math.random for random generation (sufficient for message IDs).
   *
   * @returns UUID v4 string in format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * @private
   */
  private generateUUID(): string {
    // Generate random bytes using Math.random
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }

    // Set version (4) and variant bits
    // Version 4: Set bits 4-7 of byte 6 to 0100
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Variant: Set bits 6-7 of byte 8 to 10
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // Convert to hex string with hyphens
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
  }

  /**
   * Derive sender ID from public key
   *
   * Computes the first 16 characters of the SHA-256 hash of the public key.
   * This serves as a compact identifier for routing messages.
   *
   * @param publicKey - X25519 public key (32 bytes)
   * @returns First 16 hex characters of SHA-256 hash
   * @private
   */
  private deriveSenderId(publicKey: Uint8Array): string {
    // Use the fingerprint generation from CryptoService
    // which computes SHA-512 and returns first 32 chars
    // We only need first 16 chars for sender ID
    const fingerprint = this.cryptoService.generateTrustFingerprint(publicKey);
    return fingerprint.substring(0, 16);
  }

  /**
   * Clean up and destroy the message service
   *
   * Stops the retry timer and clears the message queue.
   * Should be called when the service is no longer needed.
   */
  destroy(): void {
    console.log('[MessageService] Destroying service');

    // Stop retry timer
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    // Clear message queue
    this.messageQueue.clear();

    console.log('[MessageService] Service destroyed');
  }
}
