/**
 * POCKT front page. One instrument: the v9 faceplate composed for this exact screen, with every part
 * live on top of it — the knurled dial (GPU-shaded, it turns under the finger), the glass readout, the
 * tempo gauge, the beat lamps and their accent pips, the key lights and the travel of each key —
 * all driven per frame on the UI thread from the audio-locked beat clock. The faces swap what sits
 * behind the glass; the hardware around them stays the same instrument.
 */
import { Canvas, Group } from '@shopify/react-native-skia';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PocktDialView } from 'pockt-dial';

import { NavBar, type FaceId } from '@/components/front/NavBar';
import { RhythmWheel } from '@/components/front/RhythmWheel';
import { FaceSheet, MeterSheet, SettingsSheet, SoundSheet, TempoSheet, type SpeedTrainer } from '@/components/front/Sheets';
import { BeatlineFace } from '@/components/front/faces/BeatlineFace';
import { PendulumFace } from '@/components/front/faces/PendulumFace';
import { ProFace } from '@/components/front/faces/ProFace';
import { PulseFace } from '@/components/front/faces/PulseFace';
import { FONTS, press } from '@/components/front/ui';
import { Instrument, useInstrumentState, type KeyId } from '@/components/front/v9/Instrument';
import { Readout, type TempoReadoutProps, type TunerReadoutProps } from '@/components/front/v9/Readout';
import { VOICE_MAX_BPM, soundStudioName } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { useMetronome } from '@/hooks/use-metronome';
import { useTuner } from '@/hooks/use-tuner';
import PocktTiming from '@/modules/pockt-timing';
import { FaceBoundary } from '@/components/front/FaceBoundary';
import { Guide, useGuides, type GuideId } from '@/components/front/Guide';
import { enqueueAudio } from '@/lib/audio-ownership';
import { LedPanel, type LedTone } from '@/components/front/v9/LedPanel';
import { GlassUnder, Seat } from '@/components/front/faces/Optics';
import { TunerFace } from '@/components/front/faces/TunerFace';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useBeatClock } from '@/lib/front-clock';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';
import { PRO_BAR_NAME, useBeatLight } from '@/lib/front-light';
import { tempoName as libTempoName } from '@/lib/tempo-name';
import { ACCENT_WORD, beatsOf, groupsOf, lampLeadBeats, lampOfBeat, meterLabel, nextAccent } from '@/lib/front-meter';
import { DIAL_C, KNURL_C, LAMPS9, useNs9 } from '@/lib/ns9';
import type { AccentLevel } from '@/lib/types';

type SheetId = 'tempo' | 'meter' | 'sound' | 'settings' | 'face' | null;
const LEVEL_OF: Record<string, number> = { strong: 3, accent: 3, normal: 2, soft: 1, mute: 0 };
const ACCENT_OF: AccentLevel[] = ['mute', 'soft', 'normal', 'strong'];
const FACE_NAME: Record<FaceId, string> = { dial: 'DIAL', rhythm: 'RHYTHM', pulse: 'PULSE', pendulum: 'PENDULUM', pro: 'PRO', beatline: 'BEATLINE' };
// every LED line fits the glass (26 characters at most): nothing important ever scrolls
const FACE_HINT: Partial<Record<FaceId, string>> = { dial: 'DIAL · TURN TO SET TEMPO', rhythm: 'RHYTHM · TAP BEAT = ACCENT', pulse: 'PULSE · TAP FOR COLOURS', pendulum: 'PENDULUM · DRAG THE WEIGHT', pro: 'PRO · TAP OR DRAG COLUMNS', beatline: 'BEATLINE · TAP A JEWEL' };
const SUB_NAME: Record<string, string> = { quarter: 'QUARTERS', eighth: 'EIGHTHS', triplet: 'TRIPLETS', sixteenth: '16THS', dotted: 'DOTTED', 'eighth-triplet': 'TRIPLETS', 'sixteenth-triplet': '6-LETS' };
/** Where the readout sits on each window face, in master units from the glass centre, and its scale. */
const READOUT_AT: Partial<Record<FaceId, { dy: number; scale: number }>> = { pulse: { dy: 0, scale: 0.86 }, pendulum: { dy: 222, scale: 0.62 }, pro: { dy: -226, scale: 0.68 }, beatline: { dy: -218, scale: 0.7 } };
/** Window faces sit inside the knurl's outer bezel. */
const WINDOW = 0.982;
const DEG = Math.PI / 180;
const DET = 1.3 * DEG; // the native dial: 1.3 degrees of turn per BPM

const tempoWord = (b: number) => libTempoName(b).toUpperCase();
/** A failure reason in a few words, for the LED. */
const shortReason = (m: string) => {
  const t = m.toLowerCase();
  if (t.includes('silent')) return 'NO SOUND HEARD';
  if (t.includes('microphone') || t.includes('mic')) return 'NO MIC INPUT';
  if (t.includes('timing')) return 'TIMING ERROR';
  if (t.includes('early') || t.includes('short')) return 'TOO SHORT';
  if (t.includes('build')) return 'NEEDS APP BUILD';
  if (t.includes('not playing') || t.includes('not running')) return 'CLICK NOT RUNNING';
  return m.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 18);
};

/** A key: the cap is in the art; pressing it drops the cap into its pocket (drawn by the instrument). */
function Key({
  rect,
  id,
  pressed,
  depth,
  label,
  heavy,
  onPressIn,
  onPress,
  onLongPress,
  onRepeat,
  onRelease,
}: {
  rect: { x: number; y: number; w: number; h: number; r: number };
  id: KeyId;
  pressed: { value: string };
  depth: { value: number };
  label: string;
  heavy?: boolean;
  onPressIn?: (timestamp: number) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Held keys repeat: first after 380 ms, then every 70 ms; `n` counts the repeats (for acceleration). */
  onRepeat?: (n: number) => void;
  onRelease?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      delayLongPress={id === 'loop' ? 480 : 650}
      onPressIn={(e) => {
        pressed.value = id;
        depth.value = withTiming(1, { duration: 45, easing: Easing.out(Easing.quad) });
        if (heavy) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
        else press();
        onPressIn?.(e.nativeEvent.timestamp);
        if (onRepeat) {
          let n = 0;
          const tick = (ms: number) => {
            timer.current = setTimeout(() => {
              n += 1;
              // a held key ticks lightly every fifth step, never a continuous buzz
              if (n % 5 === 1) void Haptics.selectionAsync().catch(() => undefined);
              onRepeat(n);
              tick(70);
            }, ms);
          };
          tick(380);
        }
      }}
      onPressOut={() => {
        // the key coming back up: a lighter second click, like a real switch's return
        if (pressed.value === id) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined);
          // the key springs back up, then lets go of its pocket
          depth.value = withTiming(0, { duration: 130, easing: Easing.out(Easing.back(2)) }, (done) => {
            'worklet';
            if (done && pressed.value === id) pressed.value = '';
          });
        }
        stop();
        onRelease?.();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r }}
    />
  );
}

