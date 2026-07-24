const DETOX_SETUP_TIMEOUT_MS = 120_000;

/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "tests/jest.config.cjs",
    },
    jest: {
      setupTimeout: DETOX_SETUP_TIMEOUT_MS,
    },
  },
  apps: {
    "ios.expo.debug": {
      type: "ios.app",
      binaryPath:
        "../../apps/e2e-app-expo/ios/build/Build/Products/Debug-iphonesimulator/reactgrabe2eexpo.app",
      build: "cd ../../apps/e2e-app-expo && nr build:ios",
    },
    "ios.react-native.debug": {
      type: "ios.app",
      binaryPath:
        "../../apps/e2e-app-react-native/ios/build/Build/Products/Debug-iphonesimulator/ReactGrabE2EReactNative.app",
      build: "cd ../../apps/e2e-app-react-native && nr build:ios",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 16" },
    },
  },
  configurations: {
    "ios.expo.debug": {
      device: "simulator",
      app: "ios.expo.debug",
    },
    "ios.react-native.debug": {
      device: "simulator",
      app: "ios.react-native.debug",
    },
  },
};
