import { ScrollView, StyleSheet, View } from 'react-native';

import { BeatlineHeader, MetalPill } from '@/components/beatline/BeatlineChrome';
import { TIME_SIGNATURE_ORDER } from '@/constants/meter';
import { BEATLINE_METER_PRESETS } from '@/lib/beatline-2';
import type { TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  onMeter: (id: TimeSignatureId) => void;
  onBack: () => void;
};

export function BeatlineOtherMeters({ timeSignature, onMeter, onBack }: Props) {
  const extras = TIME_SIGNATURE_ORDER.filter((id) => !(BEATLINE_METER_PRESETS as readonly string[]).includes(id));

  return (
    <View style={styles.root}>
      <BeatlineHeader title="OTHER METERS" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {extras.map((id) => (
          <MetalPill
            key={id}
            label={id.replace('-', ' ')}
            selected={timeSignature === id}
            onPress={() => onMeter(id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 32,
    justifyContent: 'center',
  },
});
