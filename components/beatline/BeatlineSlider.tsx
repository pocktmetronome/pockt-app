import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { BeatlinePart } from '@/components/beatline/BeatlinePart';
import { P2 } from '@/constants/pockt-2';
import { clampLiveVolume } from '@/lib/audio-session-policy';
import { beatlineSliderValue } from '@/lib/beatline-2';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import { BEATLINE_VOLUME_GAIN_MS, beatlineVolumeEdge } from '@/lib/beatline-feel';
import { hapticSoft } from '@/lib/haptics';
import { pulseFlushDue } from '@/lib/pulse-commit';
import { rotaryDetent } from '@/lib/rotary-feedback';
import PocktTiming from '@/modules/pockt-timing';

type Props = {
  value: number;
  onChange: (next: number) => void;
  accessibilityLabel: string;
  vertical?: boolean;
  length?: number;
  detent?: boolean;
  skin?: 'code' | 'face' | 'master';
};

function applyLiveGain(next: number) {
  PocktTiming?.setMasterGain?.(clampLiveVolume(next));
}

export function BeatlineSlider({
  value,
  onChange,
  accessibilityLabel,
  vertical = false,
  length,
  detent = false,
  skin = 'code',
}: Props) {
  const [track, setTrack] = useState(length ?? (vertical ? 92 : 240));
  const amount = useSharedValue(Math.min(1, Math.max(0, value)));
  const origin = useSharedValue(Math.min(1, Math.max(0, value)));
  const dragging = useSharedValue(0);
  const lastDetent = useSharedValue(-1);
  const lastEdge = useSharedValue(-1);
  const lastFlushAt = useSharedValue(0);
  const lastSent = useRef(Math.min(1, Math.max(0, value)));
  const thumbPx = skin === 'master' ? 26 : skin === 'face' ? 26 : 22;
  const face = skin === 'face' && vertical;
  const master = skin === 'master';

  useEffect(() => {
    if (dragging.value >= 0.5) return;
    amount.value = Math.min(1, Math.max(0, value));
    lastSent.current = Math.min(1, Math.max(0, value));
  }, [amount, dragging, value]);

  const pushGain = useCallback((next: number) => {
    const safe = clampLiveVolume(next);
    if (Math.abs(safe - lastSent.current) < 0.004) return;
    lastSent.current = safe;
    applyLiveGain(safe);
  }, []);

  const persist = useCallback(
    (next: number) => {
      const safe = clampLiveVolume(next);
      lastSent.current = safe;
      applyLiveGain(safe);
      onChange(safe);
    },
    [onChange]
  );

  const tickDetent = useCallback(() => {
    rotaryDetent('roller', true, true);
  }, []);

  const edgeTick = useCallback((_edge: 0 | 1) => {
    void hapticSoft();
    rotaryDetent('roller', true, false);
  }, []);

  const gesture = useMemo(
    () => {
      const pan = vertical
        ? Gesture.Pan().minDistance(0).failOffsetX([-22, 22])
        : Gesture.Pan().minDistance(0).failOffsetY([-22, 22]);
      return pan
        .onBegin(() => {
          dragging.value = 1;
          origin.value = amount.value;
        })
        .onUpdate((event) => {
          const prev = amount.value;
          const next = beatlineSliderValue(
            origin.value,
            vertical ? event.translationY : event.translationX,
            Math.max(1, track),
            vertical,
            thumbPx
          );
          amount.value = next;
          const step = Math.round(next * 20);
          const shouldDetent = detent && step !== lastDetent.value;
          if (shouldDetent) lastDetent.value = step;
          if (master) {
            const edge = beatlineVolumeEdge(prev, next);
            if (edge != null && lastEdge.value !== edge) {
              lastEdge.value = edge;
              runOnJS(edgeTick)(edge);
            } else if (edge == null && next > 0.04 && next < 0.96) {
              lastEdge.value = -1;
            }
          }
          if (shouldDetent) runOnJS(tickDetent)();
          const now = performance.now();
          if (pulseFlushDue(now, lastFlushAt.value, BEATLINE_VOLUME_GAIN_MS)) {
            lastFlushAt.value = now;
            runOnJS(pushGain)(next);
          }
        })
        .onFinalize(() => {
          dragging.value = 0;
          runOnJS(persist)(amount.value);
        });
    },
    [amount, detent, dragging, edgeTick, lastDetent, lastEdge, lastFlushAt, master, origin, persist, pushGain, thumbPx, tickDetent, track, vertical]
  );

  const fillStyle = useAnimatedStyle(() =>
    vertical
      ? { height: `${amount.value * 100}%` }
      : { width: `${amount.value * 100}%` }
  );

  const thumbStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, track - thumbPx);
    if (master) {
      return { transform: [{ translateX: amount.value * travel }] };
    }
    return vertical
      ? { bottom: amount.value * travel }
      : { left: amount.value * travel };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ now: Math.round(value * 100) }}
        onLayout={(event) => {
          const next = vertical ? event.nativeEvent.layout.height : event.nativeEvent.layout.width;
          if (next > 8) setTrack(next);
        }}
        style={[
          styles.hit,
          vertical ? styles.hitVert : styles.hitHoriz,
          face && styles.hitFace,
          master && styles.hitMaster,
          length != null && (vertical ? { height: length } : { width: length }),
        ]}>
        {master ? null : face ? (
          <BeatlinePart source={BEATLINE_ASSETS.volumeTrack} contentFit="contain" style={styles.faceTrack} />
        ) : (
          <View style={[styles.track, vertical ? styles.trackVert : styles.trackHoriz]}>
            <Animated.View style={[styles.fill, vertical ? styles.fillVert : styles.fillHoriz, fillStyle]} />
          </View>
        )}
        <Animated.View style={[master ? styles.masterThumb : face ? styles.faceThumb : styles.thumb, thumbStyle]}>
          {master || face ? (
            <BeatlinePart source={BEATLINE_ASSETS.volumeThumb} circular fill={1.08} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.thumbDot} />
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'relative',
    justifyContent: 'center',
  },
  hitHoriz: {
    height: 36,
    width: '100%',
  },
  hitVert: {
    width: 36,
    height: 92,
  },
  hitFace: {
    width: 44,
    alignItems: 'center',
  },
  hitMaster: {
    height: 36,
    justifyContent: 'center',
  },
  masterThumb: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTrack: {
    width: 18,
    height: '100%',
    alignSelf: 'center',
  },
  faceThumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    alignSelf: 'center',
  },
  track: {
    backgroundColor: '#1A1D22',
    overflow: 'hidden',
  },
  trackHoriz: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  trackVert: {
    width: 4,
    borderRadius: 2,
    height: '100%',
    alignSelf: 'center',
    justifyContent: 'flex-end',
  },
  fill: {
    backgroundColor: 'rgba(61,255,122,0.35)',
  },
  fillHoriz: {
    height: '100%',
  },
  fillVert: {
    width: '100%',
    alignSelf: 'flex-end',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2A2E34',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P2.signal,
  },
});
