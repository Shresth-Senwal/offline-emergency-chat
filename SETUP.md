# Offline Emergency Chat - Setup Guide

## Project Overview

This is a React Native application for offline emergency communication using Bluetooth Low Energy (BLE) mesh networking. The app enables decentralized peer-to-peer messaging without internet or cellular infrastructure.

## Prerequisites

### General Requirements
- **Node.js**: Version 20 or higher
- **npm**: Comes with Node.js
- **Git**: For version control

### iOS Development (macOS only)
- **macOS**: Required for iOS development
- **Xcode**: Version 14.0 or higher
- **CocoaPods**: Install via `sudo gem install cocoapods`
- **iOS Simulator** or physical iOS device (iOS 13.0+)

### Android Development
- **Android Studio**: Latest stable version
- **Android SDK**: API Level 23 (Android 6.0) or higher
- **Java Development Kit (JDK)**: Version 17 or higher
- **Android Emulator** or physical Android device (Android 6.0+)

## Installation Steps

### 1. Clone and Install Dependencies

The project has already been initialized with all required dependencies:

```bash
cd OfflineEmergencyChat
npm install
```

### 2. iOS Setup (macOS only)

Install iOS native dependencies:

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

No additional setup required. The Android project is ready to build.

## Installed Dependencies

### Core Dependencies
- **react-native-ble-plx** (v3.5.0): Bluetooth Low Energy communication
- **react-native-libsodium** (v1.4.0): Cryptographic operations (X25519, AES-256-GCM)
- **@react-native-async-storage/async-storage** (v2.2.0): Local data persistence
- **react-native-qrcode-svg** (v6.3.16): QR code generation for trust verification
- **react-native-camera** (v4.2.1): Camera access for QR code scanning

## Configuration

### iOS Permissions (Info.plist)

The following permissions have been configured in `ios/OfflineEmergencyChat/Info.plist`:

- **NSBluetoothAlwaysUsageDescription**: Bluetooth access for device communication
- **NSBluetoothPeripheralUsageDescription**: Bluetooth peripheral mode for discovery
- **NSCameraUsageDescription**: Camera access for QR code scanning

### Android Permissions (AndroidManifest.xml)

The following permissions have been configured in `android/app/src/main/AndroidManifest.xml`:

#### Bluetooth Permissions (Android 11 and below)
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`

#### Bluetooth Permissions (Android 12 and above)
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `BLUETOOTH_ADVERTISE`

#### Additional Permissions
- `ACCESS_FINE_LOCATION`: Required for BLE scanning on Android
- `CAMERA`: Required for QR code scanning

### TypeScript Configuration

Strict mode has been enabled in `tsconfig.json` with the following compiler options:
- `strict: true`
- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `strictBindCallApply: true`
- `strictPropertyInitialization: true`
- `noImplicitThis: true`
- `alwaysStrict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

## Running the Application

### Start Metro Bundler

In the project root directory:

```bash
npm start
```

### Run on iOS (macOS only)

In a new terminal:

```bash
npm run ios
```

Or to run on a specific simulator:

```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### Run on Android

In a new terminal:

```bash
npm run android
```

Make sure you have an Android emulator running or a physical device connected via USB with USB debugging enabled.

## Development Workflow

### Project Structure

```
OfflineEmergencyChat/
├── src/                          # Source code (to be created)
│   ├── components/              # React components
│   ├── services/                # Business logic services
│   ├── context/                 # State management
│   └── utils/                   # Utility functions
├── android/                     # Android native code
├── ios/                         # iOS native code
├── __tests__/                   # Test files
└── App.tsx                      # Root component
```

### Testing

Run tests:

```bash
npm test
```

### Linting

Run ESLint:

```bash
npm run lint
```

## Troubleshooting

### iOS Build Issues

1. **CocoaPods errors**: Try cleaning and reinstalling pods
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

2. **Xcode build errors**: Clean build folder in Xcode (Cmd+Shift+K)

### Android Build Issues

1. **Gradle errors**: Clean and rebuild
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **SDK/NDK issues**: Verify Android SDK and NDK are properly installed in Android Studio

### Bluetooth Permission Issues

- **iOS**: Ensure Info.plist permissions are present and app has been granted Bluetooth access in Settings
- **Android**: Request runtime permissions for Bluetooth and Location in the app code

### Metro Bundler Issues

Clear Metro cache:

```bash
npm start -- --reset-cache
```

## Next Steps

Refer to the implementation plan in `.kiro/specs/offline-emergency-mesh-chat/tasks.md` for the next development tasks.

## Requirements Reference

This setup satisfies the following requirements:
- **Requirement 9.1**: iOS compatibility (iOS 13.0+)
- **Requirement 9.2**: Android compatibility (Android 6.0+)

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [react-native-ble-plx Documentation](https://github.com/dotintent/react-native-ble-plx)
- [React Native Libsodium](https://github.com/serenity-kit/react-native-libsodium)
- [Design Document](.kiro/specs/offline-emergency-mesh-chat/design.md)
- [Requirements Document](.kiro/specs/offline-emergency-mesh-chat/requirements.md)
