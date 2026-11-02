import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { hapticDialTick } from '@/lib/haptics';

const SPACING = 14;
const WINDOW = 22;

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  accentColor?: string;
  invert?: boolean;
};

export function TempoRuler({ bpm, onChange, accentColor = '#F4F6FA', invert = false }: Props) {
  const { width } = useWindowDimensions();
  const safeBpm = sanitizeBpm(bpm);
  const liveBpm = useSharedValue(safeBpm);
  const originBpm = useSharedValue(safeBpm);
  liveBpm.value = safeBpm;

  useEffect(() => {
    liveBpm.value = safeBpm;
  }, [liveBpm, safeBpm]);

  const commit = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm);
      if (safe === safeBpm) return;
      hapticDialTick();
      onChange(safe);
    },
    [onChange, safeBpm]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .onBegin(() => {
          originBpm.value = liveBpm.value;
        })
        .onUpdate((event) => {
          const raw = originBpm.value - (invert ? -event.translationX : event.translationX) / SPACING;
          const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, raw));
          liveBpm.value = clamped;
          const next = Math.round(clamped);
          runOnJS(commit)(next);
        }),
    [commit, invert, liveBpm, originBpm]
  );

  const start = Math.max(MIN_BPM, safeBpm - WINDOW);
  const end = Math.min(MAX_BPM, safeBpm + WINDOW);
  const marks: number[] = [];
  for (let n = start; n <= end; n += 1) marks.push(n);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width / 2 - liveBpm.value * SPACING }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.ruler} accessibilityLabel="Tempo ruler">
        <View style={styles.well}>
          <Animated.View style={[styles.strip, stripStyle]}>
            {marks.map((mark) => {
              const dist = Math.abs(mark - safeBpm);
              const proximity = Math.max(0, 1 - dist / 12);
              const mid = mark % 5 === 0;
              const major = mark % 10 === 0;
              return (
                <View key={mark} style={[styles.mark, { left: mark * SPACING }]}>
                  <View
                    style={[
                      styles.tick,
                      mid && styles.tickMajor,
                      major && styles.tickCenter,
                      {
                        height: (major ? 10 : mid ? 8 : 5) + proximity * 12,
                        opacity: 0.1 + proximity * 0.9,
                        transform: [
                          { scaleX: 0.55 + proximity * 0.7 },
                          { scaleY: 0.62 + proximity * 0.55 },
                          { rotateX: `${(1 - proximity) * 18}deg` },
                        ],
                      },
                    ]}
                  />
                </View>
              );
            })}
          </Animated.View>
          <View pointerEvents="none" style={[styles.centerHair, { backgroundColor: accentColor }]} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(3,4,5,0.98)', 'rgba(3,4,5,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fadeLeft}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(3,4,5,0)', 'rgba(3,4,5,0.98)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fadeRight}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.55)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.62)']}
            locations={[0, 0.48, 1]}
            style={styles.barrelShade}
          />
          <View pointerEvents="none" style={styles.barrel} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  ruler: {
    minHeight: 42,
    width: '100%',
  },
  well: {
    height: 38,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#030405',
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.07)',
  },
  strip: {
    ...StyleSheet.absoluteFillObject,
  },
  mark: {
    position: 'absolute',
    top: 6,
    width: SPACING,
    alignItems: 'center',
  },
  tick: {
    width: StyleSheet.hairlineWidth,
    height: 8,
    backgroundColor: 'rgba(220,228,236,0.22)',
  },
  tickMajor: {
    height: 14,
    backgroundColor: 'rgba(244,246,250,0.55)',
  },
  tickCenter: {
    width: 1.5,
    backgroundColor: 'rgba(244,246,250,0.82)',
  },
  markText: {
    marginTop: 4,
    color: 'rgba(220,228,238,0.7)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  centerHair: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: '50%',
    width: 2.5,
    marginLeft: -1.25,
    borderRadius: 1.5,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 72,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
  },
  barrelShade: {
    ...StyleSheet.absoluteFillObject,
  },
  barrel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.07)',
  },
  markTextOn: {
    color: '#F4F6FA',
    fontWeight: '800',
  },
});
