import { StyleSheet, View } from 'react-native';

import type { PocktDialViewProps } from './types';

export default function PocktDialView(props: PocktDialViewProps) {
  return <View {...props} style={[styles.fallback, props.style]} testID="pockt-dial-web-fallback" />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#050608',
  },
});
