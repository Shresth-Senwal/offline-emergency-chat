/**
 * Application-wide constants for the Offline Emergency Mesh Chat.
 * 
 * This file centralizes all configuration values, UUIDs, timeouts, and limits
 * used throughout the application. These values are based on:
 * - BLE specification requirements
 * - Performance and battery optimization considerations
 * - Security and reliability requirements
 * - Cross-platform compatibility constraints
 * 
 * Requirements addressed:
 * - 1.1: BLE service and characteristic UUIDs for peer discovery
 * - 1.2: Scan interval for periodic peer discovery
 * - 1.3: Connection timeout for establishing BLE connections
 * - 4.2: Maximum message length constraint
 * - 6.2: Initial TTL for multi-hop relay
 * - 7.4: Cache expiration for duplicate detection
 */

/**
 * BLE GATT Service Configuration
 * 
 * These UUIDs define the custom GATT service and characteristics used for
 * emergency mesh chat communication. All devices must use identical UUIDs
 * to discover and communicate with each other.
 * 
 * Service UUID: Custom 128-bit UUID for emergency chat service
 * TX Characteristic: Used for writing outgoing messages (client -> server)
 * RX Characteristic: Used for receiving incoming messages (server -> client via notifications)
 */

/** 
 * Custom GATT service UUID for emergency mesh chat.
 * All devices advertise and scan for this service UUID.
 */
export const BLE_SERVICE_UUID = '0000FE9F-0000-1000-8000-00805F9B34FB';

/**
 * TX (transmit) characteristic UUID for sending messages.
 * Supports write operations without response for low latency.
 */
export const BLE_TX_CHARACTERISTIC_UUID = '0000FEA0-0000-1000-8000-00805F9B34FB';

/**
 * RX (receive) characteristic UUID for receiving messages.
 * Supports notifications for asynchronous message delivery.
 */
export const BLE_RX_CHARACTERISTIC_UUID = '0000FEA1-0000-1000-8000-00805F9B34FB';

/**
 * BLE Operation Timing Configuration
 * 
 * These values balance discovery speed, battery consumption, and reliability.
 */

/**
 * Interval between BLE scan cycles in milliseconds.
 * 
 * 5 seconds provides a good balance between:
 * - Fast peer discovery (users see new peers within 5s)
 * - Battery efficiency (not scanning continuously)
 * - Network stability (allows time for connections to establish)
 * 
 * Requirement 1.2: Scan at intervals not exceeding 5 seconds
 */
export const SCAN_INTERVAL_MS = 5000;

/**
 * Maximum time to wait for BLE connection establishment in milliseconds.
 * 
 * If a connection attempt doesn't succeed within this timeout,
 * it's considered failed and the app will retry or move on.
 * 
 * 3 seconds is sufficient for most BLE connection handshakes while
 * preventing indefinite hangs on unresponsive devices.
 * 
 * Requirement 1.3: Establish connection within 3 seconds
 */
export const CONNECTION_TIMEOUT_MS = 3000;

/**
 * Delay before resuming scan after unexpected peer disconnection.
 * 
 * 2 seconds allows time for cleanup and prevents rapid scan/connect cycles
 * that could drain battery or cause connection instability.
 * 
 * Requirement 1.5: Resume scanning within 2 seconds after disconnect
 */
export const RECONNECT_DELAY_MS = 2000;

/**
 * Message Configuration
 * 
 * These limits ensure messages fit within BLE MTU constraints and
 * prevent abuse or performance issues.
 */

/**
 * Maximum allowed message length in characters.
 * 
 * 500 characters ensures:
 * - Messages fit within BLE MTU after encryption overhead
 * - Reasonable message size for emergency communication
 * - Fast transmission and relay times
 * 
 * Longer messages would require fragmentation which adds complexity
 * and latency in the MVP implementation.
 * 
 * Requirement 4.1: Validate message length does not exceed 500 characters
 */
export const MAX_MESSAGE_LENGTH = 500;

