/**
 * E2E Navigation Helpers
 * Reusable functions for navigating through the app in Detox tests.
 */

/**
 * Complete the 7-step onboarding wizard.
 * Call after a fresh app launch with clearState.
 */
async function completeOnboarding() {
  // Step 1: Welcome → Get Started
  await waitFor(element(by.id('onboarding-get-started')))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id('onboarding-get-started')).tap();

  // Step 2: Experience level → Beginner
  await waitFor(element(by.id('onboarding-experience-beginner')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-experience-beginner')).tap();
  await element(by.id('onboarding-experience-next')).tap();

  // Step 3: Input method → Touch
  await waitFor(element(by.id('onboarding-input-touch')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-input-touch')).tap();
  await element(by.id('onboarding-input-next')).tap();

  // Step 4: Learning goal → Songs
  await waitFor(element(by.id('onboarding-goal-songs')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-goal-songs')).tap();
  await element(by.id('onboarding-goal-next')).tap();

  // Step 5: Choose Path → Piano Basics (scroll down to Next)
  await waitFor(element(by.id('onboarding-path-piano-basics')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-path-piano-basics')).tap();
  // Scroll parent ScrollView to reveal Next button
  await waitFor(element(by.id('onboarding-path-next')))
    .toBeVisible()
    .whileElement(by.id('onboarding-scroll'))
    .scroll(200, 'down');
  await element(by.id('onboarding-path-next')).tap();

  // Step 6: Choose Cat → Mini Meowww
  await waitFor(element(by.id('onboarding-choose-mini-meowww')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-choose-mini-meowww')).tap();
  await element(by.id('onboarding-cat-next')).tap();

  // Step 7: Username → type and finish
  await waitFor(element(by.id('onboarding-username-input')))
    .toBeVisible()
    .withTimeout(8000);
  await element(by.id('onboarding-username-input')).tap();
  await element(by.id('onboarding-username-input')).typeText(`e2e${Date.now()}`);
  // Wait for username validation
  await waitFor(element(by.id('onboarding-finish')))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id('onboarding-finish')).tap();
}

/**
 * Skip auth (tap "Play as Guest" / "Skip")
 */
async function skipAuth() {
  try {
    await waitFor(element(by.id('skip-signin')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('skip-signin')).tap();
  } catch {
    // Auth screen not shown (already authenticated)
  }
}

/**
 * Ensure we're on the home screen — handles onboarding + auth.
 */
async function ensureHomeScreen() {
  await device.enableSynchronization();

  // Check if already on home
  try {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(3000);
    return;
  } catch {
    // Not on home — need to navigate
  }

  // Handle onboarding if present
  try {
    await waitFor(element(by.id('onboarding-get-started')))
      .toBeVisible()
      .withTimeout(3000);
    await completeOnboarding();
  } catch {
    // No onboarding
  }

  // Handle auth if present
  await skipAuth();

  // Handle onboarding after auth
  try {
    await waitFor(element(by.id('onboarding-get-started')))
      .toBeVisible()
      .withTimeout(3000);
    await completeOnboarding();
  } catch {
    // No onboarding after auth
  }

  // Final wait for home
  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(15000);
}

/**
 * Navigate to the Learn tab and tap the current lesson node.
 * Returns once the exercise player is loaded.
 */
async function navigateToExercise() {
  await ensureHomeScreen();
  await element(by.id('tab-learn')).tap();
  await waitFor(element(by.id('level-map-screen')))
    .toBeVisible()
    .withTimeout(5000);
  await element(by.id('lesson-node-current')).tap();
  await waitFor(element(by.id('exercise-player')))
    .toBeVisible()
    .withTimeout(15000);
}

/**
 * Tap piano keys to play through an exercise.
 * Taps Middle C and surrounding keys.
 */
async function playExerciseNotes() {
  const keys = ['key-60', 'key-62', 'key-64', 'key-60', 'key-62', 'key-64', 'key-65', 'key-67'];
  for (const key of keys) {
    try {
      await element(by.id(key)).tap();
    } catch {
      // Key may not be in the current range — continue
    }
  }
}

module.exports = {
  completeOnboarding,
  skipAuth,
  ensureHomeScreen,
  navigateToExercise,
  playExerciseNotes,
};
