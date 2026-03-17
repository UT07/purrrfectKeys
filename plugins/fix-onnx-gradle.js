/**
 * Expo Config Plugin: Fix ONNX Runtime Gradle
 *
 * Patches onnxruntime-react-native's build.gradle to replace
 * `latest.integration` with a pinned version. The dynamic version
 * resolution fails on EAS Build's JDK due to:
 *   SAXNotRecognizedException: Property 'accessExternalSchema' is not recognized.
 *
 * This plugin runs after prebuild generates the Android project,
 * finding and patching the ONNX Gradle file in node_modules.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Must match onnxruntime-react-native npm package version (C++ headers must be API-compatible)
const ONNX_VERSION = '1.24.3';

function fixOnnxGradle(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const onnxGradle = path.join(
        cfg.modRequest.projectRoot,
        'node_modules',
        'onnxruntime-react-native',
        'android',
        'build.gradle',
      );

      if (!fs.existsSync(onnxGradle)) {
        console.warn('[fix-onnx-gradle] ONNX build.gradle not found — skipping');
        return cfg;
      }

      let content = fs.readFileSync(onnxGradle, 'utf8');
      const original = content;

      // Replace all `latest.integration` with pinned version
      content = content.replace(
        /latest\.integration/g,
        ONNX_VERSION,
      );

      if (content !== original) {
        fs.writeFileSync(onnxGradle, content, 'utf8');
        const count = (original.match(/latest\.integration/g) || []).length;
        console.log(`[fix-onnx-gradle] Pinned ${count} ONNX dependencies to v${ONNX_VERSION}`);
      } else {
        console.log('[fix-onnx-gradle] No changes needed');
      }

      return cfg;
    },
  ]);
}

module.exports = fixOnnxGradle;
