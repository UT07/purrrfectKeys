/**
 * SessionStatsWidget — Live session statistics for free play.
 *
 * Shows notes played, session duration, detected key, and a drill button.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS } from '../../theme/tokens';
import type { FreePlayAnalysis } from '../../services/FreePlayAnalyzer';

interface SessionStatsWidgetProps {
  noteCount: number;
  analysis: FreePlayAnalysis | null;
  onGenerateDrill?: () => void;
  testID?: string;
}

export function SessionStatsWidget({
  noteCount,
  analysis,
  onGenerateDrill,
  testID,
}: SessionStatsWidgetProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.container} testID={testID}>
      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{noteCount}</Text>
          <Text style={styles.statLabel}>Notes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{timeStr}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
      </View>

      {/* Detected key */}
      {analysis?.detectedKey && (
        <View style={styles.keyRow}>
          <MaterialCommunityIcons name="music-clef-treble" size={12} color={COLORS.info} />
          <Text style={styles.keyText}>{analysis.detectedKey}</Text>
        </View>
      )}

      {/* Summary */}
      {analysis?.summary && (
        <Text style={styles.summary} numberOfLines={2}>
          {analysis.summary}
        </Text>
      )}

      {/* Generate Drill CTA */}
      {analysis && onGenerateDrill && (
        <PressableScale
          onPress={onGenerateDrill}
          scaleDown={0.95}
          soundOnPress={false}
          style={styles.drillBtn}
        >
          <LinearGradient
            colors={[COLORS.info, '#1565C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.drillGradient}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={12} color={COLORS.textPrimary} />
            <Text style={styles.drillText}>Generate Drill</Text>
          </LinearGradient>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  statLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.info,
    fontWeight: '700',
  },
  summary: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  drillBtn: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  drillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  drillText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
