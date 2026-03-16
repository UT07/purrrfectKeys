/* eslint-disable no-undef */
/**
 * Debug test: launches the app and takes a screenshot to diagnose
 * what screen appears after Expo Dev Client stabilization.
 */

const { sleep, isVisibleById } = require('./helpers/appFlows');

describe('Debug: Visible Screen After Launch', () => {
  it('captures initial app state', async () => {
    // Give the app extra time to settle after init.js beforeAll
    await sleep(5000);

    // Take a screenshot so we can see the actual screen
    const screenshot = await device.takeScreenshot('debug-after-launch');
    console.log('Screenshot saved:', screenshot);

    // Probe for known screens
    const screens = [
      'auth-screen',
      'home-screen',
      'onboarding-screen',
      'level-map-screen',
      'profile-screen',
      'social-screen',
      'song-library-screen',
      'play-screen',
      'exercise-player',
      'skill-assessment-screen',
      'lesson-intro-screen',
      'tier-intro-screen',
    ];

    for (const id of screens) {
      const visible = await isVisibleById(id, 500);
      if (visible) {
        console.log(`VISIBLE: ${id}`);
      }
    }

    // Also check tab bar
    const tabs = ['tab-home', 'tab-learn', 'tab-songs', 'tab-social', 'tab-profile'];
    for (const id of tabs) {
      const visible = await isVisibleById(id, 500);
      if (visible) {
        console.log(`TAB VISIBLE: ${id}`);
      }
    }

    // Check for Expo Dev Client elements
    const expoElements = [
      'http://localhost:8081',
      'Continue',
      'Go home',
      'Development servers',
    ];
    for (const text of expoElements) {
      try {
        await waitFor(element(by.text(text))).toBeVisible().withTimeout(400);
        console.log(`EXPO TEXT VISIBLE: "${text}"`);
      } catch {
        // not visible
      }
    }
  }, 60000);
});
