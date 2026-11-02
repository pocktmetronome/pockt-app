import { Pressable, StyleSheet, Text } from 'react-native';

import { P2, P2Radius } from '@/constants/pockt-2';

type Props = {
  onPress: () => void;
  flash: number;
  size?: 'normal' | 'compact';
};

export function TapTempo({ onPress, flash, size = 'normal' }: Props) {
  const lit = flash % 2 === 1;
  const compact = size === 'compact';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Tap tempo"
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        (pressed || lit) && styles.lit,
      ]}>
      <Text style={[styles.label, compact && styles.labelCompact, (lit || false) && styles.labelLit]}>Tap</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 72,
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
    backgroundColor: P2.fieldRaised,
    borderRadius: P2Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lit: {
    transform: [{ translateY: 1 }],
    borderColor: P2.signalSoft,
    backgroundColor: P2.signalDeep,
  },
  btnCompact: {
    width: 64,
    height: 48,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: P2.ink,
  },
  labelCompact: {
    fontSize: 13,
  },
  labelLit: {
    color: P2.signal,
  },
});
