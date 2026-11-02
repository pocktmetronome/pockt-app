import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Asset } from 'expo-asset';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineFace } from '@/components/beatline/BeatlineFace';
import { DialRoom } from '@/components/classic/DialRoom';
import { PendulaClassicRoom } from '@/components/classic/PendulaClassicRoom';
import { PulseRoom } from '@/components/classic/PulseRoom';
import { BeatlineInstrumentFace } from '@/components/classic/faces/BeatlineInstrumentFace';
import { PendulumInstrumentFace } from '@/components/classic/faces/PendulumInstrumentFace';
import { ProInstrumentFace } from '@/components/classic/faces/ProInstrumentFace';
import { PulseInstrumentFace } from '@/components/classic/faces/PulseInstrumentFace';
import { RhythmInstrumentFace } from '@/components/classic/faces/RhythmInstrumentFace';
import { VinylTunerFace } from '@/components/classic/faces/VinylTunerFace';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_CONFIG } from '@/constants/timing';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import { defaultAccentPattern } from '@/lib/accents';
import { ProBeatCells as HistoricalProBeatCells } from '../forensic/recovered/HistoricalProBeatCells';

const noop = () => undefined;
const FACES = ['rhythm', 'pulse', 'pendulum', 'pro', 'beatline', 'tuner'] as const;
type FaceId = (typeof FACES)[number];

const CAPTION: Record<FaceId, string> = {
  rhythm: 'DialWheel annulus · 93c6f86 / ebaec60',
  pulse: 'PulseRoom WaveRing · ebaec60',
  pendulum: 'PendulaClassicRoom · ca6b267',
  pro: 'ProRoom + ProBeatCells · 21469e5',
  beatline: 'BeatlineFace 2.0 · 32b8c8e',
  tuner: 'TunerScreen capture · no vinyl trail in history',
};

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

function NativeOnly({ label }: { label: string }) {
  return (
    <View style={styles.nativeOnly}>
      <Text style={styles.nativeTitle}>NATIVE-ONLY / NO FAITHFUL WEB RENDER</Text>
      <Text style={styles.tunerNote}>{label}</Text>
    </View>
  );
}

class FaceBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <NativeOnly label={this.props.label} />;
    return this.props.children;
  }
}

function HistoricalFace({
  id,
  room,
  skia,
}: {
  id: FaceId;
  room: ClassicInstrumentProps;
  skia: 'wait' | 'ok' | 'no';
}) {
  if (id === 'rhythm') {
    if (skia !== 'ok') {
      return (
        <NativeOnly label="DialWheel draws ringSector beat arcs with Skia. This web harness has no CanvasKit wasm, and there is no historical screenshot of the segmented wheel. The wheel was not redrawn." />
      );
    }
    return (
      <FaceBoundary label="DialWheel threw while painting. The Skia wheel was not replaced with another drawing.">
        <DialRoom {...room} />
      </FaceBoundary>
    );
  }
  if (id === 'pulse') return <PulseRoom {...room} />;
  if (id === 'pendulum') return <PendulaClassicRoom {...room} />;
  if (id === 'pro') {
    return (
      <View style={styles.proRecovered}>
        <HistoricalProBeatCells
          beatIndex={0}
          playing
          silent={false}
          accentPattern={room.config.accentPattern}
          timeSignature="4/4"
          pulse={room.pulse}
          pulseRole={room.pulseRole}
          pulseBeat={room.pulseBeat}
          view="all"
          onChange={noop}
          accentColor={room.prefs.accentColor}
          secondaryColor={room.prefs.accentSecondaryColor}
          strongColor={room.prefs.accentStrongColor}
        />
        <NativeOnly label="The cells above are ProBeatCells from 21469e5. The rotary SafeDial under them is Skia and threw PictureRecorder without CanvasKit. That dial was not redrawn." />
      </View>
    );
  }
  if (id === 'beatline') {
    return (
      <BeatlineFace
        config={room.config}
        playing={room.playing}
        silent={false}
        pulseBeat={room.pulseBeat}
        downbeatColor={room.prefs.accentColor}
        accentColor={room.prefs.accentSecondaryColor}
        visualIntensity={1}
        setBpm={room.setBpm}
        toggle={room.toggle}
        tapTempo={room.tapTempo}
        onChangeAccents={room.onChangeAccents}
        onVolume={noop}
        onOpenRhythm={noop}
        onOpenSound={noop}
        onOpenSettings={noop}
        onOpenPad={noop}
        onGoHome={noop}
        onOpenTuner={noop}
        proofFrame={{ width: 360, height: 640 }}
      />
    );
  }
  return (
    <View style={styles.tunerEvidence}>
      <Text style={styles.tunerNote}>HISTORICAL SCREENSHOT. TunerScreen is chromatic/headstock. No pitch-history trail source exists. The App Store capture is not in the device archive.</Text>
    </View>
  );
}

