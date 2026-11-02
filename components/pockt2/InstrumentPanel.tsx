import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { P2, P2MetalFill, P2Radius } from '@/constants/pockt-2';

type Props = {
  children: ReactNode;
  padded?: boolean;
};

export function InstrumentPanel({ children, padded = true }: Props) {
  return (
    <View style={[styles.panel, padded && styles.padded]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.edge} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: P2Radius.panel,
    overflow: 'hidden',
    backgroundColor: P2.fieldPanel,
  },
  padded: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: P2Radius.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
  },
});
