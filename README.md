# Offline Emergency Chat - Expo Version

This is the Expo version of the Offline Emergency Mesh Chat application, providing cross-platform compatibility and easier deployment.

## 🚀 Automated APK Builds

This repository is configured with GitHub Actions to automatically build APK files when code is pushed to the `expo-version` branch.

### Build Process

1. **Automatic Triggers**: 
   - Push to `expo-version` branch
   - Pull requests to `expo-version` branch
   - Manual workflow dispatch

2. **Build Steps**:
   - Sets up Node.js, Java, and Android SDK
   - Installs dependencies
   - Runs `expo prebuild` to generate native Android code
   - Builds APK using Gradle

3. **Artifacts**:
   - APK files are uploaded as GitHub artifacts
   - Releases are automatically created with downloadable APKs

### Download APK

1. Go to the [Actions tab](../../actions) in GitHub
2. Click on the latest successful build
3. Download the `offline-emergency-chat-expo.apk` artifact
4. Or check the [Releases page](../../releases) for tagged releases

## 🛠 Local Development

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios
```

### Building Locally

```bash
# Prebuild native code
npx expo prebuild

# Build APK (Android)
cd android && ./gradlew assembleRelease

# Build for iOS (macOS only)
cd ios && xcodebuild -workspace OfflineEmergencyChat.xcworkspace -scheme OfflineEmergencyChat archive
```

## 📱 Features

- **Bluetooth Low Energy (BLE)** mesh networking
- **End-to-end encryption** using Web Crypto API
- **Offline messaging** with automatic relay
- **Trust verification** via QR code scanning
- **Cross-platform** compatibility (Android/iOS)
- **No internet required** - works completely offline

## 🔧 Configuration

The app is configured via:
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration
- `.github/workflows/build-apk.yml` - GitHub Actions workflow

## 🔒 Permissions

### Android
- Bluetooth permissions for mesh networking
- Location permission (required for BLE scanning)
- Camera permission for QR code scanning

### iOS
- Bluetooth usage descriptions
- Camera usage description

## 📋 Build Status

[![Build Expo APK](../../actions/workflows/build-apk.yml/badge.svg)](../../actions/workflows/build-apk.yml)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `expo-version`
3. Make your changes
4. Push to your fork
5. Create a pull request to the `expo-version` branch

The GitHub Actions will automatically build and test your changes.