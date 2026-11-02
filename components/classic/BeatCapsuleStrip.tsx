import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { TIME_SIGNATURES } from '@/constants/meter';
import { BEATLINE_REST_FILL } from '@/constants/display';
import { accentLabel, accentStrength, cycleBeatBlock, levelTint } from '@/lib/accents';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

const BEAT_RAIL = require('@/assets/pass5-hardware/beat-rail.png');

/**
 * Shared 0/1/2/3 geometry. Heights grow from center. Width stays fat.
 * 0 outline only · 1 same oval filled · 2 medium pill · 3 tallest pill.
 */
const STATE_HEIGHT = [0.24, 0.24, 0.6, 1] as const;
const INSTRUMENT_HEIGHT = [0.62, 0.7, 0.86, 1] as const;
const STATE_WIDTH = [0.98, 0.98, 0.96, 0.98] as const;

type Tone = { mute?: string; normal?: string; secondary?: string; strong?: string; active?: string };

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent: boolean;
  accentPattern: AccentLevel[];
  onChange: (pattern: AccentLevel[]) => void;
  pulse?: SharedValue<number>;
  pulseAccent?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  compact?: boolean;
  accentColor?: string;
  upbeatColor?: string;
  tone?: Tone;
  shape?: 'capsule' | 'box';
  wrap?: boolean;
  frame?: number;
  presence?: 'instrument';
};

export function BeatCapsuleStrip({
  timeSignature,
  beatIndex,
  playing,
  silent,
  accentPattern,
  onChange,
  pulse,
  pulseAccent,
  pulseBeat,
  compact = false,
  accentColor,
  upbeatColor,
  tone,
  shape = 'capsule',
  wrap = false,
  frame,
  presence,
}: Props) {
  const count = TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? 4;
  const boxed = shape === 'box';
  const rows = wrap ? (count <= 8 ? 1 : 2) : 1;
  const height = frame ? Math.max(36, Math.floor((frame - (rows - 1) * 8) / rows)) : boxed ? (compact ? 52 : 64) : compact ? 74 : 96;
  const baseWidth = boxed ? (compact ? 46 : 54) : compact ? 34 : 42;
  const palette: Tone = {
    mute: 'transparent',
    normal: tone?.normal ?? accentColor ?? '#F4F6FA',
    secondary: tone?.secondary ?? upbeatColor ?? accentColor ?? '#F4F6FA',
    strong: tone?.strong ?? '#F4F6FA',
    active: tone?.active ?? accentColor ?? '#F4F6FA',
  };
  const [rowW, setRowW] = useState(0);
  const gap = count >= 12 ? 2 : count >= 8 ? 3 : count >= 6 ? 4 : 6;
  const per = Math.max(1, Math.ceil(count / rows));
    const cellW =
    rowW > 1
      ? Math.max(count >= 12 ? 26 : 22, Math.min(wrap ? 86 : baseWidth, Math.floor((rowW - gap * (per - 1) - 8) / per)))
      : baseWidth;

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
    <View
      style={{ width: '100%', gap: 8 }}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 1 && Math.abs(next - rowW) > 0.5) setRowW(next);
      }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={[styles.row, presence === 'instrument' ? styles.railBody : styles.seat, { minHeight: presence === 'instrument' ? Math.max(height, 44) : height, gap, justifyContent: 'center' }]}>
          {presence === 'instrument' ? (
            <Image source={BEAT_RAIL} resizeMode="stretch" style={styles.railPlate} />
          ) : (
            <View pointerEvents="none" style={styles.groove} />
          )}
          {Array.from({ length: per }, (_, col) => row * per + col)
            .filter((index) => index < count)
            .map((index) => {
              const level = accentPattern[index] ?? 'normal';
              const strength = accentStrength(level);
              return (
                <MeterCell
                  key={`${timeSignature}-${index}`}
                  index={index}
                  fallbackCurrent={index === beatIndex % Math.max(1, count)}
                  strength={strength}
                  pulse={pulse}
                  pulseAccent={pulseAccent}
                  pulseBeat={pulseBeat}
                  beatCount={count}
                  playing={playing && !silent}
                  height={height}
                  width={cellW}
                  boxed={boxed}
                  palette={palette}
                  presence={presence}
                  onPress={() => cycleBeat(index)}
                  label={`Beat ${index + 1}, ${accentLabel(level)}`}
                />
              );
            })}
        </View>
      ))}
    </View>
  );
}

