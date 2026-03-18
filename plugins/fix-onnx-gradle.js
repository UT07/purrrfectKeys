/**
 * Expo Config Plugin: Fix ONNX Runtime Android Build
 *
 * Two fixes:
 * 1. Pin ONNX AAR version (replace `latest.integration` which breaks on EAS JDK)
 * 2. Add packagingOptions to resolve duplicate libreactnative.so conflict
 *    (ONNX ships its own copy that conflicts with React Native's)
 */
const { withDangerousMod, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Must match onnxruntime-react-native npm package version (C++ headers must be API-compatible)
const ONNX_VERSION = '1.24.3';

function fixOnnxGradle(config) {
  // Step 1: Pin ONNX AAR version in node_modules
  config = withDangerousMod(config, [
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

      content = content.replace(/latest\.integration/g, ONNX_VERSION);

      if (content !== original) {
        fs.writeFileSync(onnxGradle, content, 'utf8');
        const count = (original.match(/latest\.integration/g) || []).length;
        console.log(`[fix-onnx-gradle] Pinned ${count} ONNX dependencies to v${ONNX_VERSION}`);
      }

      return cfg;
    },
  ]);

  // Step 2: Add packagingOptions to app/build.gradle to resolve duplicate libreactnative.so
  config = withAppBuildGradle(config, (cfg) => {
    const { modResults } = cfg;
    if (!modResults.contents.includes("pickFirst 'lib/arm64-v8a/libreactnative.so'")) {
      modResults.contents = modResults.contents.replace(
        /android\s*\{/,
        `android {
    packagingOptions {
        // ONNX Runtime ships its own libreactnative.so that conflicts with React Native's
        pickFirst 'lib/arm64-v8a/libreactnative.so'
        pickFirst 'lib/x86_64/libreactnative.so'
        pickFirst 'lib/x86/libreactnative.so'
        pickFirst 'lib/armeabi-v7a/libreactnative.so'
    }`,
      );
      console.log('[fix-onnx-gradle] Added packagingOptions pickFirst for libreactnative.so');
    }
    return cfg;
  });

  return config;
}

module.exports = fixOnnxGradle;
