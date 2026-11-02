import { Image } from 'expo-image';
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

import { SKIN_ASSETS } from '@/lib/skin-assets';
import type { RoomId } from '@/lib/types';

type Props = {
  id: Extract<RoomId, 'studio' | 'altered' | 'bar' | 'after-dark'>;
  active: boolean;
  reduceMotion: boolean;
};

export function ImmersivePreviewTile({ id, active, reduceMotion }: Props) {
  if (id === 'studio') return <StudioPreview active={active} reduceMotion={reduceMotion} />;
  if (id === 'altered') return <AlteredPreview active={active} reduceMotion={reduceMotion} />;
  if (id === 'bar') return <BarPreview />;
  return <AfterDarkPreview active={active} reduceMotion={reduceMotion} />;
}

function usePulse(active: boolean, reduceMotion: boolean, duration: number) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      pulse.value = withTiming(0.22, { duration: 160 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: reduceMotion ? duration * 1.6 : duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      pulse.value = 0;
    };
  }, [active, duration, pulse, reduceMotion]);
  return pulse;
}

function StudioPreview({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const pack = SKIN_ASSETS.studio;
  const pulse = usePulse(active, reduceMotion, 1400);
  const glow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.16, reduceMotion ? 0.32 : 0.5]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, reduceMotion ? 1.01 : 1.03]) }],
  }));
  const mic = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, reduceMotion ? 1.008 : 1.02]) }],
  }));
  const bloom = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.08, reduceMotion ? 0.18 : 0.34]),
  }));

  return (
    <View style={styles.root} importantForAccessibility="no" accessibilityElementsHidden>
      {pack.background ? (
        <Image
          source={pack.background}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="studio-tile-bg"
        />
      ) : null}
      <Animated.View style={[styles.micStage, mic]}>
        {pack.focal ? (
          <Image
            source={pack.focal}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey="studio-tile-mic"
          />
        ) : null}
      </Animated.View>
      {pack.light ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, glow]}>
          <Image
            source={pack.light}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey="studio-tile-light"
          />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.studioBloom, bloom]} />
    </View>
  );
}

function AlteredPreview({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const pack = SKIN_ASSETS.altered;
  const pulse = usePulse(active, reduceMotion, 1800);
  const eye = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, reduceMotion ? 1.015 : 1.04]) },
      { rotate: `${interpolate(pulse.value, [0, 1], [-0.6, 0.6])}deg` },
    ],
  }));
  const iris = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.2, reduceMotion ? 0.34 : 0.55]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, reduceMotion ? 0.96 : 0.88]) }],
  }));

  return (
    <View style={styles.root} importantForAccessibility="no" accessibilityElementsHidden>
      {pack.background ? (
        <Image
          source={pack.background}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="altered-tile-bg"
        />
      ) : null}
      {pack.emitter ? (
        <Animated.View style={[styles.eyeStage, eye]}>
          <Image
            source={pack.emitter}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey="altered-tile-eye"
          />
          <Animated.View pointerEvents="none" style={[styles.iris, iris]} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function BarPreview() {
  const pack = SKIN_ASSETS.bar;
  return (
    <View style={styles.root} importantForAccessibility="no" accessibilityElementsHidden>
      {pack.background ? (
        <Image
          source={pack.background}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="bar-tile-bg"
        />
      ) : null}
    </View>
  );
}

function AfterDarkPreview({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const pack = SKIN_ASSETS['after-dark'];
  const pulse = usePulse(active, reduceMotion, 2200);
  const core = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(pulse.value, [0, 1], [-4, 4])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [1, reduceMotion ? 1.01 : 1.03]) },
    ],
  }));
  const field = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.14, reduceMotion ? 0.26 : 0.4]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.94, 1.06]) }],
  }));

  return (
    <View style={styles.root} importantForAccessibility="no" accessibilityElementsHidden>
      {pack.background ? (
        <Image
          source={pack.background}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="after-dark-tile-bg"
        />
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.quantumField, field]} />
      {pack.focal ? (
        <Animated.View style={[styles.quantumStage, core]}>
          <Image
            source={pack.focal}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey="after-dark-tile-core"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#080706',
  },
  micStage: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    top: '4%',
    bottom: '18%',
  },
  studioBloom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(196,168,96,0.16)',
  },
  eyeStage: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '8%',
    bottom: '20%',
  },
  iris: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(232,176,214,0.18)',
  },
  quantumStage: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '6%',
    bottom: '16%',
  },
  quantumField: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '16%',
    bottom: '24%',
    borderRadius: 999,
    backgroundColor: 'rgba(196,140,72,0.2)',
  },
});
