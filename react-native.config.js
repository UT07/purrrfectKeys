/**
 * React Native CLI configuration.
 *
 * Android autolinking exclusions for packages with build issues on EAS Build.
 * iOS autolinking is kept enabled for all packages.
 */
module.exports = {
  dependencies: {
    // MIDI: Kotlin compilation fails on EAS Build (version mismatch).
    // MidiInput.ts falls back to NoOpMidiInput when native module unavailable.
    '@motiz88/react-native-midi': {
      platforms: {
        android: null,
      },
    },
  },
};
