import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';
import { TIME_SIGNATURES } from '@/constants/meter';
import { accentLabel, accentStrength, cycleBeatBlock } from '@/lib/accents';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

type Variant = 'classic' | 'room' | 'heavy' | 'roots';

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent: boolean;
  accentPattern: AccentLevel[];
  onChange: (pattern: AccentLevel[]) => void;
  variant?: Variant;
  compact?: boolean;
};

export function BeatAccentStrip({
  timeSignature,
  beatIndex,
  playing,
  silent,
  accentPattern,
  onChange,
  variant = 'room',
  compact: compactScreen = false,
}: Props) {
  const theme = useSkin();
  const count = TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? 4;
  const classic = variant === 'classic';
  const heavy = variant === 'heavy';
  const roots = variant === 'roots';
  const scroll = count > 6;
  const box = compactScreen ? 48 : 52;

  const cycleBeat = (index: number) => {
    const current = accentPattern[index] ?? 'normal';
    const nextLevel = cycleBeatBlock(current);
    const next = [...accentPattern];
    next[index] = nextLevel;
    const strength = accentStrength(nextLevel);
    if (strength === 0) void hapticLight();
    else if (strength === 1) void hapticSelection();
    else if (strength === 2) void hapticMedium();
    else void hapticHeavy();
    onChange(next);
  };

  const items = Array.from({ length: count }, (_, index) => {
    const level = accentPattern[index] ?? 'normal';
    const strength = accentStrength(level);
    const active = playing && index === beatIndex;
    const fill =
      strength === 0
        ? 'transparent'
        : strength === 3
          ? theme.lampDown
          : strength === 2
            ? theme.lampOn
            : theme.accentSoft;

    return (
      <Pressable
        key={index}
        accessibilityRole="button"
        accessibilityLabel={`Beat ${index + 1}, ${accentLabel(level)}`}
        onPress={() => cycleBeat(index)}
        style={({ pressed }) => [
          styles.column,
          { width: scroll ? 48 : undefined, flex: scroll ? undefined : 1, opacity: pressed ? 0.82 : 1 },
        ]}>
        <View
          style={[
            styles.track,
            {
              height: box,
              borderRadius: heavy ? 2 : roots ? 8 : 6,
              borderColor: strength === 0 ? 'rgba(244,246,250,0.28)' : 'rgba(244,246,250,0.12)',
              backgroundColor: 'transparent',
            },
          ]}>
          {strength > 0 ? (
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.round((strength === 1 ? 0.38 : strength === 2 ? 0.7 : 1) * 100)}%`,
                  backgroundColor: fill,
                  opacity: silent ? 0.32 : active ? 1 : strength === 1 ? 0.62 : 0.92,
                  borderRadius: heavy ? 1 : roots ? 5 : 3,
                },
              ]}
            />
          ) : null}
        </View>
        <Text
          style={[
            styles.num,
            {
              color: active ? theme.ivory : theme.ivoryMute,
              fontSize: count >= 8 ? 10 : 11,
            },
          ]}>
          {index + 1}
        </Text>
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.well,
        {
          backgroundColor: classic
            ? 'rgba(12,14,18,0.72)'
            : heavy
              ? 'rgba(6,4,6,0.42)'
              : roots
                ? 'rgba(18,12,6,0.36)'
                : 'rgba(8,6,5,0.28)',
          borderColor: classic
            ? 'rgba(244,246,250,0.1)'
            : heavy
              ? 'rgba(196,52,44,0.22)'
              : roots
                ? 'rgba(212,168,104,0.2)'
                : 'rgba(237,230,216,0.12)',
          borderRadius: heavy ? 2 : roots ? 14 : 12,
        },
      ]}>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {items}
        </ScrollView>
      ) : (
        <View style={styles.row}>{items}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingRight: 4,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
    minWidth: 44,
  },
  track: {
    width: '100%',
    minWidth: 36,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  bar: {
    width: '100%',
  },
  num: {
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
});
