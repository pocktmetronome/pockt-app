import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { AssetSlot } from '@/components/skins/AssetSlot';

type Props = {
  source: number | null;
  path: string;
  contentFit?: 'cover' | 'contain';
  contentPosition?: 'top' | 'center';
  style?: StyleProp<ViewStyle>;
  label?: string;
};

export function SkinImage({
  source,
  path,
  contentFit = 'cover',
  contentPosition = 'center',
  style,
  label,
}: Props) {
  if (!source) {
    return (
      <View style={[styles.fill, style]}>
        <AssetSlot path={path} label={label} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        contentPosition={contentPosition}
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
