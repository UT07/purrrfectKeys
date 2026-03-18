# Expo SDK 52 → 53 Upgrade Design

**Date:** 2026-03-18
**Branch:** `feat/expo-sdk-55` (repurposed — name kept for continuity)
**Baseline:** 160 test suites, 3,253 tests, 0 TypeScript errors

## Goal

Upgrade from Expo SDK 52 (RN 0.76, React 18) to SDK 53 (RN 0.79, React 19) to fix security vulnerabilities, remove workarounds, and prepare the foundation for future SDK jumps.

### What This Fixes

- **7 npm audit vulnerabilities** (4 high tar CVEs, 3 moderate ajv ReDoS)
- **react-native-screens 4.4.0 pin** — the Fabric codegen bug is fixed in RN 0.79; unpin to ~4.11.0
- **Metro resolutions hack** — remove pinned 0.81.0 resolutions block
- **Hermes Promise.allSettled** — native support (existing workaround still safe)
- **Xcode 16+ compatibility** — SDK 53 requires Xcode 16+ (current toolchain)

### What This Does NOT Include

- expo-av → expo-audio migration (deferred to SDK 54/55 phase)
- New Architecture enablement (opt out for this upgrade)
- Reanimated v3 → v4 (SDK 53 still uses v3)
- expo-file-system API migration (not needed until SDK 54)
- E2E testing setup (separate task after upgrade is stable)

## Version Matrix

| Package | Current (SDK 52) | Target (SDK 53) |
|---------|-----------------|-----------------|
| `expo` | ~52.0.0 | ~53.0.0 |
| `react` | 18.3.1 | 19.0.0 |
| `react-dom` | ^18.3.1 | ^19.0.0 |
| `react-native` | ^0.76.9 | ^0.79.x |
| `react-native-reanimated` | ~3.16.0 | ~3.17.4 |
| `react-native-screens` | ^4.4.0 (pinned) | ~4.11.0 (unpin) |
| `react-native-gesture-handler` | ~2.20.0 | ~2.24.0 |
| `react-native-svg` | 15.8.0 | SDK 53 bundled |
| `react-native-safe-area-context` | 4.12.0 | SDK 53 bundled |
| `@react-native-async-storage/async-storage` | 1.23.1 | SDK 53 bundled |
| `jest-expo` | ~52.0.0 | ~53.0.0 |
| `eslint-config-expo` | ~8.0.0 | SDK 53 compatible |
| `@types/react` | ~18.3.0 | ~19.0.0 |

All ~30 `expo-*` sub-packages aligned via `npx expo install --fix`.

## React 19 Impact Assessment

The codebase is clean for React 19. Assessment:

| Pattern | Files Affected | Action |
|---------|---------------|--------|
| `forwardRef` (source) | 1 (`ScreenShake.tsx`) | No action — still works in React 19, just deprecated |
| `forwardRef` (tests) | 5 test files | Minor fixes if React 19 strict mode causes issues |
| `defaultProps` (source) | 0 | Clean |
| `defaultProps` (tests) | 7 test files | Mock components only — likely fine |
| `setImmediate` | 0 | Clean (polyfill removed in SDK 53, but unused) |
| String refs | 0 | Clean |
| Legacy Context | 0 | Clean |
| `createRef` (source) | 0 | Clean |

**Why it's clean:** CLAUDE.md enforces functional-components-only with hooks. No class components, no legacy patterns.

## New Architecture Decision

**Opt out.** Set `"newArchEnabled": false` in app.json.

Rationale:
- ONNX Runtime (polyphonic detection) is unverified on New Architecture
- `@motiz88/react-native-midi` is unverified on New Architecture
- New Arch is not required until SDK 55
- Isolates the upgrade from native module compatibility risk

## Config Plugins

All 3 custom plugins remain during upgrade. Each is verified during EAS build:

| Plugin | Purpose | Likely still needed? |
|--------|---------|---------------------|
| `fix-onnx-gradle.js` | Pin ONNX AAR version + resolve duplicate `libreactnative.so` | Yes — ONNX packaging issue, not SDK-dependent |
| `exclude-midi-android.js` | Fix MIDI Kotlin JVM 11 → 17 target | Yes — package-level bug |
| `strip-push-entitlement.js` | Remove auto-added push entitlement | Yes — expo-notifications behavior unchanged |

**Verification:** During EAS build phase, toggle each plugin off individually and rebuild. If build succeeds without it, remove it. If not, keep it.

## Build Configuration

### Metro Config (`metro.config.js`)
No changes needed. Current config is clean:
- Asset extensions (json, onnx) — still needed
- Block list (firebase/, scripts/, firebase-admin) — still needed
- Extra node modules (firebase resolution) — still needed

SDK 53 enables `unstable_enablePackageExports` by default. If this causes module resolution issues, add `unstable_enablePackageExports: false` to resolver config as a temporary workaround.

### Babel Config (`babel.config.js`)
No changes needed:
- `babel-preset-expo` — updated automatically with expo
- `react-native-reanimated/plugin` — compatible with v3.17.4
- `module-resolver` — path aliases unchanged

### package.json Cleanup
- **Remove** `resolutions` block (Metro 0.81.0 pins) — SDK 53 ships its own Metro
- **Verify** `overrides` block (`flatted`, `undici`) — may no longer be needed if SDK 53 includes patched versions
- **Update** `overrides` if still needed, remove if audit is clean

