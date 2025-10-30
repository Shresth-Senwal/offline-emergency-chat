/**
 * BLEService - Bluetooth Low Energy communication service
 *
 * This service manages all BLE operations for the emergency mesh chat application:
 * - Device discovery through advertising and scanning
 * - Connection establishment and management
 * - Data transmission via GATT characteristics
 * - Connection state monitoring and automatic reconnection
 * - Permission handling and error recovery
 *
 * The service uses react-native-ble-plx for cross-platform BLE operations
 * and implements the GATT service schema defined in the design document.
 *
 * Architecture:
 * - Singleton pattern for centralized BLE management
 * - Callback-based event system for device discovery, data reception, and connection changes
 * - Automatic reconnection logic for resilient mesh network operation
 * - Comprehensive error handling for permissions, Bluetooth state, and connection issues
 *
 * Requirements addressed:
 * - 1.1: Advertise GATT service for peer discovery
 * - 1.2: Scan for peers at regular intervals
 * - 1.3: Establish connections within timeout
 * - 1.4: Maintain connections until peer moves out of range
 * - 1.5: Resume scanning after unexpected disconnection
 * - 4.3: Transmit message envelopes via BLE
 * - 9.3: Cross-platform BLE compatibility
 *
 * Dependencies:
 * - react-native-ble-plx: BLE operations
 * - constants.ts: UUIDs, timeouts, intervals
 *
 * @module BLEService
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { encode as base64Encode, decode as base64Decode } from 'base-64';
import {
  BLE_SERVICE_UUID,
  BLE_TX_CHARACTERISTIC_UUID,
  BLE_RX_CHARACTERISTIC_UUID,
  SCAN_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
  RECONNECT_DELAY_MS,
} from '../utils/constants';

/**
 * Callback type for device discovery events.
 * Invoked when a new peer device is discovered during scanning.
 */
type DeviceDiscoveredCallback = (device: Device) => void;

/**
 * Callback type for data reception events.
 * Invoked when data is received from a connected peer via RX characteristic.
 */
type DataReceivedCallback = (deviceId: string, data: Uint8Array) => void;

/**
 * Callback type for connection state change events.
 * Invoked when a peer connects or disconnects.
 */
type ConnectionStateChangeCallback = (
  deviceId: string,
  connected: boolean,
) => void;

/**
 * BLEService class - Manages all Bluetooth Low Energy operations
 *
 * This class provides a high-level interface for BLE operations, abstracting
 * the complexity of the react-native-ble-plx library and implementing
 * application-specific logic for mesh networking.
 *
 * Usage:
 * ```typescript
 * const bleService = new BLEService();
 * await bleService.initialize();
 * bleService.onDeviceDiscovered((device) => console.log('Found:', device.id));
 * bleService.startScanning();
 * ```
 */
export class BLEService {
  private manager: BleManager;
  private scanning: boolean = false;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private connectedDevices: Map<string, Device> = new Map();
  private connectionTimeouts: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Callback registrations
  private deviceDiscoveredCallback: DeviceDiscoveredCallback | null = null;
  private dataReceivedCallback: DataReceivedCallback | null = null;
  private connectionStateChangeCallback: ConnectionStateChangeCallback | null =
    null;

  /**
   * Constructor - Initializes the BLE manager
   *
   * Creates a new BleManager instance from react-native-ble-plx.
   * The manager must be initialized via initialize() before use.
   */
  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Initialize the BLE service
   *
   * This method must be called before any other BLE operations.
   * It performs the following:
   * 1. Requests necessary Bluetooth permissions (platform-specific)
   * 2. Checks if Bluetooth is enabled
   * 3. Sets up BLE state monitoring
   *
   * On Android, requests BLUETOOTH_SCAN, BLUETOOTH_CONNECT, BLUETOOTH_ADVERTISE,
   * and ACCESS_FINE_LOCATION permissions as required by Android 12+.
   *
   * On iOS, permissions are requested automatically when BLE operations begin,
   * but Info.plist must contain NSBluetoothAlwaysUsageDescription.
   *
   * @throws Error if permissions are denied or Bluetooth is disabled
   * @returns Promise that resolves when initialization is complete
   *
   * Requirement 1.1: Initialize BLE and request permissions
   * Requirement 9.3: Cross-platform permission handling
   */
  async initialize(): Promise<void> {
    try {
      // Request platform-specific permissions
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      }

      // Check Bluetooth state
      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        throw new Error(`Bluetooth is not enabled. Current state: ${state}`);
      }

