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
    // Usage: eas build --profile preview-simulator, then download and unzip the .app
    // Run: npx detox test -c ios.sim.eas
    'ios.eas': {
      type: 'ios.app',
      binaryPath: 'artifacts/PurrrfectKeys.app',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 17 Pro',
      },
    },
  },
  configurations: {
    // Local build config
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    // EAS build config (no local build step — uses pre-built .app)
    'ios.sim.eas': {
      device: 'simulator',
      app: 'ios.eas',
    },
  },
};
