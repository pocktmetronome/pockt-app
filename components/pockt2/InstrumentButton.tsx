import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2MetalFill, P2MetalSheen, P2Radius, P2Touch } from '@/constants/pockt-2';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  signal?: boolean;
  compact?: boolean;
};

export function InstrumentButton({ label, onPress, accessibilityLabel, signal = false, compact = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.hit, compact && styles.hitCompact, pressed && styles.pressed]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.42, 1]} style={styles.sheen} />
      <View style={[styles.edge, signal && styles.edgeSignal]} />
      <Text style={[styles.label, signal && styles.labelSignal]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minHeight: P2Touch.min,
    minWidth: P2Touch.min,
    paddingHorizontal: 14,
    borderRadius: P2Radius.control,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitCompact: {
    minWidth: 44,
    paddingHorizontal: 10,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: P2Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
  },
  edgeSignal: {
    borderColor: P2.signalSoft,
  },
  label: {
    color: P2.ink,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSignal: {
    color: P2.signal,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.88,
  },
});
