import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Asset } from 'expo-asset';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineFace } from '@/components/beatline/BeatlineFace';
import { PendulaClassicRoom } from '@/components/classic/PendulaClassicRoom';
import { PulseRoom } from '@/components/classic/PulseRoom';
import { BeatlineInstrumentFace } from '@/components/classic/faces/BeatlineInstrumentFace';
import { PendulumInstrumentFace } from '@/components/classic/faces/PendulumInstrumentFace';
import { ProInstrumentFace } from '@/components/classic/faces/ProInstrumentFace';
import { PulseInstrumentFace } from '@/components/classic/faces/PulseInstrumentFace';
import { VinylTunerFace } from '@/components/classic/faces/VinylTunerFace';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_CONFIG } from '@/constants/timing';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import { defaultAccentPattern } from '@/lib/accents';
import type { TunerReading } from '@/lib/tuner-math';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';
import { ProBeatCells as HistoricalProBeatCells } from '../forensic/recovered/HistoricalProBeatCells';

const noop = () => undefined;
const FACE = 360;
const TRAIL = [-22, -15, -8, -2, 4, 10, 3, 0];

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

function e3(cents: number): TunerReading {
  const state = Math.abs(cents) <= 2 ? 'in-tune' : cents < 0 ? 'flat' : 'sharp';
  return { frequency: 164.81, midi: 52, note: 'E', octave: 3, cents, state, confidence: 1 };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeBody}>{body}</Text>
    </View>
  );
}

