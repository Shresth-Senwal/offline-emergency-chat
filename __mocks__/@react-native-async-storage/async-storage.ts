/**
 * Mock implementation of @react-native-async-storage/async-storage for Jest tests.
 * 
 * This mock provides an in-memory implementation of AsyncStorage that can be used
 * in unit tests without requiring the native module.
 */

const storage: Map<string, string> = new Map();

const AsyncStorage = {
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    storage.set(key, value);
  }),

  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return storage.get(key) || null;
  }),

  removeItem: jest.fn(async (key: string): Promise<void> => {
    storage.delete(key);
  }),

  clear: jest.fn(async (): Promise<void> => {
    storage.clear();
  }),

  getAllKeys: jest.fn(async (): Promise<string[]> => {
    return Array.from(storage.keys());
  }),

  multiGet: jest.fn(async (keys: string[]): Promise<[string, string | null][]> => {
    return keys.map(key => [key, storage.get(key) || null]);
  }),

  multiSet: jest.fn(async (keyValuePairs: [string, string][]): Promise<void> => {
    keyValuePairs.forEach(([key, value]) => storage.set(key, value));
  }),

  multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
    keys.forEach(key => storage.delete(key));
  }),
};

export default AsyncStorage;
