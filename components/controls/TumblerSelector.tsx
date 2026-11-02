import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';
import { hapticSelection } from '@/lib/haptics';

export type TumblerOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: TumblerOption<T>[];
  onChange: (value: T) => void;
};

function neighbor<T extends string>(
  options: TumblerOption<T>[],
  value: T,
  delta: number
): T {
  const index = Math.max(0, options.findIndex((item) => item.id === value));
  const next = (index + delta + options.length) % options.length;
  return options[next].id;
}

export function TumblerSelector<T extends string>({ label, value, options, onChange }: Props<T>) {
  const theme = useSkin();
  const [open, setOpen] = useState(false);
  const currentIndex = Math.max(0, options.findIndex((item) => item.id === value));
  const prev = options[(currentIndex - 1 + options.length) % options.length];
  const current = options[currentIndex];
  const next = options[(currentIndex + 1) % options.length];

  const step = useCallback(
    (delta: number) => {
      void hapticSelection();
      onChange(neighbor(options, value, delta));
    },
    [onChange, options, value]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .failOffsetX([-24, 24])
        .onEnd((event) => {
          if (event.translationY < -22) runOnJS(step)(1);
          else if (event.translationY > 22) runOnJS(step)(-1);
        }),
    [step]
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.kicker, { color: theme.mustard }]}>{label}</Text>
      <GestureDetector gesture={gesture}>
        <View style={[styles.drum, { borderColor: theme.line, backgroundColor: theme.bgRaised }]}>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onChange(prev.id);
            }}
            hitSlop={6}
            style={styles.adjacentHit}>
            <Text style={[styles.adjacent, { color: theme.ivoryMute }]} numberOfLines={1}>
              {prev.label}
            </Text>
          </Pressable>
          <Pressable onPress={() => setOpen(true)} style={styles.currentHit}>
            <Text style={[styles.current, { color: theme.ivory }]} numberOfLines={1}>
              {current.label}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onChange(next.id);
            }}
            hitSlop={6}
            style={styles.adjacentHit}>
            <Text style={[styles.adjacent, { color: theme.ivoryMute }]} numberOfLines={1}>
              {next.label}
            </Text>
          </Pressable>
        </View>
      </GestureDetector>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.bgPanel, borderColor: theme.line }]}
            onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: theme.mustard }]}>{label}</Text>
            {options.map((option) => {
              const selected = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    void hapticSelection();
                    onChange(option.id);
                    setOpen(false);
                  }}
                  style={[
                    styles.choice,
                    { borderBottomColor: theme.line },
                    selected && { borderBottomColor: theme.accentSoft },
                  ]}>
                  <Text
                    style={[
                      styles.choiceText,
                      { color: selected ? theme.ivory : theme.ivoryDim },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 96,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 2.4,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  drum: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 2,
    paddingVertical: 6,
    minHeight: 96,
    justifyContent: 'center',
  },
  adjacentHit: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjacent: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontWeight: '600',
    opacity: 0.55,
  },
  currentHit: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  current: {
    fontSize: 17,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 8,
  },
  choice: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choiceText: {
    fontSize: 18,
    letterSpacing: 1.6,
    fontWeight: '600',
  },
});
