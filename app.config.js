// app.config.js — extends app.json with dynamic values (env vars, etc.)
// This file is evaluated at build time by Expo, so process.env is available.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const baseConfig = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...baseConfig.expo,
  extra: {
    ...baseConfig.expo.extra,
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    elevenLabsApiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
  },
  // Sentry source maps are uploaded automatically via the @sentry/react-native
  // config plugin in app.json (EAS Build handles this, no hooks needed).
};
