import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

type Props = {
  visible: boolean;
  timeValue: string;
  divisionValue: string;
  soundValue: string;
  onOpenTime: () => void;
  onOpenDivision: () => void;
  onOpenSound: () => void;
  onClose: () => void;
};

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useSkin();
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.rowLabel, { color: theme.ivoryMute }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.ivory }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

export function BarControlsSheet({
  visible,
  timeValue,
  divisionValue,
  soundValue,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onClose,
}: Props) {
  const theme = useSkin();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss controls" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgRaised,
              borderColor: theme.line,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.top}>
            <Text style={[styles.kicker, { color: theme.mustard }]}>CONTROLS</Text>
            <Pressable
              onPress={() => {
                void hapticSelection();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close controls"
              hitSlop={12}
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
              <Text style={[styles.doneText, { color: theme.ivory }]}>DONE</Text>
            </Pressable>
          </View>
          <Row label="TIME" value={timeValue} onPress={onOpenTime} />
          <Row label="DIVISION" value={divisionValue} onPress={onOpenDivision} />
          <Row label="SOUND" value={soundValue} onPress={onOpenSound} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  done: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  doneText: {
    fontSize: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(237,230,216,0.14)',
  },
  rowLabel: {
    fontSize: 13,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  rowValue: {
    fontSize: 16,
    letterSpacing: 0.4,
    fontWeight: '600',
    maxWidth: '58%',
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.72,
  },
});
