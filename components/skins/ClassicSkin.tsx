import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
};

/** Neutral instrument surface. No scenic animation. */
export function ClassicBackdrop({ pulse, pulseRole, playing, visualPulse, motionGain }: Props) {
  const beatStyle = useAnimatedStyle(() => {
    if (!playing || !visualPulse || motionGain <= 0) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0, down ? 0.16 : 0.07]),
    };
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={['#14161B', '#0C0D10', '#08090C']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(126,162,200,0.08)', 'rgba(126,162,200,0)', 'rgba(0,0,0,0.22)']}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.panel} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, beatStyle]}>
        <LinearGradient
          colors={['rgba(168,198,226,0.16)', 'rgba(168,198,226,0)', 'rgba(168,198,226,0)']}
          locations={[0, 0.22, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '18%',
    bottom: '16%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,246,250,0.06)',
    backgroundColor: 'rgba(22, 24, 29, 0.35)',
  },
});
