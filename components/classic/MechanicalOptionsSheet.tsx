import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticSelection } from '@/lib/haptics';

type Props = {
  visible: boolean;
  haptic: boolean;
  timeLabel: string;
  subLabel: string;
  soundLabel: string;
  onHaptic: () => void;
  onOpenTime: () => void;
  onOpenDivision: () => void;
  onOpenSound: () => void;
  onOpenMix: () => void;
  onClose: () => void;
};

export function MechanicalOptionsSheet({
  visible,
  haptic,
  timeLabel,
  subLabel,
  soundLabel,
  onHaptic,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenMix,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          onPress={(event) => event.stopPropagation()}>
          <LinearGradient colors={['#4A3424', '#2A1C12', '#16100C']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.handle} />
          <Text style={styles.title}>Settings</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Beat Haptics</Text>
            <Pressable
              onPress={() => {
                void hapticSelection();
                onHaptic();
              }}
              accessibilityRole="switch"
              accessibilityLabel="Beat Haptics"
              accessibilityState={{ checked: haptic }}
              accessibilityValue={{ text: haptic ? 'On' : 'Off' }}
              style={styles.hapticHit}>
              <View
                testID="mechanical-haptic-track"
                style={[styles.hapticTrack, haptic ? styles.hapticTrackOn : styles.hapticTrackOff]}>
                <View style={[styles.hapticThumb, haptic ? styles.hapticThumbOn : styles.hapticThumbOff]} />
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
              onOpenTime();
            }}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Time signature ${timeLabel}`}>
            <Text style={styles.rowLabel}>Meter</Text>
            <Text style={styles.rowValue}>{timeLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
              onOpenDivision();
            }}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Subdivision ${subLabel}`}>
            <Text style={styles.rowLabel}>Subdivision</Text>
            <Text style={styles.rowValue}>{subLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
              onOpenSound();
            }}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Sound ${soundLabel}`}>
            <Text style={styles.rowLabel}>Sound</Text>
            <Text style={styles.rowValue}>{soundLabel}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void hapticSelection();
              onOpenMix();
            }}
            style={styles.mix}
            accessibilityRole="button"
            accessibilityLabel="Open MIX">
            <Text style={styles.mixLabel}>MIX</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(232,200,140,0.16)',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(232,200,140,0.28)',
    marginBottom: 14,
  },
  title: {
    color: '#F6E8C8',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232,200,140,0.12)',
  },
  rowLabel: {
    color: '#F0E0C4',
    fontSize: 16,
    fontWeight: '500',
  },
  rowValue: {
    color: 'rgba(240,224,196,0.72)',
    fontSize: 15,
    fontWeight: '600',
  },
  mix: {
    marginTop: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.32)',
    backgroundColor: 'rgba(32,20,12,0.7)',
  },
  hapticHit: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hapticTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  hapticTrackOff: {
    backgroundColor: '#2C2824',
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.18)',
  },
  hapticTrackOn: {
    backgroundColor: '#D4A24A',
    borderWidth: 1,
    borderColor: '#F0D080',
  },
  hapticThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  hapticThumbOff: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2EDE4',
  },
  hapticThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF6DC',
  },
  mixLabel: {
    color: '#E8C878',
    fontSize: 13,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
});
