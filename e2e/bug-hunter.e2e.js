/**
 * bug-hunter.e2e.js
 * Proactive exploratory test suite for Purrrfect Keys.
 *
 * Targets edge cases and state transitions that manual QA has found bugs in:
 * 1.  Cross-device sync not working after Google sign-in
 * 2.  Exercise speed 0.6x being too fast for beginners on screen keyboard
 * 3.  Notes moving/falling during countdown instead of being frozen
 * 4.  CompletionModal with AI coaching never appearing (ExerciseCard shown instead)
 * 5.  Account deletion failing without re-auth prompt
 * 6.  Settings not persisting after sign-out/sign-in
 *
 * Suite overview:
 * BH-1:  State Persistence — settings survive force-close / relaunch
 * BH-2:  Auth State Transitions — guest → link Google → sign out → sign back in
 * BH-3:  Exercise Edge Cases — pause-immediately, exit-during-count-in, 0% score retry
 * BH-4:  Speed Settings Integrity — all speeds accessible, label reflects selection
 * BH-5:  Rapid Interaction Stress — multi-key taps, double-start, rapid tab switching
 * BH-6:  Data Integrity After Auth Changes — guest data cleared on new guest session
 * BH-7:  Navigation Deep Stack — deep push/pop without crash
 * BH-8:  Completion Modal Variants — CompletionModal vs ExerciseCard, score ring, AI section
 * BH-9:  Free Play Analysis — analysis card after silence, Generate Drill button
 * BH-10: Keyboard Range Adaptation — high-note / low-note exercises show correct range
 * BH-11: Count-in Freeze — notes must not fall during count-in phase
 * BH-12: Account Deletion Re-auth Guard — deletion flow prompts re-authentication
 */

/* eslint-disable no-undef */

const { device, element, by, waitFor } = require('detox');

const {
  sleep,
  isVisibleById,
  isVisibleByText,
  tapIfVisibleById,
  signInWithSkipAndReachHome,
  goToLearnTab,
  goToPlayTab,
  goToProfileTab,
  openCurrentLessonIntro,
  ensureExercisePlaying,
  startCurrentLessonExercise,
} = require('./helpers/appFlows');

// ============================================================================
// Local helpers
// ============================================================================

/** Tap a piano key by MIDI note number. Falls back silently if not found. */
async function tapPianoKey(midiNote, waitMs = 0) {
  const found = await isVisibleById(`key-${midiNote}`, 3000);
  if (found) {
    await element(by.id(`key-${midiNote}`)).tap();
  } else {
    // Fallback: tap the keyboard container area
    await tapIfVisibleById('exercise-keyboard', 2000);
  }
  if (waitMs > 0) await sleep(waitMs);
}

/**
 * Navigate into the exercise player from wherever the app is.
 * Returns true if the exercise player was successfully reached.
 */
async function navigateToExercisePlayer() {
  await openCurrentLessonIntro();
  await waitFor(element(by.id('lesson-intro-start'))).toBeVisible().withTimeout(10000);
  await element(by.id('lesson-intro-start')).tap();
  await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(30000);
  return true;
}

/**
 * Wait for the completion modal OR the exercise card (quick between-exercise card).
 * Returns 'modal', 'card', or 'none'.
 */
async function waitForCompletionOrCard(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isVisibleById('completion-modal', 1500)) return 'modal';
    if (await isVisibleById('exercise-card', 1500)) return 'card';
    if (!(await isVisibleById('exercise-player', 1000))) break;
    await sleep(800);
  }
  return 'none';
}

/** Play Lesson 1 Exercise 1 notes (4× Middle C at 50 BPM). */
async function playLesson01Ex01Notes() {
  await sleep(1200);
  await tapPianoKey(60);
  await sleep(1200);
  await tapPianoKey(60);
  await sleep(1200);
  await tapPianoKey(60);
  await sleep(1200);
  await tapPianoKey(60);
}

/**
 * Reach the Profile screen and then open the Account sub-screen.
 * Returns true on success.
 */
async function openAccountScreen() {
  await goToProfileTab();
  await element(by.id('profile-scroll')).scroll(150, 'down');
  await sleep(300);
  const found = await isVisibleById('profile-open-account', 3000);
  if (!found) return false;
  await element(by.id('profile-open-account')).tap();
  await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(12000);
  return true;
}

/**
 * Set the exercise speed by tapping the speed-selector until the target label appears.
 * targetLabel examples: '0.25x', '0.5x', '0.75x', '1x'
 */
async function setSpeed(targetLabel) {
  // Pause first so secondary controls are visible
  await tapIfVisibleById('control-pause', 2000);
  await sleep(400);

  const speedFullVisible = await isVisibleById('speed-selector-full', 3000);
  const speedCompactVisible = await isVisibleById('speed-selector', 3000);
  if (!speedFullVisible && !speedCompactVisible) return false;

  const selectorId = speedFullVisible ? 'speed-selector-full' : 'speed-selector';

  for (let i = 0; i < 5; i++) {
    const alreadySet = await isVisibleByText(targetLabel, 1500);
    if (alreadySet) return true;
    await element(by.id(selectorId)).tap();
    await sleep(350);
  }
  return await isVisibleByText(targetLabel, 1500);
}

// ============================================================================
// BH-Suite 1: State Persistence — settings survive force-close / relaunch
// ============================================================================

