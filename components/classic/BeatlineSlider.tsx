import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { MAX_BPM, MIN_BPM } from '@/constants/timing';
import { hapticSelection } from '@/lib/haptics';

const THUMB = 22;
const TRACK_H = 3;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  accentColor?: string;
};

export function BeatlineSlider({ bpm, onChange, accentColor = '#F4F6FA' }: Props) {
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
    if (next !== lastHaptic.current && next % 5 === 0) void hapticSelection();
    lastHaptic.current = next;
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          const span = Math.max(1, width.value - THUMB);
          const next = Math.round(
            clamp(MIN_BPM + ((event.x - THUMB / 2) / span) * (MAX_BPM - MIN_BPM), MIN_BPM, MAX_BPM)
          );
          live.value = next;
          runOnJS(notify)(next);
        })
        .onChange((event) => {
          const span = Math.max(1, width.value - THUMB);
          const next = Math.round(
            clamp(MIN_BPM + ((event.x - THUMB / 2) / span) * (MAX_BPM - MIN_BPM), MIN_BPM, MAX_BPM)
          );
          live.value = next;
          runOnJS(notify)(next);
        }),
    [live, notify, width]
  );

  const thumbStyle = useAnimatedStyle(() => {
    const span = Math.max(1, width.value - THUMB);
    const progress = (live.value - MIN_BPM) / (MAX_BPM - MIN_BPM);
    return { transform: [{ translateX: progress * span }] };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.hit}
        accessibilityLabel="Tempo slider"
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: accentColor,
                width: `${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
              },
            ]}
          />
          <Animated.View style={[styles.thumb, { backgroundColor: accentColor }, thumbStyle]} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_H,
    borderRadius: 2,
    backgroundColor: 'rgba(220,228,236,0.18)',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    opacity: 0.55,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginTop: -(THUMB - TRACK_H) / 2,
  },
});
