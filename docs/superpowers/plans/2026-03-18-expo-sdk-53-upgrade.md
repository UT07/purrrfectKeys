# Expo SDK 52 → 53 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade from Expo SDK 52 (RN 0.76, React 18) to SDK 53 (RN 0.79, React 19), fixing 7+ audit vulnerabilities, removing workarounds, and cleaning up dead dependencies.

**Architecture:** Incremental upgrade on a feature branch. Version bumps first, then fix TypeScript errors (React 19 FC children), then fix test infrastructure, then verify builds. Each task is independently committable.

**Tech Stack:** Expo SDK 53, React Native 0.79, React 19, TypeScript 5.x, Jest + RNTL 13.x

**Spec:** `docs/superpowers/specs/2026-03-18-expo-sdk-53-upgrade-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Version bumps, dependency cleanup, overrides |
| `app.json` | Modify | Add `newArchEnabled: false` |
| `jest.setup.js` | Modify | Replace jest-native import, remove expo-router mock |
| `jest.config.js` | Modify | Remove expo-router from transformIgnorePatterns |
| `src/components/effects/ScreenShake.tsx` | Modify | forwardRef pattern (if needed) |
| 14 files with `React.FC` | Modify | Add explicit `children` prop where used |
| `package-lock.json` | Regenerated | After npm install |

---

## Task 1: Create branch and bump core versions

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Create fresh branch from master**

```bash
git checkout master
git pull
git checkout -b feat/expo-sdk-53
```

- [ ] **Step 2: Bump expo SDK version**

```bash
npx expo install expo@~53 --fix
```

This will update `expo` and auto-align all `expo-*` sub-packages. Review the output for any warnings.

- [ ] **Step 3: Bump React and React Native**

```bash
npx expo install react@19 react-dom@19 react-native@~0.79
```

- [ ] **Step 4: Bump RN ecosystem packages**

```bash
npx expo install react-native-reanimated@~3.17 react-native-screens@~4.11 react-native-gesture-handler@~2.24 react-native-svg react-native-safe-area-context @react-native-async-storage/async-storage
```

This also **unpins** react-native-screens from 4.4.0 (the Fabric codegen bug is fixed in RN 0.79).

- [ ] **Step 5: Bump dev dependencies**

```bash
npx expo install jest-expo@~53 -- --save-dev
npm install @types/react@~19 --save-dev
```

- [ ] **Step 6: Opt out of New Architecture**

In `app.json`, add inside the `"expo"` object:

```json
"experiments": {
  "newArchEnabled": false
}
```

This keeps us on the Old Architecture for this upgrade (ONNX and MIDI are unverified on New Arch).

- [ ] **Step 7: Commit version bumps**

```bash
git add package.json app.json
git commit -m "chore: bump Expo SDK 52→53, React 18→19, RN 0.76→0.79"
```

Do NOT commit `package-lock.json` yet — more dependency changes coming in Task 2.

**Note:** Tasks 1-2 edit `package.json` only. The actual `npm install` happens in Task 2 Step 6.

---

## Task 2: Clean up dependencies and fix overrides

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove dead dependencies**

```bash
npm uninstall expo-router
npm uninstall @testing-library/jest-native
```

- [ ] **Step 2: Upgrade testing library for React 19**

```bash
npm install @testing-library/react-native@~13 --save-dev
```

- [ ] **Step 3: Upgrade react-native-web for React 19**

```bash
npm install react-native-web@~0.20
```

- [ ] **Step 4: Remove Metro resolutions block**

In `package.json`, delete the entire `"resolutions"` block:

```json
// DELETE THIS BLOCK:
"resolutions": {
  "metro": "0.81.0",
  "metro-core": "0.81.0",
  "metro-config": "0.81.0",
  "metro-resolver": "0.81.0",
  "metro-runtime": "0.81.0"
}
```

SDK 53 ships its own Metro version — pinning the old one would break things.

- [ ] **Step 5: Update overrides block**

Replace the current `"overrides"` block with:

```json
"overrides": {
  "fast-xml-parser": ">=5.5.6"
}
```

Remove `flatted` and `undici` overrides — SDK 53 includes patched versions. Add `fast-xml-parser` override to fix the 2 Dependabot CVE alerts (via firebase-admin → @google-cloud/storage transitive dep).

- [ ] **Step 6: Regenerate lockfile and verify audit**

```bash
rm -rf node_modules package-lock.json
npm install
npm audit --omit=dev
```

Expected: 0 high vulnerabilities. The `fast-xml-parser` override should clear the Dependabot alerts. The tar CVEs should be fixed by SDK 53's updated `@expo/cli`.

**Contingency — Metro package exports:** SDK 53 enables `unstable_enablePackageExports` by default. If you see unexpected module resolution errors after install, add this to `metro.config.js`:
```javascript
config.resolver.unstable_enablePackageExports = false;
```

- [ ] **Step 7: Commit dependency cleanup**

```bash
git add package.json package-lock.json
git commit -m "chore: remove dead deps, update overrides, fix fast-xml-parser CVE"
```

---

## Task 3: Fix React 19 TypeScript errors — React.FC children

**Files:**
- Modify: 14 source files listed below

In React 19 + `@types/react@19`, `React.FC` no longer includes `children` in the props type. For each file, check if the component destructures or uses `children`. If yes, add `children: React.ReactNode` to the props interface. If the component doesn't use children, no change needed.

- [ ] **Step 1: Run typecheck to see which files error**

```bash
npm run typecheck 2>&1 | head -100
```

This will reveal the exact errors. The 14 files to audit are:

1. `src/screens/ExercisePlayer/ExercisePlayer.tsx`
2. `src/screens/ExercisePlayer/CountInAnimation.tsx`
3. `src/screens/ExercisePlayer/ScoreDisplay.tsx`
4. `src/screens/ExercisePlayer/HintDisplay.tsx`
5. `src/screens/ExercisePlayer/ErrorDisplay.tsx`
6. `src/screens/ExercisePlayer/RealTimeFeedback.tsx`
7. `src/screens/ExercisePlayer/ExerciseControls.tsx`
8. `src/screens/ExercisePlayer/CompletionModal.tsx`
9. `src/screens/MidiSetupScreen.tsx`
10. `src/screens/HomeScreen.tsx`
11. `src/components/FriendActivityStrip.tsx`
12. `src/components/Mascot/MascotBubble.tsx`
13. `src/components/MidiDeviceList.tsx`
14. `src/components/Keyboard/SplitKeyboard.tsx`

- [ ] **Step 2: Fix each file**

For components that use children, the fix is:

```typescript
// BEFORE
interface MyProps {
  title: string;
}
export const MyComponent: React.FC<MyProps> = ({ title, children }) => {

// AFTER
interface MyProps {
  title: string;
  children?: React.ReactNode;
}
export const MyComponent: React.FC<MyProps> = ({ title, children }) => {
```

For components that DON'T use children, no change needed — the `React.FC` typing change is harmless if children aren't destructured.

- [ ] **Step 3: Fix useRef typing issues (if any)**

In React 19, `useRef<T>(null)` returns `RefObject<T>` (read-only `.current`). If any code does `myRef.current = someValue` on a `useRef<T>(null)`, it will TS error. Fix by using `useRef<T | null>(null)` instead:

```typescript
// BEFORE (TS error in React 19):
const myRef = useRef<number>(null);
myRef.current = 42;  // Error: read-only

// AFTER:
const myRef = useRef<number | null>(null);
myRef.current = 42;  // OK
```

- [ ] **Step 4: Run typecheck — must be 0 errors**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit React 19 type fixes**

```bash
git add -A src/
git commit -m "fix: React 19 TypeScript compat — FC children, useRef typing"
```

---

## Task 4: Fix test infrastructure

**Files:**
- Modify: `jest.setup.js`
- Modify: `jest.config.js`

- [ ] **Step 1: Replace jest-native import in jest.setup.js**

Change line 1 from:
```javascript
import '@testing-library/jest-native/extend-expect';
```
to:
```javascript
import '@testing-library/react-native/extend-expect';
```

- [ ] **Step 2: Remove expo-router mock from jest.setup.js**

Delete lines 4-11 (the expo-router mock block):
```javascript
// DELETE THIS BLOCK:
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: {
    Screen: jest.fn(),
    Navigator: jest.fn(({ children }) => children),
  },
}));
```

- [ ] **Step 3: Remove expo-router from transformIgnorePatterns in jest.config.js**

In `jest.config.js` line 41, remove `expo-router|` from the transformIgnorePatterns regex:

```javascript
// BEFORE:
'node_modules/(?!(expo|expo-av|expo-router|expo-font|...'