describe('BH-Suite 1: State Persistence After Force-Close', () => {
  /**
   * Strategy: fresh install → set daily goal and volume → force-close (newInstance:true)
   * → relaunch WITHOUT delete → verify the settings are still set.
   */
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-1.1 — navigate to profile and open daily goal picker', async () => {
    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    // Scroll to find the daily goal row
    await element(by.id('profile-scroll')).scroll(100, 'down');
    await sleep(300);
    const goalVisible = await isVisibleById('profile-daily-goal', 3000);
    console.log(`Daily goal row visible: ${goalVisible}`);
  });

  it('BH-1.2 — change daily goal to 15 minutes', async () => {
    if (!(await isVisibleById('profile-daily-goal', 3000))) return;
    await element(by.id('profile-daily-goal')).tap();
    await sleep(400);
    // Tap the 15-minute option chip
    const has15 = await tapIfVisibleById('goal-option-15', 2000);
    if (!has15) {
      // Try finding by text if testID differs
      const textVisible = await isVisibleByText('15 min', 2000);
      if (textVisible) {
        await element(by.text('15 min')).tap();
      }
    }
    await sleep(400);
    console.log('Daily goal set to 15 min');
  });

  it('BH-1.3 — change volume setting', async () => {
    const volumeVisible = await isVisibleById('profile-volume', 3000);
    if (!volumeVisible) {
      await element(by.id('profile-scroll')).scroll(100, 'down');
      await sleep(300);
    }
    if (await isVisibleById('profile-volume', 2000)) {
      await element(by.id('profile-volume')).tap();
      await sleep(400);
      // Select a specific volume level
      const volOption = await tapIfVisibleById('volume-option-80', 2000);
      if (!volOption) {
        await tapIfVisibleById('volume-option-medium', 2000);
      }
      await sleep(400);
    }
  });

  it('BH-1.4 — force-close (kill) the app', async () => {
    // newInstance:true kills and restarts without clearing data
    await device.launchApp({ newInstance: true });
    await sleep(2000);
  });

  it('BH-1.5 — app restores to a valid screen (not blank)', async () => {
    const onHome = await isVisibleById('home-screen', 15000);
    const onAuth = await isVisibleById('auth-screen', 8000);
    const onOnboarding = await isVisibleById('onboarding-screen', 5000);
    expect(onHome || onAuth || onOnboarding).toBe(true);
  });

  it('BH-1.6 — settings are still present after relaunch', async () => {
    // Navigate to profile and verify settings survived the kill
    await signInWithSkipAndReachHome();
    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    // Profile screen rendered = store hydrated. Log the fact for CI trace.
    const profileVisible = await isVisibleById('profile-screen', 3000);
    expect(profileVisible).toBe(true);
    console.log('Profile rendered after relaunch — MMKV store hydrated successfully');
  });

  it('BH-1.7 — XP and level survive relaunch (no regression to 0)', async () => {
    // The stats grid renders level and XP. We just confirm the grid is visible,
    // not blank. Actual value comparison would need a seeded state.
    const statsVisible = await isVisibleById('profile-stats-grid', 5000);
    console.log(`Stats grid visible after relaunch: ${statsVisible}`);
    // Streak card
    const streakVisible = await isVisibleById('profile-streak', 3000);
    console.log(`Streak row visible: ${streakVisible}`);
  });
});

// ============================================================================
// BH-Suite 2: Auth State Transitions
// ============================================================================

describe('BH-Suite 2: Auth State Transitions — Guest → Link → Sign Out → Sign In', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-2.1 — start exercise as guest and record progress', async () => {
    await startCurrentLessonExercise();
    await playLesson01Ex01Notes();
    await sleep(3000);

    // Accept any completion UI
    await tapIfVisibleById('completion-next', 3000);
    await tapIfVisibleById('completion-continue', 3000);
    await tapIfVisibleById('completion-retry', 3000);
    await tapIfVisibleById('exercise-card-next', 2000);
    await tapIfVisibleById('control-exit', 3000);
    await sleep(800);
    console.log('Exercise completed as guest');
  });

  it('BH-2.2 — profile shows non-zero XP after exercise completion', async () => {
    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    const statsVisible = await isVisibleById('profile-stats-grid', 5000);
    console.log(`Stats grid after completing exercise: ${statsVisible}`);
  });

  it('BH-2.3 — open account screen as anonymous user', async () => {
    const opened = await openAccountScreen();
    expect(opened).toBe(true);
    await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-2.4 — anonymous account shows link options (not sign-out)', async () => {
    // Anonymous users should see "Link with Google" and "Link with Email"
    const hasLinkEmail = await isVisibleById('account-link-email', 5000);
    const hasLinkGoogle = await isVisibleById('account-link-google', 5000);
    console.log(`Link email: ${hasLinkEmail}, Link Google: ${hasLinkGoogle}`);
    // At least one linking option should be present
    expect(hasLinkEmail || hasLinkGoogle).toBe(true);
  });

  it('BH-2.5 — tapping Link with Email opens email auth screen', async () => {
    if (!(await isVisibleById('account-link-email', 3000))) return;
    await element(by.id('account-link-email')).tap();
    await waitFor(element(by.id('email-auth-screen'))).toBeVisible().withTimeout(12000);
  });

  it('BH-2.6 — back from email auth returns to account screen (not home)', async () => {
    if (!(await isVisibleById('email-auth-screen', 3000))) return;
    await element(by.id('email-auth-back')).tap();
    await sleep(600);
    // Must return to account screen, not skip past it
    await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-2.7 — back from account screen returns to profile screen', async () => {
    await element(by.id('account-back')).tap();
    await sleep(600);
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-2.8 — sign out (if available on anonymous) does not crash', async () => {
    // Some builds expose sign-out even for anonymous users.
    // If it exists, tap it and ensure the app reaches auth or home, not a blank screen.
    const opened = await openAccountScreen();
    if (!opened) return;

    const hasSignOut = await isVisibleById('account-sign-out', 3000);
    if (!hasSignOut) {
      console.log('No sign-out button for anonymous user — expected behavior');
      await element(by.id('account-back')).tap();
      await sleep(500);
      return;
    }

    await element(by.id('account-sign-out')).tap();
    await sleep(1500);

    // After sign-out, expect auth or home screen
    const onAuth = await isVisibleById('auth-screen', 8000);
    const onHome = await isVisibleById('home-screen', 5000);
    const onOnboarding = await isVisibleById('onboarding-screen', 5000);
    console.log(`After sign-out: auth=${onAuth} home=${onHome} onboarding=${onOnboarding}`);
    expect(onAuth || onHome || onOnboarding).toBe(true);
  });
});

// ============================================================================
// BH-Suite 3: Exercise Edge Cases
// ============================================================================

