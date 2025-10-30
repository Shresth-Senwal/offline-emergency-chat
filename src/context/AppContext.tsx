/**
 * AppContext - Global state management for the Offline Emergency Mesh Chat
 *
 * This module provides centralized state management using React Context API.
 * It manages all application state including:
 * - Peer discovery and connection tracking
 * - Message history for all conversations
 * - Current UI state (selected peer, scanning status)
 * - User's cryptographic identity
 * - Duplicate detection cache
 *
 * The AppContext initializes all services (CryptoService, BLEService, MessageService,
 * StorageService) and sets up callbacks to update state based on BLE events.
 * It also handles loading persisted data on mount and provides state update functions
 * for components to use.
 *
 * Architecture:
 * - Single source of truth for all application state
 * - Service initialization and lifecycle management
 * - Event-driven state updates via service callbacks
 * - Persistent data loading and restoration
 * - Type-safe state access via custom hook
 *
 * Requirements addressed:
 * - 1.2: Track discovered and connected peers
 * - 1.3: Update state on device discovery and connection changes
 * - 2.1: Store and manage user's public key
 * - 5.3: Manage message history for all conversations
 *
 * Dependencies:
 * - React: Context, hooks, and component lifecycle
 * - All service classes: CryptoService, BLEService, MessageService, StorageService
 * - DuplicateDetector: Duplicate message detection
 * - types.ts: AppState, Peer, Message interfaces
 *
 * Usage:
 * ```typescript
 * // In App.tsx
 * <AppProvider>
 *   <YourComponents />
 * </AppProvider>
 *
 * // In any component
 * const { peers, messages, addMessage, sendMessage } = useAppState();
 * ```
 *
 * @module AppContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Device } from "react-native-ble-plx";
import { ExpoCryptoService } from "../services/ExpoCryptoService";
import { BLEService } from "../services/BLEService";
import { MessageService } from "../services/MessageService";
import { StorageService } from "../services/StorageService";
import { DuplicateDetector } from "../utils/duplicateDetection";
import { AppState, Peer, Message } from "./types";
import { CryptoService } from "../services/CryptoService";

/**
 * Context value interface defining all state and actions available to consumers.
 *
 * This interface provides:
 * - Read-only state access (peers, messages, etc.)
 * - State update functions (addPeer, updatePeer, etc.)
 * - Service instances for direct access when needed
 * - Message sending functionality
 */
interface AppContextValue extends AppState {
  // State update functions
  addPeer: (peer: Peer) => void;
  updatePeer: (peerId: string, updates: Partial<Peer>) => void;
  removePeer: (peerId: string) => void;
  addMessage: (message: Message) => void;
  setCurrentPeer: (peerId: string | null) => void;
  setBleEnabled: (enabled: boolean) => void;
  setScanning: (scanning: boolean) => void;

  // Service instances
  cryptoService: CryptoService | ExpoCryptoService | null;
  bleService: BLEService | null;
  messageService: MessageService | null;
  storageService: StorageService | null;

  // Actions
  sendMessage: (recipientId: string, text: string) => Promise<Message>;
  startScanning: () => void;
  stopScanning: () => void;
  connectToPeer: (deviceId: string) => Promise<void>;
  disconnectFromPeer: (deviceId: string) => Promise<void>;
}

/**
 * Default context value used before provider initialization.
 * Throws errors if context is accessed outside of provider.
 */
const defaultContextValue: AppContextValue = {
  peers: new Map(),
  messages: new Map(),
  currentPeerId: null,
  ownPublicKey: null,
  duplicateCache: new Map(),
  bleEnabled: false,
  scanning: false,
  addPeer: () => {
    throw new Error("AppContext not initialized");
  },
  updatePeer: () => {
    throw new Error("AppContext not initialized");
  },
  removePeer: () => {
    throw new Error("AppContext not initialized");
  },
  addMessage: () => {
    throw new Error("AppContext not initialized");
  },
  setCurrentPeer: () => {
    throw new Error("AppContext not initialized");
  },
  setBleEnabled: () => {
    throw new Error("AppContext not initialized");
  },
  setScanning: () => {
    throw new Error("AppContext not initialized");
  },
  cryptoService: null,
  bleService: null,
  messageService: null,
  storageService: null,
  sendMessage: async () => {
    throw new Error("AppContext not initialized");
  },
  startScanning: () => {
    throw new Error("AppContext not initialized");
  },
  stopScanning: () => {
    throw new Error("AppContext not initialized");
  },
  connectToPeer: async () => {
    throw new Error("AppContext not initialized");
  },
  disconnectFromPeer: async () => {
    throw new Error("AppContext not initialized");
  },
};

/**
 * React Context for global application state.
 * Provides state and actions to all child components.
 */
