import { StyleSheet, View } from 'react-native';

const ON = [1, 1, 1, 1, 1, 1, 1] as const;
const MAP: Record<string, readonly number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': ON,
  '9': [1, 1, 1, 1, 0, 1, 1],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

function Digit({ value, lit, dim, scale = 1 }: { value: string; lit: string; dim: string; scale?: number }) {
  const segs = MAP[value] ?? MAP[' '];
  const s = scale;
  return (
    <View style={[styles.digit, { width: 54 * s, height: 96 * s }]}>
      <View style={[styles.h, { left: 10 * s, right: 10 * s, height: 9 * s, top: 0, backgroundColor: segs[0] ? lit : dim }]} />
      <View style={[styles.v, { width: 9 * s, height: 36 * s, top: 8 * s, right: 0, backgroundColor: segs[1] ? lit : dim }]} />
      <View style={[styles.v, { width: 9 * s, height: 36 * s, bottom: 8 * s, right: 0, backgroundColor: segs[2] ? lit : dim }]} />
      <View style={[styles.h, { left: 10 * s, right: 10 * s, height: 9 * s, bottom: 0, backgroundColor: segs[3] ? lit : dim }]} />
      <View style={[styles.v, { width: 9 * s, height: 36 * s, bottom: 8 * s, left: 0, backgroundColor: segs[4] ? lit : dim }]} />
      <View style={[styles.v, { width: 9 * s, height: 36 * s, top: 8 * s, left: 0, backgroundColor: segs[5] ? lit : dim }]} />
      <View style={[styles.h, { left: 10 * s, right: 10 * s, height: 9 * s, top: 44 * s, backgroundColor: segs[6] ? lit : dim }]} />
    </View>
  );
}

export function DigitalDigits({
  value,
  lit = '#E84838',
  dim = 'rgba(80,18,14,0.28)',
  scale = 1,
}: {
  value: number;
  lit?: string;
  dim?: string;
  scale?: number;
}) {
  const padded = String(Math.max(0, Math.min(999, Math.round(value)))).padStart(3, ' ');
  const s = Math.max(0.42, Math.min(1.4, scale));
  return (
    <View style={[styles.row, { gap: 14 * s }]}>
      {padded.split('').map((ch, index) => (
        <Digit key={`${index}-${ch}`} value={ch} lit={lit} dim={dim} scale={s} />
      ))}
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
  digit: {
    width: 54,
    height: 96,
    position: 'relative',
  },
  h: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 9,
    borderRadius: 2,
  },
  v: {
    position: 'absolute',
    width: 9,
    height: 36,
    borderRadius: 2,
  },
});
