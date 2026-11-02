import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TunerGlyph } from '@/components/brand/TunerGlyph';
import { TunerHeadstock } from '@/components/tuner/TunerHeadstock';
import { useTuner } from '@/hooks/use-tuner';
import { hapticSelection } from '@/lib/haptics';
import { DEFAULT_A4, displayNoteName, frequencyFromMidi, tunerProximityColor } from '@/lib/tuner-math';
import {
  defaultProfileId,
  displayPitchToken,
  INSTRUMENTS,
  listTuningProfiles,
  midiForToken,
  nearestStringIndex,
  nudgePitchToken,
  profileNotes,
  resizeStringNotes,
  type TunerInstrumentId,
} from '@/lib/tuning-profiles';
import PocktTiming from '@/modules/pockt-timing';
import { loadCustomTunings, saveCustomTunings, type CustomTuning } from '@/storage/custom-tunings';
import { DEFAULT_TUNER_PREFS, loadTunerPrefs, saveTunerPrefs, type TunerPrefs } from '@/storage/tuner-prefs';

type Props = {
  visible: boolean;
  a4?: number;
  onClose: () => void;
};

export function TunerScreen({ visible, a4 = DEFAULT_A4, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [prefs, setPrefs] = useState<TunerPrefs>({ ...DEFAULT_TUNER_PREFS, a4 });
  const [prefsReady, setPrefsReady] = useState(false);
  const [custom, setCustom] = useState<CustomTuning[]>([]);
  const [selectedString, setSelectedString] = useState(0);
  const [manualString, setManualString] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [customName, setCustomName] = useState('');
  const [editNotes, setEditNotes] = useState<string[] | null>(null);
  const liveA4 = Math.min(460, Math.max(420, prefs.a4 || a4));
  const { reading, phase, denied, error, diag } = useTuner(visible, liveA4, prefs.response);
  const initPulse = useRef(new Animated.Value(0.42)).current;
  const needleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadTunerPrefs().then((saved) => {
      setPrefs(saved);
      setPrefsReady(true);
    });
    void loadCustomTunings().then(setCustom);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    void saveTunerPrefs(prefs);
  }, [prefs, prefsReady]);

  const notes = useMemo(() => {
    if (editNotes) return editNotes;
    const customHit = custom.find((item) => item.id === prefs.profileId);
    if (customHit) return customHit.notes;
    return profileNotes(prefs.instrument, prefs.profileId);
  }, [custom, editNotes, prefs.instrument, prefs.profileId]);

  const targets = useMemo(
    () => notes.map((token) => midiForToken(token, liveA4)?.midi ?? 0),
    [liveA4, notes]
  );

  const shownNotes = useMemo(
    () => notes.map((token) => displayPitchToken(token, prefs.accidental)),
    [notes, prefs.accidental]
  );
  const chromaticNote = reading ? displayNoteName(reading.note, prefs.accidental) : '—';
  const detectedIndex = reading ? nearestStringIndex(reading.midi, targets, selectedString) : null;
  const activeIndex = manualString ? selectedString : (detectedIndex ?? selectedString);
  const targetMidi = targets[activeIndex] ?? reading?.midi ?? 69;
  const stringHz = reading?.frequency ?? 0;
  const stringRatio = stringHz > 0 ? stringHz / frequencyFromMidi(targetMidi, liveA4) : 0;
  const stringCentsRaw = stringRatio > 0 ? 1200 * Math.log2(stringRatio) : 0;
  const stringCents = Number.isFinite(stringCentsRaw) ? stringCentsRaw : 0;
  const displayCents = prefs.mode === 'strings' ? stringCents : (reading?.cents ?? 0);
  const absCents = Math.abs(displayCents);
  const stringState = !reading ? 'listening' : absCents <= 2 ? 'in-tune' : displayCents < 0 ? 'flat' : 'sharp';
  const state = prefs.mode === 'strings' ? stringState : (reading?.state ?? 'listening');
  const locked = state === 'in-tune';
  const needle = Math.max(-1, Math.min(1, displayCents / 50));

  useEffect(() => {
    if (phase !== 'initializing' && phase !== 'idle') {
      initPulse.stopAnimation();
      initPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(initPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(initPulse, { toValue: 0.38, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [initPulse, phase]);

  useEffect(() => {
    Animated.timing(needleX, {
      toValue: needle,
      duration: reading ? 80 : 140,
      useNativeDriver: true,
    }).start();
  }, [needle, needleX, reading]);

  useEffect(() => {
    if (prefs.mode !== 'strings' || manualString || detectedIndex == null) return;
    setSelectedString(detectedIndex);
  }, [detectedIndex, manualString, prefs.mode]);

  if (!visible) return null;

  const approach = reading ? Math.max(0, Math.min(1, (20 - absCents) / 18)) : 0;
  const proximity = tunerProximityColor(reading ? absCents : 40);
  const stateColor = locked ? '#3DDC84' : proximity;
  const direction =
    state === 'in-tune' ? 'IN TUNE' : state === 'flat' ? 'TUNE UP' : state === 'sharp' ? 'TUNE DOWN' : phase === 'listening' ? 'LISTENING' : phase === 'denied' ? 'MIC NEEDED' : 'STARTING';
  const profiles = listTuningProfiles(prefs.instrument);
  const activity = Math.max(0.08, Math.min(1, diag.rms * 28));

  const playRef = (index: number) => {
    const midi = targets[index];
    if (midi == null) return;
    try {
      PocktTiming?.playReferenceTone?.(frequencyFromMidi(midi, liveA4));
    } catch {
      /* optional */
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => {
            void hapticSelection();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close tuner"
          hitSlop={10}
          style={styles.close}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <TunerGlyph width={36} height={16} lit={locked || state !== 'listening'} />
          <Text style={styles.title}>TUNER</Text>
        </View>
        <Pressable onPress={() => setAdvanced((value) => !value)} style={styles.close}>
          <Text style={styles.closeText}>{advanced ? 'DONE' : 'ADVANCED'}</Text>
        </Pressable>
      </View>

      <View style={styles.modes}>
        {(['chromatic', 'strings'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => {
              void hapticSelection();
              setPrefs((prev) => ({ ...prev, mode }));
            }}
            accessibilityRole="button"
            accessibilityLabel={mode === 'chromatic' ? 'CHROMATIC' : 'STRINGS'}
            style={[styles.mode, prefs.mode === mode && styles.modeOn]}>
            <Text style={[styles.modeText, prefs.mode === mode && styles.modeTextOn]}>
              {mode === 'chromatic' ? 'CHROMATIC' : 'STRINGS'}
            </Text>
          </Pressable>
        ))}
      </View>

      {advanced ? (
        <View style={styles.advanced}>
          <Text style={styles.advLabel}>A4 {liveA4} Hz</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, a4: Math.max(420, p.a4 - 1) }))} style={styles.chip}><Text style={styles.chipText}>-</Text></Pressable>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, a4: 440 }))} style={styles.chip}><Text style={styles.chipText}>440</Text></Pressable>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, a4: Math.min(460, p.a4 + 1) }))} style={styles.chip}><Text style={styles.chipText}>+</Text></Pressable>
          </View>
          <View style={styles.row}>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, accidental: p.accidental === 'sharps' ? 'flats' : 'sharps' }))} style={styles.chip}>
              <Text style={styles.chipText}>{prefs.accidental === 'sharps' ? 'SHARPS' : 'FLATS'}</Text>
            </Pressable>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, response: p.response === 'stable' ? 'fast' : 'stable' }))} style={styles.chip}>
              <Text style={styles.chipText}>{prefs.response.toUpperCase()}</Text>
            </Pressable>
            <Pressable onPress={() => setPrefs((p) => ({ ...p, showFrequency: !p.showFrequency }))} style={styles.chip}>
              <Text style={styles.chipText}>{prefs.showFrequency ? 'HZ ON' : 'HZ OFF'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {prefs.mode === 'strings' ? (
        <View style={styles.strings}>
          <View style={styles.row}>
            {INSTRUMENTS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void hapticSelection();
                  setPrefs((prev) => ({ ...prev, instrument: item.id, profileId: defaultProfileId(item.id) }));
                  setManualString(false);
                  setEditNotes(null);
                }}
                style={[styles.chip, prefs.instrument === item.id && styles.chipOn]}>
                <Text style={[styles.chipText, prefs.instrument === item.id && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowWrap}>
            {profiles.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setPrefs((prev) => ({ ...prev, profileId: item.id }));
                  setEditNotes(null);
                }}
                style={[styles.chip, prefs.profileId === item.id && styles.chipOn]}>
                <Text style={[styles.chipText, prefs.profileId === item.id && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
            {custom.filter((item) => item.instrument === prefs.instrument).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setPrefs((prev) => ({ ...prev, profileId: item.id }));
                  setEditNotes(null);
                }}
                style={[styles.chip, prefs.profileId === item.id && styles.chipOn]}>
                <Text style={[styles.chipText, prefs.profileId === item.id && styles.chipTextOn]}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
          {prefs.instrument === 'guitar' ? (
            <View style={styles.row}>
              <Pressable onPress={() => setPrefs((p) => ({ ...p, headstock: '3x3' }))} style={[styles.chip, prefs.headstock === '3x3' && styles.chipOn]}>
                <Text style={[styles.chipText, prefs.headstock === '3x3' && styles.chipTextOn]}>3+3</Text>
              </Pressable>
              <Pressable onPress={() => setPrefs((p) => ({ ...p, headstock: '6inline' }))} style={[styles.chip, prefs.headstock === '6inline' && styles.chipOn]}>
                <Text style={[styles.chipText, prefs.headstock === '6inline' && styles.chipTextOn]}>6-INLINE</Text>
              </Pressable>
            </View>
          ) : null}
          <TunerHeadstock
            style={prefs.instrument === 'guitar' ? prefs.headstock : prefs.instrument === 'bass' && notes.length > 4 ? '6inline' : '3x3'}
            notes={shownNotes}
            selected={activeIndex}
            detected={detectedIndex}
            inTune={locked}
            width={Math.min(320, width - 32)}
            onSelect={(index) => {
              setManualString(true);
              setSelectedString(index);
              playRef(index);
            }}
          />
          <View style={styles.row}>
            {[4, 5, 6].map((count) => (
              <Pressable
                key={count}
                onPress={() => setEditNotes(resizeStringNotes(notes, count))}
                style={[styles.chip, notes.length === count && styles.chipOn]}>
                <Text style={[styles.chipText, notes.length === count && styles.chipTextOn]}>{count} STR</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                const index = activeIndex;
                const current = notes[index];
                if (!current) return;
                const next = [...notes];
                next[index] = nudgePitchToken(current, -1, prefs.accidental);
                setEditNotes(next);
              }}
              style={styles.chip}>
              <Text style={styles.chipText}>-</Text>
            </Pressable>
            <Text style={styles.meta}>{shownNotes[activeIndex] ?? ''}</Text>
            <Pressable
              onPress={() => {
                const index = activeIndex;
                const current = notes[index];
                if (!current) return;
                const next = [...notes];
                next[index] = nudgePitchToken(current, 1, prefs.accidental);
                setEditNotes(next);
              }}
              style={styles.chip}>
              <Text style={styles.chipText}>+</Text>
            </Pressable>
          </View>
          <Text style={[styles.state, { color: stateColor }]}>{direction}</Text>
          <Text style={styles.meta}>
            {reading
              ? `${shownNotes[activeIndex] ?? ''}  ${displayCents >= 0 ? '+' : ''}${displayCents.toFixed(0)}¢`
              : `${shownNotes[activeIndex] ?? ''}  A4 ${liveA4}`}
          </Text>
          <View style={styles.row}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Name custom tuning"
              placeholderTextColor="rgba(246,240,228,0.35)"
              style={styles.input}
            />
            <Pressable
              onPress={() => {
                const name = customName.trim();
                if (!name) return;
                const next: CustomTuning = {
                  id: `custom-${Date.now()}`,
                  name,
                  instrument: prefs.instrument as TunerInstrumentId,
                  notes: [...notes],
                };
                const list = [...custom, next];
                setCustom(list);
                void saveCustomTunings(list);
                setPrefs((prev) => ({ ...prev, profileId: next.id }));
                setCustomName('');
                void hapticSelection();
              }}
              style={styles.chip}>
              <Text style={styles.chipText}>SAVE</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.stage}>
          <Animated.Text style={[styles.kicker, !reading && { opacity: initPulse }]}>
            {reading ? `${chromaticNote}${reading.octave}` : phase === 'listening' ? 'LISTENING' : phase === 'denied' ? 'MIC DENIED' : 'STARTING MIC'}
          </Animated.Text>
          <Animated.Text style={[styles.note, !reading && { opacity: initPulse }]} allowFontScaling={false}>
            {chromaticNote}
          </Animated.Text>
          <Text style={styles.octave}>{reading ? reading.octave : ''}</Text>
          <Text style={[styles.state, { color: stateColor }]}>
            {state === 'in-tune' ? 'IN TUNE' : state === 'flat' ? 'TUNE UP' : state === 'sharp' ? 'TUNE DOWN' : direction}
          </Text>
          {locked ? <Text style={styles.lockMark}>P</Text> : null}
          <View style={styles.scale}>
            <View style={styles.track} />
            <View
              style={[
                styles.zero,
                {
                  height: locked ? 44 : 22 + approach * 16,
                  width: locked ? 8 : 4 + approach * 2,
                  backgroundColor: locked ? '#3DDC84' : approach > 0.45 ? proximity : '#F6F0E4',
                  opacity: locked ? 1 : 0.35 + approach * 0.65,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.needle,
                {
                  backgroundColor: proximity,
                  transform: [{ translateX: needleX.interpolate({ inputRange: [-1, 1], outputRange: [-120, 120] }) }],
                },
              ]}
            />
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleText}>TUNE UP</Text>
              <Text style={styles.scaleText}>0</Text>
              <Text style={styles.scaleText}>TUNE DOWN</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {reading
              ? `${displayCents >= 0 ? '+' : ''}${displayCents.toFixed(0)}¢${prefs.showFrequency ? `   ${reading.frequency.toFixed(1)} Hz` : ''}`
              : `A4 = ${liveA4}`}
          </Text>
        </View>
      )}

      <View style={styles.mic}>
        <View style={[styles.micBar, { width: `${Math.round(activity * 100)}%` }]} />
      </View>
      {denied || error ? (
        <Pressable onPress={() => void Linking.openSettings()} style={styles.denied}>
          <Text style={styles.deniedText}>{error ?? 'Microphone access is off. Tap to open Settings.'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0908',
    zIndex: 40,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  title: {
    color: '#E8D8C0',
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '800',
  },
  titleWrap: {
    alignItems: 'center',
    gap: 6,
  },
  close: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(246,240,228,0.7)',
    fontSize: 13,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    color: 'rgba(246,240,228,0.72)',
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 28,
  },
  note: {
    marginTop: 8,
    color: '#F6F0E4',
    fontSize: 132,
    fontWeight: '300',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
  },
  octave: {
    marginTop: -12,
    color: 'rgba(246,240,228,0.55)',
    fontSize: 28,
    fontWeight: '500',
  },
  state: {
    marginTop: 10,
    letterSpacing: 3.2,
    fontWeight: '800',
    fontSize: 16,
  },
  lockMark: {
    marginTop: 6,
    color: '#3DDC84',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: '#3DDC84',
    textShadowRadius: 12,
  },
  scale: {
    marginTop: 28,
    width: '100%',
    height: 88,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(246,240,228,0.28)',
    borderRadius: 2,
  },
  zero: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 18,
    backgroundColor: '#F6F0E4',
  },
  needle: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: 3,
    height: 22,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: '#E8C878',
  },
  scaleLabels: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    color: 'rgba(246,240,228,0.42)',
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  sparkle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targets: {
    position: 'absolute',
    left: '50%',
    marginLeft: -22,
    top: 6,
    width: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(246,240,228,0.35)',
  },
  targetDotMid: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  targetDotOn: {
    backgroundColor: '#3DDC84',
    shadowColor: '#3DDC84',
    shadowOpacity: 0.95,
    shadowRadius: 8,
  },
  spark: {
    position: 'absolute',
    backgroundColor: '#E8C878',
    shadowColor: '#E8C878',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  sparkA: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    top: -6,
  },
  sparkB: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    left: '42%',
    top: 2,
  },
  sparkC: {
    width: 4,
    height: 4,
    borderRadius: 2,
    right: '42%',
    top: 4,
  },
  meta: {
    marginTop: 22,
    color: 'rgba(246,240,228,0.48)',
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  denied: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  deniedText: {
    color: '#E8C878',
    textAlign: 'center',
    fontWeight: '600',
  },
  mic: {
    marginTop: 18,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(246,240,228,0.12)',
    overflow: 'hidden',
  },
  micBar: {
    height: 3,
    backgroundColor: '#E8C878',
  },
  modes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  mode: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(246,240,228,0.2)',
    justifyContent: 'center',
  },
  modeOn: {
    backgroundColor: '#E2C47E',
    borderColor: '#E2C47E',
  },
  modeText: {
    color: 'rgba(246,240,228,0.7)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  modeTextOn: {
    color: '#1A140E',
  },
  advanced: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  advLabel: {
    color: 'rgba(246,240,228,0.6)',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  strings: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(246,240,228,0.22)',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: '#E2C47E',
    borderColor: '#E2C47E',
  },
  chipText: {
    color: 'rgba(246,240,228,0.72)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  chipTextOn: {
    color: '#1A140E',
  },
  input: {
    minWidth: 160,
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: 'rgba(246,240,228,0.28)',
    color: '#F6F0E4',
    paddingHorizontal: 8,
  },
  dev: {
    marginTop: 18,
    color: 'rgba(246,240,228,0.42)',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
