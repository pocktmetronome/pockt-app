import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';
import { LOCK_IN_PATTERNS } from '@/constants/meter';
import { hapticSelection } from '@/lib/haptics';
import type { LockInPattern } from '@/lib/types';

type Props = {
  value: LockInPattern;
  onChange: (pattern: LockInPattern) => void;
};

export function PracticePanel({ value, onChange }: Props) {
  const theme = useSkin();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.kicker, { color: theme.mustard }]}>PRACTICE</Text>
      <Text style={[styles.title, { color: theme.ivory }]}>LOCK IN</Text>
      <Text style={[styles.lede, { color: theme.ivory }]}>The click disappears. You keep the time.</Text>
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
              style={[
                styles.row,
                { borderBottomColor: selected ? theme.accentSoft : theme.line },
              ]}>
              <Text style={[styles.label, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                {pattern.label}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: selected ? theme.accent : theme.line,
                    backgroundColor: selected ? theme.accent : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.foot, { color: theme.ivoryMute }]}>
        When it comes back, see if you are still in the pocket.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 3.5,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1,
  },
  lede: {
    fontSize: 16,
    marginBottom: 8,
  },
  list: {
    gap: 2,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  foot: {
    fontSize: 13,
    marginTop: 10,
  },
});