const AppContext = createContext<AppContextValue>(defaultContextValue);

/**
 * Props for AppProvider component.
 */
interface AppProviderProps {
  children: ReactNode;
}

/**
 * AppProvider component - Provides global state to the application.
 *
 * This component:
 * 1. Initializes all services on mount
 * 2. Loads persisted data (keys, messages, cache)
 * 3. Sets up BLE callbacks for state updates
 * 4. Provides state and actions via context
 * 5. Cleans up services on unmount
 *
 * The provider should wrap the entire application at the root level.
 *
 * @param props - Component props containing children
 * @returns Provider component wrapping children
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // State management
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [currentPeerId, setCurrentPeerId] = useState<string | null>(null);
  const [ownPublicKey, setOwnPublicKey] = useState<Uint8Array | null>(null);
  const [duplicateCache, setDuplicateCache] = useState<Map<string, number>>(
    new Map()
  );
  const [bleEnabled, setBleEnabledState] = useState<boolean>(false);
  const [scanning, setScanningState] = useState<boolean>(false);

  // Service instances
  const [storageService] = useState<StorageService>(() => new StorageService());
  const [cryptoService] = useState<ExpoCryptoService>(
    () => new ExpoCryptoService(storageService)
  );
  const [bleService] = useState<BLEService>(() => new BLEService());
  const [duplicateDetector] = useState<DuplicateDetector>(
    () => new DuplicateDetector()
  );
  const [messageService] = useState<MessageService>(
    () =>
      new MessageService(
        cryptoService,
        bleService,
        storageService,
        duplicateDetector
      )
  );

  const [_initialized, setInitialized] = useState<boolean>(false);

  /**
   * Initialize services and load persisted data on mount.
   *
   * This effect runs once when the component mounts and performs:
   * 1. CryptoService initialization (load or generate keys)
   * 2. BLEService initialization (request permissions, check state)
   * 3. Load persisted messages from storage
   * 4. Load duplicate detection cache from storage
   * 5. Set up BLE callbacks for state updates
   * 6. Start BLE scanning
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("[AppContext] Initializing application...");

        // Initialize CryptoService (load or generate keys)
        await cryptoService.initialize();
        const publicKey = cryptoService.getPublicKey();
        setOwnPublicKey(publicKey);
        console.log("[AppContext] CryptoService initialized");

        // Initialize BLEService (request permissions, check state)
        await bleService.initialize();
        setBleEnabledState(true);
        console.log("[AppContext] BLEService initialized");

        // Load duplicate detection cache from storage
        const cachedDuplicates = await storageService.getDuplicateCache();
        setDuplicateCache(cachedDuplicates);
        // Update duplicate detector with loaded cache
        for (const [messageId, _timestamp] of cachedDuplicates.entries()) {
          if (!duplicateDetector.isDuplicate(messageId)) {
            duplicateDetector.markAsProcessed(messageId);
          }
        }
        console.log(
          "[AppContext] Loaded duplicate cache:",
          cachedDuplicates.size,
          "entries"
        );

        // Set up BLE callbacks
        setupBLECallbacks();

        // Start scanning for peers
        bleService.startScanning();
        setScanningState(true);
        console.log("[AppContext] Started BLE scanning");

        setInitialized(true);
        console.log("[AppContext] Application initialized successfully");
      } catch (error) {
        console.error("[AppContext] Initialization failed:", error);
        // Set BLE as disabled if initialization fails
        setBleEnabledState(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      console.log("[AppContext] Cleaning up services...");
      bleService.stopScanning();
      bleService.destroy();
      messageService.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run once on mount

  /**
   * Set up BLE callbacks for state updates.
   *
   * Registers callbacks with BLEService and MessageService to update
   * application state when BLE events occur:
   * - Device discovered: Add or update peer
   * - Connection state change: Update peer connection status
   * - Data received: Handle incoming message
   * - Message received: Add message to conversation
   * - Message status: Update message delivery status
   */
  const setupBLECallbacks = useCallback(() => {
    // Device discovered callback
    bleService.onDeviceDiscovered((device: Device) => {
      console.log("[AppContext] Device discovered:", device.id);
      handleDeviceDiscovered(device);
    });

    // Connection state change callback
    bleService.onConnectionStateChange(
      (deviceId: string, connected: boolean) => {
        console.log(
          "[AppContext] Connection state changed:",
          deviceId,
          connected
        );
        handleConnectionStateChange(deviceId, connected);
      }
    );

    // Data received callback
    bleService.onDataReceived((deviceId: string, data: Uint8Array) => {
      console.log("[AppContext] Data received from:", deviceId);
      handleDataReceived(deviceId, data);
    });

    // Message received callback
    messageService.onMessageReceived((message: Message) => {
      console.log("[AppContext] Message received:", message.id);
      handleMessageReceived(message);
    });

    // Message status callback
    messageService.onMessageStatus(
      (messageId: string, status: "delivered" | "failed") => {
        console.log("[AppContext] Message status:", messageId, status);
        handleMessageStatus(messageId, status);
      }
    );

    console.log("[AppContext] BLE callbacks registered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bleService, messageService]);

  /**
   * Handle device discovered event.
   *
   * When a new device is discovered during scanning:
   * 1. Check if peer already exists
   * 2. If new, create peer object and add to state
   * 3. If existing, update RSSI and lastSeen
   * 4. Attempt to connect if not already connected
   *
   * @param device - Discovered BLE device
   */
  const handleDeviceDiscovered = useCallback(
    (device: Device) => {
      setPeers((prevPeers) => {
        const newPeers = new Map(prevPeers);
        const existingPeer = newPeers.get(device.id);

        if (existingPeer) {
          // Update existing peer
          newPeers.set(device.id, {
            ...existingPeer,
            rssi: device.rssi || existingPeer.rssi,
            lastSeen: Date.now(),
          });
        } else {
          // Create new peer
          const newPeer: Peer = {
            id: device.id,
            publicKey: null,
            sharedSecret: null,
            name: device.name || device.id.substring(0, 8),
            connected: false,
            verified: false,
            rssi: device.rssi || -100,
            lastSeen: Date.now(),
          };
          newPeers.set(device.id, newPeer);

          // Attempt to connect to new peer
          bleService
            .connectToPeer(device.id)
            .then(() => {
              console.log("[AppContext] Connected to peer:", device.id);
            })
            .catch((err) => {
              console.error(
                "[AppContext] Failed to connect to peer:",
                device.id,
                err
              );
            });
        }

        return newPeers;
      });
    },
    [bleService]
  );

  /**
   * Handle connection state change event.
   *
   * Updates peer connection status when a peer connects or disconnects.
   * Also loads message history for newly connected peers.
   *
   * @param deviceId - BLE device ID
   * @param connected - New connection state
   */
  const handleConnectionStateChange = useCallback(
    (deviceId: string, connected: boolean) => {
      setPeers((prevPeers) => {
        const newPeers = new Map(prevPeers);
        const peer = newPeers.get(deviceId);

        if (peer) {
          newPeers.set(deviceId, {
            ...peer,
            connected,
            lastSeen: Date.now(),
          });

          // Load message history for newly connected peer
          if (connected) {
            storageService
              .getMessages(deviceId)
              .then((loadedMessages) => {
                if (loadedMessages.length > 0) {
                  setMessages((prevMessages) => {
                    const newMessages = new Map(prevMessages);
                    newMessages.set(deviceId, loadedMessages);
                    return newMessages;
                  });
                  console.log(
                    "[AppContext] Loaded",
                    loadedMessages.length,
                    "messages for peer:",
                    deviceId
                  );
                }
              })
              .catch((err) => {
                console.error(
                  "[AppContext] Failed to load messages for peer:",
                  deviceId,
                  err
                );
              });
          }
        }

        return newPeers;
      });
    },
    [storageService]
  );

  /**
   * Handle data received event.
   *
   * Processes incoming BLE data by passing it to MessageService
   * for deserialization, decryption, and relay handling.
   *
   * @param deviceId - BLE device ID that sent the data
   * @param data - Raw binary data received
   */
  const handleDataReceived = useCallback(
    (deviceId: string, data: Uint8Array) => {
      // Pass to MessageService for processing
      messageService
        .handleIncomingMessage(deviceId, data, peers)
        .catch((err) => {
          console.error("[AppContext] Failed to handle incoming message:", err);
        });
    },
    [messageService, peers]
  );

  /**
   * Handle message received event.
   *
   * Adds a newly received (and decrypted) message to the conversation
   * with the appropriate peer.
   *
   * @param message - Received message object
   */
  const handleMessageReceived = useCallback((message: Message) => {
    setMessages((prevMessages) => {
      const newMessages = new Map(prevMessages);
      const peerMessages = newMessages.get(message.peerId) || [];
      newMessages.set(message.peerId, [...peerMessages, message]);
      return newMessages;
    });
  }, []);

  /**
   * Handle message status update event.
   *
   * Updates the delivery status of a sent message.
   *
   * @param messageId - Message ID to update
   * @param status - New status ('delivered' or 'failed')
   */
  const handleMessageStatus = useCallback(
    (messageId: string, status: "delivered" | "failed") => {
      setMessages((prevMessages) => {
        const newMessages = new Map(prevMessages);

        // Find and update the message across all conversations
        for (const [peerId, peerMessages] of newMessages.entries()) {
          const messageIndex = peerMessages.findIndex(
            (m) => m.id === messageId
          );
          if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              delivered: status === "delivered",
              failed: status === "failed",
            };
            newMessages.set(peerId, updatedMessages);
            break;
          }
        }

        return newMessages;
      });
    },
    []
  );

  /**
   * Add a new peer to the state.
   *
   * @param peer - Peer object to add
   */
  const addPeer = useCallback((peer: Peer) => {
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      newPeers.set(peer.id, peer);
      return newPeers;
    });
  }, []);

  /**
   * Update an existing peer in the state.
   *
   * @param peerId - ID of peer to update
   * @param updates - Partial peer object with fields to update
   */
  const updatePeer = useCallback((peerId: string, updates: Partial<Peer>) => {
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      const existingPeer = newPeers.get(peerId);

      if (existingPeer) {
        newPeers.set(peerId, {
          ...existingPeer,
          ...updates,
        });
      }

      return newPeers;
    });
  }, []);

  /**
   * Remove a peer from the state.
   *
   * @param peerId - ID of peer to remove
   */
  const removePeer = useCallback((peerId: string) => {
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      newPeers.delete(peerId);
      return newPeers;
    });
  }, []);

  /**
   * Add a message to the conversation with a peer.
   *
   * @param message - Message object to add
   */
  const addMessage = useCallback((message: Message) => {
    setMessages((prevMessages) => {
      const newMessages = new Map(prevMessages);
      const peerMessages = newMessages.get(message.peerId) || [];
      newMessages.set(message.peerId, [...peerMessages, message]);
      return newMessages;
    });
  }, []);

  /**
   * Set the currently selected peer for conversation view.
   *
   * @param peerId - ID of peer to select, or null for peer list view
   */
  const setCurrentPeer = useCallback((peerId: string | null) => {
    setCurrentPeerId(peerId);
  }, []);

  /**
   * Set BLE enabled state.
   *
   * @param enabled - True if BLE is enabled, false otherwise
   */
  const setBleEnabled = useCallback((enabled: boolean) => {
    setBleEnabledState(enabled);
  }, []);

  /**
   * Set scanning state.
   *
   * @param isScanning - True if scanning is active, false otherwise
   */
  const setScanning = useCallback((isScanning: boolean) => {
    setScanningState(isScanning);
  }, []);

  /**
   * Send a message to a peer.
   *
   * Wrapper around MessageService.sendMessage that also updates local state.
   *
   * @param recipientId - ID of peer to send message to
   * @param text - Message text to send
   * @returns Promise resolving to the created message object
   */
  const sendMessage = useCallback(
    async (recipientId: string, text: string): Promise<Message> => {
      const message = await messageService.sendMessage(
        recipientId,
        text,
        peers
      );

      // Add message to local state
      addMessage(message);

      return message;
    },
    [messageService, peers, addMessage]
  );

  /**
   * Start BLE scanning for peers.
   */
  const startScanning = useCallback(() => {
    bleService.startScanning();
    setScanningState(true);
  }, [bleService]);

  /**
   * Stop BLE scanning.
   */
  const stopScanning = useCallback(() => {
    bleService.stopScanning();
    setScanningState(false);
  }, [bleService]);

  /**
   * Connect to a peer device.
   *
   * @param deviceId - BLE device ID to connect to
   */
  const connectToPeer = useCallback(
    async (deviceId: string): Promise<void> => {
      await bleService.connectToPeer(deviceId);
    },
    [bleService]
  );

  /**
   * Disconnect from a peer device.
   *
   * @param deviceId - BLE device ID to disconnect from
   */
  const disconnectFromPeer = useCallback(
    async (deviceId: string): Promise<void> => {
      await bleService.disconnectFromPeer(deviceId);
    },
    [bleService]
  );

  // Context value
  const contextValue: AppContextValue = {
    peers,
    messages,
    currentPeerId,
    ownPublicKey,
    duplicateCache,
    bleEnabled,
    scanning,
    addPeer,
    updatePeer,
    removePeer,
    addMessage,
    setCurrentPeer,
    setBleEnabled,
    setScanning,
    cryptoService,
    bleService,
    messageService,
    storageService,
    sendMessage,
    startScanning,
    stopScanning,
    connectToPeer,
    disconnectFromPeer,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

/**
 * Custom hook to access application state and actions.
 *
 * This hook provides type-safe access to the AppContext.
 * It must be used within a component that is a child of AppProvider.
 *
 * @returns AppContext value with state and actions
 * @throws Error if used outside of AppProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { peers, messages, sendMessage } = useAppState();
 *
 *   const handleSend = async () => {
 *     await sendMessage(peerId, 'Hello!');
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export const useAppState = (): AppContextValue => {
  const context = useContext(AppContext);

  if (context === defaultContextValue) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
};
