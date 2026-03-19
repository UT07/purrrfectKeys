/**
 * Smoke Tests — Core E2E validation for Purrrfect Keys.
 *
 * These tests verify the critical happy paths that must work for the app
 * to be considered functional. They share a single app instance launched
 * in e2e/init.js (Expo Dev Client stabilization handled there).
 *
 * Prerequisites:
 *   - App built via `npm run e2e:build:ios`
 *   - Expo dev server running via `npm start`
 *
 * Run:
 *   npm run e2e:test:ios -- --testPathPattern smoke
 */

import { by, element, expect, waitFor } from 'detox';

const {
  signInAndReachHome,
  isVisibleById,
  goToLearnTab,
  goToSongsTab,
  goToSocialTab,
  goToProfileTab,
  startCurrentLessonExercise,
  sleep,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('./helpers/appFlows');

describe('Smoke Tests', () => {
  // -----------------------------------------------------------------------
  // 1. App Launch — App opens without crashing, HomeScreen is visible
  // -----------------------------------------------------------------------
  it('launches and shows the home screen', async () => {
    await signInAndReachHome({ preferSkip: true });
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 2. Navigation — Can navigate between all 5 tabs
  // -----------------------------------------------------------------------
  it('navigates between all five tabs', async () => {
    // Ensure we start from home
    if (!(await isVisibleById('home-screen', 3000))) {
      await signInAndReachHome({ preferSkip: true });
    }
    await expect(element(by.id('home-screen'))).toBeVisible();

    // Learn tab
    await goToLearnTab();
    await expect(element(by.id('level-map-screen'))).toBeVisible();

    // Songs tab
    await goToSongsTab();
    await expect(element(by.id('song-library-screen'))).toBeVisible();

    // Social tab
    await goToSocialTab();
    await expect(element(by.id('social-screen'))).toBeVisible();

    // Profile tab
    await goToProfileTab();
    await expect(element(by.id('profile-screen'))).toBeVisible();

    // Back to Home
    await element(by.id('tab-home')).tap();
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // -----------------------------------------------------------------------
  // 3. Exercise Start — Can open an exercise from Learn tab
  // -----------------------------------------------------------------------
  it('starts an exercise from the Learn tab', async () => {
    // Navigate home first
    if (!(await isVisibleById('home-screen', 2000))) {
      await element(by.id('tab-home')).tap();
      await sleep(700);
    }

    await startCurrentLessonExercise();
    await waitFor(element(by.id('exercise-player')))
      .toBeVisible()
      .withTimeout(20000);

    // Verify pause control is visible (exercise is playing)
    await waitFor(element(by.id('control-pause')))
      .toBeVisible()
      .withTimeout(20000);

    // Exit back out
    if (await isVisibleById('control-exit', 5000)) {
      await element(by.id('control-exit')).tap();
    }
  });

  // -----------------------------------------------------------------------
  // 4. Cat Avatar — Cat avatar is visible on HomeScreen
  // -----------------------------------------------------------------------
  it('shows the cat avatar on the home screen', async () => {
    // Navigate to home
    if (!(await isVisibleById('home-screen', 3000))) {
      await signInAndReachHome({ preferSkip: true });
    }

    await waitFor(element(by.id('home-cat-avatar')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // -----------------------------------------------------------------------
  // 5. Daily Goal — Daily goal card is visible on HomeScreen
  // -----------------------------------------------------------------------
  it('shows the daily goal section on the home screen', async () => {
    // Navigate to home
    if (!(await isVisibleById('home-screen', 3000))) {
      await signInAndReachHome({ preferSkip: true });
    }

    await waitFor(element(by.id('daily-goal-section')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
