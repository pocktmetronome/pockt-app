import { StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalPill } from '@/components/beatline/BeatlineChrome';
import { BeatlineRail } from '@/components/beatline/BeatlineRail';
import { P2 } from '@/constants/pockt-2';
import { defaultAccentPattern } from '@/lib/accents';
import { beatlineVisibleIndexes } from '@/lib/beatline-pulse';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  downbeatColor: string;
  accentColor: string;
  visualIntensity: number;
  onChange: (pattern: AccentLevel[]) => void;
  onBack: () => void;
};

const STATE_COPY = [
  { title: 'STATE 0', detail: 'MUTED' },
  { title: 'STATE 1', detail: 'LIGHT' },
  { title: 'STATE 2', detail: 'MEDIUM' },
  { title: 'STATE 3', detail: 'STRONG / ACCENT' },
] as const;

export function BeatlineBeatAssignment({
  timeSignature,
  subdivision,
  accentPattern,
  downbeatColor,
  accentColor,
  visualIntensity,
  onChange,
  onBack,
}: Props) {
  const meter = timeSignature.split('-')[0] ?? timeSignature;
  const beatCount = beatlineVisibleIndexes(timeSignature).length;

  return (
    <View style={styles.root}>
      <BeatlineHeader title="BEAT ASSIGNMENT" onBack={onBack} />
      <Text style={styles.kicker}>METER</Text>
      <Text style={styles.hero}>{meter}</Text>
      <BeatlineRail
        timeSignature={timeSignature}
        subdivision={subdivision}
        accentPattern={accentPattern}
        playing={false}
        silent={false}
        downbeatColor={downbeatColor}
        accentColor={accentColor}
        visualIntensity={visualIntensity}
        onChange={onChange}
      />
      <View style={styles.legend}>
        {STATE_COPY.map((item) => (
          <View key={item.title} style={styles.legendItem}>
            <Text style={styles.legendTitle}>{item.title}</Text>
            <Text style={styles.legendDetail}>{item.detail}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>TAP A BEAT TO CHANGE ITS STRENGTH</Text>
      <View style={styles.reset}>
        <MetalPill
          label="RESET"
          onPress={() => onChange(defaultAccentPattern(timeSignature))}
          accessibilityLabel={`Reset ${beatCount} beats to default`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  kicker: {
    color: P2.inkDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 12,
  },
  hero: {
    color: P2.metalHi,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
  },
  legend: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flex: 1,
    alignItems: 'center',
  },
  legendTitle: {
    color: P2.inkMute,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  legendDetail: {
    color: P2.inkDim,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  hint: {
    color: P2.inkDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 28,
  },
  reset: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 18,
  },
});
