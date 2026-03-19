module.exports = {
  rootDir: '..',
  testTimeout: 180000,
  testMatch: ['<rootDir>/e2e/**/*.e2e.{js,ts}', '<rootDir>/e2e/**/*.test.{js,ts}'],
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  reporters: ['detox/runners/jest/reporter'],
  verbose: true,
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
};
