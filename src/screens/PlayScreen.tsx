/**
 * PlayScreen — Neon arcade free play studio.
 *
 * Features:
 * - Single continuous keyboard with octave shift arrows
 * - 7 practice tools via left sidebar (toggles + floating widgets)
 * - Real-time chord detection + scale overlay
 * - Song mode with VerticalPianoRoll falling notes
 * - Aurora background visualization
 * - MIDI and microphone input via InputManager
 * - Landscape default, portrait opt-in
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Keyboard as PianoKeyboard } from '../components/Keyboard/Keyboard';
import { VerticalPianoRoll } from '../components/PianoRoll/VerticalPianoRoll';
import { SongReferencePicker } from '../components/SongReferencePicker';
import { ToolSidebar, type ToolId } from '../components/FreePlay/ToolSidebar';
import { FloatingWidget } from '../components/FreePlay/FloatingWidget';
import { AuroraBackground } from '../components/FreePlay/AuroraBackground';
import { ChordDisplay } from '../components/FreePlay/ChordDisplay';
import { MetronomeWidget } from '../components/FreePlay/MetronomeWidget';
import { KeySelectorWidget, getScaleNotes, type ScaleType } from '../components/FreePlay/KeySelectorWidget';
import { SessionStatsWidget } from '../components/FreePlay/SessionStatsWidget';
import { LoopRecorderWidget } from '../components/FreePlay/LoopRecorderWidget';
import { TempoTrainerWidget } from '../components/FreePlay/TempoTrainerWidget';
import { createAudioEngine } from '../audio/createAudioEngine';
import type { NoteHandle } from '../audio/types';
import type { MidiNoteEvent, NoteEvent } from '../core/exercises/types';
import { InputManager } from '../input/InputManager';
import type { ActiveInputMethod } from '../input/InputManager';
import { useSettingsStore } from '../stores/settingsStore';
import { useSongStore } from '../stores/songStore';
import { analyzeSession, type FreePlayAnalysis } from '../services/FreePlayAnalyzer';
import { ttsService } from '../services/tts/TTSService';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, glowColor, shadowGlow } from '../theme/tokens';
import { computeZoomedRange } from '../components/Keyboard/computeZoomedRange';
import type { SongSection } from '../core/songs/songTypes';
import { logger } from '../utils/logger';
import type { RootStackParamList } from '../navigation/AppNavigator';

// ============================================================================
// Constants
// ============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_AUTO_RELEASE_MS = 1500;
const DEFAULT_START_NOTE = 48; // C3
const DEFAULT_OCTAVE_COUNT = 3;
const MIN_START_NOTE = 24; // C1
const MAX_START_NOTE = 84; // C6
const LANDSCAPE_KEY_HEIGHT = 140;
const PORTRAIT_KEY_HEIGHT = 180;
const MAX_OPEN_WIDGETS = 2;

function midiToNoteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

interface RecordedNote {
  note: number;
  velocity: number;
  timestamp: number;
  releaseTimestamp?: number;
}

// ============================================================================
// Animated sub-components
// ============================================================================

function NoteFlashDisplay({
  noteName,
  testID,
  containerTestID,
}: {
  noteName: string;
  testID?: string;
  containerTestID?: string;
}): React.JSX.Element {
  const flashOpacity = useSharedValue(0);
  const prevNoteRef = useRef('');

  useEffect(() => {
    if (noteName && noteName !== prevNoteRef.current) {
      prevNoteRef.current = noteName;
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
      );
    }
  }, [noteName, flashOpacity]);

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(220, 20, 60, ${flashOpacity.value * 0.25})`,
  }));

  return (
    <View style={styles.noteDisplayOuter} testID={containerTestID}>
      <Animated.View style={[styles.noteDisplay, flashStyle]}>
        <Text style={styles.noteText} testID={testID}>
          {noteName || '\u2014'}
        </Text>
      </Animated.View>
    </View>
  );
}

function SongSectionPills({
  sections,
  selectedIndex,
  onSelect,
}: {
  sections: SongSection[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.sectionPillsRow}>
      {sections.map((section, i) => (
        <PressableScale
          key={section.id}
          style={[styles.sectionPill, i === selectedIndex && styles.sectionPillSelected]}
          onPress={() => onSelect(i)}
        >
          <Text
            style={[
              styles.sectionPillText,
              i === selectedIndex && styles.sectionPillTextSelected,
            ]}
          >
            {section.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PlayScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const preferredInput = useSettingsStore((s) => s.preferredInputMethod);
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);

  // ── Layout state ─────────────────────────────────────────────────────────
  const [isPortrait, setIsPortrait] = useState(false);
  const [vizSize, setVizSize] = useState({ width: 0, height: 0 });

  // ── Keyboard state ───────────────────────────────────────────────────────
  const [startNote, setStartNote] = useState(DEFAULT_START_NOTE);
  const octaveCount = DEFAULT_OCTAVE_COUNT;

  // ── Audio & input ────────────────────────────────────────────────────────
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [activeInput, setActiveInput] = useState<ActiveInputMethod>('touch');
  const audioEngineRef = useRef(createAudioEngine());
  const inputManagerRef = useRef<InputManager | null>(null);
  const activeHandlesRef = useRef<Map<number, NoteHandle>>(new Map());
  const autoReleaseTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // ── Note state ───────────────────────────────────────────────────────────
  const [highlightedNotes, setHighlightedNotes] = useState<Set<number>>(new Set());
  const [currentNoteName, setCurrentNoteName] = useState('');
  const [sessionNoteCount, setSessionNoteCount] = useState(0);
  const sessionNotesRef = useRef<Array<{ note: number; timestamp: number; velocity: number }>>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Analysis ─────────────────────────────────────────────────────────────
  const [analysis, setAnalysis] = useState<FreePlayAnalysis | null>(null);

  // ── Recording ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const recordingStartRef = useRef(0);
  const playbackCancelRef = useRef(false);
  const playbackHandlesRef = useRef<Map<number, NoteHandle>>(new Map());
  const playbackTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // ── Tool state ───────────────────────────────────────────────────────────
  const [activeToggles, setActiveToggles] = useState<Set<ToolId>>(new Set());
  const [openWidgets, setOpenWidgets] = useState<ToolId[]>([]);

  // ── Key selector state ───────────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string | null>('C');
  const [selectedScale, setSelectedScale] = useState<ScaleType>('Major');

  // ── Song state ───────────────────────────────────────────────────────────
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string | null>(null);
  const [songLoadError, setSongLoadError] = useState<string | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [songPlaying, setSongPlaying] = useState(false);
  const [songBeat, setSongBeat] = useState(0);
  const songBeatRef = useRef(0);
  const songTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadSong = useSongStore((s) => s.loadSong);
  const currentSong = useSongStore((s) => s.currentSong);
  const isLoadingSong = useSongStore((s) => s.isLoadingSong);

  const songMode = !!(currentSong?.sections && selectedSongTitle);
  const songNotes: NoteEvent[] = songMode
    ? (currentSong?.sections[selectedSectionIndex]?.layers?.melody ?? [])
    : [];

  // Scale note highlighting
  const scaleNoteSet = useMemo(() => {
    if (!activeToggles.has('scale') || !selectedKey) return null;
    return getScaleNotes(selectedKey, selectedScale);
  }, [activeToggles, selectedKey, selectedScale]);

  // Song keyboard range
  const songKeyboardRange = useMemo(() => {
    if (songNotes.length === 0) return null;
    return computeZoomedRange(songNotes.map((n) => n.note), 3);
  }, [songNotes]);

  const effectiveStartNote = songKeyboardRange?.startNote ?? startNote;
  const effectiveOctaveCount = songKeyboardRange?.octaveCount ?? octaveCount;
  const keyHeight = isPortrait ? PORTRAIT_KEY_HEIGHT : LANDSCAPE_KEY_HEIGHT;

  // ── Orientation ──────────────────────────────────────────────────────────
  useEffect(() => {
    const lock = isPortrait
      ? ScreenOrientation.OrientationLock.PORTRAIT_UP
      : ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
    ScreenOrientation.lockAsync(lock).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [isPortrait]);

  // ── Audio engine init ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      try {
        await audioEngineRef.current.initialize();
        if (mounted) setIsAudioReady(true);
      } catch {
        logger.warn('[PlayScreen] Audio init failed');
      }
    };
    init();
    return () => {
      mounted = false;
      playbackCancelRef.current = true;
      for (const t of playbackTimersRef.current) clearTimeout(t);
      playbackTimersRef.current.clear();
      for (const handle of playbackHandlesRef.current.values()) {
        audioEngineRef.current.releaseNote(handle);
      }
      playbackHandlesRef.current.clear();
      audioEngineRef.current.releaseAllNotes();
      activeHandlesRef.current.clear();
      for (const t of autoReleaseTimersRef.current.values()) clearTimeout(t);
      autoReleaseTimersRef.current.clear();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      ttsService.stop();
    };
  }, []);

  // ── InputManager ─────────────────────────────────────────────────────────
  const handleNoteOnRef = useRef<(event: MidiNoteEvent) => void>(() => {});
  const handleNoteOffRef = useRef<(note: number) => void>(() => {});

  useEffect(() => {
    const resolvedInput = preferredInput ?? 'auto';
    if (resolvedInput === 'touch') { setActiveInput('touch'); return; }

    let mounted = true;
    const initInput = async (): Promise<void> => {
      try {
        const manager = new InputManager({ preferred: resolvedInput });
        await manager.initialize();
        if (!mounted) { manager.dispose(); return; }
        inputManagerRef.current = manager;
        setActiveInput(manager.activeMethod);
        manager.onNoteEvent((event) => {
          if (event.type === 'noteOn') handleNoteOnRef.current(event);
          else if (event.type === 'noteOff') handleNoteOffRef.current(event.note);
        });
        await manager.start();
      } catch {
        if (mounted) setActiveInput('touch');
      }
    };
    initInput();
    return () => {
      mounted = false;
      inputManagerRef.current?.dispose();
      inputManagerRef.current = null;
    };
  }, [preferredInput]);

  // ── Note handlers ────────────────────────────────────────────────────────
  const handleNoteOn = useCallback(
    (midiNote: MidiNoteEvent) => {
      if (isPlayingBack && midiNote.inputSource === 'mic') return;

      // AUDIO FIRST
      if (isAudioReady) {
        const existingHandle = activeHandlesRef.current.get(midiNote.note);
        if (existingHandle) {
          audioEngineRef.current.releaseNote(existingHandle);
          activeHandlesRef.current.delete(midiNote.note);
        }
        const existingTimer = autoReleaseTimersRef.current.get(midiNote.note);
        if (existingTimer) clearTimeout(existingTimer);

        const handle = audioEngineRef.current.playNote(midiNote.note, midiNote.velocity / 127);
        activeHandlesRef.current.set(midiNote.note, handle);

        const timer = setTimeout(() => {
          const cur = activeHandlesRef.current.get(midiNote.note);
          if (cur === handle) {
            audioEngineRef.current.releaseNote(cur);
            activeHandlesRef.current.delete(midiNote.note);
            setHighlightedNotes((prev) => { const next = new Set(prev); next.delete(midiNote.note); return next; });
          }
          autoReleaseTimersRef.current.delete(midiNote.note);
        }, NOTE_AUTO_RELEASE_MS);
        autoReleaseTimersRef.current.set(midiNote.note, timer);
      }

      // VISUALS
      setHighlightedNotes((prev) => new Set([...prev, midiNote.note]));
      setCurrentNoteName(midiToNoteName(midiNote.note));
      setSessionNoteCount((prev) => prev + 1);

      sessionNotesRef.current.push({
        note: midiNote.note,
        timestamp: Date.now(),
        velocity: midiNote.velocity,
      });

      // Auto-analysis after silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setAnalysis(null);
      silenceTimerRef.current = setTimeout(() => {
        if (sessionNotesRef.current.length > 0) {
          const result = analyzeSession(sessionNotesRef.current);
          setAnalysis(result);
          if (result.detectedKey) {
            const voiceSummary = result.suggestedDrillType
              ? `You played in ${result.detectedKey}. Try a ${result.suggestedDrillType} drill to improve.`
              : `You played in ${result.detectedKey}. Nice session!`;
            ttsService.speak(voiceSummary, { catId: selectedCatId });
          }
        }
      }, 2000);

      if (isRecording) {
        setRecordedNotes((prev) => [
          ...prev,
          { note: midiNote.note, velocity: midiNote.velocity, timestamp: Date.now() - recordingStartRef.current },
        ]);
      }
    },
    [isAudioReady, isRecording, isPlayingBack, selectedCatId],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      setHighlightedNotes((prev) => { const next = new Set(prev); next.delete(note); return next; });
      const handle = activeHandlesRef.current.get(note);
      if (handle) { audioEngineRef.current.releaseNote(handle); activeHandlesRef.current.delete(note); }
      const timer = autoReleaseTimersRef.current.get(note);
      if (timer) { clearTimeout(timer); autoReleaseTimersRef.current.delete(note); }

      if (isRecording) {
        setRecordedNotes((prev) => {
          const notes = [...prev];
          for (let i = notes.length - 1; i >= 0; i--) {
            if (notes[i].note === note && !notes[i].releaseTimestamp) {
              notes[i] = { ...notes[i], releaseTimestamp: Date.now() - recordingStartRef.current };
              break;
            }
          }
          return notes;
        });
      }
    },
    [isRecording],
  );

  useEffect(() => { handleNoteOnRef.current = handleNoteOn; }, [handleNoteOn]);
  useEffect(() => { handleNoteOffRef.current = handleNoteOff; }, [handleNoteOff]);

  // ── Recording controls ───────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    setRecordedNotes([]);
    recordingStartRef.current = Date.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => { setIsRecording(false); }, []);

  const stopPlayback = useCallback(() => {
    playbackCancelRef.current = true;
    for (const t of playbackTimersRef.current) clearTimeout(t);
    playbackTimersRef.current.clear();
    for (const handle of playbackHandlesRef.current.values()) audioEngineRef.current.releaseNote(handle);
    playbackHandlesRef.current.clear();
    setIsPlayingBack(false);
    setHighlightedNotes(new Set());
    setCurrentNoteName('');
  }, []);

  const playRecording = useCallback(async () => {
    if (recordedNotes.length === 0) return;
    stopPlayback();
    playbackCancelRef.current = false;
    setIsPlayingBack(true);

    const baseTimestamp = recordedNotes[0].timestamp;
    const highlighted = new Set<number>();

    for (const recorded of recordedNotes) {
      if (playbackCancelRef.current) return;
      const delay = recorded.timestamp - baseTimestamp;
      await new Promise<void>((resolve) => setTimeout(resolve, delay > 0 ? delay : 0));
      if (playbackCancelRef.current) return;

      const existing = playbackHandlesRef.current.get(recorded.note);
      if (existing) { audioEngineRef.current.releaseNote(existing); playbackHandlesRef.current.delete(recorded.note); }

      if (isAudioReady) {
        const handle = audioEngineRef.current.playNote(recorded.note, recorded.velocity / 127);
        playbackHandlesRef.current.set(recorded.note, handle);
        const duration = recorded.releaseTimestamp ? recorded.releaseTimestamp - recorded.timestamp : 500;
        const timer = setTimeout(() => {
          playbackTimersRef.current.delete(timer);
          if (playbackCancelRef.current) return;
          const cur = playbackHandlesRef.current.get(recorded.note);
          if (cur === handle) { audioEngineRef.current.releaseNote(cur); playbackHandlesRef.current.delete(recorded.note); highlighted.delete(recorded.note); setHighlightedNotes(new Set(highlighted)); }
        }, duration);
        playbackTimersRef.current.add(timer);
      }

      highlighted.add(recorded.note);
      setHighlightedNotes(new Set(highlighted));
      setCurrentNoteName(midiToNoteName(recorded.note));
    }

    if (playbackCancelRef.current) return;
    const lastNote = recordedNotes[recordedNotes.length - 1];
    const lastDuration = lastNote.releaseTimestamp ? lastNote.releaseTimestamp - lastNote.timestamp : 500;
    await new Promise<void>((resolve) => { const t = setTimeout(resolve, lastDuration + 100); playbackTimersRef.current.add(t); });
    if (playbackCancelRef.current) return;
    for (const handle of playbackHandlesRef.current.values()) audioEngineRef.current.releaseNote(handle);
    playbackHandlesRef.current.clear();
    setIsPlayingBack(false);
    setHighlightedNotes(new Set());
    setCurrentNoteName('');
  }, [recordedNotes, isAudioReady, stopPlayback]);

  const clearRecording = useCallback(() => {
    stopPlayback();
    setRecordedNotes([]);
    sessionNotesRef.current = [];
    setAnalysis(null);
  }, [stopPlayback]);

  // ── Tool handlers ────────────────────────────────────────────────────────
  const handleToolToggle = useCallback((id: ToolId) => {
    setActiveToggles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Auto-open key selector when scale toggle is activated
      if (id === 'scale' && next.has('scale')) {
        setOpenWidgets((w) => w.includes('keySelector') ? w : [...w.slice(-(MAX_OPEN_WIDGETS - 1)), 'keySelector']);
      }
      return next;
    });
  }, []);

  const handleWidgetToggle = useCallback((id: ToolId) => {
    setOpenWidgets((prev) => {
      if (prev.includes(id)) return prev.filter((w) => w !== id);
      if (prev.length >= MAX_OPEN_WIDGETS) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }, []);

  const closeWidget = useCallback((id: ToolId) => {
    setOpenWidgets((prev) => prev.filter((w) => w !== id));
  }, []);

  // ── Octave shift ─────────────────────────────────────────────────────────
  const handleOctaveDown = useCallback(() => {
    setStartNote((prev) => Math.max(MIN_START_NOTE, prev - 12));
  }, []);

  const handleOctaveUp = useCallback(() => {
    setStartNote((prev) => Math.min(MAX_START_NOTE, prev + 12));
  }, []);

  const canShiftDown = effectiveStartNote > MIN_START_NOTE && !songMode;
  const canShiftUp = effectiveStartNote < MAX_START_NOTE && !songMode;
  const currentOctaveLabel = `C${Math.floor(effectiveStartNote / 12) - 1}–C${Math.floor((effectiveStartNote + effectiveOctaveCount * 12) / 12) - 1}`;

  // ── Song handlers ────────────────────────────────────────────────────────
  const handleSongSelect = useCallback(
    async (songId: string, songTitle: string) => {
      setSelectedSongTitle(songTitle);
      setShowSongPicker(false);
      setSongLoadError(null);
      await loadSong(songId);
      const loaded = useSongStore.getState().currentSong;
      if (!loaded) setSongLoadError('Could not load song. Try again later.');
    },
    [loadSong],
  );

  const closeSongMode = useCallback(() => {
    setSelectedSongTitle(null);
    setSongLoadError(null);
    setSelectedSectionIndex(0);
    setSongPlaying(false);
    setSongBeat(0);
    songBeatRef.current = 0;
    if (songTimerRef.current) {
      clearInterval(songTimerRef.current);
      songTimerRef.current = null;
    }
  }, []);

  // Song playback timer — advances songBeat at the song's tempo
  const songTempo = currentSong?.settings?.tempo ?? 120;
  const toggleSongPlayback = useCallback(() => {
    setSongPlaying((prev) => {
      if (prev) {
        // Pause
        if (songTimerRef.current) {
          clearInterval(songTimerRef.current);
          songTimerRef.current = null;
        }
        return false;
      }
      // Play
      const msPerBeat = 60000 / songTempo;
      const tickMs = 16; // ~60fps update
      const beatsPerTick = tickMs / msPerBeat;
      songTimerRef.current = setInterval(() => {
        songBeatRef.current += beatsPerTick;
        setSongBeat(songBeatRef.current);
      }, tickMs);
      return true;
    });
  }, [songTempo]);

  // Auto-start playback when song loads
  useEffect(() => {
    if (songMode && songNotes.length > 0 && !songPlaying) {
      setSongBeat(0);
      songBeatRef.current = 0;
      toggleSongPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songMode, songNotes.length]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (songTimerRef.current) clearInterval(songTimerRef.current);
    };
  }, []);

  // ── Viz area layout ──────────────────────────────────────────────────────
  const handleVizLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setVizSize({ width, height });
  }, []);

  // ── Drill navigation ────────────────────────────────────────────────────
  const handleGenerateDrill = useCallback(() => {
    if (!analysis) return;
    navigation.navigate('Exercise', {
      exerciseId: 'ai-mode',
      aiMode: true,
      freePlayContext: {
        detectedKey: analysis.detectedKey,
        suggestedDrillType: analysis.suggestedDrillType,
        weakNotes: analysis.uniqueNotes.slice(0, 6),
      },
    });
    setAnalysis(null);
  }, [analysis, navigation]);

  // ── Song MIDI range for VerticalPianoRoll ────────────────────────────────
  const songMidiMin = useMemo(() => {
    if (songNotes.length === 0) return 48;
    return Math.min(...songNotes.map((n) => n.note));
  }, [songNotes]);
  const songMidiMax = useMemo(() => {
    if (songNotes.length === 0) return 72;
    return Math.max(...songNotes.map((n) => n.note));
  }, [songNotes]);

  // ── Scale overlay notes for keyboard ───────────────
  const expectedNotes = useMemo(() => new Set<number>(), []);

  // ════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════

  // Safe area dynamic style
  const safeContainerStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  // Song loading state
  if (selectedSongTitle && !currentSong) {
    return (
      <View style={[styles.container, safeContainerStyle]} testID="play-screen">
        <GradientMeshBackground accent="exercise" />
        <View style={styles.topBar}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.backButton} testID="freeplay-back">
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
          </PressableScale>
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={1}>{selectedSongTitle}</Text>
            <Text style={styles.subtitle}>
              {isLoadingSong ? 'Loading...' : songLoadError ?? 'Song unavailable'}
            </Text>
          </View>
          <PressableScale onPress={closeSongMode}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
          </PressableScale>
        </View>
        <View style={styles.loadingCenter}>
          {isLoadingSong ? (
            <Text style={styles.loadingText}>Loading song...</Text>
          ) : (
            <PressableScale onPress={closeSongMode}>
              <Text style={styles.errorText}>{songLoadError ?? 'Could not load.'} Tap to dismiss.</Text>
            </PressableScale>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, safeContainerStyle]} testID="play-screen">
      <GradientMeshBackground accent="exercise" />
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <LinearGradient colors={[COLORS.surfaceElevated, COLORS.surface]} style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.backButton} testID="freeplay-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
        </PressableScale>

        <Text style={styles.title}>{songMode ? selectedSongTitle : 'Free Play'}</Text>

        {/* Song subtitle */}
        {songMode && currentSong && (
          <Text style={styles.songSubtitle}>
            {currentSong.metadata?.artist ?? ''} · {currentSong.settings?.tempo ?? 120} BPM
          </Text>
        )}

        {/* Active input badge */}
        {activeInput !== 'touch' && (
          <View style={styles.inputBadge} testID="freeplay-input-badge">
            <MaterialCommunityIcons
              name={activeInput === 'midi' ? 'piano' : 'microphone'}
              size={12}
              color={COLORS.success}
            />
            <Text style={styles.inputBadgeText}>{activeInput === 'midi' ? 'MIDI' : 'Mic'}</Text>
          </View>
        )}

        {/* Song pills in header */}
        {songMode && (currentSong?.sections?.length ?? 0) > 1 && (
          <SongSectionPills
            sections={currentSong?.sections ?? []}
            selectedIndex={selectedSectionIndex}
            onSelect={setSelectedSectionIndex}
          />
        )}

        <View style={styles.topBarSpacer} />

        {/* Song controls */}
        {songMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <PressableScale onPress={toggleSongPlayback} testID="song-play-pause">
              <MaterialCommunityIcons
                name={songPlaying ? 'pause-circle' : 'play-circle'}
                size={24}
                color={COLORS.primary}
              />
            </PressableScale>
            <PressableScale onPress={closeSongMode}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
            </PressableScale>
          </View>
        ) : (
          <PressableScale
            style={styles.loadSongBtn}
            onPress={() => setShowSongPicker(true)}
            testID="freeplay-load-song"
          >
            <MaterialCommunityIcons name="music-note-plus" size={16} color={COLORS.primary} />
            <Text style={styles.loadSongBtnText}>Song</Text>
          </PressableScale>
        )}

        {/* Live note display */}
        <NoteFlashDisplay
          noteName={currentNoteName}
          testID="freeplay-note-display"
          containerTestID="freeplay-note-display-container"
        />

        {/* Portrait toggle */}
        <PressableScale
          onPress={() => setIsPortrait((p) => !p)}
          scaleDown={0.9}
          soundOnPress={false}
          testID="freeplay-orientation-toggle"
        >
          <View style={styles.orientationBtn}>
            <MaterialCommunityIcons
              name={isPortrait ? 'phone-rotate-landscape' : 'phone-rotate-portrait'}
              size={16}
              color={COLORS.textSecondary}
            />
          </View>
        </PressableScale>

        {/* Session stats inline */}
        <Text style={styles.statsText}>{sessionNoteCount} notes</Text>
        {analysis?.detectedKey && (
          <Text style={styles.statsKeyText}>{analysis.detectedKey}</Text>
        )}
      </LinearGradient>
      <View style={styles.topBarGlow} />

      {/* ── Main content area ────────────────────────────────────────────── */}
      <View style={styles.mainContent}>
        {/* Tool sidebar */}
        <ToolSidebar
          activeToggles={activeToggles}
          openWidgets={openWidgets}
          onToggle={handleToolToggle}
          onWidgetToggle={handleWidgetToggle}
        />

        {/* Visualization + Keyboard column */}
        <View style={styles.vizAndKeyboard}>
          {/* Visualization area */}
          <View style={styles.vizArea} onLayout={handleVizLayout} testID="freeplay-viz-area">
            <AuroraBackground activeNoteCount={highlightedNotes.size} />

            {/* Song mode: falling notes */}
            {songMode && vizSize.width > 0 && vizSize.height > 0 && (
              <View style={StyleSheet.absoluteFill}>
                <VerticalPianoRoll
                  notes={songNotes}
                  currentBeat={songBeat}
                  tempo={songTempo}
                  containerWidth={vizSize.width}
                  containerHeight={vizSize.height}
                  midiMin={songMidiMin}
                  midiMax={songMidiMax}
                  testID="freeplay-vertical-piano-roll"
                />
              </View>
            )}

            {/* Chord display toggle */}
            {activeToggles.has('chord') && !songMode && (
              <View style={styles.chordOverlay}>
                <ChordDisplay activeNotes={highlightedNotes} testID="freeplay-chord-display" />
              </View>
            )}

            {/* Inline analysis card — appears after silence detection */}
            {analysis && !songMode && (
              <View style={styles.analysisCard} testID="freeplay-analysis-card">
                {analysis.detectedKey && (
                  <View style={styles.analysisKeyRow}>
                    <MaterialCommunityIcons name="music-clef-treble" size={14} color={COLORS.info} />
                    <Text style={styles.analysisKeyText}>Detected: {analysis.detectedKey}</Text>
                  </View>
                )}
                {analysis.summary && (
                  <Text style={styles.analysisSummary} numberOfLines={2}>{analysis.summary}</Text>
                )}
                {analysis.suggestedDrillType && (
                  <PressableScale
                    onPress={handleGenerateDrill}
                    scaleDown={0.95}
                    soundOnPress={false}
                    testID="freeplay-generate-drill"
                  >
                    <LinearGradient
                      colors={[COLORS.info, '#1565C0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.drillButton}
                    >
                      <MaterialCommunityIcons name="lightning-bolt" size={14} color={COLORS.textPrimary} />
                      <Text style={styles.drillButtonText}>Generate {analysis.suggestedDrillType} Drill</Text>
                    </LinearGradient>
                  </PressableScale>
                )}
              </View>
            )}
          </View>

          {/* Octave controls bar (above keyboard) */}
          {!songMode && (
            <View style={styles.octaveBar} testID="freeplay-octave-bar">
              <PressableScale
                onPress={handleOctaveDown}
                disabled={!canShiftDown}
                scaleDown={0.85}
                soundOnPress={false}
                testID="octave-arrow-down"
              >
                <View style={[styles.octaveBtn, !canShiftDown && styles.octaveBtnDisabled]}>
                  <MaterialCommunityIcons
                    name="chevron-up"
                    size={16}
                    color={canShiftDown ? COLORS.textPrimary : COLORS.textMuted}
                  />
                </View>
              </PressableScale>
              <Text style={styles.octaveLabelText}>{currentOctaveLabel}</Text>
              <PressableScale
                onPress={handleOctaveUp}
                disabled={!canShiftUp}
                scaleDown={0.85}
                soundOnPress={false}
                testID="octave-arrow-up"
              >
                <View style={[styles.octaveBtn, !canShiftUp && styles.octaveBtnDisabled]}>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={16}
                    color={canShiftUp ? COLORS.textPrimary : COLORS.textMuted}
                  />
                </View>
              </PressableScale>
            </View>
          )}

          {/* Keyboard */}
          <View style={styles.keyboardContainer} testID="freeplay-keyboard-container">
            <PianoKeyboard
              startNote={effectiveStartNote}
              octaveCount={effectiveOctaveCount}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              highlightedNotes={highlightedNotes}
              expectedNotes={expectedNotes}
              scaleNotes={scaleNoteSet ?? undefined}
              enabled={true}
              hapticEnabled={true}
              showLabels={true}
              scrollable={effectiveOctaveCount > 2}
              keyHeight={keyHeight}
              testID="freeplay-keyboard"
            />
          </View>
        </View>

        {/* Floating widgets */}
        {openWidgets.map((widgetId, i) => (
          <FloatingWidget
            key={widgetId}
            title={WIDGET_TITLES[widgetId] ?? widgetId}
            onClose={() => closeWidget(widgetId)}
            stackIndex={i}
            testID={`widget-${widgetId}`}
          >
            {widgetId === 'metronome' && <MetronomeWidget />}
            {widgetId === 'keySelector' && (
              <KeySelectorWidget
                selectedKey={selectedKey}
                selectedScale={selectedScale}
                onKeyChange={setSelectedKey}
                onScaleChange={setSelectedScale}
              />
            )}
            {widgetId === 'loopRecorder' && (
              <LoopRecorderWidget
                isRecording={isRecording}
                isPlaying={isPlayingBack}
                hasRecording={recordedNotes.length > 0}
                noteCount={recordedNotes.length}
                onRecord={startRecording}
                onStop={stopRecording}
                onPlay={playRecording}
                onStopPlayback={stopPlayback}
                onClear={clearRecording}
              />
            )}
            {widgetId === 'tempoTrainer' && <TempoTrainerWidget />}
            {widgetId === 'stats' && (
              <SessionStatsWidget
                noteCount={sessionNoteCount}
                analysis={analysis}
                onGenerateDrill={analysis ? handleGenerateDrill : undefined}
              />
            )}
          </FloatingWidget>
        ))}
      </View>

      {/* Song reference picker modal */}
      <SongReferencePicker
        visible={showSongPicker}
        onSelect={handleSongSelect}
        onClose={() => setShowSongPicker(false)}
      />
    </View>
  );
}

