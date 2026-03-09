/**
 * Onboarding Screen
 * First-time user experience with 6-step flow
 * 1. Welcome
 * 2. Experience Level
 * 3. Equipment Check
 * 4. Goal Setting
 * 5. Choose Your Cat Companion
 * 6. Pick Username & Display Name
 *
 * Features animated progress bar with walking cat avatar,
 * per-step cat characters, and slide transitions.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button, Card } from '../components/common';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { getStarterCats } from '../components/Mascot/catCharacters';
import type { CatCharacter } from '../components/Mascot/catCharacters';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore } from '../stores/catEvolutionStore';
import { prefillOnboardingBuffer } from '../services/exerciseBufferManager';
import { checkUsernameAvailable, isValidUsername } from '../services/firebase/socialService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor, shadowGlow } from '../theme/tokens';
import { GradientMeshBackground } from '../components/effects';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const PROGRESS_BAR_HORIZONTAL_PADDING = SPACING.lg;
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH - PROGRESS_BAR_HORIZONTAL_PADDING * 2;
const PROGRESS_BAR_HEIGHT = 6;
const CAT_SIZE = 28;
const SLIDE_DURATION = 300;
const SLIDE_OFFSET = 50;

const TOTAL_STEPS = 6;

interface OnboardingState {
  experienceLevel?: 'beginner' | 'intermediate' | 'returning';
  inputMethod?: 'midi' | 'mic' | 'touch';
  goal?: 'songs' | 'technique' | 'exploration';
  selectedCatId?: string;
  username?: string;
  usernameDisplayName?: string;
  completedAt?: Date;
}

type SlideDirection = 'forward' | 'back';

// ---------------------------------------------------------------------------
// Per-step cat data
// ---------------------------------------------------------------------------

interface StepCatInfo {
  catId: string;
  subtitle: string;
}

const STEP_CATS: Record<number, StepCatInfo> = {
  1: { catId: 'mini-meowww', subtitle: 'Mini Meowww welcomes you!' },
  2: { catId: 'jazzy', subtitle: 'Jazzy wants to know your level' },
  3: { catId: 'chonky-monke', subtitle: 'Chonky Monk\u00E9 checks your setup' },
  4: { catId: 'luna', subtitle: 'Luna helps you set goals' },
  5: { catId: 'mini-meowww', subtitle: 'Choose your companion!' },
  6: { catId: 'jazzy', subtitle: 'Jazzy wants to know your name!' },
};

// ---------------------------------------------------------------------------
// Animated Step Wrapper (slide transitions)
// ---------------------------------------------------------------------------

function AnimatedStepWrapper({
  direction,
  children,
  testID,
}: {
  direction: SlideDirection;
  children: React.ReactNode;
  testID?: string;
}): React.ReactElement {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(
    direction === 'forward' ? SLIDE_OFFSET : -SLIDE_OFFSET,
  );
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    // Reset to entry position when direction changes (new step)
    const entryX = direction === 'forward' ? SLIDE_OFFSET : -SLIDE_OFFSET;
    opacity.value = 0;
    translateX.value = entryX;
    scale.value = 0.95;

    opacity.value = withTiming(1, {
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    translateX.value = withTiming(0, {
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(1, {
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [direction, opacity, translateX, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View testID={testID} style={[styles.stepContainer, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Welcome Screen
// ---------------------------------------------------------------------------

function WelcomeStep({
  onNext,
  direction,
}: {
  onNext: () => void;
  direction: SlideDirection;
}): React.ReactElement {
  const catInfo = STEP_CATS[1];

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-1">
      <View style={styles.iconContainer}>
        <View style={styles.welcomeGlowRing}>
          <CatAvatar catId={catInfo.catId} size="large" skipEntryAnimation />
        </View>
      </View>
      <Text style={styles.stepTitle}>Welcome to Purrrfect Keys</Text>
      <Text style={styles.catIntro}>{catInfo.subtitle}</Text>
      <Text style={styles.stepSubtitle}>
        Learn piano in 5 minutes a day with AI-powered feedback
      </Text>
      <View style={styles.featureList}>
        <FeatureItem
          iconName="lightning-bolt"
          iconColor={COLORS.starGold}
          iconBg={glowColor('#FFD700', 0.12)}
          text="Real-time feedback on your playing"
        />
        <FeatureItem
          iconName="target"
          iconColor={COLORS.primary}
          iconBg={glowColor(COLORS.primary, 0.12)}
          text="Personalized learning path"
        />
        <FeatureItem
          iconName="fire"
          iconColor={COLORS.streakFlame}
          iconBg={glowColor(COLORS.streakFlame, 0.12)}
          text="Build daily practice habits"
        />
      </View>
      <Button
        title="Get Started"
        onPress={onNext}
        size="large"
        style={styles.button}
        testID="onboarding-get-started"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Experience Level
// ---------------------------------------------------------------------------

function ExperienceLevelStep({
  onNext,
  value,
  onValueChange,
  direction,
}: {
  onNext: () => void;
  value?: string;
  onValueChange: (level: 'beginner' | 'intermediate' | 'returning') => void;
  direction: SlideDirection;
}): React.ReactElement {
  const catInfo = STEP_CATS[2];

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-2">
      <View style={styles.stepCatRow}>
        <CatAvatar catId={catInfo.catId} size="small" skipEntryAnimation />
        <Text style={styles.catIntro}>{catInfo.subtitle}</Text>
      </View>
      <Text style={styles.stepTitle}>What's Your Experience Level?</Text>
      <Text style={styles.stepDescription}>
        This helps us personalize your learning experience
      </Text>

      <View style={styles.optionsList}>
        <OptionCard
          iconName="sprout"
          iconColor="#4CAF50"
          title="Complete Beginner"
          description="Never touched a piano before"
          selected={value === 'beginner'}
          onPress={() => onValueChange('beginner')}
          testID="onboarding-experience-beginner"
        />
        <OptionCard
          iconName="book-open-variant"
          iconColor="#42A5F5"
          title="I Know Some Basics"
          description="Can play simple melodies"
          selected={value === 'intermediate'}
          onPress={() => onValueChange('intermediate')}
          testID="onboarding-experience-intermediate"
        />
        <OptionCard
          iconName="music-note-eighth"
          iconColor="#CE93D8"
          title="Returning Player"
          description="Played before, want to restart"
          selected={value === 'returning'}
          onPress={() => onValueChange('returning')}
          testID="onboarding-experience-returning"
        />
      </View>

      <Button
        title="Next"
        onPress={onNext}
        disabled={!value}
        size="large"
        style={styles.button}
        testID="onboarding-experience-next"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Equipment Check
// ---------------------------------------------------------------------------

function EquipmentCheckStep({
  onNext,
  value,
  onValueChange,
  direction,
}: {
  onNext: () => void;
  value?: 'midi' | 'mic' | 'touch';
  onValueChange: (input: 'midi' | 'mic' | 'touch') => void;
  direction: SlideDirection;
}): React.ReactElement {
  const catInfo = STEP_CATS[3];

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-3">
      <View style={styles.stepCatRow}>
        <CatAvatar catId={catInfo.catId} size="small" skipEntryAnimation />
        <Text style={styles.catIntro}>{catInfo.subtitle}</Text>
      </View>
      <Text style={styles.stepTitle}>How Will You Play?</Text>
      <Text style={styles.stepDescription}>
        Choose how you'll input notes. You can always change this later in Settings.
      </Text>

      <View style={styles.midiOptions}>
        <OptionCard
          iconName="piano"
          iconColor="#FFD700"
          title="MIDI Keyboard"
          description="USB or Bluetooth connected — best experience"
          selected={value === 'midi'}
          onPress={() => onValueChange('midi')}
          testID="onboarding-input-midi"
        />
        <OptionCard
          iconName="microphone"
          iconColor="#FF6B35"
          title="Microphone"
          description="Play a real piano or sing — the app listens"
          selected={value === 'mic'}
          onPress={() => onValueChange('mic')}
          testID="onboarding-input-mic"
        />
        <OptionCard
          iconName="cellphone"
          iconColor="#4FC3F7"
          title="On-Screen Keyboard"
          description="Tap to play — no equipment needed"
          selected={value === 'touch'}
          onPress={() => onValueChange('touch')}
          testID="onboarding-input-touch"
        />
      </View>

      <Button
        title="Next"
        onPress={onNext}
        disabled={value === undefined}
        size="large"
        style={styles.button}
        testID="onboarding-input-next"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Goal Setting
// ---------------------------------------------------------------------------

function GoalSettingStep({
  onNext,
  value,
  onValueChange,
  direction,
}: {
  onNext: () => void;
  value?: string;
  onValueChange: (goal: 'songs' | 'technique' | 'exploration') => void;
  direction: SlideDirection;
}): React.ReactElement {
  const catInfo = STEP_CATS[4];

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-4">
      <View style={styles.stepCatRow}>
        <CatAvatar catId={catInfo.catId} size="small" skipEntryAnimation />
        <Text style={styles.catIntro}>{catInfo.subtitle}</Text>
      </View>
      <Text style={styles.stepTitle}>What's Your Goal?</Text>
      <Text style={styles.stepDescription}>
        Choose what motivates you most
      </Text>

      <View style={styles.optionsList}>
        <OptionCard
          iconName="music-note"
          iconColor="#FFD700"
          title="Play My Favorite Songs"
          description="Learn recognizable melodies quickly"
          selected={value === 'songs'}
          onPress={() => onValueChange('songs')}
          testID="onboarding-goal-songs"
        />
        <OptionCard
          iconName="bullseye-arrow"
          iconColor={COLORS.primary}
          title="Learn Proper Technique"
          description="Build solid fundamentals for long-term growth"
          selected={value === 'technique'}
          onPress={() => onValueChange('technique')}
          testID="onboarding-goal-technique"
        />
        <OptionCard
          iconName="rocket-launch"
          iconColor="#CE93D8"
          title="Just Explore & Have Fun"
          description="No pressure, let's experiment!"
          selected={value === 'exploration'}
          onPress={() => onValueChange('exploration')}
          testID="onboarding-goal-exploration"
        />
      </View>

      <Button
        title="Next"
        onPress={onNext}
        disabled={!value}
        size="large"
        style={styles.button}
        testID="onboarding-goal-next"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Choose Your Cat Companion
// ---------------------------------------------------------------------------

function CatSelectionStep({
  onSelect,
  onNext,
  selectedCatId,
  direction,
}: {
  onSelect: (catId: string) => void;
  onNext: () => void;
  selectedCatId?: string;
  direction: SlideDirection;
}): React.ReactElement {
  const starterCats = getStarterCats();

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-5">
      <Text style={styles.stepTitle}>Choose Your Cat Companion</Text>
      <Text style={styles.stepDescription}>
        Each cat has a unique personality and musical specialty
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catCardsContainer}
      >
        {starterCats.map((cat) => (
          <CatSelectionCard
            key={cat.id}
            cat={cat}
            selected={selectedCatId === cat.id}
            onSelect={() => onSelect(cat.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.catUnlockHint}>
        Earn gems to unlock the others!
      </Text>

      <Button
        title="Next"
        onPress={onNext}
        disabled={!selectedCatId}
        size="large"
        style={styles.button}
        testID="onboarding-cat-next"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Step 6: Choose Username & Display Name
// ---------------------------------------------------------------------------

function UsernameStep({
  onNext,
  username,
  displayNameValue,
  onUsernameChange,
  onDisplayNameChange,
  direction,
}: {
  onNext: () => void;
  username?: string;
  displayNameValue?: string;
  onUsernameChange: (name: string) => void;
  onDisplayNameChange: (name: string) => void;
  direction: SlideDirection;
}): React.ReactElement {
  const catInfo = STEP_CATS[6];
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUsernameInput = useCallback(
    (text: string) => {
      const normalized = text.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
      onUsernameChange(normalized);
      setIsAvailable(null);
      setValidationError(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (normalized.length === 0) return;

      if (normalized.length < 3) {
        setValidationError('At least 3 characters');
        return;
      }

      if (!isValidUsername(normalized)) {
        setValidationError('Only lowercase letters, numbers, _ and -');
        return;
      }

      setIsChecking(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const available = await checkUsernameAvailable(normalized);
          setIsAvailable(available);
          if (!available) {
            setValidationError('Username already taken');
          }
        } catch {
          // Network/permission error — allow proceeding optimistically.
          // Registration will validate again. Don't block onboarding on network.
          setIsAvailable(true);
          setValidationError(null);
        } finally {
          setIsChecking(false);
        }
      }, 500);
    },
    [onUsernameChange],
  );

  const canProceed =
    !!username &&
    username.length >= 3 &&
    isValidUsername(username) &&
    isAvailable === true &&
    !isChecking;

  return (
    <AnimatedStepWrapper direction={direction} testID="onboarding-step-6">
      <View style={styles.stepCatRow}>
        <CatAvatar catId={catInfo.catId} size="small" skipEntryAnimation />
        <Text style={styles.catIntro}>{catInfo.subtitle}</Text>
      </View>
      <Text style={styles.stepTitle}>Pick a Username</Text>
      <Text style={styles.stepDescription}>
        Friends will use this to find you. Choose wisely — it can't be changed!
      </Text>

      {/* Username input */}
      <View style={styles.usernameInputContainer}>
        <Text style={styles.inputLabel}>Username</Text>
        <View style={styles.usernameInputRow}>
          <View style={styles.usernameInputIconLeft}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={20}
              color={COLORS.textMuted}
            />
          </View>
          <TextInput
            style={[
              styles.usernameInput,
              styles.usernameInputWithIcon,
              validationError ? styles.usernameInputError : null,
              isAvailable === true && username && username.length >= 3 ? styles.usernameInputSuccess : null,
            ]}
            value={username ?? ''}
            onChangeText={handleUsernameInput}
            placeholder="jazzycat99"
            placeholderTextColor={COLORS.textMuted}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            testID="onboarding-username-input"
          />
          {isChecking && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.usernameSpinner}
            />
          )}
          {!isChecking && isAvailable === true && username && username.length >= 3 && (
            <View style={styles.usernameAvailableIcon}>
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            </View>
          )}
        </View>
        <View style={styles.usernameMetaRow}>
          {validationError ? (
            <Text style={styles.usernameErrorText}>{validationError}</Text>
          ) : !validationError && isAvailable === true && username && username.length >= 3 ? (
            <View style={styles.usernameSuccessRow}>
              <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
              <Text style={styles.usernameSuccessText}>Username available!</Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={styles.usernameCharCount}>
            {(username ?? '').length}/20
          </Text>
        </View>
      </View>

      {/* Display name input */}
      <View style={styles.usernameInputContainer}>
        <Text style={styles.inputLabel}>Display Name (optional)</Text>
        <TextInput
          style={styles.usernameInput}
          value={displayNameValue ?? ''}
          onChangeText={(text) => onDisplayNameChange(text.slice(0, 30))}
          placeholder="Defaults to your username"
          placeholderTextColor={COLORS.textMuted}
          maxLength={30}
          autoCorrect={false}
          returnKeyType="done"
          testID="onboarding-displayname-input"
        />
      </View>

      <Button
        title="Finish"
        onPress={onNext}
        disabled={!canProceed}
        size="large"
        style={styles.button}
        testID="onboarding-finish"
      />
    </AnimatedStepWrapper>
  );
}

