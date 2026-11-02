import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';
import { clampLiveVolume } from '@/lib/audio-session-policy';
import { hapticSelection } from '@/lib/haptics';
import PocktTiming from '@/modules/pockt-timing';

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Immediate native mixer gain. Persist still happens through onChange. */
  immediateGain?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function applyLiveGain(next: number) {
  PocktTiming?.setMasterGain?.(clampLiveVolume(next));
}

export function MixerFader({ value, onChange, immediateGain = false }: Props) {
  const theme = useSkin();
  const width = useSharedValue(0);
  const start = useSharedValue(value);
  const live = useSharedValue(value);
  const onChangeRef = useRef(onChange);
  const lastHaptic = useRef(value);
  const lastSent = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    live.value = value;
  }, [live, value]);

  const notify = useCallback(
    (next: number) => {
      const safe = clampLiveVolume(next);
      if (immediateGain && Math.abs(safe - lastSent.current) >= 0.004) {
        lastSent.current = safe;
        applyLiveGain(safe);
      }
      onChangeRef.current(safe);
      if (Math.abs(safe - lastHaptic.current) >= 0.08) {
        void hapticSelection();
        lastHaptic.current = safe;
      }
    },
    [immediateGain]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          const span = Math.max(1, width.value);
          if (span >= 32 && event.x >= 0) {
            const next = clamp(event.x / span, 0, 1);
            live.value = next;
            start.value = next;
            runOnJS(notify)(next);
            return;
          }
          start.value = live.value;
        })
        .onChange((event) => {
          const span = width.value;
          if (span < 32) return;
          const next = clamp(start.value + event.translationX / span, 0, 1);
          live.value = next;
          runOnJS(notify)(next);
        }),
    [live, notify, start, width]
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: live.value * Math.max(1, width.value),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: live.value * Math.max(0, width.value - 28) }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.hit}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}>
        <View style={[styles.track, { backgroundColor: theme.sliderMax }]}>
          <Animated.View style={[styles.fill, { backgroundColor: theme.sliderMin }, fillStyle]} />
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: theme.thumb, borderColor: theme.ivory },
              thumbStyle,
            ]}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 52,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  track: {
    height: 10,
    width: '100%',
    borderRadius: 5,
    overflow: 'visible',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: -9,
  },
});
