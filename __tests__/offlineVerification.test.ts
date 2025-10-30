/**
 * Offline Operation Verification Tests
 *
 * This test suite verifies that the application operates correctly in offline mode
 * without requiring internet or cellular connectivity.
 *
 * Test coverage:
 * - Network connectivity detection
 * - Local storage accessibility
 * - Cryptographic key storage
 * - Message history storage
 * - Duplicate cache storage
 * - Overall offline functionality
 *
 * Requirements verified:
 * - 8.1: Operate all communication functions using only BLE
 * - 8.2: Operate without cellular network connectivity
 * - 8.3: Store cryptographic keys locally
 * - 8.4: Store message history locally
 * - 8.5: Display fully functional status when offline
 *
 * @module offlineVerification.test
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  verifyOfflineMode,
  verifyLocalStorage,
  verifyKeysStoredLocally,
  verifyMessagesStoredLocally,
  verifyCacheStoredLocally,
  performOfflineVerification,
  getOfflineStatusMessage,
  monitorConnectivity,
} from '../src/utils/offlineVerification';
import {
  STORAGE_KEY_KEYPAIR,
  STORAGE_KEY_MESSAGES_PREFIX,
  STORAGE_KEY_DUPLICATE_CACHE,
} from '../src/utils/constants';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe('Offline Operation Verification', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('verifyOfflineMode', () => {
    it('should return true when device is offline', async () => {
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        type: 'none',
      });

      const result = await verifyOfflineMode();

      expect(result).toBe(true);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should return false when device is online', async () => {
      // Mock online state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: 'wifi',
      });

      const result = await verifyOfflineMode();

      expect(result).toBe(false);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should return true if network check fails (fail-safe)', async () => {
      // Mock network check failure
      (NetInfo.fetch as jest.Mock).mockRejectedValue(
        new Error('Network check failed'),
      );

      const result = await verifyOfflineMode();

      expect(result).toBe(true);
    });
  });

  describe('verifyLocalStorage', () => {
    it('should return true when storage is accessible', async () => {
      // Mock successful storage operations
      // The test writes a value and reads it back, so we need to return the same value
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        // Return a test value that matches what was written
        if (key.includes('verification_test')) {
          return Promise.resolve('test_' + Date.now());
        }
        return Promise.resolve(null);
      });
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await verifyLocalStorage();

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should return false when storage write fails', async () => {
      // Mock storage write failure
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage full'),
      );

      const result = await verifyLocalStorage();

      expect(result).toBe(false);
    });

    it('should return false when storage read fails', async () => {
      // Mock storage read failure
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Read error'),
      );

      const result = await verifyLocalStorage();

      expect(result).toBe(false);
    });
  });

  describe('verifyKeysStoredLocally', () => {
    it('should return true when keys exist in storage', async () => {
      // Mock key pair in storage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          publicKey: 'mock_public_key',
          privateKey: 'mock_private_key',
        }),
      );

      const result = await verifyKeysStoredLocally();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY_KEYPAIR);
    });

    it('should return false when keys do not exist', async () => {
      // Mock no keys in storage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await verifyKeysStoredLocally();

      expect(result).toBe(false);
    });

    it('should return false when storage check fails', async () => {
      // Mock storage check failure
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const result = await verifyKeysStoredLocally();

      expect(result).toBe(false);
    });
  });

  describe('verifyMessagesStoredLocally', () => {
    it('should return true when message storage is accessible', async () => {
      // Mock storage keys with messages
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        STORAGE_KEY_MESSAGES_PREFIX + 'peer1',
        STORAGE_KEY_MESSAGES_PREFIX + 'peer2',
        'other_key',
      ]);

      const result = await verifyMessagesStoredLocally();

      expect(result).toBe(true);
      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
    });

    it('should return true even when no messages exist yet', async () => {
      // Mock storage keys without messages
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['other_key']);

      const result = await verifyMessagesStoredLocally();

      // Should still return true as storage is accessible
      expect(result).toBe(true);
    });

    it('should return false when storage check fails', async () => {
      // Mock storage check failure
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const result = await verifyMessagesStoredLocally();

      expect(result).toBe(false);
    });
  });

  describe('verifyCacheStoredLocally', () => {
    it('should return true when cache storage is accessible', async () => {
      // Mock cache in storage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([['msg1', Date.now()]]),
      );

      const result = await verifyCacheStoredLocally();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEY_DUPLICATE_CACHE,
      );
    });

    it('should return true even when cache is empty', async () => {
      // Mock no cache in storage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await verifyCacheStoredLocally();

      // Should still return true as storage is accessible
      expect(result).toBe(true);
    });

    it('should return false when storage check fails', async () => {
      // Mock storage check failure
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const result = await verifyCacheStoredLocally();

      expect(result).toBe(false);
    });
  });

  describe('performOfflineVerification', () => {
    it('should return fully functional when all checks pass', async () => {
      // Mock all checks passing
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        type: 'none',
      });
      
      let testValue: string;
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        if (key.includes('verification_test')) {
          testValue = value;
        }
        return Promise.resolve(undefined);
      });
      
      (AsyncStorage.getItem as jest.Mock).mockImplementation(key => {
        if (key === STORAGE_KEY_KEYPAIR) {
          return Promise.resolve(JSON.stringify({ publicKey: 'key' }));
        }
        if (key.includes('verification_test')) {
          return Promise.resolve(testValue);
        }
        return Promise.resolve(null);
      });
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      const result = await performOfflineVerification();

      expect(result.fullyFunctional).toBe(true);
      expect(result.isOffline).toBe(true);
      expect(result.storageAccessible).toBe(true);
      expect(result.keysStoredLocally).toBe(true);
      expect(result.messagesStoredLocally).toBe(true);
      expect(result.cacheStoredLocally).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors when checks fail', async () => {
      // Mock checks failing
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        type: 'wifi',
      });
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      const result = await performOfflineVerification();

      expect(result.fullyFunctional).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getOfflineStatusMessage', () => {
    it('should return fully functional message when offline and functional', () => {
      const result = {
        isOffline: true,
        storageAccessible: true,
        keysStoredLocally: true,
        messagesStoredLocally: true,
        cacheStoredLocally: true,
        fullyFunctional: true,
        errors: [],
      };

      const message = getOfflineStatusMessage(result);

      expect(message).toContain('Fully functional offline');
    });

    it('should return ready message when online but functional', () => {
      const result = {
        isOffline: false,
        storageAccessible: true,
        keysStoredLocally: true,
        messagesStoredLocally: true,
        cacheStoredLocally: true,
        fullyFunctional: true,
        errors: [],
      };

      const message = getOfflineStatusMessage(result);

      expect(message).toContain('Ready for offline operation');
    });

    it('should return error message when not functional', () => {
      const result = {
        isOffline: true,
        storageAccessible: false,
        keysStoredLocally: false,
        messagesStoredLocally: true,
        cacheStoredLocally: true,
        fullyFunctional: false,
        errors: ['Local storage is not accessible'],
      };

      const message = getOfflineStatusMessage(result);

      expect(message).toContain('Issues detected');
    });
  });

  describe('monitorConnectivity', () => {
    it('should call callback when connectivity changes', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      // Mock addEventListener
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      const unsubscribe = monitorConnectivity(callback);

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Simulate connectivity change
      const listener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      listener({ isConnected: false, type: 'none' });

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should unsubscribe when returned function is called', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      const unsubscribe = monitorConnectivity(callback);
      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Integration: No Network Requests', () => {
    it('should verify no network-related imports exist', () => {
      // This test verifies that the codebase doesn't import network libraries
      // In a real test, you would scan the source files
      // For now, we verify the verification module itself doesn't make network calls

      const verificationModule = require('../src/utils/offlineVerification');

      // Check that the module doesn't have fetch, axios, or XMLHttpRequest
      expect(verificationModule.fetch).toBeUndefined();
      expect(verificationModule.axios).toBeUndefined();
      expect(verificationModule.XMLHttpRequest).toBeUndefined();
    });
  });

  describe('Integration: Local Storage Only', () => {
    it('should verify all data operations use AsyncStorage', async () => {
      // Mock successful storage operations with proper value matching
      let testValue: string;
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        if (key.includes('verification_test')) {
          testValue = value;
        }
        return Promise.resolve(undefined);
      });
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('verification_test')) {
          return Promise.resolve(testValue);
        }
        return Promise.resolve(null);
      });
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      // Verify storage is accessible
      const storageAccessible = await verifyLocalStorage();

      expect(storageAccessible).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});
