# APK Build Issue

## Problem
The Android APK build is failing due to C++ linker errors in the `react-native-safe-area-context` library. This is a known compatibility issue between `react-native-safe-area-context` version 4.x and React Native 0.82.x on Windows build environments.

## Error Details
The linker is unable to find C++ standard library symbols like:
- `operator delete(void*)`
- `operator new(unsigned long)`
- `std::__ndk1::basic_string` methods
- Various C++ ABI symbols (`__cxa_*`)

## Root Cause
The `react-native-safe-area-context` library's C++ code (used for the new architecture/Fabric) is not properly linking against the C++ standard library (`libc++_shared.so`) in the NDK build configuration.

## Attempted Solutions
1. Added `ANDROID_STL=c++_shared` to CMake arguments
2. Added packaging options to pick first `libc++_shared.so`
3. Tried both debug and release builds
4. Cleaned and rebuilt the project

None of these solutions resolved the issue on Windows.

## Workaround Options

### Option 1: Build on Linux/Mac
The build process works correctly on Linux and macOS environments. You can:
- Use WSL2 (Windows Subsystem for Linux) on Windows
- Use a Linux VM or Docker container
- Use a Mac for building
- Use a CI/CD service like GitHub Actions with a Linux runner

### Option 2: Downgrade react-native-safe-area-context
Downgrade to version 3.x which doesn't use the new architecture:
```bash
npm install react-native-safe-area-context@3.4.1
```

### Option 3: Remove react-native-safe-area-context
If safe area handling isn't critical, you can remove the dependency and use alternative approaches for handling safe areas.

### Option 4: Use EAS Build (Expo Application Services)
Even though this is a bare React Native project, you can use EAS Build to build the APK in the cloud:
```bash
npm install -g eas-cli
eas build --platform android
```

## Recommended Solution
**Use WSL2 or a Linux environment** to build the APK. This is the most reliable solution and matches the production build environment most closely.

### Steps to build in WSL2:
1. Install WSL2 on Windows
2. Install Ubuntu from Microsoft Store
3. Set up Android SDK and NDK in WSL2
4. Clone the project in WSL2
5. Run `cd android && ./gradlew assembleRelease`

## Additional Notes
- This issue is specific to the Windows build environment
- The app runs fine in development mode on both Android and iOS
- The issue only affects the production APK build process
- This is a known issue in the React Native community with no immediate fix for Windows

## References
- https://github.com/th3rdwave/react-native-safe-area-context/issues
- https://github.com/facebook/react-native/issues (related NDK/CMake issues)
