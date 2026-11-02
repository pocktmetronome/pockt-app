import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { RIG_MAX_BPM, RIG_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { rotaryDetent } from '@/lib/rotary-feedback';
import {
  clampRollerBpm,
  ROLLER_MAJOR_EVERY,
  ROLLER_MID_EVERY,
  ROLLER_PX_PER_BPM,
  rollerLabelForMark,
  rollerValuesAreFinite,
  rollerWindow,
} from '@/lib/tempo-roller-math';

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  audio?: boolean;
  haptic?: boolean;
};

let loggedBadRoller = false;

function warnBadRoller(liveBpm: number, wellWidth: number) {
  if (loggedBadRoller || rollerValuesAreFinite(liveBpm, wellWidth)) return;
  loggedBadRoller = true;
  console.warn('[POCKT][console-roller] non-finite transform', liveBpm, wellWidth);
}

export function TempoRoller({ bpm, onChange, audio = true, haptic = true }: Props) {
  const safeBpm = sanitizeBpm(bpm, bpm, RIG_MIN_BPM, RIG_MAX_BPM);
  const live = useSharedValue(safeBpm);
  const origin = useSharedValue(safeBpm);
  const dragging = useSharedValue(0);
  const wellW = useSharedValue(280);
  const bpmRef = useRef(safeBpm);
  const onChangeRef = useRef(onChange);
  const audioRef = useRef(audio);
  const hapticRef = useRef(haptic);
  bpmRef.current = safeBpm;
  onChangeRef.current = onChange;
  audioRef.current = audio;
  hapticRef.current = haptic;

  useEffect(() => {
    if (dragging.value > 0.5) return;
    if (!Number.isFinite(safeBpm)) return;
    live.value = safeBpm;
  }, [dragging, live, safeBpm]);

  const commitUser = useCallback((next: number) => {
    const safe = clampRollerBpm(sanitizeBpm(next, bpmRef.current, RIG_MIN_BPM, RIG_MAX_BPM));
    if (!Number.isFinite(safe)) return;
    if (safe === clampRollerBpm(bpmRef.current)) return;
    onChangeRef.current(safe);
  }, []);

  const emitDetent = useCallback(() => {
    rotaryDetent('roller', audioRef.current, hapticRef.current);
  }, []);

  useAnimatedReaction(
    () => Math.round(live.value),
    (value, previous) => {
      if (previous == null || value === previous) return;
      if (dragging.value < 0.5) return;
      if (!Number.isFinite(value)) return;
      runOnJS(commitUser)(value);
      runOnJS(emitDetent)();
    }
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .activeOffsetX([-4, 4])
        .failOffsetY([-32, 32])
        .onBegin(() => {
          cancelAnimation(live);
          dragging.value = 1;
          origin.value = Number.isFinite(live.value) ? live.value : RIG_MIN_BPM;
        })
        .onUpdate((event) => {
          const raw = origin.value - event.translationX / ROLLER_PX_PER_BPM;
          const next = Math.min(RIG_MAX_BPM, Math.max(RIG_MIN_BPM, raw));
          live.value = Number.isFinite(next) ? next : origin.value;
        })
        .onFinalize(() => {
          const raw = Number.isFinite(live.value) ? live.value : origin.value;
          const next = Math.min(RIG_MAX_BPM, Math.max(RIG_MIN_BPM, Math.round(raw)));
          live.value = next;
          dragging.value = 0;
          runOnJS(commitUser)(next);
        }),
    [commitUser, dragging, live, origin]
  );

  const marks = useMemo(() => rollerWindow(safeBpm, 56), [safeBpm]);
  const stripStyle = useAnimatedStyle(() => {
    const x = Number.isFinite(live.value) && Number.isFinite(wellW.value)
      ? wellW.value / 2 - live.value * ROLLER_PX_PER_BPM
      : 0;
    return {
      transform: [{ translateX: x }],
    };
  });

  useEffect(() => {
    warnBadRoller(safeBpm, 280);
  }, [safeBpm]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.housing} accessibilityLabel="Tempo roller" accessibilityRole="adjustable">
        <LinearGradient
          pointerEvents="none"
          colors={['#3A4048', '#16181C', '#07080A', '#1A1E24']}
          locations={[0, 0.18, 0.82, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View pointerEvents="none" style={styles.bevel} />
        <View
          pointerEvents="none"
          style={styles.well}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            wellW.value = Number.isFinite(width) && width > 0 ? width : 280;
          }}>
          <LinearGradient
            colors={['#1C2228', '#0B0D10', '#15181C']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.knurl} />
          <Animated.View style={[styles.strip, stripStyle]}>
            {marks.map((mark) => {
              const major = mark % ROLLER_MAJOR_EVERY === 0;
              const mid = mark % ROLLER_MID_EVERY === 0;
              const label = rollerLabelForMark(mark);
              return (
                <View key={mark} style={[styles.mark, { left: mark * ROLLER_PX_PER_BPM }]}>
                  <View style={[styles.tick, major ? styles.tickMajor : mid ? styles.tickMid : styles.tickMinor]} />
                  {label != null ? <Text style={styles.caption}>{label}</Text> : null}
                </View>
              );
            })}
          </Animated.View>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.72)', 'transparent', 'transparent', 'rgba(0,0,0,0.72)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'transparent', 'rgba(0,0,0,0.55)']}
            style={styles.cylinder}
          />
        </View>
        <View pointerEvents="none" style={styles.indexGlow} />
        <View pointerEvents="none" style={styles.notch} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  housing: {
    flex: 1,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.08)',
    borderRightColor: 'rgba(0,0,0,0.7)',
    borderBottomColor: 'rgba(0,0,0,0.85)',
    backgroundColor: '#0A0C0E',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  bevel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  well: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: 8,
    marginVertical: 10,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#08090B',
  },
  knurl: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    borderTopWidth: 28,
    borderBottomWidth: 28,
    borderColor: 'rgba(210,218,226,0.08)',
  },
  strip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  mark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    marginLeft: -20,
    alignItems: 'center',
    overflow: 'visible',
  },
  tick: {
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(190,198,206,0.42)',
    marginTop: 8,
  },
  tickMinor: {
    height: 12,
  },
  tickMid: {
    height: 20,
    width: 2,
    backgroundColor: 'rgba(214,222,230,0.7)',
  },
  tickMajor: {
    height: 30,
    width: 2.5,
    backgroundColor: 'rgba(236,242,248,0.95)',
  },
  caption: {
    marginTop: 4,
    minWidth: 32,
    color: 'rgba(226,234,242,0.82)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  cylinder: {
    ...StyleSheet.absoluteFillObject,
  },
  indexGlow: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: '50%',
    marginLeft: -10,
    width: 20,
    backgroundColor: 'rgba(61,232,240,0.08)',
  },
  notch: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#3DE8F0',
    shadowColor: '#3DE8F0',
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
