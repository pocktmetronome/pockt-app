import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { MixerFader } from '@/components/controls/MixerFader';
import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import {
  COUNT_IN_OPTIONS,
  GAP_OPTIONS,
  PAN_OPTIONS,
  PITCH_PIPE_DEFAULT_HZ,
  PITCH_PIPE_MAX_HZ,
  PITCH_PIPE_MIN_HZ,
  POLYRHYTHM_OPTIONS,
  SWING_OPTIONS,
} from '@/lib/classic-core';
import { hapticSelection } from '@/lib/haptics';
import type { CountInBars, GapPattern, MetronomeConfig, PolyrhythmId, StereoPan, SwingAmount } from '@/lib/types';

type Props = {
  visible: boolean;
  config: MetronomeConfig;
  onChange: (patch: Partial<MetronomeConfig>) => void;
  onClose: () => void;
};

export function ClassicLabScreen({ visible, config, onChange, onClose }: Props) {
  return (
    <UtilityShell
      visible={visible}
      title="RHYTHM LAB"
      lede="Gap click, swing, count-in, pan, and two-layer visuals. The click stays on the native clock."
      onClose={onClose}>
      <Text style={styles.section}>COUNT-IN</Text>
      <ChipRow
        options={COUNT_IN_OPTIONS}
        value={config.countInBars}
        onChange={(countInBars) => onChange({ countInBars: countInBars as CountInBars })}
      />

      <Text style={styles.section}>GAP / COACH</Text>
      <ChipRow
        options={GAP_OPTIONS.filter((item) => item.id !== 'every-other')}
        value={config.lockIn === 'every-other' ? 'one-on-one-off' : config.lockIn}
        onChange={(lockIn) => onChange({ lockIn: lockIn as GapPattern })}
      />
      {config.lockIn === 'custom' ? (
        <Text style={styles.hint}>
          Custom cycle uses {config.gapOnBars} on / {config.gapOffBars} off.
        </Text>
      ) : null}
      {config.lockIn === 'custom' ? (
        <>
          <Stepper
            label="ON BARS"
            value={config.gapOnBars}
            min={1}
            max={16}
            onChange={(gapOnBars) => onChange({ gapOnBars })}
          />
          <Stepper
            label="OFF BARS"
            value={config.gapOffBars}
            min={0}
            max={16}
            onChange={(gapOffBars) => onChange({ gapOffBars })}
          />
        </>
      ) : null}

      <Text style={styles.section}>SWING</Text>
      <ChipRow
        options={SWING_OPTIONS}
        value={config.swing}
        onChange={(swing) => onChange({ swing: swing as SwingAmount })}
      />

      <Text style={styles.section}>POLYRHYTHM</Text>
      <ChipRow
        options={POLYRHYTHM_OPTIONS}
        value={config.polyrhythm}
        onChange={(polyrhythm) => onChange({ polyrhythm: polyrhythm as PolyrhythmId })}
      />
      <Text style={styles.hint}>
        Both layers visualize from the same native measure. Layer A is the audible meter.
      </Text>
      {config.polyrhythm !== 'off' ? (
        <View style={styles.poly}>
          <PolyRow label="A" count={config.polyrhythm === 'custom' ? config.polyA : Number((config.polyrhythm.split(':')[0] ?? '3'))} />
          <PolyRow label="B" count={config.polyrhythm === 'custom' ? config.polyB : Number((config.polyrhythm.split(':')[1] ?? '2'))} />
        </View>
      ) : null}

      <Text style={styles.section}>PAN</Text>
      <ChipRow
        options={PAN_OPTIONS}
        value={config.stereoPan}
        onChange={(stereoPan) => onChange({ stereoPan: stereoPan as StereoPan })}
      />

      <Text style={styles.section}>ACCENT LEVEL</Text>
      <MixerFader value={config.accentVolume} onChange={(accentVolume) => onChange({ accentVolume })} />
      <Text style={styles.section}>SUBDIVISION LEVEL</Text>
      <MixerFader value={config.subVolume} onChange={(subVolume) => onChange({ subVolume })} />

      <Text style={styles.section}>PITCH PIPE</Text>
      <Text style={styles.hint}>A reference {config.pitchPipeHz} Hz. Played only while the metronome is stopped.</Text>
      <Slider
        style={styles.slider}
        minimumValue={PITCH_PIPE_MIN_HZ}
        maximumValue={PITCH_PIPE_MAX_HZ}
        step={1}
        value={config.pitchPipeHz}
        minimumTrackTintColor={Studio.amber}
        maximumTrackTintColor={Studio.line}
        thumbTintColor={Studio.ivory}
        onValueChange={(pitchPipeHz) => onChange({ pitchPipeHz: Math.round(pitchPipeHz) })}
      />
      <Pressable
        onPress={() => onChange({ pitchPipeHz: PITCH_PIPE_DEFAULT_HZ })}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.chipText}>A440</Text>
      </Pressable>
    </UtilityShell>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { id: string | number; label: string }[];
  value: string | number;
  onChange: (id: string | number) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((item) => {
        const selected = item.id === value;
        return (
          <Pressable
            key={String(item.id)}
            onPress={() => {
              void hapticSelection();
              onChange(item.id);
            }}
            style={[styles.chip, selected && styles.chipOn]}>
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <Text style={styles.chipText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
        <Text style={styles.chipText}>+</Text>
      </Pressable>
    </View>
  );
}

function PolyRow({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.polyRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <View key={`${label}-${index}`} style={[styles.dot, index === 0 && styles.dotOn]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
    marginBottom: 8,
    color: Studio.ivoryMute,
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 12,
  },
  hint: {
    color: Studio.ivoryDim,
    marginBottom: 10,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Studio.line,
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: Studio.ivory,
    backgroundColor: Studio.bgRaised,
  },
  chipText: {
    color: Studio.ivoryDim,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  chipTextOn: {
    color: Studio.ivory,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepLabel: {
    color: Studio.ivory,
    width: 88,
    fontWeight: '700',
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    color: Studio.ivory,
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  poly: {
    gap: 8,
    marginBottom: 8,
  },
  polyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Studio.ivoryMute,
  },
  dotOn: {
    backgroundColor: Studio.ivory,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  pressed: {
    opacity: 0.8,
  },
});
