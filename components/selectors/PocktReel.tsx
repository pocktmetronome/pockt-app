import { LinearGradient } from 'expo-linear-gradient';
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

import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

const ITEM_H_FULL = 72;
const ITEM_H_COMPACT = 56;
const SNAP_EASING = Easing.bezier(0.22, 0.08, 0.18, 1);
const AMBER = '#D4893A';

export type ReelOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: ReelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onSettled?: (value: T) => void;
  compact?: boolean;
};

function clampIndex(index: number, count: number): number {
  'worklet';
  return Math.min(count - 1, Math.max(0, index));
}

export function PocktReel<T extends string>({
  options,
  value,
  onChange,
  onSettled,
  compact = false,
}: Props<T>) {
  const theme = useSkin();
  const itemH = compact ? ITEM_H_COMPACT : ITEM_H_FULL;
  const count = Math.max(1, options.length);
  const startIndex = Math.max(0, options.findIndex((item) => item.id === value));
  const offset = useSharedValue(-startIndex * itemH);
  const startOff = useSharedValue(0);
  const dragging = useSharedValue(0);
  const lastIndex = useSharedValue(startIndex);
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

  const snapTo = useCallback(
    (index: number, notifySettle: boolean) => {
      const clamped = Math.min(count - 1, Math.max(0, index));
      offset.value = withTiming(-clamped * itemH, { duration: 240, easing: SNAP_EASING }, (done) => {
        if (done && notifySettle) runOnJS(settle)(clamped);
      });
    },
    [count, itemH, offset, settle]
  );

  useEffect(() => {
    const index = Math.max(0, options.findIndex((item) => item.id === value));
    if (dragging.value) return;
    const current = Math.round(-offset.value / itemH);
    if (current === index) return;
    snapTo(index, false);
  }, [dragging, itemH, offset, options, snapTo, value]);

  useAnimatedReaction(
    () => clampIndex(Math.round(-offset.value / itemH), count),
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
        .activeOffsetY([-8, 8])
        .failOffsetX([-28, 28])
        .onBegin(() => {
          dragging.value = 1;
          startOff.value = offset.value;
        })
        .onUpdate((event) => {
          const min = -(count - 1) * itemH;
          const next = startOff.value + event.translationY;
          const over = next > 0 ? next * 0.28 : next < min ? min + (next - min) * 0.28 : next;
          offset.value = over;
        })
        .onEnd((event) => {
          dragging.value = 0;
          const min = -(count - 1) * itemH;
          const current = clampIndex(Math.round(-offset.value / itemH), count);
          if (Math.abs(event.translationY) < 12 && Math.abs(event.velocityY) < 120) {
            const tapped = event.y < itemH ? current - 1 : event.y > itemH * 2 ? current + 1 : current;
            const index = clampIndex(tapped, count);
            offset.value = withTiming(-index * itemH, { duration: 220, easing: SNAP_EASING }, (done) => {
              if (done) runOnJS(settle)(index);
            });
            return;
          }
          if (Math.abs(event.velocityY) < 420) {
            const index = clampIndex(Math.round(-offset.value / itemH), count);
            offset.value = withTiming(-index * itemH, { duration: 220, easing: SNAP_EASING }, (done) => {
              if (done) runOnJS(settle)(index);
            });
            return;
          }
          offset.value = withDecay(
            { velocity: event.velocityY, deceleration: 0.992, clamp: [min, 0] },
            (finished) => {
              if (!finished) return;
              const index = clampIndex(Math.round(-offset.value / itemH), count);
              offset.value = withTiming(-index * itemH, { duration: 200, easing: SNAP_EASING }, (done) => {
                if (done) runOnJS(settle)(index);
              });
            }
          );
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [count, dragging, itemH, offset, settle, startOff]
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.housing, compact && styles.housingCompact]}>
        <LinearGradient
          colors={['#2A2620', '#14110E', '#0C0A08', '#1A1713']}
          locations={[0, 0.22, 0.78, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.bevel} />
        <View style={[styles.window, compact && styles.windowCompact, { borderColor: 'rgba(237,230,216,0.18)' }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.42)']}
            locations={[0, 0.38, 1]}
            style={styles.glass}
          />
          <View
            style={[
              styles.index,
              { backgroundColor: AMBER, top: itemH + itemH / 2 - 1 },
            ]}
          />
          <GestureDetector gesture={gesture}>
            <View style={styles.hit}>
              {options.map((option, index) => (
                <ReelLabel
                  key={option.id}
                  label={option.label}
                  color={theme.ivory}
                  index={index}
                  offset={offset}
                  itemH={itemH}
                  compact={compact}
                />
              ))}
            </View>
          </GestureDetector>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,6,5,0.88)', 'rgba(8,6,5,0)']}
            style={styles.edgeTop}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,6,5,0)', 'rgba(8,6,5,0.9)']}
            style={styles.edgeBottom}
          />
        </View>
      </View>
    </View>
  );
}

function ReelLabel({
  label,
  color,
  index,
  offset,
  itemH,
  compact,
}: {
  label: string;
  color: string;
  index: number;
  offset: SharedValue<number>;
  itemH: number;
  compact: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const center = -offset.value / itemH;
    const dist = Math.abs(index - center);
    const opacity = interpolate(dist, [0, 0.85, 1.7, 2.4], [1, 0.55, 0.22, 0.06]);
    const scale = interpolate(dist, [0, 1, 2], [1.08, 0.82, 0.68]);
    const y = offset.value + index * itemH + itemH + interpolate(dist, [0, 1.2], [0, 8]);
    return {
      opacity,
      transform: [{ translateY: y }, { scale }, { perspective: 420 }, { rotateX: `${Math.min(18, dist * 12)}deg` }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.labelWrap, { height: itemH }, style]}>
      <View style={styles.labelHit}>
        <Text style={[styles.label, compact && styles.labelCompact, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  housing: {
    width: '100%',
    maxWidth: 420,
    height: 236,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(237,230,216,0.22)',
  },
  housingCompact: {
    height: 196,
    maxWidth: '100%',
    borderRadius: 14,
  },
  bevel: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
  },
  window: {
    margin: 14,
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(10,8,6,0.72)',
  },
  windowCompact: {
    margin: 10,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  index: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    opacity: 0.9,
    zIndex: 4,
    shadowColor: AMBER,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hit: {
    flex: 1,
  },
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    zIndex: 2,
  },
  edgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 54,
    zIndex: 2,
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelHit: {
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 28,
    letterSpacing: 2.4,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 17,
    letterSpacing: 1.1,
  },
});
