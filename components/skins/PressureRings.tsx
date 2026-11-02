import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  feel: string;
  color?: string;
};

/**
 * Code-drawn pressure rings. Language: air moving from a speaker.
 * Normal beat: one ring. Downbeat: two, slightly separated.
 * Subdivisions: tiny restrained ring, or none at high density.
 */
export function PressureRings({
  pulse,
  pulseRole,
  motionGain,
  feel,
  color = 'rgba(237,214,168,0.72)',
}: Props) {
  const swamp = feel === 'swampy';
  const push = feel === 'push';
  const expand = swamp ? 1.72 : push ? 2.28 : 2.05;

  const innerStyle = useAnimatedStyle(() => {
    const role = pulseRole.value;
    const amount = pulse.value * motionGain;
    if (amount <= 0.02 || role < 0.5) {
      return { opacity: 0, transform: [{ scale: 0.4 }] };
    }
    const peak = role >= 1.5 ? 0.58 : 0.2;
    return {
      opacity: interpolate(amount, [0, 0.18, 1], [0, peak, 0]),
      transform: [{ scale: interpolate(amount, [0, 1], [0.46, expand]) }],
    };
  });

  const outerStyle = useAnimatedStyle(() => {
    const role = pulseRole.value;
    const amount = pulse.value * motionGain;
    if (amount <= 0.02 || role < 1.5) {
      return { opacity: 0, transform: [{ scale: 0.5 }] };
    }
    return {
      opacity: interpolate(amount, [0, 0.12, 1], [0, 0.46, 0]),
      transform: [{ scale: interpolate(amount, [0, 1], [0.52, expand * 1.18]) }],
    };
  });

  const subStyle = useAnimatedStyle(() => {
    const role = pulseRole.value;
    const amount = pulse.value * motionGain;
    if (amount <= 0.02 || role >= 0.5) {
      return { opacity: 0, transform: [{ scale: 0.55 }] };
    }
    return {
      opacity: interpolate(amount, [0, 0.35, 1], [0, 0.16, 0]),
      transform: [{ scale: interpolate(amount, [0, 1], [0.62, 1.18]) }],
    };
  });

  return (
    <View pointerEvents="none" style={styles.stage}>
      <Animated.View style={[styles.ringSoft, { borderColor: color }, outerStyle]} />
      <Animated.View style={[styles.ring, { borderColor: color }, innerStyle]} />
      <Animated.View style={[styles.ringSub, { borderColor: color }, subStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: '58%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.15,
  },
  ringSoft: {
    position: 'absolute',
    width: '58%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 4,
    opacity: 0.2,
  },
  ringSub: {
    position: 'absolute',
    width: '42%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 0.8,
  },
});
