/**
 * Navigation type definitions for expo-router
 */

export type RootStackParamList = {
  '(auth)': undefined;
  '(app)': undefined;
  'index': undefined;
};

export type AuthStackParamList = {
  'sign-in': undefined;
  'sign-up': undefined;
  'forgot-password': undefined;
};

export type AppTabParamList = {
  'home': undefined;
  'learn': undefined;
  'play': undefined;
  'profile': undefined;
};

export type HomeStackParamList = {
  'index': undefined;
  'exercise/[id]': { id: string };
  'lesson/[id]': { id: string };
};

export type LearnStackParamList = {
  'index': undefined;
  'lesson/[id]': { id: string };
  'lesson-exercises/[id]': { id: string };
};

export type PlayStackParamList = {
  'index': undefined;
  'exercise/[id]': { id: string };
  'results': undefined;
};

export type ProfileStackParamList = {
  'index': undefined;
  'settings': undefined;
  'progress': undefined;
  'achievements': undefined;
};
