import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

type FaceProps = {
  label?: string;
  onPress: (event: GestureResponderEvent) => void;
  width?: number;
  height?: number;
  radius?: number;
  glow?: string;
  accessibilityLabel?: string;
  children?: ReactNode;
};

export function HardwareKey({
  label,
  onPress,
  width = 64,
  height = 56,
  radius = 12,
  glow,
  accessibilityLabel,
  children,
}: FaceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        { width, height, borderRadius: radius, shadowColor: glow ?? '#000' },
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        colors={['#2A2C30', '#141618', '#0C0D10']}
        locations={[0, 0.45, 1]}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.35)']}
        locations={[0, 0.4, 1]}
        style={[styles.sheen, { borderRadius: radius }]}
      />
      <View style={[styles.edge, { borderRadius: radius }]} />
      {children ?? (
        <Text style={[styles.glyph, (label?.length ?? 0) > 1 && styles.caption]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function HardwarePlay({
  playing,
  onPress,
  size = 72,
  glow = 'rgba(88, 168, 255, 0.45)',
}: {
  playing: boolean;
  onPress: () => void;
  size?: number;
  glow?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop' : 'Play'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.play,
        { width: size, height: size, borderRadius: size / 2, shadowColor: glow },
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        colors={['#2C3036', '#121418', '#0A0C0E']}
        style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
      />
      <View style={[styles.playRing, { borderRadius: size / 2, borderColor: glow }]} />
      {playing ? (
        <View style={styles.stop} />
      ) : (
        <View style={styles.triangle} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glyph: {
    color: '#F4F0E8',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  caption: {
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '800',
    marginTop: 0,
  },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  playRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  triangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: '#7EC8FF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  stop: {
    width: 16,
    height: 16,
    backgroundColor: '#7EC8FF',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
});
