import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalPill, MetalSegment, SectionLabel } from '@/components/beatline/BeatlineChrome';
import { P2 } from '@/constants/pockt-2';
import { downbeatAccentOn, soundTitle } from '@/lib/beatline-2';
import type { AccentLevel, SoundId } from '@/lib/types';

type Props = {
  accentPattern: AccentLevel[];
  downbeatColor: string;
  accentColor: string;
  downbeatSound: SoundId | null;
  accentSound: SoundId | null;
  onDownbeatAccent: (on: boolean) => void;
  onAssignment: () => void;
  onPickDownbeatColor: () => void;
  onPickAccentColor: () => void;
  onPickDownbeatSound: () => void;
  onPickAccentSound: () => void;
  onBack: () => void;
};

export function BeatlineBeatAccent({
  accentPattern,
  downbeatColor,
  accentColor,
  downbeatSound,
  accentSound,
  onDownbeatAccent,
  onAssignment,
  onPickDownbeatColor,
  onPickAccentColor,
  onPickDownbeatSound,
  onPickAccentSound,
  onBack,
}: Props) {
  return (
    <View style={styles.root}>
      <BeatlineHeader title="BEAT / ACCENT" onBack={onBack} />

      <SectionLabel>BEAT ASSIGNMENT</SectionLabel>
      <MetalPill label="BEAT ASSIGNMENT" onPress={onAssignment} selected />

      <SectionLabel>DOWNBEAT</SectionLabel>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>DOWNBEAT ACCENT</Text>
          <MetalSegment
            options={[
              { id: 'on', label: 'ON' },
              { id: 'off', label: 'OFF' },
            ]}
            value={downbeatAccentOn(accentPattern) ? 'on' : 'off'}
            onChange={(id) => onDownbeatAccent(id === 'on')}
          />
        </View>
        <ColorSwatch label="Downbeat color" color={downbeatColor} onPress={onPickDownbeatColor} />
      </View>

      <SectionLabel>ACCENT</SectionLabel>
      <View style={styles.row}>
        <Text style={styles.label}>ACCENT COLOR</Text>
        <ColorSwatch label="Accent color" color={accentColor} onPress={onPickAccentColor} />
      </View>

      <SectionLabel>SOUND BEHAVIOR</SectionLabel>
      <MetalPill
        label={`DOWNBEAT SOUND  ${downbeatSound ? soundTitle(downbeatSound) : 'FAMILY'}`}
        onPress={onPickDownbeatSound}
      />
      <View style={styles.gap} />
      <MetalPill
        label={`ACCENT SOUND  ${accentSound ? soundTitle(accentSound) : 'FAMILY'}`}
        onPress={onPickAccentSound}
      />
    </View>
  );
}

function ColorSwatch({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.swatchHit}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: P2.metalHi,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  swatchHit: {
    width: 56,
    height: 56,
    borderRadius: 14,
    padding: 4,
    backgroundColor: '#1C2026',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.22)',
  },
  swatch: {
    flex: 1,
    borderRadius: 10,
  },
  gap: {
    height: 8,
  },
});
