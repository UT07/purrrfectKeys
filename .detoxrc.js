module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    // Local Xcode build (requires Xcode 16 — Xcode 17 has Skia compatibility issues)
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/PurrrfectKeys.app',
      build:
        'xcodebuild -workspace ios/PurrrfectKeys.xcworkspace -scheme PurrrfectKeys -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -quiet',
    },
    // EAS Build simulator binary — download from EAS and place in artifacts/
    'ios.eas': {
      type: 'ios.app',
      binaryPath: 'artifacts/PurrrfectKeys.app',
    },
    // EAS Build Android APK — download from EAS and place in artifacts/
    'android.eas': {
      type: 'android.apk',
      binaryPath: 'artifacts/purrrfect-keys.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 17 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    'attached.android': {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    // iOS: local build
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    // iOS: EAS build (no local build step)
    'ios.sim.eas': {
      device: 'simulator',
      app: 'ios.eas',
    },
    // Android: EAS build on emulator
    'android.emu.eas': {
      device: 'emulator',
      app: 'android.eas',
    },
    // Android: EAS build on attached device
    'android.att.eas': {
      device: 'attached.android',
      app: 'android.eas',
    },
  },
};
