import { SoundManager } from '../SoundManager';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          replayAsync: jest.fn().mockResolvedValue(undefined),
          setVolumeAsync: jest.fn().mockResolvedValue(undefined),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
        },
      }),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('SoundManager', () => {
  let manager: SoundManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new SoundManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('starts with sound enabled and default volume', () => {
    expect(manager.isEnabled()).toBe(true);
    expect(manager.getVolume()).toBe(0.35);
  });

  it('can be disabled and re-enabled', () => {
    manager.setEnabled(false);
    expect(manager.isEnabled()).toBe(false);
    manager.setEnabled(true);
    expect(manager.isEnabled()).toBe(true);
  });

  it('setVolume clamps between 0 and 1', () => {
    manager.setVolume(1.5);
    expect(manager.getVolume()).toBe(1);
    manager.setVolume(-0.5);
    expect(manager.getVolume()).toBe(0);
    manager.setVolume(0.5);
    expect(manager.getVolume()).toBe(0.5);
  });

  it('play does nothing when disabled', () => {
    const Haptics = require('expo-haptics');
    manager.setEnabled(false);
    manager.play('button_press');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('play triggers haptic even before preload', () => {
    const Haptics = require('expo-haptics');
    manager.play('button_press');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('preload resolves without error', async () => {
    await expect(manager.preload()).resolves.not.toThrow();
  });

  it('preload loads all 26 sound assets', async () => {
    const { Audio } = require('expo-av');
    await manager.preload();
    // 25 SoundName entries
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(25);
  });

  it('play triggers correct haptic type per sound category', () => {
    const Haptics = require('expo-haptics');
    const realNow = Date.now;

    // Each play needs a time gap to pass both per-sound debounce (150ms)
    // and haptic throttle (80ms)
    let mockTime = 1000;
    Date.now = () => mockTime;

    manager.play('note_correct');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');

    mockTime += 200;
    manager.play('combo_20');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');

    mockTime += 200;
    manager.play('star_earn');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');

    Date.now = realNow;
  });

  it('debounces duplicate sounds within 150ms', () => {
    const Haptics = require('expo-haptics');
    const realNow = Date.now;

    let mockTime = 1000;
    Date.now = () => mockTime;

    manager.play('star_earn');
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    // Second play of same sound within 150ms — should be silenced
    mockTime += 50;
    manager.play('star_earn');
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    // Different sound after haptic throttle (80ms) — should still play
    mockTime += 100;
    manager.play('note_correct');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);

    // Same sound after debounce window — should play again
    mockTime += 200;
    manager.play('star_earn');
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);

    Date.now = realNow;
  });
});
