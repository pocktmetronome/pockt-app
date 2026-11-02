import { StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalPill, MetalRoundButton, SectionLabel } from '@/components/beatline/BeatlineChrome';
import { SUBDIVISIONS } from '@/constants/meter';
import { P2 } from '@/constants/pockt-2';
import { BEATLINE_METER_PRESETS, BEATLINE_SUBDIVISIONS } from '@/lib/beatline-2';
import type { SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  onMeter: (id: TimeSignatureId) => void;
  onSubdivision: (id: SubdivisionId) => void;
  onOtherMeters: () => void;
  onBack: () => void;
};

export function BeatlineRhythm({
  timeSignature,
  subdivision,
  onMeter,
  onSubdivision,
  onOtherMeters,
  onBack,
}: Props) {
  const meterLabel = timeSignature.split('-')[0] ?? timeSignature;

  return (
    <View style={styles.root}>
      <BeatlineHeader title="RHYTHM" onBack={onBack} />
      <SectionLabel>METER</SectionLabel>
      <Text style={styles.hero}>{meterLabel}</Text>

      <View style={styles.presetRail}>
        {BEATLINE_METER_PRESETS.map((id) => {
          const on = timeSignature === id || timeSignature.split('-')[0] === id;
          return (
            <View key={id} style={styles.presetSlot}>
              <MetalRoundButton
                accessibilityLabel={`Meter ${id}`}
                onPress={() => onMeter(id)}
                size={44}
                glow={on}>
                <Text style={[styles.presetText, on && styles.presetOn]}>{id}</Text>
              </MetalRoundButton>
            </View>
          );
        })}
      </View>

      <View style={styles.other}>
        <MetalPill label="OTHER METERS" onPress={onOtherMeters} />
      </View>

      <SectionLabel>SUBDIVISION</SectionLabel>
      <View style={styles.grid}>
        {BEATLINE_SUBDIVISIONS.map((id) => {
          const item = SUBDIVISIONS[id];
          const on = subdivision === id;
          return (
            <View key={id} style={styles.cell}>
              <MetalRoundButton
                accessibilityLabel={item.label}
                onPress={() => onSubdivision(id)}
                size={56}
                glow={on}>
                <Text style={[styles.symbol, on && styles.symbolOn]}>{item.symbol}</Text>
              </MetalRoundButton>
              <Text style={styles.cellLabel}>{item.label.toUpperCase()}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  hero: {
    color: P2.metalHi,
    fontSize: 72,
    lineHeight: 76,
    fontWeight: '300',
    letterSpacing: -1.4,
    textAlign: 'center',
    marginBottom: 18,
  },
  presetRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C2026',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.16)',
  },
  presetSlot: {
    alignItems: 'center',
  },
  presetText: {
    color: P2.metal,
    fontSize: 11,
    fontWeight: '700',
  },
  presetOn: {
    color: P2.ink,
  },
  other: {
    alignItems: 'center',
    marginVertical: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 4,
  },
  cell: {
    width: '21%',
    alignItems: 'center',
    gap: 6,
  },
  symbol: {
    color: P2.metalHi,
    fontSize: 20,
    fontWeight: '500',
  },
  symbolOn: {
    color: P2.ink,
  },
  cellLabel: {
    color: P2.inkDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
