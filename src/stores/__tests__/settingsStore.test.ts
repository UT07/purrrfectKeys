/**
 * Settings Store Tests
 * Tests user preferences, audio settings, display settings, and MIDI configuration
 */

import { useSettingsStore } from '../settingsStore';
import { PersistenceManager, STORAGE_KEYS } from '../persistence';

describe('Settings Store', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      masterVolume: 0.8,
      soundEnabled: true,
      hapticEnabled: true,
      metronomeVolume: 0.5,
      keyboardVolume: 0.8,
      audioBufferSize: 4096,
      showFingerNumbers: true,
      showNoteNames: true,
      preferredHand: 'right',
      darkMode: false,
      showPianoRoll: true,
      showStaffNotation: false,
      reminderTime: '09:00',
      reminderEnabled: true,
      dailyGoalMinutes: 10,
      completionNotifications: true,
      lastMidiDeviceId: null,
      lastMidiDeviceName: null,
      autoConnectMidi: true,
    });
    PersistenceManager.deleteState(STORAGE_KEYS.SETTINGS);
  });

  describe('Audio Settings', () => {
    it('should initialize default audio settings', () => {
      const state = useSettingsStore.getState();
      expect(state.masterVolume).toBe(0.8);
      expect(state.soundEnabled).toBe(true);
      expect(state.hapticEnabled).toBe(true);
      expect(state.metronomeVolume).toBe(0.5);
      expect(state.keyboardVolume).toBe(0.8);
    });

    it('should set master volume with clamping', () => {
      useSettingsStore.getState().setMasterVolume(1.5);
      expect(useSettingsStore.getState().masterVolume).toBe(1);

      useSettingsStore.getState().setMasterVolume(-0.5);
      expect(useSettingsStore.getState().masterVolume).toBe(0);

      useSettingsStore.getState().setMasterVolume(0.5);
      expect(useSettingsStore.getState().masterVolume).toBe(0.5);
    });

    it('should toggle sound enabled', () => {
      expect(useSettingsStore.getState().soundEnabled).toBe(true);
      useSettingsStore.getState().setSoundEnabled(false);
      expect(useSettingsStore.getState().soundEnabled).toBe(false);
      useSettingsStore.getState().setSoundEnabled(true);
      expect(useSettingsStore.getState().soundEnabled).toBe(true);
    });

    it('should toggle haptic enabled', () => {
      expect(useSettingsStore.getState().hapticEnabled).toBe(true);
      useSettingsStore.getState().setHapticEnabled(false);
      expect(useSettingsStore.getState().hapticEnabled).toBe(false);
    });

    it('should batch update audio settings', () => {
      useSettingsStore.getState().updateAudioSettings({
        masterVolume: 0.6,
        soundEnabled: false,
        metronomeVolume: 0.3,
      });

      const state = useSettingsStore.getState();
      expect(state.masterVolume).toBe(0.6);
      expect(state.soundEnabled).toBe(false);
      expect(state.metronomeVolume).toBe(0.3);
      expect(state.keyboardVolume).toBe(0.8); // Unchanged
    });
  });

  describe('Display Settings', () => {
    it('should initialize default display settings', () => {
      const state = useSettingsStore.getState();
      expect(state.showFingerNumbers).toBe(true);
      expect(state.showNoteNames).toBe(true);
      expect(state.preferredHand).toBe('right');
      expect(state.darkMode).toBe(false);
    });

    it('should toggle finger numbers display', () => {
      useSettingsStore.getState().setShowFingerNumbers(false);
      expect(useSettingsStore.getState().showFingerNumbers).toBe(false);

      useSettingsStore.getState().setShowFingerNumbers(true);
      expect(useSettingsStore.getState().showFingerNumbers).toBe(true);
    });

    it('should toggle note names display', () => {
      useSettingsStore.getState().setShowNoteNames(false);
      expect(useSettingsStore.getState().showNoteNames).toBe(false);

      useSettingsStore.getState().setShowNoteNames(true);
      expect(useSettingsStore.getState().showNoteNames).toBe(true);
    });

    it('should set preferred hand', () => {
      useSettingsStore.getState().setPreferredHand('left');
      expect(useSettingsStore.getState().preferredHand).toBe('left');

      useSettingsStore.getState().setPreferredHand('both');
      expect(useSettingsStore.getState().preferredHand).toBe('both');

      useSettingsStore.getState().setPreferredHand('right');
      expect(useSettingsStore.getState().preferredHand).toBe('right');
    });

    it('should toggle dark mode', () => {
      expect(useSettingsStore.getState().darkMode).toBe(false);
      useSettingsStore.getState().setDarkMode(true);
      expect(useSettingsStore.getState().darkMode).toBe(true);
    });

    it('should batch update display settings', () => {
      useSettingsStore.getState().updateDisplaySettings({
        darkMode: true,
        preferredHand: 'left',
        showNoteNames: false,
      });

      const state = useSettingsStore.getState();
      expect(state.darkMode).toBe(true);
      expect(state.preferredHand).toBe('left');
      expect(state.showNoteNames).toBe(false);
      expect(state.showFingerNumbers).toBe(true); // Unchanged
    });
  });

  describe('Notification Settings', () => {
    it('should initialize default notification settings', () => {
      const state = useSettingsStore.getState();
      expect(state.reminderTime).toBe('09:00');
      expect(state.reminderEnabled).toBe(true);
      expect(state.dailyGoalMinutes).toBe(10);
      expect(state.completionNotifications).toBe(true);
    });

    it('should set reminder time', () => {
      useSettingsStore.getState().setReminderTime('14:30');
      expect(useSettingsStore.getState().reminderTime).toBe('14:30');

      useSettingsStore.getState().setReminderTime(null);
      expect(useSettingsStore.getState().reminderTime).toBeNull();
    });

    it('should set daily goal minutes with minimum', () => {
      useSettingsStore.getState().setDailyGoalMinutes(30);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(30);

      useSettingsStore.getState().setDailyGoalMinutes(0);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(1); // Minimum is 1

      useSettingsStore.getState().setDailyGoalMinutes(-5);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(1);
    });

    it('should batch update notification settings', () => {
      useSettingsStore.getState().updateNotificationSettings({
        reminderTime: '20:00',
        reminderEnabled: false,
        dailyGoalMinutes: 20,
      });

      const state = useSettingsStore.getState();
      expect(state.reminderTime).toBe('20:00');
      expect(state.reminderEnabled).toBe(false);
      expect(state.dailyGoalMinutes).toBe(20);
      expect(state.completionNotifications).toBe(true); // Unchanged
    });
  });

  describe('MIDI Settings', () => {
    it('should initialize default MIDI settings', () => {
      const state = useSettingsStore.getState();
      expect(state.lastMidiDeviceId).toBeNull();
      expect(state.lastMidiDeviceName).toBeNull();
      expect(state.autoConnectMidi).toBe(true);
    });

    it('should set last MIDI device', () => {
      useSettingsStore.getState().setLastMidiDevice('device-123', 'Yamaha P-125');
      const state = useSettingsStore.getState();
      expect(state.lastMidiDeviceId).toBe('device-123');
      expect(state.lastMidiDeviceName).toBe('Yamaha P-125');
    });

    it('should clear MIDI device', () => {
      useSettingsStore.getState().setLastMidiDevice('device-123', 'Device');
      useSettingsStore.getState().setLastMidiDevice(null, null);

      const state = useSettingsStore.getState();
      expect(state.lastMidiDeviceId).toBeNull();
      expect(state.lastMidiDeviceName).toBeNull();
    });

    it('should batch update MIDI settings', () => {
      useSettingsStore.getState().updateMidiSettings({
        lastMidiDeviceId: 'dev-456',
        lastMidiDeviceName: 'Roland',
        autoConnectMidi: false,
      });

      const state = useSettingsStore.getState();
      expect(state.lastMidiDeviceId).toBe('dev-456');
      expect(state.lastMidiDeviceName).toBe('Roland');
      expect(state.autoConnectMidi).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset all settings to defaults', () => {
      useSettingsStore.getState().setMasterVolume(0.5);
      useSettingsStore.getState().setDarkMode(true);
      useSettingsStore.getState().setPreferredHand('left');
      useSettingsStore.getState().setReminderTime('18:00');
      useSettingsStore.getState().setLastMidiDevice('dev-123', 'Device');

      useSettingsStore.getState().reset();

      const state = useSettingsStore.getState();
      expect(state.masterVolume).toBe(0.8);
      expect(state.darkMode).toBe(false);
      expect(state.preferredHand).toBe('right');
      expect(state.reminderTime).toBe('09:00');
      expect(state.lastMidiDeviceId).toBeNull();
    });
  });

  describe('Volume Constraints', () => {
    it('should clamp master volume between 0 and 1', () => {
      const testCases = [
        { input: -1, expected: 0 },
        { input: -0.5, expected: 0 },
        { input: 0, expected: 0 },
        { input: 0.25, expected: 0.25 },
        { input: 0.5, expected: 0.5 },
        { input: 1, expected: 1 },
        { input: 1.5, expected: 1 },
        { input: 2, expected: 1 },
      ];

      testCases.forEach(({ input, expected }) => {
        useSettingsStore.getState().setMasterVolume(input);
        expect(useSettingsStore.getState().masterVolume).toBe(expected);
      });
    });
  });

  describe('Daily Goal Constraints', () => {
    it('should enforce minimum daily goal of 1 minute', () => {
      const testCases = [
        { input: -10, expected: 1 },
        { input: 0, expected: 1 },
        { input: 1, expected: 1 },
        { input: 30, expected: 30 },
        { input: 120, expected: 120 },
      ];

      testCases.forEach(({ input, expected }) => {
        useSettingsStore.getState().setDailyGoalMinutes(input);
        expect(useSettingsStore.getState().dailyGoalMinutes).toBe(expected);
      });
    });
  });
});