### EAS Config (`eas.json`)
No changes needed. SDK 53 defaults to frozen lockfiles (`npm ci`), which requires committed `package-lock.json` — already the case.

### TypeScript Config (`tsconfig.json`)
No changes needed. `"extends": "expo/tsconfig.base"` picks up SDK 53 defaults automatically.

## Third-Party Package Compatibility (SDK 53 / RN 0.79)

| Package | Current | Expected Compat | Notes |
|---------|---------|----------------|-------|
| `react-native-audio-api` | ^0.9.3 | Yes | JSI-based, Expo plugin. May need minor version bump. |
| `@shopify/react-native-skia` | 1.5.0 | Needs v2.0+ | Major version bump required for RN 0.79 + React 19 |
| `onnxruntime-react-native` | ^1.24.3 | Likely yes | No explicit RN 0.79 testing reported. High-risk — verify. |
| `@motiz88/react-native-midi` | ^0.0.6 | Likely yes | Expo Modules based. No explicit RN 0.79 testing. |
| `firebase` | ^12.9.0 | Yes | JS SDK, no native deps |
| `@sentry/react-native` | ~6.10.0 | Yes | Well-maintained, tracks RN releases |
| `posthog-react-native` | ^4.37.1 | Yes | JS-heavy, minimal native |
| `@react-native-google-signin/google-signin` | ^16.1.1 | Yes | Tracks major RN releases |
| `abcjs` | ^6.6.2 | Yes | Pure JS |
| `zustand` | ^5.0.1 | Yes | Pure JS |

### High-Risk Packages

1. **@shopify/react-native-skia 1.5.0 → 2.x**: Skia v2 is a major version. Check if the API surface used in the codebase changed. If migration is too complex, evaluate if Skia can be temporarily removed or pinned with a compatibility patch.

2. **onnxruntime-react-native**: The polyphonic detector is a competitive differentiator. If it doesn't compile on RN 0.79, the graceful YIN fallback activates — functional but degraded. Track this as highest-priority build verification.

3. **react-native-audio-api**: The WebAudioEngine (JSI) depends on this. If it needs a version bump, verify the AudioContext/GainNode/BufferSource API surface is unchanged.

## Verification Strategy

### Phase A — Code Correctness

1. `npx expo install --fix` to align all Expo packages
2. `npm run typecheck` — must achieve 0 errors
3. `npm run test` — all 160 suites, 3,253 tests must pass
4. `npm run lint` — no new errors

### Phase B — Build Verification

5. EAS Build iOS (preview-simulator) — must compile clean
6. EAS Build Android (preview) — must compile clean
7. Toggle each config plugin off → rebuild → confirm if still needed

### Phase C — Feature Verification on Device

Full feature matrix — any regression is a merge blocker:

| Area | What to Verify |
|------|---------------|
| **Audio playback** | ExpoAudioEngine voice pools, piano samples (FluidR3), SoundManager UI sounds + haptics |
| **Mic input** | YIN pitch detection, ONNX polyphonic detection, ambient noise calibration |
| **Exercise flow** | Full play-through with scoring, combo system, completion modal, XP/gem awards |
| **Navigation** | All 5 tabs (Home, Learn, Play, Social, Profile), all stack screens (Exercise, Song, Guild, BattlePass, AddFriend, etc.) |
| **Social features** | Friend codes, challenges, leagues, guild management, activity feed |
| **Auth** | Anonymous, email, Google Sign-In, Apple Sign-In, account linking |
| **Persistence** | Store hydration from AsyncStorage, cross-device sync, sign-out/sign-in data integrity |
| **AI coaching** | Gemini feedback generation, ElevenLabs TTS playback, expo-speech fallback |
| **Content loading** | 599 exercises via ContentLoaderRegistry, 582 songs via Firestore, ABC parser |
| **Animations** | Reanimated cat poses, combo glow, piano roll scroll, level map path, transitions, evolution reveal |
| **Songs** | Song library browse, section playback, layer toggle, mastery tracking |
| **Cat system** | Gallery, evolution, abilities, avatar rendering (SVG) |

### Phase D — Regression Gate

- Run full QA suites: `npm run test:qa` (perf + security + regression + stress)
- Compare test counts: must be ≥ 160 suites, ≥ 3,253 tests
- No TypeScript errors

## Rollback Plan

Branch-based. If the upgrade is blocked:
1. All work is on `feat/expo-sdk-55` branch
2. `master` remains on SDK 52, untouched
3. If a third-party package is incompatible, document it and abort the branch
4. Re-attempt when the blocking package releases a compatible version

## Future Upgrade Path

```
SDK 52 (current) ──► SDK 53 (this spec) ──► SDK 54 (post-launch)  ──► SDK 55 (post-launch)
RN 0.76              RN 0.79               RN 0.81                   RN 0.83
React 18             React 19              React 19.1                React 19.2
Reanimated 3.16      Reanimated 3.17       Reanimated 4.x            Reanimated 4.x
expo-av (works)      expo-av (deprecated)  expo-av (final SDK)       expo-av REMOVED
                                           expo-audio migration       New Arch mandatory
                                           expo-file-system v2
```

SDK 54 upgrade (post-launch) is the big one: expo-av → expo-audio migration, Reanimated v4, expo-file-system new API. SDK 55 adds mandatory New Architecture. Each is a dedicated phase.
