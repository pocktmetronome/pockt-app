import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';

type PartProps = {
  source: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  fill?: number;
  circular?: boolean;
  pointerEvents?: 'none' | 'auto' | 'box-none';
};

/** Production raster, never stretched non-uniformly. `fill` zooms padded circular art. */
export function BeatlinePart({
  source,
  style,
  contentFit = 'contain',
  fill = 1,
  circular = false,
  pointerEvents = 'none',
}: PartProps) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={[styles.clip, circular && styles.circle, style]}>
      <Image
        source={source}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={0}
        style={[StyleSheet.absoluteFillObject, fill !== 1 ? { transform: [{ scale: fill }] } : null]}
      />
    </View>
  );
}

type RotatingProps = {
  source: number;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: AnimatedStyle<ViewStyle>;
  fill?: number;
};

export function BeatlineRotatingPart({ source, style, animatedStyle, fill = 1.08 }: RotatingProps) {
  return (
    <Animated.View pointerEvents="none" style={[styles.clip, styles.circle, style, animatedStyle]}>
      <Image
        source={source}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        style={[StyleSheet.absoluteFillObject, fill !== 1 ? { transform: [{ scale: fill }] } : null]}
      />
    </Animated.View>
  );
}

type HousingProps = {
  source: number;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  pressIn?: boolean;
  fill?: number;
  children?: ReactNode;
  hitSlop?: number;
};

export function BeatlineHousingButton({
  source,
  size,
  onPress,
  accessibilityLabel,
  pressIn = false,
  fill = 1.04,
  children,
  hitSlop = 10,
}: HousingProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={pressIn ? undefined : onPress}
      onPressIn={pressIn ? onPress : undefined}
      hitSlop={hitSlop}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}>
      <BeatlinePart source={source} circular fill={fill} style={StyleSheet.absoluteFill} />
      {children ? <View pointerEvents="none" style={styles.glyph}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  circle: {
    borderRadius: 999,
  },
  glyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
