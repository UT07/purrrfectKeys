# Manual Verification Checklist

**Purpose:** Concrete steps YOU need to execute before launch — things that require your Firebase Console, GCP access, Apple Developer account, physical devices, or human judgment.
**Companion:** `docs/system-design-analysis.md` (architecture analysis), `docs/plans/UNIFIED-PLAN.md` Phase 11 (full QA audit)

**Last updated:** March 9, 2026
**Codebase health:** 139 test suites, 2,831 tests, 0 failures, 0 TypeScript errors
**GitHub issues:** 0 open (all closed as of Mar 8-9)
**Key completions since initial draft:**
- CI/CD workflows created (`.github/workflows/ci.yml` + `build.yml`)
- Account deletion Cloud Function + client-side fallback implemented (10 tests)
- 9 Cloud Functions written (4 Gemini + sync + recommendations + weekly summary + deletion + cache cleanup)
- Audio session race condition fixed (AudioManager synchronous config)
- Mic pipeline tuned for real iPhone signal levels (measurement mode, RMS threshold, release hold)
- ExerciseLoadingScreen now waits for Salsa TTS to finish before transitioning
- ElevenLabs TTS integrated (13 per-cat neural voices, expo-speech fallback, file-based caching)
- 3D cats ELIMINATED (Mar 3) — all three.js/expo-gl deps removed, SVG-only rendering
- 14+ code bugs fixed from deep audit (polyphony scaling, error handling, race conditions)
- plugins/ directory committed (unblocks EAS builds)
- Firestore security rules written for ALL collections (songs, social, leagues, friendCodes)
- Firestore composite indexes defined (4 indexes)
- Challenge fetching wired: SocialScreen pulls challenges from Firestore on every tab focus
- Social tab badge: CustomTabBar shows red badge for pending challenges + friend requests
- Replay navigation fix: replay completion navigates to next exercise or home (no re-showing CompletionModal)
- ChallengeCard perspective fix: shows correct "Your score" vs "Their score" based on sender/receiver
- Local challenge notifications: fires notification when new incoming challenge detected

---

## Legend

- **[BLOCKER]** — Must fix before ANY public release. App Store will reject or users will hit hard failures.
- **[CRITICAL]** — Must fix before launch. Security/data-loss risk.
- **[IMPORTANT]** — Should fix before launch. Significant UX or reliability gap.
- **[NICE]** — Can ship without, but fix within first month.

---

## A. Firebase Console — Security & Infrastructure

### A1. Firestore Security Rules [BLOCKER]

**Status: Rules WRITTEN** — comprehensive rules exist in `firebase/firestore.rules` covering all collections: users, songs, songMastery, songRequests, leagues, league members, friendCodes, friends, activityFeed, challenges, usernames, gamification, progress, xpLog, syncLog, settings.

- [x] ~~Add rules for social/songs/leagues collections~~ — Done (all 12+ collections covered)
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] **Test from a second account** that you CANNOT read another user's progress, friends, or songMastery

### A2. Firestore Composite Indexes [BLOCKER]

**Status: Indexes DEFINED** in `firebase/firestore.indexes.json` (songs x3, leagues x1). Need deployment.

- [x] ~~Define composite indexes~~ — Done (4 indexes in firestore.indexes.json)
- [ ] Deploy: `firebase deploy --only firestore:indexes`
- [ ] **Test:** Open SongLibraryScreen, filter by genre, filter by difficulty — no errors in console

### A3. Gemini API Key Security [CRITICAL]

The Gemini API key is currently embedded in the client bundle (`EXPO_PUBLIC_GEMINI_API_KEY`). Anyone who decompiles the APK can extract it and run arbitrary Gemini prompts on your billing.

**Status: 9 Cloud Functions written** in `firebase/functions/src/`: generateExercise, generateSong, generateCoachFeedback, deleteUserAllData, syncProgress, completeExercise, getExerciseRecommendations, getWeeklySummary, cleanupCoachFeedbackCache. Client services fall back to direct Gemini API if Cloud Functions are unavailable.