const WIDGET_TITLES: Record<string, string> = {
  metronome: 'Metronome',
  keySelector: 'Key & Scale',
  loopRecorder: 'Loop Recorder',
  tempoTrainer: 'Tempo Trainer',
  stats: 'Session Stats',
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: SPACING.sm,
    height: 44,
  },
  topBarGlow: {
    height: 2,
    backgroundColor: glowColor(COLORS.primary, 0.25),
    ...(shadowGlow(COLORS.primary, 8) as Record<string, unknown>),
  },
  backButton: {
    padding: 2,
  },
  title: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    maxWidth: 200,
  },
  titleArea: {
    flex: 1,
  },
  subtitle: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  songSubtitle: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  inputBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: glowColor(COLORS.success, 0.15),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  inputBadgeText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
  topBarSpacer: {
    flex: 1,
  },
  loadSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: glowColor(COLORS.primary, 0.08),
  },
  loadSongBtnText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
  },
  statsKeyText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.info,
    fontWeight: '600',
  },
  orientationBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Note display ─────────────────────────────────────────────────────────
  noteDisplayOuter: {},
  noteDisplay: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    minWidth: 64,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadowGlow(COLORS.primary, 6) as Record<string, unknown>),
  },
  noteText: {
    ...TYPOGRAPHY.heading.lg,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },

  // ── Section pills ────────────────────────────────────────────────────────
  sectionPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sectionPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sectionPillText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sectionPillTextSelected: {
    color: COLORS.textPrimary,
  },

  // ── Main layout ──────────────────────────────────────────────────────────
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  vizAndKeyboard: {
    flex: 1,
    flexDirection: 'column',
  },
  vizArea: {
    flex: 1,
    overflow: 'hidden',
  },
  chordOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  keyboardContainer: {
    position: 'relative',
  },

  // ── Octave bar ─────────────────────────────────────────────────────────
  octaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  octaveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  octaveBtnDisabled: {
    backgroundColor: glowColor('#666666', 0.1),
    borderColor: glowColor('#666666', 0.2),
  },
  octaveLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 48,
    textAlign: 'center',
  },

  // ── Analysis card ─────────────────────────────────────────────────────
  analysisCard: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(14, 14, 14, 0.92)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.info, 0.3),
    padding: SPACING.sm,
    gap: 6,
    zIndex: 15,
  },
  analysisKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analysisKeyText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '700',
    color: COLORS.info,
  },
  analysisSummary: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  drillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm,
  },
  drillButtonText: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── Loading / error ──────────────────────────────────────────────────────
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  errorText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.info,
  },
});