// ---------------------------------------------------------------------------
// Cat Selection Card
// ---------------------------------------------------------------------------

/** Map cat personality to trait tags */
const CAT_TRAIT_TAGS: Record<string, string[]> = {
  'mini-meowww': ['Precise', 'Expressive', 'Tiny'],
  jazzy: ['Smooth', 'Improviser', 'Cool'],
  luna: ['Mysterious', 'Creative', 'Nocturnal'],
};

function CatSelectionCard({
  cat,
  selected,
  onSelect,
}: {
  cat: CatCharacter;
  selected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const traits = CAT_TRAIT_TAGS[cat.id] ?? [];

  return (
    <View
      style={[
        styles.catCard,
        { borderColor: selected ? cat.color : COLORS.cardBorder },
        selected && {
          backgroundColor: glowColor(cat.color, 0.08),
          ...shadowGlow(cat.color, 10),
        },
      ]}
      testID={`onboarding-cat-${cat.id}`}
    >
      {/* Selected sparkle badge */}
      {selected && (
        <View style={styles.catSparkle}>
          <MaterialCommunityIcons name="star-four-points" size={20} color={cat.color} />
        </View>
      )}

      {/* Gradient overlay when selected */}
      {selected && (
        <LinearGradient
          colors={[glowColor(cat.color, 0.12), 'transparent']}
          style={styles.catCardGradientOverlay}
        />
      )}

      <View style={styles.catCardAvatar}>
        <CatAvatar catId={cat.id} size="large" skipEntryAnimation />
      </View>

      <Text style={styles.catCardName}>{cat.name}</Text>
      <Text style={styles.catCardPersonality}>{cat.personality}</Text>

      {/* Personality trait tags */}
      {traits.length > 0 && (
        <View style={styles.catTraitsRow}>
          {traits.map((trait) => (
            <View
              key={trait}
              style={[styles.catTraitPill, { backgroundColor: glowColor(cat.color, 0.15) }]}
            >
              <Text style={[styles.catTraitText, { color: cat.color }]}>{trait}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.catCardBadge, { backgroundColor: glowColor(cat.color, 0.19) }]}>
        <Text style={[styles.catCardBadgeText, { color: cat.color }]}>
          {cat.musicSkill}
        </Text>
      </View>

      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.catChooseButton,
          { backgroundColor: cat.color, opacity: pressed ? 0.8 : 1 },
          selected && styles.catChooseButtonSelected,
        ]}
        testID={`onboarding-choose-${cat.id}`}
      >
        <Text style={styles.catChooseButtonText}>
          {selected ? `${cat.name} Chosen!` : `Choose ${cat.name}`}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Feature Item Component
// ---------------------------------------------------------------------------

function FeatureItem({
  iconName,
  iconColor,
  iconBg,
  text,
}: {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  iconBg: string;
  text: string;
}): React.ReactElement {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconCircle, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Option Card Component
// ---------------------------------------------------------------------------

function OptionCard({
  iconName,
  iconColor,
  title,
  description,
  selected,
  onPress,
  testID,
}: {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}): React.ReactElement {
  return (
    <Card
      onPress={onPress}
      style={[
        styles.optionCard,
        selected && styles.optionCardSelected,
        selected && shadowGlow(COLORS.primary, 8),
      ]}
      elevated
      padding="medium"
      testID={testID}
    >
      <View style={styles.optionContent}>
        <View style={[styles.optionIconCircle, { backgroundColor: glowColor(iconColor, 0.15) }]}>
          <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
        <View
          style={[
            styles.optionCheckbox,
            selected && styles.optionCheckboxSelected,
          ]}
        >
          {selected && (
            <MaterialCommunityIcons name="check" size={16} color={COLORS.textPrimary} />
          )}
        </View>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar with Cat Avatar
// ---------------------------------------------------------------------------

function StepDots({ currentStep }: { currentStep: number }): React.ReactElement {
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.stepDotsRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        if (isCurrent) {
          return (
            <Animated.View
              key={stepNum}
              style={[styles.stepDotCurrent, pulseStyle]}
            />
          );
        }

        return (
          <View
            key={stepNum}
            style={[
              styles.stepDot,
              isCompleted && styles.stepDotCompleted,
              isFuture && styles.stepDotFuture,
            ]}
          />
        );
      })}
    </View>
  );
}

function ProgressBar({ step }: { step: number }): React.ReactElement {
  const fillFraction = useSharedValue(step / TOTAL_STEPS);
  const catInfo = STEP_CATS[step] ?? STEP_CATS[1];

  React.useEffect(() => {
    fillFraction.value = withTiming(step / TOTAL_STEPS, {
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, fillFraction]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillFraction.value * 100}%` as `${number}%`,
  }));

  const catStyle = useAnimatedStyle(() => {
    // Keep the cat within bounds: offset by half cat size so it sits at the leading edge
    const maxTranslate = PROGRESS_BAR_WIDTH - CAT_SIZE;
    const rawTranslate = fillFraction.value * PROGRESS_BAR_WIDTH - CAT_SIZE / 2;
    const clampedTranslate = Math.max(0, Math.min(rawTranslate, maxTranslate));
    return {
      transform: [{ translateX: clampedTranslate }],
    };
  });

  return (
    <View style={styles.progressBarContainer} testID="onboarding-progress">
      {/* Cat avatar walking along the bar */}
      <Animated.View style={[styles.catAvatarContainer, catStyle]}>
        <CatAvatar catId={catInfo.catId} size="small" skipEntryAnimation />
      </Animated.View>

      {/* Track */}
      <View style={styles.progressTrack}>
        {/* Fill */}
        <Animated.View style={[styles.progressFillWrapper, fillStyle]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFillGradient}
          />
        </Animated.View>
      </View>

      {/* Step indicator dots */}
      <StepDots currentStep={step} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Screen
// ---------------------------------------------------------------------------

export function OnboardingScreen(): React.ReactElement {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>({});
  const [direction, setDirection] = useState<SlideDirection>('forward');
  const pendingAssessmentReturnRef = useRef(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const setExperienceLevel = useSettingsStore((s) => s.setExperienceLevel);
  const setLearningGoal = useSettingsStore((s) => s.setLearningGoal);
  const setPlaybackSpeed = useSettingsStore((s) => s.setPlaybackSpeed);

  // When returning from SkillAssessment, advance to step 4 (Goal Setting)
  useFocusEffect(
    useCallback(() => {
      if (pendingAssessmentReturnRef.current) {
        pendingAssessmentReturnRef.current = false;
        setDirection('forward');
        setStep(4);
      }
    }, []),
  );

  const handleNext = useCallback(() => {
    if (step === 2 && state.experienceLevel) {
      setExperienceLevel(state.experienceLevel);
    }
    // After equipment selection (step 3), navigate to skill assessment
    // for intermediate/returning users — they play using their chosen input method
    if (step === 3 && state.inputMethod) {
      // Persist input method early so SkillAssessment can use it
      useSettingsStore.getState().setPreferredInputMethod(state.inputMethod);

      if (state.experienceLevel === 'intermediate' || state.experienceLevel === 'returning') {
        pendingAssessmentReturnRef.current = true;
        navigation.navigate('SkillAssessment');
        return;
      }
    }
    if (step === TOTAL_STEPS) {
      // MUST set onboarding flag FIRST -- other setters use debouncedSave which
      // captures get() state. If hasCompletedOnboarding is still false when they
      // snapshot, the debounced write overwrites the immediate save 500ms later.
      setHasCompletedOnboarding(true);
      if (state.goal) {
        setLearningGoal(state.goal);
      }
      // Persist input method selection from step 3
      if (state.inputMethod) {
        useSettingsStore.getState().setPreferredInputMethod(state.inputMethod);
        if (state.inputMethod === 'midi') {
          useSettingsStore.getState().updateMidiSettings({ autoConnectMidi: true });
        }
      }
      // Persist cat selection from step 5
      if (state.selectedCatId) {
        useCatEvolutionStore.getState().initializeStarterCat(state.selectedCatId);
        useSettingsStore.getState().setSelectedCatId(state.selectedCatId);
      }
      // Persist username + display name from step 6
      if (state.username) {
        useSettingsStore.getState().setUsername(state.username);
        const dn = state.usernameDisplayName?.trim() || state.username;
        useSettingsStore.getState().setDisplayName(dn);
      }
      // Pre-fill buffer with tier-1 exercises for immediate play (fire-and-forget)
      prefillOnboardingBuffer().catch(() => {});
      // Dismiss the onboarding modal and return to MainTabs
      navigation.goBack();
      // If mic was selected, prompt for permission via MicSetupScreen
      if (state.inputMethod === 'mic') {
        setTimeout(() => navigation.navigate('MicSetup'), 300);
      }
    } else {
      setDirection('forward');
      setStep((prev) => prev + 1);
    }
  }, [
    step,
    state.experienceLevel,
    state.inputMethod,
    state.goal,
    state.selectedCatId,
    state.username,
    state.usernameDisplayName,
    setExperienceLevel,
    setHasCompletedOnboarding,
    setLearningGoal,
    navigation,
  ]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setDirection('back');
      setStep((prev) => prev - 1);
    }
  }, [step]);

  const renderStep = (): React.ReactNode => {
    switch (step) {
      case 1:
        return <WelcomeStep onNext={handleNext} direction={direction} />;
      case 2:
        return (
          <ExperienceLevelStep
            value={state.experienceLevel}
            onValueChange={(level) =>
              setState((prev) => ({ ...prev, experienceLevel: level }))
            }
            onNext={handleNext}
            direction={direction}
          />
        );
      case 3:
        return (
          <EquipmentCheckStep
            value={state.inputMethod}
            onValueChange={(input) => {
              setState((prev) => ({ ...prev, inputMethod: input }));
              // MIDI=full speed, Mic=slightly slower, Touch=half speed
              setPlaybackSpeed(input === 'midi' ? 1.0 : input === 'mic' ? 0.75 : 0.5);
            }}
            onNext={handleNext}
            direction={direction}
          />
        );
      case 4:
        return (
          <GoalSettingStep
            value={state.goal}
            onValueChange={(goal) =>
              setState((prev) => ({ ...prev, goal }))
            }
            onNext={handleNext}
            direction={direction}
          />
        );
      case 5:
        return (
          <CatSelectionStep
            selectedCatId={state.selectedCatId}
            onSelect={(catId) => {
              setState((prev) => ({ ...prev, selectedCatId: catId }));
            }}
            onNext={handleNext}
            direction={direction}
          />
        );
      case 6:
        return (
          <UsernameStep
            username={state.username}
            displayNameValue={state.usernameDisplayName}
            onUsernameChange={(name) =>
              setState((prev) => ({ ...prev, username: name }))
            }
            onDisplayNameChange={(name) =>
              setState((prev) => ({ ...prev, usernameDisplayName: name }))
            }
            onNext={handleNext}
            direction={direction}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-screen">
      <GradientMeshBackground accent="home" />
      <ScrollView
        testID="onboarding-scroll"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar with walking cat */}
        <ProgressBar step={step} />

        {/* Step content */}
        {renderStep()}
      </ScrollView>

      {/* Back button for steps 2-5 */}
      {step > 1 && (
        <View style={styles.backButtonContainer}>
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            size="medium"
            style={{ flex: 1 }}
            testID="onboarding-back"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  // Progress bar
  progressBarContainer: {
    marginBottom: SPACING.xl,
    paddingTop: CAT_SIZE + SPACING.xs,
  },
  progressTrack: {
    width: '100%',
    height: PROGRESS_BAR_HEIGHT,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFillWrapper: {
    height: '100%',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressFillGradient: {
    flex: 1,
  },
  catAvatarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CAT_SIZE,
    height: CAT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Step dots
  stepDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepDotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  stepDotFuture: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },

  // Steps
  stepContainer: {
    width: '100%',
    paddingTop: SPACING.sm,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  welcomeGlowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: glowColor(COLORS.primary, 0.08),
    borderWidth: 2,
    borderColor: glowColor(COLORS.primary, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowGlow(COLORS.primary, 16),
  },
  stepTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  stepCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  catIntro: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  stepSubtitle: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  stepDescription: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },

  // Feature list
  featureList: {
    marginBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },

  // Option cards
  optionsList: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  midiOptions: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  optionCard: {
    marginBottom: 0,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: glowColor(COLORS.primary, 0.1),
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  optionDescription: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
  },
  optionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.starEmpty,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Buttons
  button: {
    marginTop: SPACING.lg,
  },
  backButtonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.md,
  },

  // Cat selection cards
  catCardsContainer: {
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  catCard: {
    width: SCREEN_WIDTH * 0.65,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    padding: SPACING.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  catCardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  catSparkle: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 2,
  },
  catCardAvatar: {
    marginBottom: SPACING.md,
  },
  catCardName: {
    ...TYPOGRAPHY.heading.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  catCardPersonality: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  catTraitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  catTraitPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  catTraitText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '600',
  },
  catCardBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  catCardBadgeText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  catChooseButton: {
    width: '100%',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  catChooseButtonSelected: {
    opacity: 0.9,
  },
  catChooseButtonText: {
    ...TYPOGRAPHY.button.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  catUnlockHint: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },

  // Username step
  usernameInputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  usernameInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  usernameInputIconLeft: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  usernameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingRight: 44,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
  },
  usernameInputWithIcon: {
    paddingLeft: 44,
  },
  usernameInputError: {
    borderColor: COLORS.error,
  },
  usernameInputSuccess: {
    borderColor: COLORS.success,
  },
  usernameSpinner: {
    position: 'absolute',
    right: SPACING.md,
  },
  usernameAvailableIcon: {
    position: 'absolute',
    right: SPACING.md,
  },
  usernameMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  usernameSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  usernameErrorText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.error,
  },
  usernameSuccessText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.success,
  },
  usernameCharCount: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
  },
});

export default OnboardingScreen;
