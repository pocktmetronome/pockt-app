import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2Type } from '@/constants/pockt-2';
import { resolveBpmFont, resolveBpmFontSize, type DisplayPrefs } from '@/constants/display';
import { sanitizeBpm } from '@/constants/timing';
import { tempoName } from '@/lib/tempo-name';

type Props = {
  bpm: number;
  playing?: boolean;
  compact?: boolean;
  prefs: DisplayPrefs;
  onPress?: () => void;
};

export function BpmReadout({ bpm, playing = false, compact = false, prefs, onPress }: Props) {
  const safe = sanitizeBpm(bpm);
  const font = resolveBpmFont(prefs.bpmFont);
  const fontSize = Math.min(resolveBpmFontSize(prefs.bpmSize, compact ? 320 : 390, 844), compact ? 64 : 84);

  const valueStyle = {
    color: playing ? P2.ink : P2.ink,
    fontSize,
    lineHeight: Math.round(fontSize * 1.02),
    fontWeight: font.fontWeight,
    letterSpacing: font.letterSpacing ?? P2Type.bpm.letterSpacing,
    ...(font.fontFamily
      ? { fontFamily: font.fontFamily }
      : { fontVariant: ['tabular-nums'] as 'tabular-nums'[] }),
  };

  if (!prefs.bpmVisible) return null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Tempo ${safe} beats per minute${playing ? ', playing' : ''}.`}
      style={({ pressed }) => [styles.wrap, pressed && onPress && styles.pressed]}>
      <View style={styles.row}>
        <Text style={[styles.value, valueStyle]} numberOfLines={1} allowFontScaling={false}>
          {safe}
        </Text>
        <Text style={styles.unit}>BPM</Text>
      </View>
      <Text style={[styles.tempo, playing && styles.tempoLive]}>{tempoName(safe)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 88,
    minWidth: 132,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  value: {
    includeFontPadding: false,
  },
  unit: {
    color: P2.inkMute,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  tempo: {
    marginTop: -2,
    color: P2.inkMute,
    fontSize: 15,
    fontWeight: '500',
  },
  tempoLive: {
    color: P2.signal,
  },
  pressed: {
    opacity: 0.82,
  },
});
