/**
 * DebugLogScreen — On-device log viewer for testing without USB.
 *
 * Shows real-time logs from all subsystems (Audio, MIDI, Mic, Scoring, etc.)
 * with tag filtering, color-coded severity, and auto-scroll.
 *
 * Access: Profile → triple-tap version number → DebugLog
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PressableScale } from '../components/common/PressableScale';
import { DeviceLog, type LogEntry } from '../utils/DeviceLog';
import { COLORS, glowColor } from '../theme/tokens';

// Known subsystem tags for quick filtering
const FILTER_TAGS = [
  'All',
  'MicrophoneInput',
  'NoteTracker',
  'AudioCapture',
  'WebAudioEngine',
  'ExpoAudioEngine',
  'MidiInput',
  'InputManager',
  'ExerciseValidator',
  'TTSService',
  'SyncService',
] as const;

type FilterTag = (typeof FILTER_TAGS)[number];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  log: '#BBBBBB',
  warn: '#FFD54F',
  error: '#FF5252',
};

const LogEntryRow = React.memo(({ item }: { item: LogEntry }) => (
  <View style={styles.logRow}>
    <Text style={[styles.logTime, { color: LEVEL_COLORS[item.level] }]}>
      {formatTime(item.timestamp)}
    </Text>
    <Text
      style={[styles.logMessage, { color: LEVEL_COLORS[item.level] }]}
      numberOfLines={3}
    >
      {item.message}
    </Text>
  </View>
));
LogEntryRow.displayName = 'LogEntryRow';

export function DebugLogScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>(() => DeviceLog.getLogs());
  const [filter, setFilter] = useState<FilterTag>('All');
  const [autoScroll, setAutoScroll] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = DeviceLog.subscribe(() => {
      setLogs(DeviceLog.getLogs());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll && filteredLogs.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  });

  const filteredLogs =
    filter === 'All' ? logs : logs.filter((e) => e.tag === filter);

  const handleClear = useCallback(() => {
    DeviceLog.clear();
    setLogs([]);
  }, []);

  const handleShare = useCallback(async () => {
    const text = filteredLogs
      .map(
        (e) =>
          `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] ${e.message}`
      )
      .join('\n');
    await Share.share({ message: text, title: 'Purrrfect Keys Debug Log' });
  }, [filteredLogs]);

  const renderItem = useCallback(
    ({ item }: { item: LogEntry }) => <LogEntryRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: LogEntry) => String(item.id), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} soundOnPress={false}>
          <Text style={styles.backButton}>← Back</Text>
        </PressableScale>
        <Text style={styles.title}>Debug Log</Text>
        <View style={styles.headerActions}>
          <PressableScale onPress={handleShare} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Share</Text>
          </PressableScale>
          <PressableScale onPress={handleClear} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#FF5252' }]}>
              Clear
            </Text>
          </PressableScale>
        </View>
      </View>

      {/* Filter tags */}
      <FlatList
        horizontal
        data={FILTER_TAGS as unknown as FilterTag[]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => setFilter(item)}
            style={[
              styles.filterTag,
              filter === item && styles.filterTagActive,
            ]}
          >
            <Text
              style={[
                styles.filterTagText,
                filter === item && styles.filterTagTextActive,
              ]}
            >
              {item}
            </Text>
          </PressableScale>
        )}
        style={styles.filterBar}
        showsHorizontalScrollIndicator={false}
      />

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredLogs.length} entries
          {filter !== 'All' ? ` (${filter})` : ''}
          {' | '}
          {logs.filter((e) => e.level === 'error').length} errors
          {' | '}
          {logs.filter((e) => e.level === 'warn').length} warnings
        </Text>
        <PressableScale onPress={() => setAutoScroll(!autoScroll)}>
          <Text
            style={[
              styles.statsText,
              { color: autoScroll ? '#69F0AE' : '#777' },
            ]}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Text>
        </PressableScale>
      </View>

      {/* Log entries */}
      <FlatList
        ref={flatListRef}
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.logList}
        initialNumToRender={30}
        maxToRenderPerBatch={20}
        windowSize={10}
        onScrollBeginDrag={() => setAutoScroll(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: glowColor(COLORS.textPrimary, 0.1),
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterBar: {
    maxHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: glowColor(COLORS.textPrimary, 0.05),
  },
  filterTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 3,
    backgroundColor: glowColor(COLORS.textPrimary, 0.08),
  },
  filterTagActive: {
    backgroundColor: COLORS.primary,
  },
  filterTagText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTagTextActive: {
    color: '#FFF',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: glowColor(COLORS.textPrimary, 0.03),
  },
  statsText: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Courier',
  },
  logList: {
    flex: 1,
  },
  logRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glowColor(COLORS.textPrimary, 0.04),
  },
  logTime: {
    width: 85,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '500',
  },
  logMessage: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
});
