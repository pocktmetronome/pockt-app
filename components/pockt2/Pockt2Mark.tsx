import { Image } from 'expo-image';
import { View } from 'react-native';

import { POCKT_2_MARK } from '@/lib/brand-assets';

/**
 * Approved POCKT 2.0 P mark. Raster only — never redrawn or approximated.
 */
type Props = {
  size?: number;
  accessible?: boolean;
};

export function Pockt2Mark({ size = 36, accessible = true }: Props) {
  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? 'POCKT' : undefined}
      style={{ width: size, height: size }}>
      <Image
        source={POCKT_2_MARK}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
    </View>
  );
}
