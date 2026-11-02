/**
 * SOUND SYSTEM 2.0 HANDOFF
 * This browser is not the accepted POCKT 2.0 sound UX.
 * Next major pass after Pass 5: complete sound inventory/adjudication/rebuild
 * AND a full sound-selection UX redesign. Do not polish this inventory UI.
 */
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSkin } from '@/components/skins/SkinContext';
import { SOUND_CATEGORIES, mixFamilyForPreset, PRIMARY_MIX_PRESETS, FAMILY_RECOMMENDED, type SoundCategoryId } from '@/constants/sound-library';
import { CLICK_MODULES } from '@/audio/click-assets';
import { SOUNDS, soundStudioName } from '@/constants/sounds';
import { isUserFacingSound } from '@/constants/curated-sounds';
import { mixPresetPairCaption, studioPairCaption } from '@/lib/room-voice';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import { resolveAccentPatch, type AccentMode } from '@/lib/accent-sound';
import type { RoomId, SoundId } from '@/lib/types';

type Props = {
  visible: boolean;
  roomId: RoomId;
  sound: SoundId;
  recentSounds: SoundId[];
  favoriteSounds: SoundId[];
  soundDownbeat: SoundId | null;
  soundBeat: SoundId | null;
  soundSub: SoundId | null;
  accentMode?: AccentMode;
  customAccentSoundId?: SoundId | null;
  onSound: (sound: SoundId) => void;
  onFavorite: (sound: SoundId) => void;
  onRoles: (patch: {
    soundDownbeat?: SoundId | null;
    soundBeat?: SoundId | null;
    soundSub?: SoundId | null;
    voiceCount?: boolean;
    accentMode?: AccentMode;
    customAccentSoundId?: SoundId | null;
  }) => void;
  onPreview: (sound: SoundId) => void;
  onClose: () => void;
  /** While the metronome is running, a choice joins that clock. A stopped choice is a one-shot audition. */
  playing?: boolean;
  initialFamily?: SoundCategoryId | null;
};

function isPlayable(id: SoundId): boolean {
  return Boolean(SOUNDS[id] && CLICK_MODULES[id] && isUserFacingSound(id));
}

