import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { SKINS } from '@/constants/skins';
import { skinOpeningAsset } from '@/lib/skin-assets';
import type { SkinId } from '@/lib/types';

type Props = {
  active: boolean;
  skin: SkinId;
};

const RECENT_MS = 75_000;
const lastPlayed: Partial<Record<SkinId, number>> = {};
let reduceMotion = false;

AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reduceMotion = value;
  })
  .catch(() => {
    reduceMotion = false;
  });
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
  reduceMotion = value;
});

function shouldSkip(skin: SkinId): boolean {
  if (reduceMotion) return true;
  const previous = lastPlayed[skin];
  return previous != null && Date.now() - previous < RECENT_MS;
}

/**
 * Cinematic opening plate. Visual-only. Never touches the native audio clock.
 * Fallback color is mounted first so there is never a black frame.
 */
export function RoomReveal({ active, skin }: Props) {
  const source = skinOpeningAsset(skin);
  const fallback = SKINS[skin].bg;
  const progress = useSharedValue(active && source ? 0 : 1);
  const [visible, setVisible] = useState(Boolean(source && active));
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelAnimation(progress);
    };
  }, [progress]);

  useEffect(() => {
    if (!active || !source) {
      progress.value = 1;
      setVisible(false);
      setReady(false);
      return;
    }
    setVisible(true);
    if (shouldSkip(skin)) {
      progress.value = 1;
      setVisible(false);
      return;
    }
    lastPlayed[skin] = Date.now();
    progress.value = 0;
    const start = () => {
      if (!mounted.current) return;
      progress.value = withDelay(
        150,
        withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done && mounted.current) runOnJS(setVisible)(false);
        })
      );
    };
    if (ready) start();
    else {
      const timer = setTimeout(start, 160);
      return () => clearTimeout(timer);
    }
  }, [active, progress, ready, skin, source]);

  const plateStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.62, 0.86, 1], [0, 1, 1, 0.28, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 0.72, 1], [1.012, 1.02, 1.03]) }],
  }));

  if (!source) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.wrap, { backgroundColor: fallback }]}>
      {visible ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, plateStyle]}>
          <Image
            source={source}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey={`${skin}-opening`}
            onLoad={() => setReady(true)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 8,
    overflow: 'hidden',
  },
});
