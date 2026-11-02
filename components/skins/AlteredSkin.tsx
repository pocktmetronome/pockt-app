import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PressureRings } from '@/components/skins/PressureRings';
import type { SkinViewProps } from '@/components/skins/skin-types';
import { SKIN_ASSETS } from '@/lib/skin-assets';

export function AlteredPulse(props: SkinViewProps) {
  return <AlteredArtwork {...props} />;
}

export function AlteredArtwork({
  pulse,
  glow,
  pulseRole,
  feel,
  silent,
  motionGain,
  visualPulse,
}: SkinViewProps) {
  const { width } = useWindowDimensions();
  const pack = SKIN_ASSETS.altered;
  const emitter = pack.emitter;
  const swamp = feel === 'swampy';
  const push = feel === 'push';
  const straight = feel === 'straight';
  const laid = feel === 'laid-back';
  const rest = silent ? 0.5 : 1;
  const gain = visualPulse ? motionGain * rest : 0;
  const size = Math.round(width * 0.5);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!visualPulse) {
      drift.value = withTiming(0.5, { duration: 400 });
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: swamp ? 5600 : 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [drift, swamp, visualPulse]);

  const fieldStyle = useAnimatedStyle(() => {
    const amount = pulse.value * gain;
    const role = pulseRole.value;
    const down = role >= 1.5;
    const idleY = interpolate(drift.value, [0, 1], [-5, 5]);
    const idleRot = straight ? 0 : interpolate(drift.value, [0, 1], [-0.018, 0.018]);
    const idleScale = interpolate(drift.value, [0, 1], [0.988, 1.012]);
    const peak = down
      ? push
        ? 1.16
        : 0.82
      : push
        ? 1.05
        : straight
          ? 0.97
          : swamp
            ? 0.96
            : 0.95;
    const snapX = push ? interpolate(amount, [0, 1], [0, down ? 8 : 4]) : 0;
    const rot = straight
      ? interpolate(amount, [0, 1], [0, down ? 0.03 : 0.012])
      : push
        ? interpolate(amount, [0, 1], [0, down ? 0.07 : 0.028])
        : interpolate(amount, [0, 1], [0, down ? 0.045 : 0.016]);
    return {
      transform: [
        { translateY: idleY + interpolate(amount, [0, 1], [0, swamp || laid ? 4 : down ? -5 : -2]) },
        { translateX: snapX },
        { rotate: `${idleRot + rot}rad` },
        { scale: idleScale * interpolate(amount, [0, 1], [1, peak]) },
      ],
    };
  });

  const irisStyle = useAnimatedStyle(() => {
    const amount = pulse.value * gain;
    const role = pulseRole.value;
    const down = role >= 1.5;
    const contract = down ? 0.78 : 0.92;
    return {
      opacity: interpolate(amount, [0, 1], [0.18, down ? 0.7 : 0.32]),
      transform: [
        { scale: interpolate(amount, [0, 1], [1, contract]) },
        { rotate: `${interpolate(amount, [0, 1], [0, down ? -0.06 : -0.02])}rad` },
      ],
    };
  });

  const shellStyle = useAnimatedStyle(() => {
    const amount = glow.value * gain;
    const role = pulseRole.value;
    const down = role >= 1.5;
    const idleScale = interpolate(drift.value, [0, 1], [1.01, 1.03]);
    return {
      opacity: interpolate(amount, [0, 1], [0.12, down ? 0.52 : swamp ? 0.32 : 0.24]),
      transform: [
        { translateY: interpolate(drift.value, [0, 1], [3, -3]) },
        { scale: idleScale * interpolate(amount, [0, 1], [1.02, down ? 1.22 : push ? 1.12 : 1.08]) },
      ],
    };
  });

  return (
    <View style={styles.stage} pointerEvents="none">
      <PressureRings
        pulse={pulse}
        pulseRole={pulseRole}
        motionGain={gain * 0.55}
        feel={feel}
        color="rgba(232, 176, 214, 0.42)"
      />
      {emitter ? (
        <View style={{ width: size, height: size, maxHeight: '100%' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, shellStyle]}>
            <Image
              source={emitter}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFillObject, fieldStyle]}>
            <Image
              source={emitter}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFillObject, irisStyle]}>
            <Image
              source={emitter}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