      console.log('[BLEService] Initialized successfully');
    } catch (error) {
      console.error('[BLEService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request Android Bluetooth permissions
   *
   * Android 12+ (API 31+) requires explicit runtime permissions for BLE operations:
   * - BLUETOOTH_SCAN: Required for scanning
   * - BLUETOOTH_CONNECT: Required for connecting to devices
   * - BLUETOOTH_ADVERTISE: Required for advertising
   * - ACCESS_FINE_LOCATION: Required for BLE scanning (legacy requirement)
   *
   * @private
   * @throws Error if any required permission is denied
   */
  private async requestAndroidPermissions(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Android 12+ (API 31+) permissions
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          throw new Error('Bluetooth permissions denied');
        }
      } else {
        // Legacy Android permissions (pre-Android 12)
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error(
            'Location permission denied (required for BLE scanning)',
          );
        }
      }

      console.log('[BLEService] Android permissions granted');
    } catch (error) {
      console.error('[BLEService] Permission request failed:', error);
      throw error;
    }
  }

  /**
   * Start advertising the GATT service
   *
   * Advertises the emergency chat GATT service so other devices can discover
   * this device. The advertisement includes the service UUID defined in constants.
   *
   * Note: react-native-ble-plx does not provide direct advertising APIs.
   * On iOS, advertising is handled by the peripheral manager (not implemented in MVP).
   * On Android, advertising requires additional native modules (not implemented in MVP).
   *
   * For MVP, we rely on scanning and connection establishment. Full peripheral
   * mode advertising would be a future enhancement.
   *
   * @returns Promise that resolves when advertising starts
   *
   * Requirement 1.1: Advertise GATT service for peer discovery
   */
  async startAdvertising(): Promise<void> {
    // Note: react-native-ble-plx does not support advertising in the current version.
    // This would require platform-specific native modules or a different library.
    // For MVP, devices act as central (scanner/connector) only.
    // Future enhancement: Implement peripheral mode with native modules.
    console.log(
      '[BLEService] Advertising not implemented in MVP (central mode only)',
    );
  }

  /**
   * Start scanning for peer devices
   *
   * Initiates periodic BLE scanning for devices advertising the emergency chat
   * service UUID. Scanning runs at intervals defined by SCAN_INTERVAL_MS.
   *
   * Each scan cycle:
   * 1. Starts a BLE scan for devices with the service UUID
   * 2. Invokes deviceDiscoveredCallback for each discovered device
   * 3. Stops after SCAN_INTERVAL_MS and repeats
   *
   * Scanning continues until stopScanning() is called.
   *
   * Requirement 1.2: Scan for peers at intervals not exceeding 5 seconds
   */
  startScanning(): void {
    if (this.scanning) {
      console.log('[BLEService] Already scanning');
      return;
    }

    this.scanning = true;
    console.log('[BLEService] Starting periodic scan');

    // Start first scan immediately
    this.performScan();

    // Set up periodic scanning
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, SCAN_INTERVAL_MS);
  }

  /**
   * Perform a single scan cycle
   *
   * Scans for devices advertising the emergency chat service UUID.
   * Discovered devices are reported via the deviceDiscoveredCallback.
   *
   * The scan filters for devices with the specific service UUID to avoid
   * discovering irrelevant BLE devices and reduce battery consumption.
   *
   * @private
   */
  private performScan(): void {
    console.log('[BLEService] Performing scan cycle');

    // Scan for devices with our service UUID
    // allowDuplicates: true allows discovering the same device multiple times
    // to get updated RSSI values
    this.manager.startDeviceScan(
      [BLE_SERVICE_UUID],
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          console.error('[BLEService] Scan error:', error);
          return;
        }

        if (device && this.deviceDiscoveredCallback) {
          console.log(
            '[BLEService] Discovered device:',
            device.id,
            'RSSI:',
            device.rssi,
          );
          this.deviceDiscoveredCallback(device);
        }
      },
    );
  }

  /**
   * Stop scanning for peer devices
   *
   * Halts the periodic BLE scan and clears the scan interval.
   *
   * Requirement 1.2: Ability to stop scanning
   */
  stopScanning(): void {
    if (!this.scanning) {
      return;
    }

    console.log('[BLEService] Stopping scan');
    this.scanning = false;

    // Stop the BLE scan
    this.manager.stopDeviceScan();

    // Clear the periodic scan interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Connect to a peer device
   *
   * Establishes a BLE connection with the specified device and discovers
   * the emergency chat GATT service and characteristics.
   *
   * Connection process:
   * 1. Attempt connection with timeout (CONNECTION_TIMEOUT_MS)
   * 2. Discover services and characteristics
   * 3. Set up RX characteristic monitoring for incoming data
   * 4. Register connection state listener
   * 5. Store device in connected devices map
   *
   * If connection fails or times out, an error is thrown.
   *
   * @param deviceId - The BLE device ID to connect to
   * @throws Error if connection fails or times out
   * @returns Promise that resolves when connection is established
   *
   * Requirement 1.3: Establish connection within 3 seconds
   * Requirement 1.4: Maintain connection until peer moves out of range
   */
  async connectToPeer(deviceId: string): Promise<void> {
    try {
      console.log('[BLEService] Connecting to device:', deviceId);

      // Set up connection timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(`Connection timeout after ${CONNECTION_TIMEOUT_MS}ms`),
          );
        }, CONNECTION_TIMEOUT_MS);
        this.connectionTimeouts.set(deviceId, timeout);
      });

      // Attempt connection with timeout
      const connectionPromise = this.manager.connectToDevice(deviceId, {
        autoConnect: false, // Don't auto-reconnect (we handle this manually)
        requestMTU: 512, // Request maximum MTU for efficient data transfer
      });

      const device = await Promise.race([connectionPromise, timeoutPromise]);

      // Clear connection timeout
      const timeout = this.connectionTimeouts.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        this.connectionTimeouts.delete(deviceId);
      }

      console.log('[BLEService] Connected to device:', deviceId);

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      console.log('[BLEService] Discovered services for device:', deviceId);

      // Set up monitoring for RX characteristic (incoming data)
      this.monitorRXCharacteristic(device);

      // Set up disconnection listener
      this.setupDisconnectionListener(device);

      // Store connected device
      this.connectedDevices.set(deviceId, device);

      // Notify connection state change
      if (this.connectionStateChangeCallback) {
        this.connectionStateChangeCallback(deviceId, true);
      }

      console.log(
        '[BLEService] Device fully connected and monitored:',
        deviceId,
      );
    } catch (error) {
      console.error('[BLEService] Connection failed:', deviceId, error);

      // Clear connection timeout
      const timeout = this.connectionTimeouts.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        this.connectionTimeouts.delete(deviceId);
      }

      throw error;
    }
  }

  /**
   * Monitor RX characteristic for incoming data
   *
   * Sets up a notification listener on the RX characteristic to receive
   * incoming message envelopes from the peer device.
   *
   * When data is received:
   * 1. Extract the base64-encoded value from the characteristic
   * 2. Decode to Uint8Array
   * 3. Invoke dataReceivedCallback with device ID and data
   *
   * @private
   * @param device - The connected device to monitor
   */
  private monitorRXCharacteristic(device: Device): void {
    device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_RX_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('[BLEService] RX monitor error:', device.id, error);
          return;
        }

        if (characteristic?.value && this.dataReceivedCallback) {
          // Decode base64 value to Uint8Array
          const data = this.base64ToUint8Array(characteristic.value);
          console.log(
            '[BLEService] Received data from device:',
            device.id,
            'bytes:',
            data.length,
          );
          this.dataReceivedCallback(device.id, data);
        }
      },
    );

    console.log(
      '[BLEService] Monitoring RX characteristic for device:',
      device.id,
    );
  }

  /**
   * Set up disconnection listener
   *
   * Registers a listener for device disconnection events.
   * When a device disconnects unexpectedly:
   * 1. Remove from connected devices map
   * 2. Notify via connectionStateChangeCallback
   * 3. Schedule automatic reconnection attempt after RECONNECT_DELAY_MS
   *
   * @private
   * @param device - The connected device to monitor
   *
   * Requirement 1.5: Resume scanning after unexpected disconnection
   */
  private setupDisconnectionListener(device: Device): void {
    device.onDisconnected((_error, disconnectedDevice) => {
      if (disconnectedDevice) {
        console.log('[BLEService] Device disconnected:', disconnectedDevice.id);

        // Remove from connected devices
        this.connectedDevices.delete(disconnectedDevice.id);

        // Notify connection state change
        if (this.connectionStateChangeCallback) {
          this.connectionStateChangeCallback(disconnectedDevice.id, false);
        }

        // Schedule reconnection attempt after delay
        // This implements automatic reconnection for resilient mesh networking
        const reconnectTimeout = setTimeout(() => {
          console.log(
            '[BLEService] Attempting reconnection to:',
            disconnectedDevice.id,
          );
          this.connectToPeer(disconnectedDevice.id).catch(err => {
            console.error(
              '[BLEService] Reconnection failed:',
              disconnectedDevice.id,
              err,
            );
            // If reconnection fails, resume scanning to find other peers
            if (!this.scanning) {
              this.startScanning();
            }
          });
          this.reconnectTimeouts.delete(disconnectedDevice.id);
        }, RECONNECT_DELAY_MS);

        this.reconnectTimeouts.set(disconnectedDevice.id, reconnectTimeout);
      }
    });
  }

  /**
   * Disconnect from a peer device
   *
   * Terminates the BLE connection with the specified device.
   * Clears any pending reconnection attempts.
   *
   * @param deviceId - The device ID to disconnect from
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnectFromPeer(deviceId: string): Promise<void> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        console.log('[BLEService] Device not connected:', deviceId);
        return;
      }

      console.log('[BLEService] Disconnecting from device:', deviceId);

      // Cancel any pending reconnection attempts
      const reconnectTimeout = this.reconnectTimeouts.get(deviceId);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        this.reconnectTimeouts.delete(deviceId);
      }

      // Disconnect the device
      await this.manager.cancelDeviceConnection(deviceId);

      // Remove from connected devices
      this.connectedDevices.delete(deviceId);

      // Notify connection state change
      if (this.connectionStateChangeCallback) {
        this.connectionStateChangeCallback(deviceId, false);
      }

      console.log('[BLEService] Disconnected from device:', deviceId);
    } catch (error) {
      console.error('[BLEService] Disconnection error:', deviceId, error);
      throw error;
    }
  }

  /**
   * Send data to a peer device
   *
   * Writes a Uint8Array to the TX characteristic of the specified device.
   * Uses writeCharacteristicWithoutResponseForDevice for low-latency transmission.
   *
   * The data should be a serialized message envelope (see messageEnvelope.ts).
   *
   * @param deviceId - The device ID to send data to
   * @param data - The data to send (message envelope as Uint8Array)
   * @throws Error if device is not connected or write fails
   * @returns Promise that resolves when data is sent
   *
   * Requirement 4.3: Transmit message envelopes via BLE
   */
  async sendData(deviceId: string, data: Uint8Array): Promise<void> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        throw new Error(`Device not connected: ${deviceId}`);
      }

      // Convert Uint8Array to base64 for BLE transmission
      const base64Data = this.uint8ArrayToBase64(data);

      console.log(
        '[BLEService] Sending data to device:',
        deviceId,
        'bytes:',
        data.length,
      );

      // Write to TX characteristic without response (faster, no ACK)
      await device.writeCharacteristicWithoutResponseForService(
        BLE_SERVICE_UUID,
        BLE_TX_CHARACTERISTIC_UUID,
        base64Data,
      );

      console.log('[BLEService] Data sent successfully to device:', deviceId);
    } catch (error) {
      console.error('[BLEService] Send data error:', deviceId, error);
      throw error;
    }
  }

  /**
   * Register callback for device discovery events
   *
   * The callback is invoked whenever a peer device is discovered during scanning.
   *
   * @param callback - Function to call when a device is discovered
   */
  onDeviceDiscovered(callback: DeviceDiscoveredCallback): void {
    this.deviceDiscoveredCallback = callback;
  }

  /**
   * Register callback for data reception events
   *
   * The callback is invoked whenever data is received from a connected peer
   * via the RX characteristic.
   *
   * @param callback - Function to call when data is received
   */
  onDataReceived(callback: DataReceivedCallback): void {
    this.dataReceivedCallback = callback;
  }

  /**
   * Register callback for connection state change events
   *
   * The callback is invoked whenever a peer connects or disconnects.
   *
   * @param callback - Function to call when connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateChangeCallback): void {
    this.connectionStateChangeCallback = callback;
  }

  /**
   * Convert Uint8Array to base64 string
   *
   * react-native-ble-plx requires characteristic values to be base64-encoded.
   *
   * @private
   * @param data - Uint8Array to convert
   * @returns Base64-encoded string
   */
  private uint8ArrayToBase64(data: Uint8Array): string {
    // Convert Uint8Array to binary string
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    // Encode to base64 using base-64 library
    return base64Encode(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   *
   * Decodes base64-encoded characteristic values received from BLE.
   *
   * @private
   * @param base64 - Base64-encoded string
   * @returns Decoded Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    // Decode base64 to binary string using base-64 library
    const binary = base64Decode(base64);
    // Convert binary string to Uint8Array
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      data[i] = binary.charCodeAt(i);
    }
    return data;
  }

  /**
   * Get list of currently connected device IDs
   *
   * @returns Array of connected device IDs
   */
  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  /**
   * Check if a device is currently connected
   *
   * @param deviceId - Device ID to check
   * @returns True if device is connected, false otherwise
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  /**
   * Clean up and destroy the BLE service
   *
   * Stops scanning, disconnects all devices, and destroys the BLE manager.
   * Should be called when the app is closing or BLE is no longer needed.
   */
  async destroy(): Promise<void> {
    console.log('[BLEService] Destroying service');

    // Stop scanning
    this.stopScanning();

    // Clear all timeouts
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.connectionTimeouts.clear();
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();

    // Disconnect all devices
    const disconnectPromises = Array.from(this.connectedDevices.keys()).map(
      deviceId =>
        this.disconnectFromPeer(deviceId).catch(err =>
          console.error(
            '[BLEService] Error disconnecting device:',
            deviceId,
            err,
          ),
        ),
    );
    await Promise.all(disconnectPromises);

    // Destroy the BLE manager
    this.manager.destroy();

    console.log('[BLEService] Service destroyed');
  }
}
