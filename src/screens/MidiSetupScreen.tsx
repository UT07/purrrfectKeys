/**
 * MIDI Setup Wizard Screen
 * User-friendly flow for connecting MIDI keyboards
 *
 * Flow:
 * 1. Welcome & Instructions
 * 2. Device Detection
 * 3. Device Selection
 * 4. Verification Test
 * 5. Confirmation & Save
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMidiInput } from '../input/MidiInput';
import MidiDeviceManager from '../input/MidiDevice';
import type { MidiDevice } from '../input/MidiInput';
import type { MidiNoteEvent } from '../core/exercises/types';
import { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, SPACING, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import { logger } from '../utils/logger';

type SetupStep = 'welcome' | 'detecting' | 'select' | 'verify' | 'success';

const STEP_ORDER: SetupStep[] = ['welcome', 'detecting', 'select', 'verify', 'success'];
const STEP_LABELS = ['Connect', 'Scan', 'Select', 'Test', 'Done'];

interface MidiSetupScreenProps {
  onComplete?: (deviceId: string) => void;
  onCancel?: () => void;
}

// ─────────────────────────────────────────────────
// Step Progress Indicator
// ─────────────────────────────────────────────────

const StepProgressIndicator: React.FC<{ currentStep: SetupStep }> = ({ currentStep }) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <View style={s.progressContainer}>
      {STEP_ORDER.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <React.Fragment key={step}>
            {/* Connecting line (before each dot except first) */}
            {index > 0 && (
              <View
                style={[
                  s.progressLine,
                  {
                    backgroundColor: index <= currentIndex
                      ? COLORS.success
                      : COLORS.cardBorder,
                  },
                ]}
              />
            )}
            {/* Dot + label column */}
            <View style={s.progressDotColumn}>
              <View
                style={[
                  s.progressDot,
                  isCompleted && s.progressDotCompleted,
                  isCurrent && s.progressDotCurrent,
                  isFuture && s.progressDotFuture,
                ]}
              >
                {isCompleted && (
                  <MaterialCommunityIcons name="check" size={10} color={COLORS.textPrimary} />
                )}
              </View>
              <Text
                style={[
                  s.progressLabel,
                  (isCurrent || isCompleted) && { color: COLORS.textSecondary },
                ]}
              >
                {STEP_LABELS[index]}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────
// Pulsing Ring (for detecting step)
// ─────────────────────────────────────────────────

const PulsingRing: React.FC = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={s.pulsingContainer}>
      <Animated.View style={[s.pulsingRing, ringStyle]} />
      <View style={s.pulsingIconCircle}>
        <MaterialCommunityIcons name="piano" size={40} color={COLORS.primary} />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────