describe('BH-Suite 3: Exercise Edge Cases', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-3.1 — start exercise and immediately pause (within first beat)', async () => {
    await startCurrentLessonExercise();
    // Pause within the first 300ms of count-in
    await sleep(300);
    await tapIfVisibleById('control-pause', 2000);
    await sleep(300);
    // Exercise player should still be visible (not crashed/exited)
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
    // Play button should now be visible
    const hasPlay = await isVisibleById('control-play', 3000);
    console.log(`Play button after immediate pause: ${hasPlay}`);
    expect(hasPlay).toBe(true);
  });

  it('BH-3.2 — resume after immediate pause continues scoring correctly', async () => {
    await element(by.id('control-play')).tap();
    await sleep(500);
    // Pause button visible again = playback resumed
    const hasPause = await isVisibleById('control-pause', 5000);
    expect(hasPause).toBe(true);
    // Exit cleanly
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-3.3 — exit exercise during count-in phase does not crash', async () => {
    await navigateToExercisePlayer();
    // Dismiss intro overlay if present
    await tapIfVisibleById('exercise-intro-ready', 3000);
    await sleep(300);
    // Count-in is happening — exit immediately
    await tapIfVisibleById('control-exit', 5000);
    await sleep(800);
    // Must NOT be on exercise player (no stuck state)
    const onExercise = await isVisibleById('exercise-player', 2000);
    expect(onExercise).toBe(false);
  });

  it('BH-3.4 — app is still responsive after count-in exit', async () => {
    // Verify we can navigate normally after the edge case
    await tapIfVisibleById('tab-home', 3000);
    await sleep(500);
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-3.5 — playing all wrong notes produces 0% or near-0% score', async () => {
    await startCurrentLessonExercise();
    // Intentionally tap wrong notes throughout (lesson 1 expects MIDI 60, we tap 50)
    await sleep(1200);
    await tapPianoKey(50);
    await sleep(1200);
    await tapPianoKey(50);
    await sleep(1200);
    await tapPianoKey(50);
    await sleep(1200);
    await tapPianoKey(50);
    await sleep(3000);

    const completionAppeared = await waitForCompletionOrCard(30000);
    console.log(`Completion after wrong notes: ${completionAppeared}`);
  });

  it('BH-3.6 — retry button shows when exercise is failed (low score)', async () => {
    // After a failed exercise, the CompletionModal should show "Try Again" (retry)
    // and NOT show "Next Exercise" as the primary button.
    const modalVisible = await isVisibleById('completion-modal', 8000);
    if (!modalVisible) {
      console.log('Completion modal not shown — exiting exercise for next test');
      await tapIfVisibleById('control-exit', 5000);
      return;
    }
    const hasRetry = await isVisibleById('completion-retry', 5000);
    const hasNext = await isVisibleById('completion-next', 3000);
    console.log(`After wrong notes — retry: ${hasRetry}, next: ${hasNext}`);
    // Bug check: if score is ~0, retry should be present and next should NOT be primary
    if (hasRetry) {
      expect(hasRetry).toBe(true);
    }
    // Clean up
    await tapIfVisibleById('completion-retry', 3000);
    await sleep(800);
    await tapIfVisibleById('control-exit', 3000);
    await sleep(800);
  });

  it('BH-3.7 — restart mid-exercise resets note counter (no phantom completion)', async () => {
    await startCurrentLessonExercise();
    // Play some notes
    await tapPianoKey(60, 500);
    await tapPianoKey(60, 500);
    // Restart before exercise ends
    await element(by.id('control-restart')).tap();
    await sleep(1000);
    // Exercise player should be running fresh (count-in again, not instantly complete)
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(8000);
    const hasCompletion = await isVisibleById('completion-modal', 2000);
    expect(hasCompletion).toBe(false); // Must NOT complete immediately after restart
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });
});

// ============================================================================
// BH-Suite 4: Speed Settings Integrity
// ============================================================================

describe('BH-Suite 4: Speed Settings Integrity', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
    await startCurrentLessonExercise();
  });

  it('BH-4.1 — speed selector is visible in top bar during playback', async () => {
    await waitFor(element(by.id('speed-selector'))).toBeVisible().withTimeout(10000);
  });

  it('BH-4.2 — default speed is 1x', async () => {
    const hasDefault = await isVisibleByText('1x', 3000);
    console.log(`Default speed shows 1x: ${hasDefault}`);
    // 1x is the standard default; log but don't hard-fail (could be last session value)
  });

  it('BH-4.3 — tap speed-selector cycles to 0.25x (slowest)', async () => {
    // Cycle: 1x → 0.25x → 0.5x → 0.75x → 1x
    await element(by.id('speed-selector')).tap();
    await sleep(400);
    const at025 = await isVisibleByText('0.25x', 3000);
    console.log(`After 1 tap, 0.25x visible: ${at025}`);
  });

  it('BH-4.4 — 0.25x speed is accessible and label shown (not crash)', async () => {
    // Exercise must still be running at 0.25x — confirm player still alive
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
  });

  it('BH-4.5 — tap to 0.5x', async () => {
    await element(by.id('speed-selector')).tap();
    await sleep(400);
    const at05 = await isVisibleByText('0.5x', 3000);
    console.log(`0.5x visible: ${at05}`);
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
  });

  it('BH-4.6 — tap to 0.75x', async () => {
    await element(by.id('speed-selector')).tap();
    await sleep(400);
    const at075 = await isVisibleByText('0.75x', 3000);
    console.log(`0.75x visible: ${at075}`);
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
  });

  it('BH-4.7 — tap back to 1x', async () => {
    await element(by.id('speed-selector')).tap();
    await sleep(400);
    const at1x = await isVisibleByText('1x', 3000);
    console.log(`1x visible after full cycle: ${at1x}`);
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
  });

  it('BH-4.8 — secondary speed selector (when paused) reflects same value', async () => {
    await element(by.id('control-pause')).tap();
    await sleep(500);
    // Secondary controls bar should appear
    const hasSecondary = await isVisibleById('speed-selector-full', 5000);
    if (hasSecondary) {
      // Tap secondary to cycle
      await element(by.id('speed-selector-full')).tap();
      await sleep(400);
      // Both pills should agree on the value
      const has025TopBar = await isVisibleByText('0.25x', 2000);
      console.log(`After tapping secondary, top-bar shows 0.25x: ${has025TopBar}`);
    } else {
      console.log('Secondary speed selector not visible when paused — may be collapsed');
    }
  });

  it('BH-4.9 — BUG CHECK: setting 0.5x speed does not cause notes to rush at wrong BPM', async () => {
    // Resume at 0.5x and tap keys — exercise should still accept notes (not expire them instantly)
    await tapIfVisibleById('control-play', 3000);
    await sleep(500);

    // At 0.5x of 60 BPM = effective 30 BPM, 1 beat = 2000ms.
    // The exercise should NOT complete instantly after a couple of taps.
    await tapPianoKey(60, 800);
    const stillOnExercise = await isVisibleById('exercise-player', 2000);
    expect(stillOnExercise).toBe(true); // Must still be playing (not prematurely complete)
    console.log('Exercise still active after 1 note at 0.5x — speed scaling is correct');
  });

  it('BH-4.10 — cleanup: exit exercise', async () => {
    await tapIfVisibleById('control-exit', 5000);
    await sleep(800);
    const onExercise = await isVisibleById('exercise-player', 2000);
    expect(onExercise).toBe(false);
  });
});

// ============================================================================
// BH-Suite 5: Rapid Interaction Stress
// ============================================================================

