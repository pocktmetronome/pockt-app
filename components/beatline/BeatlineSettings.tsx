import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalSegment, MetalToggle, SectionLabel } from '@/components/beatline/BeatlineChrome';
import { BeatlineSlider } from '@/components/beatline/BeatlineSlider';
import { P2 } from '@/constants/pockt-2';
import { downbeatAccentOn } from '@/lib/beatline-2';
import { beatlineCountInChoice } from '@/lib/beatline-pulse';
import type { AccentLevel, CountInBars } from '@/lib/types';

type Props = {
  volume: number;
  haptic: boolean;
  countInBars: CountInBars;
  accentPattern: AccentLevel[];
  visualIntensity: number;
  keepAwake: boolean;
  onVolume: (volume: number) => void;
  onHaptic: (haptic: boolean) => void;
  onCountIn: (bars: 0 | 1 | 2) => void;
  onDownbeatAccent: (on: boolean) => void;
  onVisualIntensity: (value: number) => void;
  onKeepAwake: (keepAwake: boolean) => void;
  onBeatAccent: () => void;
  onBack: () => void;
};

export function BeatlineSettings({
  volume,
  haptic,
  countInBars,
  accentPattern,
  visualIntensity,
  keepAwake,
  onVolume,
  onHaptic,
  onCountIn,
  onDownbeatAccent,
  onVisualIntensity,
  onKeepAwake,
  onBeatAccent,
  onBack,
}: Props) {
  const count = beatlineCountInChoice(countInBars);

  return (
    <View style={styles.root}>
      <BeatlineHeader title="SETTINGS / MIX" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionLabel>METRONOME VOLUME</SectionLabel>
        <BeatlineSlider value={volume} onChange={onVolume} accessibilityLabel="Metronome volume" />

        <View style={styles.row}>
          <Text style={styles.label}>HAPTICS FEEDBACK</Text>
          <MetalSegment
            options={[
              { id: 'on', label: 'ON' },
              { id: 'off', label: 'OFF' },
            ]}
            value={haptic ? 'on' : 'off'}
            onChange={(id) => onHaptic(id === 'on')}
          />
        </View>

        <SectionLabel>PERFORMANCE</SectionLabel>
        <View style={styles.row}>
          <Text style={styles.label}>COUNT-IN</Text>
          <MetalSegment
            options={[
              { id: '0', label: 'OFF' },
              { id: '1', label: '1 BAR' },
              { id: '2', label: '2 BARS' },
            ]}
            value={count}
            onChange={(id) => onCountIn(id === '2' ? 2 : id === '1' ? 1 : 0)}
          />
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>DOWNBEAT ACCENT</Text>
            <Text style={styles.link} onPress={onBeatAccent}>
              BEAT / ACCENT
            </Text>
          </View>
          <MetalSegment
            options={[
              { id: 'on', label: 'ON' },
              { id: 'off', label: 'OFF' },
            ]}
            value={downbeatAccentOn(accentPattern) ? 'on' : 'off'}
            onChange={(id) => onDownbeatAccent(id === 'on')}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>BEAT VISUAL INTENSITY</Text>
          <View style={styles.miniSlider}>
            <BeatlineSlider
              value={visualIntensity}
              onChange={onVisualIntensity}
              accessibilityLabel="Beat visual intensity"
              length={120}
            />
          </View>
        </View>

        <SectionLabel>SYSTEM</SectionLabel>
        <View style={styles.row}>
          <Text style={styles.label}>KEEP SCREEN AWAKE</Text>
          <MetalToggle value={keepAwake} onChange={onKeepAwake} accessibilityLabel="Keep screen awake" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  body: {
    paddingBottom: 32,
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: P2.metalHi,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  link: {
    color: P2.signal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  miniSlider: {
    width: 120,
  },
});
