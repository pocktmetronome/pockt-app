import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import { TIME_SIGNATURES } from '@/constants/meter';
import { hapticSelection } from '@/lib/haptics';
import type { AccentLevel, MetronomeConfig, TimeSignatureId } from '@/lib/types';

type Cell = 'off' | 'kick' | 'snare' | 'hat';

const CYCLE: Cell[] = ['off', 'kick', 'snare', 'hat'];

function cellToAccent(cell: Cell): AccentLevel {
  if (cell === 'kick') return 'strong';
  if (cell === 'snare') return 'normal';
  if (cell === 'hat') return 'soft';
  return 'mute';
}

function accentToCell(level: AccentLevel): Cell {
  if (level === 'strong' || level === 'accent') return 'kick';
  if (level === 'normal') return 'snare';
  if (level === 'soft') return 'hat';
  return 'off';
}

type Props = {
  visible: boolean;
  timeSignature: TimeSignatureId;
  pattern: AccentLevel[];
  onChange: (pattern: AccentLevel[]) => void;
  onChangeConfig: (patch: Partial<MetronomeConfig>) => void;
  onClose: () => void;
};

export function DrumMachineScreen({ visible, timeSignature, pattern, onChange, onChangeConfig, onClose }: Props) {
  const beats = TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? 4;
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: beats }, (_, index) => accentToCell(pattern[index] ?? 'normal'))
  );

  useEffect(() => {
    if (!visible) return;
    setCells(Array.from({ length: beats }, (_, index) => accentToCell(pattern[index] ?? 'normal')));
  }, [beats, pattern, visible]);

  const apply = (next: Cell[]) => {
    setCells(next);
    onChange(next.map(cellToAccent));
  };

  return (
    <UtilityShell
      visible={visible}
      title="DRUM GRID"
      lede="Kick, snare, and hat on the current meter. Playback is the native metronome clock, not a separate sequencer."
      onClose={onClose}>
      <View style={styles.grid}>
        {cells.map((cell, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Step ${index + 1} ${cell}`}
            onPress={() => {
              void hapticSelection();
              const next = [...cells];
              next[index] = CYCLE[(CYCLE.indexOf(cell) + 1) % CYCLE.length] ?? 'off';
              apply(next);
            }}
            style={[styles.cell, cell !== 'off' && styles.cellOn]}>
            <Text style={styles.step}>{index + 1}</Text>
            <Text style={styles.kind}>{cell === 'off' ? '—' : cell.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => {
          onChangeConfig({ sound: 'stick', subdivision: 'sixteenths' });
        }}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.chipText}>USE STICK + 16THS</Text>
      </Pressable>
      <Text style={styles.hint}>Kick = strong. Snare = normal. Hat = soft. Empty = mute. No extra samples are invented.</Text>
    </UtilityShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    width: '22%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: {
    borderColor: Studio.ivory,
    backgroundColor: Studio.bgRaised,
  },
  step: {
    color: Studio.ivoryMute,
    fontSize: 11,
  },
  kind: {
    color: Studio.ivory,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Studio.line,
    justifyContent: 'center',
    marginBottom: 12,
  },
  chipText: {
    color: Studio.ivory,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  hint: {
    color: Studio.ivoryDim,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.8,
  },
});
