import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2MetalFill, P2MetalSheen, P2Space, P2Touch } from '@/constants/pockt-2';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function BeatlineHeader({ title, subtitle, onBack }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      <MetalRoundButton
        accessibilityLabel="Back"
        onPress={onBack}
        size={44}
        style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={P2.signal} />
      </MetalRoundButton>
    </View>
  );
}

type RoundProps = {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  glow?: boolean;
  recessed?: boolean;
  style?: object;
  /** Use press-in for time-critical controls such as tap tempo. */
  pressIn?: boolean;
};

export function MetalRoundButton({
  children,
  onPress,
  accessibilityLabel,
  size = 52,
  glow = false,
  recessed = false,
  style,
  pressIn = false,
}: RoundProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={pressIn ? undefined : onPress}
      onPressIn={pressIn ? onPress : undefined}
      hitSlop={10}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        glow && styles.roundGlow,
        recessed && styles.roundRecess,
        pressed && styles.pressed,
        style,
      ]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.4, 1]} style={styles.roundSheen} />
      <View style={[styles.roundEdge, glow && styles.roundEdgeGlow]} />
      {children}
    </Pressable>
  );
}

type PillProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
};

export function MetalPill({ label, onPress, selected = false, compact = false, accessibilityLabel }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        compact && styles.pillCompact,
        selected && styles.pillOn,
        pressed && styles.pressed,
      ]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.42, 1]} style={styles.pillSheen} />
      <View style={[styles.pillEdge, selected && styles.pillEdgeOn]} />
      <Text style={[styles.pillText, selected && styles.pillTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type SegmentProps = {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};

export function MetalSegment({ options, value, onChange }: SegmentProps) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.segItem, on && styles.segOn, pressed && styles.pressed]}>
            {on ? <View style={styles.segDot} /> : null}
            <Text style={[styles.segText, on && styles.segTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ToggleProps = {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
};

export function MetalToggle({ value, onChange, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggle, value && styles.toggleOn, pressed && styles.pressed]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 64,
    marginBottom: 8,
  },
  headerTitle: {
    color: P2.metalHi,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2.4,
  },
  headerSub: {
    color: P2.inkMute,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  back: {
    position: 'absolute',
    right: 0,
    top: 8,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  roundGlow: {
    shadowColor: P2.signal,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  roundRecess: {
    transform: [{ translateY: 2 }, { scale: 0.96 }],
  },
  roundSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
  },
  roundEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.22)',
  },
  roundEdgeGlow: {
    borderColor: P2.signal,
  },
  pill: {
    minHeight: 44,
    minWidth: 120,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  pillCompact: {
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 14,
  },
  pillOn: {
    shadowColor: P2.signal,
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  pillSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  pillEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.16)',
  },
  pillEdgeOn: {
    borderColor: P2.signal,
  },
  pillText: {
    color: P2.metalHi,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pillTextOn: {
    color: P2.ink,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P2.fieldInset,
    borderRadius: 22,
    padding: 3,
    gap: 2,
  },
  segItem: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  segOn: {
    backgroundColor: '#1A1D22',
  },
  segDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P2.signal,
  },
  segText: {
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  segTextOn: {
    color: P2.ink,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1D22',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.16)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    borderColor: P2.signal,
    backgroundColor: '#102018',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P2.metalLo,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    backgroundColor: P2.signal,
    alignSelf: 'flex-end',
  },
  section: {
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
});

export const beatlineChrome = {
  space: P2Space,
  touch: P2Touch,
};
