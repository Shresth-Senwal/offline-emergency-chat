/**
 * Mock implementation of @react-native-community/netinfo for Jest tests.
 */

const NetInfo = {
  fetch: jest.fn(async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'MockWiFi',
      strength: 100,
      ipAddress: '192.168.1.1',
      subnet: '255.255.255.0',
    },
  })),

  addEventListener: jest.fn(() => jest.fn()),

  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
};

export default NetInfo;
