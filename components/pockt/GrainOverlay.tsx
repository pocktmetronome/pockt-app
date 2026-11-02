import { Image, StyleSheet, View } from 'react-native';

type Props = {
  opacity?: number;
};

export function GrainOverlay({ opacity = 0.085 }: Props) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Image source={require('@/assets/images/grain.png')} style={[styles.grain, { opacity }]} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  grain: {
    width: '100%',
    height: '100%',
  },
});