export const MidiSetupScreen: React.FC<MidiSetupScreenProps> = ({
  onComplete,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [availableDevices, setAvailableDevices] = useState<MidiDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MidiDevice | null>(null);
  const [_isDetecting, setIsDetecting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'testing' | 'success' | 'failed'
  >('pending');
  const [testNoteDetected, setTestNoteDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoBack = () => {
    if (onCancel) {
      onCancel();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const initMidi = async () => {
      try {
        await getMidiInput().initialize();
        logger.log('[MidiSetupScreen] MIDI initialized');
      } catch (error) {
        console.error('[MidiSetupScreen] MIDI init failed:', error);
        setErrorMessage('Failed to initialize MIDI. Please check your device.');
      }
    };
    initMidi();
  }, []);

  const startDetection = async () => {
    setIsDetecting(true);
    setStep('detecting');

    try {
      const devices = await getMidiInput().getConnectedDevices();
      setAvailableDevices(devices);

      if (devices.length === 0) {
        setErrorMessage(
          'No devices found. Please connect a MIDI keyboard and try again. ' +
            (Platform.OS === 'ios'
              ? 'Use Apple Camera Connection Kit.'
              : 'Use USB OTG adapter or Bluetooth.')
        );
        setStep('welcome');
      } else if (devices.length === 1) {
        setSelectedDevice(devices[0]);
        setStep('verify');
      } else {
        setStep('select');
      }
    } catch (error) {
      console.error('[MidiSetupScreen] Detection failed:', error);
      setErrorMessage('Detection failed. Could not access MIDI devices. Try again?');
      setStep('welcome');
    } finally {
      setIsDetecting(false);
    }
  };

  const startVerification = async () => {
    if (!selectedDevice) return;

    setVerificationStatus('testing');
    setTestNoteDetected(false);

    const timer = setTimeout(() => {
      setVerificationStatus('failed');
      unsubscribe();
    }, 15000);

    const unsubscribe = getMidiInput().onNoteEvent((event: MidiNoteEvent) => {
      if (event.type === 'noteOn' && event.velocity > 0) {
        clearTimeout(timer);
        setTestNoteDetected(true);
        setVerificationStatus('success');
        unsubscribe();
      }
    });
  };

  const handleVerificationSuccess = () => {
    if (selectedDevice) {
      MidiDeviceManager.registerDevice(selectedDevice);
      MidiDeviceManager.setPreferredDevice(selectedDevice.id);
      MidiDeviceManager.setAutoConnectEnabled(true);

      setStep('success');

      setTimeout(() => {
        onComplete?.(selectedDevice.id);
        if (!onComplete && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1500);
    }
  };

  const handleVerificationRetry = () => {
    setVerificationStatus('pending');
    setTestNoteDetected(false);
  };

  return (
    <View style={[s.outerContainer, { backgroundColor: COLORS.background }]}>
      <GradientMeshBackground accent="profile" />
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top }}
        testID="midi-setup-screen"
      >
      <View style={{ padding: SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }}>
        {/* Back Button */}
        <PressableScale onPress={handleGoBack} style={s.backButton} testID="midi-back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </PressableScale>

        {/* Error Banner */}
        {errorMessage && (
          <View style={s.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={s.errorBannerText}>{errorMessage}</Text>
            <PressableScale onPress={() => setErrorMessage(null)}>
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textMuted} />
            </PressableScale>
          </View>
        )}

        {/* Header */}
        <View style={{ marginBottom: SPACING.md }}>
          <Text style={s.title}>Connect Your MIDI Keyboard</Text>
          <Text style={s.subtitle}>
            {step === 'welcome' && 'Follow these steps to set up your MIDI keyboard'}
            {step === 'detecting' && 'Searching for devices...'}
            {step === 'select' && 'Choose your keyboard'}
            {step === 'verify' && 'Testing connection'}
            {step === 'success' && 'Ready to play!'}
          </Text>
        </View>

        {/* Step Progress Indicator */}
        <StepProgressIndicator currentStep={step} />

        {step === 'welcome' && <WelcomeStep onStart={() => { setErrorMessage(null); startDetection(); }} />}
        {step === 'detecting' && <DetectingStep />}
        {step === 'select' && (
          <SelectStep
            devices={availableDevices}
            selectedDevice={selectedDevice}
            onSelect={(device) => { setSelectedDevice(device); setStep('verify'); }}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'verify' && selectedDevice && (
          <VerifyStep
            device={selectedDevice}
            status={verificationStatus}
            noteDetected={testNoteDetected}
            onStart={startVerification}
            onRetry={handleVerificationRetry}
            onSuccess={handleVerificationSuccess}
            onBack={() => setStep(availableDevices.length > 1 ? 'select' : 'welcome')}
          />
        )}
        {step === 'success' && selectedDevice && <SuccessStep device={selectedDevice} />}
      </View>
    </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────
// Step 1: Welcome
// ─────────────────────────────────────────────────

const WelcomeStep: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const instructions =
    Platform.OS === 'ios'
      ? [
          'Connect your MIDI keyboard using the Apple Camera Connection Kit (Lightning or USB-C)',
          'Power on the MIDI keyboard',
          'Tap "Search for Devices" below',
        ]
      : [
          'Connect your MIDI keyboard using USB OTG adapter, or pair via Bluetooth',
          'Power on the MIDI keyboard',
          'Tap "Search for Devices" below',
        ];

  return (
    <View>
      {/* Hero Piano Icon */}
      <View style={s.heroIconContainer}>
        <View style={s.heroIconCircle}>
          <MaterialCommunityIcons name="piano" size={80} color={COLORS.primary} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Setup Instructions</Text>
        {instructions.map((instruction, index) => (
          <View key={index} style={s.instructionRow}>
            <View style={s.instructionNumber}>
              <Text style={s.instructionNumberText}>{index + 1}</Text>
            </View>
            <Text style={[s.cardText, { flex: 1, lineHeight: 20 }]}>{instruction}</Text>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Supported Keyboards</Text>
        <Text style={[s.cardText, { color: COLORS.textMuted, lineHeight: 20 }]}>
          Yamaha P-125/225, Roland FP-30X, Casio CDP-S130, M-Audio Hammer 88, Korg microKEY, Alesis Q88, and most class-compliant USB MIDI keyboards
        </Text>
      </View>

      <PressableScale onPress={onStart} style={s.primaryButton} testID="midi-search-devices">
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textPrimary} style={{ marginRight: SPACING.sm }} />
        <Text style={s.primaryButtonText}>Search for Devices</Text>
      </PressableScale>
    </View>
  );
};

// ─────────────────────────────────────────────────
// Step 2: Detecting
// ─────────────────────────────────────────────────

const DetectingStep: React.FC = () => (
  <View style={s.detectingContainer}>
    <PulsingRing />
    <Text style={[s.subtitle, { marginTop: SPACING.lg, textAlign: 'center' }]}>
      Scanning for MIDI devices...
    </Text>
    <Text style={[s.cardText, { marginTop: SPACING.sm, color: COLORS.textMuted, textAlign: 'center' }]}>
      Make sure your keyboard is connected and powered on
    </Text>
  </View>
);

// ─────────────────────────────────────────────────
// Step 3: Select
// ─────────────────────────────────────────────────

const SelectStep: React.FC<{
  devices: MidiDevice[];
  selectedDevice: MidiDevice | null;
  onSelect: (device: MidiDevice) => void;
  onBack: () => void;
}> = ({ devices, selectedDevice, onSelect, onBack }) => (
  <View>
    <View style={{ marginBottom: SPACING.lg }}>
      {devices.map((device) => (
        <PressableScale
          key={device.id}
          onPress={() => onSelect(device)}
          style={[
            s.card,
            { marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center' },
            selectedDevice?.id === device.id && { borderColor: COLORS.primary, borderWidth: 2 },
          ]}
        >
          <View style={s.deviceIconCircle}>
            <MaterialCommunityIcons name="piano" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { marginBottom: SPACING.xs }]}>{device.name}</Text>
            <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }]}>
              {device.manufacturer} · {device.type.toUpperCase()}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
        </PressableScale>
      ))}
    </View>
    <PressableScale onPress={onBack} style={s.secondaryButton}>
      <Text style={s.secondaryButtonText}>Back</Text>
    </PressableScale>
  </View>
);

// ─────────────────────────────────────────────────
// Step 4: Verify
// ─────────────────────────────────────────────────

const VerifyStep: React.FC<{
  device: MidiDevice;
  status: 'pending' | 'testing' | 'success' | 'failed';
  noteDetected: boolean;
  onStart: () => void;
  onRetry: () => void;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ device, status, noteDetected, onStart, onRetry, onSuccess, onBack }) => (
  <View>
    <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={s.deviceIconCircle}>
        <MaterialCommunityIcons name="piano" size={24} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{device.name}</Text>
        <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }]}>
          {device.manufacturer} · {device.type.toUpperCase()}
        </Text>
      </View>
    </View>

    <View style={[s.card, { alignItems: 'center' }]}>
      {status === 'pending' && (
        <>
          <View style={s.verifyIconCircle}>
            <MaterialCommunityIcons name="piano" size={36} color={COLORS.textSecondary} />
          </View>
          <Text style={[s.cardTitle, { marginBottom: SPACING.sm, textAlign: 'center' }]}>
            Play a note on your keyboard
          </Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg }]}>
            Press any key and we'll detect it to verify the connection works
          </Text>
        </>
      )}
      {status === 'testing' && (
        <>
          <PulsingRing />
          <Text style={[s.subtitle, { marginTop: SPACING.lg, textAlign: 'center' }]}>
            Listening for notes...
          </Text>
        </>
      )}
      {status === 'success' && (
        <>
          <MaterialCommunityIcons name="check-circle" size={48} color={COLORS.success} style={{ marginBottom: SPACING.sm }} />
          <Text style={[s.cardTitle, { color: COLORS.success }]}>Connection Successful!</Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted, marginTop: SPACING.sm }]}>
            {noteDetected ? 'Note received' : 'Waiting for note'}
          </Text>
        </>
      )}
      {status === 'failed' && (
        <>
          <MaterialCommunityIcons name="close-circle" size={48} color={COLORS.error} style={{ marginBottom: SPACING.sm }} />
          <Text style={[s.cardTitle, { color: COLORS.error }]}>No notes detected</Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' }]}>
            Make sure the keyboard is connected and powered on
          </Text>
        </>
      )}
    </View>

    <View style={{ gap: SPACING.md }}>
      {status === 'pending' && (
        <PressableScale onPress={onStart} style={s.primaryButton}>
          <MaterialCommunityIcons name="play" size={20} color={COLORS.textPrimary} style={{ marginRight: SPACING.sm }} />
          <Text style={s.primaryButtonText}>Start Test</Text>
        </PressableScale>
      )}
      {status === 'success' && (
        <PressableScale onPress={onSuccess} style={[s.primaryButton, { backgroundColor: COLORS.success }]}>
          <MaterialCommunityIcons name="check" size={20} color={COLORS.textPrimary} style={{ marginRight: SPACING.sm }} />
          <Text style={s.primaryButtonText}>Confirm & Continue</Text>
        </PressableScale>
      )}
      {status === 'failed' && (
        <PressableScale onPress={onRetry} style={[s.primaryButton, { backgroundColor: COLORS.warning }]}>
          <MaterialCommunityIcons name="refresh" size={20} color={COLORS.textPrimary} style={{ marginRight: SPACING.sm }} />
          <Text style={s.primaryButtonText}>Try Again</Text>
        </PressableScale>
      )}
      <PressableScale onPress={onBack} style={s.secondaryButton}>
        <Text style={s.secondaryButtonText}>Back</Text>
      </PressableScale>
    </View>
  </View>
);

