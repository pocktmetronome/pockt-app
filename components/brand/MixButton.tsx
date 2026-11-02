import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';

type Props = {
  onPress: () => void;
  large?: boolean;
};

export function MixButton({ onPress, large = false }: Props) {
  const theme = useSkin();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="MIX"
      style={({ pressed }) => [styles.hit, large && styles.hitLarge, pressed && styles.pressed]}>
      <View style={styles.eq}>
        <View style={[styles.bar, styles.barA, { backgroundColor: theme.ivory }]} />
        <View style={[styles.bar, styles.barB, { backgroundColor: theme.ivory }]} />
        <View style={[styles.bar, styles.barC, { backgroundColor: theme.ivory }]} />
      </View>
      <Text style={[styles.label, large && styles.labelLarge, { color: theme.ivory }]} numberOfLines={1}>
        MIX
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  hitLarge: {
    minWidth: 72,
    minHeight: 60,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  eq: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: {
    width: 3,
    borderRadius: 1,
  },
  barA: {
    height: 8,
  },
  barB: {
    height: 16,
  },
  barC: {
    height: 11,
  },
  label: {
    fontSize: 16,
    letterSpacing: 2.4,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  labelLarge: {
    fontSize: 18,
  },
});
