import { Canvas, Circle, LinearGradient, RadialGradient, vec } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { P2 } from '@/constants/pockt-2';
import { pointerAngle, wrapDelta } from '@/lib/pro-dial';
import { rotaryDetent } from '@/lib/rotary-feedback';

const DEG_PER_SOUND = 18;

type Props = {
  index: number;
  count: number;
  size: number;
  onStep: (delta: number) => void;
  audioDetent: boolean;
  hapticDetent: boolean;
};

export function BeatlineSoundKnob({ index, count, size, onStep, audioDetent, hapticDetent }: Props) {
  const rotation = useSharedValue(index * DEG_PER_SOUND);
  const lastAngle = useSharedValue(0);
  const accum = useSharedValue(0);
  const lastIndex = useSharedValue(index);
  const dragging = useSharedValue(0);

  useEffect(() => {
    if (dragging.value >= 0.5) return;
    lastIndex.value = index;
    rotation.value = index * DEG_PER_SOUND;
  }, [dragging, index, lastIndex, rotation]);

  const fire = useCallback(
    (delta: number) => {
      rotaryDetent('dial', audioDetent, hapticDetent);
      onStep(delta);
    },
    [audioDetent, hapticDetent, onStep]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          dragging.value = 1;
          lastAngle.value = pointerAngle(event.x, event.y, size / 2, size / 2);
          accum.value = 0;
        })
        .onUpdate((event) => {
          if (count < 1) return;
          const nextAngle = pointerAngle(event.x, event.y, size / 2, size / 2);
          const delta = wrapDelta(nextAngle - lastAngle.value);
          lastAngle.value = nextAngle;
          const deg = (delta * 180) / Math.PI;
          rotation.value = rotation.value + deg;
          accum.value += deg;
          const steps = Math.trunc(accum.value / DEG_PER_SOUND);
          if (steps === 0) return;
          accum.value -= steps * DEG_PER_SOUND;
          runOnJS(fire)(steps);
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [accum, count, dragging, fire, lastAngle, rotation, size]
  );

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cx = size / 2;
  const cy = size / 2;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Sound selector"
        style={[styles.plate, { width: size, height: size }]}>
        <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]} />
        <Animated.View style={[styles.wheel, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }, wheelStyle]}>
          <Canvas style={{ width: size - 8, height: size - 8 }}>
            <Circle cx={cx - 4} cy={cy - 4} r={(size - 8) / 2}>
              <RadialGradient c={vec(cx - 4, cy - 4)} r={(size - 8) / 2} colors={['#3A4048', '#161A1F', '#0A0C0E']} />
            </Circle>
            <Circle cx={cx - 4} cy={cy - 4} r={(size - 8) * 0.36}>
              <LinearGradient
                start={vec(8, 6)}
                end={vec(size - 16, size - 14)}
                colors={['#6A727C', '#2A3038', '#12151A']}
              />
            </Circle>
            <Circle cx={cx - 4} cy={(size - 8) * 0.16} r={2.2} color={P2.signal} />
          </Canvas>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: P2.signal,
    shadowColor: P2.signal,
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  wheel: {
    overflow: 'hidden',
  },
});