export function SoundLibrarySheet({
  visible,
  roomId: _roomId,
  sound,
  recentSounds,
  favoriteSounds,
  soundDownbeat,
  soundBeat,
  soundSub,
  accentMode = 'auto',
  customAccentSoundId = null,
  onSound,
  onFavorite,
  onRoles,
  onPreview,
  onClose,
  playing = false,
  initialFamily = null,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();
  const [familyId, setFamilyId] = useState<SoundCategoryId | null>(initialFamily);
  const [advanced, setAdvanced] = useState(false);
  const [pickingAccent, setPickingAccent] = useState(false);
  const familyScrollRef = useRef<ScrollView>(null);
  const assignmentY = useRef(0);

  const revealAssignment = (next = true) => {
    setAdvanced(next);
    if (!next) return;
    requestAnimationFrame(() => {
      familyScrollRef.current?.scrollTo({
        y: Math.max(0, assignmentY.current - 12),
        animated: true,
      });
    });
  };

  const families = useMemo(() => {
    return SOUND_CATEGORIES.map((cat) => {
      if (cat.id === 'favorites') {
        const favs = favoriteSounds.filter(isPlayable);
        return { ...cat, sounds: favs };
      }
      return { ...cat, sounds: cat.sounds.filter(isPlayable) };
    }).filter((cat) => cat.id === 'favorites' || cat.id === 'mixes' || cat.sounds.length > 0);
  }, [favoriteSounds]);

  const active = familyId ? families.find((cat) => cat.id === familyId) : null;

  const audition = (id: SoundId) => {
    if (!playing) onPreview(id);
  };

  const applySound = (next: SoundId) => {
    if (!isPlayable(next)) return;
    void hapticSelection();
    if (pickingAccent) {
      onRoles({
        accentMode: 'custom',
        customAccentSoundId: next,
        soundDownbeat: next,
      });
      audition(next);
      setPickingAccent(false);
      return;
    }
    onSound(next);
    audition(next);
  };

  const applyPreset = (preset: (typeof PRIMARY_MIX_PRESETS)[number]) => {
    void hapticSelection();
    onSound(preset.sound);
    onRoles({
      soundDownbeat: preset.soundDownbeat ?? null,
      soundBeat: preset.soundBeat ?? preset.sound,
      soundSub: preset.soundSub ?? null,
      accentMode: 'auto',
      customAccentSoundId: null,
      voiceCount: preset.sound === 'count',
    });
    audition(preset.sound);
  };

  const goHome = () => {
    setFamilyId(null);
    setAdvanced(false);
    setPickingAccent(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss sound studio" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: '#100D0B', borderColor: '#3A3428', borderTopColor: '#C4B090', paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: theme.ivoryMute }]}>SOUND STUDIO</Text>
              <Text style={[styles.current, { color: theme.ivory }]}>
                {active
                  ? active.label
                  : studioPairCaption({ sound, soundDownbeat, soundBeat })}
              </Text>
            </View>
            {active ? (
              <Pressable onPress={goHome} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to families">
                <Ionicons name="chevron-back" size={26} color={theme.ivory} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close sound studio">
              <Ionicons name="close" size={26} color={theme.ivory} />
            </Pressable>
          </View>

          <View style={styles.accentRow}>
            <Text style={[styles.accentLabel, { color: theme.ivoryMute }]}>ACCENT SOUND</Text>
            <Pressable
              onPress={() => {
                void hapticSelection();
                setPickingAccent(false);
                onRoles(resolveAccentPatch(sound, 'auto', null));
              }}
              style={[styles.accentChip, accentMode !== 'custom' && { borderColor: theme.accent }]}>
              <Text style={[styles.accentChipText, { color: accentMode !== 'custom' ? theme.ivory : theme.ivoryDim }]}>AUTO PAIR</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void hapticSelection();
                setPickingAccent(true);
                onRoles({ accentMode: 'custom', customAccentSoundId: customAccentSoundId ?? soundDownbeat ?? sound });
              }}
              style={[styles.accentChip, accentMode === 'custom' && { borderColor: theme.accent }]}>
              <Text style={[styles.accentChipText, { color: accentMode === 'custom' ? theme.ivory : theme.ivoryDim }]}>CHOOSE</Text>
            </Pressable>
          </View>
          {accentMode === 'custom' ? (
            <Text style={[styles.accentHint, { color: pickingAccent ? theme.accent : theme.ivoryMute }]}>
              {pickingAccent
                ? 'Tap any sound below to use it as the downbeat accent.'
                : `You chose ${soundStudioName(customAccentSoundId ?? soundDownbeat ?? sound)} as the accent.`}
            </Text>
          ) : (
            <Text style={[styles.accentHint, { color: theme.ivoryMute }]}>
              AUTO PAIR keeps the complementary accent. CHOOSE picks one.
            </Text>
          )}

              {!active ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.homeInner}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {recentSounds.filter(isPlayable).length ? (
                <>
                  <Text style={styles.mixHeading}>RECENT</Text>
                  <View style={styles.recentRow}>
                    {recentSounds.filter(isPlayable).slice(0, 6).map((id) => {
                      const on = sound === id;
                      return (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={`Recent sound ${soundStudioName(id)}`}
                          onPress={() => applySound(id)}
                          style={[styles.recentChip, { borderColor: on ? theme.accent : theme.line }]}>
                          <Text style={[styles.recentText, { color: on ? theme.ivory : theme.ivoryDim }]} numberOfLines={1}>
                            {soundStudioName(id)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <Text style={styles.soundsHeading}>INDIVIDUAL SOUNDS</Text>
              <View style={styles.familyGrid}>
                {families
                  .filter((cat) => cat.id !== 'mixes')
                  .map((cat) => {
                    const count = cat.sounds.length;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setFamilyId(cat.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${cat.label} family`}
                        style={[styles.familyCard, { borderColor: '#3A3026', backgroundColor: '#1E1914', borderTopColor: '#6E5D46' }]}>
                        <View style={styles.familyTop}>
                          <Text
                            style={[styles.familyLabel, { color: theme.ivory }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.58}>
                            {cat.label}
                          </Text>
                          <View style={[styles.countBadge, { borderColor: theme.line, backgroundColor: theme.bg }]}>
                            <Text style={[styles.countText, { color: theme.ivoryMute }]}>
                              {cat.id === 'favorites' && count === 0 ? '★' : `${count}`}
                            </Text>
                          </View>
                        </View>
                        {cat.id === 'favorites' && count === 0 ? (
                          <Text style={[styles.familyHint, { color: theme.ivoryMute }]}>STAR A SOUND</Text>
                        ) : (
                          <Text style={[styles.familyHint, { color: theme.ivoryMute }]}>Tap to browse</Text>
                        )}
                      </Pressable>
                    );
                  })}
              </View>
              <Text style={styles.mixHeading}>POCKT MIXES</Text>
              <Text style={[styles.sectionHint, { color: theme.ivoryDim }]}>Curated one-tap combinations</Text>
              {PRIMARY_MIX_PRESETS.filter((item) => isUserFacingSound(item.sound)).map((item) => {
                const on = sound === item.sound && (soundDownbeat ?? sound) === (item.soundDownbeat ?? item.sound);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => applyPreset(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} mix. ${mixFamilyForPreset(item.id)} family. Applies a normal and accent pair.`}
                    style={[
                      styles.card,
                      styles.mixCard,
                      {
                        borderColor: on ? theme.accent : theme.line,
                        backgroundColor: on ? theme.bgRaised : 'rgba(232,200,120,0.06)',
                      },
                    ]}>
                    <View style={styles.cardMain}>
                      <Text style={[styles.cardName, { color: on ? theme.ivory : theme.ivoryDim }]}>{item.label}</Text>
                      <Text style={[styles.cardHint, { color: theme.ivoryMute }]} numberOfLines={1}>
                        {mixPresetPairCaption(item)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView
              ref={familyScrollRef}
              style={styles.body}
              contentContainerStyle={styles.bodyInner}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {active.id === 'favorites' && active.sounds.length === 0 ? (
                <Text style={[styles.empty, { color: theme.ivoryMute }]}>
                  Star a sound from any family. It appears here immediately.
                </Text>
              ) : null}
              {active.id !== 'mixes' && FAMILY_RECOMMENDED[active.id] ? (
                <Pressable
                  onPress={() => applySound(FAMILY_RECOMMENDED[active.id]!.sound)}
                  accessibilityRole="button"
                  accessibilityLabel={`${FAMILY_RECOMMENDED[active.id]!.label}. Recommended pairing.`}
                  style={[
                    styles.card,
                    styles.recommended,
                    {
                      borderColor: sound === FAMILY_RECOMMENDED[active.id]!.sound ? theme.accent : theme.line,
                      backgroundColor: sound === FAMILY_RECOMMENDED[active.id]!.sound ? theme.bgRaised : 'transparent',
                    },
                  ]}>
                  <View style={styles.cardMain}>
                    <Text style={[styles.cardName, { color: theme.ivory }]}>{FAMILY_RECOMMENDED[active.id]!.label}</Text>
                    <Text style={[styles.cardHint, { color: theme.ivoryMute }]}>{FAMILY_RECOMMENDED[active.id]!.hint}</Text>
                  </View>
                </Pressable>
              ) : null}
              {active.id === 'mixes'
                ? PRIMARY_MIX_PRESETS.filter((item) => isUserFacingSound(item.sound)).map((item) => {
                    const on = sound === item.sound && (soundDownbeat ?? sound) === (item.soundDownbeat ?? item.sound);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => applyPreset(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label}. Shows that collection.`}
                        style={[
                          styles.card,
                          {
                            borderColor: on ? theme.accent : theme.line,
                            backgroundColor: on ? theme.bgRaised : 'transparent',
                          },
                        ]}>
                        <View style={styles.cardMain}>
                          <Text style={[styles.cardName, { color: on ? theme.ivory : theme.ivoryDim }]}>{item.label}</Text>
                          <Text style={[styles.cardHint, { color: theme.ivoryMute }]}>Normal + complementary accent</Text>
                        </View>
                      </Pressable>
                    );
                  })
                : active.sounds.map((id) => {
                const def = SOUNDS[id];
                if (!def) return null;
                const on = sound === id;
                const fav = favoriteSounds.includes(id);
                return (
                  <View
                    key={`${active.id}-${id}`}
                    style={[
                      styles.card,
                      {
                        borderColor: on ? theme.accent : theme.line,
                        backgroundColor: on ? theme.bgRaised : 'transparent',
                      },
                    ]}>
                    <Pressable
                      style={styles.cardMain}
                      onPress={() => applySound(id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${soundStudioName(id)}`}>
                      <Text style={[styles.cardName, { color: on ? theme.ivory : theme.ivoryDim }]}>
                        {soundStudioName(id)}
                      </Text>
                      <Text style={[styles.cardHint, { color: theme.ivoryMute }]} numberOfLines={1}>
                        {def.hint}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void hapticTap();
                        onFavorite(id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={fav ? `Unfavorite ${soundStudioName(id)}` : `Favorite ${soundStudioName(id)}`}
                      hitSlop={8}
                      style={styles.iconBtn}>
                      <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? theme.accent : theme.ivoryDim} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void hapticTap();
                        if (playing) applySound(id);
                        else audition(id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={playing ? `Use ${soundStudioName(id)} while playing` : `Preview ${soundStudioName(id)}`}
                      hitSlop={8}
                      style={[styles.preview, { borderColor: theme.line }]}>
                      <Text style={[styles.previewText, { color: theme.ivory }]}>PREVIEW</Text>
                    </Pressable>
                  </View>
                );
              })}

              <View
                onLayout={(event) => {
                  assignmentY.current = event.nativeEvent.layout.y;
                }}>
              <Pressable
                onPress={() => revealAssignment(!advanced)}
                accessibilityRole="button"
                accessibilityLabel={advanced ? 'Hide beat assignment' : 'Show beat assignment'}
                style={[styles.advancedToggle, { borderColor: theme.line }]}>
                <Text style={[styles.cat, { color: theme.ivory }]}>
                  {advanced ? 'BEAT ASSIGNMENT ▾' : 'BEAT ASSIGNMENT ▸'}
                </Text>
                <Text style={[styles.hint, { color: theme.ivoryMute, marginBottom: 0 }]}>
                  Tap to reveal and assign downbeat, beat, and subdivision sounds
                </Text>
              </Pressable>
              </View>
              {advanced ? (
                <View style={styles.block}>
                  <Text style={[styles.hint, { color: theme.ivoryDim }]}>
                    Tap a sound chip to assign that role. Changes apply live.
                  </Text>
                  <RoleRow
                    label="DOWNBEAT"
                    value={soundDownbeat}
                    fallback={sound}
                    familySounds={active.sounds}
                    theme={theme}
                    onClear={() => onRoles({ soundDownbeat: null })}
                    onPick={(id) => {
                      onRoles({ soundDownbeat: id });
                      audition(id);
                    }}
                    onPreview={audition}
                  />
                  <RoleRow
                    label="BEAT"
                    value={soundBeat}
                    fallback={sound}
                    familySounds={active.sounds}
                    theme={theme}
                    onClear={() => onRoles({ soundBeat: null })}
                    onPick={(id) => {
                      onRoles({ soundBeat: id });
                      audition(id);
                    }}
                    onPreview={audition}
                  />
                  <RoleRow
                    label="SUBDIVISION"
                    value={soundSub}
                    fallback={sound}
                    familySounds={active.sounds}
                    theme={theme}
                    onClear={() => onRoles({ soundSub: null })}
                    onPick={(id) => {
                      onRoles({ soundSub: id });
                      audition(id);
                    }}
                    onPreview={audition}
                  />
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function RoleRow({
  label,
  value,
  fallback,
  familySounds,
  theme,
  onClear,
  onPick,
  onPreview,
}: {
  label: string;
  value: SoundId | null;
  fallback: SoundId;
  familySounds: SoundId[];
  theme: { ivory: string; ivoryDim: string; ivoryMute: string; line: string; accent: string; bgRaised: string };
  onClear: () => void;
  onPick: (id: SoundId) => void;
  onPreview: (id: SoundId) => void;
}) {
  const assigned = value ?? fallback;
  const defaults: SoundId[] = ['lib-bell', 'lib-wood', 'lib-hat', 'lib-kick', 'lib-click', 'precision'];
  const family = familySounds.filter((id) => CLICK_MODULES[id]).slice(0, 8);
  const quick = (family.length ? family : defaults).filter((id) => CLICK_MODULES[id]);
  return (
    <View style={styles.role}>
      <View style={styles.roleTop}>
        <Text style={[styles.roleLabel, { color: theme.ivoryMute }]}>{label}</Text>
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Reset ${label}`}>
          <Text style={[styles.roleClear, { color: theme.ivoryDim }]}>
            {value ? `RESET · ${soundStudioName(assigned)}` : `USING ${soundStudioName(assigned)}`}
          </Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {quick.map((id) => {
          const on = assigned === id && value != null;
          return (
            <View key={id} style={[styles.roleChip, { borderColor: on ? theme.accent : theme.line }]}>
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  onPick(id);
                }}
                style={styles.roleChipMain}>
                <Text style={[styles.cellText, { color: on ? theme.ivory : theme.ivoryDim }]}>{soundStudioName(id)}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void hapticTap();
                  onPreview(id);
                }}
                hitSlop={6}
                style={styles.rolePreview}>
                <Ionicons name="play" size={12} color={theme.ivoryDim} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#C4B090',
    backgroundColor: '#100D0B',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginRight: 4,
  },
  accentChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(211,176,122,0.22)',
    justifyContent: 'center',
  },
  accentChipText: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  accentHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
  },
  current: {
    fontSize: 22,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    marginBottom: 6,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
  },
  presetRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1E1914',
    borderTopColor: '#6E5D46',
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  body: {
    maxHeight: 520,
  },
  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  homeInner: {
    paddingBottom: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    marginTop: 4,
  },
  mixHeading: {
    marginTop: 2,
    marginBottom: 2,
    color: '#C45A4A',
    fontSize: 15,
    letterSpacing: 2.8,
    fontWeight: '800',
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  recentChip: {
    minHeight: 44,
    maxWidth: 160,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  soundsHeading: {
    marginTop: 18,
    marginBottom: 2,
    color: 'rgba(232,216,186,0.72)',
    fontSize: 13,
    letterSpacing: 2.6,
    fontWeight: '800',
  },
  sectionSpaced: {
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginTop: -2,
    marginBottom: 6,
  },
  mixCard: {
    minHeight: 62,
  },
  familyCard: {
    width: '47.6%',
    minHeight: 112,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  familyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  familyLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: '800',
    lineHeight: 14,
  },
  familyHint: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
    marginTop: 8,
  },
  countBadge: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countText: {
    fontSize: 9,
    letterSpacing: 0.2,
    fontWeight: '700',
  },
  bodyInner: {
    paddingBottom: 12,
    gap: 8,
  },
  block: {
    gap: 8,
    marginTop: 4,
  },
  cat: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  card: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    gap: 4,
  },
  recommended: {
    minHeight: 64,
  },
  cardMain: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardHint: {
    fontSize: 11,
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    minWidth: 72,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  previewText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  advancedToggle: {
    minHeight: 64,
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cellText: {
    fontSize: 12,
    fontWeight: '700',
  },
  role: {
    gap: 6,
    marginBottom: 8,
  },
  roleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  roleClear: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
  },
  roleChipMain: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    minHeight: 48,
  },
  rolePreview: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
