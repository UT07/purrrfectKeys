/**
 * Main App Navigation
 * Sets up the navigation structure for Purrrfect Keys
 * Auth flow → Onboarding → Main app
 */

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '../config/posthog';
import { SentryService } from '../services/monitoring/SentryService';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ExercisePlayer } from '../screens/ExercisePlayer/ExercisePlayer';
import { PlayFirstOnboarding } from '../screens/PlayFirstOnboarding';
import { MidiSetupScreen } from '../screens/MidiSetupScreen';
import { MicSetupScreen } from '../screens/MicSetupScreen';
import { LevelMapScreen } from '../screens/LevelMapScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { EmailAuthScreen } from '../screens/EmailAuthScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { TierIntroScreen } from '../screens/TierIntroScreen';
import { LessonIntroScreen } from '../screens/LessonIntroScreen';
import { CatSwitchScreen } from '../screens/CatSwitchScreen';
import { CatStudioScreen } from '../screens/CatStudioScreen';
import { DebugLogScreen } from '../screens/DebugLogScreen';
import { SkillAssessmentScreen } from '../screens/SkillAssessmentScreen';
import { DailySessionScreen } from '../screens/DailySessionScreen';
import { SongLibraryScreen } from '../screens/SongLibraryScreen';
import { SongPlayerScreen } from '../screens/SongPlayerScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { AddFriendScreen } from '../screens/AddFriendScreen';
import { PostExerciseScreen } from '../screens/PostExerciseScreen';
import { BattlePassScreen } from '../screens/BattlePassScreen';
import { GuildScreen } from '../screens/GuildScreen';
// Navigation
import { CustomTabBar } from './CustomTabBar';
import { OfflineBanner } from '../components/common/OfflineBanner';

// Stores
import { useAuthStore } from '../stores/authStore';

// Types
import type { Exercise, ExerciseType } from '../core/exercises/types';

export type RootStackParamList = {
  Auth: undefined;
  EmailAuth: { isLinking?: boolean } | undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Exercise: {
    exerciseId: string;
    testMode?: boolean;
    aiMode?: boolean;
    skillId?: string;
    /** Request a specific exercise type (rhythm, earTraining, chordId, sightReading, callResponse) */
    exerciseType?: ExerciseType;
    freePlayContext?: {
      detectedKey: string | null;
      suggestedDrillType: string;
      weakNotes: number[];
    };
    /** Pre-generated bonus drill exercise from WeakSpotDetector */
    bonusDrillExercise?: Exercise;
    /** Friend challenge target — when set, completion creates a FriendChallenge */
    challengeTarget?: {
      uid: string;
      displayName: string;
    };
    /** When playing a received challenge — submits score back on completion */
    friendChallengeId?: string;
    /** Auto-start Salsa replay coaching on mount */
    replayMode?: boolean;
    /** Override playback speed for this session (e.g. speed-run challenge forces 1.0) */
    requiredPlaybackSpeed?: number;
  };
  TierIntro: { tier: number; locked?: boolean };
  LessonIntro: { lessonId: string; locked?: boolean };
  SkillAssessment: undefined;
  DailySession: undefined;
  LevelMap: undefined;
  FreePlay: undefined;
  MidiSetup: undefined;
  MicSetup: undefined;
  Account: undefined;
  CatSwitch: undefined;
  CatStudio: undefined;
  DebugLog: undefined;
  PostExercise: undefined;
  SongPlayer: { songId: string };
  Leaderboard: undefined;
  Friends: undefined;
  AddFriend: undefined;
  BattlePass: undefined;
  Guild: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Learn: undefined;
  Songs: undefined;
  Social: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main tab navigator (Home, Learn, Songs, Social, Profile)
 */
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarButtonTestID: 'tab-home' }}
      />
      <Tab.Screen
        name="Learn"
        component={LevelMapScreen}
        options={{ tabBarButtonTestID: 'tab-learn' }}
      />
      <Tab.Screen
        name="Songs"
        component={SongLibraryScreen}
        options={{ tabBarButtonTestID: 'tab-songs' }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{ tabBarButtonTestID: 'tab-social' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarButtonTestID: 'tab-profile' }}
      />
    </Tab.Navigator>
  );
}


/**
 * Root navigation stack
 * Conditionally shows auth, onboarding, or main app screens
 */
export function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
    // Register navigation container with Sentry for automatic screen tracking + performance spans
    const sentryNav = SentryService.getNavigationIntegration();
    if (sentryNav && navigationRef.current) {
      sentryNav.registerNavigationContainer(navigationRef);
    }
  }, []);

  const onStateChange = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      posthog.screen(currentRouteName, currentRoute?.params as Record<string, any>);
      SentryService.addBreadcrumb('navigation', `Navigate to ${currentRouteName}`);
      routeNameRef.current = currentRouteName;
    }
  }, []);

  // Only block rendering during initial auth state detection (first boot).
  // Do NOT block during in-app operations (sign out, delete account) —
  // that causes a white screen flash while async cleanup runs.
  if (isInitializing) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady} onStateChange={onStateChange}>
      <PostHogProvider client={posthog} autocapture={{ captureTouches: true, captureScreens: false, propsToCapture: ['testID'] }}>
      <View style={navStyles.root}>
      <OfflineBanner />
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 350,
        }}
      >
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="Auth" component={AuthScreen} />
            <RootStack.Screen name="EmailAuth" component={EmailAuthScreen} />
          </>
        ) : (
          <>
            {/* Authenticated users always land on MainTabs.
                Onboarding only shows once for first-time users, never blocks. */}
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen
              name="Onboarding"
              component={PlayFirstOnboarding}
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: false,  // Prevent swipe-to-dismiss — must complete all steps
              }}
            />
            <RootStack.Screen
              name="Exercise"
              component={ExercisePlayer as unknown as React.ComponentType<Record<string, unknown>>}
              options={{ animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name="TierIntro"
              component={TierIntroScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="LessonIntro"
              component={LessonIntroScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="MidiSetup"
              component={MidiSetupScreen}
              options={{ presentation: 'card', animation: 'slide_from_right', headerShown: false }}
            />
            <RootStack.Screen
              name="MicSetup"
              component={MicSetupScreen}
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
            <RootStack.Screen
              name="Account"
              component={AccountScreen}
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
            <RootStack.Screen
              name="SkillAssessment"
              component={SkillAssessmentScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="DailySession"
              component={DailySessionScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="LevelMap"
              component={LevelMapScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="FreePlay"
              component={PlayScreen}
              options={{ animation: 'fade' }}
            />
            <RootStack.Screen
              name="PostExercise"
              component={PostExerciseScreen}
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <RootStack.Screen
              name="SongPlayer"
              component={SongPlayerScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="Friends"
              component={FriendsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="AddFriend"
              component={AddFriendScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name="BattlePass"
              component={BattlePassScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="Guild"
              component={GuildScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="CatSwitch"
              component={CatSwitchScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="CatStudio"
              component={CatStudioScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name="DebugLog"
              component={DebugLogScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </RootStack.Navigator>
      </View>
      </PostHogProvider>
    </NavigationContainer>
  );
}

const navStyles = StyleSheet.create({
  root: { flex: 1 },
});
