import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { P2, P2Space, P2Touch } from '@/constants/pockt-2';

type Props = {
  children: ReactNode;
  dock: ReactNode;
  onOpenPockets: () => void;
  onOpenTuner: () => void;
};

export function InstrumentShell({ children, dock, onOpenPockets, onOpenTuner }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.edge, { paddingTop: Math.max(insets.top, 10) }]}>
        <EdgeLink label="Pockets" accessibilityLabel="Choose Your Pocket" onPress={onOpenPockets} />
        <View style={styles.mark} pointerEvents="none">
          <Pockt2Mark size={30} accessible={false} />
        </View>
        <EdgeLink label="Tuner" onPress={onOpenTuner} align="right" />
      </View>
      <View style={styles.field}>{children}</View>
      {dock}
    </View>
  );
}

function EdgeLink({
  label,
  onPress,
  accessibilityLabel,
  align = 'left',
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  align?: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.link,
        align === 'right' && styles.linkRight,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: P2.field,
  },
  edge: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: P2Space.md,
    paddingBottom: 6,
  },
  mark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  link: {
    minHeight: P2Touch.min,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  linkRight: {
    alignItems: 'flex-end',
  },
  linkText: {
    color: P2.inkMute,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  field: {
    flex: 1,
    paddingHorizontal: P2Space.lg,
  },
  pressed: {
    opacity: 0.72,
  },
});
