import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HEADSTOCK_VIEW, NUT_3X3, NUT_6INLINE, nutPoint, pegsFor } from '@/lib/tuner-headstock';
import type { HeadstockStyle } from '@/lib/tuning-profiles';

const HEADSTOCK_IMAGES = {
  '3x3': require('@/assets/tuner/pockt-headstock-3x3-preview.png'),
  '6inline': require('@/assets/tuner/pockt-headstock-6inline-preview.png'),
} as const;

type StringState = 'idle' | 'selected' | 'detected' | 'in-tune';

type Props = {
  style: HeadstockStyle;
  notes: string[];
  selected: number;
  detected: number | null;
  inTune: boolean;
  width: number;
  onSelect: (index: number) => void;
};

function lineStyle(from: { x: number; y: number }, to: { x: number; y: number }, color: string, thick: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    position: 'absolute' as const,
    left: (from.x + to.x) / 2 - len / 2,
    top: (from.y + to.y) / 2 - thick / 2,
    width: len,
    height: thick,
    backgroundColor: color,
    borderRadius: thick,
    transform: [{ rotate: `${angle}deg` }],
  };
}

export function TunerHeadstock({ style, notes, selected, detected, inTune, width, onSelect }: Props) {
  const height = Math.round((width * HEADSTOCK_VIEW.h) / HEADSTOCK_VIEW.w);
  const sx = width / HEADSTOCK_VIEW.w;
  const sy = height / HEADSTOCK_VIEW.h;
  const nut = style === '6inline' ? NUT_6INLINE : NUT_3X3;
  const pegs = pegsFor(style, notes.length);
  const map = (p: { x: number; y: number }) => ({ x: p.x * sx, y: p.y * sy });

  return (
    <View style={{ width, height }}>
      <Image
        source={HEADSTOCK_IMAGES[style]}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={`pockt-headstock-${style}`}
      />
      {notes.map((note, index) => {
        const peg = pegs[index] ?? pegs[pegs.length - 1];
        if (!peg) return null;
        const from = map(nutPoint(notes.length, index, nut));
        const to = map(peg);
        const state: StringState =
          selected === index && inTune ? 'in-tune' : selected === index ? 'selected' : detected === index ? 'detected' : 'idle';
        const color = state === 'in-tune' ? '#3DDC84' : state === 'selected' ? '#E2C47E' : state === 'detected' ? '#D7B56E' : '#8A8074';
        const thick = state === 'idle' ? 1.5 : 2.4;
        return (
          <View key={`${note}-${index}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={lineStyle(from, to, color, thick)} />
            <Text style={[styles.note, { left: to.x + 14, top: to.y - 10, color }]}>{note}</Text>
          </View>
        );
      })}
      {notes.map((note, index) => {
        const peg = pegs[index] ?? pegs[pegs.length - 1];
        if (!peg) return null;
        const to = map(peg);
        const from = map(nutPoint(notes.length, index, nut));
        return (
          <Pressable
            key={`hit-${note}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${note} string`}
            onPress={() => onSelect(index)}
            style={[styles.hit, { left: Math.min(from.x, to.x) - 18, top: Math.min(from.y, to.y) - 18, width: Math.abs(to.x - from.x) + 36, height: Math.abs(to.y - from.y) + 36 }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  hit: {
    position: 'absolute',
  },
});
