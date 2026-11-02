import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { controlStepDetent } from '@/lib/rotary-feedback';

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  color: string;
  mute: string;
  line: string;
  raised: string;
  size?: 'normal' | 'large';
};

export function nudgeBpm(current: number, delta: number): number {
  return sanitizeBpm(sanitizeBpm(current) + delta, current);
}

export function BpmStepper({ bpm, onChange, color, mute, line, raised, size = 'normal' }: Props) {
  const large = size === 'large';
  const step = (delta: number) => {
    const next = nudgeBpm(bpm, delta);
    if (next === sanitizeBpm(bpm)) return;
    controlStepDetent(true, true);
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease tempo"
        disabled={sanitizeBpm(bpm) <= MIN_BPM}
        onPress={() => step(-1)}
        style={({ pressed }) => [
          styles.btn,
          large && styles.btnLarge,
          { borderColor: line, backgroundColor: raised },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.glyph, large && styles.glyphLarge, { color }]}>−</Text>
      </Pressable>
      <Text style={[styles.range, { color: mute }]}>
        {MIN_BPM}–{MAX_BPM}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase tempo"
        disabled={sanitizeBpm(bpm) >= MAX_BPM}
        onPress={() => step(1)}
        style={({ pressed }) => [
          styles.btn,
          large && styles.btnLarge,
          { borderColor: line, backgroundColor: raised },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.glyph, large && styles.glyphLarge, { color }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  btn: {
    width: 56,
    height: 56,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLarge: {
    width: 64,
    height: 64,
  },
  glyph: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  glyphLarge: {
    fontSize: 36,
  },
  range: {
    minWidth: 72,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
});
