/**
 * Firebase configuration and initialization
 * Initializes Firebase services: Auth, Firestore, Cloud Functions
 *
 * Auth uses initializeAuth with getReactNativePersistence(AsyncStorage) so that
 * the user session persists across app restarts (remember device).
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Firebase Config
// ============================================================================

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ============================================================================
// Initialize Firebase
// ============================================================================

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence so sessions survive app restarts.
// getReactNativePersistence is available from firebase/auth when bundled by Metro
// (the react-native condition in @firebase/auth/package.json exports it).
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

// ============================================================================
// Emulator Setup (for local development)
// ============================================================================

let emulatorsConnected = false;

if (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === 'true' && !emulatorsConnected) {
  // Only connect once to avoid errors
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
  connectFirestoreEmulator(db, 'localhost', 8080);
  emulatorsConnected = true;
  // Note: Functions emulator connection is environment-specific
  // For React Native/Expo, use different approach
}

// ============================================================================
// Export Firebase App Instance
// ============================================================================

export default app;
