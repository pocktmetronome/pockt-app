import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { ProViewId } from '@/constants/display';
import { TIME_SIGNATURES } from '@/constants/meter';
import { accentLabel, accentStrength, cycleBeatBlock } from '@/lib/accents';
import { proModuleRows } from '@/lib/face-geometry';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

const CELL = 96;
const GAP = 8;
const PAD = 6;
const FILL_RATIO = [0, 1 / 3, 2 / 3, 1] as const;

type Props = {
  beatIndex: number;
  playing: boolean;
  silent: boolean;
  accentPattern: AccentLevel[];
  timeSignature?: TimeSignatureId;
  pulse?: SharedValue<number>;
  pulseRole?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  view?: ProViewId;
  onChange: (pattern: AccentLevel[]) => void;
  accentColor?: string;
  secondaryColor?: string;
  strongColor?: string;
  frame?: number;
};

/** ProBeatCells from 21469e5. Wide meters wrap through proModuleRows so 12 beats stay cells. */
export function ProBeatCells({
  beatIndex,
  playing,
  silent,
  accentPattern,
  timeSignature = '4/4',
  pulse,
  pulseRole: _pulseRole,
  pulseBeat,
  view = 'all',
  onChange,
  accentColor = '#F4F6FA',
  secondaryColor = '#F4F6FA',
  strongColor = '#F4F6FA',
  frame,
}: Props) {
  const count = Math.max(1, TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? accentPattern.length ?? 4);
  const rows = proModuleRows(count);
  const perRow = Math.ceil(count / rows);
  const [rowW, setRowW] = useState(0);
  const gap = count >= 12 ? 3 : count >= 8 ? 4 : GAP;

  const cycleBeat = (index: number) => {
    const current = accentPattern[index] ?? 'normal';
    const nextLevel = cycleBeatBlock(current);
    const next = Array.from({ length: count }, (_, slot) => accentPattern[slot] ?? 'normal');
    next[index] = nextLevel;
    const strength = accentStrength(nextLevel);
    if (strength === 0) void hapticLight();
    else if (strength === 1) void hapticSelection();
    else void hapticMedium();
    onChange(next);
  };

  return (
    <View style={styles.stack} onLayout={(event) => setRowW(event.nativeEvent.layout.width)}>
      {Array.from({ length: rows }, (_, row) => {
        const indexes = Array.from({ length: perRow }, (_, col) => row * perRow + col).filter((index) => index < count);
        const fromWidth =
          rowW > 1
            ? Math.floor((rowW - PAD * 2 - gap * Math.max(0, indexes.length - 1)) / indexes.length)
            : 72;
        const fromHeight = frame ? Math.floor((frame - gap * Math.max(0, rows - 1)) / rows) : CELL;
        const cell = Math.max(32, Math.min(CELL, fromWidth, fromHeight));
        return (
          <View key={row} style={[styles.row, { height: cell, gap, paddingHorizontal: PAD }]}>
            {indexes.map((index) => {
              const level = accentPattern[index] ?? 'normal';
              const strength = accentStrength(level);
              return (
                <Cell
                  key={index}
                  index={index}
                  size={cell}
                  beatCount={count}
                  fallbackCurrent={index === beatIndex % count}
                  strength={strength}
                  pulse={pulse}
                  pulseBeat={pulseBeat}
                  playing={playing && !silent}
                  view={view}
                  accentColor={accentColor}
                  secondaryColor={secondaryColor}
                  strongColor={strongColor}
                  onPress={() => cycleBeat(index)}
                  label={`Beat ${index + 1}, ${accentLabel(level)}`}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export function ProBeatStatusBar({
  pulse,
  pulseRole,
  playing,
}: {
  pulse?: SharedValue<number>;
  pulseRole?: SharedValue<number>;
  playing: boolean;
}) {
  const flash = useAnimatedStyle(() => {
    if (!pulse || !playing) return { opacity: 0.18, backgroundColor: '#2A3038' };
    const down = (pulseRole?.value ?? 0) >= 1.5;
    const amount = pulse.value;
    if (amount < 0.12) return { opacity: 0.18, backgroundColor: '#2A3038' };
    return { opacity: amount, backgroundColor: down ? '#7EE8DE' : '#7A868F' };
  });
  return <Animated.View pointerEvents="none" style={[styles.status, flash]} />;
}

function highlightAllowed(strength: number, view: ProViewId): boolean {
  'worklet';
  if (view === 'accent') return strength >= 2.5;
  if (view === 'subaccents') return strength >= 1.5;
  return strength >= 1;
}

function Cell({
  index,
  size,
  beatCount,
  fallbackCurrent,
  strength,
  pulse,
  pulseBeat,
  playing,
  view,
  accentColor,
  secondaryColor,
  strongColor,
  onPress,
  label,
}: {
  index: number;
  size: number;
  beatCount: number;
  fallbackCurrent: boolean;
  strength: 0 | 1 | 2 | 3;
  pulse?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  playing: boolean;
  view: ProViewId;
  accentColor: string;
  secondaryColor: string;
  strongColor: string;
  onPress: () => void;
  label: string;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const current = pulseBeat ? Math.round(pulseBeat.value) % beatCount === index : fallbackCurrent;
    const amount = pulse && playing && current && highlightAllowed(strength, view) ? pulse.value : 0;
    const active = amount > 0.18;
    const hit = strength >= 2.5 ? strongColor : strength >= 1.5 ? secondaryColor : accentColor;
    return {
      opacity: active ? 1 : 0,
      backgroundColor: active ? hit : 'transparent',
    };
  });
  const lamp = ['#3A2C18', '#A68448', '#E7D3A4', '#F4E7C8'] as const;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.hit, { width: size, height: size }, pressed && styles.pressed]}>
      <View style={[styles.track, { width: size, height: size }]}>
        <View pointerEvents="none" style={styles.wellLip} />
        <View pointerEvents="none" style={styles.aperture}>
          {[3, 2, 1].map((level) => (
            <View key={level} style={styles.band}>
              <View
                style={[
                  styles.columnFill,
                  {
                    height: '100%',
                    backgroundColor: strength >= level ? lamp[level] : '#12161A',
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.activeRim, fillStyle]} />
        <Text style={styles.index} allowFontScaling={false}>
          {index + 1}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    gap: 8,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#14181C',
    borderWidth: 1,
    borderColor: '#3A3428',
    borderTopColor: '#C4B090',
    borderBottomColor: '#050403',
    paddingBottom: 5,
    paddingTop: 5,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 2 },
  },
  wellLip: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(244, 232, 210, 0.28)',
  },
  aperture: {
    width: '28%',
    height: '70%',
    justifyContent: 'space-between',
    borderRadius: 3,
    backgroundColor: '#07080A',
    borderWidth: 1,
    borderColor: '#3A3228',
    borderTopColor: '#6A5A44',
    overflow: 'hidden',
  },
  columnFill: {
    width: '100%',
  },
  lamp: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  band: {
    width: '100%',
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(42,32,20,0.45)',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  activeRim: {
    position: 'absolute',
    top: 4,
    right: 6,
    bottom: 4,
    width: 3,
    borderRadius: 2,
  },
  index: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    color: 'rgba(232,214,180,0.55)',
    fontSize: 9,
    fontWeight: '600',
  },
  levels: {
    position: 'absolute',
    bottom: 4,
    justifyContent: 'space-between',
  },
  fill: {
    borderRadius: 1,
    zIndex: 2,
  },
  status: {
    height: 4,
    borderRadius: 7,
    backgroundColor: '#2A3038',
  },
  pressed: {
    opacity: 0.86,
  },
});
