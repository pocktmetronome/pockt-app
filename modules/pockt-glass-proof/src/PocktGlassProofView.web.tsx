import { StyleSheet, Text, View } from 'react-native';

import type { PocktGlassProofViewProps } from './types';

export default function PocktGlassProofView(props: PocktGlassProofViewProps) {
  return (
    <View {...props} style={[styles.fallback, props.style]} testID="glass-proof-web-fallback">
      <Text style={styles.title}>GLASS PROOF</Text>
      <Text style={styles.body}>Native iOS Metal prototype. Open this route on a physical iPhone after a native rebuild.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#050506',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#C9C2B4',
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 12,
  },
  body: {
    color: '#8A8278',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
