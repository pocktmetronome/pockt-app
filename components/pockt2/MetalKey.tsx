import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2MetalFill, P2MetalSheen, P2Radius, P2Touch } from '@/constants/pockt-2';

type Props = {
  label: string;
  value?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  compact?: boolean;
  dimmed?: boolean;
};

export function MetalKey({ label, value, onPress, accessibilityLabel, compact = false, dimmed = false }: Props) {
  const caption = accessibilityLabel ?? (value ? `${label} ${value}` : label);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={caption}
      style={({ pressed }) => [
        styles.hit,
        compact && styles.hitCompact,
        dimmed && styles.dimmed,
        pressed && styles.pressed,
      ]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.38, 1]} style={styles.sheen} />
      <View style={styles.edge} />
      <View style={styles.topLight} />
      {value ? (
        <>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
            {value}
          </Text>
        </>
      ) : (
        <Text style={styles.solo} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    minHeight: P2Touch.comfortable,
    minWidth: P2Touch.min,
    borderRadius: P2Radius.control,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  hitCompact: {
    flex: 0,
    minWidth: 52,
    paddingHorizontal: 10,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: P2Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    color: P2.inkDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  value: {
    color: P2.ink,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  solo: {
    color: P2.ink,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  dimmed: {
    opacity: 0.48,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
});