export function FrontScreen() {
  useFonts(FONTS);
  const { width, height } = useWindowDimensions();
  const ns = useNs9(width, height);
  const st = useInstrumentState();
  const m = useMetronome();
  const { config, update, setBpm, playing, transport, toggle, tapTempo, previewSound, hydrated } = m;
  const bpm = sanitizeBpm(config.bpm, 120, 20, 400);
  const ts = config.timeSignature;
  const [sheet, setSheet] = useState<SheetId>(null);
  const clock = useBeatClock(m, playing);
  const [tunerOn, setTunerOn] = useState(false);
  const tuner = useTuner(tunerOn, config.pitchPipeHz || 440);
  const [light, setLight] = useBeatLight();
  const [demo, setDemo] = useState(0);
  const accentsSv = useSharedValue<number[]>([]);
  const [face, setFace] = useState<FaceId>('dial');

  // ---- geometry ---------------------------------------------------------------------------------
  const ds = ns.sc('dial');
  const dialC = ns.T('dial', DIAL_C.x, DIAL_C.y);
  const knurlC = ns.T('dial', KNURL_C.x, KNURL_C.y);
  const win = useMemo(() => ns.dialFrame(WINDOW), [ns]);
  const full = useMemo(() => ns.dialFrame(1), [ns]);
  const navFrame = useMemo<FrontFrame>(() => {
    const s = ns.sc('nav');
    return {
      s,
      point: (x, y) => ns.T('nav', x, y),
      rect: (r) => {
        const o = ns.T('nav', r.x, r.y);
        return { x: o.x, y: o.y, w: r.w * s, h: r.h * s };
      },
    };
  }, [ns]);
  const caps = useMemo(
    () => ({
      tuner: ns.capRect('tuner'), sound: ns.capRect('sound'), loop: ns.capRect('loop'), tap: ns.capRect('tap'), play: ns.capRect('play'),
      meter: ns.capRect('meter'), set: ns.capRect('set'), minus: ns.capRect('minus'), plus: ns.capRect('plus'),
    }),
    [ns]
  );

  // ---- keep the screen on when asked ----------------------------------------------------------------
  useEffect(() => {
    if (config.keepAwake) void activateKeepAwakeAsync('pockt-front').catch(() => undefined);
    else void Promise.resolve(deactivateKeepAwake('pockt-front')).catch(() => undefined);
  }, [config.keepAwake]);

  // ---- glass messages ---------------------------------------------------------------------------------
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // messages go to the LED window and stay long enough to read
  const say = useCallback((text: string, ms?: number) => {
    setNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), ms ?? Math.max(3200, 1600 + text.length * 80));
  }, []);
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);
  // an accent change reads big in the glass, in place of the tempo, for a moment
  const [word, setWord] = useState<string | null>(null);
  const [wordSub, setWordSub] = useState<string | null>(null);
  const wordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showWord = useCallback((w: string, sub?: string) => {
    setWord(w);
    setWordSub(sub ?? null);
    if (wordTimer.current) clearTimeout(wordTimer.current);
    wordTimer.current = setTimeout(() => setWord(null), 1300);
  }, []);
  useEffect(() => () => { if (wordTimer.current) clearTimeout(wordTimer.current); }, []);

  // ---- meter, accents, lamps -------------------------------------------------------------------------
  const nBeats = beatsOf(ts);
  const leadsOfMeter = lampLeadBeats(ts);
  const wheelAccents = Array.from({ length: nBeats }, (_, b) => (config.accentPattern[b] ?? (b === 0 ? 'strong' : 'normal')) as AccentLevel);
  const levels = wheelAccents.map((a) => LEVEL_OF[a] ?? 2);
  const levelsKey = levels.join('');
  const lampLevels = [0, 1, 2, 3].map((i) => (i < leadsOfMeter.length ? levels[leadsOfMeter[i]] ?? 2 : -1));
  const lampKey = lampLevels.join(',');
  const lampMap = useSharedValue<number[]>([]);
  useEffect(() => {
    accentsSv.value = levelsKey.split('').map(Number);
    const lv = lampKey.split(',').map(Number);
    st.lampLv.value = lv;
    st.pips.value = lv;
    lampMap.value = Array.from({ length: nBeats }, (_, b) => {
      const { lamp } = lampOfBeat(ts, b);
      return lamp >= 0 && (levelsKey.charCodeAt(b) - 48) > 0 ? lamp : -1;
    });
  }, [levelsKey, lampKey, nBeats, ts, accentsSv, st, lampMap]);
  // The lamp a beat belongs to lights exactly when the beat is heard: read from the clock, on the UI thread.
  useAnimatedReaction(
    () => (clock.barPos.value < 0 ? -1 : Math.floor(clock.barPos.value + 0.02)),
    (b) => {
      st.lampHit.value = b < 0 ? -1 : lampMap.value[b % Math.max(1, lampMap.value.length)] ?? -1;
    }
  );

  // ---- transport mirrors ------------------------------------------------------------------------------
  useEffect(() => { st.bpm.value = bpm; }, [bpm, st]);
  useEffect(() => { st.playing.value = playing ? 1 : 0; }, [playing, st]);

  // ---- beat for the faces that are still driven from JS ------------------------------------------------
  const [beatSerial, setBeatSerial] = useState(0);
  const [beatNow, setBeatNow] = useState(0);
  const [wheelPreviews, setWheelPreviews] = useState<number[]>(() => Array(16).fill(0));
  const flash = useSharedValue(0);
  const lastBeat = useRef('');
  useEffect(() => {
    if (!playing || transport.silentMeasure) return;
    const key = `${transport.measureIndex}:${transport.beatIndex}`;
    if (key === lastBeat.current) return;
    lastBeat.current = key;
    const level = (config.accentPattern[transport.beatIndex] ?? 'normal') as AccentLevel;
    setBeatNow(transport.beatIndex);
    setBeatSerial((v) => v + 1);
    if (config.flashScreenOnBeat && level !== 'mute') {
      flash.value = withSequence(withTiming(transport.beatIndex === 0 ? 0.2 : 0.1, { duration: 10 }), withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }));
    }
  }, [transport, playing, config.accentPattern, config.flashScreenOnBeat, flash]);
  useEffect(() => {
    if (!playing) lastBeat.current = '';
  }, [playing]);
  const blStart = useRef(-1);
  if (!playing) blStart.current = -1;
  else if (blStart.current < 0) blStart.current = transport.measureIndex;
  const beatlineBar = Math.max(1, transport.measureIndex - blStart.current + 1);
  // one bar count and one elapsed clock for every face, counted from Play; a face mounting never resets them
  const playT0 = useRef(0);
  if (!playing) playT0.current = 0;
  else if (!playT0.current) playT0.current = Date.now();

  /** One accent edit, from a lamp or a face: everything shows it, and the glass says it in words. */
  const previewLamp = (beat: number) => {
    const lamp = leadsOfMeter.indexOf(beat);
    if (lamp < 0) return;
    const next = st.lampPreviewAt.value.slice();
    next[lamp] = clock.now.value;
    st.lampPreviewAt.value = next;
  };
  const cycleBeat = (beat: number) => {
    if (beat < 0 || beat >= nBeats) return;
    const pattern = [...wheelAccents];
    pattern[beat] = nextAccent(pattern[beat]);
    update({ accentPattern: pattern });
    previewLamp(beat);
    setWheelPreviews((s) => s.map((v, k) => (k === beat ? v + 1 : v)));
    showWord(ACCENT_WORD[pattern[beat]], `BEAT ${beat + 1} OF ${nBeats}`);
  };
  const setLevel = (beat: number, level: number) => {
    const pattern = [...wheelAccents];
    pattern[beat] = ACCENT_OF[level] ?? 'normal';
    update({ accentPattern: pattern });
    previewLamp(beat);
    void Haptics.impactAsync(level === 3 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    showWord(ACCENT_WORD[pattern[beat]], `BEAT ${beat + 1} OF ${nBeats}`);
  };
  const chooseFace = (f: FaceId) => {
    if (f === face) {
      say(FACE_HINT[f] ?? FACE_NAME[f]);
      if (f !== 'dial' && f !== 'rhythm') {
        press();
        setSheet('face');
      }
      return;
    }
    if (tunerOn) setTunerOn(false);
    setFace(f);
    const hint = FACE_HINT[f];
    if (hint) say(hint);
  };

  // ---- speed trainer: climbs the tempo on the bar line while you play ----------------------------------
  const [trainer, setTrainer] = useState<SpeedTrainer>({ on: false, step: 2, every: 4, target: 160 });
  const tr = useRef({ from: -1 });
  useEffect(() => {
    if (!playing || !trainer.on) { tr.current.from = -1; return; }
    if (transport.beatIndex !== 0) return;
    if (tr.current.from < 0) { tr.current.from = transport.measureIndex; return; }
    const bars = transport.measureIndex - tr.current.from;
    if (bars > 0 && bars % trainer.every === 0 && bpm < trainer.target) {
      tr.current.from = transport.measureIndex;
      const next = Math.min(trainer.target, bpm + trainer.step);
      setBpm(next, 'trainer');
      say(next >= trainer.target ? `TARGET ${next} BPM` : `UP TO ${next}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport.measureIndex, transport.beatIndex, playing, trainer]);

  // ---- LOOP ------------------------------------------------------------------------------------------
  // A phrase looper on one key, the way a single-switch looper pedal works, kept in time by the click:
  //   TAP          → a one-bar count-in, then RECORDING (red, blinking) from the downbeat
  //   TAP          → the loop ends at the next bar line and plays straight away (white)
  //   TAP (playing)→ add a LAYER: one full pass from the top of the loop, over what plays (red blinking)
  //   TAP TAP      → stop · TAP → play again from the next downbeat
  //   HOLD         → playing: undo the last layer (hold again: redo) · stopped: clear the loop
  // The take is recorded in the audio engine on the click's own timeline, so every repeat lands on the one.
  type LoopState = 'idle' | 'countdown' | 'recording' | 'finishing' | 'playing' | 'layerWait' | 'layering' | 'layerFinishing' | 'ready' | 'cued';
  const [loopState, setLoopState] = useState<LoopState>('idle');
  const loopRef = useRef<LoopState>('idle');
  loopRef.current = loopState;
  const [loopBar, setLoopBar] = useState(0);
  const [countLeft, setCountLeft] = useState(0);
  const [layers, setLayers] = useState<{ count: number; muted: boolean[]; canRedo: boolean }>({ count: 0, muted: [], canRedo: false });
  const LOOP_MAX_BARS = 64;
  const lp = useRef({ closeAt: 0, finalizeAt: 0, countAt: 0, layerCloseAt: 0, finalizing: false, startHost: 0, endHost: 0, armAfter: 0, pendingPlay: false, pendingArm: false, startMeasure: 0, endMeasure: 0, bars: 0, from: 0, bpm: 0, ts: '', passStart: 0, recStartedAt: 0 });
  const playingNow = useRef(playing);
  playingNow.current = playing;
  const native = PocktTiming as unknown as {
    loopPrepare?: () => Promise<boolean>;
    loopArm?: (m: number) => Promise<boolean>;
    loopFinalize?: (m: number, a: number, b: number) => Promise<{ ok: boolean; reason: string; bars?: number; layers?: number }>;
    loopArmLayer?: () => Promise<boolean>;
    loopFinalizeLayer?: (m: number, a: number, b: number) => Promise<{ ok: boolean; reason: string; layers?: number }>;
    loopCancelLayer?: () => Promise<boolean>;
    loopUndo?: () => Promise<{ ok: boolean; layers: number; canRedo?: boolean }>;
    loopRedo?: () => Promise<{ ok: boolean; layers: number; canRedo?: boolean }>;
    loopSetLayerMuted?: (i: number, m: boolean) => Promise<boolean>;
    loopDeleteLayer?: (i: number) => Promise<{ ok: boolean; layers: number }>;
    loopPlay?: (m: number) => Promise<boolean>;
    loopHalt?: () => Promise<boolean>;
    loopClear?: () => Promise<boolean>;
    loopRelease?: () => Promise<boolean>;
    loopInfo?: () => Promise<Record<string, unknown>>;
  } | null;
  /** Host seconds at which the beat just reported was heard (the visual clock's own reference). */
  const heardNow = () => m.pulseBeatHost.value + m.pulseLatency.value;
  const spb = () => 60 / Math.max(1, bpm);
  const refreshLayers = useCallback(() => {
    native?.loopInfo?.().then((i) => {
      setLayers({ count: Number(i.layers) || 0, muted: Array.isArray(i.muted) ? (i.muted as boolean[]) : [], canRedo: !!i.canRedo });
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const loopFail = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    // say exactly what went wrong, so a failure can be fixed rather than guessed at
    say(/permission|denied/i.test(msg) ? 'ALLOW MIC IN SETTINGS' : `LOOP · ${shortReason(msg)}`, 6000);
    setLoopState('idle');
    setLayers({ count: 0, muted: [], canRedo: false });
    void native?.loopClear?.().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say]);

  /** Arms the take on a bar line at least two beats away, so there is always a real count-in. */
  const armAt = useCallback((measure: number, beat: number) => {
    const L = lp.current;
    const left = nBeats - beat; // beats until the next bar line
    const start = measure + (left < 2 ? 2 : 1);
    L.startMeasure = start;
    L.pendingArm = false;
    setCountLeft((start - measure) * nBeats - beat);
    if (!native?.loopArm) { loopFail(new Error('needs the app build')); return; }
    native.loopArm(start).then((ok) => { if (!ok) loopFail(new Error('click not running')); }).catch(loopFail);
  }, [nBeats, native, loopFail]);

  /** A promise that gives up after `ms` (a native call must never hold the looper hostage). */
  const within = <T,>(pr: Promise<T>, ms: number) =>
    Promise.race([pr, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no response')), ms))]);

  /** The take ends on the downbeat of L.endMeasure: note when that is, by the clock, as well as by the bar. */
  const enterFinishing = (curMeasure: number, curBeat: number) => {
    const L = lp.current;
    L.finalizing = false;
    L.closeAt = Date.now() + Math.max(0, (L.endMeasure - curMeasure) * nBeats - curBeat) * spb() * 1000;
    setLoopState('finishing');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  /** Cuts the first take (once). Triggered by the closing downbeat, or by the clock if that event is late. */
  const finalizeTake = () => {
    const L = lp.current;
    if (L.finalizing || loopRef.current !== 'finishing') return;
    L.finalizing = true;
    L.finalizeAt = Date.now();
    // the heard time of the closing downbeat, from the start downbeat and the tempo (the engine prefers its own)
    L.endHost = L.startHost + (L.endMeasure - L.startMeasure) * nBeats * spb();
    L.from = L.endMeasure;
    setTimeout(() => {
      if (!native?.loopFinalize) { L.finalizing = false; loopFail(new Error('needs the app build')); return; }
      within(native.loopFinalize(L.endMeasure, L.startHost, L.endHost), 3000).then((r) => {
        L.finalizing = false;
        if (loopRef.current !== 'finishing') return;
        if (r?.ok) {
          L.bars = r.bars ?? L.bars;
          setLoopBar(1);
          setLoopState('playing');
          refreshLayers();
          say('LOOP SET · TAP: ADD LAYER', 3500);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        } else loopFail(new Error(r?.reason || 'take failed'));
      }).catch((e) => { L.finalizing = false; recoverLoop(e); });
    }, 70);
  };

  /** Closes a layer's pass (once). */
  const finalizeLayer = () => {
    const L = lp.current;
    if (L.finalizing || loopRef.current !== 'layering') return;
    L.finalizing = true;
    L.finalizeAt = Date.now();
    L.endHost = L.startHost + L.bars * nBeats * spb();
    setLoopState('layerFinishing');
    setTimeout(() => {
      if (!native?.loopFinalizeLayer) { L.finalizing = false; setLoopState('playing'); return; }
      within(native.loopFinalizeLayer(L.passStart, L.startHost, L.endHost), 3000).then((r) => {
        L.finalizing = false;
        if (loopRef.current !== 'layerFinishing') return;
        setLoopState('playing');
        if (r?.ok) {
          refreshLayers();
          say(`LAYER ${r.layers ?? ''} ADDED · HOLD: UNDO`);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        } else say(`LAYER · ${shortReason(r?.reason || '')}`, 5000);
      }).catch((e) => {
        L.finalizing = false;
        void native?.loopCancelLayer?.().catch(() => undefined);
        setLoopState('playing');
        say(`LAYER · ${shortReason(String(e))}`, 5000);
      });
    }, 70);
  };

  /** A step that did not answer: ask the engine where it really is, and land there (a saved loop is kept). */
  const recoverLoop = (e: unknown) => {
    native?.loopInfo?.().then((i) => {
      const phase = String(i.phase ?? '');
      if (phase === 'playing') { setLoopState('playing'); refreshLayers(); say('LOOP SET · TAP: ADD LAYER'); return; }
      if (phase === 'ready') { setLoopState('ready'); refreshLayers(); return; }
      loopFail(e);
    }).catch(() => loopFail(e));
  };

  // the watchdog: no looper state can hang. A late closing event is covered by the clock; a native call that
  // never answers is given up on and the engine asked where it is; a count-in that never starts is dropped.
  useEffect(() => {
    if (loopState !== 'finishing' && loopState !== 'layering' && loopState !== 'layerFinishing' && loopState !== 'countdown') return;
    const id = setInterval(() => {
      const L = lp.current;
      const now = Date.now();
      const st8 = loopRef.current;
      if (st8 === 'finishing' && !L.finalizing && L.closeAt > 0 && now > L.closeAt + 250) finalizeTake();
      if (st8 === 'layering' && !L.finalizing && L.layerCloseAt > 0 && now > L.layerCloseAt + 300) finalizeLayer();
      if ((st8 === 'finishing' || st8 === 'layerFinishing') && L.finalizing && now - L.finalizeAt > 4000) {
        L.finalizing = false;
        if (st8 === 'finishing') recoverLoop(new Error('no response'));
        else { setLoopState('playing'); say('LAYER · NO RESPONSE', 4000); }
      }
      if (st8 === 'countdown' && L.countAt > 0 && now - L.countAt > 12000) loopFail(new Error('count-in stalled'));
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopState]);

  const lastLoopBeat = useRef('');
  useEffect(() => {
    if (!playing) return;
    const key = `${transport.measureIndex}:${transport.beatIndex}`;
    if (key === lastLoopBeat.current) return;
    lastLoopBeat.current = key;
    const L = lp.current;
    const mI = transport.measureIndex;
    const b = transport.beatIndex;
    const state = loopRef.current;
    const loopTop = (mm: number) => L.bars > 0 && mm >= L.from && (mm - L.from) % L.bars === 0;
    if (state === 'countdown') {
      if (L.pendingArm) { if (Date.now() >= L.armAfter) armAt(mI, b); return; }
      if (mI >= L.startMeasure) {
        L.startHost = heardNow();
        L.recStartedAt = Date.now();
        L.bpm = bpm;
        L.ts = ts;
        setLoopBar(1);
        setLoopState('recording');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
        return;
      }
      setCountLeft((L.startMeasure - mI) * nBeats - b);
      return;
    }
    if (state === 'recording') {
      const bar = mI - L.startMeasure + 1;
      setLoopBar(bar);
      if (b === 0 && bar > LOOP_MAX_BARS) {
        L.endMeasure = L.startMeasure + LOOP_MAX_BARS;
        L.bars = LOOP_MAX_BARS;
        enterFinishing(mI, b);
      }
      return;
    }
    if (state === 'finishing') {
      if (mI >= L.endMeasure) finalizeTake();
      return;
    }
    if (state === 'cued' && L.pendingPlay) {
      // the click was just started for the loop: it comes in on the next bar line
      L.pendingPlay = false;
      L.from = mI + 1;
      native?.loopPlay?.(L.from).then((ok) => { if (!ok) loopFail(new Error('play')); }).catch(loopFail);
      return;
    }
    if (state === 'cued') {
      if (mI < L.from) return;
      setLoopState('playing');
      setLoopBar(1);
      return;
    }
    if (state === 'playing' || state === 'layerWait' || state === 'layering' || state === 'layerFinishing') {
      const bar = L.bars > 0 ? ((((mI - L.from) % L.bars) + L.bars) % L.bars) + 1 : 1;
      setLoopBar(bar);
      if (state === 'layerWait' && b === 0 && loopTop(mI)) {
        // the top of the loop: the layer's pass begins here
        L.passStart = mI;
        L.startHost = heardNow();
        L.layerCloseAt = Date.now() + L.bars * nBeats * spb() * 1000;
        setLoopState('layering');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
        return;
      }
      if (state === 'layering' && b === 0 && mI >= L.passStart + L.bars) finalizeLayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, playing]);

  // the click stops: a take in progress is abandoned, playback stops, the mic is handed back
  useEffect(() => {
    if (playing) return;
    const state = loopRef.current;
    if (state === 'idle' && !lp.current.bars) return;
    void native?.loopRelease?.().catch(() => undefined);
    if (state === 'countdown' || state === 'recording' || state === 'finishing') { lp.current.bars = 0; setLoopState('idle'); say('LOOP CANCELLED'); }
    else if (state !== 'idle') setLoopState('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  // a tempo or meter change stops playback: the loop only fits the tempo it was played at
  useEffect(() => {
    const L = lp.current;
    const live = loopState === 'playing' || loopState === 'cued' || loopState === 'layerWait' || loopState === 'layering' || loopState === 'layerFinishing';
    if (live && (bpm !== L.bpm || ts !== L.ts)) {
      void native?.loopCancelLayer?.().catch(() => undefined);
      void native?.loopHalt?.().catch(() => undefined);
      setLoopState('ready');
      say('TEMPO CHANGED · LOOP OFF');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, ts, loopState]);
  useEffect(() => () => { void native?.loopClear?.().catch(() => undefined); }, [native]);

  // first-use guides: the looper (on the first LOOP tap) and the six faces (on first launch)
  const guides = useGuides();
  const [guide, setGuide] = useState<GuideId | null>(null);
  const afterGuide = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (guides.ready && !guides.seen.faces) setGuide('faces');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides.ready]);
  const closeGuide = () => {
    if (guide) guides.markSeen(guide);
    setGuide(null);
    const next = afterGuide.current;
    afterGuide.current = null;
    next?.();
  };

  const micOk = useRef(false);
  const startRecording = async () => {
    if (!native?.loopArm) { say('LOOP NEEDS APP BUILD'); return; }
    if (!micOk.current) {
      try {
        const p = await requestRecordingPermissionsAsync();
        micOk.current = !!p.granted;
      } catch { micOk.current = false; }
      if (!micOk.current) { say('ALLOW MIC IN SETTINGS'); return; }
    }
    const L = lp.current;
    L.bars = 0;
    L.pendingArm = true;
    L.finalizing = false;
    L.armAfter = Number.POSITIVE_INFINITY;
    setLoopBar(0);
    setCountLeft(0);
    setLayers({ count: 0, muted: [], canRedo: false });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    L.countAt = Date.now();
    setLoopState('countdown');
    if (tunerOn) setTunerOn(false);
    // open the microphone path in the audio lane (after the tuner has handed it back), then count in
    try {
      const ok = await enqueueAudio(async () => (await native.loopPrepare?.()) ?? true);
      if (!ok) throw new Error('mic path');
    } catch (e) {
      loopFail(e);
      return;
    }
    if (loopRef.current !== 'countdown') return; // cancelled meanwhile
    if (!playingNow.current) {
      // the click starts for the take: its first bar is the count-in
      L.armAfter = 0;
      if (hydrated) toggle();
    } else {
      L.armAfter = Date.now() + 450;
    }
  };
  const loopTap = () => {
    const L = lp.current;
    switch (loopState) {
      case 'idle':
        if (!guides.seen.loop) {
          afterGuide.current = () => void startRecording();
          setGuide('loop');
          return;
        }
        void startRecording();
        return;
      case 'countdown':
        void native?.loopClear?.().catch(() => undefined);
        L.bars = 0;
        setLoopState('idle');
        say('RECORDING CANCELLED');
        return;
      case 'recording': {
        // the take ends at the next bar line (a tap in its first moments is the end of the count-in, not a stop)
        if (Date.now() - L.recStartedAt < 500) return;
        L.endMeasure = transport.measureIndex + 1;
        L.bars = Math.max(1, L.endMeasure - L.startMeasure);
        enterFinishing(transport.measureIndex, transport.beatIndex);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        return;
      }
      case 'playing':
        if (layers.count >= 6) { say('MAX 6 LAYERS · HOLD: UNDO'); return; }
        native?.loopArmLayer?.().then((ok) => {
          if (!ok) { say('START THE LOOP FIRST'); return; }
          setLoopState('layerWait');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        }).catch((e) => say(`LAYER · ${shortReason(String(e))}`, 5000));
        return;
      case 'layerWait':
      case 'layering':
        void native?.loopCancelLayer?.().catch(() => undefined);
        setLoopState('playing');
        say('LAYER CANCELLED');
        return;
      case 'ready': {
        if (L.bpm && (bpm !== L.bpm || ts !== L.ts)) { say(`LOOP IS ${L.bpm} BPM ${L.ts}`); return; }
        if (!playing) {
          if (!hydrated) return;
          L.pendingPlay = true;
          setLoopBar(1);
          setLoopState('cued');
          toggle();
          return;
        }
        L.from = transport.measureIndex + 1;
        native?.loopPlay?.(L.from).then((ok) => { if (!ok) loopFail(new Error('play')); }).catch(loopFail);
        setLoopBar(1);
        setLoopState('cued');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        return;
      }
      default: return;
    }
  };
  const loopDoubleTap = () => {
    switch (loopState) {
      case 'playing': case 'cued': case 'layerWait': case 'layering': case 'layerFinishing':
        void native?.loopCancelLayer?.().catch(() => undefined);
        void native?.loopHalt?.().catch(() => undefined);
        setLoopState('ready');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        return;
      default: loopTap(); return;
    }
  };
  const loopHold = () => {
    switch (loopState) {
      case 'playing': case 'layerWait': case 'layering': case 'layerFinishing': case 'cued':
        if (layers.count > 1) {
          native?.loopUndo?.().then((r) => { refreshLayers(); say(r.ok ? 'LAYER REMOVED · HOLD: REDO' : 'NOTHING TO UNDO'); }).catch(() => undefined);
        } else if (layers.canRedo) {
          native?.loopRedo?.().then((r) => { refreshLayers(); say(r.ok ? `LAYER BACK · ${r.layers} LAYERS` : 'NOTHING TO REDO'); }).catch(() => undefined);
        } else say('2×TAP STOP · HOLD CLEARS');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
        return;
      case 'ready':
        if (layers.canRedo && layers.count >= 1) {
          native?.loopRedo?.().then((r) => { refreshLayers(); say(r.ok ? `LAYER BACK · ${r.layers} LAYERS` : 'CLEARED'); }).catch(() => undefined);
          return;
        }
        void native?.loopClear?.().catch(() => undefined);
        lp.current.bars = 0;
        setLayers({ count: 0, muted: [], canRedo: false });
        setLoopState('idle');
        say('LOOP CLEARED');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        return;
      case 'idle': void startRecording(); return;
      default: loopTap(); return;
    }
  };
  // one key, three gestures: a tap waits briefly for a second tap only where a double tap means something
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); }, []);
  const pressLoop = () => {
    const needsDouble = loopState === 'playing' || loopState === 'cued' || loopState === 'layerWait' || loopState === 'layering' || loopState === 'layerFinishing';
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      loopDoubleTap();
      return;
    }
    if (!needsDouble) { loopTap(); return; }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; loopTap(); }, 260);
  };
  const muteLayer = (i: number, muted: boolean) => { void native?.loopSetLayerMuted?.(i, muted).then(refreshLayers).catch(() => undefined); };
  const deleteLayer = (i: number) => {
    native?.loopDeleteLayer?.(i).then((r) => {
      refreshLayers();
      if (r.layers === 0) { lp.current.bars = 0; setLoopState('idle'); say('LOOP CLEARED'); } else say(`LAYER ${i + 1} DELETED`);
    }).catch(() => undefined);
  };
  const countIn = loopState === 'countdown' && !lp.current.pendingArm && countLeft > 0 && countLeft <= nBeats ? String(countLeft) : null;
  const getReady = loopState === 'countdown' && !countIn;

  const pressPlay = () => {
    if (!hydrated) return;
    // Play and the tuner run together; the tuner keeps listening
    toggle();
  };
  const step = (delta: number) => setBpm(Math.max(20, Math.min(400, bpm + delta)), delta > 0 ? 'plus' : 'minus');
  // stepping from a held key must read the latest tempo, not the one it was pressed at
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  // held +/-: one BPM at a time, then faster the longer it is held (after ~1.4 s by 2, after ~2.5 s by 5)
  const stepLive = (delta: number, n = 0) => {
    const cur = bpmRef.current;
    let next: number;
    if (n >= 30) next = delta > 0 ? Math.floor(cur / 5) * 5 + 5 : Math.ceil(cur / 5) * 5 - 5;
    else if (n >= 15) next = cur + delta * 2;
    else next = cur + delta;
    setBpm(Math.max(20, Math.min(400, next)), 'hold');
  };

  // ---- voices have a speed limit: a spoken count only reads up to a tempo --------------------------------
  const voiceMax = VOICE_MAX_BPM[config.sound];
  const voiceWarned = useRef('');
  useEffect(() => {
    const k = `${config.sound}:${voiceMax && bpm > voiceMax ? 'over' : 'ok'}`;
    if (voiceMax && bpm > voiceMax && voiceWarned.current !== k) say(`VOICE · BEST TO ${voiceMax} BPM`);
    voiceWarned.current = k;
  }, [config.sound, voiceMax, bpm, say]);

  // ---- key lights ------------------------------------------------------------------------------------
  const loopCode = loopState === 'countdown' ? 1 : loopState === 'recording' || loopState === 'layering' ? 2 : loopState === 'finishing' || loopState === 'layerFinishing' ? 5 : loopState === 'playing' || loopState === 'layerWait' ? 3 : loopState === 'ready' ? 4 : loopState === 'cued' ? 6 : 0;
  const loopP0 = 0;
  const loopStep = 0;
  const meterLit = ts !== '4/4' || config.subdivision !== 'quarter' ? 1 : 0;
  useEffect(() => {
    st.keys.value = { ...st.keys.value, meter: meterLit, set: trainer.on ? 1 : 0, loop: loopCode, silent: transport.silentMeasure ? 1 : 0, loopP0, loopStep, beats: nBeats };
  }, [meterLit, trainer.on, loopCode, transport.silentMeasure, st, loopP0, loopStep, nBeats]);

  // ---- the dial: the knurl follows the finger; other tempo changes turn it by their detents ----------------
  const nativeBpm = useRef(bpm);
  const prevBpm = useRef(bpm);
  const lastRad = useRef(0);
  useEffect(() => {
    const d = bpm - prevBpm.current;
    prevBpm.current = bpm;
    if (bpm !== nativeBpm.current) {
      nativeBpm.current = bpm;
      const sign = config.wheelInvert ? -1 : 1;
      st.turn.value = withTiming(st.turn.value + d * DET * sign, { duration: Math.min(420, 140 + Math.abs(d) * 6), easing: Easing.out(Easing.cubic) });
    }
  }, [bpm, st, config.wheelInvert]);

  // ---- tuner -----------------------------------------------------------------------------------------
  // The pocket: within ±3 cents for a quarter second locks; it only lets go past ±7 cents (or after the
  // note has been gone for most of a second), so a held, true note stays locked instead of flickering.
  const live = tuner.reading;
  const lastHeard = useRef<{ r: typeof live; at: number }>({ r: null, at: 0 });
  const nowMs = Date.now();
  const liveHeard = Boolean(tunerOn && live && live.state !== 'listening');
  if (liveHeard) lastHeard.current = { r: live, at: nowMs };
  const lk = useRef({ locked: false, inSince: 0, outSince: 0 });
  const reading = liveHeard ? live : tunerOn && lk.current.locked && nowMs - lastHeard.current.at < 800 ? lastHeard.current.r : null;
  const heard = Boolean(tunerOn && reading);
  if (!tunerOn || !heard) lk.current = { locked: false, inSince: 0, outSince: 0 };
  else if (liveHeard && reading) {
    const c = Math.abs(reading.cents);
    const L = lk.current;
    if (!L.locked) {
      if (c <= 3) { if (!L.inSince) L.inSince = nowMs; if (nowMs - L.inSince >= 250) { L.locked = true; L.outSince = 0; } }
      else L.inSince = 0;
    } else if (c > 7) { if (!L.outSince) L.outSince = nowMs; if (nowMs - L.outSince >= 180) { L.locked = false; L.inSince = 0; } }
    else L.outSince = 0;
  }
  const locked = heard && lk.current.locked;
  const [, bump] = useState(0);
  useEffect(() => {
    if (!tunerOn || liveHeard || !locked) return;
    const t = setTimeout(() => bump((v) => v + 1), 820);
    return () => clearTimeout(t);
  }, [tunerOn, liveHeard, locked]);
  useEffect(() => { st.tuner.value = tunerOn ? 1 : 0; }, [tunerOn, st]);
  useEffect(() => {
    st.heard.value = heard ? 1 : 0;
    // locked, the needle settles onto the arrow and stays there while the note stays true
    if (heard && reading) st.needle.value = withTiming(locked ? reading.cents * 0.2 : reading.cents, { duration: locked ? 260 : 110, easing: Easing.out(Easing.quad) });
    else if (!tunerOn) st.needle.value = 0;
  }, [heard, reading, tunerOn, locked, st]);
  const wasLocked = useRef(false);
  useEffect(() => {
    if (locked && !wasLocked.current) {
      st.lockAt.value = clock.now.value;
      st.lockGlow.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0.55, { duration: 520, easing: Easing.out(Easing.quad) }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined), 110);
      previewSound('triangle');
    } else if (!locked && wasLocked.current) {
      st.lockGlow.value = withTiming(0, { duration: 220 });
    }
    wasLocked.current = locked;
  }, [locked, st, clock, previewSound]);
  // the knurl is a strobe: it turns toward the error and stands dead still when the string is true
  const strobeV = useSharedValue(0);
  useFrameCallback((f) => {
    'worklet';
    if (st.tuner.value < 0.5) {
      strobeV.value = 0;
      return;
    }
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    const rate = st.heard.value > 0.5 && st.lockGlow.value < 0.3 ? Math.max(-50, Math.min(50, st.needle.value)) * 0.045 : 0;
    strobeV.value += (rate - strobeV.value) * Math.min(1, dt * 6);
    st.turn.value += strobeV.value * dt;
  });
  const pressTuner = () => {
    // tuning is the one time the click goes quiet: the clock keeps running silently and comes back on exit
    if (playing) say(tunerOn ? 'CLICK BACK ON' : 'CLICK MUTED FOR TUNING');
    if (!tunerOn && face !== 'dial' && face !== 'pulse') setFace('dial');
    setTunerOn((v) => !v);
  };

  // ---- readout -----------------------------------------------------------------------------------------
  const windowFace = tunerOn || face === 'rhythm' || face === 'pendulum' || face === 'pro' || face === 'beatline';
  const ro = (!tunerOn && READOUT_AT[face]) || { dy: 0, scale: 1 };
  const roShift = useSharedValue(0);
  const roScale = useSharedValue(1);
  useEffect(() => {
    const winS = windowFace ? WINDOW : 1;
    roShift.value = withTiming(ro.dy * ds * winS, { duration: 220, easing: Easing.bezier(0.2, 0.85, 0.2, 1) });
    roScale.value = withTiming(ro.scale * (windowFace && ro.scale !== 1 ? WINDOW : 1), { duration: 220, easing: Easing.bezier(0.2, 0.85, 0.2, 1) });
  }, [ro.dy, ro.scale, ds, windowFace, roShift, roScale]);
  const roTransform = useDerivedValue(() => [{ translateY: roShift.value }, { scale: roScale.value }]);
  // ---- the LED window ------------------------------------------------------------------------------
  const nL = layers.count;
  const ledLoop: { text: string; tone: LedTone } | null =
    loopState === 'countdown' ? { text: countIn ? `● REC IN ${countIn}` : '● GET READY', tone: 'red' }
    : loopState === 'recording' ? { text: `● REC · BAR ${loopBar} · TAP=END`, tone: 'red' }
    : loopState === 'finishing' ? { text: '● CLOSING AT BAR LINE', tone: 'red' }
    : loopState === 'cued' ? { text: '▶ LOOP ON NEXT BAR', tone: 'white' }
    : loopState === 'playing' ? { text: `▶ LOOP · BAR ${loopBar}/${lp.current.bars}${nL > 1 ? ` · ${nL} LAYERS` : ''}`, tone: 'white' }
    : loopState === 'layerWait' ? { text: '● LAYER AT THE TOP', tone: 'red' }
    : loopState === 'layering' ? { text: `● LAYER ${nL + 1} · BAR ${loopBar}/${lp.current.bars}`, tone: 'red' }
    : loopState === 'layerFinishing' ? { text: `● LAYER ${nL + 1} · CLOSING`, tone: 'red' }
    : null;
  const ledIdle = tunerOn
    ? playing ? 'TUNER · CLICK MUTED' : `TUNER · A = ${config.pitchPipeHz || 440} HZ`
    : loopState === 'ready' ? 'LOOP SAVED · TAP TO PLAY'
    : `${FACE_NAME[face]} · ${meterLabel(ts)} · ${SUB_NAME[config.subdivision] ?? ''}`;
  const led: { text: string; tone: LedTone } = note && !(ledLoop && ledLoop.tone === 'red')
    ? { text: note, tone: 'blue' }
    : ledLoop ?? { text: ledIdle, tone: tunerOn && playing ? 'amber' : 'dim' };
  // the glass keeps to the tempo; every message goes to the LED window
  const smallText = countIn ? 'RECORDING IN' : getReady ? 'GET READY' : tempoWord(bpm);
  const smallColor = countIn || getReady ? '#ff6a4a' : '#e8b46e';
  const tunerData: TunerReadoutProps = {
    mode: 'tuner',
    heard,
    locked,
    note: reading?.note ?? '',
    octave: reading ? String(reading.octave) : '',
    hz: reading ? reading.frequency.toFixed(1) : '',
    cents: reading?.cents ?? 0,
    idleTop: (tuner.denied ? 'ALLOW THE MICROPHONE' : tuner.error ? 'MIC UNAVAILABLE' : 'PLAY A NOTE'),
    idleBottom: `A = ${config.pitchPipeHz || 440} HZ`,
  };
  // window faces have room for one line under the tempo: messages take the BPM line's place
  const lowLine = face === 'pendulum' || face === 'pro' || face === 'beatline';
  const msg = countIn ? 'RECORDING IN' : null;
  const tempoData: TempoReadoutProps = {
    mode: 'tempo',
    word: countIn ? null : word,
    wordSub: countIn ? null : wordSub,
    count: countIn,
    big: String(bpm),
    small: face === 'pulse' ? msg ?? '' : lowLine ? '' : smallText,
    smallColor,
    unit: face === 'pulse' ? '' : lowLine ? msg ?? 'BPM' : 'BPM',
    meter: ts === '4/4' || face === 'pulse' || lowLine ? null : meterLabel(ts),
  };
  const readoutData = tunerOn ? { ...tunerData, idleTop: tunerData.idleTop } : tempoData;

  // every window face sits on the same glass: it is drawn once under them all, so a face switch can never
  // show the dial through the window while the new face draws its first frame
  const ringBox = useMemo(() => win.rect(RING_BOX), [win]);
  const faceFailed = useCallback((name: string) => {
    say('FACE RESET');
    if (name !== 'dial') setFace('dial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const dialMode = tunerOn ? 'rim' : face === 'dial' || face === 'pulse' ? 'knurl' : face === 'rhythm' ? 'wheel' : 'rim';
  const dialHalf = 300 * ds;
  const knurlShown = !tunerOn && face === 'dial';
  const gr = 148 * ds;
  const hub = windowFace ? 0 : 0.92;

  return (
    <View style={styles.root}>
      <Instrument
        ns={ns}
        width={width}
        height={height}
        clock={clock}
        st={st}
        knurl={knurlShown}
        over={
          windowFace ? (
            <Group transform={[{ translateX: ringBox.x }, { translateY: ringBox.y }, { scale: ringBox.w / 600 }]}>
              <GlassUnder />
              <Seat />
            </Group>
          ) : face === 'pulse' && !tunerOn ? (
            <FaceBoundary key="pulse" name="pulse" plain onError={faceFailed}>
            <PulseFace
              frame={full}
              plateRect={{ x: ns.ox, y: ns.oy, width: ns.w, height: ns.h }}
              plateSource={ns.face}
              clock={clock}
              bpm={bpm}
              light={light}
              accents={accentsSv}
              beatIndex={m.pulseBeat}
              beatCount={m.pulseCount}
              beatHost={m.pulseBeatHost}
              beatLatency={m.pulseLatency}
              demo={demo}
            />
            </FaceBoundary>
          ) : null
        }
      />

      {tunerOn ? (
        <FaceBoundary key="tuner" name="tuner" onError={faceFailed}>
          <TunerFace frame={win} st={st} clock={clock} reading={{ heard, locked, note: reading?.note ?? '', octave: reading ? String(reading.octave) : '', cents: reading?.cents ?? 0, hint: tuner.denied ? 'ALLOW THE MICROPHONE' : tuner.error ? 'MIC UNAVAILABLE' : 'PLAY A NOTE' }} />
        </FaceBoundary>
      ) : null}
      {face === 'rhythm' && !tunerOn ? (
        <FaceBoundary key="rhythm" name="rhythm" onError={faceFailed}>
        <RhythmWheel
          frame={win}
          bpm={bpm}
          beats={nBeats}
          accents={wheelAccents}
          groups={groupsOf(ts)}
          subdivision={config.subdivision}
          playing={playing}
          beatSerial={beatSerial}
          beatIndex={beatNow}
          previews={wheelPreviews}
          clock={clock}
        />
        </FaceBoundary>
      ) : null}
      {face === 'pendulum' && !tunerOn ? (
        <FaceBoundary key="pendulum" name="pendulum" onError={faceFailed}>
        <PendulumFace
          frame={win}
          bpm={bpm}
          playing={playing}
          clock={clock}
          light={light}
          beatIndex={m.pulseBeat}
          accents={accentsSv}
          onBpm={(b) => setBpm(sanitizeBpm(b, bpm, 20, 400), 'pendulum')}
          onCatch={() => { if (playing) toggle(); }}
          onLaunch={() => { if (!playing && hydrated) toggle(); }}
          onDetent={() => void Haptics.selectionAsync().catch(() => undefined)}
        />
        </FaceBoundary>
      ) : null}
      {face === 'pro' && !tunerOn ? (
        <FaceBoundary key="pro" name="pro" onError={faceFailed}>
        <ProFace
          frame={win}
          bpm={bpm}
          beats={nBeats}
          levels={levels}
          subdivision={config.subdivision}
          playing={playing}
          bar={beatlineBar}
          startedAt={playT0.current}
          beat={transport.beatIndex}
          clock={clock}
          light={light}
          accents={accentsSv}
          onCycle={(b) => cycleBeat(b)}
          onSetLevel={setLevel}
          onBarMode={(b) => { setLight({ proBar: b, proPend: b !== 'off' }); press(); say(`LIGHT BAR · ${PRO_BAR_NAME[b]}`); }}
          onDetent={() => void Haptics.selectionAsync().catch(() => undefined)}
        />
        </FaceBoundary>
      ) : null}
      {face === 'beatline' && !tunerOn ? (
        <FaceBoundary key="beatline" name="beatline" onError={faceFailed}>
        <BeatlineFace
          frame={win}
          bpm={bpm}
          beats={nBeats}
          subdivision={config.subdivision}
          meterText={meterLabel(ts)}
          bar={playing ? beatlineBar : 1}
          clock={clock}
          light={light}
          accents={accentsSv}
          beatCount={m.pulseCount}
          beatIndex={m.pulseBeat}
          beatHost={m.pulseBeatHost}
          beatLatency={m.pulseLatency}
          onCycle={(b) => { press(); cycleBeat(b); }}
        />
        </FaceBoundary>
      ) : null}

      {/* the glass readout, over every face */}
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
        <Group origin={{ x: dialC.x, y: dialC.y }} transform={roTransform}>
          {tunerOn ? null : <Readout ns={ns} st={st} clock={clock} data={readoutData} />}
        </Group>
      </Canvas>

      {/* the glass: tap it for the keypad */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${bpm} beats per minute. Opens the keypad.`}
        onPressIn={press}
        onPress={() => (tunerOn ? undefined : setSheet('tempo'))}
        style={
          windowFace
            ? { position: 'absolute', left: dialC.x - gr * 0.5, top: dialC.y + ro.dy * ds * WINDOW - gr * 0.3, width: gr, height: gr * 0.6, borderRadius: gr * 0.3 }
            : { position: 'absolute', left: dialC.x - gr * hub, top: dialC.y - gr * hub, width: gr * hub * 2, height: gr * hub * 2, borderRadius: gr }
        }
      />

      {/* the turning dial: native touch, haptics and detent ticks; the knurl itself is drawn on the GPU */}
      {Platform.OS === 'ios' ? (
        <PocktDialView
          face={dialMode}
          bpm={bpm}
          haptic
          invert={config.wheelInvert}
          playing={playing}
          innerFraction={dialMode === 'knurl' ? 0.5 : dialMode === 'rim' ? 0.86 : undefined}
          pointerEvents={tunerOn ? 'none' : 'auto'}
          accessibilityLabel={`Tempo dial, ${bpm} BPM. Turn clockwise to speed up.`}
          onTurn={(e) => {
            const rad = e.nativeEvent.rad;
            const d = rad - lastRad.current;
            lastRad.current = rad;
            if (dialMode === 'knurl') st.turn.value = st.turn.value + d;
          }}
          onRingTap={(event) => {
            if (face !== 'rhythm') return;
            const beat = Math.round((event.nativeEvent.angle / 360) * nBeats) % nBeats;
            press();
            cycleBeat(beat);
          }}
          onBpm={(event) => {
            const next = sanitizeBpm(event.nativeEvent.bpm, bpm, 20, 400);
            nativeBpm.current = next;
            if (next !== bpm) setBpm(next, dialMode === 'knurl' ? 'dial' : 'wheel');
          }}
          style={{ position: 'absolute', left: knurlC.x - dialHalf, top: knurlC.y - dialHalf, width: dialHalf * 2, height: dialHalf * 2 }}
        />
      ) : null}

      {/* keys */}
      <Key rect={caps.tuner} id="tuner" pressed={st.pressed} depth={st.pressDepth} label={tunerOn ? 'Close the tuner' : 'Tuner'} onPress={pressTuner} />
      <Key rect={caps.sound} id="sound" pressed={st.pressed} depth={st.pressDepth} label={`Sound, ${soundStudioName(config.sound)}`} onPress={() => setSheet('sound')} />
      <Key rect={caps.minus} id="minus" pressed={st.pressed} depth={st.pressDepth} label="Slower by one" onPressIn={() => step(-1)} onRepeat={(n) => stepLive(-1, n)} />
      <Key rect={caps.plus} id="plus" pressed={st.pressed} depth={st.pressDepth} label="Faster by one" onPressIn={() => step(1)} onRepeat={(n) => stepLive(1, n)} />
      <Key
        rect={caps.loop}
        id="loop"
        pressed={st.pressed} depth={st.pressDepth}
        label={loopState === 'idle' ? 'Loop. Tap to record.' : loopState === 'playing' ? 'Loop playing. Tap to add a layer, double tap to stop, hold to undo a layer.' : loopState === 'ready' ? 'Loop stopped. Tap to play, hold to clear.' : loopState === 'recording' ? 'Recording. Tap to end the loop at the bar line.' : loopState === 'countdown' ? 'Counting in. Tap to cancel.' : 'Loop'}
        onPress={pressLoop}
        onLongPress={loopHold}
      />
      <Key
        rect={caps.tap}
        id="tap"
        pressed={st.pressed} depth={st.pressDepth}
        label="Tap tempo"
        onPressIn={(t) => {
          st.keys.value = { ...st.keys.value, tapAt: clock.now.value };
          tapTempo(t);
        }}
      />
      <Key rect={caps.play} id="play" pressed={st.pressed} depth={st.pressDepth} heavy label={playing ? 'Stop' : 'Play'} onPressIn={pressPlay} />
      <Key rect={caps.meter} id="meter" pressed={st.pressed} depth={st.pressDepth} label={`Meter, ${meterLabel(ts)}`} onPress={() => setSheet('meter')} />
      <Key rect={caps.set} id="set" pressed={st.pressed} depth={st.pressDepth} label="Setup" onPress={() => setSheet('settings')} />

      {/* beat lamps: tap to change the accent the lamp plays */}
      {lampLevels.map((level, i) => {
        if (level < 0 || tunerOn) return null;
        const [lx, ly] = LAMPS9[i];
        const o = ns.T('bay', lx - 9, ly - 12);
        const s = ns.sc('bay');
        return (
          <Pressable
            key={`hit${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Beat ${leadsOfMeter[i] + 1}, ${ACCENT_WORD[wheelAccents[leadsOfMeter[i]]]}. Tap to change.`}
            onPressIn={() => { press(); cycleBeat(leadsOfMeter[i]); }}
            hitSlop={2}
            style={{ position: 'absolute', left: o.x, top: o.y, width: (140 + 18) * s, height: (140 + 44) * s }}
          />
        );
      })}

      <LedPanel ns={ns} text={led.text} tone={led.tone} />
      <NavBar frame={navFrame} face={face} live={['dial', 'rhythm', 'pulse', 'pendulum', 'pro', 'beatline']} onFace={chooseFace} />

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      <TempoSheet open={sheet === 'tempo'} onClose={() => setSheet(null)} bpm={bpm} onSet={(v) => setBpm(v, 'keypad')} light={face === 'pulse' ? light : undefined} onLight={face === 'pulse' ? (p) => { setLight(p); if (!playing) setDemo((d) => d + 1); } : undefined} />
      <MeterSheet open={sheet === 'meter'} onClose={() => setSheet(null)} config={config} update={update} />
      <SoundSheet open={sheet === 'sound'} onClose={() => setSheet(null)} config={config} update={update} preview={previewSound} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} config={config} update={update} loopLayers={layers} onMuteLayer={muteLayer} onDeleteLayer={deleteLayer} loopBars={lp.current.bars} face={face} onGuide={(g) => { setSheet(null); setTimeout(() => setGuide(g), 250); }} trainer={trainer} onTrainer={setTrainer} light={face === 'pulse' || face === 'pro' || face === 'beatline' ? light : undefined} onLight={setLight} />
      <Guide id={guide} onDone={closeGuide} />
      <FaceSheet
        open={sheet === 'face'}
        onClose={() => setSheet(null)}
        face={face}
        light={light}
        onLight={(p) => {
          setLight(p);
          if (!playing && face === 'pulse') setDemo((d) => d + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0B09' },
  flash: { backgroundColor: '#FFB86A' },
});
