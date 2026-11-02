import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { Wordmark } from '@/components/brand/Wordmark';
import {
  customColor,
  pocktBackground,
  PHOTO_SCALE_MAX,
  PHOTO_SCALE_MIN,
  sanitizePhotoFit,
  type CustomBackground,
  type CustomPhotoFit,
} from '@/lib/custom-layout';

export type LivePhotoFit = {
  scale: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
};

type Props = {
  background: CustomBackground;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  photoFit?: CustomPhotoFit;
  livePhotoFit?: LivePhotoFit;
};

export function CustomSurface({
  background,
  pulse,
  pulseRole,
  playing,
  visualPulse,
  photoFit,
  livePhotoFit,
}: Props) {
  const edgeGlow = useAnimatedStyle(() => {
    if (!playing || !visualPulse) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    return { opacity: interpolate(pulse.value, [0, 1], [0.04, down ? 0.22 : 0.1]) };
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <CustomBackgroundFill background={background} photoFit={photoFit} livePhotoFit={livePhotoFit} />
      <Animated.View pointerEvents="none" style={[styles.pulse, edgeGlow]} />
    </View>
  );
}

export function CustomBackgroundFill({
  background,
  photoFit,
  livePhotoFit,
}: {
  background: CustomBackground;
  photoFit?: CustomPhotoFit;
  livePhotoFit?: LivePhotoFit;
}) {
  const fit = sanitizePhotoFit(photoFit);
  const restScale = useSharedValue(fit.scale);
  const restX = useSharedValue(fit.x);
  const restY = useSharedValue(fit.y);

  useEffect(() => {
    restScale.value = fit.scale;
    restX.value = fit.x;
    restY.value = fit.y;
  }, [fit.scale, fit.x, fit.y, restScale, restX, restY]);

  const photoStyle = useAnimatedStyle(() => {
    const scale = livePhotoFit ? livePhotoFit.scale.value : restScale.value;
    const x = livePhotoFit ? livePhotoFit.x.value : restX.value;
    const y = livePhotoFit ? livePhotoFit.y.value : restY.value;
    const clamped = Math.min(PHOTO_SCALE_MAX, Math.max(PHOTO_SCALE_MIN, scale));
    const travel = 48 + 132 * clamped;
    return {
      transform: [{ translateX: x * travel }, { translateY: y * travel }, { scale: clamped }],
    };
  });
  if (background.type === 'photo') {
    const pack = pocktBackground('graphite');
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient colors={[...pack.colors]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.markWrap} pointerEvents="none">
          <Wordmark size="ident" accessible={false} />
        </View>
        <Animated.View style={[styles.photoFrame, photoStyle]}>
          <Image
            key={background.uri}
            source={{ uri: background.uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            contentPosition="center"
            cachePolicy="none"
            priority="high"
            transition={0}
            recyclingKey={background.uri}
          />
        </Animated.View>
      </View>
    );
  }
  if (background.type === 'color') {
    return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: customColor(background.id).hex }]} />;
  }
  const pack = pocktBackground(background.id);
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient colors={[...pack.colors]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.markWrap} pointerEvents="none">
        <Wordmark size="ident" accessible={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pulse: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 22,
    borderColor: 'rgba(246, 214, 160, 0.22)',
  },
  markWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  photoFrame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
});
