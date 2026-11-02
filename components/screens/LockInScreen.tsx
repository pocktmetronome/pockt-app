import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { Studio } from '@/constants/colors';
import { LOCK_IN_PATTERNS } from '@/constants/meter';
import { hapticSelection } from '@/lib/haptics';
import type { LockInPattern } from '@/lib/types';

type Props = {
  visible: boolean;
  value: LockInPattern;
  onChange: (value: LockInPattern) => void;
  onClose: () => void;
};

export function LockInScreen({ visible, value, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.top}>
          <Wordmark />
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
            <Text style={styles.doneText}>DONE</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>LOCK IN</Text>
        <Text style={styles.lede}>The click disappears. You keep the time.</Text>
        <View style={styles.list}>
          {LOCK_IN_PATTERNS.map((pattern) => {
            const selected = pattern.id === value;
            return (
              <Pressable
                key={pattern.id}
                onPress={() => {
                  void hapticSelection();
                  onChange(pattern.id);
                }}
                style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && styles.pressed]}>
                <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{pattern.label}</Text>
                <Text style={styles.choiceDetail}>{pattern.detail}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Studio.bg,
    paddingHorizontal: 22,
  },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    minHeight: 44,
    justifyContent: 'center',
  },
  doneText: {
    color: Studio.ivory,
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.86,
  },
  title: {
    marginTop: 18,
    color: Studio.ivory,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: 2,
  },
  lede: {
    marginTop: 8,
    marginBottom: 22,
    color: Studio.ivoryDim,
    fontSize: 17,
    lineHeight: 24,
  },
  list: {
    gap: 10,
  },
  choice: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  choiceOn: {
    borderColor: Studio.amber,
    backgroundColor: Studio.bgRaised,
  },
  choiceLabel: {
    color: Studio.ivoryDim,
    fontSize: 18,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  choiceLabelOn: {
    color: Studio.ivory,
  },
  choiceDetail: {
    marginTop: 4,
    color: Studio.ivoryMute,
    fontSize: 14,
  },
});