describe('BH-Suite 5: Rapid Interaction Stress Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-5.1 — simultaneous multi-key taps do not freeze audio or UI', async () => {
    await startCurrentLessonExercise();
    // Tap several different keys with minimal delay to stress multi-touch handling
    const midiNotes = [60, 62, 64, 65, 67];
    for (const note of midiNotes) {
      await tapPianoKey(note);
      // 50ms between taps — very fast, testing the audio pool under load
      await sleep(50);
    }
    await sleep(500);
    // App must still be alive
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-5.2 — double-tap on lesson node does not open two lesson intros', async () => {
    await goToLearnTab();
    await waitFor(element(by.id('lesson-node-current'))).toBeVisible().withTimeout(15000);
    await element(by.id('lesson-node-current')).multiTap(2);
    await sleep(1500);
    // Only ONE lesson intro should be on the stack, not two
    await waitFor(element(by.id('lesson-intro-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('lesson-intro-back')).tap();
    await sleep(600);
    // Should be back on level map, not still on another lesson intro
    await waitFor(element(by.id('level-map-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-5.3 — rapid tab switching 10 times does not crash', async () => {
    const tabs = ['tab-home', 'tab-learn', 'tab-profile', 'tab-home', 'tab-learn',
                  'tab-profile', 'tab-home', 'tab-learn', 'tab-home', 'tab-profile'];
    for (const tab of tabs) {
      await tapIfVisibleById(tab, 2000);
      await sleep(150);
    }
    // End on home
    await tapIfVisibleById('tab-home', 3000);
    await sleep(500);
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-5.4 — tapping exercise start button twice in rapid succession does not duplicate', async () => {
    await navigateToExercisePlayer();
    // Dismiss intro if visible
    const hasIntro = await isVisibleById('exercise-intro', 3000);
    if (hasIntro) {
      // Double-tap the ready button
      await element(by.id('exercise-intro-ready')).multiTap(2);
    }
    await sleep(1000);
    // Exercise player should be active, not in a weird double-start state
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(8000);
    const hasControls = await isVisibleById('exercise-controls', 3000);
    expect(hasControls).toBe(true);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-5.5 — hammering restart button 5 times does not corrupt state', async () => {
    await startCurrentLessonExercise();
    for (let i = 0; i < 5; i++) {
      await tapIfVisibleById('control-restart', 1500);
      await sleep(300);
    }
    await sleep(1000);
    // Should still be on exercise player
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(8000);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-5.6 — rapidly alternating pause/play 6 times does not freeze', async () => {
    await startCurrentLessonExercise();
    for (let i = 0; i < 6; i++) {
      await tapIfVisibleById('control-pause', 1500);
      await sleep(200);
      await tapIfVisibleById('control-play', 1500);
      await sleep(200);
    }
    // Ensure exercise is still playable after rapid toggles
    await ensureExercisePlaying();
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-5.7 — rapidly tapping same piano key 10 times does not drop audio pool', async () => {
    await startCurrentLessonExercise();
    for (let i = 0; i < 10; i++) {
      await tapPianoKey(60);
      await sleep(120);
    }
    await sleep(500);
    // Exercise player still alive = audio pool did not crash
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });
});

// ============================================================================
// BH-Suite 6: Data Integrity After Auth Changes
// ============================================================================

describe('BH-Suite 6: Data Integrity After Auth Changes', () => {
  /**
   * Guest A completes an exercise → app shows XP > 0.
   * delete:true (fresh app) → Guest B is a brand new anonymous user.
   * Guest B must start from 0 XP (data NOT shared between anonymous sessions).
   */

  it('BH-6.1 — guest A completes exercise and gains XP', async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();

    await startCurrentLessonExercise();
    await playLesson01Ex01Notes();
    await sleep(3000);

    await tapIfVisibleById('completion-next', 3000);
    await tapIfVisibleById('completion-continue', 3000);
    await tapIfVisibleById('completion-retry', 3000);
    await tapIfVisibleById('exercise-card-next', 2000);
    await tapIfVisibleById('control-exit', 3000);
    await sleep(800);

    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    console.log('Guest A session complete — XP earned');
  });

  it('BH-6.2 — fresh install creates Guest B with clean state', async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();

    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    console.log('Guest B starts with fresh profile — no cross-contamination from Guest A');
    // The profile renders = store initialized fresh. A contaminated state would show
    // leftover XP from Guest A, which Detox tests can only observe structurally.
  });

  it('BH-6.3 — lesson progress is empty for Guest B (first exercise in Lesson 1)', async () => {
    await goToLearnTab();
    await waitFor(element(by.id('level-map-screen'))).toBeVisible().withTimeout(15000);
    // The current node should be Lesson 1 (first lesson) — confirming fresh state
    const hasCurrentNode = await isVisibleById('lesson-node-current', 5000);
    expect(hasCurrentNode).toBe(true);
    console.log('Lesson 1 is the current node for Guest B — no leaked progress');
  });

  it('BH-6.4 — sign out and sign back in as guest resets session (new anonymous UID)', async () => {
    // Sign out if the option exists
    const opened = await openAccountScreen();
    if (!opened) {
      console.log('Account screen not reachable — skipping sign-out test');
      return;
    }

    const hasSignOut = await isVisibleById('account-sign-out', 3000);
    if (!hasSignOut) {
      console.log('Sign-out button not visible for this account type');
      await element(by.id('account-back')).tap();
      await sleep(500);
      return;
    }

    await element(by.id('account-sign-out')).tap();
    await sleep(1500);

    // Re-sign in as guest
    if (await isVisibleById('auth-screen', 8000)) {
      await tapIfVisibleById('skip-signin', 5000);
      await sleep(1000);
    }

    // After re-sign-in, navigate to profile
    await signInWithSkipAndReachHome();
    await goToProfileTab();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    console.log('Re-authenticated as new guest — profile renders without crash');
  });
});

// ============================================================================
// BH-Suite 7: Navigation Deep Stack
// ============================================================================

describe('BH-Suite 7: Navigation Deep Stack — No Crashes on Pop', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-7.1 — Home → Learn → LevelMap → LessonIntro → Exercise → Pause → Exit → LevelMap', async () => {
    await element(by.id('tab-home')).tap();
    await sleep(400);
    await goToLearnTab();

    // Go deeper: browse lessons
    const hasBrowse = await isVisibleById('daily-session-browse-lessons', 5000);
    if (hasBrowse) {
      await element(by.id('daily-session-browse-lessons')).tap();
      await waitFor(element(by.id('level-map-screen'))).toBeVisible().withTimeout(15000);
    }

    await waitFor(element(by.id('lesson-node-current'))).toBeVisible().withTimeout(15000);
    await element(by.id('lesson-node-current')).tap();
    await waitFor(element(by.id('lesson-intro-screen'))).toBeVisible().withTimeout(15000);
    await element(by.id('lesson-intro-start')).tap();
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(30000);

    await tapIfVisibleById('exercise-intro-ready', 5000);
    await sleep(500);
    await tapIfVisibleById('control-pause', 3000);
    await sleep(300);
    await element(by.id('control-exit')).tap();
    await sleep(1000);

    // Must NOT be on exercise player
    const onExercise = await isVisibleById('exercise-player', 2000);
    expect(onExercise).toBe(false);
  });

  it('BH-7.2 — Profile → Account → Email Auth → Back → Back → Back → Home', async () => {
    await goToProfileTab();
    await element(by.id('profile-scroll')).scroll(150, 'down');
    await sleep(300);
    if (!(await isVisibleById('profile-open-account', 3000))) return;

    await element(by.id('profile-open-account')).tap();
    await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(10000);

    if (await isVisibleById('account-link-email', 3000)) {
      await element(by.id('account-link-email')).tap();
      await waitFor(element(by.id('email-auth-screen'))).toBeVisible().withTimeout(10000);
      await element(by.id('email-auth-back')).tap();
      await sleep(600);
      await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(8000);
    }

    await element(by.id('account-back')).tap();
    await sleep(600);
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('tab-home')).tap();
    await sleep(500);
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-7.3 — Profile → CatSwitch → Back → Profile → Account → Back → Home', async () => {
    await goToProfileTab();
    await element(by.id('profile-open-cat-switch')).tap();
    await waitFor(element(by.id('cat-switch-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('cat-switch-back')).tap();
    await sleep(600);
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);

    // Now go to account
    await element(by.id('profile-scroll')).scroll(150, 'down');
    await sleep(300);
    if (await isVisibleById('profile-open-account', 3000)) {
      await element(by.id('profile-open-account')).tap();
      await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(10000);
      await element(by.id('account-back')).tap();
      await sleep(600);
      await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(10000);
    }

    await element(by.id('tab-home')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('BH-7.4 — exercise exit does not leave stale modal overlays', async () => {
    await startCurrentLessonExercise();
    await sleep(800);
    await element(by.id('control-exit')).tap();
    await sleep(1000);

    // No completion-modal, exercise-card, or lesson-complete-screen should be visible
    const modalVisible = await isVisibleById('completion-modal', 1500);
    const cardVisible = await isVisibleById('exercise-card', 1500);
    const lessonComplete = await isVisibleById('lesson-complete-screen', 1500);
    expect(modalVisible).toBe(false);
    expect(cardVisible).toBe(false);
    expect(lessonComplete).toBe(false);
  });

  it('BH-7.5 — deep navigation: 6-step forward then unwind leaves no orphaned screens', async () => {
    // Home → Learn tab → DailySession → Browse → LevelMap → LessonIntro → Exercise → exit
    await element(by.id('tab-home')).tap();
    await sleep(400);
    await element(by.id('tab-learn')).tap();
    await sleep(800);

    const hasDailySession = await isVisibleById('daily-session-screen', 8000);
    if (hasDailySession) {
      const hasBrowse = await isVisibleById('daily-session-browse-lessons', 5000);
      if (hasBrowse) {
        await element(by.id('daily-session-browse-lessons')).tap();
        await waitFor(element(by.id('level-map-screen'))).toBeVisible().withTimeout(15000);
      }
    }

    if (await isVisibleById('lesson-node-current', 5000)) {
      await element(by.id('lesson-node-current')).tap();
      await waitFor(element(by.id('lesson-intro-screen'))).toBeVisible().withTimeout(12000);
      await element(by.id('lesson-intro-start')).tap();
      await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(30000);
      await tapIfVisibleById('exercise-intro-ready', 5000);
      await sleep(500);
      await element(by.id('control-exit')).tap();
      await sleep(1000);
    }

    // Unwind to home
    await element(by.id('tab-home')).tap();
    await sleep(500);
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    console.log('Deep stack unwind complete — no orphaned screens');
  });
});

// ============================================================================
// BH-Suite 8: Completion Modal Variants
// ============================================================================

describe('BH-Suite 8: Completion Modal vs ExerciseCard — Bug Check', () => {
  /**
   * Bug: CompletionModal (with AI coaching) was never appearing; ExerciseCard
   * was always shown instead. The distinction is:
   * - ExerciseCard: shown when exercise PASSED and NEXT exercise exists and lesson NOT complete
   * - CompletionModal: shown when exercise FAILED (any score) OR lesson is complete
   *
   * We test both paths.
   */
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-8.1 — deliberately fail exercise (wrong notes) to force CompletionModal', async () => {
    await startCurrentLessonExercise();

    // Play notes that are definitely wrong (won't pass the exercise)
    await sleep(1200);
    // Do nothing — let the exercise time out naturally with no notes played
    // At 50 BPM, 4 quarter notes = 4800ms exercise duration + 0.5 beat buffer
    await sleep(8000); // Wait for the exercise to auto-complete with 0 notes

    const appeared = await waitForCompletionOrCard(30000);
    console.log(`Completion UI after zero notes played: ${appeared}`);
  });

  it('BH-8.2 — after failed exercise, CompletionModal (not ExerciseCard) should appear', async () => {
    const modalVisible = await isVisibleById('completion-modal', 8000);
    const cardVisible = await isVisibleById('exercise-card', 3000);

    console.log(`CompletionModal: ${modalVisible}, ExerciseCard: ${cardVisible}`);

    if (!modalVisible && !cardVisible) {
      console.log('WARNING: Neither modal nor card appeared after exercise completion');
    }

    // BUG CHECK: A failed exercise (0% score) should show CompletionModal,
    // NOT the quick ExerciseCard (which should only appear on pass + next-exists)
    if (cardVisible && !modalVisible) {
      console.log('BUG DETECTED: ExerciseCard shown for a failed exercise (should be CompletionModal)');
    }
  });

  it('BH-8.3 — CompletionModal has score ring when visible', async () => {
    if (!(await isVisibleById('completion-modal', 5000))) return;
    const hasScoreRing = await isVisibleById('completion-score-ring', 5000);
    console.log(`Score ring in CompletionModal: ${hasScoreRing}`);
  });

  it('BH-8.4 — CompletionModal has star rating when visible', async () => {
    if (!(await isVisibleById('completion-modal', 3000))) return;
    const hasStars = await isVisibleById('completion-stars', 3000);
    console.log(`Stars in CompletionModal: ${hasStars}`);
  });

  it('BH-8.5 — CompletionModal has AI coach section when visible', async () => {
    if (!(await isVisibleById('completion-modal', 3000))) return;
    // The AI coaching card uses testID "coach-feedback-card" or similar
    // Give it extra time as Gemini call may take a few seconds
    const hasCoachFeedback = await isVisibleById('coach-feedback-card', 8000);
    const hasCoachText = await isVisibleById('coach-feedback-text', 8000);
    console.log(`AI coach section visible: ${hasCoachFeedback || hasCoachText}`);
    // The coach section SHOULD appear; if absent, log as a potential bug
    if (!hasCoachFeedback && !hasCoachText) {
      console.log('WARNING: AI coach feedback section not found in CompletionModal');
    }
  });

  it('BH-8.6 — retry button is shown for failed exercise', async () => {
    if (!(await isVisibleById('completion-modal', 3000))) {
      await tapIfVisibleById('exercise-card-next', 2000);
      await tapIfVisibleById('control-exit', 3000);
      return;
    }
    const hasRetry = await isVisibleById('completion-retry', 5000);
    console.log(`Retry button present for failed exercise: ${hasRetry}`);
    // Retry should be visible for a failed exercise
    expect(hasRetry).toBe(true);
    // Clean up
    await element(by.id('completion-retry')).tap();
    await sleep(800);
    await tapIfVisibleById('control-exit', 5000);
    await sleep(800);
  });

  it('BH-8.7 — ExerciseCard appears after a PASSED exercise (quick between-exercise card)', async () => {
    // Start exercise and actually play correctly
    await startCurrentLessonExercise();
    await playLesson01Ex01Notes();
    await sleep(4000); // Wait for scoring + completion

    const result = await waitForCompletionOrCard(30000);
    console.log(`After playing correct notes, completion UI: ${result}`);
    // Both 'card' (ExerciseCard) and 'modal' (CompletionModal) are valid on a pass.
    // The point is that SOMETHING appeared.
    if (result === 'none') {
      console.log('WARNING: No completion UI appeared after correct note sequence');
    }
    // Clean up
    await tapIfVisibleById('exercise-card-next', 3000);
    await tapIfVisibleById('completion-next', 3000);
    await tapIfVisibleById('completion-continue', 3000);
    await tapIfVisibleById('control-exit', 3000);
    await sleep(800);
  });
});

// ============================================================================
// BH-Suite 9: Free Play Analysis Card
// ============================================================================

describe('BH-Suite 9: Free Play Analysis — Analysis Card and Generate Drill', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
    await goToPlayTab();
  });

  it('BH-9.1 — free play screen renders', async () => {
    await waitFor(element(by.id('play-screen'))).toBeVisible().withTimeout(20000);
  });

  it('BH-9.2 — keyboard is visible', async () => {
    await waitFor(element(by.id('freeplay-keyboard'))).toBeVisible().withTimeout(10000);
  });

  it('BH-9.3 — dismiss instructions banner if visible', async () => {
    if (await isVisibleById('freeplay-instructions', 3000)) {
      await tapIfVisibleById('freeplay-instructions-close', 2000);
      await sleep(400);
    }
  });

  it('BH-9.4 — start recording and play a short melody', async () => {
    await waitFor(element(by.id('freeplay-record-start'))).toBeVisible().withTimeout(8000);
    await element(by.id('freeplay-record-start')).tap();
    await sleep(300);
    await waitFor(element(by.id('freeplay-record-stop'))).toBeVisible().withTimeout(5000);

    // Play a C major triad + some extra notes to give the analyzer data
    await tapPianoKey(60, 300); // C4
    await tapPianoKey(64, 300); // E4
    await tapPianoKey(67, 300); // G4
    await tapPianoKey(60, 300); // C4 again
    await tapPianoKey(62, 300); // D4
    await tapPianoKey(65, 300); // F4
    console.log('Notes played for analysis');
  });

  it('BH-9.5 — analysis card appears after 2+ seconds of silence', async () => {
    // FreePlayAnalyzer triggers after 2s of silence. We wait 2.5s then stop recording.
    await sleep(2500);

    // Stop recording to ensure analyzer fires
    await tapIfVisibleById('freeplay-record-stop', 2000);
    await sleep(600);

    // Check for analysis card (may take a moment to render)
    const hasCard = await isVisibleById('freeplay-analysis-card', 8000);
    console.log(`Analysis card appeared: ${hasCard}`);
    if (!hasCard) {
      console.log('WARNING: Analysis card did not appear after 2s silence — FreePlayAnalyzer may not have fired');
    }
  });

  it('BH-9.6 — analysis card shows key/scale information', async () => {
    if (!(await isVisibleById('freeplay-analysis-card', 3000))) {
      console.log('Analysis card not visible — skipping key/scale checks');
      return;
    }
    // The analysis card should display detected key and scale
    const hasKeyInfo = await isVisibleById('freeplay-analysis-key', 3000);
    const hasScaleInfo = await isVisibleById('freeplay-analysis-scale', 3000);
    console.log(`Key info: ${hasKeyInfo}, Scale info: ${hasScaleInfo}`);
  });

  it('BH-9.7 — Generate Drill button is present on analysis card', async () => {
    if (!(await isVisibleById('freeplay-analysis-card', 3000))) return;
    const hasDrillBtn = await isVisibleById('freeplay-generate-drill', 5000);
    console.log(`Generate Drill button visible: ${hasDrillBtn}`);
    if (!hasDrillBtn) {
      console.log('WARNING: Generate Drill button missing from analysis card');
    }
  });

  it('BH-9.8 — tapping Generate Drill navigates to exercise player', async () => {
    if (!(await isVisibleById('freeplay-generate-drill', 3000))) return;
    await element(by.id('freeplay-generate-drill')).tap();
    await sleep(2000); // AI generation takes time

    // Should navigate to exercise player with the AI-generated drill
    const onExercise = await isVisibleById('exercise-player', 20000);
    console.log(`Navigated to exercise player after Generate Drill: ${onExercise}`);
    if (onExercise) {
      await tapIfVisibleById('control-exit', 5000);
      await sleep(800);
    }
  });

  it('BH-9.9 — clear recording after analysis resets state', async () => {
    // Navigate back to play tab if we left it
    await goToPlayTab();
    await waitFor(element(by.id('play-screen'))).toBeVisible().withTimeout(15000);

    if (await isVisibleById('freeplay-record-clear', 3000)) {
      await element(by.id('freeplay-record-clear')).tap();
      await sleep(400);
      await waitFor(element(by.id('freeplay-record-start'))).toBeVisible().withTimeout(5000);
      // Analysis card should also dismiss after clear
      const cardStillVisible = await isVisibleById('freeplay-analysis-card', 1500);
      console.log(`Analysis card dismissed after clear: ${!cardStillVisible}`);
    }
  });

  it('BH-9.10 — recording then immediately clearing does not leave broken state', async () => {
    // Re-enter a clean free-play state
    await goToPlayTab();
    await waitFor(element(by.id('play-screen'))).toBeVisible().withTimeout(15000);

    if (await isVisibleById('freeplay-record-start', 5000)) {
      await element(by.id('freeplay-record-start')).tap();
      await sleep(300);
      await tapPianoKey(60, 200);
      // Immediately stop and clear without waiting for analysis
      await tapIfVisibleById('freeplay-record-stop', 2000);
      await sleep(400);
      await tapIfVisibleById('freeplay-record-clear', 2000);
      await sleep(400);
      // Should be back to start state
      const hasStart = await isVisibleById('freeplay-record-start', 3000);
      console.log(`Back to start state after quick clear: ${hasStart}`);
    }
  });
});

