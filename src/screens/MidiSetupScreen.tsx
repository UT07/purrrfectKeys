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
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getMidiInput } from '../input/MidiInput';
import MidiDeviceManager from '../input/MidiDevice';
import type { MidiDevice } from '../input/MidiInput';
import type { MidiNoteEvent } from '../core/exercises/types';
import { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { logger } from '../utils/logger';

type SetupStep = 'welcome' | 'detecting' | 'select' | 'verify' | 'success';

interface MidiSetupScreenProps {
  onComplete?: (deviceId: string) => void;
  onCancel?: () => void;
}

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
        Alert.alert('Error', 'Failed to initialize MIDI. Please check your device.');
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
        Alert.alert(
          'No Devices Found',
          'Please connect a MIDI keyboard and try again.\n\n' +
            'iOS: Use Apple Camera Connection Kit\n' +
            'Android: Use USB OTG adapter or Bluetooth'
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
      Alert.alert('Detection Failed', 'Could not access MIDI devices. Try again?');
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
    <ScrollView
      style={[s.container, { backgroundColor: COLORS.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
      testID="midi-setup-screen"
    >
      <View style={{ padding: SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }}>
        {/* Back Button */}
        <PressableScale onPress={handleGoBack} style={s.backButton} testID="midi-back">
          <Text style={s.backButtonText}>← Back</Text>
        </PressableScale>

        {/* Header */}
        <View style={{ marginBottom: SPACING.xl }}>
          <Text style={s.title}>Connect Your MIDI Keyboard</Text>
          <Text style={s.subtitle}>
            {step === 'welcome' && 'Follow these steps to set up your MIDI keyboard'}
            {step === 'detecting' && 'Searching for devices...'}
            {step === 'select' && 'Choose your keyboard'}
            {step === 'verify' && 'Testing connection'}
            {step === 'success' && 'Ready to play!'}
          </Text>
        </View>

        {step === 'welcome' && <WelcomeStep onStart={startDetection} />}
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
  );
};

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
      <View style={s.card}>
        <Text style={s.cardTitle}>Setup Instructions</Text>
        {instructions.map((instruction, index) => (
          <View key={index} style={{ flexDirection: 'row', marginBottom: index < instructions.length - 1 ? SPACING.md : 0 }}>
            <Text style={[s.cardText, { marginRight: SPACING.md, fontWeight: '600' }]}>{index + 1}.</Text>
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
        <Text style={s.primaryButtonText}>Search for Devices</Text>
      </PressableScale>
    </View>
  );
};

const DetectingStep: React.FC = () => (
  <View style={{ alignItems: 'center', paddingVertical: SPACING.xxl }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={[s.subtitle, { marginTop: SPACING.md }]}>Scanning for MIDI devices...</Text>
    <Text style={[s.cardText, { marginTop: SPACING.sm, color: COLORS.textMuted }]}>
      Make sure your keyboard is connected and powered on
    </Text>
  </View>
);

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
            { marginBottom: SPACING.sm },
            selectedDevice?.id === device.id && { borderColor: COLORS.primary, borderWidth: 2 },
          ]}
        >
          <Text style={[s.cardTitle, { marginBottom: SPACING.xs }]}>{device.name}</Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }]}>
            {device.manufacturer} · {device.type.toUpperCase()}
          </Text>
        </PressableScale>
      ))}
    </View>
    <PressableScale onPress={onBack} style={s.secondaryButton}>
      <Text style={s.secondaryButtonText}>← Back</Text>
    </PressableScale>
  </View>
);

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
    <View style={s.card}>
      <Text style={s.cardTitle}>{device.name}</Text>
      <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }]}>
        {device.manufacturer} · {device.type.toUpperCase()}
      </Text>
    </View>

    <View style={[s.card, { alignItems: 'center' }]}>
      {status === 'pending' && (
        <>
          <Text style={[s.cardTitle, { marginBottom: SPACING.md }]}>Play a note on your keyboard</Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg }]}>
            Press any key and we'll detect it to verify the connection works
          </Text>
        </>
      )}
      {status === 'testing' && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[s.subtitle, { marginTop: SPACING.md }]}>Listening for notes...</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <Text style={{ ...TYPOGRAPHY.display.md, marginBottom: SPACING.sm, color: COLORS.success }}>✓</Text>
          <Text style={[s.cardTitle, { color: COLORS.success }]}>Connection Successful!</Text>
          <Text style={[s.cardText, { ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted, marginTop: SPACING.sm }]}>
            {noteDetected ? 'Note received' : 'Waiting for note'}
          </Text>
        </>
      )}
      {status === 'failed' && (
        <>
          <Text style={{ ...TYPOGRAPHY.display.md, marginBottom: SPACING.sm, color: COLORS.error }}>✗</Text>
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
          <Text style={s.primaryButtonText}>Start Test</Text>
        </PressableScale>
      )}
      {status === 'success' && (
        <PressableScale onPress={onSuccess} style={[s.primaryButton, { backgroundColor: COLORS.success }]}>
          <Text style={s.primaryButtonText}>Confirm & Continue</Text>
        </PressableScale>
      )}
      {status === 'failed' && (
        <PressableScale onPress={onRetry} style={[s.primaryButton, { backgroundColor: COLORS.warning }]}>
          <Text style={s.primaryButtonText}>Try Again</Text>
        </PressableScale>
      )}
      <PressableScale onPress={onBack} style={s.secondaryButton}>
        <Text style={s.secondaryButtonText}>← Back</Text>
      </PressableScale>
    </View>
  </View>
);

const SuccessStep: React.FC<{ device: MidiDevice }> = ({ device }) => (
  <View style={{ alignItems: 'center', paddingVertical: SPACING.xxl }}>
    <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🎉</Text>
    <Text style={[s.title, { fontSize: 18 }]}>All Set!</Text>
    <Text style={[s.subtitle, { textAlign: 'center', marginBottom: SPACING.lg }]}>
      Your {device.name} is ready to use
    </Text>
    <Text style={{ ...TYPOGRAPHY.caption.lg, color: COLORS.textMuted }}>Redirecting...</Text>
  </View>
);

const s = StyleSheet.create({
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
});

export default MidiSetupScreen;
