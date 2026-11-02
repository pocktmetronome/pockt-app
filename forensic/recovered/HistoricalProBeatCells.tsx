import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useState } from 'react';

import { accentLabel, accentStrength, cycleBeatBlock } from '@/lib/accents';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import { TIME_SIGNATURES } from '@/constants/meter';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';
import type { ProViewId } from '@/constants/display';
import { PRO_REST_FILL } from '@/constants/display';

const CELL = 84;
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
};

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
}: Props) {
  const count = Math.max(1, TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? accentPattern.length ?? 4);
  const [rowW, setRowW] = useState(0);
  const gap = count >= 12 ? 3 : count >= 8 ? 4 : GAP;
  const cell =
    rowW > 1
      ? Math.max(26, Math.min(CELL, Math.floor((rowW - PAD * 2 - gap * Math.max(0, count - 1)) / count)))
      : Math.min(CELL, 64);

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
      <View style={[styles.row, { height: cell, gap, paddingHorizontal: PAD }]}>
        {Array.from({ length: count }, (_, index) => {
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
    if (!pulse || !playing) {
      return { opacity: 0.18, backgroundColor: '#2A3038' };
    }
    const down = (pulseRole?.value ?? 0) >= 1.5;
    const amount = pulse.value;
    if (amount < 0.12) {
      return { opacity: 0.18, backgroundColor: '#2A3038' };
    }
    return {
      opacity: amount,
      backgroundColor: down ? '#3DDC84' : '#E23B3B',
    };
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
  const inset = 4;
  const inner = Math.max(8, size - inset * 2);
  const band = inner / 3;
  const fillH = inner * FILL_RATIO[strength];

  const fillStyle = useAnimatedStyle(() => {
    const current = pulseBeat ? Math.round(pulseBeat.value) % beatCount === index : fallbackCurrent;
    const amount = pulse && playing && current && highlightAllowed(strength, view) ? pulse.value : 0;
    const active = amount > 0.18;
    const hit = strength >= 2.5 ? strongColor : strength >= 1.5 ? secondaryColor : accentColor;
    return {
      height: fillH,
      backgroundColor: active ? hit : PRO_REST_FILL,
      opacity: strength === 0 ? 0 : 1,
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.hit, { width: size, height: size }, pressed && styles.pressed]}>
      <View style={[styles.track, { width: size, height: size }]}>
        <View pointerEvents="none" style={[styles.levels, { width: inner, height: inner }]}>
          <View style={[styles.band, { height: band }]} />
          <View style={[styles.band, { height: band }]} />
          <View style={[styles.band, { height: band }]} />
        </View>
        <Animated.View pointerEvents="none" style={[styles.fill, { width: inner }, fillStyle]} />
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
    borderRadius: 4,
    backgroundColor: 'rgba(18,22,28,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(196,90,86,0.55)',
    paddingBottom: 4,
    paddingTop: 4,
  },
  levels: {
    position: 'absolute',
    bottom: 4,
    justifyContent: 'space-between',
  },
  band: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(196,90,86,0.42)',
    backgroundColor: 'transparent',
  },
  fill: {
    borderRadius: 1,
    zIndex: 2,
  },
  status: {
    height: 26,
    borderRadius: 7,
    backgroundColor: '#2A3038',
  },
  pressed: {
    opacity: 0.86,
  },
});
