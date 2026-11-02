import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';
import { resolveBpmFont, resolveBpmFontSize, type DisplayPrefs } from '@/constants/display';
import { sanitizeBpm } from '@/constants/timing';

type Props = {
  bpm: number;
  onChange?: (bpm: number) => void;
  compact?: boolean;
  prefs: DisplayPrefs;
  onPadOpenChange: (open: boolean) => void;
};

export function BpmDisplay({ bpm, onChange, compact, prefs, onPadOpenChange }: Props) {
  const theme = useSkin();
  const { width, height } = useWindowDimensions();
  const font = resolveBpmFont(prefs.bpmFont);
  const fontSize = resolveBpmFontSize(prefs.bpmSize, compact ? width * 0.92 : width, height);
  const lineHeight = Math.round(fontSize * 1.02);
  const safeBpm = sanitizeBpm(bpm);

  const openPad = () => {
    if (!onChange) return;
    onPadOpenChange(true);
  };

  const valueStyle = {
    color: theme.ivory,
    fontSize,
    lineHeight,
    fontWeight: font.fontWeight,
    letterSpacing: font.letterSpacing,
    textShadowColor: theme.bpmShadow,
    ...(font.fontFamily
      ? { fontFamily: font.fontFamily }
      : { fontVariant: ['tabular-nums'] as 'tabular-nums'[] }),
  };

  return (
    <>
      {prefs.bpmVisible ? (
        <Pressable
          onPress={openPad}
          disabled={!onChange}
          accessibilityRole={onChange ? 'button' : undefined}
          accessibilityLabel={`Tempo ${safeBpm} beats per minute. Double tap to edit.`}
          style={({ pressed }) => [styles.wrap, onChange && styles.hit, pressed && onChange && styles.pressed]}>
          <Text style={[styles.value, valueStyle]} numberOfLines={1} allowFontScaling={false}>
            {safeBpm}
          </Text>
          <Text
            style={[
              styles.unit,
              {
                color: theme.ivoryMute,
                textShadowColor: theme.bpmShadow,
              },
            ]}>
            BPM
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

export function HiddenBpmControl({
  bpm,
  onPress,
  prominent = false,
}: {
  bpm: number;
  onPress: () => void;
  prominent?: boolean;
}) {
  const theme = useSkin();
  const safeBpm = sanitizeBpm(bpm);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tempo ${safeBpm} beats per minute. Double tap to edit.`}
      hitSlop={8}
      style={({ pressed }) => [
        styles.hiddenHit,
        { borderColor: theme.line, backgroundColor: 'rgba(16,14,12,0.42)' },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.hiddenLabel, { color: theme.ivoryMute }]}>BPM</Text>
      <Text style={[styles.hiddenValue, prominent && styles.hiddenValueProminent, { color: theme.ivory }]}>
        {safeBpm}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 96,
  },
  hit: {
    minHeight: 96,
    minWidth: 168,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ translateY: 1 }],
  },
  value: {
    textAlign: 'center',
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  unit: {
    marginTop: -2,
    fontSize: 13,
    letterSpacing: 5,
    fontWeight: '700',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  hiddenHit: {
    minWidth: 58,
    minHeight: 44,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  hiddenValue: {
    marginTop: 1,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hiddenValueProminent: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
});
