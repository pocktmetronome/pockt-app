import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentButton } from '@/components/pockt2/InstrumentButton';
import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { P2Space } from '@/constants/pockt-2';

type Props = {
  onOpenViews: () => void;
  onOpenMix: () => void;
  onOpenTuner: () => void;
  hideMix?: boolean;
  faceLabel?: string;
  onOpenFaces?: () => void;
};

export function ShellBezel({
  onOpenViews,
  onOpenMix,
  onOpenTuner,
  hideMix = false,
  faceLabel,
  onOpenFaces,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 10) }]} pointerEvents="box-none">
      <LinearGradient colors={['rgba(5,6,8,0.92)', 'rgba(5,6,8,0.35)', 'rgba(5,6,8,0)']} style={styles.shade} />
      <View style={styles.row}>
        <InstrumentButton label="Pockets" onPress={onOpenViews} accessibilityLabel="Choose Your Pocket" />
        <View style={styles.mark} pointerEvents="box-none">
          <Pockt2Mark size={faceLabel ? 22 : 28} accessible={false} />
          {faceLabel && onOpenFaces ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Instrument face ${faceLabel}. Changes the face.`}
              onPress={onOpenFaces}
              hitSlop={8}
              style={styles.faceHit}>
              <Text style={styles.face}>{faceLabel}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.right}>
          <InstrumentButton label="Tuner" onPress={onOpenTuner} compact />
          {hideMix ? null : <InstrumentButton label="Settings" onPress={onOpenMix} compact />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: P2Space.md,
    paddingBottom: 8,
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    height: 120,
    pointerEvents: 'none',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceHit: {
    minHeight: 22,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    marginTop: 1,
    color: '#DCBD72',
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
