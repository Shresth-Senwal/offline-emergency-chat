# Build Instructions for Offline Emergency Mesh Chat

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
2. **Java Development Kit (JDK)** 17 or higher
3. **Android Studio** with Android SDK
4. **React Native CLI** (`npm install -g react-native-cli`)

### Android SDK Requirements
- **Android SDK Platform**: API 34 (Android 14)
- **Android SDK Build-Tools**: 34.0.0
- **Android NDK**: Will be automatically downloaded during build
- **Android SDK Platform-Tools**

## Environment Setup

### 1. Set ANDROID_HOME Environment Variable

**Windows:**
```cmd
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

### 2. Install Dependencies

Navigate to the project directory and install npm packages:

```bash
cd OfflineEmergencyChat
npm install
```

## Building the APK

### Option 1: Debug APK (Recommended for Testing)

The debug APK is signed with a debug keystore and is suitable for testing on devices.

**Windows:**
```cmd
cd android
gradlew.bat assembleDebug
```

**macOS/Linux:**
```bash
cd android
./gradlew assembleDebug
```

The APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Release APK (For Production)

**Important:** You need to generate a release keystore first.

#### Generate Release Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### Configure Signing

1. Place the keystore file in `android/app/`
2. Create `android/gradle.properties` (or edit existing):

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

3. Update `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

#### Build Release APK

**Windows:**
```cmd
cd android
gradlew.bat assembleRelease
```

**macOS/Linux:**
```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Installing the APK

### Via ADB (Android Debug Bridge)

1. Enable USB Debugging on your Android device
2. Connect device via USB
3. Run:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer

1. Copy the APK to your device
2. Open the APK file on your device
3. Allow installation from unknown sources if prompted
4. Follow the installation prompts

## Troubleshooting

### Build Fails with "SDK location not found"

Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Build Fails with NDK Errors

The NDK will be automatically downloaded. If issues persist:
1. Open Android Studio
2. Go to Tools → SDK Manager → SDK Tools
3. Install "NDK (Side by side)" version 27.0.12077973

### Out of Memory Errors

Increase Gradle memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### Permission Errors on macOS/Linux

Make gradlew executable:
```bash
chmod +x android/gradlew
```

## Build Variants

### Debug Build
- Includes debugging symbols
- Larger APK size (~50-80 MB)
- Faster build time
- Suitable for development and testing

### Release Build
- Optimized and minified
- Smaller APK size (~30-50 MB)
- Slower build time
- Suitable for production distribution

## Testing the APK

After installation, the app requires the following permissions:
- **Bluetooth** - For peer-to-peer communication
- **Location** - Required for BLE scanning on Android
- **Camera** - For QR code scanning (trust verification)

Grant all permissions when prompted for full functionality.

## Build Time Estimates

- **First Build**: 5-15 minutes (downloads dependencies and NDK)
- **Subsequent Builds**: 2-5 minutes
- **Clean Build**: 3-8 minutes

## APK Size

- **Debug APK**: ~60-80 MB
- **Release APK (minified)**: ~35-50 MB

## Next Steps

After building and installing:
1. Install on at least 2 devices for testing
2. Grant all required permissions
3. Test peer discovery and messaging
4. Test trust verification with QR codes
5. Test mesh relay with 3+ devices

## Support

For build issues, check:
- React Native documentation: https://reactnative.dev/docs/environment-setup
- Android Developer documentation: https://developer.android.com/studio/build
- Project README.md for app-specific information
