import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

type Props = {
  source: number;
  contentFit?: 'cover' | 'contain';
  recyclingKey?: string;
};

export function FullBleedImage({ source, contentFit = 'cover', recyclingKey }: Props) {
  return (
    <Image
      source={source}
      style={StyleSheet.absoluteFillObject}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority="high"
      transition={0}
      recyclingKey={recyclingKey}
    />
  );
}
