import { Image, StyleSheet, View } from 'react-native';

import { angleFromNorthStarBpm } from '@/lib/native-interaction-math';

const face = require('../../assets/north-star-face/dial-center.png');
const ring = require('../../assets/north-star-face/dial-ring.png');

/** Non-iOS stand-in. The ring uses the same encoder angle as PocktDialControl. */
export function MachinedDial({ bpm }: { bpm: number }) {
  const degrees = (angleFromNorthStarBpm(bpm) * 180) / Math.PI;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={face} style={StyleSheet.absoluteFill} resizeMode="contain" />
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${degrees}deg` }] }]}>
        <Image source={ring} style={StyleSheet.absoluteFill} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
