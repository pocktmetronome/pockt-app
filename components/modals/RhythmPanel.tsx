import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSkin } from '@/components/skins/SkinContext';
import {
  SUBDIVISION_ORDER,
  SUBDIVISIONS,
  TIME_SIGNATURE_ORDER,
  TIME_SIGNATURES,
  subdivisionCaption,
} from '@/constants/meter';
import { hapticSelection } from '@/lib/haptics';
import type { SubdivisionId, TimeSignatureId } from '@/lib/types';

const QUICK_METERS: TimeSignatureId[] = [
  '1/4',
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '5/8',
  '6/8',
  '7/8',
  '9/8',
  '12/8',
];

type Props = {
  visible: boolean;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  onChangeTime: (id: TimeSignatureId) => void;
  onChangeDivision: (id: SubdivisionId) => void;
  onClose: () => void;
  onRestore?: () => void;
};

export function RhythmPanel({
  visible,
  timeSignature,
  subdivision,
  onChangeTime,
  onChangeDivision,
  onClose,
  onRestore,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgPanel,
              borderColor: theme.line,
              paddingBottom: Math.max(insets.bottom, 18) + 10,
            },
          ]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.top}>
            <Text style={[styles.title, { color: theme.ivory }]}>TIME SIGNATURE</Text>
          </View>

          <View style={styles.row}>
            {QUICK_METERS.map((id) => (
              <Chip
                key={id}
                label={id}
                selected={id === timeSignature}
                color={theme.ivory}
                dim={theme.ivoryDim}
                accent={theme.accent}
                raised={theme.bgRaised}
                line={theme.line}
                onPress={() => {
                  void hapticSelection();
                  onChangeTime(id);
                }}
              />
            ))}
          </View>
          <View style={styles.grid}>
            {TIME_SIGNATURE_ORDER.filter((id) => !QUICK_METERS.includes(id)).map((id) => (
              <Chip
                key={id}
                label={TIME_SIGNATURES[id].label}
                selected={id === timeSignature}
                color={theme.ivory}
                dim={theme.ivoryDim}
                accent={theme.accent}
                raised={theme.bgRaised}
                line={theme.line}
                onPress={() => {
                  void hapticSelection();
                  onChangeTime(id);
                }}
              />
            ))}
          </View>

          <Text style={[styles.kicker, { color: theme.ivoryMute, marginTop: 18 }]}>SUBDIVISION</Text>
          <View style={styles.grid}>
            {SUBDIVISION_ORDER.map((id) => (
              <Chip
                key={id}
                label={`${SUBDIVISIONS[id].symbol}  ${SUBDIVISIONS[id].label}`}
                selected={id === subdivision}
                color={theme.ivory}
                dim={theme.ivoryDim}
                accent={theme.accent}
                raised={theme.bgRaised}
                line={theme.line}
                wide
                onPress={() => {
                  void hapticSelection();
                  onChangeDivision(id);
                }}
              />
            ))}
          </View>
          <Text style={[styles.live, { color: theme.ivoryDim }]}>
            {timeSignature}  ·  {subdivisionCaption(subdivision)}
          </Text>
          {onRestore ? (
            <Pressable
              onPress={() => {
                void hapticSelection();
                onRestore();
              }}
              accessibilityRole="button"
              accessibilityLabel="Restore default 4/4 quarter"
              style={styles.restoreHit}>
              <Text style={[styles.live, { color: theme.ivoryMute }]}>RESTORE DEFAULT</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  label,
  selected,
  onPress,
  color,
  dim,
  accent,
  raised,
  line,
  wide,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
  dim: string;
  accent: string;
  raised: string;
  line: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        wide && styles.chipWide,
        {
          borderColor: selected ? accent : line,
          backgroundColor: selected ? raised : 'transparent',
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? color : dim }]}>{label}</Text>
    </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '88%',
  },
  top: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  kicker: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 48,
    minWidth: 58,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWide: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  live: {
    marginTop: 16,
    fontSize: 14,
    letterSpacing: 1.2,
    fontWeight: '700',
    textAlign: 'center',
  },
  restoreHit: {
    marginTop: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBar: {
    marginTop: 18,
    minHeight: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBarText: {
    fontSize: 16,
    letterSpacing: 2.8,
    fontWeight: '800',
  },
});
