import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';
import {
  POCKET_STEPS,
  POCKET_STEP_ORDER,
  POCKET_TRACK_POSITIONS,
  STRAIGHT_MAGNET,
  type PocketStepId,
} from '@/constants/feel';
import { hapticRigid, hapticSelection } from '@/lib/haptics';

type Props = {
  value: PocketStepId;
  onChange: (value: PocketStepId) => void;
};

const THUMB = 40;
const STEP_COUNT = 5;
const STRAIGHT_INDEX = 2;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function positionOfIndex(index: number): number {
  'worklet';
  return index / (STEP_COUNT - 1);
}

function snapIndex(progress: number): number {
  'worklet';
  if (Math.abs(progress - 0.5) <= STRAIGHT_MAGNET) return STRAIGHT_INDEX;
  let best = STRAIGHT_INDEX;
  let bestDist = 1;
  for (let i = 0; i < STEP_COUNT; i++) {
    const dist = Math.abs(progress - positionOfIndex(i));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function progressFromX(x: number, width: number): number {
  'worklet';
  const span = Math.max(1, width - THUMB);
  return clamp((x - THUMB / 2) / span, 0, 1);
}

export function FeelDial({ value, onChange }: Props) {
  const theme = useSkin();
  const width = useSharedValue(1);
  const startIndex = Math.max(0, POCKET_STEP_ORDER.indexOf(value));
  const live = useSharedValue(positionOfIndex(startIndex));
  const dragging = useSharedValue(0);
  const onChangeRef = useRef(onChange);
  const lastStep = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    lastStep.current = value;
    if (dragging.value > 0.5) return;
    const index = Math.max(0, POCKET_STEP_ORDER.indexOf(value));
    live.value = withTiming(positionOfIndex(index), { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [dragging, live, value]);

  const commit = useCallback((index: number) => {
    const next = POCKET_STEP_ORDER[index] ?? 'straight';
    if (next === lastStep.current) return;
    lastStep.current = next;
    onChangeRef.current(next);
    if (next === 'straight') void hapticRigid();
    else void hapticSelection();
  }, []);

  const settle = useCallback(
    (index: number) => {
      commit(index);
    },
    [commit]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          dragging.value = 1;
          const progress = progressFromX(event.x, width.value);
          live.value = progress;
          runOnJS(commit)(snapIndex(progress));
        })
        .onChange((event) => {
          const progress = progressFromX(event.x, width.value);
          live.value = progress;
          runOnJS(commit)(snapIndex(progress));
        })
        .onFinalize(() => {
          dragging.value = 0;
          const next = snapIndex(live.value);
          live.value = withTiming(positionOfIndex(next), {
            duration: 170,
            easing: Easing.out(Easing.cubic),
          });
          runOnJS(settle)(next);
        }),
    [commit, dragging, live, settle, width]
  );

  const thumbStyle = useAnimatedStyle(() => {
    const span = Math.max(1, width.value - THUMB);
    const straight = Math.abs(live.value - 0.5) < 0.001;
    return {
      transform: [{ translateX: live.value * span }],
      backgroundColor: straight ? theme.accent : theme.ivory,
      shadowColor: theme.accent,
      shadowOpacity: straight ? 0.7 : 0.28,
      shadowRadius: straight ? 10 : 4,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const span = Math.max(1, width.value - THUMB);
    const straight = Math.abs(live.value - 0.5) < 0.02;
    return {
      opacity: straight ? 0.5 : 0,
      transform: [{ translateX: live.value * span }],
    };
  });

  const selectStop = (id: PocketStepId) => {
    const index = Math.max(0, POCKET_STEP_ORDER.indexOf(id));
    live.value = withTiming(positionOfIndex(index), { duration: 170, easing: Easing.out(Easing.cubic) });
    commit(index);
  };

  const current = POCKET_STEPS.find((step) => step.id === value) ?? POCKET_STEPS[STRAIGHT_INDEX]!;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel="Feel"
      accessibilityValue={{ text: current.label }}>
      <Text style={[styles.current, { color: theme.ivory }]} numberOfLines={1}>
        {current.label}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.end, { color: theme.ivoryDim }]} numberOfLines={1}>
          BEHIND
        </Text>
        <GestureDetector gesture={gesture}>
          <View
            style={styles.trackHit}
            onLayout={(event) => {
              width.value = event.nativeEvent.layout.width;
            }}>
            <View style={[styles.track, { backgroundColor: 'rgba(237,230,216,0.22)' }]}>
              <Pressable
                onPress={() => selectStop('straight')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="STRAIGHT"
                style={styles.centerHit}>
                <View style={styles.centerLine} />
              </Pressable>
              <View style={styles.marks} pointerEvents="box-none">
                {POCKET_STEP_ORDER.map((id) => {
                  if (id === 'straight') return null;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => selectStop(id)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={pocketStepByLabel(id)}
                      style={[styles.markHit, { left: `${POCKET_TRACK_POSITIONS[id] * 100}%` }]}>
                      <View
                        style={[
                          styles.tick,
                          {
                            backgroundColor: theme.ivoryDim,
                            opacity: id === value ? 0 : 0.7,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Animated.View style={[styles.halo, { backgroundColor: theme.accent }, glowStyle]} />
              <Animated.View style={[styles.thumb, { borderColor: theme.ivory }, thumbStyle]} />
            </View>
          </View>
        </GestureDetector>
        <Text style={[styles.end, styles.endRight, { color: theme.ivoryDim }]} numberOfLines={1}>
          AHEAD
        </Text>
      </View>
    </View>
  );
}

function pocketStepByLabel(id: PocketStepId): string {
  return POCKET_STEPS.find((step) => step.id === id)?.label ?? id;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 2,
  },
  current: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: -2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  end: {
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: '700',
    flexShrink: 0,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  endRight: {
    textAlign: 'right',
  },
  trackHit: {
    flex: 1,
    height: 72,
    justifyContent: 'center',
  },
  track: {
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  centerHit: {
    position: 'absolute',
    left: '50%',
    marginLeft: -14,
    top: -16,
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerLine: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: 'rgba(237,230,216,0.92)',
  },
  marks: {
    ...StyleSheet.absoluteFillObject,
    left: THUMB / 2,
    right: THUMB / 2,
  },
  markHit: {
    position: 'absolute',
    top: -16,
    width: 28,
    height: 40,
    marginLeft: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  halo: {
    position: 'absolute',
    left: (THUMB - 54) / 2,
    top: (8 - 54) / 2,
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (8 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});
