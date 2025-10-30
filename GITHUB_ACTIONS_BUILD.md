# Building APK with GitHub Actions

This project uses GitHub Actions to build the Android APK on Linux runners, which avoids the C++ linking issues present in Windows build environments.

## How It Works

The GitHub Actions workflow (`.github/workflows/build-apk.yml`) automatically builds the APK when:
- Code is pushed to `main` or `master` branch
- A pull request is created
- Manually triggered via the Actions tab

## Manual Build Trigger

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. Select "Build Android APK" workflow
4. Click "Run workflow" button
5. Select the branch you want to build from
6. Click "Run workflow"

## Downloading the APK

After the workflow completes:

1. Go to the "Actions" tab in your GitHub repository
2. Click on the completed workflow run
3. Scroll down to the "Artifacts" section
4. Download the `app-release` artifact (it will be a ZIP file)
5. Extract the ZIP to get the `app-release.apk` file

## Build Artifacts

The workflow produces two artifacts:

1. **app-release**: Contains the built APK file
   - File: `app-release.apk`
   - Retention: 30 days

2. **build-info**: Contains build metadata
   - Build date and time
   - Git commit hash
   - Branch name

## First-Time Setup

If this is your first time using the workflow:

1. **Push the code to GitHub**:
   ```bash
   cd OfflineEmergencyChat
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Enable GitHub Actions** (if not already enabled):
   - Go to your repository settings
   - Navigate to "Actions" → "General"
   - Ensure "Allow all actions and reusable workflows" is selected

3. **Trigger the workflow**:
   - The workflow will run automatically on push
   - Or manually trigger it from the Actions tab

## Build Time

The typical build time is 5-10 minutes, depending on:
- GitHub Actions queue time
- Dependency caching
- Build complexity

## Troubleshooting

### Workflow Fails

If the workflow fails:

1. Check the workflow logs in the Actions tab
2. Look for error messages in the "Build Release APK" step
3. Common issues:
   - Missing dependencies: Check `package.json`
   - Gradle errors: Check `android/build.gradle`
   - NDK issues: Usually resolved by the Linux environment

### Can't Find APK

If you can't find the APK after the build:

1. Ensure the workflow completed successfully (green checkmark)
2. Look in the "Artifacts" section at the bottom of the workflow run page
3. The artifact is only available for 30 days after the build

### Build Takes Too Long

If builds are slow:

1. The first build takes longer (no cache)
2. Subsequent builds are faster (cached dependencies)
3. Consider using self-hosted runners for faster builds

## Local Development

For local development and testing:
- Use `npm run android` to run on an emulator/device
- The APK build is only needed for distribution
- Development builds work fine on Windows

## Alternative: Manual Build on Linux

If you prefer to build manually on Linux:

```bash
# On Ubuntu/Debian
cd OfflineEmergencyChat/android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Security Notes

- The workflow uses official GitHub Actions
- No secrets are required for basic APK builds
- For signed releases, add signing keys as GitHub Secrets
- Never commit keystore files to the repository

## Next Steps

After downloading the APK:

1. **Test the APK**:
   - Install on a physical Android device
   - Test all features, especially BLE functionality

2. **Distribute**:
   - Share directly with users
   - Upload to Google Play Store (requires signing)
   - Host on your own server

3. **Sign for Production** (optional):
   - Generate a release keystore
   - Add signing configuration to `android/app/build.gradle`
   - Store keystore credentials in GitHub Secrets
