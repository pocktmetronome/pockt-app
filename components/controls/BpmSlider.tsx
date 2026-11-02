import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { P2, P2Radius } from '@/constants/pockt-2';
import { MAX_BPM, MIN_BPM } from '@/constants/timing';
import { controlStepDetent, rotaryDetent } from '@/lib/rotary-feedback';

type Props = {
  bpm: number;
  invert?: boolean;
  onChange: (bpm: number) => void;
};

const THUMB = 40;
const TRACK_H = 6;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function BpmSlider({ bpm, invert = false, onChange }: Props) {
  const width = useSharedValue(1);
  const live = useSharedValue(bpm);
  const onChangeRef = useRef(onChange);
  const lastHaptic = useRef(bpm);
  onChangeRef.current = onChange;

  useEffect(() => {
    live.value = bpm;
  }, [bpm, live]);

  const notify = useCallback((next: number) => {
    onChangeRef.current(next);
    if (next !== lastHaptic.current) {
      rotaryDetent('dial', true, true);
      lastHaptic.current = next;
    }
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          const span = Math.max(1, width.value - THUMB);
          const x = invert ? width.value - event.x : event.x;
          const next = Math.round(
            clamp(MIN_BPM + ((x - THUMB / 2) / span) * (MAX_BPM - MIN_BPM), MIN_BPM, MAX_BPM)
          );
          live.value = next;
          runOnJS(notify)(next);
        })
        .onChange((event) => {
          const span = Math.max(1, width.value - THUMB);
          const x = invert ? width.value - event.x : event.x;
          const next = Math.round(
            clamp(MIN_BPM + ((x - THUMB / 2) / span) * (MAX_BPM - MIN_BPM), MIN_BPM, MAX_BPM)
          );
          live.value = next;
          runOnJS(notify)(next);
        }),
    [invert, live, notify, width]
  );

  const thumbStyle = useAnimatedStyle(() => {
    const span = Math.max(1, width.value - THUMB);
    const progress = (live.value - MIN_BPM) / (MAX_BPM - MIN_BPM);
    const shown = invert ? 1 - progress : progress;
    return {
      transform: [{ translateX: shown * span }],
    };
  });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          controlStepDetent(true, true);
          onChange(bpm - 1);
        }}
        onLongPress={() => {
          controlStepDetent(true, true);
          onChange(bpm - 10);
        }}
        style={({ pressed }) => [
          styles.step,
          pressed && styles.stepPressed,
        ]}
        hitSlop={8}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.sliderHit}
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
          }}>
          <View style={[styles.track, { backgroundColor: P2.fieldInset }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: P2.signal,
                  width: `${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
                  left: invert ? undefined : 0,
                  right: invert ? 0 : undefined,
                },
              ]}
            />
            <Animated.View
              style={[styles.thumb, { backgroundColor: P2.metalHi, borderColor: P2.hairlineStrong }, thumbStyle]}
            />
          </View>
        </View>
      </GestureDetector>
      <Pressable
        onPress={() => {
          controlStepDetent(true, true);
          onChange(bpm + 1);
        }}
        onLongPress={() => {
          controlStepDetent(true, true);
          onChange(bpm + 10);
        }}
        style={({ pressed }) => [
          styles.step,
          pressed && styles.stepPressed,
        ]}
        hitSlop={8}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderHit: {
    flex: 1,
    height: 72,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  track: {
    height: TRACK_H,
    borderRadius: 3,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
    opacity: 0.85,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 1.5,
    marginTop: -(THUMB - TRACK_H) / 2,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
    backgroundColor: P2.fieldRaised,
    borderRadius: P2Radius.control,
  },
  stepPressed: {
    backgroundColor: P2.fieldPanel,
    transform: [{ translateY: 1 }],
  },
  stepText: {
    fontSize: 26,
    fontWeight: '300',
    marginTop: -2,
    color: P2.ink,
  },
});
