import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import { sanitizeBpm } from '@/constants/timing';
import { hapticDialTick } from '@/lib/haptics';
import { cylinderRidge, horizontalAdvanceBpm } from '@/lib/horizontal-tempo';

const WHEEL_MIN = 20;
const WHEEL_MAX = 400;
const WHEEL_H = 132;

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  width?: number;
  /** Installation height. Physics stay on the shared roller; Pro and Beatline use the low strip. */
  height?: number;
  invert?: boolean;
  /** Continuous cylinder position. Proofs use a fraction; musical BPM stays the integer prop. */
  roller?: number;
};

/**
 * Shared precision wheel for Pro and Beatline.
 * Direct finger tracking. The authoritative BPM setter is onChange.
 * A machined cylinder: the knurl is cut into the metal and rolls under a fixed index.
 */
export function HorizontalTempoWheel({ bpm, onChange, width = 280, height = WHEEL_H, invert = false, roller }: Props) {
  const wheelH = height;
  const scale = wheelH / WHEEL_H;
  const safeBpm = sanitizeBpm(bpm);
  const parked = Number.isFinite(roller) ? Math.min(WHEEL_MAX, Math.max(WHEEL_MIN, roller as number)) : safeBpm;
  const rollerSv = useSharedValue(parked);
  const detentSv = useSharedValue(safeBpm);
  const dragging = useSharedValue(0);
  const lastX = useSharedValue(0);
  const [shown, setShown] = useState(parked);

  const publish = useCallback((value: number) => {
    setShown(value);
  }, []);

  useAnimatedReaction(
    () => rollerSv.value,
    (value, previous) => {
      if (previous !== null && Math.abs(value - previous) < 0.0004) return;
      runOnJS(publish)(value);
    }
  );

  useEffect(() => {
    if (dragging.value > 0.5) return;
    detentSv.value = safeBpm;
    rollerSv.value = parked;
    setShown(parked);
  }, [detentSv, dragging, parked, rollerSv, safeBpm]);

  const commit = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm);
      if (safe === safeBpm) return;
      onChange(safe);
    },
    [onChange, safeBpm]
  );

  const tick = useCallback((count: number) => {
    const times = Math.max(0, Math.min(24, Math.round(count)));
    for (let i = 0; i < times; i += 1) hapticDialTick();
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin(() => {
          cancelAnimation(rollerSv);
          dragging.value = 1;
          lastX.value = 0;
        })
        .onUpdate((event) => {
          const dx = event.translationX - lastX.value;
          lastX.value = event.translationX;
          const stepped = horizontalAdvanceBpm(rollerSv.value, detentSv.value, dx, event.velocityX, invert);
          rollerSv.value = stepped.roller;
          if (stepped.crossings <= 0) return;
          detentSv.value = stepped.bpm;
          runOnJS(tick)(stepped.crossings);
          runOnJS(commit)(stepped.bpm);
        })
        .onFinalize(() => {
          if (dragging.value < 0.5) return;
          dragging.value = 0;
          lastX.value = 0;
          rollerSv.value = withTiming(detentSv.value, { duration: 90 });
        }),
    [commit, detentSv, dragging, invert, lastX, rollerSv, tick]
  );

  const visual = Number.isFinite(roller) ? parked : shown;
  const aperture = Math.max(40, width - 52);
  const ridges = useMemo(() => {
    const drawn = [];
    const first = Math.round((visual - 16) * 5);
    const last = Math.round((visual + 16) * 5);
    for (let step = first; step <= last; step += 1) {
      const ridge = cylinderRidge(step / 5, visual, aperture);
      if (ridge) drawn.push(ridge);
    }
    return drawn;
  }, [aperture, visual]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={`Tempo wheel ${safeBpm}`}
        style={[styles.chassis, { width, height: wheelH }]}>
        <LinearGradient colors={['#3A3228', '#161310', '#070605']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.lip} />
        <View style={[styles.recess, { left: 8, right: 8, top: 14 * scale, bottom: Math.max(18, 26 * scale) }]}>
          <View style={styles.journalLeft} />
          <View style={styles.journalRight} />
          <View style={styles.aperture}>
            <LinearGradient
              colors={['#120E0B', '#5C5144', '#D9CBB4', '#8A7B68', '#100D0A']}
              locations={[0, 0.22, 0.48, 0.72, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            {ridges.map((ridge) => {
              const crown = 0.22 + 0.78 * ridge.shade;
              const full = 16 + 48 * crown;
              const grooveH = full * scale;
              return (
                <View
                  key={ridge.mark.toFixed(2)}
                  pointerEvents="none"
                  style={[
                    styles.groove,
                    {
                      left: ridge.x - ridge.thickness * 0.35,
                      width: Math.max(1, ridge.thickness * 0.55),
                      height: grooveH,
                      top: (38 - full / 2) * scale,
                      opacity: 0.28 + 0.62 * ridge.shade,
                      backgroundColor: ridge.major ? '#1A120C' : '#2A2118',
                    },
                  ]}
                />
              );
            })}
            {ridges.map((ridge) =>
              ridge.major && Math.abs(ridge.mark % 20) < 0.001 && ridge.shade > 0.45 ? (
                <Text
                  key={`n-${ridge.mark.toFixed(0)}`}
                  pointerEvents="none"
                  allowFontScaling={false}
                  style={[styles.engrave, { left: ridge.x - 14, opacity: ridge.shade }]}>
                  {Math.round(ridge.mark)}
                </Text>
              ) : null
            )}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,244,220,0)', 'rgba(255,244,220,0.28)', 'rgba(255,244,220,0)']}
              locations={[0.38, 0.5, 0.62]}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient pointerEvents="none" colors={['rgba(8,6,4,0.92)', 'rgba(8,6,4,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cheekLeft} />
            <LinearGradient pointerEvents="none" colors={['rgba(8,6,4,0)', 'rgba(8,6,4,0.92)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cheekRight} />
          </View>
        </View>
        <View pointerEvents="none" style={[styles.index, { top: 8 * scale }]} />
        <View pointerEvents="none" style={[styles.notch, { top: 16 * scale }]} />
        <Text pointerEvents="none" allowFontScaling={false} style={[styles.readout, scale < 0.7 && { fontSize: 11, bottom: 2 }]}>
          {safeBpm}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  chassis: {
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(90, 74, 52, 0.9)',
    borderTopColor: 'rgba(232, 214, 180, 0.55)',
    borderBottomColor: '#000',
  },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: 'rgba(255, 236, 210, 0.28)',
  },
  recess: {
    position: 'absolute',
    top: 14,
    bottom: 26,
    borderRadius: 8,
    backgroundColor: '#050403',
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden',
  },
  journalLeft: {
    position: 'absolute',
    left: 4,
    top: 16,
    bottom: 16,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#8A7964',
    borderWidth: 1,
    borderColor: '#2A2118',
    borderTopColor: '#E7D7B8',
  },
  journalRight: {
    position: 'absolute',
    right: 4,
    top: 16,
    bottom: 16,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#8A7964',
    borderWidth: 1,
    borderColor: '#2A2118',
    borderTopColor: '#E7D7B8',
  },
  aperture: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 8,
    bottom: 8,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#3A3228',
  },
  groove: {
    position: 'absolute',
  },
  engrave: {
    position: 'absolute',
    bottom: 1,
    width: 28,
    textAlign: 'center',
    color: 'rgba(28, 20, 12, 0.82)',
    fontSize: 9,
    fontWeight: '700',
  },
  cheekLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 36,
  },
  cheekRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
  },
  index: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 2,
    height: 10,
    marginLeft: -1,
    backgroundColor: '#E7C27A',
  },
  notch: {
    position: 'absolute',
    top: 16,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E7C27A',
  },
  readout: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    textAlign: 'center',
    color: '#F4E7C8',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
