import { StyleSheet, View } from 'react-native';

import { PocktGlassProofView } from '@/modules/pockt-glass-proof';

/** Isolated native iOS glass-instrument proof. Not Beatline. Open via /glass-proof */
export default function GlassProofScreen() {
  return (
    <View style={styles.page} testID="glass-proof-page">
      <PocktGlassProofView style={styles.stage} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#050506',
  },
  stage: {
    flex: 1,
  },
});
