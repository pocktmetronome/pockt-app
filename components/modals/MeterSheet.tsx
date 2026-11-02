import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSkin } from '@/components/skins/SkinContext';
import { SUBDIVISION_ORDER, TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { hapticEvent } from '@/lib/haptics';
import {
  METER_DENOMINATORS,
  METER_NUMERATORS,
  METER_PRESETS,
  groupingsFor,
  parseMeterParts,
  resolveMeterId,
  type MeterDenominator,
  type MeterGroupingId,
} from '@/lib/meter-select';
import type { SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  visible: boolean;
  value: TimeSignatureId;
  onChange: (id: TimeSignatureId) => void;
  onClose: () => void;
  onRestore?: () => void;
  subdivision?: SubdivisionId;
  onSubdivisionChange?: (id: SubdivisionId) => void;
  focusSection?: 'meter' | 'subdivision';
  playing?: boolean;
  initialMore?: boolean;
};

export function MeterSheet({
  visible,
  value,
  onChange,
  onClose,
  onRestore,
  subdivision,
  onSubdivisionChange,
  focusSection = 'meter',
  playing = false,
  initialMore = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const theme = useSkin();
  const live = parseMeterParts(value);
  const [beats, setBeats] = useState(live.beats);
  const [denominator, setDenominator] = useState<MeterDenominator>(live.denominator);
  const [grouping, setGrouping] = useState<MeterGroupingId>(live.grouping);
  const [more, setMore] = useState(initialMore);
  const bodyRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const next = parseMeterParts(value);
    setBeats(next.beats);
    setDenominator(next.denominator);
    setGrouping(next.grouping);
  }, [value, visible]);

  useEffect(() => {
    if (!visible || !more) return;
    const timer = setTimeout(() => bodyRef.current?.scrollToEnd({ animated: false }), 40);
    return () => clearTimeout(timer);
  }, [visible, more]);

  const groups = useMemo(() => groupingsFor(beats, denominator), [beats, denominator]);
  const resolved = resolveMeterId({
    beats,
    denominator,
    grouping: groups.some((item) => item.id === grouping) ? grouping : groups[0]?.id ?? 'none',
  });

  const apply = (id: TimeSignatureId) => {
    void hapticEvent('selector');
    onChange(id);
  };

  const draftCustom = (nextBeats: number, nextDen: MeterDenominator, nextGroup: MeterGroupingId) => {
    const options = groupingsFor(nextBeats, nextDen);
    const group = options.some((item) => item.id === nextGroup) ? nextGroup : options[0]?.id ?? 'none';
    if (!resolveMeterId({ beats: nextBeats, denominator: nextDen, grouping: group })) return;
    setBeats(nextBeats);
    setDenominator(nextDen);
    setGrouping(group);
    void hapticEvent('selector');
  };

  const choosePreset = (id: TimeSignatureId) => {
    apply(id);
    onClose();
  };

  const commitCustom = () => {
    if (!resolved) return;
    apply(resolved);
    onClose();
  };

  const subdivisionBlock = onSubdivisionChange && subdivision ? (
    <View style={styles.customBlock}>
      <Text
        style={[
          styles.kicker,
          { color: theme.ivoryMute, marginTop: 4 },
          focusSection === 'subdivision' ? styles.sectionFocus : null,
        ]}>
        SUBDIVISION
      </Text>
      <View style={styles.denRow}>
        {SUBDIVISION_ORDER.map((id) => {
          const selected = subdivision === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Subdivision ${subdivisionCaption(id)}`}
              onPress={() => {
                void hapticEvent('selector');
                onSubdivisionChange(id);
              }}
              style={[
                styles.subChip,
                {
                  borderColor: selected ? '#F0A23C' : '#3A3026',
                  backgroundColor: selected ? '#3A2812' : '#1E1914',
                  borderTopColor: selected ? '#FFC36B' : '#6E5D46',
                },
              ]}>
              <Text style={[styles.denChipText, { color: selected ? theme.ivory : theme.ivoryDim, fontSize: 11 }]} numberOfLines={1}>
                {id === 'quarter' ? 'BEAT' : id === 'eighths' ? '8THS' : id === 'triplet' ? 'TRIPLET' : id === 'sixteenths' ? '16THS' : 'DOTTED'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ) : null;

  const footerPad = Math.max(insets.bottom, 12);
  const sheetMax = Math.round(windowH * 0.92);
  const headerH = 56;
  const footerH = 64 + footerPad;
  const scrollMax = Math.max(160, sheetMax - headerH - footerH - 24);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss time signature" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: '#100D0B',
              borderColor: '#3A3428',
              borderTopColor: '#C4B090',
              maxHeight: sheetMax,
            },
          ]}>
          <View style={styles.top}>
            <Text style={[styles.title, { color: theme.ivory }]}>
              {focusSection === 'subdivision' ? 'Subdivision' : 'Meter'}
            </Text>
            <Text style={[styles.current, { color: theme.ivoryDim }]}>
              {focusSection === 'subdivision' && subdivision ? subdivisionCaption(subdivision) : (
                <>{beats} / {denominator}</>
              )}
            </Text>
          </View>

          <View style={styles.primary} accessibilityLabel="COMMON meters and subdivision">
            <Text style={[styles.kicker, { color: theme.ivoryMute }]}>METER</Text>
            <View style={styles.presetRow}>
              {METER_PRESETS.map((id) => {
                const selected = id === value;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => choosePreset(id)}
                    style={[
                      styles.preset,
                      {
                        borderColor: selected ? '#F0A23C' : '#3A3026',
                        backgroundColor: selected ? '#3A2812' : '#1E1914',
                        borderTopColor: selected ? '#FFC36B' : '#6E5D46',
                      },
                    ]}>
                    <Text style={[styles.presetText, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                      {TIME_SIGNATURES[id].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {groups.length ? (
              <View style={styles.customBlock}>
                <Text style={[styles.fieldLabel, { color: theme.ivoryMute }]}>GROUPING</Text>
                <View style={styles.denRow}>
                  {groups.map((item) => {
                    const selected = grouping === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Grouping ${item.label}`}
                        onPress={() => {
                          const id = resolveMeterId({ beats, denominator, grouping: item.id });
                          if (id) choosePreset(id);
                        }}
                        style={[
                          styles.denChip,
                          {
                            borderColor: selected ? theme.accent : theme.line,
                            backgroundColor: selected ? theme.bgRaised : 'transparent',
                          },
                        ]}>
                        <Text style={[styles.denChipText, { color: selected ? theme.ivory : theme.ivoryDim }]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : value === '6/8' || value === '12/8' || value.startsWith('9/8') ? (
              <View style={styles.denRow}>
                <View style={[styles.denChip, styles.groupLatched]}>
                  <Text style={[styles.denChipText, { color: theme.ivory }]}>
                    {value === '6/8' ? '3+3' : value === '12/8' ? '3+3+3+3' : '3+3+3'}
                  </Text>
                </View>
              </View>
            ) : null}
            {subdivisionBlock}
          </View>

          <ScrollView
            ref={bodyRef}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={[styles.body, { maxHeight: scrollMax }]}
            contentContainerStyle={styles.bodyInner}>
            {playing ? (
              <Text style={[styles.hint, { color: theme.ivoryDim }]}>
                While playing, meter and subdivision change on the next downbeat.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={more ? 'Hide custom meter' : 'More meters'}
              onPress={() => setMore((value) => !value)}
              style={[styles.restoreBar, { borderColor: theme.line, marginTop: 16 }]}>
              <Text style={[styles.doneBarText, { color: theme.ivory }]}>{more ? 'HIDE CUSTOM' : 'MORE'}</Text>
            </Pressable>

            {more ? (
              <>
            <Text style={[styles.kicker, { color: theme.ivoryMute, marginTop: 16 }]}>CUSTOM</Text>
            <Text style={[styles.hint, { color: theme.ivoryDim }]}>
              Beats and note value. Only valid musical combinations.
            </Text>

            <View style={styles.customBlock}>
              <Text style={[styles.fieldLabel, { color: theme.ivoryMute }]}>BEATS</Text>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fewer beats"
                  onPress={() => draftCustom(Math.max(1, beats - 1), denominator, grouping)}
                  style={[styles.stepBtn, { borderColor: theme.line }]}>
                  <Text style={[styles.stepBtnText, { color: theme.ivory }]}>−</Text>
                </Pressable>
                <Text style={[styles.stepValue, { color: theme.ivory }]}>{beats}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More beats"
                  onPress={() => draftCustom(Math.min(16, beats + 1), denominator, grouping)}
                  style={[styles.stepBtn, { borderColor: theme.line }]}>
                  <Text style={[styles.stepBtnText, { color: theme.ivory }]}>+</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={styles.numRow}>
                {METER_NUMERATORS.map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => draftCustom(n, denominator, grouping)}
                    style={[
                      styles.numChip,
                      {
                        borderColor: beats === n ? theme.accent : theme.line,
                        backgroundColor: beats === n ? theme.bgRaised : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.numChipText, { color: beats === n ? theme.ivory : theme.ivoryDim }]}>{n}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.customBlock}>
              <Text style={[styles.fieldLabel, { color: theme.ivoryMute }]}>NOTE VALUE</Text>
              <View style={styles.denRow}>
                {METER_DENOMINATORS.map((den) => {
                  const ok = resolveMeterId({ beats, denominator: den, grouping }) != null;
                  const selected = denominator === den;
                  return (
                    <Pressable
                      key={den}
                      disabled={!ok}
                      onPress={() => draftCustom(beats, den, grouping)}
                      style={[
                        styles.denChip,
                        {
                          borderColor: selected ? theme.accent : theme.line,
                          backgroundColor: selected ? theme.bgRaised : 'transparent',
                          opacity: ok ? 1 : 0.35,
                        },
                      ]}>
                      <Text style={[styles.denChipText, { color: selected ? theme.ivory : theme.ivoryDim }]}>/{den}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {groups.length ? (
              <View style={styles.customBlock}>
                <Text style={[styles.fieldLabel, { color: theme.ivoryMute }]}>GROUPING</Text>
                <View style={styles.denRow}>
                  {groups.map((item) => {
                    const selected = grouping === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => draftCustom(beats, denominator, item.id)}
                        style={[
                          styles.denChip,
                          {
                            borderColor: selected ? theme.accent : theme.line,
                            backgroundColor: selected ? theme.bgRaised : 'transparent',
                          },
                        ]}>
                        <Text style={[styles.denChipText, { color: selected ? theme.ivory : theme.ivoryDim }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Text style={[styles.resolved, { color: theme.ivoryMute }]}>
              {resolved ? `Selected ${beats} / ${denominator}` : 'That combination is not available'}
            </Text>

            {onRestore ? (
              <Pressable
                onPress={() => {
                  void hapticEvent('selector');
                  onRestore();
                }}
                accessibilityRole="button"
                accessibilityLabel="Restore default 4/4 quarter"
                style={[styles.restoreBar, { borderColor: theme.line }]}>
                <Text style={[styles.doneBarText, { color: theme.ivoryDim }]}>RESTORE DEFAULT</Text>
              </Pressable>
            ) : null}
              </>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.line,
                paddingBottom: footerPad,
              },
            ]}
            accessibilityLabel="Meter actions">
            <View style={styles.actionRow}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={[styles.doneBar, styles.actionBtn, { borderColor: theme.line }]}>
                <Text style={[styles.doneBarText, { color: theme.ivoryDim }]}>CANCEL</Text>
              </Pressable>
              <Pressable
                onPress={commitCustom}
                disabled={!resolved}
                accessibilityRole="button"
                accessibilityLabel="Done"
                style={[
                  styles.doneBar,
                  styles.actionBtn,
                  { borderColor: theme.line, opacity: resolved ? 1 : 0.4 },
                ]}>
                <Text style={[styles.doneBarText, { color: theme.ivory }]}>DONE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopColor: '#C4B090',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#100D0B',
  },
  body: {
    flexGrow: 0,
  },
  bodyInner: {
    paddingBottom: 12,
  },
  top: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  current: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  kicker: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  sectionFocus: {
    letterSpacing: 3.6,
  },
  hint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    width: '23%',
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 4,
    backgroundColor: '#1E1914',
    borderTopWidth: 1,
    borderTopColor: '#6E5D46',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  primary: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  groupLatched: {
    backgroundColor: '#3A2812',
    borderColor: '#F0A23C',
    borderTopColor: '#FFC36B',
  },
  presetText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  customBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 10,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: -2,
  },
  stepValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  numRow: {
    gap: 6,
    paddingRight: 8,
  },
  numChip: {
    minWidth: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  numChipText: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  denRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  denChip: {
    flex: 1,
    minWidth: 64,
    minHeight: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subChip: {
    minWidth: '18%',
    flexGrow: 1,
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  denChipText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  resolved: {
    fontSize: 12,
    marginBottom: 8,
  },
  restoreBar: {
    marginTop: 4,
    minHeight: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  doneBar: {
    minHeight: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBarText: {
    fontSize: 16,
    letterSpacing: 2.8,
    fontWeight: '800',
  },
});
