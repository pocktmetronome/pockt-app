import { Pressable, StyleSheet, Text } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';

type Props = {
  onPress: () => void;
  large?: boolean;
};

export function HomeButton({ onPress, large = false }: Props) {
  const theme = useSkin();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel="HOME"
      style={({ pressed }) => [styles.hit, large && styles.hitLarge, pressed && styles.pressed]}>
      <Text style={[styles.label, large && styles.labelLarge, { color: theme.ivory }]} numberOfLines={1}>
        ‹ HOME
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 72,
    minHeight: 48,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  hitLarge: {
    minWidth: 88,
    minHeight: 60,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  label: {
    fontSize: 16,
    letterSpacing: 1.8,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  labelLarge: {
    fontSize: 18,
  },
});
