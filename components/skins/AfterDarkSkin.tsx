import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { SkinViewProps } from '@/components/skins/skin-types';
import type { FeelId } from '@/lib/types';

type WorldFxProps = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  glow: SharedValue<number>;
  motionGain: number;
  playing: boolean;
  feel: FeelId;
};

/** Sculptural halo lives in the world layers. No floating speaker. */
export function AfterDarkPulse(props: SkinViewProps) {
  return <AfterDarkArtwork {...props} />;
}

export function AfterDarkArtwork(_props: SkinViewProps) {
  return <View pointerEvents="none" style={styles.stage} />;
}

/** Sculptural light lives with the fixture, behind lounge furniture. */
export function AfterDarkSculptureFx({
  pulse,
  pulseRole,
  glow,
  motionGain,
  playing,
}: Omit<WorldFxProps, 'feel'>) {
  return <SculptureBloom pulse={pulse} pulseRole={pulseRole} glow={glow} motionGain={motionGain} playing={playing} />;
}

/** Floor shimmer, warmth, and vapor sit in the room in front of furniture. */
export function AfterDarkAtmosphereFx({ pulse, pulseRole, motionGain, playing, feel }: Omit<WorldFxProps, 'glow'>) {
  return (
    <>
      <RoomWarmth pulse={pulse} pulseRole={pulseRole} motionGain={motionGain} playing={playing} />
      <FloorShimmer pulse={pulse} pulseRole={pulseRole} motionGain={motionGain} playing={playing} />
      <AfterDarkVapor pulse={pulse} pulseRole={pulseRole} motionGain={motionGain} playing={playing} feel={feel} />
    </>
  );
}

function SculptureBloom({
  pulse,
  pulseRole,
  glow,
  motionGain,
  playing,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  glow: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const drift = useSharedValue(0.5);

  useEffect(() => {
    if (!playing || motionGain <= 0) {
      drift.value = withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.sin) });
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 15200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [drift, motionGain, playing]);

  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0, transform: [{ scale: 1 }, { translateX: 0 }, { rotate: '0deg' }] };
    }
    const down = pulseRole.value >= 1.5;
    const amount = Math.max(pulse.value, glow.value * 0.55) * motionGain;
    const rot = interpolate(drift.value, [0, 1], [-0.35, 0.35]);
    const breathe = interpolate(drift.value, [0, 1], [1, 1.01]);
    return {
      opacity: interpolate(amount, [0, 1], [0.05, down ? 0.4 : 0.16]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-1.8, 1.8]) },
        { rotate: `${rot}deg` },
        { scale: breathe * interpolate(amount, [0, 1], [1, down ? 1.018 : 1.008]) },
      ],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.sculpture, style]} />;
}

function RoomWarmth({
  pulse,
  pulseRole,
  motionGain,
  playing,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0.015, down ? 0.1 : 0.04]),
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <LinearGradient
        colors={['rgba(40, 16, 10, 0)', 'rgba(140, 72, 28, 0.38)', 'rgba(196, 140, 72, 0.2)']}
        locations={[0.22, 0.64, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

function FloorShimmer({
  pulse,
  pulseRole,
  motionGain,
  playing,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0, transform: [{ translateY: 0 }] };
    }
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0.08, down ? 0.32 : 0.16]),
      transform: [
        { translateY: interpolate(amount, [0, 1], [3, down ? -4 : -1]) },
        { translateX: interpolate(amount, [0, 1], [0, down ? 1.2 : 0.4]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.floor, style]}>
      <LinearGradient
        colors={['rgba(232, 186, 110, 0)', 'rgba(212, 160, 80, 0.42)', 'rgba(168, 88, 48, 0.18)', 'rgba(0,0,0,0)']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

function AfterDarkVapor({
  pulse,
  pulseRole,
  motionGain,
  playing,
  feel,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
  feel: FeelId;
}) {
  const swamp = feel === 'swampy';
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0, transform: [{ translateY: 0 }, { scale: 1 }] };
    }
    const down = pulseRole.value >= 1.5;
    const amount = down ? pulse.value * motionGain : pulse.value * motionGain * 0.16;
    const rise = swamp ? -10 : -6;
    return {
      opacity: interpolate(amount, [0, 1], [0, down ? 0.32 : 0.08]),
      transform: [
        { translateY: interpolate(amount, [0, 1], [8, rise]) },
        { scale: interpolate(amount, [0, 1], [1, down ? 1.04 : 1.01]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.vapor, style]}>
      <LinearGradient
        colors={['rgba(232, 200, 150, 0)', 'rgba(196, 148, 88, 0.22)', 'rgba(80, 28, 24, 0.08)', 'rgba(0,0,0,0)']}
        locations={[0, 0.38, 0.7, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
  },
  sculpture: {
    position: 'absolute',
    left: '4%',
    top: '14%',
    width: '42%',
    height: '52%',
    borderRadius: 220,
    backgroundColor: 'rgba(232, 186, 110, 0.2)',
    shadowColor: '#E8C078',
    shadowOpacity: 0.7,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '32%',
  },
  vapor: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    bottom: '6%',
    height: '38%',
  },
});