/**
 * Mesh Relay Configuration
 * 
 * These values control message propagation through the mesh network.
 */

/**
 * Initial TTL (time-to-live) value for new messages.
 * 
 * TTL represents the maximum number of hops a message can traverse.
 * Each relay decrements TTL by 1. When TTL reaches 0, the message
 * is not forwarded further.
 * 
 * 10 hops allows:
 * - Coverage of ~100-300 meters (assuming ~10-30m per hop)
 * - Reasonable network diameter for emergency scenarios
 * - Prevention of infinite message loops
 * 
 * Requirement 6.2: Messages start with TTL of 10, relay if TTL > 0
 */
export const INITIAL_MESSAGE_TTL = 10;

/**
 * Maximum relay processing time in milliseconds.
 * 
 * Target latency for receiving, processing, and forwarding a message.
 * This is a performance goal rather than a hard timeout.
 * 
 * 500ms per hop ensures:
 * - Total latency of ~5s for 10-hop messages
 * - Responsive user experience
 * - Time for decryption and duplicate checking
 * 
 * Requirement 6.4: Complete relay within 500ms per hop
 */
export const MAX_RELAY_LATENCY_MS = 500;

/**
 * Duplicate Detection Configuration
 * 
 * These values manage the cache used to prevent message loops and duplicates.
 */

/**
 * Cache expiration time in milliseconds.
 * 
 * Message IDs are kept in the duplicate detection cache for this duration.
 * After expiration, the entry is removed to prevent unbounded memory growth.
 * 
 * 300 seconds (5 minutes) is sufficient because:
 * - Messages propagate through the network in seconds, not minutes
 * - Prevents memory exhaustion on long-running apps
 * - Extremely unlikely for same message ID to reappear after 5 minutes
 * 
 * Requirement 7.5: Remove cache entries after 300 seconds
 */
export const CACHE_EXPIRATION_MS = 300000;

/**
 * Maximum number of entries in duplicate detection cache.
 * 
 * Limits memory usage by capping cache size. When limit is reached,
 * oldest entries are pruned first.
 * 
 * 1000 entries is sufficient for:
 * - ~3 messages/second sustained for 5 minutes
 * - Typical emergency communication patterns
 * - Reasonable memory footprint (~50KB)
 */
export const MAX_CACHE_ENTRIES = 1000;

/**
 * Storage Configuration
 * 
 * Keys used for AsyncStorage persistence.
 */

/** Storage key for user's X25519 key pair */
export const STORAGE_KEY_KEYPAIR = '@emergency_chat:keypair';

/** Storage key prefix for message history (suffixed with peer ID) */
export const STORAGE_KEY_MESSAGES_PREFIX = '@emergency_chat:messages:';

/** Storage key for duplicate detection cache */
export const STORAGE_KEY_DUPLICATE_CACHE = '@emergency_chat:duplicate_cache';

/** Storage key prefix for trusted peer verification status */
export const STORAGE_KEY_TRUSTED_PEER_PREFIX = '@emergency_chat:trusted:';

/**
 * Cryptography Configuration
 * 
 * Constants related to cryptographic operations.
 */

/** Length of trust fingerprint displayed in QR codes (hex characters) */
export const FINGERPRINT_LENGTH = 32;

/** Protocol version for message envelopes */
export const MESSAGE_ENVELOPE_VERSION = 1;

/**
 * UI Configuration
 * 
 * Constants for user interface behavior.
 */

/** Maximum number of messages to display per conversation (pagination threshold) */
export const MAX_MESSAGES_PER_CONVERSATION = 100;

/** Timeout for displaying peer as disconnected after no activity (ms) */
export const PEER_INACTIVE_TIMEOUT_MS = 60000;

/** Maximum number of retry attempts for failed message sends */
export const MAX_SEND_RETRIES = 3;

/** Base delay for exponential backoff on retry (ms) */
export const RETRY_BASE_DELAY_MS = 1000;