function CurrentFace({ id, room }: { id: FaceId; room: ClassicInstrumentProps }) {
  const size = 280;
  const accents = room.config.accentPattern;
  if (id === 'rhythm') {
    return (
      <RhythmInstrumentFace
        size={size}
        beats={4}
        timeSignature="4/4"
        accentPattern={accents}
        beatIndex={0}
        playing
        pulse={room.pulse}
        pulseBeat={room.pulseBeat}
      />
    );
  }
  if (id === 'pulse') {
    return <PulseInstrumentFace size={size} bpm={120} playing fronts={[{ progress: 0.5, strength: 0.75 }]} />;
  }
  if (id === 'pendulum') {
    return (
      <PendulumInstrumentFace
        size={size}
        playing
        bpm={120}
        pulse={room.pulse}
        pulseBeat={room.pulseBeat}
        pulseBeatHost={room.pulseBeatHost}
        pulseSpb={room.pulseSpb}
        pulseHostOffset={room.pulseHostOffset}
      />
    );
  }
  if (id === 'pro') {
    return (
      <ProInstrumentFace
        size={size}
        playing
        silent={false}
        beatIndex={0}
        bpm={120}
        timeSignature="4/4"
        subdivision="quarter"
        accentPattern={accents}
        onChangeAccents={noop}
        pulse={room.pulse}
        pulseRole={room.pulseRole}
        pulseBeat={room.pulseBeat}
        pulseBeatHost={room.pulseBeatHost}
        pulseSpb={room.pulseSpb}
        pulseHostOffset={room.pulseHostOffset}
      />
    );
  }
  if (id === 'beatline') {
    return (
      <BeatlineInstrumentFace
        size={size}
        playing
        silent={false}
        beatIndex={0}
        timeSignature="4/4"
        subdivision="quarter"
        accentPattern={accents}
        onChangeAccents={noop}
        pulseBeat={room.pulseBeat}
      />
    );
  }
  return (
    <VinylTunerFace
      size={size}
      phase="listening"
      reading={{ frequency: 440, midi: 69, note: 'A', octave: 4, cents: 0, state: 'in-tune', confidence: 1 }}
      trailCents={[-18, -8, 0]}
    />
  );
}

export default function ForensicHistoricalScreen() {
  const params = useLocalSearchParams();
  const mode = one(params.face);
  const [ready, setReady] = useState(false);
  const skia = 'no' as const;
  const pulse = useSharedValue(0.72);
  const pulseRole = useSharedValue(1);
  const pulseBeat = useSharedValue(0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const accents = useMemo(() => defaultAccentPattern('4/4'), []);
  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      bpm: 120,
      timeSignature: '4/4' as const,
      subdivision: 'quarter' as const,
      accentPattern: accents,
    }),
    [accents]
  );
  const room: ClassicInstrumentProps = {
    config,
    prefs: DEFAULT_DISPLAY_PREFS,
    compact: false,
    playing: true,
    transport: { beatIndex: 0, measureIndex: 0, silentMeasure: false, playing: true, isDownbeat: true },
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

  useEffect(() => {
    void Asset.loadAsync(Object.values(BEATLINE_ASSETS)).catch(() => undefined);
    const kick = setTimeout(() => {
      pulseBeat.value = 1;
    }, 900);
    const mark = setTimeout(() => setReady(true), 1050);
    return () => {
      clearTimeout(kick);
      clearTimeout(mark);
    };
  }, [pulseBeat]);

  const single = FACES.find((id) => id === mode) ?? null;
  const sheet = mode === 'sheet';
  const compare = mode === 'compare';

  return (
    <SafeAreaProvider>
      <View style={styles.page} testID={ready ? 'forensic-ready' : 'forensic-waiting'}>
        {single ? (
          <View style={styles.single}>
            <Text style={styles.caption}>{CAPTION[single]}</Text>
            <View style={styles.singleBody}>
              <HistoricalFace id={single} room={room} skia={skia} />
            </View>
          </View>
        ) : null}
        {sheet ? (
          <View style={styles.grid}>
            {FACES.map((id) => (
              <View key={id} style={styles.cell}>
                <Text style={styles.caption}>{id.toUpperCase()}</Text>
                <Text style={styles.sub}>{CAPTION[id]}</Text>
                <View style={styles.cellBody}>
                  <HistoricalFace id={id} room={room} skia={skia} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {compare ? (
          <View style={styles.compare}>
            {FACES.map((id) => (
              <View key={id} style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.caption}>HISTORICAL · {id.toUpperCase()}</Text>
                  <Text style={styles.sub}>{CAPTION[id]}</Text>
                  <View style={styles.compareBody}>
                    <HistoricalFace id={id} room={room} skia={skia} />
                  </View>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.caption}>CURRENT · {id.toUpperCase()}</Text>
                  <View style={styles.currentBody}>
                    <CurrentFace id={id} room={room} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07080B' },
  single: { flex: 1 },
  singleBody: { flex: 1 },
  caption: { color: '#E7D7B8', fontSize: 12, letterSpacing: 1.2, paddingHorizontal: 12, paddingTop: 8, fontWeight: '700' },
  sub: { color: '#9AA4AE', fontSize: 11, paddingHorizontal: 12, paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 1100 },
  cell: { width: 540, height: 760, borderWidth: 1, borderColor: '#2A2418', overflow: 'hidden' },
  cellBody: { flex: 1, overflow: 'hidden' },
  compare: { width: 1100 },
  compareRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A2418' },
  compareCol: { width: 540, height: 760, overflow: 'hidden' },
  compareBody: { flex: 1, overflow: 'hidden' },
  currentBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tunerEvidence: { flex: 1, backgroundColor: '#07080B' },
  tunerShot: { width: '100%', height: '86%' },
  tunerNote: { color: '#E7D7B8', fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
  proRecovered: { flex: 1, backgroundColor: '#05070A', paddingTop: 24 },
  nativeOnly: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#07080B' },
  nativeTitle: { color: '#F4FFFD', fontSize: 18, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
});
