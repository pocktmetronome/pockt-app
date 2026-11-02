import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { PhotoDialV3 } from '@/components/classic/PhotoDialV3';

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

export default function DialPhotoV3ProofScreen() {
  const params = useLocalSearchParams<{ bpm?: string }>();
  const bpm = Math.min(400, Math.max(20, Number(one(params.bpm, '120')) || 120));
  return (
    <View style={styles.page}>
      <PhotoDialV3 bpm={bpm} size={320} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#12100e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