function MeterCell({
  index,
  fallbackCurrent,
  strength,
  pulse,
  pulseAccent,
  pulseBeat,
  beatCount,
  playing,
  height,
  width,
  boxed,
  palette,
  presence,
  onPress,
  label,
}: {
  index: number;
  fallbackCurrent: boolean;
  strength: 0 | 1 | 2 | 3;
  pulse?: SharedValue<number>;
  pulseAccent?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  beatCount: number;
  playing: boolean;
  height: number;
  width: number;
  boxed: boolean;
  palette: Tone;
  presence?: 'instrument';
  onPress: () => void;
  label: string;
}) {
  const levelSv = useSharedValue(strength);
  useEffect(() => {
    if (strength === 0) {
      levelSv.value = 0;
      return;
    }
    const duration = strength === 1 ? 90 : 180;
    levelSv.value = withTiming(strength, { duration, easing: Easing.inOut(Easing.quad) });
  }, [levelSv, strength]);

  const lens = presence === 'instrument';
  const sizeStyle = useAnimatedStyle(() => {
    const t = strength === 0 ? 0 : Math.min(3, Math.max(1, levelSv.value));
    const lo = Math.floor(t);
    const hi = Math.min(3, lo + 1);
    const frac = t - lo;
    const heights = presence === 'instrument' ? INSTRUMENT_HEIGHT : STATE_HEIGHT;
    const hRatio = heights[lo] + (heights[hi] - heights[lo]) * frac;
    const wRatio = STATE_WIDTH[lo] + (STATE_WIDTH[hi] - STATE_WIDTH[lo]) * frac;
    const floor = presence === 'instrument' ? INSTRUMENT_HEIGHT[0] : STATE_HEIGHT[0];
    const h = Math.max(10, height * (strength === 0 ? floor : hRatio));
    const w = Math.max(16, width * (strength === 0 ? STATE_WIDTH[0] : wRatio));
    const count = Math.max(1, beatCount);
    const current = pulseBeat ? Math.round(pulseBeat.value) % count === index : fallbackCurrent;
    const energy = pulse && playing && current ? pulse.value : 0;
    const lift = 1 + (index === 0 ? 0.08 : 0) + energy * 0.34;
    const grown = h * lift;
    const strong = hRatio > 0.85;
    const bodyH = strong ? Math.min(height * 0.86, grown) : Math.min(grown, Math.max(18, width * 0.42));
    const bodyW = strong ? Math.max(width * 0.72, bodyH * 0.62) : Math.max(width * 0.92, bodyH * 1.7);
    const nodeRadius = Math.max(12, Math.round(Math.min(bodyW, bodyH) * 0.5));
    return lens
      ? { height: Math.max(28, height * (0.58 + hRatio * 0.2)), width: Math.max(20, width * 0.82), borderRadius: 0 }
      : {
          height: bodyH,
          width: bodyW * (1 + energy * 0.04),
          borderRadius: nodeRadius,
          borderColor: energy > 0.18 ? '#7EE8DE' : 'rgba(200, 192, 176, 0.7)',
        };
  });

  const fillStyle = useAnimatedStyle(() => {
    const count = Math.max(1, beatCount);
    const current = pulseBeat ? Math.round(pulseBeat.value) % count === index : fallbackCurrent;
    const amount = pulse && playing && current ? pulse.value : 0;
    const flash = amount > 0.18;
    const colors = {
      mute: 'transparent',
      normal: palette.normal ?? '#F4F6FA',
      secondary: palette.secondary ?? '#F4F6FA',
      strong: palette.strong ?? '#F4F6FA',
    };
    const flashColor = levelTint(pulseAccent?.value ?? levelSv.value, colors);
    const appear = strength === 0 ? 0 : strength === 1 ? Math.min(1, Math.max(0, levelSv.value)) : 1;
    return {
      backgroundColor:
        strength === 0
          ? 'transparent'
          : flash
            ? flashColor
            : strength === 3
              ? (palette.strong ?? '#E7D3A4')
              : strength === 2
                ? (palette.secondary ?? '#8A7048')
                : strength === 1
                  ? '#3A342C'
                  : BEATLINE_REST_FILL,
      opacity: appear,
    };
  });

  const radius = boxed ? 12 : Math.max(10, Math.round(height * 0.12));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.hit,
        { height: height + 8, width: width + 4 },
        pressed && styles.pressed,
      ]}>
      <Animated.View
        style={[
          styles.shell,
          { borderRadius: radius },
          sizeStyle,
          strength === 0 ? styles.outline : styles.filledShell,
          presence === 'instrument' ? styles.instrumentShell : null,
          presence === 'instrument' && strength === 0 ? styles.instrumentOutline : null,
        ]}>
        {presence === 'instrument' ? <View pointerEvents="none" style={styles.well} /> : null}
        {presence === 'instrument' ? <View pointerEvents="none" style={styles.wellLip} /> : null}
        {presence === 'instrument' ? <View pointerEvents="none" style={styles.wellFloor} /> : null}
        {strength === 0 ? null : presence === 'instrument' ? (
          <Animated.View pointerEvents="none" style={[styles.slit, fillStyle]} />
        ) : (
          <Animated.View pointerEvents="none" style={[styles.fill, { borderRadius: radius }, fillStyle]} />
        )}
        {presence === 'instrument' ? null : <View pointerEvents="none" style={styles.nodeSheen} />}
        {presence === 'instrument' ? null : <View pointerEvents="none" style={styles.nodeShade} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  railPlate: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    bottom: 2,
  },
  groove: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 14,
    bottom: 8,
    borderRadius: 7,
    backgroundColor: '#050607',
    borderTopWidth: 1,
    borderTopColor: '#6A7076',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  seat: {
    alignItems: 'flex-end',
    backgroundColor: '#14181C',
    borderRadius: 16,
    borderTopColor: '#8A9096',
    borderBottomColor: '#000',
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 2,
    flexWrap: 'nowrap',
    backgroundColor: '#0C1014',
    borderRadius: 4,
    borderWidth: 1,
    borderTopColor: '#050608',
    borderBottomColor: '#3A4248',
    minHeight: 46,
  },
  railBody: {
    backgroundColor: '#23282C',
    borderRadius: 2,
    borderTopColor: '#6A737A',
    borderBottomColor: '#050608',
    borderLeftColor: '#3A4248',
    borderRightColor: '#101416',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  shell: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  instrumentShell: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.75,
    borderColor: '#F4F6FA',
  },
  instrumentOutline: {
    borderWidth: 0,
  },
  well: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#07080A',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#2A3136',
    borderRightColor: '#050608',
  },
  wellLip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: '#5C666E',
  },
  wellFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: '#050608',
  },
  slit: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 5,
    height: 3,
    borderRadius: 0,
  },
  filledShell: {
    borderWidth: 1,
    borderColor: 'rgba(212,176,120,0.55)',
    borderTopColor: 'rgba(244,228,196,0.7)',
    borderBottomColor: '#1A140C',
    backgroundColor: 'transparent',
  },
  fill: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 5,
    bottom: 5,
  },
  aperture: {
    left: 7,
    right: 7,
    top: 8,
    bottom: 8,
  },
  nodeSheen: {
    position: 'absolute',
    top: 2,
    left: 3,
    right: 3,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,248,236,0.28)',
  },
  nodeShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  pressed: {
    opacity: 0.86,
  },
});
