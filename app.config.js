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
    posthogHost: process.env.POSTHOG_HOST,
  },
};
