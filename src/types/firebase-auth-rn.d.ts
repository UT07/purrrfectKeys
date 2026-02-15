/**
 * Type augmentation for firebase/auth React Native persistence.
 *
 * In the React Native bundle (via Metro), firebase/auth resolves to the
 * `react-native` condition in @firebase/auth/package.json which exports
 * getReactNativePersistence. However, TypeScript uses the default `types`
 * condition which does not include it. This declaration makes the type
 * available for tsc without requiring a different import path.
 */

import type { Persistence } from 'firebase/auth';

interface ReactNativeAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
