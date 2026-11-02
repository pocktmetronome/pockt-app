import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { P2 } from '@/constants/pockt-2';
import { hapticSelection } from '@/lib/haptics';

type Props = {
  visible: boolean;
  title: string;
  lede?: string;
  onClose: () => void;
  children: ReactNode;
  scroll?: boolean;
};

/** Full-screen Classic secondary surface. Never shares the HOME / MIX chrome layer. */
export function UtilityShell({ visible, title, lede, onClose, children, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const body = (
    <>
      <Text style={styles.title}>{title}</Text>
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
      {children}
    </>
  );

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.root,
            { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <View style={styles.top}>
            <Pockt2Mark size={28} accessible={false} />
            <Pressable
              onPress={() => {
                void hapticSelection();
                onClose();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {body}
            </ScrollView>
          ) : (
            <View style={styles.flex}>{body}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: P2.field,
    paddingHorizontal: 22,
  },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mark: {
    width: 36,
    height: 36,
  },
  done: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  doneText: {
    color: P2.ink,
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
  title: {
    marginTop: 8,
    color: P2.ink,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 2,
  },
  lede: {
    marginTop: 8,
    marginBottom: 16,
    color: P2.inkMute,
    fontSize: 15,
    lineHeight: 22,
  },
  scroll: {
    paddingBottom: 28,
  },
});
