/**
 * React Native CLI configuration.
 *
 * Excludes onnxruntime-react-native from Android autolinking.
 * The onnxruntime build.gradle uses `latest.integration` dynamic version
 * resolution for the com.microsoft.onnxruntime:onnxruntime-android AAR,
 * which fails on EAS Build due to a JDK XML parser compatibility issue:
 *   SAXNotRecognizedException: Property 'accessExternalSchema' is not recognized.
 *
 * PolyphonicDetector.ts already lazy-loads onnxruntime with a try/catch
 * and MicrophoneInput falls back to YIN monophonic detection when it's
 * unavailable, so excluding from Android has no functional impact.
 *
 * iOS autolinking is kept enabled — the ONNX native module works fine on iOS.
 */
module.exports = {
  dependencies: {
    'onnxruntime-react-native': {
      platforms: {
        android: null, // Exclude from Android autolinking
      },
    },
  },
};
