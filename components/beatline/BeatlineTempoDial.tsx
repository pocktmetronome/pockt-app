import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BeatlinePart, BeatlineRotatingPart } from '@/components/beatline/BeatlinePart';
import { RIG_MAX_BPM, RIG_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { beatlineFlushPending } from '@/lib/beatline-2';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import { PULSE_NATIVE_FLUSH_MS, pulseDetentDue, pulseFlushDue, pulseShouldCommitStep } from '@/lib/pulse-commit';
import {
  BEATLINE_DETENT_MIN_GAP_MS,
  BEATLINE_DIAL_SEAT,
  BEATLINE_DIAL_SETTLE_MS,
  BEATLINE_PRESS_DOWN_MS,
  BEATLINE_PRESS_UP_MS,
  beatlineDialApply,
  beatlineDialPointerInRing,
  beatlineDialResistDeg,
  beatlineDialSeatDeg,
} from '@/lib/beatline-feel';
import { DEG_PER_BPM, pointerAngle, wrapDelta } from '@/lib/pro-dial';
import { rotaryDetent } from '@/lib/rotary-feedback';

type Props = {
  bpm: number;
  size: number;
  onBpm: (next: number) => void;
  onLiveBpm?: (next: number) => void;
  onDragChange?: (dragging: boolean) => void;
  audioDetent: boolean;
  hapticDetent: boolean;
  invert?: boolean;
  skin?: 'parts' | 'ghost';
};

export type BeatlineTempoDialHandle = {
  flush: () => void;
  seat: (bpm: number) => void;
};

export const BeatlineTempoDial = forwardRef<BeatlineTempoDialHandle, Props>(function BeatlineTempoDial(
  {
  bpm,
  size,
  onBpm,
  onLiveBpm,
  onDragChange,
  audioDetent,
  hapticDetent,
  invert = false,
  skin = 'parts',
}: Props,
  ref
) {
  const safeBpm = sanitizeBpm(bpm, bpm, RIG_MIN_BPM, RIG_MAX_BPM);
  const liveBpm = useSharedValue(safeBpm);
  const rotation = useSharedValue(safeBpm * DEG_PER_BPM);
  const lastAngle = useSharedValue(0);
  const lastCommitted = useSharedValue(safeBpm);
  const dragging = useSharedValue(0);
  const lastDetentAt = useSharedValue(0);
  const lastFlushAt = useSharedValue(0);
  const armed = useSharedValue(0);
  const pendingRef = useRef<number | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dragging.value >= 0.5) return;
    liveBpm.value = safeBpm;
    lastCommitted.value = safeBpm;
    const visual = rotation.value / DEG_PER_BPM;
    if (Math.abs(visual - safeBpm) > 0.51) {
      rotation.value = beatlineDialSeatDeg(rotation.value, safeBpm);
    }
  }, [dragging, lastCommitted, liveBpm, rotation, safeBpm]);

  const fireDetent = useMemo(
    () => () => {
      rotaryDetent('dial', audioDetent, hapticDetent);
    },
    [audioDetent, hapticDetent]
  );

  const showLive = useMemo(
    () => (next: number) => {
      onLiveBpm?.(next);
    },
    [onLiveBpm]
  );

  const setDragging = useMemo(
    () => (next: boolean) => {
      onDragChange?.(next);
    },
    [onDragChange]
  );

  const applyNativeBpm = useCallback(
    (next: number, immediate: boolean) => {
      const safe = sanitizeBpm(next, safeBpm, RIG_MIN_BPM, RIG_MAX_BPM);
      pendingRef.current = safe;
      const send = () => {
        if (pendingRef.current == null) return;
        const value = pendingRef.current;
        pendingRef.current = null;
        onBpm(value);
      };
      if (immediate) {
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = null;
        send();
        return;
      }
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        send();
      }, PULSE_NATIVE_FLUSH_MS);
    },
    [onBpm, safeBpm]
  );

  const flushNative = useMemo(() => (next: number) => applyNativeBpm(next, false), [applyNativeBpm]);
  const commitFinal = useMemo(() => (next: number) => applyNativeBpm(next, true), [applyNativeBpm]);

  const flushNow = useCallback(() => {
    const next = beatlineFlushPending(pendingRef.current, sanitizeBpm(Math.round(liveBpm.value), safeBpm, RIG_MIN_BPM, RIG_MAX_BPM));
    applyNativeBpm(next, true);
  }, [applyNativeBpm, liveBpm, safeBpm]);

  const seatTo = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm, RIG_MIN_BPM, RIG_MAX_BPM);
      if (dragging.value >= 0.5) return;
      liveBpm.value = safe;
      lastCommitted.value = safe;
      rotation.value = beatlineDialSeatDeg(rotation.value, safe);
    },
    [dragging, lastCommitted, liveBpm, rotation, safeBpm]
  );

  useImperativeHandle(ref, () => ({ flush: flushNow, seat: seatTo }), [flushNow, seatTo]);

  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      const leftover = pendingRef.current;
      if (leftover != null) {
        pendingRef.current = null;
        onBpm(leftover);
      }
    },
    [onBpm]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          cancelAnimation(rotation);
          dragging.value = withTiming(1, { duration: BEATLINE_PRESS_DOWN_MS, easing: Easing.out(Easing.cubic) });
          const onRing = beatlineDialPointerInRing(event.x, event.y, size);
          armed.value = onRing ? 1 : 0;
          lastAngle.value = onRing ? pointerAngle(event.x, event.y, size / 2, size / 2) : lastAngle.value;
          runOnJS(setDragging)(true);
        })
        .onUpdate((event) => {
          if (!beatlineDialPointerInRing(event.x, event.y, size)) {
            armed.value = 0;
            return;
          }
          const nextAngle = pointerAngle(event.x, event.y, size / 2, size / 2);
          if (armed.value < 0.5) {
            lastAngle.value = nextAngle;
            armed.value = 1;
            return;
          }
          const delta = wrapDelta(nextAngle - lastAngle.value);
          lastAngle.value = nextAngle;
          const deg = beatlineDialResistDeg(((delta * 180) / Math.PI) * (invert ? -1 : 1));
          const nextLive = beatlineDialApply(liveBpm.value, deg, RIG_MIN_BPM, RIG_MAX_BPM);
          liveBpm.value = nextLive.bpm;
          rotation.value = rotation.value + nextLive.appliedDeg;
          const next = Math.round(nextLive.bpm);
          if (!pulseShouldCommitStep(next, lastCommitted.value)) return;
          const jump = Math.abs(next - lastCommitted.value);
          lastCommitted.value = next;
          runOnJS(showLive)(next);
          const now = performance.now();
          if (jump <= 2 && pulseDetentDue(now, lastDetentAt.value, BEATLINE_DETENT_MIN_GAP_MS)) {
            lastDetentAt.value = now;
            runOnJS(fireDetent)();
          }
          if (pulseFlushDue(now, lastFlushAt.value, PULSE_NATIVE_FLUSH_MS)) {
            lastFlushAt.value = now;
            runOnJS(flushNative)(next);
          }
        })
        .onFinalize(() => {
          dragging.value = withTiming(0, { duration: BEATLINE_PRESS_UP_MS, easing: Easing.out(Easing.cubic) });
          armed.value = 0;
          const snapped = Math.min(RIG_MAX_BPM, Math.max(RIG_MIN_BPM, Math.round(liveBpm.value)));
          const target = beatlineDialSeatDeg(rotation.value + (snapped - liveBpm.value) * DEG_PER_BPM, snapped);
          rotation.value = withTiming(target, { duration: BEATLINE_DIAL_SETTLE_MS, easing: Easing.out(Easing.cubic) });
          liveBpm.value = snapped;
          lastCommitted.value = snapped;
          runOnJS(showLive)(snapped);
          runOnJS(setDragging)(false);
          runOnJS(commitFinal)(snapped);
        }),
    [armed, commitFinal, dragging, fireDetent, flushNative, invert, lastAngle, lastCommitted, lastDetentAt, lastFlushAt, liveBpm, rotation, setDragging, showLive, size]
  );

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: interpolate(dragging.value, [0, 1], [1, BEATLINE_DIAL_SEAT]) }],
  }));
  const knob = Math.round(size * 0.72);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Tempo dial, ${safeBpm} BPM`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onBpm(sanitizeBpm(safeBpm + 1, safeBpm, RIG_MIN_BPM, RIG_MAX_BPM));
        if (event.nativeEvent.actionName === 'decrement') onBpm(sanitizeBpm(safeBpm - 1, safeBpm, RIG_MIN_BPM, RIG_MAX_BPM));
      }}
      style={[styles.plate, { width: size, height: size }]}>
      {skin === 'parts' ? (
        <BeatlinePart source={BEATLINE_ASSETS.bezel} circular fill={1.02} style={StyleSheet.absoluteFill} />
      ) : null}
      <GestureDetector gesture={gesture}>
        <View style={styles.hit}>
          {skin === 'parts' ? (
            <BeatlineRotatingPart
              source={BEATLINE_ASSETS.knob}
              fill={1.1}
              style={{ width: knob, height: knob }}
              animatedStyle={wheelStyle}
            />
          ) : (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, wheelStyle]}>
              <View style={styles.indexTick}>
                <View style={styles.indexRecess} />
                <View style={styles.indexBody} />
                <View style={styles.indexRidge} />
              </View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexTick: {
    position: 'absolute',
    top: '2.4%',
    alignSelf: 'center',
    width: 4,
    height: 14,
    alignItems: 'center',
  },
  indexRecess: {
    position: 'absolute',
    top: 0.8,
    width: 2.4,
    height: 13,
    borderRadius: 1,
    backgroundColor: 'rgba(6, 5, 4, 0.62)',
  },
  indexBody: {
    position: 'absolute',
    top: 0,
    width: 1.7,
    height: 12,
    borderRadius: 0.7,
    backgroundColor: '#8F8270',
  },
  indexRidge: {
    position: 'absolute',
    top: 0.2,
    width: 0.55,
    height: 8.5,
    borderRadius: 0.3,
    backgroundColor: 'rgba(214, 204, 186, 0.38)',
  },
});
