import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { warnMissingAsset } from '@/lib/skin-assets';

type Props = {
  path: string;
  label?: string;
};

export function AssetSlot({ path, label }: Props) {
  useEffect(() => {
    warnMissingAsset(path);
  }, [path]);

  return (
    <View style={styles.slot} accessibilityLabel={`Missing artwork ${path}`}>
      <Text style={styles.kicker}>{label ?? 'ARTWORK SLOT'}</Text>
      <Text style={styles.path}>{path}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#100E0C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(237,230,216,0.12)',
  },
  kicker: {
    color: 'rgba(237,230,216,0.38)',
    fontSize: 11,
    letterSpacing: 3.2,
    fontWeight: '700',
    marginBottom: 10,
  },
  path: {
    color: 'rgba(237,230,216,0.55)',
    fontSize: 13,
    letterSpacing: 0.3,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