**Remaining steps:**
- [ ] Verify deployment: `firebase functions:list` (may have been deployed Mar 3 — verify)
- [ ] If not deployed: `cd firebase/functions && npm run build && firebase deploy --only functions`
- [ ] Set `GEMINI_API_KEY` as a Firebase secret: `firebase functions:secrets:set GEMINI_API_KEY`
- [ ] Verify Cloud Functions respond correctly (test exercise generation, song generation, coaching)
- [ ] Once confirmed, remove `EXPO_PUBLIC_GEMINI_API_KEY` from client `.env`
- [ ] Set API key restrictions in GCP Console (bundle ID restrictions, 100 RPM, $50/day budget)
- [ ] Verify `EXPO_PUBLIC_GEMINI_API_KEY` is in `.gitignore` and never committed

### A4. Firebase Budget Alerts [CRITICAL]

- [ ] Firebase Console → Usage and billing → Set budget alerts at:
  - $25/month (warning)
  - $50/month (warning)
  - $100/month (critical — investigate immediately)
- [ ] GCP Console → Billing → Budget → Create budget for the Firebase project
- [ ] Set Gemini API quota: GCP Console → APIs → Generative Language API → Quotas → 1,000 RPM

### A5. Firebase App Check [IMPORTANT]

Prevents unauthorized apps from using your Firebase backend.

- [ ] Firebase Console → App Check → Register app (iOS + Android)
- [ ] For iOS: use DeviceCheck provider
- [ ] For Android: use Play Integrity provider
- [ ] Enforce App Check on Firestore and Cloud Functions
- [ ] Test that the app still works after enforcement

### A6. Account Deletion [BLOCKER]

App Store requires functional account deletion.

**Status: Code complete.** Cloud Function `deleteUserData` (`firebase/functions/src/deleteUserData.ts`) handles GDPR-compliant deletion via Admin SDK. Client-side fallback `deleteUserDataClientSide()` in `src/services/firebase/firestore.ts` mirrors the Cloud Function logic using client Firestore SDK. `authStore.deleteAccount()` calls `deleteUserData(uid)` → resets all stores → `user.delete()`. 10 unit tests in `src/services/firebase/__tests__/deleteUserData.test.ts`.

