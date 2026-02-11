/**
 * Firebase configuration and initialization
 * Initializes Firebase services: Auth, Firestore, Cloud Functions
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

// ============================================================================
// Emulator Setup (for local development)
// ============================================================================

if (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === 'true') {
  // Only connect once to avoid errors
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
  if (!db.emulatorConfig) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
  // Note: Functions emulator connection is environment-specific
  // For React Native/Expo, use different approach
}

// ============================================================================
// Export Firebase App Instance
// ============================================================================

export default app;
