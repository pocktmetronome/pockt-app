import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { RotarySelector, type RotaryOption } from '@/components/selectors/RotarySelector';
import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: RotaryOption<T>[];
  value: T;
  caption?: string;
  visual?: ReactNode;
  onChange: (value: T) => void;
  onSettled?: (value: T) => void;
  onClose: () => void;
};

export function SelectorScreen<T extends string>({
  visible,
  title,
  options,
  value,
  caption,
  visual,
  onChange,
  onSettled,
  onClose,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();
  const current = options.find((item) => item.id === value) ?? options[0];

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
            paddingTop: insets.top + 8,
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
        <Text style={[styles.title, { color: theme.ivoryMute }]}>{title}</Text>
        <Text style={[styles.current, { color: theme.ivory }]} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        {caption ? (
          <Text style={[styles.caption, { color: theme.ivoryDim }]}>{caption}</Text>
        ) : (
          <View style={styles.captionSpacer} />
        )}
        {visual}
        <View style={styles.wheel}>
          <RotarySelector options={options} value={value} onChange={onChange} onSettled={onSettled} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
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
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  caption: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 24,
  },
  captionSpacer: {
    height: 24,
  },
  wheel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
