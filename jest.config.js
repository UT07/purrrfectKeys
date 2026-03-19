module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 45,
      lines: 50,
      statements: 50,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@/stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/audio/(.*)$': '<rootDir>/src/audio/$1',
    '^@/input/(.*)$': '<rootDir>/src/input/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/content/(.*)$': '<rootDir>/content/$1',
    '\\.(mp3|wav|ogg|m4a|aac)$': '<rootDir>/__mocks__/audioFileMock.js',
    '^expo-router(.*)$': '<rootDir>/__mocks__/expo-router.js',
    '^@testing-library/jest-native(.*)$': '<rootDir>/node_modules/@testing-library/react-native/matchers.js',
    '^@testing-library/react-native/extend-expect$': '<rootDir>/node_modules/@testing-library/react-native/matchers.js',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo|expo-av|expo-font|expo-screen-orientation|expo-haptics|expo-linear-gradient|expo-speech|expo-constants|@expo/vector-icons|@react-native|react-native|@react-native-community|@react-navigation|@shopify/react-native-skia|react-native-reanimated|react-native-gesture-handler|expo-modules-core)/)',
  ],
};
