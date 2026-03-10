/**
 * ToolSidebar — Slim vertical icon strip for free play tools.
 *
 * Two tool types:
 * - Toggle tools (chord display, scale overlay): one tap on/off
 * - Widget tools (metronome, etc.): opens floating card
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PressableScale } from '../common/PressableScale';
import { COLORS, glowColor, shadowGlow } from '../../theme/tokens';

export type ToolId =
  | 'chord'
  | 'scale'
  | 'metronome'
  | 'keySelector'
  | 'loopRecorder'
  | 'tempoTrainer'
  | 'stats';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ToolConfig {
  id: ToolId;
  icon: IconName;
  type: 'toggle' | 'widget';
}

const TOOLS: ToolConfig[] = [
  { id: 'chord', icon: 'music-clef-treble', type: 'toggle' },
  { id: 'scale', icon: 'piano', type: 'toggle' },
  { id: 'metronome', icon: 'metronome', type: 'widget' },
  { id: 'keySelector', icon: 'key-variant', type: 'widget' },
  { id: 'loopRecorder', icon: 'repeat', type: 'widget' },
  { id: 'tempoTrainer', icon: 'speedometer', type: 'widget' },
  { id: 'stats', icon: 'chart-bar', type: 'widget' },
];

interface ToolSidebarProps {
  activeToggles: Set<ToolId>;
  openWidgets: ToolId[];
  onToggle: (id: ToolId) => void;
  onWidgetToggle: (id: ToolId) => void;
}

// Pre-compute glow colors outside worklet (JS-only functions can't run on UI thread)
const GLOW_BG = glowColor(COLORS.primary, 0.25);
const GLOW_BORDER = glowColor(COLORS.primary, 0.5);

function ToolButton({
  tool,
  isActive,
  onPress,
}: {
  tool: ToolConfig;
  isActive: boolean;
  onPress: () => void;
}): React.ReactElement {
  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      isActive ? GLOW_BG : 'transparent',
      { duration: 150 },
    ),
    borderColor: withTiming(
      isActive ? GLOW_BORDER : 'transparent',
      { duration: 150 },
    ),
  }), [isActive]);

  return (
    <PressableScale
      onPress={onPress}
      scaleDown={0.85}
      soundOnPress={false}
      testID={`tool-${tool.id}`}
    >
      <Animated.View style={[styles.toolButton, glowStyle]}>
        <MaterialCommunityIcons
          name={tool.icon}
          size={20}
          color={isActive ? COLORS.primary : COLORS.textMuted}
        />
      </Animated.View>
    </PressableScale>
  );
}

export function ToolSidebar({
  activeToggles,
  openWidgets,
  onToggle,
  onWidgetToggle,
}: ToolSidebarProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {TOOLS.map((tool) => {
        const isActive =
          tool.type === 'toggle'
            ? activeToggles.has(tool.id)
            : openWidgets.includes(tool.id);

        return (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={isActive}
            onPress={() =>
              tool.type === 'toggle'
                ? onToggle(tool.id)
                : onWidgetToggle(tool.id)
            }
          />
        );
      })}
    </View>
  );
}

const SIDEBAR_WIDTH = 44;

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    backgroundColor: 'rgba(14, 14, 14, 0.85)',
    borderRightWidth: 1,
    borderRightColor: glowColor(COLORS.primary, 0.15),
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
    ...(shadowGlow(COLORS.primary, 4) as Record<string, unknown>),
  },
  toolButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
