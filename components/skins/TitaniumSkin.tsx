import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  background?: number;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
};

/** Photographic receiver plate. Never rotates. */
export function TitaniumBackdrop({
  background,
  pulse,
  pulseRole,
  playing,
  visualPulse,
  motionGain,
}: Props) {
  const beatStyle = useAnimatedStyle(() => {
    if (!playing || !visualPulse || motionGain <= 0) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0, down ? 0.14 : 0.06]),
    };
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {background ? (
        <Image
          source={background}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          recyclingKey="titanium-background"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#121314' }]} />
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, beatStyle]}>
        <View style={styles.indexWash} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  indexWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(212, 84, 42, 0.1)',
  },
});
