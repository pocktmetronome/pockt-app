/**
 * The four panels the front page opens: Tempo, Meter, Sound, Settings. One language, large type.
 */
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Key, NS, Row, Section, Segmented, Sheet, press, tick } from '@/components/front/ui';
import { capturePreset, usePresets } from '@/lib/practice-setups';
import { TIME_SIGNATURES } from '@/constants/meter';
import { ROOM_SOUND_PRESETS, SOUND_CATEGORIES } from '@/constants/sound-library';
import { SOUNDS, VOICE_MAX_BPM, familyForSound, soundStudioName } from '@/constants/sounds';
import { isCountSample, resolveAccentPatch } from '@/lib/accent-sound';
import { defaultAccentPattern, restoreDefaultMeter } from '@/lib/accents';
import { DEFAULT_CONFIG } from '@/constants/timing';
import { ACCENT_WORD, beatsOf, COMMON_METERS, groupingVariants, meterFor, meterLabel, nextAccent } from '@/lib/front-meter';
import { tempoName } from '@/lib/tempo-name';
import { PALETTE, cssOf, proBarOf, type BeatLight } from '@/lib/front-light';
import type { AccentLevel, CountInBars, LockInPattern, MetronomeConfig, PolyrhythmId, SoundId, SubdivisionId, SwingAmount, TimeSignatureId } from '@/lib/types';

const SUB_SHORT: Record<string, string> = { quarter: '♩', eighth: '♪♪', triplet: '3', sixteenth: '16', dotted: '♪.', 'eighth-triplet': '3', 'sixteenth-triplet': '6' };

type Common = { open: boolean; onClose: () => void; config: MetronomeConfig; update: (patch: Partial<MetronomeConfig>) => void };

