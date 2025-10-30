module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-ble-plx|react-native-qrcode-svg|react-native-camera|@react-native-async-storage|react-native-libsodium)/)',
  ],
};