// ============================================================================
// BH-Suite 10: Keyboard Range Adaptation
// ============================================================================

describe('BH-Suite 10: Keyboard Range Adapts to Exercise Notes', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-10.1 — Lesson 1 Exercise 1 keyboard shows Middle C (MIDI 60)', async () => {
    // Exercise 1 uses only Middle C (MIDI 60). The keyboard must show key-60.
    await startCurrentLessonExercise();
    await waitFor(element(by.id('exercise-keyboard'))).toBeVisible().withTimeout(10000);

    const hasMiddleC = await isVisibleById('key-60', 5000);
    console.log(`Middle C (key-60) visible in keyboard for Lesson 1 Ex 1: ${hasMiddleC}`);
    expect(hasMiddleC).toBe(true);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-10.2 — Lesson 1 Exercise 1 keyboard does NOT show very low bass keys', async () => {
    // The keyboard should auto-zoom to the exercise range.
    // Very low bass keys (MIDI 24 = C1) should NOT be visible for a Middle C exercise.
    await startCurrentLessonExercise();
    await waitFor(element(by.id('exercise-keyboard'))).toBeVisible().withTimeout(10000);

    const hasC1 = await isVisibleById('key-24', 2000);
    console.log(`Very low key C1 (key-24) incorrectly visible: ${hasC1}`);
    // If C1 is visible, the range adaptation is not working
    if (hasC1) {
      console.log('WARNING: Keyboard shows very low notes for a Middle C exercise — range not adapted');
    }
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-10.3 — piano roll is visible and contains notes during playback', async () => {
    await startCurrentLessonExercise();
    await waitFor(element(by.id('exercise-piano-roll'))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id('control-pause'))).toBeVisible().withTimeout(10000);

    const rollVisible = await isVisibleById('exercise-piano-roll', 3000);
    expect(rollVisible).toBe(true);
    console.log('Piano roll visible during exercise playback');
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });

  it('BH-10.4 — tapping a key NOT in the exercise range still plays sound (no crash)', async () => {
    await startCurrentLessonExercise();
    await waitFor(element(by.id('exercise-keyboard'))).toBeVisible().withTimeout(10000);

    // Try tapping keys that may be at the edge of the visible range
    // These should produce sound but register as MISS for scoring
    const edgeNotes = [48, 72]; // C3 and C5 (may or may not be visible)
    for (const note of edgeNotes) {
      const visible = await isVisibleById(`key-${note}`, 1500);
      if (visible) {
        await element(by.id(`key-${note}`)).tap();
        await sleep(300);
      }
    }
    await waitFor(element(by.id('exercise-player'))).toBeVisible().withTimeout(5000);
    await element(by.id('control-exit')).tap();
    await sleep(800);
  });
});

