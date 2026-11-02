import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  INSTRUMENT_FACES,
  PRIMARY_FACE_ORDER,
  type InstrumentFaceId,
} from '@/lib/instrument-faces';
import { hapticSelection } from '@/lib/haptics';
import type { RoomId } from '@/lib/types';

const TEAL = '#3EE6D8';
const GOLD = '#DCBD72';

type Props = {
  visible: boolean;
  activeId: RoomId;
  onSelect: (id: InstrumentFaceId) => void;
  onClose: () => void;
};

export function FacePicker({ visible, activeId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close face list" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.kicker}>INSTRUMENT FACE</Text>
        <Text style={styles.title}>TRANSFORM</Text>
        {PRIMARY_FACE_ORDER.map((id) => {
          const spec = INSTRUMENT_FACES[id];
          const active = id === activeId;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${spec.label}${active ? ', current' : ''}`}
              onPress={() => {
                void hapticSelection();
                onSelect(id);
              }}
              style={[styles.row, active && styles.rowOn]}>
              <Text style={[styles.short, active && styles.shortOn]}>{spec.short}</Text>
              <Text style={[styles.label, active && styles.labelOn]}>{spec.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,6,8,0.62)',
  },
  sheet: {
    backgroundColor: '#0C0E11',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220,189,114,0.28)',
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 4,
  },
  kicker: {
    color: 'rgba(220,228,236,0.42)',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '700',
  },
  title: {
    color: GOLD,
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#121416',
  },
  rowOn: {
    borderColor: 'rgba(62,230,216,0.45)',
    backgroundColor: '#161A1C',
  },
  short: {
    width: 52,
    color: 'rgba(232,228,216,0.46)',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  shortOn: {
    color: TEAL,
  },
  label: {
    color: '#E8E4D8',
    fontSize: 14,
    letterSpacing: 1.1,
    fontWeight: '600',
  },
  labelOn: {
    color: '#F4F6FA',
  },
});