export default function RestorationVisualGate() {
  const params = useLocalSearchParams();
  const shot = one(params.shot);
  const side = one(params.side);
  const state = one(params.state) || 'center';
  const [ready, setReady] = useState(false);
  const pulse = useSharedValue(shot === 'pro' && state === 'stopped44' ? 0 : 1);
  const pulseRole = useSharedValue(1);
  const pulseBeat = useSharedValue(state === 'active44' ? 2 : 0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const meter: TimeSignatureId = state === 'm78' ? '7/8' : state === 'm128' ? '12/8' : '4/4';
  const subdivision: SubdivisionId = meter === '4/4' ? 'quarter' : 'eighths';
  const accents = useMemo(() => defaultAccentPattern(meter), [meter]);
  const playing = state !== 'stopped44';
  const reading = useMemo(() => {
    if (shot !== 'tuner' || side !== 'current') return null;
    if (state === 'noinput' || state === 'decay' || state === 'historical') return null;
    if (state === 'trail') return e3(0);
    const cents = Number(state);
    return Number.isFinite(cents) ? e3(cents) : null;
  }, [shot, side, state]);

  useEffect(() => {
    void Asset.loadAsync(Object.values(BEATLINE_ASSETS)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (shot === 'pulse' && side === 'historical') {
      const arm = 250;
      const kick = (at: number, value: number) => {
        timers.push(setTimeout(() => { pulseBeat.value = value; }, at));
      };
      if (state === 'multi') {
        kick(arm, 1);
        kick(arm + 264, 2);
        kick(arm + 466, 3);
      } else {
        kick(arm, 1);
      }
      const elapsed = state === 'ignition' ? 30 : state === 'early' ? 110 : state === 'mid' ? 242 : 506;
      timers.push(setTimeout(() => setReady(true), arm + elapsed));
    } else if (shot === 'tuner' && state === 'decay') {
      timers.push(setTimeout(() => setReady(true), 1700));
    } else {
      timers.push(setTimeout(() => setReady(true), 480));
    }
    return () => { for (const timer of timers) clearTimeout(timer); };
  }, [pulseBeat, shot, side, state]);

  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      bpm: 120,
      timeSignature: meter,
      subdivision,
      accentPattern: accents,
    }),
    [accents, meter, subdivision]
  );
  const room: ClassicInstrumentProps = {
    config,
    prefs: DEFAULT_DISPLAY_PREFS,
    compact: false,
    playing,
    transport: { beatIndex: state === 'active44' ? 2 : 0, measureIndex: 0, silentMeasure: false, playing, isDownbeat: state !== 'active44' },
    pulse,
    pulseRole,
    pulseBeat,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset,
    tapFlash: 0,
    setBpm: noop,
    toggle: noop,
    stop: noop,
    tapTempo: noop,
    previewSound: noop,
    onOpenPad: noop,
    onOpenTime: noop,
    onOpenDivision: noop,
    onOpenSound: noop,
    onOpenAccents: noop,
    onOpenPractice: noop,
    onOpenPresets: noop,
    onOpenRhythm: noop,
    onOpenSettings: noop,
    onOpenSetlists: noop,
    onOpenStage: noop,
    onOpenLab: noop,
    onOpenDrum: noop,
    onChangeAccents: noop,
    onUpdate: noop,
    onDisplayPrefsChange: noop,
    onHapticToggle: noop,
    onFlashToggle: noop,
  };

  return (
    <SafeAreaProvider>
      <View style={styles.page} testID={ready ? 'gate-ready' : 'gate-waiting'}>
        {shot === 'rhythm' ? <RhythmGate /> : null}
        {shot === 'pulse' ? <PulseGate side={side} state={state} room={room} /> : null}
        {shot === 'pendulum' ? <PendulumGate side={side} state={state} room={room} /> : null}
        {shot === 'pro' ? <ProGate side={side} state={state} room={room} meter={meter} accents={accents} playing={playing} /> : null}
        {shot === 'beatline' ? <BeatlineGate side={side} state={state} room={room} meter={meter} subdivision={subdivision} accents={accents} playing={playing} /> : null}
        {shot === 'tuner' ? <TunerGate side={side} state={state} reading={reading} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

function RhythmGate() {
  return (
    <View style={styles.rhythmRow}>
      <Notice
        title="HISTORICAL SOURCE — NATIVE RENDER REQUIRED"
        body="93c6f86 DialRoom.tsx DialWheel / ringSector / BeatArc. No historical screenshot of this wheel was found in the repository, App Store 12.11.0 captures, gallery thumbnails, or forensic artifacts. The Skia wheel was not redrawn."
      />
      <Notice
        title="CURRENT PRODUCTION — NATIVE iOS CAPTURE REQUIRED"
        body="0539b0a components/classic/faces/RhythmInstrumentFace.tsx. Skia annulus. Expo web has no CanvasKit here. Not redrawn. This panel is not visual acceptance."
      />
    </View>
  );
}

function PulseGate({ side, state, room }: { side: string; state: string; room: ClassicInstrumentProps }) {
  const fronts =
    state === 'multi'
      ? [
          { progress: 0.15, strength: 1 },
          { progress: 0.48, strength: 0.7 },
          { progress: 0.78, strength: 0.45 },
        ]
      : [{ progress: state === 'ignition' ? 0.02 : state === 'early' ? 0.25 : state === 'mid' ? 0.5 : 0.85, strength: 1 }];
  return (
    <View style={styles.fill} testID="gate-body">
      <Text style={styles.tag}>{side === 'historical' ? 'HISTORICAL SOURCE' : 'CURRENT PRODUCTION'} · PULSE · {state}</Text>
      {side === 'historical' ? (
        <PulseRoom {...room} />
      ) : (
        <View style={styles.center}>
          <PulseInstrumentFace size={FACE} bpm={120} playing fronts={fronts} />
        </View>
      )}
    </View>
  );
}

function PendulumGate({ side, state, room }: { side: string; state: string; room: ClassicInstrumentProps }) {
  const preview = state === 'left' ? -26 : state === 'right' ? 26 : 0;
  return (
    <View style={styles.fill} testID="gate-body">
      <Text style={styles.tag}>{side === 'historical' ? 'HISTORICAL SOURCE' : 'CURRENT PRODUCTION'} · PENDULUM · {state}</Text>
      {side === 'historical' ? (
        <PendulaClassicRoom {...room} playing={false} />
      ) : (
        <View style={styles.center}>
          <PendulumInstrumentFace
            size={FACE}
            playing={false}
            bpm={120}
            pulse={room.pulse}
            previewAngle={preview}
            previewHeld={state !== 'center'}
          />
        </View>
      )}
    </View>
  );
}

function ProGate({
  side,
  state,
  room,
  meter,
  accents,
  playing,
}: {
  side: string;
  state: string;
  room: ClassicInstrumentProps;
  meter: TimeSignatureId;
  accents: AccentLevel[];
  playing: boolean;
}) {
  return (
    <View style={styles.fill} testID="gate-body">
      <Text style={styles.tag}>{side === 'historical' ? 'HISTORICAL SOURCE' : 'CURRENT PRODUCTION'} · PRO · {state}</Text>
      {side === 'historical' ? (
        <View style={styles.proCol}>
          <View style={styles.proCells}>
            <HistoricalProBeatCells
              beatIndex={state === 'active44' ? 2 : 0}
              playing={playing}
              silent={false}
              accentPattern={accents}
              timeSignature={meter}
              pulse={room.pulse}
              pulseRole={room.pulseRole}
              pulseBeat={room.pulseBeat}
              view="all"
              onChange={noop}
              accentColor={room.prefs.accentColor}
              secondaryColor={room.prefs.accentSecondaryColor}
              strongColor={room.prefs.accentStrongColor}
            />
          </View>
          <Text style={styles.noticeBody}>SafeDial and the rest of ProRoom are Skia/full-room. NATIVE RENDER REQUIRED. Cells above are HistoricalProBeatCells from 21469e5. Not redrawn.</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <ProInstrumentFace
            size={FACE}
            playing={playing}
            silent={false}
            beatIndex={state === 'active44' ? 2 : 0}
            bpm={120}
            timeSignature={meter}
            subdivision={meter === '4/4' ? 'quarter' : 'eighths'}
            accentPattern={accents}
            onChangeAccents={noop}
            pulse={room.pulse}
            pulseRole={room.pulseRole}
            pulseBeat={room.pulseBeat}
            previewPhase={playing ? 0.35 : 0}
          />
        </View>
      )}
    </View>
  );
}

function BeatlineGate({
  side,
  state,
  room,
  meter,
  subdivision,
  accents,
  playing,
}: {
  side: string;
  state: string;
  room: ClassicInstrumentProps;
  meter: TimeSignatureId;
  subdivision: SubdivisionId;
  accents: AccentLevel[];
  playing: boolean;
}) {
  return (
    <View style={styles.fill} testID="gate-body">
      <Text style={styles.tag}>{side === 'historical' ? 'HISTORICAL SOURCE' : 'CURRENT PRODUCTION'} · BEATLINE · {state}</Text>
      {side === 'historical' ? (
        <BeatlineFace
          config={room.config}
          playing={playing}
          silent={false}
          pulseBeat={room.pulseBeat}
          downbeatColor={room.prefs.accentColor}
          accentColor={room.prefs.accentSecondaryColor}
          visualIntensity={1}
          setBpm={noop}
          toggle={noop}
          tapTempo={noop}
          onChangeAccents={noop}
          onVolume={noop}
          onOpenRhythm={noop}
          onOpenSound={noop}
          onOpenSettings={noop}
          onOpenPad={noop}
          onGoHome={noop}
          onOpenTuner={noop}
          proofFrame={{ width: 390, height: 780 }}
        />
      ) : (
        <View style={styles.center}>
          <BeatlineInstrumentFace
            size={FACE}
            playing={playing}
            silent={false}
            beatIndex={state === 'active44' ? 2 : 0}
            timeSignature={meter}
            subdivision={subdivision}
            accentPattern={accents}
            onChangeAccents={noop}
            pulseBeat={room.pulseBeat}
          />
        </View>
      )}
    </View>
  );
}

function TunerGate({ side, state, reading }: { side: string; state: string; reading: TunerReading | null }) {
  const trail = state === 'trail' || state === 'decay' ? TRAIL : undefined;
  return (
    <View style={styles.fill} testID="gate-body">
      <Text style={styles.tag}>{side === 'historical' ? 'HISTORICAL SOURCE' : 'CURRENT PRODUCTION'} · TUNER · {state}</Text>
      {side === 'historical' ? (
        <View style={styles.fill}>
          <Text style={styles.noticeBody}>App Store/Screenshots 12.11.0/Final/04_Tuner.png. Chromatic TunerScreen capture. No historical vinyl trail exists. Not redrawn. That capture is excluded from the device archive.</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <VinylTunerFace
            size={FACE}
            phase={state === 'noinput' || state === 'decay' ? 'listening' : 'listening'}
            reading={reading}
            buffers={0}
            trailCents={trail}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07080B' },
  fill: { flex: 1, backgroundColor: '#07080B' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tag: {
    position: 'absolute',
    zIndex: 4,
    top: 8,
    left: 8,
    right: 8,
    color: '#E7D7B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  rhythmRow: { flex: 1, flexDirection: 'row' },
  notice: { flex: 1, justifyContent: 'center', padding: 28, borderRightWidth: 1, borderRightColor: '#2A2418' },
  noticeTitle: { color: '#F4FFFD', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  noticeBody: { color: '#E7D7B8', fontSize: 16, lineHeight: 24, padding: 12 },
  proCol: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  proCells: { width: 340, alignSelf: 'center' },
  tunerShot: { width: '100%', height: '78%' },
});
