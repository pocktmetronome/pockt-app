import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2Radius, P2Touch } from '@/constants/pockt-2';

type Props = {
  label: string;
  value: string;
  onPress: () => void;
  active?: boolean;
};

export function ValueCell({ label, value, onPress, active = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, active && styles.valueActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {active ? <View style={styles.signal} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minHeight: P2Touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  label: {
    color: P2.inkDim,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: P2.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  valueActive: {
    color: P2.signal,
  },
  signal: {
    marginTop: 5,
    width: 6,
    height: 6,
    borderRadius: P2Radius.pill,
    backgroundColor: P2.signal,
  },
  pressed: {
    opacity: 0.8,
  },
});
