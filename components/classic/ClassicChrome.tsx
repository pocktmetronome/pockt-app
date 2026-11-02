import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';

export function ClassicParam({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: (event: GestureResponderEvent) => void;
}) {
  const theme = useSkin();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.param, pressed && styles.pressed]}>
      <Text style={[styles.paramLabel, { color: theme.ivoryMute }]}>{label}</Text>
      <Text
        style={[styles.paramValue, { color: theme.ivory }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.62}>
        {value}
      </Text>
    </Pressable>
  );
}

export function ClassicParamRow({ children }: { children: ReactNode }) {
  const theme = useSkin();
  return (
    <View style={[styles.row, { borderColor: theme.line, backgroundColor: 'rgba(8,8,10,0.42)' }]}>
      {children}
    </View>
  );
}

export function ClassicRule() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  param: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 58,
  },
  paramLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 4,
  },
  paramValue: {
    fontSize: 15,
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 12,
    backgroundColor: 'rgba(244,246,250,0.16)',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
});
