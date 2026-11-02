import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { TempoRingCue } from '@/components/classic/faces/TempoRingCue';
import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { mechanicalBpmFromWeightT, mechanicalWeightT, MECHANICAL_SCALE_MARKS } from '@/lib/mechanical-scale';
import { mechanicalRodLayout, weightTopFromT } from '@/lib/mechanical-plate';
import { PENDULUM_MAX_DEG } from '@/lib/pendulum-gesture';

type Props = {
  size: number;
  playing: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  pulse: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  pulseSpb?: SharedValue<number>;
  pulseHostOffset?: SharedValue<number>;
};

const MARKS = MECHANICAL_SCALE_MARKS.filter((_, index) => index % 2 === 0);

/** Exposed metronome: frame, scale, axle, arm, and a weight that writes the shared BPM. */
export function MechanicalInstrumentFace({
  size,
  playing,
  bpm,
  setBpm,
  pulse,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
}: Props) {
  const geo = useMemo(() => mechanicalRodLayout(size, size), [size]);
  const weightT = useSharedValue(mechanicalWeightT(bpm));
  const origin = useSharedValue(mechanicalWeightT(bpm));
  useEffect(() => {
    weightT.value = mechanicalWeightT(bpm);
  }, [bpm, weightT]);
  const angle = usePendulumPhase(
    playing,
    bpm,
    pulse,
    PENDULUM_MAX_DEG,
    true,
    pulseBeat,
    undefined,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const rodTravel = geo.rodHeight;
  const commitT = (t: number) => setBpm(mechanicalBpmFromWeightT(t));
  const drag = Gesture.Pan()
    .onBegin(() => {
      origin.value = weightT.value;
    })
    .onUpdate((event) => {
      const next = Math.min(0.94, Math.max(0.06, origin.value + event.translationY / rodTravel));
      weightT.value = next;
      runOnJS(commitT)(next);
    });
  const arm = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  const bob = useAnimatedStyle(() => ({
    top: weightTopFromT(weightT.value, geo.rodHeight, geo.weightHeight),
  }));
  const scaleTop = geo.pivotY - geo.rodHeight;

  return (
    <View style={styles.stage} testID="console-face-mechanical" pointerEvents="box-none">
      <TempoRingCue size={size} />
      <View pointerEvents="none" style={[styles.cheek, { left: size * 0.18, top: size * 0.16, height: size * 0.62 }]} />
      <View pointerEvents="none" style={[styles.cheek, { right: size * 0.18, top: size * 0.16, height: size * 0.62 }]} />
      <View pointerEvents="none" style={[styles.bridge, { top: size * 0.14, width: size * 0.64 }]} />
      <View pointerEvents="none" style={[styles.scale, { top: scaleTop, height: geo.rodHeight, left: size * 0.62 }]}>
        {MARKS.map((mark) => (
          <Text key={mark.bpm} style={styles.mark} allowFontScaling={false}>
            {mark.bpm}
          </Text>
        ))}
      </View>
      <GestureDetector gesture={drag}>
        <Animated.View
          accessibilityLabel="Mechanical weight. Drag to change tempo."
          style={[
            styles.rodWrap,
            {
              left: geo.pivotX - 28,
              top: geo.pivotY - geo.rodHeight,
              height: geo.rodHeight,
              width: 56,
              transformOrigin: 'bottom',
            },
            arm,
          ]}>
          <LinearGradient
            colors={['#F4F7FB', '#C5CCD4', '#8E959E', '#E8EEF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.rod, { width: Math.max(8, geo.rodWidth), height: geo.rodHeight }]}
          />
          <Animated.View
            style={[
              styles.weight,
              {
                width: geo.weightWidth,
                height: geo.weightHeight,
                left: 28 - geo.weightWidth / 2,
              },
              bob,
            ]}>
            <LinearGradient colors={['#F7F4EE', '#C8C2B6', '#8F897E', '#EDE8DF']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.weightSlot} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View
        pointerEvents="none"
        style={[styles.axle, { left: geo.pivotX - 14, top: geo.pivotY - 14 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#07080B',
  },
  cheek: {
    position: 'absolute',
    width: 14,
    borderRadius: 4,
    backgroundColor: '#2A3138',
    borderWidth: 1,
    borderColor: 'rgba(214, 206, 190, 0.28)',
  },
  bridge: {
    position: 'absolute',
    height: 12,
    borderRadius: 3,
    backgroundColor: '#343C44',
    alignSelf: 'center',
  },
  scale: {
    position: 'absolute',
    width: 36,
    justifyContent: 'space-between',
  },
  mark: {
    color: 'rgba(214, 206, 190, 0.62)',
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  rodWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  rod: {
    borderRadius: 2,
  },
  weight: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightSlot: {
    width: '46%',
    height: 4,
    borderRadius: 1,
    backgroundColor: '#1A1916',
  },
  axle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C2126',
    borderWidth: 3,
    borderColor: '#8E959E',
  },
});
