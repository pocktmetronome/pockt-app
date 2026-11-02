import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { meterPillLabel } from '@/constants/meter';
import type { SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  timerLabel: string;
  onOpenRhythm: () => void;
  onOpenPractice: () => void;
  onOpenSound?: () => void;
  tint?: string;
};

export function ClassicTopRail({
  timeSignature,
  subdivision,
  timerLabel,
  onOpenRhythm,
  onOpenPractice,
  onOpenSound,
  tint,
}: Props) {
  return (
    <View style={styles.row}>
      <RailOrb accessibilityLabel="Sound" onPress={onOpenSound ?? onOpenRhythm}>
        <View style={styles.wave}>
          <View style={[styles.waveBar, styles.waveA]} />
          <View style={[styles.waveBar, styles.waveB]} />
          <View style={[styles.waveBar, styles.waveC]} />
        </View>
      </RailOrb>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Time signature ${timeSignature}`}
        onPress={onOpenRhythm}
        style={({ pressed }) => [styles.pill, tint ? { borderColor: `${tint}55` } : null, pressed && styles.pressed]}>
        <Text style={styles.pillText}>{meterPillLabel(timeSignature, subdivision)}</Text>
      </Pressable>
      <RailOrb accessibilityLabel="Practice timer" onPress={onOpenPractice}>
        <View style={styles.clock}>
          <View style={styles.clockHand} />
        </View>
        <Text style={styles.timerText}>{timerLabel}</Text>
      </RailOrb>
    </View>
  );
}

function RailOrb({
  accessibilityLabel,
  onPress,
  onLongPress,
  children,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.orb, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 56,
  },
  orb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(230,238,246,0.16)',
    backgroundColor: 'rgba(10,12,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(230,238,246,0.2)',
    backgroundColor: 'rgba(14,16,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: '#F4F6FA',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  wave: {
    width: 18,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#F4F6FA',
  },
  waveA: { height: 8 },
  waveB: { height: 16 },
  waveC: { height: 11 },
  clock: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  clockHand: {
    width: 1.5,
    height: 5,
    backgroundColor: '#F4F6FA',
    borderRadius: 1,
  },
  timerText: {
    marginTop: 3,
    color: 'rgba(220,228,236,0.62)',
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
