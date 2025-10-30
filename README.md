# Offline Emergency Mesh Chat

A decentralized, peer-to-peer emergency communication application that enables text messaging over Bluetooth Low Energy (BLE) without requiring internet or cellular infrastructure. The app uses multi-hop mesh networking to extend communication range beyond direct BLE connectivity.

## Overview

This React Native application provides critical communication capabilities during emergencies when traditional networks are unavailable. Key features include:

- **Offline Operation**: Works completely without internet or cellular connectivity
- **Mesh Networking**: Messages relay through intermediate devices to extend range
- **End-to-End Encryption**: All messages encrypted with XChaCha20-Poly1305
- **Trust Verification**: QR code-based fingerprint verification to prevent man-in-the-middle attacks
- **Cross-Platform**: Compatible between iOS and Android devices
- **Zero Configuration**: Automatic peer discovery and connection

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js**: Version 20 or higher (LTS recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **React Native CLI**: Install globally
  ```bash
  npm install -g react-native-cli
  ```

- **Watchman** (macOS/Linux): File watching service
  ```bash
  # macOS
  brew install watchman
  
  # Linux
  Follow instructions at https://facebook.github.io/watchman/docs/install
  ```

### iOS Development (macOS only)

- **Xcode**: Version 14.0 or higher
  - Download from Mac App Store
  - Install Command Line Tools: `xcode-select --install`

- **CocoaPods**: iOS dependency manager
  ```bash
  sudo gem install cocoapods
  ```

- **iOS Simulator** or physical iOS device (iOS 13.0+)

### Android Development

- **Android Studio**: Latest stable version
  - Download from [developer.android.com](https://developer.android.com/studio)
  - Install Android SDK (API Level 23 or higher)
  - Configure ANDROID_HOME environment variable

- **Java Development Kit (JDK)**: Version 11 or higher
  - Verify installation: `java -version`

- **Android Emulator** or physical Android device (Android 6.0+)
  - Enable Developer Options and USB Debugging on physical devices

### Hardware Requirements

- **Bluetooth 4.0+**: Required for BLE communication
- **Physical Devices Recommended**: BLE functionality is limited in emulators/simulators

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd OfflineEmergencyChat
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required Node.js packages including:
- react-native-ble-plx (BLE communication)
- react-native-libsodium (cryptography)
- @react-native-async-storage/async-storage (persistent storage)
- react-native-qrcode-svg (QR code generation)
- react-native-camera (QR code scanning)

### 3. iOS Setup

```bash
cd ios
pod install
cd ..
```

This installs native iOS dependencies via CocoaPods.

**Important**: The app requires Bluetooth permissions. These are already configured in `ios/OfflineEmergencyChat/Info.plist`:
- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`

### 4. Android Setup

No additional setup required. Bluetooth permissions are configured in `android/app/src/main/AndroidManifest.xml`:
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `BLUETOOTH_ADVERTISE`
- `ACCESS_FINE_LOCATION` (required for BLE scanning on Android)

## Build and Run

### iOS

#### Using iOS Simulator

```bash
npm run ios
```

Or specify a device:

```bash
npm run ios -- --simulator="iPhone 14 Pro"
```

#### Using Physical iOS Device

1. Open `ios/OfflineEmergencyChat.xcworkspace` in Xcode
2. Select your device from the device dropdown
3. Configure signing in "Signing & Capabilities" tab
4. Click Run button or press Cmd+R

**Note**: BLE functionality requires a physical device. Simulators have limited BLE support.

### Android

#### Using Android Emulator

```bash
npm run android
```

Make sure an emulator is running or start one from Android Studio.

#### Using Physical Android Device

1. Enable Developer Options on your device
2. Enable USB Debugging
3. Connect device via USB
4. Verify device is detected: `adb devices`
5. Run:

```bash
npm run android
```

**Note**: BLE functionality requires a physical device. Emulators have limited BLE support.

## Development

### Start Metro Bundler

The Metro bundler compiles JavaScript code. Start it separately:

```bash
npm start
```

Then run iOS or Android build commands in a separate terminal.

### Running Tests

```bash
npm test
```

This runs the Jest test suite including unit tests for:
- CryptoService (encryption/decryption)
- MessageService (envelope handling, relay logic)
- Message envelope utilities (serialization/deserialization)

### Linting

```bash
npm run lint
```

Runs ESLint to check code quality and style.

## Project Structure

```
OfflineEmergencyChat/
├── src/
│   ├── components/          # React components
│   │   ├── ConversationView.tsx
│   │   ├── PeerList.tsx
│   │   ├── TrustVerification.tsx
│   │   └── MessageItem.tsx
│   ├── services/            # Core business logic
│   │   ├── BLEService.ts
│   │   ├── CryptoService.ts
│   │   ├── MessageService.ts
│   │   └── StorageService.ts
│   ├── context/             # State management
│   │   ├── AppContext.tsx
│   │   └── types.ts
│   └── utils/               # Utility functions
│       ├── constants.ts
│       ├── messageEnvelope.ts
│       └── duplicateDetection.ts
├── __tests__/               # Test files
├── ios/                     # iOS native code
├── android/                 # Android native code
└── App.tsx                  # Root component
```

## Troubleshooting

### Bluetooth Issues

**Problem**: "Bluetooth is disabled" banner appears

**Solution**:
- iOS: Settings → Bluetooth → Enable
- Android: Settings → Connections → Bluetooth → Enable
- Restart the app after enabling Bluetooth

**Problem**: Peers not discovered

**Solution**:
- Ensure both devices have Bluetooth enabled
- Check that devices are within BLE range (~10-30 meters)
- Verify app has Bluetooth permissions (check device Settings → App Permissions)
- Try force-closing and restarting the app
- On Android, ensure Location Services are enabled (required for BLE scanning)

### Permission Issues

**Problem**: "Bluetooth permission denied" on iOS

**Solution**:
- Go to Settings → Privacy → Bluetooth
- Find "OfflineEmergencyChat" and enable
- Restart the app

**Problem**: "Location permission denied" on Android

**Solution**:
- Go to Settings → Apps → OfflineEmergencyChat → Permissions
- Enable Location permission (required for BLE scanning on Android 6.0+)
- Restart the app

### Build Issues

**Problem**: iOS build fails with "Command PhaseScriptExecution failed"

**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Problem**: Android build fails with "SDK location not found"

**Solution**:
- Create `android/local.properties` file
- Add: `sdk.dir=/path/to/Android/sdk`
- Or set ANDROID_HOME environment variable

**Problem**: Metro bundler connection issues

**Solution**:
```bash
# Clear Metro cache
npm start -- --reset-cache

# Or clear all caches
watchman watch-del-all
rm -rf node_modules
npm install
```

### Connection Issues

**Problem**: Devices connect but messages don't send

**Solution**:
- Verify both devices completed key exchange (check logs)
- Ensure message length is under 500 characters
- Check that devices haven't moved out of range
- Try disconnecting and reconnecting

**Problem**: Messages not relaying through intermediate devices

**Solution**:
- Verify all devices are running the app in foreground
- Check that intermediate device is connected to both sender and recipient
- Ensure TTL hasn't reached 0 (max 10 hops)
- Review logs for relay errors

### Performance Issues

**Problem**: App drains battery quickly

**Solution**:
- This is expected behavior due to continuous BLE scanning
- Close app when not needed
- Future versions may implement background optimization

**Problem**: App becomes unresponsive

**Solution**:
- Check device memory (app stores message history)
- Clear message history by reinstalling app
- Ensure device has sufficient free storage

## Known Limitations

- **Foreground Only**: App must be in foreground to maintain BLE connections (iOS/Android background BLE limitations)
- **Connection Limit**: iOS limits to 7 concurrent BLE connections
- **Range**: Direct BLE range is ~10-30 meters depending on environment
- **Hop Limit**: Messages relay maximum 10 hops (TTL=10)
- **Message Size**: Maximum 500 characters per message
- **No Message History Sync**: Each device maintains its own local message history
- **No Group Chat**: MVP supports only peer-to-peer messaging
- **No File Sharing**: Text messages only in MVP

## Security Considerations

- **Encryption**: All messages encrypted with XChaCha20-Poly1305 (equivalent to AES-256-GCM)
- **Key Exchange**: X25519 Diffie-Hellman provides forward secrecy
- **Trust Verification**: Manual QR code verification prevents man-in-the-middle attacks
- **Key Storage**: Private keys stored in device secure storage (iOS Keychain, Android Keystore)
- **No Cloud**: All data stored locally, no cloud synchronization

## Contributing

This is an MVP implementation. Future enhancements may include:
- Background operation support
- Group messaging
- File/image sharing
- Voice messages
- Message acknowledgments
- Improved UI/UX

## License

[Specify license here]

## Support

For issues, questions, or contributions, please [specify contact method or issue tracker].

## Acknowledgments

- Mesh relay logic adapted from [expo-bitchat](https://github.com/permissionlesstech/bitchat)
- Built with React Native and libsodium cryptographic library
