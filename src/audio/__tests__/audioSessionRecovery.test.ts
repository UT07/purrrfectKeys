/**
 * Audio session recovery — regression tests.
 *
 * BUG: audio dies permanently after an interruption (call, Siri, alarm),
 * a route change (headphones unplugged), or backgrounding the app.
 *
 * ROOT CAUSE: `ensureAudioModeConfigured` caches the last requested mode in a
 * module-level `lastAudioMode` and early-returns when it matches. iOS
 * deactivates the AVAudioSession on interruption, but the cache still says
 * 'playback', so every later call short-circuits and never reactivates.
 * Audio stays dead until the process is killed.
 *
 * FIX: `invalidateAudioMode()` clears the cache, and `installAudioSessionRecovery()`
 * wires interruption / routeChange / AppState-foreground to invalidate + reconfigure.
 */

const mockSetAudioSessionOptions = jest.fn();
const mockSetAudioSessionActivity = jest.fn().mockResolvedValue(true);
const mockObserveAudioInterruptions = jest.fn();
const mockRemove = jest.fn();
const systemListeners: Record<string, (e: unknown) => void> = {};
const mockAddSystemEventListener = jest.fn((name: string, cb: (e: unknown) => void) => {
  systemListeners[name] = cb;
  return { remove: mockRemove };
});

jest.mock('react-native-audio-api', () => ({
  AudioManager: {
    setAudioSessionOptions: mockSetAudioSessionOptions,
    setAudioSessionActivity: mockSetAudioSessionActivity,
    observeAudioInterruptions: mockObserveAudioInterruptions,
    addSystemEventListener: mockAddSystemEventListener,
  },
}));

let appStateHandler: ((s: string) => void) | undefined;
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_type: string, cb: (s: string) => void) => {
      appStateHandler = cb;
      return { remove: jest.fn() };
    }),
  },
}));

import {
  ensureAudioModeConfigured,
  invalidateAudioMode,
  installAudioSessionRecovery,
  uninstallAudioSessionRecovery,
} from '../createAudioEngine';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(systemListeners).forEach((k) => delete systemListeners[k]);
  appStateHandler = undefined;
  invalidateAudioMode();
  uninstallAudioSessionRecovery();
});

describe('ensureAudioModeConfigured caching', () => {
  it('skips reconfiguration when the mode is unchanged', async () => {
    await ensureAudioModeConfigured(false);
    await ensureAudioModeConfigured(false);
    expect(mockSetAudioSessionOptions).toHaveBeenCalledTimes(1);
  });

  it('reconfigures when the mode changes', async () => {
    await ensureAudioModeConfigured(false);
    await ensureAudioModeConfigured(true);
    expect(mockSetAudioSessionOptions).toHaveBeenCalledTimes(2);
  });
});

describe('invalidateAudioMode', () => {
  it('forces the next call to reconfigure even in the same mode', async () => {
    await ensureAudioModeConfigured(false);
    expect(mockSetAudioSessionOptions).toHaveBeenCalledTimes(1);

    invalidateAudioMode();
    await ensureAudioModeConfigured(false);

    // Without the fix this stays at 1 and audio never comes back.
    expect(mockSetAudioSessionOptions).toHaveBeenCalledTimes(2);
  });
});

describe('installAudioSessionRecovery', () => {
  it('enables interruption observation and subscribes to system events', () => {
    installAudioSessionRecovery();
    expect(mockObserveAudioInterruptions).toHaveBeenCalledWith(true);
    expect(mockAddSystemEventListener).toHaveBeenCalledWith('interruption', expect.any(Function));
    expect(mockAddSystemEventListener).toHaveBeenCalledWith('routeChange', expect.any(Function));
  });

  it('is idempotent — repeated installs do not stack listeners', () => {
    installAudioSessionRecovery();
    installAudioSessionRecovery();
    const interruptionSubs = mockAddSystemEventListener.mock.calls.filter(
      (c) => c[0] === 'interruption'
    );
    expect(interruptionSubs).toHaveLength(1);
  });

  it('recovers audio when an interruption ends with shouldResume', async () => {
    await ensureAudioModeConfigured(false);
    installAudioSessionRecovery();
    mockSetAudioSessionOptions.mockClear();

    systemListeners.interruption?.({ type: 'began', shouldResume: true });
    systemListeners.interruption?.({ type: 'ended', shouldResume: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSetAudioSessionOptions).toHaveBeenCalled();
    expect(mockSetAudioSessionActivity).toHaveBeenCalledWith(true);
  });

  it('does not reactivate while the interruption is still active', async () => {
    await ensureAudioModeConfigured(false);
    installAudioSessionRecovery();
    mockSetAudioSessionActivity.mockClear();

    systemListeners.interruption?.({ type: 'began', shouldResume: true });
    await Promise.resolve();

    expect(mockSetAudioSessionActivity).not.toHaveBeenCalledWith(true);
  });

  it('recovers when the output route changes (headphones unplugged)', async () => {
    await ensureAudioModeConfigured(false);
    installAudioSessionRecovery();
    mockSetAudioSessionOptions.mockClear();

    systemListeners.routeChange?.({ reason: 'OldDeviceUnavailable' });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSetAudioSessionOptions).toHaveBeenCalled();
  });

  it('recovers when the app returns to the foreground', async () => {
    await ensureAudioModeConfigured(false);
    installAudioSessionRecovery();
    mockSetAudioSessionOptions.mockClear();

    appStateHandler?.('background');
    appStateHandler?.('active');
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSetAudioSessionOptions).toHaveBeenCalled();
  });

  it('preserves recording mode across recovery', async () => {
    await ensureAudioModeConfigured(true);
    installAudioSessionRecovery();
    mockSetAudioSessionOptions.mockClear();

    systemListeners.interruption?.({ type: 'ended', shouldResume: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSetAudioSessionOptions).toHaveBeenCalledWith(
      expect.objectContaining({ iosCategory: 'playAndRecord' })
    );
  });

  it('survives a listener throwing without killing recovery', async () => {
    mockSetAudioSessionOptions.mockImplementationOnce(() => {
      throw new Error('session busy');
    });
    installAudioSessionRecovery();

    expect(() =>
      systemListeners.interruption?.({ type: 'ended', shouldResume: true })
    ).not.toThrow();
  });
});
