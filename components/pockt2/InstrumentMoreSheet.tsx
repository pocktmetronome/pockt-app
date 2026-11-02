import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MixerFader } from '@/components/controls/MixerFader';
import { P2, P2Radius, P2Space } from '@/constants/pockt-2';
import { hapticSelection, hapticTap } from '@/lib/haptics';

type Props = {
  visible: boolean;
  volume: number;
  onVolume: (volume: number) => void;
  onOpenSettings: () => void;
  onOpenAccents: () => void;
  onOpenPractice: () => void;
  onOpenSetlists: () => void;
  onTapTempo: () => void;
  onClose: () => void;
};

export function InstrumentMoreSheet({
  visible,
  volume,
  onVolume,
  onOpenSettings,
  onOpenAccents,
  onOpenPractice,
  onOpenSetlists,
  onTapTempo,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  const run = (fn: () => void) => {
    void hapticSelection();
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss more" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>More</Text>
          <Row label="Settings" onPress={() => run(onOpenSettings)} />
          <Row label="Accents" onPress={() => run(onOpenAccents)} />
          <Row label="Practice" onPress={() => run(onOpenPractice)} />
          <Row label="Setlists" onPress={() => run(onOpenSetlists)} />
          <Row
            label="Tap tempo"
            onPress={() => {
              void hapticTap();
              onTapTempo();
            }}
          />
          <View style={styles.volume}>
            <Text style={styles.volLabel}>Volume</Text>
            <MixerFader immediateGain value={volume} onChange={onVolume} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: P2.overlay,
  },
  sheet: {
    backgroundColor: P2.fieldPanel,
    borderTopLeftRadius: P2Radius.sheet,
    borderTopRightRadius: P2Radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairline,
    paddingHorizontal: P2Space.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: P2.hairlineStrong,
    marginBottom: 14,
  },
  title: {
    color: P2.ink,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P2.hairline,
  },
  rowLabel: {
    color: P2.ink,
    fontSize: 17,
    fontWeight: '500',
  },
  volume: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  volLabel: {
    color: P2.inkMute,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
