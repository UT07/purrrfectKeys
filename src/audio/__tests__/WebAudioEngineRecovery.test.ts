/**
 * WebAudioEngine context recovery — regression tests.
 *
 * BUG: audio dies mid-session with no interruption and never returns until the
 * app is killed and relaunched.
 *
 * ROOT CAUSE: playNote() only recovered from state === 'suspended'. If the
 * AudioContext reaches 'closed' — terminal on iOS, and NOT revivable by
 * resume() — playNote kept creating oscillators into a dead context. Result:
 * silence, no error, no recovery. Relaunching the app was the only fix because
 * that is the only thing that constructed a fresh context.
 *
 * FIX: ensureContextAlive() resumes a suspended context and fully rebuilds a
 * closed one (new context + gain graph), so the engine self-heals in place.
 */

const createGainNode = (): Record<string, unknown> => ({
  gain: {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
    setTargetAtTime: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
});

const createOscillatorNode = (): Record<string, unknown> => ({
  frequency: { value: 440, setValueAtTime: jest.fn() },
  type: 'sine',
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

let contextsCreated = 0;
let currentState: 'running' | 'suspended' | 'closed' = 'running';
const mockResume = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn();

class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  destination = { connect: jest.fn() };
  constructor() {
    contextsCreated += 1;
    currentState = 'running';
  }
  get state(): string {
    return currentState;
  }
  createGain = jest.fn(createGainNode);
  createOscillator = jest.fn(createOscillatorNode);
  resume = mockResume;
  close = mockClose;
}

jest.mock('react-native-audio-api', () => ({
  AudioContext: jest.fn().mockImplementation(() => new MockAudioContext()),
  AudioManager: {
    setAudioSessionOptions: jest.fn(),
    setAudioSessionActivity: jest.fn().mockResolvedValue(true),
    observeAudioInterruptions: jest.fn(),
    addSystemEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { WebAudioEngine } from '../WebAudioEngine';

describe('WebAudioEngine context recovery', () => {
  let engine: WebAudioEngine;

  beforeEach(async () => {
    jest.clearAllMocks();
    contextsCreated = 0;
    currentState = 'running';
    engine = new WebAudioEngine();
    await engine.initialize();
  });

  afterEach(() => {
    try {
      engine.dispose();
    } catch {
      /* already disposed */
    }
  });

  it('plays normally while the context is running', () => {
    expect(contextsCreated).toBe(1);
    expect(() => engine.playNote(60, 0.8)).not.toThrow();
    expect(currentState).toBe('running');
  });

  it('resumes a suspended context rather than rebuilding it', () => {
    currentState = 'suspended';
    engine.playNote(60, 0.8);

    expect(mockResume).toHaveBeenCalled();
    // Suspended is recoverable in place — must NOT construct a new context.
    expect(contextsCreated).toBe(1);
  });

  it('rebuilds a CLOSED context — resume() can never revive one', () => {
    currentState = 'closed';

    engine.playNote(60, 0.8);

    // Before the fix this stayed at 1 and every later note was silent.
    expect(contextsCreated).toBe(2);
    expect(currentState).toBe('running');
  });

  it('produces audible notes again after a closed-context rebuild', () => {
    currentState = 'closed';
    engine.playNote(60, 0.8);

    const handle = engine.playNote(64, 0.8);
    expect(handle).toBeDefined();
    expect(handle.note).toBe(64);
    expect(currentState).toBe('running');
  });

  it('clears stale active notes when rebuilding, so polyphony is not leaked', () => {
    engine.playNote(60, 0.8);
    engine.playNote(64, 0.8);

    currentState = 'closed';
    engine.playNote(67, 0.8);

    // The rebuild drops nodes belonging to the dead context; the new note is
    // the only live one, so the limiter is not stuck attenuating phantom voices.
    expect(engine.getActiveNoteCount()).toBe(1);
  });

  it('reports the live context state through getState()', () => {
    expect(engine.getState()).toBe('running');
    currentState = 'suspended';
    expect(engine.getState()).toBe('suspended');
  });

  it('does not throw if rebuilding fails', () => {
    currentState = 'closed';
    const { AudioContext } = jest.requireMock('react-native-audio-api');
    (AudioContext as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no audio hardware');
    });

    expect(() => engine.playNote(60, 0.8)).not.toThrow();
  });
});
