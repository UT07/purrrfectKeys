// Jest mock for expo-router (not installed as a package)
const React = require('react');

module.exports = {
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
  Link: ({ children }) => children,
  Stack: {
    Screen: jest.fn(),
    Navigator: jest.fn(({ children }) => children),
  },
  Tabs: {
    Screen: jest.fn(),
  },
  Redirect: jest.fn(),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
};
