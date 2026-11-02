import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  enabled: boolean;
  playing: boolean;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
};

export function ScreenFlashOverlay({ enabled, playing, pulse, pulseRole }: Props) {
  const style = useAnimatedStyle(() => {
    if (!enabled || !playing) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0, down ? 0.2 : 0.1]),
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.flash, style]} />;
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 18,
  },
});
