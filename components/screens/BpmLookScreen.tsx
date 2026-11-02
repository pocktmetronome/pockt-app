import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSkin } from '@/components/skins/SkinContext';
import {
  BPM_FONT_META,
  BPM_FONT_ORDER,
  BPM_SIZE_LABEL,
  BPM_SIZE_ORDER,
  resolveBpmFont,
  resolveBpmFontSize,
  type BpmFontId,
  type BpmSizeId,
  type DisplayPrefs,
} from '@/constants/display';
import { hapticSelection } from '@/lib/haptics';
import { sanitizeBpm } from '@/constants/timing';

type Props = {
  visible: boolean;
  bpm: number;
  prefs: DisplayPrefs;
  onChange: (patch: Partial<DisplayPrefs>) => void;
  onClose: () => void;
};

export function BpmLookScreen({ visible, bpm, prefs, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();
  const { width, height } = useWindowDimensions();
  const snapshot = useRef<DisplayPrefs | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    if (visible) snapshot.current = { ...prefsRef.current };
  }, [visible]);

  if (!visible) return null;

  const font = resolveBpmFont(prefs.bpmFont);
  const compact = height - insets.top - insets.bottom < 700;
  const size = resolveBpmFontSize(prefs.bpmSize, compact ? width * 0.86 : width, height);
  const safeBpm = sanitizeBpm(bpm);

  const cancel = () => {
    void hapticSelection();
    if (snapshot.current) onChange(snapshot.current);
    onClose();
  };

  const done = () => {
    void hapticSelection();
    onClose();
  };

  return (
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel BPM look"
          hitSlop={12}
          onPress={cancel}
          style={({ pressed }) => [styles.nav, pressed && styles.pressed]}>
          <Text style={[styles.navText, { color: theme.ivory }]}>CANCEL</Text>
        </Pressable>
        <Text style={[styles.kicker, { color: theme.ivoryMute }]}>BPM LOOK</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          hitSlop={12}
          onPress={done}
          style={({ pressed }) => [styles.nav, styles.navEnd, pressed && styles.pressed]}>
          <Text style={[styles.navText, { color: theme.ivory }]}>DONE</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        <Text
          style={{
            color: theme.ivory,
            fontSize: size,
            lineHeight: Math.round(size * 1.02),
            fontWeight: font.fontWeight,
            letterSpacing: font.letterSpacing,
            textAlign: 'center',
            ...(font.fontFamily ? { fontFamily: font.fontFamily } : { fontVariant: ['tabular-nums'] as const }),
          }}
          numberOfLines={1}
          allowFontScaling={false}>
          {safeBpm}
        </Text>
        <Text style={[styles.unit, { color: theme.ivoryMute }]}>BPM</Text>
      </View>

      <Text style={[styles.section, { color: theme.ivoryMute }]}>FONT</Text>
      <View style={styles.row}>
        {BPM_FONT_ORDER.map((id: BpmFontId) => {
          const selected = prefs.bpmFont === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                void hapticSelection();
                onChange({ bpmFont: id });
              }}
              style={[
                styles.chip,
                { borderColor: selected ? theme.accent : theme.line, backgroundColor: selected ? theme.bgRaised : 'transparent' },
              ]}>
              <Text style={[styles.chipText, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                {BPM_FONT_META[id].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: theme.ivoryMute }]}>SIZE</Text>
      <View style={styles.row}>
        {BPM_SIZE_ORDER.map((id: BpmSizeId) => {
          const selected = prefs.bpmSize === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                void hapticSelection();
                onChange({ bpmSize: id });
              }}
              style={[
                styles.chip,
                { borderColor: selected ? theme.accent : theme.line, backgroundColor: selected ? theme.bgRaised : 'transparent' },
              ]}>
              <Text style={[styles.chipText, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                {BPM_SIZE_LABEL[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 38,
    paddingHorizontal: 22,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  navEnd: {
    alignItems: 'flex-end',
  },
  navText: {
    fontSize: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  preview: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  unit: {
    marginTop: 4,
    fontSize: 13,
    letterSpacing: 5,
    fontWeight: '700',
  },
  section: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
});
