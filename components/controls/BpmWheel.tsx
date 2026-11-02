import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { hapticSelection } from '@/lib/haptics';

const ITEM_H = 40;
const VISIBLE = 3;
const SNAP_EASING = Easing.bezier(0.22, 0.08, 0.18, 1);

export type BpmWheelOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: BpmWheelOption<T>[];
  value: T;
  color: string;
  mute: string;
  line: string;
  onChange: (value: T) => void;
};

function clampIndex(index: number, count: number): number {
  'worklet';
  return Math.min(count - 1, Math.max(0, index));
}

export function BpmWheel<T extends string>({ options, value, color, mute: _mute, line, onChange }: Props<T>) {
  const count = Math.max(1, options.length);
  const startIndex = Math.max(0, options.findIndex((item) => item.id === value));
  const offset = useSharedValue(-startIndex * ITEM_H);
  const startOff = useSharedValue(0);
  const dragging = useSharedValue(0);
  const optionsRef = useRef(options);
  const onChangeRef = useRef(onChange);
  optionsRef.current = options;
  onChangeRef.current = onChange;

  const commit = useCallback((index: number) => {
    const next = optionsRef.current[index];
    if (!next) return;
    if (next.id !== value) onChangeRef.current(next.id);
  }, [value]);

  const snapTo = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, count);
      offset.value = withTiming(-clamped * ITEM_H, { duration: 220, easing: SNAP_EASING }, (done) => {
        if (done) runOnJS(commit)(clamped);
      });
    },
    [commit, count, offset]
  );

  useEffect(() => {
    const index = Math.max(0, options.findIndex((item) => item.id === value));
    if (dragging.value) return;
    const current = Math.round(-offset.value / ITEM_H);
    if (current === index) return;
    offset.value = withTiming(-index * ITEM_H, { duration: 200, easing: SNAP_EASING });
  }, [dragging, offset, options, value]);

  useAnimatedReaction(
    () => clampIndex(Math.round(-offset.value / ITEM_H), count),
    (index, previous) => {
      if (previous == null || index === previous) return;
      runOnJS(hapticSelection)();
    }
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-28, 28])
        .onBegin(() => {
          dragging.value = 1;
          startOff.value = offset.value;
        })
        .onUpdate((event) => {
          const min = -(count - 1) * ITEM_H;
          const next = startOff.value + event.translationY;
          const over = next > 0 ? next * 0.28 : next < min ? min + (next - min) * 0.28 : next;
          offset.value = over;
        })
        .onEnd((event) => {
          dragging.value = 0;
          const min = -(count - 1) * ITEM_H;
          if (Math.abs(event.velocityY) < 380) {
            snapTo(Math.round(-offset.value / ITEM_H));
            return;
          }
          offset.value = withDecay(
            { velocity: event.velocityY, deceleration: 0.993, clamp: [min, 0] },
            (finished) => {
              if (!finished) return;
              snapTo(Math.round(-offset.value / ITEM_H));
            }
          );
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [count, dragging, offset, snapTo, startOff]
  );

  return (
    <View style={[styles.housing, { borderColor: line }]}>
      <View pointerEvents="none" style={[styles.selection, { borderColor: line }]} />
      <GestureDetector gesture={gesture}>
        <View style={styles.hit}>
          {options.map((option, index) => (
            <WheelLabel key={option.id} option={option} color={color} index={index} offset={offset} />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function WheelLabel<T extends string>({
  option,
  color,
  index,
  offset,
}: {
  option: BpmWheelOption<T>;
  color: string;
  index: number;
  offset: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const center = -offset.value / ITEM_H;
    const dist = Math.abs(index - center);
    const opacity = interpolate(dist, [0, 0.85, 1.6], [1, 0.42, 0.14]);
    const scale = interpolate(dist, [0, 1, 2], [1.04, 0.9, 0.8]);
    const y = offset.value + index * ITEM_H + ITEM_H;
    return {
      opacity,
      transform: [{ translateY: y }, { scale }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.row, style]}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {option.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  housing: {
    flex: 1,
    height: ITEM_H * VISIBLE,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(8,6,5,0.28)',
  },
  selection: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: ITEM_H,
    height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  hit: {
    flex: 1,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
