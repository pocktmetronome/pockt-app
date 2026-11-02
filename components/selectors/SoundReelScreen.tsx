import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { useSkin } from '@/components/skins/SkinContext';
import { SOUND_FAMILIES, SOUNDS, resolvePlayableSound, soundsForFamily } from '@/constants/sounds';
import { hapticSelection } from '@/lib/haptics';
import type { SoundBankId, SoundId } from '@/lib/types';

type Props = {
  visible: boolean;
  bank: SoundBankId;
  sound: SoundId;
  onChange: (patch: { soundBank?: SoundBankId; sound?: SoundId }) => void;
  onPreview: (sound: SoundId) => void;
  onClose: () => void;
  /** After a sound row is chosen, leave the whole MIX stack — not just Sound. */
  dismissOnSelect?: boolean;
};

export function SoundReelScreen({
  visible,
  bank,
  sound,
  onChange,
  onPreview,
  onClose,
  dismissOnSelect = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();
  const choices = soundsForFamily(bank);
  const current = SOUNDS[resolvePlayableSound(sound)];

  const selectFamily = (nextFamily: SoundBankId) => {
    if (nextFamily === bank) return;
    const nextChoices = soundsForFamily(nextFamily);
    const nextSound = nextChoices.includes(sound) ? sound : nextChoices[0];
    void hapticSelection();
    onChange({ soundBank: nextFamily, sound: nextSound });
  };

  const selectSound = (nextSound: SoundId) => {
    void hapticSelection();
    if (nextSound !== sound) onChange({ sound: nextSound });
    onPreview(nextSound);
    if (dismissOnSelect && nextSound !== sound) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.bg,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.top}>
          <Wordmark />
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: theme.ivory }]}>DONE</Text>
          </Pressable>
        </View>

        <Text style={[styles.title, { color: theme.ivoryMute }]}>CHOOSE A SOUND</Text>
        <Text style={[styles.current, { color: theme.ivory }]} numberOfLines={1}>
          {current.label}
        </Text>
        <Text style={[styles.caption, { color: theme.ivoryDim }]}>{current.hint}</Text>
        <Text style={[styles.accentNote, { color: theme.ivoryMute }]}>
          Downbeat uses a stronger strike of the selected sound.
        </Text>

        <View style={[styles.family, { borderBottomColor: theme.line }]}>
          {SOUND_FAMILIES.map((item) => {
            const active = item.id === bank;
            return (
              <Pressable
                key={item.id}
                onPress={() => selectFamily(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.familyBtn,
                  {
                    borderBottomColor: active ? theme.accent : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.familyText, { color: active ? theme.ivory : theme.ivoryMute }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {choices.map((id) => {
            const def = SOUNDS[id];
            const selected = id === sound;
            return (
              <Pressable
                key={id}
                onPress={() => selectSound(id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: selected ? theme.accent : theme.line,
                    backgroundColor: selected ? theme.bgRaised : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowLabel, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                    {def.label}
                  </Text>
                  <Text style={[styles.rowHint, { color: theme.ivoryMute }]}>{def.hint}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${def.label}`}
                  onPress={() => onPreview(id)}
                  hitSlop={8}
                  style={styles.preview}>
                  <Text style={[styles.previewText, { color: theme.ivoryDim }]}>▶</Text>
                </Pressable>
                {selected ? (
                  <View style={[styles.mark, { backgroundColor: theme.accent }]} />
                ) : (
                  <View style={[styles.mark, { borderColor: theme.line, borderWidth: 1 }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  doneText: {
    fontSize: 16,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.82,
  },
  title: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '700',
  },
  current: {
    marginTop: 6,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  caption: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 24,
  },
  accentNote: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  family: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
  },
  familyBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    paddingHorizontal: 8,
  },
  familyText: {
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '800',
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 36,
    gap: 8,
  },
  row: {
    minHeight: 64,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 18,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  rowHint: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  mark: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  preview: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
