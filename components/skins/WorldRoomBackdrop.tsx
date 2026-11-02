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

import { CoverEnvironment, useCoverLayout } from '@/components/skins/CoverEnvironment';
import { CORE_ROOMS, type CoreRoomId } from '@/constants/core-rooms';

export type WorldMotion = {
  normalScale: number;
  downbeatScale: number;
  pulsePeak: number;
  downbeatPeak: number;
  glow: [string, string, string];
};

type Props = {
  room: CoreRoomId;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  glow: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
  background?: number;
  pulseArt?: number;
  downbeatArt?: number;
  motion: WorldMotion;
};

/**
 * Full-viewport world room. Cover plate + restrained pulse + stronger downbeat.
 * No letterbox, no recycled FX from previous versions.
 */
export function WorldRoomBackdrop({
  room,
  pulse,
  pulseRole,
  glow,
  playing,
  visualPulse,
  motionGain,
  background,
  pulseArt,
  downbeatArt,
  motion,
}: Props) {
  const spec = CORE_ROOMS[room];
  const layout = useCoverLayout(background, spec.roomFocal);
  const enter = useSharedValue(0);
  const drift = useSharedValue(0.5);
  const originX = layout.x + layout.width * spec.roomFocal.x;
  const originY = layout.y + layout.height * spec.roomFocal.y;

  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: spec.enterMs, easing: Easing.out(Easing.cubic) });
  }, [enter, spec.enterMs]);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [drift]);

  const worldStyle = useAnimatedStyle(() => {
    const amount = playing && visualPulse ? Math.max(pulse.value, glow.value * 0.18) * motionGain : 0;
    const down = pulseRole.value >= 1.5;
    const beatScale = interpolate(amount, [0, 1], [1, down ? motion.downbeatScale : motion.normalScale]);
    return {
      opacity: interpolate(enter.value, [0, 0.18, 1], [0.92, 0.98, 1]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-0.45, 0.45]) },
        { translateY: interpolate(drift.value, [0, 1], [0.4, -0.4]) },
        {
          scale: interpolate(enter.value, [0, 1], [spec.roomStartScale, 1]) * beatScale,
        },
      ],
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    if (!playing || !visualPulse || motionGain <= 0) {
      return { opacity: 0, transform: [{ scale: 1 }] };
    }
    const down = pulseRole.value >= 1.5;
    if (down) {
      return { opacity: 0, transform: [{ scale: 1 }] };
    }
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0, motion.pulsePeak]),
      transform: [{ scale: interpolate(amount, [0, 1], [0.996, motion.normalScale]) }],
    };
  });

  const downbeatStyle = useAnimatedStyle(() => {
    if (!playing || !visualPulse || motionGain <= 0) {
      return { opacity: 0, transform: [{ scale: 0.994 }] };
    }
    const down = pulseRole.value >= 1.5;
    if (!down) {
      return { opacity: 0, transform: [{ scale: 0.994 }] };
    }
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 0.45, 1], [0, motion.downbeatPeak, 0.16]),
      transform: [{ scale: interpolate(amount, [0, 1], [0.997, motion.downbeatScale]) }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFillObject, worldStyle]}>
        {background ? (
          <CoverEnvironment source={background} layout={layout} recyclingKey={`${room}-world-v126`} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: spec.fallback }]} />
        )}
      </Animated.View>

      {pulseArt ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            pulseStyle,
            { transformOrigin: `${originX}px ${originY}px` },
          ]}>
          <CoverEnvironment source={pulseArt} layout={layout} recyclingKey={`${room}-pulse-v126`} />
        </Animated.View>
      ) : null}

      {downbeatArt ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            downbeatStyle,
            { transformOrigin: `${originX}px ${originY}px` },
          ]}>
          <CoverEnvironment source={downbeatArt} layout={layout} recyclingKey={`${room}-downbeat-v126`} />
        </Animated.View>
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={motion.glow}
        locations={[0, 0.12, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

export const HEAVY_MOTION: WorldMotion = {
  normalScale: 1.003,
  downbeatScale: 1.006,
  pulsePeak: 0.22,
  downbeatPeak: 0.78,
  glow: ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
};

export const ROOTS_MOTION: WorldMotion = {
  normalScale: 1.002,
  downbeatScale: 1.006,
  pulsePeak: 0.2,
  downbeatPeak: 0.82,
  glow: ['rgba(16,10,6,0.14)', 'rgba(16,10,6,0)', 'rgba(16,10,6,0)'],
};

export const SUNDOWN_MOTION: WorldMotion = {
  normalScale: 1.002,
  downbeatScale: 1.005,
  pulsePeak: 0.18,
  downbeatPeak: 0.7,
  glow: ['rgba(20,10,4,0.14)', 'rgba(20,10,4,0)', 'rgba(20,10,4,0)'],
};