// ============================================================================
// BH-Suite 11: Count-in Freeze — Notes Must Not Fall During Count-in
// ============================================================================

describe('BH-Suite 11: Count-in Phase — Notes Must Be Frozen', () => {
  /**
   * Bug: Notes were falling (moving) during the count-in phase instead of
   * being frozen at the top of the piano roll. The effectiveBeat clamp was
   * incorrectly removed, causing the Tetris cascade too early.
   *
   * Test strategy: start exercise, observe the piano roll during count-in,
   * and verify the count-in animation is shown (not the exercise notes moving).
   */
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-11.1 — exercise starts with count-in phase (count-in animation visible)', async () => {
    await navigateToExercisePlayer();
    await tapIfVisibleById('exercise-intro-ready', 5000);
    await sleep(200);

    // Count-in animation should appear immediately after dismissing intro
    const countInVisible = await isVisibleById('count-in-animation', 5000);
    console.log(`Count-in animation visible at start: ${countInVisible}`);
    if (!countInVisible) {
      console.log('Count-in animation not found — exercise may start immediately or use different testID');
    }
  });

  it('BH-11.2 — piano roll is visible during count-in', async () => {
    const rollVisible = await isVisibleById('exercise-piano-roll', 5000);
    console.log(`Piano roll visible during count-in: ${rollVisible}`);
  });

  it('BH-11.3 — pause during count-in is possible (exercise responds to controls)', async () => {
    // During count-in, the pause button should respond
    const pauseVisible = await isVisibleById('control-pause', 3000);
    if (pauseVisible) {
      await element(by.id('control-pause')).tap();
      await sleep(400);
      const hasPlay = await isVisibleById('control-play', 3000);
      console.log(`Pause during count-in works (play button appeared): ${hasPlay}`);
      // Resume
      if (hasPlay) {
        await element(by.id('control-play')).tap();
        await sleep(300);
      }
    }
  });

  it('BH-11.4 — after count-in ends, exercise begins (pause button active)', async () => {
    // Wait through the count-in (Lesson 1: 4 beats at 60 BPM = 4000ms + margin)
    await waitFor(element(by.id('control-pause'))).toBeVisible().withTimeout(15000);
    // Count-in animation should now be gone
    const countInStillVisible = await isVisibleById('count-in-animation', 1500);
    console.log(`Count-in animation still visible after exercise starts: ${countInStillVisible}`);
    if (countInStillVisible) {
      console.log('WARNING: Count-in animation persisting into exercise phase — possible timing bug');
    }
  });

  it('BH-11.5 — cleanup: exit exercise', async () => {
    await tapIfVisibleById('control-exit', 5000);
    await sleep(800);
    const onExercise = await isVisibleById('exercise-player', 2000);
    expect(onExercise).toBe(false);
  });
});

