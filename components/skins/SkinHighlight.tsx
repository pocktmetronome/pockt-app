import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { SkinId } from '@/lib/types';

type Props = {
  source: number;
  glow: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  motionGain: number;
  skin: SkinId;
};

/**
 * Per-pocket light rest + restrained beat lift.
 * No whole-screen zoom. No shared blink curve.
 */
const PEAK: Record<SkinId, { rest: number; beat: number; accent: number }> = {
  classic: { rest: 0.08, beat: 0.16, accent: 0.28 },
  titanium: { rest: 0.06, beat: 0.12, accent: 0.22 },
  studio: { rest: 0.42, beat: 0.54, accent: 0.7 },
  altered: { rest: 0.06, beat: 0.3, accent: 0.72 },
  'after-dark': { rest: 0.3, beat: 0.4, accent: 0.54 },
  bar: { rest: 0.08, beat: 0.12, accent: 0.2 },
  heavy: { rest: 0.12, beat: 0.22, accent: 0.38 },
  roots: { rest: 0.16, beat: 0.26, accent: 0.4 },
  sundown: { rest: 0.14, beat: 0.24, accent: 0.4 },
  heart: { rest: 0.18, beat: 0.32, accent: 0.52 },
};

export function SkinHighlight({ source, glow, pulseRole, playing, motionGain, skin }: Props) {
  const style = useAnimatedStyle(() => {
    const peaks = PEAK[skin];
    if (!playing || motionGain <= 0) {
      return { opacity: peaks.rest, transform: [{ scale: 1 }, { translateX: 0 }] };
    }
    const accent = pulseRole.value >= 1.5;
    const peak = (accent ? peaks.accent : peaks.beat) * Math.min(1.12, motionGain);
    const shift = skin === 'after-dark' ? (accent ? 1.6 : 0.6) : 0;
    return {
      opacity: interpolate(glow.value, [0, 1], [peaks.rest, peak]),
      transform: [
        { scale: 1 },
        { translateX: interpolate(glow.value, [0, 1], [0, shift]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
    </Animated.View>
  );
}
