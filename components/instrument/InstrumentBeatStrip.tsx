import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TIME_SIGNATURES } from '@/constants/meter';
import { beatGroupsFor, beatRoleLabel, cycleAccentLevel } from '@/lib/instrument-beat';
import { hapticMedium, hapticSelection } from '@/lib/haptics';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

const TEAL = '#3EE6D8';
const GOLD = '#DCBD72';
const MUTE = 'rgba(244,246,250,0.16)';

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent?: boolean;
  accentPattern: AccentLevel[];
  onChange?: (pattern: AccentLevel[]) => void;
  onOpenEditor?: () => void;
  compact?: boolean;
};

export function InstrumentBeatStrip({
  timeSignature,
  beatIndex,
  playing,
  silent = false,
  accentPattern,
  onChange,
  onOpenEditor,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const meter = TIME_SIGNATURES[timeSignature];
  const count = Math.max(1, meter?.beatsPerMeasure ?? accentPattern.length ?? 4);
  const groups = beatGroupsFor(timeSignature);
  const canEdit = typeof onChange === 'function';

  const cycle = (index: number) => {
    if (!canEdit || !onChange) return;
    const current = accentPattern[index] ?? 'normal';
    const next = accentPattern.slice();
    next[index] = cycleAccentLevel(current);
    void hapticMedium();
    onChange(next);
  };

  return (
    <View style={[styles.root, compact && styles.rootCompact]} accessibilityRole="adjustable">
      <View style={styles.head}>
        <Text style={styles.kicker}>{editing ? 'EDIT BEATS' : 'BEATS'}</Text>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Done editing beats' : 'Edit beat accents'}
            onPress={() => {
              void hapticSelection();
              if (!editing && onOpenEditor) {
                onOpenEditor();
                return;
              }
              setEditing((prev) => !prev);
            }}
            hitSlop={8}
            style={styles.editHit}>
            <Text style={[styles.edit, editing && styles.editOn]}>{editing ? 'DONE' : 'EDIT'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.groups}>
        {groups.map((group, groupIndex) => (
          <View key={`${group.start}-${group.length}`} style={[styles.group, groupIndex > 0 && styles.groupGap]}>
            {Array.from({ length: group.length }, (_, offset) => {
              const index = group.start + offset;
              const level = accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
              const downbeat = index === 0;
              const active = playing && !silent && beatIndex === index;
              const muted = level === 'mute';
              return (
                <Pressable
                  key={index}
                  disabled={!editing}
                  accessibilityRole={editing ? 'button' : 'none'}
                  accessibilityLabel={`Beat ${index + 1}, ${beatRoleLabel(level, downbeat)}`}
                  onPress={() => cycle(index)}
                  style={[
                    styles.cell,
                    downbeat && styles.cellDown,
                    muted && styles.cellMute,
                    active && styles.cellOn,
                    { minWidth: compact ? 22 : count >= 9 ? 20 : 28 },
                  ]}>
                  <View
                    style={[
                      styles.lamp,
                      downbeat && styles.lampDown,
                      level === 'strong' && styles.lampStrong,
                      muted && styles.lampMute,
                      active && styles.lampOn,
                    ]}
                  />
                  {editing ? (
                    <Text style={styles.role}>{beatRoleLabel(level, downbeat)}</Text>
                  ) : (
                    <Text style={[styles.num, active && styles.numOn]}>{index + 1}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: 'center',
  },
  rootCompact: {
    minHeight: 44,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  kicker: {
    color: 'rgba(220,228,236,0.42)',
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  editHit: {
    minHeight: 28,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  edit: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  editOn: {
    color: TEAL,
  },
  groups: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 1,
  },
  groupGap: {
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(220,189,114,0.28)',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
    flexGrow: 1,
  },
  cellDown: {
    minWidth: 34,
  },
  cellMute: {
    opacity: 0.72,
  },
  cellOn: {
    transform: [{ translateY: -1 }],
  },
  lamp: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(62,230,216,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(62,230,216,0.22)',
  },
  lampDown: {
    height: 11,
    backgroundColor: GOLD,
    borderColor: 'rgba(220,189,114,0.7)',
  },
  lampStrong: {
    backgroundColor: GOLD,
  },
  lampMute: {
    backgroundColor: 'transparent',
    borderColor: MUTE,
  },
  lampOn: {
    backgroundColor: TEAL,
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  num: {
    marginTop: 4,
    color: 'rgba(232,228,216,0.42)',
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  numOn: {
    color: TEAL,
  },
  role: {
    marginTop: 3,
    color: GOLD,
    fontSize: 8,
    letterSpacing: 0.6,
    fontWeight: '800',
  },
});
