import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { hapticTap } from '@/lib/haptics';

function useSpark() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const progress = useSharedValue(1);
  return { x, y, progress };
}

function Spark({ slot }: { slot: ReturnType<typeof useSpark> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(slot.progress.value, [0, 0.12, 1], [0, 1, 0]),
    transform: [
      { translateX: slot.x.value - 22 },
      { translateY: slot.y.value - 22 },
      { scale: interpolate(slot.progress.value, [0, 1], [0.45, 1.35]) },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.spark, style]} />;
}

export function useSparkField() {
  const s0 = useSpark();
  const s1 = useSpark();
  const s2 = useSpark();
  const s3 = useSpark();
  const s4 = useSpark();
  const s5 = useSpark();
  const slots = useRef([s0, s1, s2, s3, s4, s5]).current;
  const cursor = useRef(0);
  const origin = useRef({ x: 0, y: 0 });

  const burst = useCallback((pageX: number, pageY: number, reduceMotion = false) => {
    const slot = slots[cursor.current % slots.length];
    cursor.current += 1;
    slot.x.value = pageX - origin.current.x;
    slot.y.value = pageY - origin.current.y;
    slot.progress.value = 0;
    slot.progress.value = withTiming(1, {
      duration: reduceMotion ? 160 : 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [slots]);

  return { slots, burst, origin };
}

/** Classic Pro TAP reaction: spark + rigid haptic + shared tapTempo. User taps only. */
export function useClassicTapReaction(tapTempo: () => void) {
  const sparks = useSparkField();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const fire = useCallback(
    (pageX: number, pageY: number) => {
      void hapticTap();
      tapTempo();
      sparks.burst(pageX, pageY, reduceMotion);
    },
    [reduceMotion, sparks, tapTempo]
  );

  return { sparks, fire, reduceMotion };
}

export function SparkField({ field }: { field: ReturnType<typeof useSparkField> }) {
  const ref = useRef<View>(null);
  return (
    <View
      ref={ref}
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
      onLayout={() => {
        ref.current?.measureInWindow((x, y) => {
          field.origin.current = { x, y };
        });
      }}>
      {field.slots.map((slot, index) => (
        <Spark key={index} slot={slot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(244,246,250,0.85)',
    backgroundColor: 'rgba(244,246,250,0.18)',
  },
});