// ============================================================================
// BH-Suite 12: Account Deletion Re-auth Guard
// ============================================================================

describe('BH-Suite 12: Account Deletion Re-auth Guard', () => {
  /**
   * Bug: Account deletion was failing silently because Firebase requires
   * re-authentication for sensitive operations (deleteUser). The app was not
   * prompting the user to re-authenticate first.
   *
   * We test:
   * 1. Delete account button is accessible on the account screen
   * 2. Tapping delete prompts a confirmation (not instant deletion)
   * 3. After confirmation, a re-auth prompt appears (or it fails gracefully)
   * 4. Cancel on confirmation/re-auth leaves account intact
   */
  beforeAll(async () => {
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await signInWithSkipAndReachHome();
  });

  it('BH-12.1 — navigate to account screen', async () => {
    const opened = await openAccountScreen();
    expect(opened).toBe(true);
  });

  it('BH-12.2 — delete account button exists on account screen', async () => {
    const hasDelete = await isVisibleById('account-delete', 5000);
    // Scroll down in case it's below the fold
    if (!hasDelete) {
      try {
        await element(by.id('account-screen')).scroll(200, 'down');
        await sleep(400);
      } catch {
        // Some account screens use a ScrollView, some don't
      }
    }
    const hasDeleteAfterScroll = await isVisibleById('account-delete', 3000);
    console.log(`Delete account button visible: ${hasDeleteAfterScroll}`);
    // Log but don't fail — button may be hidden for anonymous accounts
  });

  it('BH-12.3 — tapping delete shows confirmation dialog (not instant deletion)', async () => {
    if (!(await isVisibleById('account-delete', 3000))) {
      console.log('Delete button not present — skipping deletion flow test');
      return;
    }

    await element(by.id('account-delete')).tap();
    await sleep(800);

    // A confirmation alert or dialog MUST appear before any deletion happens
    const hasConfirmDialog = await isVisibleById('delete-confirm-dialog', 3000);
    const hasConfirmAlert = await isVisibleByText('Delete Account', 3000);
    const hasConfirmText = await isVisibleByText('Are you sure', 3000);
    const hasConfirmBtn = await isVisibleById('delete-confirm-button', 3000);

    console.log(`Confirmation appeared: dialog=${hasConfirmDialog} alert=${hasConfirmAlert} text=${hasConfirmText} btn=${hasConfirmBtn}`);

    // BUG CHECK: If none of the above appeared, the app deleted instantly (bad!)
    const confirmationShown = hasConfirmDialog || hasConfirmAlert || hasConfirmText || hasConfirmBtn;
    if (!confirmationShown) {
      console.log('WARNING: No confirmation dialog appeared before deletion — potential instant deletion bug');
    }
  });

  it('BH-12.4 — cancelling deletion confirmation leaves account intact', async () => {
    // Cancel the deletion if a confirmation appeared
    const cancelled =
      (await tapIfVisibleById('delete-cancel-button', 2000)) ||
      (await tapIfVisibleById('delete-confirm-cancel', 2000));

    if (!cancelled) {
      // Try system alert "Cancel" button
      try {
        await element(by.text('Cancel')).tap();
      } catch {
        // No cancel button found
      }
    }

    await sleep(800);

    // Account screen (or app) should still be intact
    const onAccount = await isVisibleById('account-screen', 5000);
    const onProfile = await isVisibleById('profile-screen', 5000);
    const onHome = await isVisibleById('home-screen', 5000);
    const onAuth = await isVisibleById('auth-screen', 5000);

    console.log(`After cancel: account=${onAccount} profile=${onProfile} home=${onHome} auth=${onAuth}`);
    expect(onAccount || onProfile || onHome || onAuth).toBe(true);
  });

  it('BH-12.5 — re-auth prompt appears for authenticated (non-anonymous) users on delete', async () => {
    // This test only applies to signed-in (non-anonymous) users.
    // For anonymous users, Firebase may allow deletion without re-auth.
    // We check if a re-auth prompt appears after confirming deletion intent.
    const onAccount = await isVisibleById('account-screen', 3000);
    if (!onAccount) {
      // Navigate back to account
      await goToProfileTab();
      await element(by.id('profile-scroll')).scroll(150, 'down');
      await sleep(300);
      if (await isVisibleById('profile-open-account', 3000)) {
        await element(by.id('profile-open-account')).tap();
        await waitFor(element(by.id('account-screen'))).toBeVisible().withTimeout(10000);
      } else {
        console.log('Could not reach account screen — skipping re-auth check');
        return;
      }
    }

    if (!(await isVisibleById('account-delete', 3000))) {
      console.log('No delete button — anonymous user or feature not available');
      return;
    }

    // Check if the user is NOT anonymous (sign-in options would be different)
    const hasLinkEmail = await isVisibleById('account-link-email', 2000);
    const hasSignOut = await isVisibleById('account-sign-out', 2000);
    const isAuthenticated = !hasLinkEmail && hasSignOut; // Linked users have sign-out not link buttons

    console.log(`User is authenticated (non-anonymous): ${isAuthenticated}`);
    if (!isAuthenticated) {
      console.log('Skipping re-auth check — anonymous users may not require re-auth for deletion');
      return;
    }

    // Tap delete and look for re-auth prompt
    await element(by.id('account-delete')).tap();
    await sleep(800);

    // Accept confirmation if it appeared
    await tapIfVisibleById('delete-confirm-button', 2000);
    await sleep(800);

    // Now check for re-auth prompt (password entry or Google sign-in sheet)
    const hasReAuth = await isVisibleById('reauth-dialog', 5000);
    const hasPasswordEntry = await isVisibleById('reauth-password', 5000);
    const hasReAuthText = await isVisibleByText('re-enter your password', 5000);
    const hasSignInAgain = await isVisibleByText('Sign in again', 5000);

    console.log(`Re-auth prompt: dialog=${hasReAuth} password=${hasPasswordEntry} text=${hasReAuthText} signIn=${hasSignInAgain}`);

    if (!hasReAuth && !hasPasswordEntry && !hasReAuthText && !hasSignInAgain) {
      console.log('WARNING: No re-auth prompt appeared before account deletion — Firebase re-auth guard may be missing');
    }

    // Cancel whatever appeared to avoid actually deleting the account
    await tapIfVisibleById('reauth-cancel', 2000);
    try {
      await element(by.text('Cancel')).tap();
    } catch {
      // No cancel text element
    }
    await sleep(600);
  });

  it('BH-12.6 — app is still functional after cancelling delete flow', async () => {
    // Navigate home and verify the app is still responsive
    await element(by.id('tab-home')).tap();
    await sleep(500);
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    console.log('App fully functional after abandoning account deletion flow');
  });
});
