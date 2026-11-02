import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Image as RNImage, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { CoverFocal } from '@/constants/core-rooms';

export type CoverLayout = {
  width: number;
  height: number;
  x: number;
  y: number;
  cover: number;
};

/**
 * Fill the viewport without stretching. Focal stays on-screen.
 * Uses the original asset pixel size — never an intermediate thumbnail.
 */
export function computeCoverLayout(
  imageWidth: number,
  imageHeight: number,
  screenWidth: number,
  screenHeight: number,
  focal: CoverFocal = { x: 0.5, y: 0.5 },
  zoom = 1
): CoverLayout {
  const safeW = Math.max(1, imageWidth);
  const safeH = Math.max(1, imageHeight);
  const cover = Math.max(screenWidth / safeW, screenHeight / safeH) * Math.max(1, zoom);
  const width = safeW * cover;
  const height = safeH * cover;
  let x = screenWidth * focal.x - width * focal.x;
  let y = screenHeight * focal.y - height * focal.y;
  x = Math.min(0, Math.max(screenWidth - width, x));
  y = Math.min(0, Math.max(screenHeight - height, y));
  return {
    width,
    height,
    x,
    y,
    cover,
  };
}

export function useCoverLayout(source: number | undefined, focal: CoverFocal, zoom = 1): CoverLayout {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const resolved = source ? RNImage.resolveAssetSource(source) : undefined;
  return useMemo(
    () =>
      computeCoverLayout(
        resolved?.width ?? screenWidth,
        resolved?.height ?? screenHeight,
        screenWidth,
        screenHeight,
        focal,
        zoom
      ),
    [focal.x, focal.y, resolved?.height, resolved?.width, screenHeight, screenWidth, zoom]
  );
}

type Props = {
  source: number;
  recyclingKey?: string;
  focal?: CoverFocal;
  zoom?: number;
  layout?: CoverLayout;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-viewport cinematic plate.
 * Original 1290×2796 PNG is drawn at cover size with a controlled focal.
 * Never letterboxes, never stretches, never adds extra zoom.
 */
export function CoverEnvironment({
  source,
  recyclingKey,
  focal = { x: 0.5, y: 0.5 },
  zoom = 1,
  layout: layoutProp,
  style,
}: Props) {
  const computed = useCoverLayout(source, focal, zoom);
  const layout = layoutProp ?? computed;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.clip, style]} pointerEvents="none">
      <Image
        source={source}
        style={{
          position: 'absolute',
          top: layout.y,
          left: layout.x,
          width: layout.width,
          height: layout.height,
        }}
        contentFit="fill"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        allowDownscaling={false}
        recyclingKey={recyclingKey}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
