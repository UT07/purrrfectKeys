/* eslint-disable no-undef */

const { sleep, isVisibleById } = require('./helpers/appFlows');

describe('Debug: Sign-In Flow', () => {
  it('tries skip-signin step by step', async () => {
    await sleep(3000);

    // Step 1: Verify auth-screen is visible
    const authVisible = await isVisibleById('auth-screen', 8000);
    console.log('Step 1 - auth-screen visible:', authVisible);

    if (!authVisible) {
      // Maybe already signed in
      const homeVisible = await isVisibleById('home-screen', 5000);
      console.log('Already on home-screen:', homeVisible);
      if (homeVisible) return;

      await device.takeScreenshot('debug-no-auth');
      throw new Error('Neither auth nor home screen visible');
    }

    // Step 2: Check for skip-signin button
    const skipVisible = await isVisibleById('skip-signin', 5000);
    console.log('Step 2 - skip-signin visible:', skipVisible);

    if (!skipVisible) {
      await device.takeScreenshot('debug-no-skip-btn');
      throw new Error('skip-signin not found on auth screen');
    }

    // Step 3: Tap skip-signin
    console.log('Step 3 - tapping skip-signin...');
    await element(by.id('skip-signin')).tap();
    await sleep(2000);

    // Step 4: Take screenshot to see what happened
    await device.takeScreenshot('debug-after-skip-tap');

    // Step 5: Check what screen we're on
    const screens = [
      'auth-screen', 'home-screen', 'onboarding-screen',
      'skill-assessment-screen', 'level-map-screen',
    ];
    for (const id of screens) {
      if (await isVisibleById(id, 500)) {
        console.log(`After skip: VISIBLE: ${id}`);
      }
    }

    // Step 6: If onboarding, try to complete it
    if (await isVisibleById('onboarding-screen', 2000)) {
      console.log('Step 6 - Starting onboarding flow...');

      // Step 6a: Get Started
      if (await isVisibleById('onboarding-get-started', 3000)) {
        console.log('Tapping Get Started...');
        await element(by.id('onboarding-get-started')).tap();
        await sleep(1000);
      }

      // Step 6b: Experience level
      if (await isVisibleById('onboarding-step-2', 3000)) {
        console.log('On step 2 (experience)...');
        if (await isVisibleById('onboarding-experience-beginner', 2000)) {
          await element(by.id('onboarding-experience-beginner')).tap();
          await sleep(500);
        }
        if (await isVisibleById('onboarding-experience-next', 2000)) {
          await element(by.id('onboarding-experience-next')).tap();
          await sleep(1000);
        }
      }

      await device.takeScreenshot('debug-onboarding-progress');

      // Step 6c: Input method
      if (await isVisibleById('onboarding-step-3', 3000)) {
        console.log('On step 3 (input)...');
        if (await isVisibleById('onboarding-input-touch', 2000)) {
          await element(by.id('onboarding-input-touch')).tap();
          await sleep(500);
        }
        if (await isVisibleById('onboarding-input-next', 2000)) {
          await element(by.id('onboarding-input-next')).tap();
          await sleep(1000);
        }
      }

      // Step 6d: Goal
      if (await isVisibleById('onboarding-step-4', 3000)) {
        console.log('On step 4 (goal)...');
        if (await isVisibleById('onboarding-goal-songs', 2000)) {
          await element(by.id('onboarding-goal-songs')).tap();
          await sleep(500);
        }
        if (await isVisibleById('onboarding-goal-next', 2000)) {
          await element(by.id('onboarding-goal-next')).tap();
          await sleep(1000);
        } else if (await isVisibleById('onboarding-finish', 2000)) {
          await element(by.id('onboarding-finish')).tap();
          await sleep(1500);
        }
      }

      await device.takeScreenshot('debug-onboarding-mid');

      // Step 6e: Cat selection
      if (await isVisibleById('onboarding-step-5', 3000)) {
        console.log('On step 5 (cat selection)...');
        const cats = ['onboarding-choose-mini-meowww', 'onboarding-choose-jazzy', 'onboarding-choose-luna'];
        for (const cat of cats) {
          if (await isVisibleById(cat, 500)) {
            await element(by.id(cat)).tap();
            break;
          }
        }
        await sleep(500);

        // Scroll to find finish button if needed
        if (!(await isVisibleById('onboarding-finish', 1000))) {
          try {
            await waitFor(element(by.id('onboarding-finish')))
              .toBeVisible()
              .whileElement(by.id('onboarding-scroll'))
              .scroll(220, 'down');
          } catch { /* ignore */ }
        }

        if (await isVisibleById('onboarding-finish', 2000)) {
          console.log('Tapping Finish...');
          await element(by.id('onboarding-finish')).tap();
          await sleep(2000);
        }
      }

      await device.takeScreenshot('debug-after-onboarding');
    }

    // Final check
    const finalScreens = ['home-screen', 'auth-screen', 'onboarding-screen'];
    for (const id of finalScreens) {
      if (await isVisibleById(id, 1000)) {
        console.log(`Final state: ${id}`);
      }
    }

    const tabsVisible = await isVisibleById('tab-home', 2000);
    console.log('Tab bar visible:', tabsVisible);

    await device.takeScreenshot('debug-final-state');
  }, 120000);
});
