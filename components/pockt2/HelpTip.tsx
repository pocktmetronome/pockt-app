import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { P2, P2Radius, P2Space } from '@/constants/pockt-2';
import type { PocktHelpTopic } from '@/constants/pockt-help';
import { hapticSelection } from '@/lib/haptics';

type Props = {
  topic: PocktHelpTopic;
};

export function HelpTip({ topic }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`About ${topic.title}`}
        hitSlop={10}
        onPress={() => {
          void hapticSelection();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
        <Text style={styles.mark}>?</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dim} onPress={() => setOpen(false)} accessibilityLabel="Close help">
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{topic.title}</Text>
            <Text style={styles.body}>{topic.body}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close help"
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: P2.fieldRaised,
  },
  mark: {
    color: P2.inkMute,
    fontSize: 13,
    fontWeight: '700',
  },
  dim: {
    flex: 1,
    backgroundColor: P2.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: P2Space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: P2Radius.panel,
    backgroundColor: P2.fieldRaised,
    borderWidth: 1,
    borderColor: P2.hairline,
    padding: P2Space.lg,
  },
  title: {
    color: P2.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    marginTop: 10,
    color: P2.inkMute,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  close: {
    marginTop: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: P2.signal,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  pressed: {
    opacity: 0.82,
  },
});