// AFTER:
'node_modules/(?!(expo|expo-av|expo-font|...'
```

- [ ] **Step 4: Run tests to verify**

```bash
npm run test 2>&1 | tail -20
```

Expected: All 160 suites pass, ≥3,253 tests pass.

If tests fail, the most likely causes are:
- React 19 stricter rendering (e.g., `act()` warnings becoming errors)
- `@testing-library/react-native` v13 API changes
- Mock components using `defaultProps` (7 test files — fix by moving defaults to function params)

- [ ] **Step 5: Fix any failing tests**

Address failures one at a time. Common React 19 test fixes:
- Wrap state updates in `act()` if they weren't already
- Replace `defaultProps` in mock components with default function parameters
- Update snapshot tests if React 19 renders differently

- [ ] **Step 6: Run full QA suites**

```bash
npm run test:qa
```

Expected: All QA suites pass (perf, security, regression, stress).

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

Expected: No new errors (warnings OK).

- [ ] **Step 8: Commit test fixes**

```bash
git add jest.setup.js jest.config.js
git add -A src/  # if any test files were fixed
git commit -m "fix: update test infra for React 19 + RNTL 13"
```

---

## Task 5: Verify third-party native module compatibility

**Files:**
- Possibly modify: `package.json` (if version bumps needed)

- [ ] **Step 1: Check @shopify/react-native-skia compatibility**

Skia 1.5.0 may not work with RN 0.79 + React 19. Check:

```bash
npm ls @shopify/react-native-skia
npm view @shopify/react-native-skia versions --json | python3 -c "import sys,json; [print(v) for v in json.load(sys.stdin) if v.startswith('2.')]" 2>/dev/null | tail -5
```

If Skia v2.x is needed, install it:
```bash
npm install @shopify/react-native-skia@~2
```

Then check if the API used in `src/components/effects/SkiaParticles.tsx` still works. Skia usage in this codebase is minimal (1 file) and has a try/catch fallback to `null`, so if the API changed, the component degrades gracefully.

- [ ] **Step 2: Check react-native-audio-api compatibility**

```bash
npm view react-native-audio-api versions --json | python3 -c "import sys,json; print(json.load(sys.stdin)[-1])"
```

If a newer version is needed for RN 0.79:
```bash
npm install react-native-audio-api@latest
```

Verify the WebAudioEngine API surface (AudioContext, GainNode, AudioBufferSourceNode) is unchanged.

- [ ] **Step 3: Check onnxruntime-react-native compatibility**

```bash
npm view onnxruntime-react-native versions --json | python3 -c "import sys,json; print(json.load(sys.stdin)[-1])"
```

This package is high-risk. If it doesn't compile on RN 0.79, the graceful YIN fallback activates (the app works, just without polyphonic chord detection).

- [ ] **Step 4: Check @sentry/react-native compatibility**

```bash
npm view @sentry/react-native@latest version
```

Sentry tracks RN releases closely. Bump if needed:
```bash
npx expo install @sentry/react-native
```

- [ ] **Step 5: Run typecheck after any version bumps**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Run tests after any version bumps**

```bash
npm run test
```

Expected: All tests still pass.

- [ ] **Step 7: Commit any compatibility fixes**

```bash
git add package.json package-lock.json
git add -A src/  # if any source changes were needed
git commit -m "chore: align third-party deps with SDK 53 / RN 0.79"
```

---

## Task 6: EAS Build verification

**Files:**
- None (build verification only)

- [ ] **Step 1: Push branch to trigger builds**

```bash
git push -u origin feat/expo-sdk-53
```

- [ ] **Step 2: Build iOS simulator binary**

```bash
eas build --profile preview-simulator --platform ios --non-interactive
```

Wait for build to complete. Expected: SUCCESS.

If build fails, check:
- Config plugin errors (fix-onnx-gradle, exclude-midi-android, strip-push-entitlement)
- Native module compilation errors (Skia, ONNX, audio-api)
- Xcode version compatibility

- [ ] **Step 3: Build Android binary**

```bash
eas build --profile preview --platform android --non-interactive
```

Wait for build to complete. Expected: SUCCESS.

If Android build fails, check:
- ONNX gradle plugin (libreactnative.so conflict)
- MIDI Kotlin JVM target
- Gradle/AGP version compatibility

- [ ] **Step 4: Test config plugin necessity**

For each of the 3 plugins, temporarily comment it out in `app.json` and trigger a build:

1. Comment out `"./plugins/fix-onnx-gradle"` → Android build → if passes, plugin is obsolete
2. Comment out `"./plugins/exclude-midi-android"` → Android build → if passes, plugin is obsolete
3. Comment out `"./plugins/strip-push-entitlement"` → iOS build → if passes, plugin is obsolete

Restore any plugins that are still needed. Remove any that are no longer needed.

- [ ] **Step 5: Commit any plugin changes**

```bash
git add app.json
git add -D plugins/  # if any plugins were removed
git commit -m "chore: verify config plugins for SDK 53, remove obsolete ones"
```

---

## Task 7: Feature verification on device

**Files:**
- None (manual testing)

- [ ] **Step 1: Download and install build artifacts**

Download the iOS simulator build from EAS and install:
```bash
# Download .tar.gz from EAS dashboard or:
eas build:list --platform ios --status finished --limit 1
# Install to simulator:
xcrun simctl install booted path/to/PurrrfectKeys.app
```

- [ ] **Step 2: Run through full verification matrix**

Test each area — any regression is a merge blocker:

| Area | Steps | Pass? |
|------|-------|-------|
| **App launch** | Opens without crash, Home tab loads | |
| **Audio playback** | Tap piano keys on Play screen, hear FluidR3 samples | |
| **UI sounds** | Combo sounds, star sounds, haptic feedback | |
| **Exercise flow** | Start lesson-01-ex-01, play through, see scoring + completion | |
| **Combo system** | Build combo, see tier escalation (fire→skull→crown) | |
| **XP/Gems** | Exercise completion awards XP, gems appear in balance | |
| **Level Map** | Learn tab shows winding path, nodes in correct states | |
| **Song Library** | Songs tab loads, browse genres, play a section | |
| **Social tab** | Rank hero card, league standings, friend code visible | |
| **Cat system** | Cat avatar renders (SVG), gallery loads, evolution progress | |
| **Animations** | Cat poses animate, combo glow works, transitions smooth | |
| **Mic input** | Grant mic permission, play a note, see detection response | |
| **Navigation** | All 5 tabs work, stack screens push/pop correctly | |
| **Auth** | Sign out → sign in (anonymous), verify data persists | |
| **AI coaching** | Complete exercise with <80% score, see coaching feedback | |
| **Content** | 599 exercises load (check DailySession), ABC parser works for songs | |

- [ ] **Step 3: Document any issues found**

If issues are found, fix them and re-test. Each fix gets its own commit with a descriptive message.

---

## Task 8: Final verification and merge prep

**Files:**
- None

- [ ] **Step 1: Run full test suite one final time**

```bash
npm run typecheck && npm run test && npm run lint
```

Expected: 0 TS errors, ≥160 suites, ≥3,253 tests, 0 lint errors.

- [ ] **Step 2: Run QA suites**

```bash
npm run test:qa
```

Expected: All QA suites pass.

- [ ] **Step 3: Verify npm audit is clean**

```bash
npm audit --omit=dev
```

Expected: 0 high/critical vulnerabilities.

- [ ] **Step 4: Review git log**

```bash
git log --oneline master..HEAD
```

Verify all commits are clean, well-described, and atomic.

- [ ] **Step 5: Merge to master**

```bash
git checkout master
git merge feat/expo-sdk-53
git push
```

- [ ] **Step 6: Verify CI passes on master**

Check GitHub Actions CI workflow passes (typecheck + lint + test).

- [ ] **Step 7: Update memory**

Update `.claude/projects/-Users-ut-purrrfect-keys/memory/MEMORY.md` with:
- SDK 53 upgrade complete
- react-native-screens unpin status
- Any config plugins removed
- Any new compatibility notes discovered