// ─────────────────────────────────────────────────
// Step 5: Success
// ─────────────────────────────────────────────────

const SuccessStep: React.FC<{ device: MidiDevice }> = ({ device }) => (
  <View style={s.successContainer}>
    {/* Gold glow circle behind party popper */}
    <View style={s.successGlowCircle}>
      <MaterialCommunityIcons name="party-popper" size={56} color={COLORS.starGold} />
    </View>

    {/* Checkmark circle */}
    <View style={s.successCheckCircle}>
      <MaterialCommunityIcons name="check-bold" size={20} color={COLORS.textPrimary} />
    </View>

    <Text style={s.successTitle}>All Set!</Text>
    <Text style={s.successDeviceName}>{device.name}</Text>
    <Text style={[s.subtitle, { textAlign: 'center', marginBottom: SPACING.lg }]}>
      is ready to use
    </Text>
    <Text style={{ ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }}>Redirecting...</Text>
  </View>
);

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

const s = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.button.lg,
  },
  title: {
    ...TYPOGRAPHY.display.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  cardText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button.lg,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.error,
    flex: 1,
  },

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  progressDotColumn: {
    alignItems: 'center',
    width: 40,
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotCompleted: {
    backgroundColor: COLORS.success,
  },
  progressDotCurrent: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  progressDotFuture: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: 'transparent',
  },
  progressLine: {
    height: 2,
    flex: 1,
    alignSelf: 'center',
    marginTop: 10, // vertically center with dot
    marginHorizontal: -2,
  },
  progressLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Hero icon (welcome step)
  heroIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  heroIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: glowColor(COLORS.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instruction rows
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: glowColor(COLORS.primary, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    marginTop: 1,
  },
  instructionNumberText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },

  // Pulsing ring (detecting step)
  detectingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  pulsingContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },
  pulsingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: glowColor(COLORS.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Device icon (select/verify steps)
  deviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: glowColor(COLORS.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },

  // Verify step
  verifyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: glowColor(COLORS.textSecondary, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  // Success step
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  successGlowCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: glowColor(COLORS.starGold, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.starGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  successCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
  successTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successDeviceName: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.starGold,
    marginBottom: SPACING.xs,
  },
});

export default MidiSetupScreen;
