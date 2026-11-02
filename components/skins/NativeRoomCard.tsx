import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { SKINS } from '@/constants/skins';
import type { SkinId } from '@/lib/types';

type Props = {
  skin: SkinId;
};

/** Strong preview treatment without requiring giant artwork. */
export function NativeRoomCard({ skin }: Props) {
  const theme = SKINS[skin];
  const colors =
    skin === 'classic'
      ? (['#1C2028', '#0C0D10', '#141820'] as const)
      : skin === 'titanium'
        ? (['#2A2C2E', '#121314', '#1A1C1E'] as const)
      : skin === 'heavy'
        ? (['#1A1212', '#09090B', '#201414'] as const)
        : skin === 'roots'
          ? (['#2A1E14', '#14100C', '#1C1610'] as const)
          : skin === 'sundown'
            ? (['#3A2214', '#16100C', '#2A1810'] as const)
            : ([theme.bgRaised, theme.bg, theme.bgPanel] as const);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={[...colors]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.swatch, { backgroundColor: theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  swatch: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
