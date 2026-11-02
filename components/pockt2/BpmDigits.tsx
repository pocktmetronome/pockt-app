import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { P2, P2Type } from '@/constants/pockt-2';
import { sanitizeBpm } from '@/constants/timing';
import { tempoName } from '@/lib/tempo-name';

type Props = {
  bpm: number;
  playing?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
};

export function BpmDigits({ bpm, playing = false, compact = false, onPress, onLongPress }: Props) {
  const safe = sanitizeBpm(bpm);
  const size = compact ? 64 : 80;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Tempo ${safe} beats per minute${playing ? ', playing' : ''}. Tap to enter BPM. Long press to tap tempo.`}
      style={({ pressed }) => [styles.wrap, pressed && onPress ? styles.pressed : null]}>
      <View style={[styles.live, playing ? styles.liveOn : styles.liveOff]} />
      <Text
        style={{
          color: P2.ink,
          fontSize: size,
          lineHeight: size + 4,
          fontWeight: P2Type.bpm.fontWeight,
          letterSpacing: P2Type.bpm.letterSpacing,
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          includeFontPadding: false,
        }}
        allowFontScaling={false}
        numberOfLines={1}>
        {safe}
      </Text>
      <Text
        style={{
          marginTop: 2,
          color: P2.inkMute,
          fontSize: 13,
          fontWeight: '500',
          letterSpacing: 1.2,
        }}>
        {tempoName(safe)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
    paddingVertical: 4,
  },
  live: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  liveOn: {
    backgroundColor: P2.signal,
  },
  liveOff: {
    backgroundColor: P2.metalLo,
  },
  pressed: {
    opacity: 0.86,
  },
});
