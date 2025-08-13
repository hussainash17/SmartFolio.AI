# 📱 SmartStock Mobile App Setup Guide

This guide will help you set up the SmartStock mobile app using Capacitor for iOS and Android.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm
2. **Android Studio** (for Android development)
3. **Xcode** (for iOS development, macOS only)
4. **Java JDK 11+** (for Android)
5. **CocoaPods** (for iOS, macOS only)

### Installation

1. **Install Capacitor CLI globally:**
```bash
npm install -g @capacitor/cli
```

2. **Install project dependencies:**
```bash
cd frontend
npm install
```

3. **Build the web app:**
```bash
npm run build
```

4. **Add mobile platforms:**
```bash
# For Android
npm run cap:add:android

# For iOS (macOS only)
npm run cap:add:ios
```

5. **Sync the project:**
```bash
npm run cap:sync
```

## 📱 Platform Setup

### Android Setup

1. **Install Android Studio:**
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK and tools

2. **Set environment variables:**
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

3. **Open in Android Studio:**
```bash
npm run cap:open:android
```

4. **Run on device/emulator:**
```bash
npm run cap:run:android
```

### iOS Setup (macOS only)

1. **Install Xcode:**
   - Download from Mac App Store
   - Install Command Line Tools: `xcode-select --install`

2. **Install CocoaPods:**
```bash
sudo gem install cocoapods
```

3. **Open in Xcode:**
```bash
npm run cap:open:ios
```

4. **Run on device/simulator:**
```bash
npm run cap:run:ios
```

## 🔧 Development Workflow

### Building and Syncing

```bash
# Build the web app and sync to mobile
npm run cap:build

# Sync only (after making changes)
npm run cap:sync
```

### Live Reload (Development)

```bash
# Start development server
npm run dev

# In another terminal, run with live reload
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

## 📱 Mobile Features

### Available Capacitor Plugins

- **App**: App lifecycle and state management
- **Haptics**: Haptic feedback for interactions
- **Keyboard**: Keyboard management
- **Status Bar**: Status bar customization
- **Splash Screen**: Splash screen management
- **Push Notifications**: Push notification support
- **Local Notifications**: Local notification scheduling
- **Device**: Device information
- **Network**: Network status monitoring

### Mobile-Specific Components

1. **MobileNavigation**: Bottom tab navigation for mobile
2. **MobileLayout**: Responsive layout for mobile/desktop
3. **MobilePortfolio**: Touch-optimized portfolio view
4. **CapacitorService**: Service for mobile features
5. **useCapacitor**: React hook for Capacitor features

### Mobile Optimizations

- **Touch-friendly UI**: Larger touch targets
- **Haptic feedback**: Tactile feedback for interactions
- **Bottom navigation**: Mobile-optimized navigation
- **Responsive design**: Adapts to screen size
- **Offline support**: Cached data for offline viewing

## 🔧 Configuration

### Capacitor Config (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartstock.app',
  appName: 'SmartStock',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#3b82f6"
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};
```

### Environment Variables

Create `.env` files for different environments:

```bash
# .env.development
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/api/v1/utils/ws

# .env.production
VITE_API_URL=https://api.smartstock.com
VITE_WS_URL=wss://api.smartstock.com/api/v1/utils/ws
```

## 📱 Platform-Specific Setup

### Android

#### Permissions (`android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### App Icon

Replace `android/app/src/main/res/mipmap-*` with your app icons.

### iOS

#### Permissions (`ios/App/App/Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan QR codes</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access for market data</string>
```

#### App Icon

Replace `ios/App/App/Assets.xcassets/AppIcon.appiconset` with your app icons.

## 🚀 Deployment

### Android

1. **Build release APK:**
```bash
cd android
./gradlew assembleRelease
```

2. **Build AAB for Play Store:**
```bash
cd android
./gradlew bundleRelease
```

### iOS

1. **Archive in Xcode:**
   - Open project in Xcode
   - Select "Any iOS Device" as target
   - Product → Archive

2. **Upload to App Store Connect:**
   - Use Xcode Organizer
   - Or use `xcodebuild` command line

## 🔧 Troubleshooting

### Common Issues

1. **Android build fails:**
   - Check Java version: `java -version`
   - Update Android SDK tools
   - Clean project: `cd android && ./gradlew clean`

2. **iOS build fails:**
   - Update CocoaPods: `sudo gem update cocoapods`
   - Clean build: `cd ios && xcodebuild clean`
   - Check Xcode version compatibility

3. **Live reload not working:**
   - Check network connectivity
   - Ensure correct IP address in capacitor config
   - Restart development server

4. **Plugin not working:**
   - Run `npm run cap:sync`
   - Check plugin installation
   - Verify platform-specific setup

### Debug Commands

```bash
# Check Capacitor version
npx cap --version

# List installed plugins
npx cap ls

# Check platform status
npx cap doctor

# Update Capacitor
npm update @capacitor/core @capacitor/cli
```

## 📱 Testing

### Manual Testing

1. **Install on device:**
```bash
npm run cap:run:android
npm run cap:run:ios
```

2. **Test features:**
   - Navigation
   - Touch interactions
   - Haptic feedback
   - Push notifications
   - Offline functionality

### Automated Testing

```bash
# Run E2E tests
npm run test:e2e

# Run unit tests
npm run test
```

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Mobile Build
on: [push, pull_request]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run cap:add:android
      - run: npm run cap:sync
      - run: cd android && ./gradlew assembleDebug
```

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Ionic Documentation](https://ionicframework.com/docs)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Chakra UI Mobile](https://chakra-ui.com/guides/mobile)

## 🆘 Support

For issues specific to the SmartStock mobile app:

1. Check the troubleshooting section above
2. Review Capacitor documentation
3. Check GitHub issues
4. Contact the development team

---

**SmartStock Mobile** - Empowering Bangladeshi investors with real-time market intelligence on mobile. 