// ---------------------------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------------------------
export function TempoSheet({
  open,
  onClose,
  bpm,
  onSet,
  light,
  onLight,
}: {
  open: boolean;
  onClose: () => void;
  bpm: number;
  onSet: (bpm: number) => void;
  /** On a face with its own light (Pulse), its colours are picked here too. */
  light?: BeatLight;
  onLight?: (p: Partial<BeatLight>) => void;
}) {
  const [entry, setEntry] = useState('');
  const [quick, setQuick] = useState(false);
  useEffect(() => {
    if (open) {
      setEntry('');
      setQuick(false);
    }
  }, [open]);
  const shown = entry ? parseInt(entry, 10) : bpm;
  const valid = shown >= 20 && shown <= 400;
  const type = (k: string) => setEntry((e) => (e.length >= 3 ? e : (e + k).replace(/^0+/, '')));
  // One button closes the sheet: "Done" when nothing is typed, "Set 132 BPM" once a tempo is entered.
  const commit = () => {
    if (!entry) return onClose();
    if (!valid) return;
    onSet(shown);
    onClose();
  };
  const commitLabel = !entry ? 'Done' : valid ? `Set ${shown} BPM` : 'Enter 20 to 400';
  return (
    <Sheet open={open} onClose={onClose} title="Tempo" footer={<Key label={commitLabel} big tone="amber" onPress={commit} />}>
      <View style={s.tempoHead}>
        <Text style={[s.tempoValue, !valid && { color: NS.inkMute }]}>{entry || bpm}</Text>
        <Text style={s.tempoName}>{valid ? tempoName(shown).toUpperCase() : 'ENTER 20 TO 400'}</Text>
      </View>
      <View style={s.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
          <Key
            key={k}
            label={k === 'C' ? 'Clear' : k}
            big
            style={s.padKey}
            accessibilityLabel={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : k}
            onPress={() => (k === '⌫' ? setEntry((e) => e.slice(0, -1)) : k === 'C' ? setEntry('') : type(k))}
          />
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <Key label={quick ? 'Hide quick tempos' : 'Quick tempos'} selected={quick} onPress={() => setQuick((q) => !q)} />
      </View>
      {quick ? (
        <View style={[s.wrap, { marginTop: 10 }]}>
          {[60, 72, 80, 90, 100, 110, 120, 128, 140, 160, 180, 200].map((v) => (
            <Key key={v} label={String(v)} selected={bpm === v} style={s.quick} onPress={() => { onSet(v); onClose(); }} />
          ))}
        </View>
      ) : null}
      {light && onLight ? (
        <>
          <Section title="Downbeat colour" hint="Beat one">
            <Swatches value={light.down} onPick={(down) => onLight({ down })} />
          </Section>
          <Section title="Beat colour" hint="Every other beat">
            <Swatches value={light.up} onPick={(up) => onLight({ up })} />
          </Section>
        </>
      ) : null}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------------------------
const SUBDIVISIONS: { id: SubdivisionId; glyph: string; label: string }[] = [
  { id: 'quarter', glyph: '♩', label: 'Quarter' },
  { id: 'eighths', glyph: '♫', label: 'Eighths' },
  { id: 'triplet', glyph: '³', label: 'Triplets' },
  { id: 'sixteenths', glyph: '♬', label: 'Sixteenths' },
  { id: 'dotted', glyph: '♪.', label: 'Dotted' },
];

export function MeterSheet({ open, onClose, config, update }: Common) {
  const ts = config.timeSignature;
  const beats = beatsOf(ts);
  const unit = parseInt(ts.split('-')[0].split('/')[1], 10);
  const variants = groupingVariants(ts);
  const setMeter = (id: TimeSignatureId) => update({ timeSignature: id, accentPattern: defaultAccentPattern(id) });
  const accents = Array.from({ length: beats }, (_, i) => (config.accentPattern[i] ?? (i === 0 ? 'strong' : 'normal')) as AccentLevel);
  return (
    <Sheet open={open} onClose={onClose} title="Meter" value={meterLabel(ts)}>
      <Section title="Time signature">
        <View style={s.grid4}>
          {COMMON_METERS.map((id) => {
            const on = ts.split('-')[0] === id;
            return <Key key={id} label={id} big selected={on} style={s.cell4} onPress={() => setMeter(id)} />;
          })}
        </View>
      </Section>
      <Section title="Build your own" hint={`${beats} beats of ${unitName(unit)}`}>
        <View style={s.stepRow}>
          <Key label="−" big style={s.stepKey} accessibilityLabel="Fewer beats" onPress={() => { const id = meterFor(Math.max(1, beats - 1), unit); if (id) setMeter(id); }} />
          <View style={s.stepValue}><Text style={s.stepText}>{beats}</Text><Text style={s.stepCaption}>BEATS</Text></View>
          <Key label="+" big style={s.stepKey} accessibilityLabel="More beats" onPress={() => { const id = meterFor(Math.min(16, beats + 1), unit); if (id) setMeter(id); }} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Segmented
            options={[2, 4, 8, 16].map((u) => ({ value: u, label: `/${u}` }))}
            value={unit}
            onChange={(u) => { const id = meterFor(beats, u) ?? meterFor(Math.min(beats, 8), u); if (id) setMeter(id); }}
          />
        </View>
      </Section>
      {variants.length ? (
        <Section title="Grouping" hint="Where the strong beats fall">
          <View style={s.grid3}>
            {variants.map((id) => (
              <Key key={id} label={TIME_SIGNATURES[id].grouping?.replace(/\+/g, ' + ')} big selected={ts === id || (ts === id.split('-')[0] && TIME_SIGNATURES[ts].grouping === TIME_SIGNATURES[id].grouping)} style={s.cell3} onPress={() => setMeter(id)} />
            ))}
          </View>
        </Section>
      ) : null}
      <Section title="Accents" hint="Tap a beat to change it">
        <View style={s.beats}>
          {accents.map((a, i) => (
            <BeatPill
              key={i}
              index={i}
              level={a}
              onPress={() => {
                const next = [...accents];
                next[i] = nextAccent(a);
                update({ accentPattern: next });
              }}
            />
          ))}
        </View>
        <View style={s.legend}>
          {(['strong', 'normal', 'soft', 'mute'] as AccentLevel[]).map((l) => (
            <View key={l} style={s.legendItem}><View style={[s.lens, LENS[l]]} /><Text style={s.legendText}>{ACCENT_WORD[l]}</Text></View>
          ))}
        </View>
      </Section>
      <Section title="Subdivision">
        <View style={s.grid3}>
          {SUBDIVISIONS.map((d) => (
            <Key key={d.id} label={d.glyph} caption={d.label} big selected={config.subdivision === d.id} style={s.cell3} onPress={() => update({ subdivision: d.id })} />
          ))}
        </View>
      </Section>
      <Section title="Swing" hint="Pushes every second subdivision late">
        <Segmented<SwingAmount>
          options={[{ value: 'straight', label: 'Straight' }, { value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' }]}
          value={config.swing}
          onChange={(swing) => update({ swing })}
        />
      </Section>
      <Section title="Start over">
        <ResetKey label="Reset meter" detail="4/4 · quarter notes · beat 1 accented · straight" onConfirm={() => update({ ...restoreDefaultMeter(), swing: 'straight' })} />
      </Section>
    </Sheet>
  );
}

const unitName = (u: number) => ({ 2: 'halves', 4: 'quarters', 8: 'eighths', 16: 'sixteenths' } as Record<number, string>)[u] ?? 'quarters';

const LENS: Record<AccentLevel, object> = {
  strong: { backgroundColor: '#FFD592', shadowColor: '#FF9A2E', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  accent: { backgroundColor: '#FFD592', shadowColor: '#FF9A2E', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  normal: { backgroundColor: '#E39A3E', shadowColor: '#FF8A20', shadowOpacity: 0.6, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  soft: { backgroundColor: '#6E431B' },
  mute: { backgroundColor: '#1A1410', borderWidth: 1.5, borderColor: '#4A3B2C' },
};

function BeatPill({ index, level, onPress }: { index: number; level: AccentLevel; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Beat ${index + 1}, ${ACCENT_WORD[level]}`}
      onPressIn={press}
      onPress={onPress}
      style={({ pressed }) => [s.pill, level === 'strong' && s.pillStrong, pressed && s.pillDown]}>
      <Text style={s.pillNum}>{index + 1}</Text>
      <View style={[s.lensBig, LENS[level]]} />
      <Text style={[s.pillWord, level === 'mute' && { color: NS.inkMute }]}>{ACCENT_WORD[level]}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------------------------
type Tab = 'mixes' | 'favorites' | string;

export function SoundSheet({ open, onClose, config, update, preview }: Common & { preview: (id: SoundId) => void }) {
  const [tab, setTab] = useState<Tab>(() => ((config.favoriteSounds ?? []).length ? 'favorites' : 'picks'));
  const [target, setTarget] = useState<'beat' | 'accent'>('beat');
  // Favorites and Recent come first: the sounds you actually use are one tap away
  const tabs = useMemo(() => {
    const cats = SOUND_CATEGORIES.filter((c) => c.id !== 'mixes' && c.id !== 'favorites').map((c) => ({ id: c.id, label: titleCase(c.label) }));
    return [{ id: 'favorites', label: '★ Favorites' }, { id: 'recent', label: 'Recent' }, { id: 'mixes', label: 'Mixes' }, ...cats];
  }, []);
  const list: SoundId[] = tab === 'favorites' ? config.favoriteSounds ?? [] : tab === 'recent' ? (config.recentSounds ?? []).filter((id) => SOUNDS[id]) : SOUND_CATEGORIES.find((c) => c.id === tab)?.sounds ?? [];
  const custom = config.accentMode === 'custom';
  const accentId = custom ? config.customAccentSoundId : config.soundDownbeat;

  const chooseBeat = (next: SoundId) => {
    const selected = isCountSample(next) ? ('count' as SoundId) : next;
    const roles = resolveAccentPatch(selected, config.accentMode, config.customAccentSoundId);
    update({
      sound: selected,
      soundBank: familyForSound(next),
      hasUserChosenSound: true,
      ...roles,
      soundSub: null,
      recentSounds: [next, ...config.recentSounds.filter((id) => id !== next)].slice(0, 8),
    });
    preview(next);
  };
  const toggleFavorite = (id: SoundId) => {
    const fav = config.favoriteSounds ?? [];
    update({ favoriteSounds: fav.includes(id) ? fav.filter((f) => f !== id) : [id, ...fav] });
  };
  const chooseAccent = (id: SoundId) => {
    update({ ...resolveAccentPatch(config.sound, 'custom', id) });
    preview(id);
  };
  // Step through it: after the beat sound is picked, the next tap sets the accent.
  const pick = (id: SoundId) => {
    if (!custom) return chooseBeat(id);
    if (target === 'accent') {
      chooseAccent(id);
      setTarget('beat');
    } else {
      chooseBeat(id);
      setTarget('accent');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Sound" value={soundStudioName(config.sound)}>
      {/* the tabs run off the right edge into a fade, so it is plain there are more to swipe to */}
      <View style={{ marginHorizontal: -18, marginTop: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} style={{}}>
          {tabs.map((t) => {
            const on = t.id === tab;
            return (
              <Pressable key={t.id} onPressIn={tick} onPress={() => setTab(t.id)} style={[s.tab, on && s.tabOn]}>
                <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['rgba(13,10,8,0)', 'rgba(13,10,8,0.95)']} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44 }} />
      </View>

      {tab === 'mixes' ? (
        <Section title="Mixes" hint="Accent · beat · subdivision">
          <View style={{ gap: 10 }}>
            {ROOM_SOUND_PRESETS.map((m) => {
              const on = config.sound === m.sound && config.soundDownbeat === (m.soundDownbeat ?? null) && (config.soundSub ?? null) === (m.soundSub ?? null);
              return (
                <SoundRow
                  key={m.id}
                  title={m.label}
                  caption={[m.soundDownbeat, m.soundBeat ?? m.sound, m.soundSub].filter(Boolean).map((id) => soundStudioName(id as SoundId)).join('  ·  ')}
                  selected={on}
                  onPreview={() => preview((m.soundDownbeat ?? m.sound) as SoundId)}
                  onPress={() => {
                    update({ sound: m.sound, soundBeat: m.soundBeat ?? m.sound, soundDownbeat: m.soundDownbeat ?? null, soundSub: m.soundSub ?? null, accentMode: 'auto', customAccentSoundId: null, hasUserChosenSound: true, voiceCount: m.sound === 'count' });
                    preview((m.soundDownbeat ?? m.sound) as SoundId);
                  }}
                />
              );
            })}
          </View>
        </Section>
      ) : (
        <>
          <Section title="Accent sound" hint={custom ? 'You choose the accent' : 'Matched to the beat sound'}>
            <Segmented
              options={[{ value: 'auto', label: 'Matched' }, { value: 'custom', label: 'Choose my own' }]}
              value={config.accentMode}
              onChange={(m) => {
                if (m === 'auto') {
                  update({ ...resolveAccentPatch(config.sound, 'auto', null) });
                  setTarget('beat');
                } else {
                  update({ accentMode: 'custom', customAccentSoundId: config.soundDownbeat ?? config.sound });
                  setTarget('accent');
                }
              }}
            />
            {custom ? (
              <PickSlots
                target={target}
                beatName={soundStudioName(config.sound)}
                accentName={accentId ? soundStudioName(accentId) : 'Not set'}
                onTarget={setTarget}
              />
            ) : null}
          </Section>
          <Section title={tabs.find((t) => t.id === tab)?.label ?? 'Sounds'} hint={`${list.length} sounds`}>
            <View style={{ gap: 10 }}>
              {list.length === 0 ? <Text style={s.empty}>{tab === 'recent' ? 'Sounds you choose will appear here.' : 'Tap ☆ on any sound to keep it here.'}</Text> : null}
              {list.map((id) => {
                const isBeat = config.sound === id || (config.sound === 'count' && isCountSample(id));
                const isAccent = accentId === id && !isBeat;
                return (
                  <SoundRow
                    key={id}
                    title={soundStudioName(id)}
                    caption={VOICE_MAX_BPM[id] ? `${SOUNDS[id]?.hint ?? ''} · Best up to ${VOICE_MAX_BPM[id]} BPM` : SOUNDS[id]?.hint ?? ''}
                    selected={isBeat || isAccent}
                    badge={isBeat && accentId === id ? 'BEAT + ACCENT' : isBeat ? 'BEAT' : isAccent ? 'ACCENT' : undefined}
                    onPreview={() => preview(id)}
                    onPress={() => pick(id)}
                    starred={(config.favoriteSounds ?? []).includes(id)}
                    onStar={() => toggleFavorite(id)}
                  />
                );
              })}
            </View>
          </Section>
        </>
      )}
    </Sheet>
  );
}

/** Two big slots, BEAT and ACCENT. The lit one is what the next tap in the list sets, and it says so. */
function PickSlots({ target, beatName, accentName, onTarget }: { target: 'beat' | 'accent'; beatName: string; accentName: string; onTarget: (t: 'beat' | 'accent') => void }) {
  const slot = (id: 'beat' | 'accent', step: string, label: string, name: string) => {
    const on = target === id;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${label} sound, ${name}. ${on ? 'Selected: tap a sound below.' : 'Tap to change.'}`}
        onPressIn={press}
        onPress={() => onTarget(id)}
        style={({ pressed }) => [s.slot, on && s.slotOn, pressed && s.pillDown]}>
        <View style={s.slotHead}>
          <View style={[s.slotStep, on && s.slotStepOn]}><Text style={[s.slotStepText, on && s.slotStepTextOn]}>{step}</Text></View>
          <Text style={[s.slotLabel, on && s.slotLabelOn]}>{label}</Text>
        </View>
        <Text style={[s.slotName, on && s.slotNameOn]} numberOfLines={1}>{name}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {slot('beat', '1', 'BEAT', beatName)}
        {slot('accent', '2', 'ACCENT', accentName)}
      </View>
      <View style={s.prompt}>
        <Text style={s.promptArrow}>▼</Text>
        <Text style={s.promptText}>{target === 'beat' ? 'Tap a sound below for the BEAT' : 'Now tap a sound for the ACCENT'}</Text>
      </View>
    </View>
  );
}

function SoundRow({ title, caption, selected, badge, onPress, onPreview, starred, onStar }: { title: string; caption: string; selected?: boolean; badge?: string; onPress: () => void; onPreview: () => void; starred?: boolean; onStar?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPressIn={press} onPress={onPress} style={({ pressed }) => [s.soundRow, selected && s.soundRowOn, pressed && s.pillDown]}>
      <View style={[s.soundLed, selected && s.soundLedOn]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.soundTitle, selected && { color: NS.ink }]} numberOfLines={1}>{title}</Text>
        {badge ? <Text style={[s.badge, { marginTop: 2 }]}>{badge}</Text> : null}
        {caption ? <Text style={s.soundCaption} numberOfLines={2}>{caption}</Text> : null}
      </View>
      {onStar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={starred ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          accessibilityState={{ selected: !!starred }}
          hitSlop={8}
          onPressIn={tick}
          onPress={onStar}
          style={({ pressed }) => [s.starBtn, pressed && { opacity: 0.6 }]}>
          <Text style={[s.star, starred && s.starOn]}>{starred ? '★' : '☆'}</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel={`Preview ${title}`} hitSlop={8} onPressIn={tick} onPress={onPreview} style={({ pressed }) => [s.previewBtn, pressed && { opacity: 0.6 }]}>
        <View style={s.playGlyph} />
      </Pressable>
    </Pressable>
  );
}

const titleCase = (t: string) => t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace('Pockt', 'POCKT');

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------
export type SpeedTrainer = { on: boolean; step: number; every: number; target: number };

export function SettingsSheet({
  open,
  onClose,
  config,
  update,
  loopBars,
  loopLayers,
  onMuteLayer,
  onDeleteLayer,
  trainer,
  onTrainer,
  light,
  onLight,
  face,
  onGuide,
}: Common & { face?: string; onGuide?: (g: 'loop' | 'faces') => void; loopBars: number; loopLayers: { count: number; muted: boolean[]; canRedo: boolean }; onMuteLayer: (i: number, muted: boolean) => void; onDeleteLayer: (i: number) => void; trainer: SpeedTrainer; onTrainer: (t: SpeedTrainer) => void; light?: BeatLight; onLight?: (p: Partial<BeatLight>) => void }) {
  const toggle = (key: keyof MetronomeConfig) => (
    <Segmented options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]} value={config[key] ? 'on' : 'off'} onChange={(v) => update({ [key]: v === 'on' } as Partial<MetronomeConfig>)} />
  );
  const presets = usePresets();
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  useEffect(() => { if (!open) setEditing(null); }, [open]);
  useEffect(() => {
    if (!presetNote) return;
    const t = setTimeout(() => setPresetNote(null), 2200);
    return () => clearTimeout(t);
  }, [presetNote]);
  const note = (t: string) => setPresetNote(t);
  return (
    <Sheet open={open} onClose={onClose} title="Settings" value="POCKT">
      <Section title="Saved setups" hint={presetNote ?? 'Tap: recall · Hold: more'}>
        <View style={s.presetGrid}>
          {presets.slots.map((p, i) => {
            const c = p?.config;
            const on = !!c && c.bpm === config.bpm && c.timeSignature === config.timeSignature && c.subdivision === config.subdivision && c.sound === config.sound;
            return (
              <Key
                key={i}
                style={s.presetKey}
                selected={on || editing === i}
                label={c ? String(c.bpm ?? '') : `${i + 1}`}
                caption={c ? `${meterLabel((c.timeSignature ?? '4/4') as TimeSignatureId)} · ${SUB_SHORT[c.subdivision ?? 'quarter'] ?? ''}` : 'EMPTY'}
                accessibilityLabel={c ? `Setup ${i + 1}: ${c.bpm} BPM. Tap to recall, hold to save over it.` : `Setup ${i + 1}, empty. Hold to save the current setup.`}
                onPress={() => {
                  if (editing !== null) { setEditing(null); return; }
                  if (!p) { note('HOLD AN EMPTY SLOT TO SAVE'); return; }
                  update({ ...p.config } as Partial<MetronomeConfig>);
                  if (p.trainer) onTrainer({ ...p.trainer });
                  note(`SETUP ${i + 1} RECALLED`);
                }}
                onLongPress={() => {
                  tick();
                  if (!p) {
                    presets.save(i, capturePreset(config, trainer));
                    note(`SAVED TO SETUP ${i + 1}`);
                    return;
                  }
                  setEditing(i);
                }}
              />
            );
          })}
        </View>
        {editing !== null && presets.slots[editing] ? (
          <View style={s.presetActions}>
            <Text style={s.presetActionsTitle}>SETUP {editing + 1}</Text>
            <View style={s.presetActionRow}>
              <Key label="Save current here" onPress={() => { presets.save(editing, capturePreset(config, trainer)); note(`SAVED TO SETUP ${editing + 1}`); setEditing(null); }} />
              <Key label="Clear" onPress={() => { presets.clear(editing); note(`SETUP ${editing + 1} CLEARED`); setEditing(null); }} />
            </View>
            <View style={s.presetActionRow}>
              <Key label="‹  Move" onPress={() => { if (editing > 0) { presets.move(editing, -1); setEditing(editing - 1); } }} />
              <Key label="Move  ›" onPress={() => { if (editing < 5) { presets.move(editing, 1); setEditing(editing + 1); } }} />
              <Key label="Close" onPress={() => setEditing(null)} />
            </View>
          </View>
        ) : null}
      </Section>
      <Section title="Levels">
        <Level label="Volume" value={config.volume} onChange={(volume) => update({ volume })} />
        <Level label="Accent" value={config.accentVolume} onChange={(accentVolume) => update({ accentVolume })} />
        <Level label="Subdivision" value={config.subVolume} onChange={(subVolume) => update({ subVolume })} />
      </Section>
      <Section title="Practice" hint="Build time you can trust">
        <Row stacked label="Silent bars" detail="The click drops out · you keep the time">
          <Segmented<LockInPattern>
            options={[
              { value: 'full', label: 'Off' },
              { value: 'one-on-one-off', label: '1·1' },
              { value: 'two-on-two-off', label: '2·2' },
              { value: 'four-on-four-off', label: '4·4' },
            ]}
            value={(['full', 'one-on-one-off', 'two-on-two-off', 'four-on-four-off'] as LockInPattern[]).includes(config.lockIn) ? config.lockIn : 'full'}
            onChange={(lockIn) => update({ lockIn })}
          />
        </Row>
        <Row label="Speed trainer" detail={trainer.on ? `+${trainer.step} BPM every ${trainer.every} bars, up to ${trainer.target}` : 'Climbs the tempo while you play'}>
          <Segmented options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]} value={trainer.on ? 'on' : 'off'} onChange={(v) => onTrainer({ ...trainer, on: v === 'on' })} />
        </Row>
        {trainer.on ? (
          <>
            <Row stacked label="Step" detail="BPM added each time">
              <Segmented options={[1, 2, 5, 10].map((v) => ({ value: v, label: `+${v}` }))} value={trainer.step} onChange={(step) => onTrainer({ ...trainer, step })} />
            </Row>
            <Row stacked label="Every" detail="Bars between steps">
              <Segmented options={[1, 2, 4, 8].map((v) => ({ value: v, label: String(v) }))} value={trainer.every} onChange={(every) => onTrainer({ ...trainer, every })} />
            </Row>
            <Row stacked label="Up to" detail="Stops climbing here">
              <Segmented options={[120, 160, 200, 240].map((v) => ({ value: v, label: String(v) }))} value={trainer.target} onChange={(target) => onTrainer({ ...trainer, target })} />
            </Row>
          </>
        ) : null}
        <Row stacked label="Swing" detail="Lays the off-beats back">
          <Segmented<SwingAmount>
            options={[
              { value: 'straight', label: 'Off' },
              { value: 'light', label: 'Lt' },
              { value: 'medium', label: 'Med' },
              { value: 'heavy', label: 'Hvy' },
            ]}
            value={config.swing}
            onChange={(swing) => update({ swing })}
          />
        </Row>
        <Row stacked label="Polyrhythm" detail="A second pulse against the beat">
          <Segmented<PolyrhythmId>
            options={(['off', '3:2', '4:3', '5:4'] as PolyrhythmId[]).map((v) => ({ value: v, label: v === 'off' ? 'Off' : v }))}
            value={(['off', '3:2', '4:3', '5:4'] as PolyrhythmId[]).includes(config.polyrhythm) ? config.polyrhythm : 'off'}
            onChange={(polyrhythm) => update({ polyrhythm })}
          />
        </Row>
      </Section>
      <Section title="Playing">
        <Row stacked label="Count-in" detail="Bars of click before you start">
          <Segmented<CountInBars> options={[0, 1, 2, 4].map((v) => ({ value: v as CountInBars, label: v === 0 ? 'Off' : String(v) }))} value={config.countInBars} onChange={(countInBars) => update({ countInBars })} />
        </Row>
        <Row label="Beat haptics" detail="Feel every beat in your hand">{toggle('haptic')}</Row>
        <Row stacked label="Haptic strength" detail="How hard each beat taps your hand. Max adds a full thump on every beat.">
          <Segmented
            options={[{ value: 0.6, label: 'Light' }, { value: 1, label: 'Std' }, { value: 1.3, label: 'Heavy' }, { value: 2, label: 'Max' }]}
            value={config.hapticStrength ?? 1}
            onChange={(hapticStrength) => update({ hapticStrength })}
          />
        </Row>
      </Section>
      <Section title="Loop" hint="One key · see the guide">
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Key label="? How the looper works" onPress={() => onGuide?.('loop')} />
        </View>
        {loopLayers.count === 0 ? (
          <Text style={s.empty}>No loop yet. Tap LOOP on the front: a one-bar count-in, then play. Tap again to end the loop at the bar line and it plays straight away.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={s.empty}>{loopBars} bar{loopBars === 1 ? '' : 's'} · tap a layer to mute it · hold a layer to delete it</Text>
            {Array.from({ length: loopLayers.count }, (_, i) => {
              const muted = loopLayers.muted[i] ?? false;
              return (
                <Key
                  key={i}
                  label={`Layer ${i + 1}${i === 0 ? ' · the take' : ''}`}
                  caption={muted ? 'MUTED · TAP TO HEAR IT' : 'PLAYING · TAP TO MUTE · HOLD TO DELETE'}
                  selected={!muted}
                  onPress={() => onMuteLayer(i, !muted)}
                  onLongPress={() => onDeleteLayer(i)}
                />
              );
            })}
          </View>
        )}
      </Section>
      {light && onLight ? (
        <>
          <Section title="Beat light" hint="Pulse, Pendulum, Pro and Beatline">
            {face === 'pro' ? (
              <>
                <Row stacked label="Pro · light bar" detail="Under the columns · tap the bar on the face to change it">
                  <Segmented
                    options={[{ value: 'pendulum', label: 'Swing' }, { value: 'beat', label: 'Beat' }, { value: 'accents', label: 'Accent' }, { value: 'off', label: 'Off' }]}
                    value={proBarOf(light)}
                    onChange={(proBar) => onLight({ proBar, proPend: proBar !== 'off' })}
                  />
                </Row>
                <Row stacked label="Pro · flash" detail="Which beats light the columns">
                  <Segmented
                    options={[{ value: 'every', label: 'All' }, { value: 'accents', label: 'Accents' }, { value: 'downbeat', label: 'Beat 1' }]}
                    value={light.proFlash}
                    onChange={(proFlash) => onLight({ proFlash })}
                  />
                </Row>
                <View style={{ height: 12 }} />
              </>
            ) : null}
            <Text style={s.swatchCaption}>DOWNBEAT</Text>
            <Swatches value={light.down} onPick={(down) => onLight({ down })} />
            <Text style={[s.swatchCaption, { marginTop: 12 }]}>EVERY OTHER BEAT</Text>
            <Swatches value={light.up} onPick={(up) => onLight({ up })} />
          </Section>
        </>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => { tick(); setMore((v) => !v); }} style={s.moreRow}>
        <Text style={s.moreText}>{more ? 'FEWER SETTINGS ▴' : 'MORE SETTINGS ▾'}</Text>
        <Text style={s.moreHint}>Tuner · display · phone</Text>
      </Pressable>
      {more ? (
        <>
      <Section title="Tuner">
        <Row stacked label="Reference" detail="Concert A, in hertz">
          <Segmented options={[432, 440, 441, 442].map((v) => ({ value: v, label: String(v) }))} value={[432, 440, 441, 442].includes(config.pitchPipeHz) ? config.pitchPipeHz : 440} onChange={(pitchPipeHz) => update({ pitchPipeHz })} />
        </Row>
      </Section>
      <Section title="Display">
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Key label="? The six faces" onPress={() => onGuide?.('faces')} />
        </View>
        <Row label="Flash the screen" detail="A warm wash on each beat">{toggle('flashScreenOnBeat')}</Row>
        <Row label="Reverse dial" detail="Counter-clockwise speeds up">{toggle('wheelInvert')}</Row>
      </Section>
      <Section title="Phone">
        <Row label="Keep screen on" detail="While POCKT is open">{toggle('keepAwake')}</Row>
        <Row label="Play in background" detail="Keeps time when you switch apps">{toggle('backgroundPlay')}</Row>
        <Row label="Mix with other apps" detail="Play over music and recordings">{toggle('mixWithOthers')}</Row>
      </Section>
        </>
      ) : null}
      <Section title="Start over">
        <ResetKey
          label="Reset everything"
          detail="120 BPM · 4/4 · Pocket sound · default levels and settings"
          onConfirm={() =>
            update({
              bpm: DEFAULT_CONFIG.bpm,
              ...restoreDefaultMeter(),
              swing: DEFAULT_CONFIG.swing,
              soundBank: DEFAULT_CONFIG.soundBank,
              sound: DEFAULT_CONFIG.sound,
              soundDownbeat: DEFAULT_CONFIG.soundDownbeat,
              soundBeat: DEFAULT_CONFIG.soundBeat,
              soundSub: DEFAULT_CONFIG.soundSub,
              accentMode: DEFAULT_CONFIG.accentMode,
              customAccentSoundId: DEFAULT_CONFIG.customAccentSoundId,
              volume: DEFAULT_CONFIG.volume,
              accentVolume: DEFAULT_CONFIG.accentVolume,
              subVolume: DEFAULT_CONFIG.subVolume,
              countInBars: DEFAULT_CONFIG.countInBars,
              haptic: DEFAULT_CONFIG.haptic,
              flashScreenOnBeat: DEFAULT_CONFIG.flashScreenOnBeat,
              wheelInvert: DEFAULT_CONFIG.wheelInvert,
              keepAwake: DEFAULT_CONFIG.keepAwake,
              backgroundPlay: DEFAULT_CONFIG.backgroundPlay,
              mixWithOthers: DEFAULT_CONFIG.mixWithOthers,
              lockIn: DEFAULT_CONFIG.lockIn,
              polyrhythm: DEFAULT_CONFIG.polyrhythm,
            })
          }
        />
      </Section>
    </Sheet>
  );
}

/** Two-step reset: the first tap arms it, the second within three seconds does it. */
function ResetKey({ label, detail, onConfirm }: { label: string; detail: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <Key
      label={done ? 'Done — back to defaults' : armed ? 'Tap again to confirm' : label}
      caption={armed ? 'This cannot be undone' : detail}
      big
      selected={armed}
      style={s.standard}
      tone={armed ? 'amber' : undefined}
      onPress={() => {
        if (!armed) { setArmed(true); return; }
        setArmed(false);
        setDone(true);
        onConfirm();
      }}
    />
  );
}

function Level({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.level}>
      <View style={s.levelHead}>
        <Text style={s.levelLabel}>{label}</Text>
        <Text style={s.levelValue}>{Math.round(value * 100)}%</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        value={value}
        onSlidingComplete={onChange}
        onValueChange={onChange}
        minimumTrackTintColor={NS.amber}
        maximumTrackTintColor="#3A3026"
        thumbTintColor={NS.ink}
        style={{ height: 44 }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// Face options: beat-light colours and styles (Pulse, Pendulum, Pro, Beatline)
// ---------------------------------------------------------------------------------------------
function Swatches({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  return (
    <View style={s.swatches}>
      {PALETTE.map(([name, hex]) => {
        const on = value === hex;
        return (
          <Pressable
            key={hex}
            accessibilityRole="button"
            accessibilityLabel={`${name}${on ? ', selected' : ''}`}
            onPressIn={tick}
            onPress={() => onPick(hex)}
            style={[s.swatch, on && s.swatchOn]}>
            <View style={[s.swatchLens, { backgroundColor: cssOf(hex), shadowColor: cssOf(hex) }, hex === 'rainbow' && s.rainbow]} />
            <Text style={[s.swatchName, on && s.swatchNameOn]} numberOfLines={1}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FaceSheet({ open, onClose, face, light, onLight }: { open: boolean; onClose: () => void; face: string; light: BeatLight; onLight: (p: Partial<BeatLight>) => void }) {
  const title = face === 'pro' ? 'Pro' : face === 'pendulum' ? 'Pendulum' : face === 'beatline' ? 'Beatline' : 'Pulse';
  return (
    <Sheet open={open} onClose={onClose} title={title} value="LIGHT" height={0.86}>
      {face === 'pro' ? (
        <Section title="Flash" hint="Which beats light the columns">
          <Segmented
            options={[{ value: 'every', label: 'Every beat' }, { value: 'accents', label: 'Accents' }, { value: 'downbeat', label: 'Beat 1' }]}
            value={light.proFlash}
            onChange={(proFlash) => onLight({ proFlash })}
          />
          <View style={{ height: 12 }} />
          <Row stacked label="Light bar" detail="Swing, every beat, accents only, or off · tap the bar on the face too">
            <Segmented
                    options={[{ value: 'pendulum', label: 'Swing' }, { value: 'beat', label: 'Beat' }, { value: 'accents', label: 'Accent' }, { value: 'off', label: 'Off' }]}
                    value={proBarOf(light)}
                    onChange={(proBar) => onLight({ proBar, proPend: proBar !== 'off' })}
                  />
          </Row>
        </Section>
      ) : null}
      <Section title="Downbeat" hint="Beat one">
        <Swatches value={light.down} onPick={(down) => onLight({ down })} />
      </Section>
      <Section title="Upbeats" hint="Every other beat">
        <Swatches value={light.up} onPick={(up) => onLight({ up })} />
      </Section>
    </Sheet>
  );
}

const s = StyleSheet.create({
  presetActions: { marginTop: 12, padding: 12, gap: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(240,162,60,0.45)', backgroundColor: 'rgba(240,162,60,0.06)' },
  presetActionsTitle: { fontFamily: NS.font.semibold, fontSize: 17, letterSpacing: 2.4, color: NS.amberHi, textAlign: 'center' },
  presetActionRow: { flexDirection: 'row', gap: 10 },
  starBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  star: { fontSize: 28, color: 'rgba(230,180,110,0.55)', lineHeight: 32 },
  starOn: { color: '#FFC66E', textShadowColor: 'rgba(255,150,50,0.7)', textShadowRadius: 8 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetKey: { flexBasis: '30%', flexGrow: 1, minHeight: 64 },
  moreRow: { marginTop: 8, marginBottom: 6, paddingVertical: 16, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(230,180,110,0.25)' },
  moreText: { fontFamily: NS.font.semibold, fontSize: 18, letterSpacing: 2.4, color: NS.amber },
  moreHint: { marginTop: 4, fontFamily: NS.font.medium, fontSize: 17, color: NS.inkMute },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchCaption: { fontFamily: NS.font.semibold, fontSize: 15, letterSpacing: 2.4, color: NS.inkMute, marginBottom: 8 },
  swatch: { flexBasis: '22%', flexGrow: 1, height: 74, borderRadius: 14, borderWidth: 1, borderColor: NS.edge, backgroundColor: NS.key, alignItems: 'center', justifyContent: 'center', gap: 6 },
  swatchOn: { borderColor: NS.amberHi, borderWidth: 2, backgroundColor: '#2A1D10' },
  swatchLens: { width: 26, height: 26, borderRadius: 13, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  rainbow: { borderWidth: 3, borderTopColor: '#ff3b30', borderRightColor: '#ffd25e', borderBottomColor: '#3dffb0', borderLeftColor: '#8e5cff' },
  swatchName: { fontFamily: NS.font.semibold, fontSize: 16, color: NS.inkDim },
  swatchNameOn: { color: NS.amberHi },
  tempoHead: { alignItems: 'center', marginTop: 6, marginBottom: 6 },
  tempoValue: { fontFamily: NS.font.light, fontSize: 92, lineHeight: 100, color: NS.glass, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(255,150,50,0.55)', textShadowRadius: 14 },
  tempoName: { fontFamily: NS.font.semibold, fontSize: 17, letterSpacing: 3, color: NS.inkDim },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  padKey: { flexBasis: '30%', flexGrow: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quick: { flexBasis: '22%', flexGrow: 1 },
  slot: { flex: 1, minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: NS.edge, backgroundColor: NS.key, padding: 12, justifyContent: 'space-between' },
  slotOn: { borderColor: 'rgba(255,190,100,0.95)', borderWidth: 2, backgroundColor: '#2E1F0E', shadowColor: '#FF9D32', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotStep: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: NS.edge, alignItems: 'center', justifyContent: 'center' },
  slotStepOn: { backgroundColor: NS.amberHi, borderColor: NS.amberHi },
  slotStepText: { fontFamily: NS.font.bold, fontSize: 16, color: NS.inkMute },
  slotStepTextOn: { color: '#1A1007' },
  slotLabel: { fontFamily: NS.font.bold, fontSize: 17, letterSpacing: 2.4, color: NS.inkMute },
  slotLabelOn: { color: NS.amberHi },
  slotName: { fontFamily: NS.font.semibold, fontSize: 20, color: NS.inkDim, marginTop: 8 },
  slotNameOn: { color: NS.ink },
  prompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,160,60,0.12)', borderWidth: 1, borderColor: 'rgba(255,170,80,0.45)' },
  promptArrow: { fontSize: 17, color: NS.amberHi },
  promptText: { fontFamily: NS.font.semibold, fontSize: 19, color: NS.amberHi, textShadowColor: 'rgba(255,150,50,0.5)', textShadowRadius: 8 },
  standard: { flexGrow: 0, flexBasis: 'auto' },
  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  cell4: { flexBasis: '22%', flexGrow: 1 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  cell3: { flexBasis: '30%', flexGrow: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepKey: { flexGrow: 0, flexShrink: 0, flexBasis: 84, width: 84 },
  stepValue: { flex: 1, alignItems: 'center' },
  stepText: { fontFamily: NS.font.light, fontSize: 48, lineHeight: 52, color: NS.glass, fontVariant: ['tabular-nums'] },
  stepCaption: { fontFamily: NS.font.semibold, fontSize: 16, letterSpacing: 2.4, color: NS.inkMute },
  beats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { width: '23%', flexGrow: 1, maxWidth: '24%', height: 104, borderRadius: 16, borderWidth: 1, borderColor: NS.edge, backgroundColor: NS.key, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  pillStrong: { borderColor: NS.edgeHi },
  pillDown: { transform: [{ translateY: 2 }, { scale: 0.98 }], opacity: 0.8 },
  pillNum: { fontFamily: NS.font.semibold, fontSize: 18, color: NS.inkDim },
  lensBig: { width: 30, height: 30, borderRadius: 15 },
  pillWord: { fontFamily: NS.font.semibold, fontSize: 16, letterSpacing: 1.4, color: NS.ink },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lens: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontFamily: NS.font.medium, fontSize: 16, color: NS.inkDim },
  tabs: { paddingHorizontal: 18, gap: 8 },
  tab: { height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: NS.edge, backgroundColor: NS.key, justifyContent: 'center' },
  tabOn: { borderColor: NS.edgeHi, backgroundColor: '#2C1F12' },
  tabText: { fontFamily: NS.font.semibold, fontSize: 17, color: NS.inkDim },
  tabTextOn: { color: NS.amberHi },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: NS.edge, backgroundColor: NS.key },
  soundRowOn: { borderColor: NS.edgeHi, backgroundColor: '#24190F' },
  soundLed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2C2117' },
  soundLedOn: { backgroundColor: NS.amberHi, shadowColor: NS.amber, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  soundTitle: { fontFamily: NS.font.semibold, fontSize: 19, color: NS.inkDim },
  soundCaption: { marginTop: 2, fontFamily: NS.font.regular, fontSize: 17, color: NS.inkMute },
  badge: { fontFamily: NS.font.bold, fontSize: 14, letterSpacing: 1.6, color: NS.amberHi },
  previewBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: NS.edge, alignItems: 'center', justifyContent: 'center', backgroundColor: '#120F0C' },
  playGlyph: { marginLeft: 4, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 13, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: NS.amberHi },
  empty: { fontFamily: NS.font.regular, fontSize: 17, color: NS.inkMute, paddingVertical: 12 },
  level: { marginBottom: 10 },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  levelLabel: { fontFamily: NS.font.semibold, fontSize: 18, color: NS.ink },
  levelValue: { fontFamily: NS.font.medium, fontSize: 17, color: NS.amberHi, fontVariant: ['tabular-nums'] },
});
