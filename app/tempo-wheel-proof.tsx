import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { HorizontalTempoWheel } from '@/components/classic/HorizontalTempoWheel';

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

export default function TempoWheelProofScreen() {
  const params = useLocalSearchParams<{ bpm?: string }>();
  const roller = Math.min(400, Math.max(20, Number(one(params.bpm, '120')) || 120));
  const bpm = Math.min(400, Math.max(20, Math.floor(roller + 1e-6)));
  return (
    <View style={styles.page}>
      <Text style={styles.title}>{roller.toFixed(2)}</Text>
      <View testID={`tempo-wheel-ready-${roller.toFixed(2)}`}>
        <HorizontalTempoWheel key={roller.toFixed(2)} bpm={bpm} roller={roller} width={320} onChange={() => undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#07080B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#E7D7B8',
    marginBottom: 16,
    fontWeight: '700',
  },
});
