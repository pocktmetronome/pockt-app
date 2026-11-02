import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SOUNDS } from '@/constants/sounds';
import { hapticSelection } from '@/lib/haptics';
import type { SoundId } from '@/lib/types';

export const RIG_SOUNDS: SoundId[] = ['digital-click', 'wood', 'cowbell', 'rim', 'electronic-tick'];

type Props = {
  visible: boolean;
  firstBeat: boolean;
  sound: SoundId;
  onFirstBeat: (on: boolean) => void;
  onSound: (id: SoundId) => void;
  onPreview: (id: SoundId) => void;
  onOpenMix: () => void;
  onClose: () => void;
};

export function RigOptionsSheet({
  visible,
  firstBeat,
  sound,
  onFirstBeat,
  onSound,
  onPreview,
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
          <LinearGradient colors={['#2A2E32', '#16181C', '#0C0E10']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.handle} />
          <Text style={styles.title}>Settings</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>First Beat Emphasis</Text>
            <Switch
              value={firstBeat}
              onValueChange={(next) => {
                void hapticSelection();
                onFirstBeat(next);
              }}
              trackColor={{ false: '#2A2E32', true: '#2A8CA8' }}
              thumbColor={firstBeat ? '#3DE8F0' : '#C8CDD4'}
            />
          </View>

          <Text style={styles.section}>SOUND</Text>
          {RIG_SOUNDS.map((id) => {
            const selected = sound === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  void hapticSelection();
                  onSound(id);
                  onPreview(id);
                }}
                style={styles.soundRow}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text style={[styles.soundLabel, selected && styles.soundOn]}>{SOUNDS[id].label}</Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}

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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  title: {
    color: '#F4F6FA',
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
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    color: '#E8EEF4',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginTop: 22,
    marginBottom: 8,
    color: 'rgba(180,188,196,0.55)',
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  soundRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  soundLabel: {
    color: '#D8DEE6',
    fontSize: 16,
    fontWeight: '500',
  },
  soundOn: {
    color: '#3DE8F0',
  },
  check: {
    color: '#3DE8F0',
    fontSize: 18,
    fontWeight: '700',
  },
  mix: {
    marginTop: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(61,232,240,0.28)',
    backgroundColor: 'rgba(20,28,32,0.7)',
  },
  mixLabel: {
    color: '#3DE8F0',
    fontSize: 13,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
});
