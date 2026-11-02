import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Canvas,
  Circle,
  Group,
  Line,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

const TWO_PI = Math.PI * 2;
const SNAP_EASING = Easing.bezier(0.22, 0.02, 0.18, 1);

export type RotaryOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: RotaryOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onSettled?: (value: T) => void;
};

function wrapDelta(delta: number): number {
  'worklet';
  let value = delta;
  while (value > Math.PI) value -= TWO_PI;
  while (value < -Math.PI) value += TWO_PI;
  return value;
}

function nearestIndex(rotation: number, count: number): number {
  'worklet';
  const step = TWO_PI / count;
  const idx = Math.round(rotation / step);
  return ((idx % count) + count) % count;
}

export function RotarySelector<T extends string>({ options, value, onChange, onSettled }: Props<T>) {
  const theme = useSkin();
  const { width, height } = useWindowDimensions();
  const count = Math.max(1, options.length);
  const step = TWO_PI / count;
  const size = Math.min(width * 0.92, Math.min(360, height * 0.44));
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;

  const rotation = useSharedValue(Math.max(0, options.findIndex((item) => item.id === value)) * step);
  const dragging = useSharedValue(0);
  const startRot = useSharedValue(0);
  const originAngle = useSharedValue(0);
  const useAngular = useSharedValue(0);
  const lastIndex = useSharedValue(Math.max(0, options.findIndex((item) => item.id === value)));
  const optionsRef = useRef(options);
  const onChangeRef = useRef(onChange);
  const onSettledRef = useRef(onSettled);
  optionsRef.current = options;
  onChangeRef.current = onChange;
  onSettledRef.current = onSettled;

  const commit = useCallback((index: number) => {
    try {
      const next = optionsRef.current[index];
      if (!next) return;
      if (next.id !== value) onChangeRef.current(next.id);
    } catch {
      /* keep selector open even if parent throws */
    }
  }, [value]);

  const settle = useCallback((index: number) => {
    try {
      const next = optionsRef.current[index];
      if (!next) return;
      onChangeRef.current(next.id);
      onSettledRef.current?.(next.id);
    } catch {
      /* keep selector open even if parent throws */
    }
  }, []);

  const snapToIndex = useCallback(
    (index: number, notifySettle: boolean) => {
      const current = Math.round(rotation.value / step);
      const wrapped = ((current % count) + count) % count;
      let delta = index - wrapped;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
      const target = (current + delta) * step;
      rotation.value = withTiming(target, { duration: 220, easing: SNAP_EASING }, (finished) => {
        if (finished && notifySettle) runOnJS(settle)(index);
      });
    },
    [count, rotation, settle, step]
  );

  useEffect(() => {
    const index = Math.max(0, options.findIndex((item) => item.id === value));
    if (dragging.value) return;
    if (nearestIndex(rotation.value, count) === index) return;
    snapToIndex(index, false);
  }, [count, dragging, options, rotation, snapToIndex, value]);

  useAnimatedReaction(
    () => nearestIndex(rotation.value, count),
    (index, previous) => {
      if (previous == null || index === previous) return;
      lastIndex.value = index;
      runOnJS(hapticSelection)();
      runOnJS(commit)(index);
    }
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .activeOffsetY([-10, 10])
        .onBegin((event) => {
          dragging.value = 1;
          startRot.value = rotation.value;
          const rx = event.x - cx;
          const ry = event.y - cy;
          useAngular.value = Math.hypot(rx, ry) > 36 ? 1 : 0;
          originAngle.value = Math.atan2(ry, rx);
        })
        .onUpdate((event) => {
          if (useAngular.value) {
            const angle = Math.atan2(event.y - cy, event.x - cx);
            rotation.value = startRot.value + wrapDelta(angle - originAngle.value);
          } else {
            rotation.value = startRot.value + event.translationY * 0.012;
          }
        })
        .onEnd((event) => {
          dragging.value = 0;
          let omega = event.velocityY * 0.012;
          if (useAngular.value) {
            const rx = event.x - cx;
            const ry = event.y - cy;
            const r2 = rx * rx + ry * ry;
            if (r2 > 900) omega = (rx * event.velocityY - ry * event.velocityX) / r2;
          }
          if (Math.abs(omega) < 0.85) {
            const index = nearestIndex(rotation.value, count);
            const target = Math.round(rotation.value / step) * step;
            rotation.value = withTiming(target, { duration: 200, easing: SNAP_EASING }, (finished) => {
              if (finished) runOnJS(settle)(index);
            });
            return;
          }
          rotation.value = withDecay({ velocity: omega, deceleration: 0.994 }, (finished) => {
            if (!finished) return;
            const index = nearestIndex(rotation.value, count);
            const target = Math.round(rotation.value / step) * step;
            rotation.value = withTiming(target, { duration: 200, easing: SNAP_EASING }, (done) => {
              if (done) runOnJS(settle)(index);
            });
          });
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [count, cx, cy, dragging, originAngle, rotation, settle, startRot, step, useAngular]
  );

  const ticks = useDerivedValue(() => [{ rotate: -rotation.value }]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.index, { borderBottomColor: theme.accent }]} />
      <GestureDetector gesture={gesture}>
        <View style={[styles.wheel, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            <Circle cx={cx} cy={cy} r={size * 0.46}>
              <RadialGradient
                c={vec(cx - size * 0.12, cy - size * 0.16)}
                r={size * 0.55}
                colors={[theme.bgRaised, theme.bg, '#0A0908']}
              />
            </Circle>
            <Circle cx={cx} cy={cy} r={size * 0.46} style="stroke" strokeWidth={16} color={theme.bgPanel} />
            <Circle cx={cx} cy={cy} r={size * 0.46} style="stroke" strokeWidth={1.6} color={theme.ivoryMute} />
            <Circle cx={cx} cy={cy} r={size * 0.39} style="stroke" strokeWidth={1.2} color={theme.line} />
            <Circle cx={cx} cy={cy} r={size * 0.18} color={theme.bg} />
            <Circle cx={cx} cy={cy} r={size * 0.18} style="stroke" strokeWidth={1.4} color={theme.ivoryDim} />
            <Group origin={vec(cx, cy)} transform={ticks}>
              {options.map((_, index) => {
                const angle = -Math.PI / 2 + index * step;
                const inner = size * 0.41;
                const outer = size * 0.49;
                return (
                  <Line
                    key={index}
                    p1={vec(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)}
                    p2={vec(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)}
                    color={theme.ivoryDim}
                    strokeWidth={2}
                  />
                );
              })}
            </Group>
            <Line
              p1={vec(cx, cy - size * 0.5)}
              p2={vec(cx, cy - size * 0.4)}
              color={theme.accent}
              strokeWidth={3}
            />
          </Canvas>
          {options.map((option, index) => (
            <WheelLabel
              key={option.id}
              label={option.label}
              color={theme.ivory}
              index={index}
              count={count}
              radius={radius}
              center={cx}
              rotation={rotation}
              onPress={() => {
                dragging.value = 0;
                snapToIndex(index, true);
              }}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function WheelLabel({
  label,
  color,
  index,
  count,
  radius,
  center,
  rotation,
  onPress,
}: {
  label: string;
  color: string;
  index: number;
  count: number;
  radius: number;
  center: number;
  rotation: SharedValue<number>;
  onPress: () => void;
}) {
  const step = TWO_PI / count;
  const style = useAnimatedStyle(() => {
    const offset = wrapDelta(index * step - rotation.value);
    const angle = -Math.PI / 2 - offset;
    const dist = Math.abs(offset);
    const opacity = interpolateClamp(dist, [0, 0.55, 1.25, Math.PI], [1, 0.72, 0.38, 0.14]);
    const scale = interpolateClamp(dist, [0, 0.7, Math.PI], [1.12, 0.86, 0.68]);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.labelWrap, { left: center - 78, top: center - 24 }, style]}>
      <Text onPress={onPress} style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

function interpolateClamp(value: number, input: number[], output: number[]): number {
  'worklet';
  if (value <= input[0]) return output[0];
  if (value >= input[input.length - 1]) return output[output.length - 1];
  for (let i = 1; i < input.length; i += 1) {
    if (value <= input[i]) {
      const t = (value - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + (output[i] - output[i - 1]) * t;
    }
  }
  return output[output.length - 1];
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 6,
  },
  wheel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    width: 156,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 24,
    letterSpacing: 1.4,
    fontWeight: '700',
    textAlign: 'center',
  },
});