**Implemented deletions:** 9 subcollections (progress, settings, songs, mastery, friends, activity, achievements, learnerProfile, catEvolution), `friendCodes/{code}`, league membership, challenges (bidirectional), friend list cleanup (removes user from all friends' lists), root user document.

**Remaining steps:**
- [ ] Deploy Cloud Function: `firebase deploy --only functions:deleteUserData`
- [ ] **Test on real account:** Create test account → add progress, friends, song mastery, league membership → delete account → verify Firestore is clean (all subcollections, friend codes, league entries, challenges removed)
- [ ] Verify `AccountScreen.tsx` delete button triggers the full flow correctly
- [ ] Verify anonymous users cannot trigger account deletion (or handle gracefully)

---

## B. DevOps & CI/CD

### B1. CI/CD Pipeline [IMPORTANT]

**Status: Implemented.** `.github/workflows/ci.yml` runs `npm ci` → `typecheck` → `lint` → `test --ci --maxWorkers=2` on every push and PR. `.github/workflows/build.yml` triggers EAS Build on version tags (`v*`) using `expo/expo-github-action@v8`.

- [x] ~~Create `.github/workflows/ci.yml`~~ — Done
- [x] ~~Create `.github/workflows/build.yml`~~ — Done
- [ ] Push and verify first CI run passes (check GitHub Actions tab)
- [ ] Add branch protection on `master`: require CI pass before merge

### B2. Environment Management [IMPORTANT]

- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Run `git log --all --full-history -- "*.env*"` to check no `.env` was ever committed
- [ ] If found: rotate ALL exposed keys immediately
- [ ] Create separate Firebase projects for staging vs production (or at minimum, set up a staging Firestore database)
- [ ] Document environment setup in a private doc (not in repo)

### B3. Crash Reporting [IMPORTANT]

No Crashlytics integration exists. Production crashes will be invisible.

- [ ] Install: `npx expo install @react-native-firebase/crashlytics`
- [ ] Add to `app.json` plugins
- [ ] Rebuild dev client
- [ ] Verify crash reports appear in Firebase Console → Crashlytics
- [ ] Test: throw an intentional error → verify it appears in dashboard

### B4. OTA Updates [NICE]

- [ ] Verify `expo-updates` is configured in `app.json`
- [ ] Set update channel: `production` for App Store builds
- [ ] Test an OTA update: publish update → verify app picks it up
- [ ] Set rollout percentage (start at 10%, monitor, then 100%)

### B5. EAS Build Configuration [IMPORTANT]

- [ ] Review `eas.json`: verify `production` profile has correct bundle IDs
- [ ] Run `eas build --platform ios --profile production` (dry run first)
- [ ] Run `eas build --platform android --profile production`
- [ ] Verify build sizes are reasonable (<100MB for iOS, <80MB for Android)

---

## C. App Store Requirements [BLOCKER]

### C1. Privacy Policy

- [ ] Create a privacy policy page (hosted URL required for App Store)
- [ ] Must cover: data collected, how it's used, third-party services (Firebase, Gemini, PostHog)
- [ ] Must state: audio is processed on-device only, never transmitted
- [ ] Must include: how to request data deletion
- [ ] Add URL to app settings and App Store listing

### C2. App Store Assets

- [ ] App icon: 1024x1024 PNG (no alpha channel)
- [ ] Screenshots: 6.7" iPhone (1290x2796) — 3-6 screens
- [ ] Screenshots: 6.1" iPhone (1170x2532) — 3-6 screens
- [ ] Optional: iPad screenshots if supporting iPad
- [ ] App Store description (max 4000 chars)
- [ ] Keywords (100 chars max)
- [ ] App category: Education → Music
- [ ] Age rating: complete the questionnaire (likely 4+)

### C3. App Store Connect Setup

- [ ] Create App Store Connect record
- [ ] Fill in app metadata
- [ ] Set pricing: Free
- [ ] Upload TestFlight build
- [ ] Add internal testers (5-10 people)

---

## D. Physical Device Testing (Cannot Be Simulated)

### D1. Audio Fidelity

- [ ] **iPhone:** Play 10+ exercises — listen for clicks, pops, dropped notes
- [ ] **iPhone:** Rapid note sequences (8th notes at 120 BPM) — verify no audio dropout
- [ ] **iPhone:** Play with volume at 100% — verify no distortion
- [ ] **Android (if available):** Repeat above tests — Android audio latency varies by device
- [ ] **Bluetooth headphones:** Verify audio still works (will have higher latency)
- [ ] **Silent mode:** Verify audio plays even when phone is on silent (common iOS issue)

### D2. MIDI Keyboard

- [ ] Connect a USB MIDI keyboard via adapter
- [ ] Verify device is detected in Settings → Input Method
- [ ] Play single notes → verify correct pitch recognition
- [ ] Play chords → verify all notes detected
- [ ] Play fast passages → verify low latency (<15ms target)
- [ ] Disconnect keyboard mid-exercise → verify graceful fallback to touch

### D3. Microphone

**Status: Multiple fixes applied (Mar 7-8).** Audio session uses `measurement` mode (raw audio, no voice processing). RMS threshold lowered to 0.002 for iPhone mic levels. Release hold extended to 500ms. `createAudioEngine.ts` uses `AudioManager.setAudioSessionOptions()` (synchronous) for session config. ONNX polyphonic detection has graceful YIN monophonic fallback.

- [ ] Grant mic permission via MicSetupScreen
- [ ] Quiet room: play single notes on acoustic piano → verify detection
- [ ] Noisy environment: verify ambient noise rejected (RMS < 0.001)
- [ ] Polyphonic mode: play 2-3 note chords → verify ONNX model detects multiple pitches
- [ ] ONNX model loading: verify `basic-pitch.onnx` loads from assets without crash
- [ ] If ONNX fails: verify automatic fallback to YIN monophonic (should be seamless)
- [ ] Verify audio session does NOT revert to earpiece after mic initialization
- [ ] Verify notes sustain properly (no instant noteOff after detection)

### D4. Text-to-Speech (ElevenLabs + expo-speech)

**Status: Implemented.** Two-tier TTS pipeline: ElevenLabs neural TTS (primary, `eleven_turbo_v2_5` model) with expo-speech fallback. 13 cats mapped to unique ElevenLabs voices matched to personality. File-based audio caching via expo-file-system. Lazy module loading avoids Jest mock interference.

- [ ] **Voice quality:** Play a coaching message with each cat voice — verify neural quality, not robotic
- [ ] **Personality match:** Salsa (Jessica=playful), Jazzy (Will=laid-back), Luna (Lily=ethereal), Shibu (River=calm) — voices match character
- [ ] **Caching:** Repeat same phrase with same cat → second play should be instant (cached mp3)
- [ ] **Fallback:** Remove/invalidate API key → verify expo-speech fallback works seamlessly
- [ ] **No audio overlap:** TTS speech stops when new speech starts or exercise begins
- [ ] **Stop functionality:** Call `ttsService.stop()` → audio stops immediately (both ElevenLabs and expo-speech)
- [ ] **Network failure:** Disable WiFi mid-TTS → verify no crash, fallback to expo-speech on next call
- [ ] **API key security:** Verify `EXPO_PUBLIC_ELEVENLABS_API_KEY` is in `.gitignore` and `.env.local` only

### ~~D5. 3D Rendering~~ — ELIMINATED (Mar 3, 2026)

3D cats (react-three-fiber, expo-gl, three.js) were removed due to GL context crashes on device. All rendering is now SVG-only via `CatAvatar` component. Premium SVG cats planned for Phase 11B.

### D5. Performance

- [ ] Cold start time: tap icon → interactive HomeScreen (target: <3s)
- [ ] Exercise Player: touch key → hear sound (perceived latency)
- [ ] Play 10 exercises in a row: verify no memory growth (check Xcode Instruments)
- [ ] Leave app open 30 minutes: verify no battery drain spikes
- [ ] Airplane mode: verify full core loop works offline

### D6. Maestro E2E Tests

**Status: Scaffolded, needs selector work.** 12 flow files + 3 helper files + config + scripts exist in `ios/.maestro/`. Covers app launch, user auth, form validation, list scrolling, network loading, deep linking, gestures, permissions, accessibility, performance, cross-platform, and error handling.

- [ ] Add `testID` props to key interactive elements in React components (buttons, inputs, screens)
- [ ] Update Maestro YAML selectors to match actual `testID` values
- [ ] Run `ios/run-maestro-tests.sh` against simulator → fix any selector mismatches
- [ ] Verify at least flows 01 (app launch) and 02 (user auth) pass end-to-end
- [ ] Integrate Maestro into CI (optional — can be post-launch)

---

## E. Firebase Data Integrity

### E1. Verify Existing Firestore Data

- [ ] Check `songs` collection: 124 documents present
- [ ] Spot-check 5 songs: verify `metadata`, `sections`, `abcNotation` fields are populated
- [ ] Check `users` collection structure: at least your test account has correct subcollections
- [ ] Check `leagues` collection: verify structure matches leagueService expectations

### E2. Sync Integrity

- [ ] Device A: complete 3 exercises → verify scores saved to Firestore
- [ ] Device B: sign in with same account → verify all 3 scores appear
- [ ] Device A: complete exercise offline → go online → verify sync completes
- [ ] Conflict: complete same exercise on both devices → verify "highest wins" merge

### E3. Data Migration

- [ ] Fresh install: complete exercises as anonymous user
- [ ] Sign in with email → verify local data migrates to cloud
- [ ] Sign out → verify data preserved locally
- [ ] Sign in with different account → verify clean slate (no data bleed)

---

## F. Security Spot-Checks

### F1. Authentication

- [ ] Sign up with new email → verify email sent (if email verification enabled)
- [ ] Attempt to access Firestore directly via REST API without auth → should be rejected
- [ ] Verify anonymous users cannot access social features
- [ ] Verify JWT token refresh works (leave app open > 1 hour)

### F2. Data Isolation

- [ ] Create 2 test accounts (Account A and Account B)
- [ ] Account A: add progress, friends, song mastery
- [ ] Account B: verify CANNOT see Account A's data in any screen
- [ ] Firestore Console: verify rules reject cross-user reads

### F3. Input Sanitization

- [ ] Friend code input: try entering special characters, SQL-like strings, scripts
- [ ] Song search: try XSS-style inputs (`<script>alert(1)</script>`)
- [ ] Verify no crashes or unexpected behavior from malformed input

---

## G. Third-Party Service Verification

### G1. PostHog Analytics

- [ ] Verify PostHog is receiving events (check PostHog dashboard)
- [ ] Verify no PII is being tracked (no emails, names in event properties)
- [ ] Verify session replay is OFF by default (privacy)
- [ ] Test feature flags work (if configured)

### G2. Gemini AI

- [ ] GCP Console: check Gemini API usage/billing
- [ ] Verify rate limiting works: spam exercise generation → should be throttled
- [ ] Verify offline fallback: disable WiFi → AI coach shows template response
- [ ] Verify content safety: generated exercises don't contain offensive text

### G3. ElevenLabs TTS

- [ ] Verify ElevenLabs dashboard shows API usage (check quota consumption)
- [ ] Verify rate limits: ElevenLabs free tier allows 10K chars/month — set up usage alerts
- [ ] Verify all 13 voice IDs are valid and active in ElevenLabs account
- [ ] If upgrading to paid plan: update API key and verify increased quota
- [ ] Verify no PII is sent to ElevenLabs (only coaching text, no user identifiers)

### G4. Expo/EAS

- [ ] Verify EAS project is linked: `eas whoami`
- [ ] Verify push notification credentials (if using push): `eas credentials`
- [ ] Review `eas.json` build profiles match your signing credentials

## G5. Social Features & Challenges

### G5a. Challenge Flow [IMPORTANT]

**Status: Code complete (Mar 9).** Challenge fetching wired via `getChallengesForUser()` in SocialScreen, triggered on every tab focus via `useFocusEffect`. ChallengeCard displays correct sender/receiver perspective.

- [ ] **Send challenge:** Complete exercise → CompletionModal → "Challenge a Friend" → friend receives it
- [ ] **Receive challenge:** Open Social tab → pending challenge appears with correct exercise title and sender's score
- [ ] **Accept challenge:** Tap challenge → play exercise → score submitted → card updates to "completed"
- [ ] **Score perspective:** Sender sees "Your score: X%" (their score) and "Their score: Y%" (friend's score, or "Not played yet")
- [ ] **Expiry:** Verify expired challenges show as expired (not pending)

### G5b. Social Tab Badge [IMPORTANT]

**Status: Code complete (Mar 9).** CustomTabBar shows red badge on Social tab combining pending challenge count + pending friend request count.

- [ ] **Badge appears:** Have a friend send a challenge → Social tab shows red badge with count
- [ ] **Badge updates:** Accept the challenge → badge count decreases
- [ ] **Friend requests:** Send a friend request from another account → badge includes friend request count
- [ ] **Badge clears:** Accept/decline all pending items → badge disappears

### G5c. Challenge Notifications [IMPORTANT]

**Status: Code complete (Mar 9).** Local notifications fire when SocialScreen detects new incoming challenges from Firestore.

- [ ] **Notification fires:** Have a friend send a challenge → open Social tab → local notification appears
- [ ] **Content correct:** Notification shows sender name, exercise title, and sender's score
- [ ] **No duplicates:** Re-open Social tab → same challenge does NOT trigger another notification
- [ ] **Note:** Notifications are pull-based (fire on tab focus, not real-time). For real-time, FCM push needed.

### G5d. Replay Navigation [IMPORTANT]

**Status: Code complete (Mar 9).** When Salsa replay finishes naturally (beat >= totalBeats), navigates to next exercise or home instead of re-showing CompletionModal.

- [ ] **Replay finishes → next exercise:** Complete exercise → "Review with Salsa" → replay runs to end → auto-navigates to next exercise
- [ ] **Replay finishes → home (AI mode):** In AI mode with no next exercise → replay ends → navigates to home
- [ ] **Exit early → modal:** During replay, tap "Exit Review" → CompletionModal re-appears (correct behavior)

---

## H. Monitoring & Alerting Setup (Post-Launch)

### H1. Firebase Monitoring

- [ ] Enable Firebase Performance Monitoring
- [ ] Set up Cloud Monitoring alerts for:
  - Cloud Function error rate > 5%
  - Cloud Function latency P95 > 5s
  - Firestore reads > 100K/day (anomaly detection)
- [ ] Set up Firestore daily backup (Cloud Scheduler → `gcloud firestore export`)

### H2. App Monitoring

- [ ] Crashlytics: verify crash-free rate visible
- [ ] Set up Slack/email alerts for:
  - Crashlytics: new crash cluster
  - Firebase: budget threshold exceeded
  - EAS Build: build failure

### H3. On-Call Plan

- [ ] Document who monitors what after launch
- [ ] Document hotfix process: bug report → fix → OTA update (or App Store update if native)
- [ ] Define rollback plan: how to revert a bad OTA update

---

## Quick Reference: Priority Order

| Priority | Section | Est. Time | Status | Must Complete Before |
|----------|---------|-----------|--------|---------------------|
| 1 | A1: Firestore Rules | Deploy + test | RULES WRITTEN — need deploy | Any beta testing |
| 2 | A2: Firestore Indexes | Deploy | INDEXES DEFINED — need deploy | Any beta testing |
| 3 | A3: Cloud Functions | Deploy + test | 9 FUNCTIONS WRITTEN — verify deploy | Any beta testing |
| 4 | A6: Account Deletion | Deploy + test | CODE DONE (10 tests) | App Store submission |
| 5 | D3: Mic Pipeline | Device test | CODE FIXED (Mar 7-8) | Before beta |
| 6 | C1: Privacy Policy | 1 day | TODO | App Store submission |
| 7 | A4: Budget Alerts | 15 min | TODO | Public launch |
| 8 | B1: CI/CD | Verify runs | DONE (ci.yml + build.yml) | Before team grows |
| 9 | B3: Crash Reporting | 2 hours | TODO | Before beta |
| 10 | C2-C3: App Store Assets | 2-3 days | TODO | App Store submission |
| 11 | D1-D5: Device Testing (audio, TTS, perf) | 2-3 days | TODO | Before beta |
| 12 | D6: Maestro E2E | 1-2 days | SCAFFOLDED (needs selectors) | Before beta |
| 13 | A5: App Check | 2 hours | TODO | Public launch |
| 14 | E1-E3: Data Integrity | 1 day | TODO | Before beta |
| 15 | F1-F3: Security Checks | half day | TODO | Before beta |
| 16 | B2: Environment Mgmt | half day | TODO | Before public launch |
| 17 | G1-G4: Third-party verify | 2 hours | TODO | Before beta |
| 18 | B4-B5: OTA + Build | half day | TODO | Before beta |
| 19 | H1-H3: Monitoring | 1 day | TODO | Within 1 week of launch |

**Total estimated effort: ~8-10 working days** (reduced from 10-12 due to rules, indexes, mic fixes, and bug fixes already done)

---

## After Each Phase Audit Template

Use this template after completing each implementation phase to ensure nothing slips through:

```
### Phase [N] Post-Implementation Audit

Date: ____
Phase: ____

#### Code Quality
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run lint` → 0 errors
- [ ] No `any` types introduced
- [ ] No console.log statements
- [ ] New stores have persistence + reset()

#### Firebase Impact
- [ ] Security rules updated for new collections?
- [ ] Composite indexes needed for new queries?
- [ ] Cloud Functions updated?
- [ ] Firestore read/write cost impact assessed?

#### Device Testing
- [ ] Core flow tested on physical device
- [ ] Audio features tested on physical device
- [ ] No GL/rendering issues on device
- [ ] Performance acceptable (no jank, no memory leaks)

#### Data Integrity
- [ ] New data persists across app restart
- [ ] New data syncs cross-device (if applicable)
- [ ] Account deletion handles new data

#### Security
- [ ] No API keys exposed
- [ ] User data isolation verified
- [ ] Input sanitization for new user inputs

#### UX Review
- [ ] Navigation flows work (forward + back)
- [ ] Loading states shown for async operations
- [ ] Error states shown for failures
- [ ] Accessibility: labels on new interactive elements
```
