import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { hapticDialTick } from '@/lib/haptics';

type Props = {
  bpm: number;
  dial: number;
  onChange: (bpm: number) => void;
};

const DEG_PER_BPM = 2.4;
const PX_PER_BPM = 8;
const TICKS = 48;

function bpmToDeg(value: number): number {
  'worklet';
  return (value - MIN_BPM) * DEG_PER_BPM;
}

export function TitaniumDial({ bpm, dial, onChange }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(312, Math.round(width * 0.7));
  const safeBpm = sanitizeBpm(bpm);
  const rotation = useSharedValue(bpmToDeg(safeBpm));
  const liveBpm = useSharedValue(safeBpm);
  const originBpm = useSharedValue(safeBpm);

  useEffect(() => {
    liveBpm.value = safeBpm;
    rotation.value = withTiming(bpmToDeg(safeBpm), { duration: 140, easing: Easing.out(Easing.cubic) });
  }, [liveBpm, rotation, safeBpm]);

  const commit = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm);
      hapticDialTick();
      onChange(safe);
    },
    [onChange, safeBpm]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .onBegin(() => {
          originBpm.value = liveBpm.value;
        })
        .onUpdate((event) => {
          const velocity = Math.abs(event.velocityY);
          const gain = velocity > 1400 ? 1.55 : velocity > 700 ? 1.18 : 1;
          const raw = originBpm.value - (event.translationY / PX_PER_BPM) * gain;
          const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(raw)));
          if (next === liveBpm.value) return;
          liveBpm.value = next;
          rotation.value = bpmToDeg(next);
          runOnJS(commit)(next);
        }),
    [commit, liveBpm, originBpm, rotation]
  );

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(((rotation.value % 90) + 90) % 90, [0, 45, 90], [0.1, 0.22, 0.1]),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View pointerEvents="none" style={styles.chassis}>
        <LinearGradient
          colors={['#2A2C2E', '#121314', '#1A1C1E', '#0C0D0E']}
          locations={[0, 0.38, 0.72, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View pointerEvents="none" style={styles.tickRing}>
        {Array.from({ length: TICKS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.tick,
              i % 4 === 0 ? styles.tickMajor : styles.tickMinor,
              { transform: [{ rotate: `${(i / TICKS) * 360}deg` }, { translateY: -(size * 0.46) }] },
            ]}
          />
        ))}
      </View>
      <Animated.View pointerEvents="none" style={[styles.redRing, ringStyle]}>
        <View style={styles.redPip} />
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.dialHit, dialStyle]}>
          <Image
            source={dial}
            style={styles.dial}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey="titanium-dial"
          />
        </Animated.View>
      </GestureDetector>
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.22)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  chassis: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(210,196,176,0.16)',
  },
  tickRing: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(243,241,236,0.28)',
  },
  tickMajor: {
    height: 9,
    backgroundColor: 'rgba(243,241,236,0.5)',
  },
  tickMinor: {
    height: 5,
  },
  redRing: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  redPip: {
    marginTop: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D4542A',
    shadowColor: '#D4542A',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  dialHit: {
    width: '78%',
    height: '78%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dial: {
    width: '100%',
    height: '100%',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
