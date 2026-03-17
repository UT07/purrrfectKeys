/**
 * Expo Config Plugin: Fix @motiz88/react-native-midi Kotlin JVM Target
 *
 * The MIDI package hardcodes JVM 11 for Kotlin/Java compilation, but EAS Build
 * uses JDK 17, causing: "Inconsistent JVM-target compatibility detected for
 * tasks 'compileReleaseJavaWithJavac' (17) and 'compileReleaseKotlin' (11)".
 *
 * This plugin patches the MIDI build.gradle to use JVM 17.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function fixMidiKotlinTarget(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const midiGradle = path.join(
        cfg.modRequest.projectRoot,
        'node_modules',
        '@motiz88',
        'react-native-midi',
        'android',
        'build.gradle',
      );

      if (!fs.existsSync(midiGradle)) {
        console.warn('[fix-midi-kotlin] MIDI build.gradle not found — skipping');
        return cfg;
      }

      let content = fs.readFileSync(midiGradle, 'utf8');
      const original = content;

      // Upgrade Java/Kotlin compile targets from 11 to 17
      content = content.replace(
        /JavaVersion\.VERSION_11/g,
        'JavaVersion.VERSION_17',
      );

      if (content !== original) {
        fs.writeFileSync(midiGradle, content, 'utf8');
        const count = (original.match(/JavaVersion\.VERSION_11/g) || []).length;
        console.log(`[fix-midi-kotlin] Patched ${count} JVM targets from 11 to 17`);
      } else {
        console.log('[fix-midi-kotlin] No changes needed');
      }

      return cfg;
    },
  ]);
}

module.exports = fixMidiKotlinTarget;
