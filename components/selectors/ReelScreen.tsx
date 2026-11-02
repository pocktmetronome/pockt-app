import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { PocktReel, type ReelOption } from '@/components/selectors/PocktReel';
import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

type Props<T extends string> = {
  visible: boolean;
  title: string;
  value: T;
  options: ReelOption<T>[];
  caption?: string;
  onChange: (value: T) => void;
  onSettled?: (value: T) => void;
  onClose: () => void;
  onRestore?: () => void;
};

export function ReelScreen<T extends string>({
  visible,
  title,
  value,
  options,
  caption,
  onChange,
  onSettled,
  onClose,
  onRestore,
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
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.top}>
          <Wordmark />
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
        <View style={styles.reel}>
          <PocktReel options={options} value={value} onChange={onChange} onSettled={onSettled} />
        </View>
        {onRestore ? (
          <Pressable
            onPress={() => {
              void hapticSelection();
              onRestore();
            }}
            accessibilityRole="button"
            accessibilityLabel="Restore default 4/4 quarter"
            style={({ pressed }) => [styles.footerClose, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: theme.ivoryDim }]}>RESTORE DEFAULT</Text>
          </Pressable>
        ) : null}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    minHeight: 48,
    minWidth: 72,
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
  captionSpacer: {
    height: 24,
  },
  reel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerClose: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
