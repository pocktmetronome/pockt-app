import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineRoom } from '@/components/classic/BeatlineRoom';
import { ClassicDialBeats } from '@/components/classic/ClassicDialBeats';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { DialWheel } from '@/components/classic/DialRoom';
import { HorizontalTempoWheel } from '@/components/classic/HorizontalTempoWheel';
import { ProRoom } from '@/components/classic/ProRoom';
import { PulseRoom } from '@/components/classic/PulseRoom';
import { SmartPendulumRoom } from '@/components/classic/SmartPendulumRoom';
import { VinylTunerFace } from '@/components/classic/faces/VinylTunerFace';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_CONFIG } from '@/constants/timing';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';
import type { TunerReading } from '@/lib/tuner-math';

const noop = () => undefined;

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

function reading(cents: number, state: TunerReading['state']): TunerReading {
  return { frequency: 440, midi: 69, note: 'A', octave: 4, cents, state, confidence: 0.9 };
}

export default function Build141ProofScreen() {
  const params = useLocalSearchParams<{ shot?: string }>();
  const shot = one(params.shot, 'beats-2');
  const meter: TimeSignatureId = shot.includes('12') ? '12/8' : shot.includes('7') ? '7/8' : '4/4';
  const playing = shot.includes('wave') || shot.includes('pro') || shot.includes('beatline');
  const pulse = useSharedValue(playing ? 0.55 : 0);
  const pulseRole = useSharedValue(1);
  const pulseAccent = useSharedValue(2);
  const pulseBeat = useSharedValue(0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const follow = useSharedValue(0.8);
  const room = useMemo<ClassicInstrumentProps>(
    () => ({
      config: { ...DEFAULT_CONFIG, bpm: 120, timeSignature: meter, subdivision: 'quarter' },
      prefs: { ...DEFAULT_DISPLAY_PREFS, proView: shot.includes('pendulum-action') ? 'pendulum' : 'all' },
      compact: false,
      playing,
      transport: { beatIndex: 0, measureIndex: 0, silentMeasure: false, playing, isDownbeat: true },
      pulse,
      pulseRole,
      pulseAccent,
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
    }),
    [meter, playing, pulse, pulseAccent, pulseBeat, pulseBeatHost, pulseHostOffset, pulseRole, pulseSpb, shot]
  );
  const level: AccentLevel = shot.endsWith('-0') ? 'mute' : shot.endsWith('-1') ? 'soft' : shot.endsWith('-3') ? 'strong' : 'normal';
  const wide = shot.startsWith('pro') || shot.startsWith('beatline') || shot.startsWith('wheel');
  let body = null;
  if (shot.startsWith('beats') || shot.startsWith('shutter')) {
    body = (
      <View style={{ width: 360, height: 78 }}>
        <ClassicDialBeats
          timeSignature="4/4"
          beatIndex={1}
          playing={shot.startsWith('beats')}
          accentPattern={[level, level, level, level]}
          width={360}
          initiallyOpen={!shot.includes('closed')}
          onChange={noop}
        />
      </View>
    );
  } else if (shot.startsWith('rhythm')) {
    body = (
      <DialWheel
        bpm={120}
        playing={false}
        size={340}
        beats={4}
        beatIndex={0}
        pulse={pulse}
        pulseBeat={pulseBeat}
        invert={false}
        onBpm={noop}
        onToggle={noop}
        uiClick={false}
        followRadians={follow}
      />
    );
  } else if (shot.startsWith('pulse')) {
    body = <PulseRoom {...room} viewport={340} proofWaves={shot.includes('wave')} />;
  } else if (shot.startsWith('pendulum')) {
    const degrees = shot.includes('left') ? -32 : shot.includes('right') ? 32 : 0;
    body = <SmartPendulumRoom {...room} viewport={340} proofDegrees={degrees} />;
  } else if (shot.startsWith('pro')) {
    body = <ProRoom {...room} frame={{ width: 360, height: 460 }} />;
  } else if (shot.startsWith('beatline')) {
    body = <BeatlineRoom {...room} frame={{ width: 360, height: 460 }} />;
  } else if (shot.startsWith('wheel')) {
    body = <HorizontalTempoWheel bpm={120} width={340} onChange={noop} />;
  } else if (shot.startsWith('tuner')) {
    const cents = shot.includes('flat') ? -24 : shot.includes('sharp') ? 24 : 0;
    const state = shot.includes('flat') ? 'flat' : shot.includes('sharp') ? 'sharp' : 'in-tune';
    body = (
      <VinylTunerFace
        size={340}
        reading={reading(cents, state)}
        phase="listening"
        buffers={4}
        trailCents={shot.includes('trail') ? [-28, -16, -6, 4, 14] : [cents]}
      />
    );
  }
  return (
    <View style={styles.page}>
      <Text style={styles.title}>{shot}</Text>
      <View style={[styles.frame, wide ? styles.wide : shot.startsWith('beats') || shot.startsWith('shutter') || shot.startsWith('wheel') ? styles.strip : styles.circle]}>
        {body}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#050607', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F4F1EA', fontSize: 14, marginBottom: 10, fontWeight: '700' },
  frame: { backgroundColor: '#07080B', alignItems: 'center', justifyContent: 'center' },
  circle: { width: 340, height: 340, borderRadius: 170, overflow: 'hidden' },
  wide: { width: 380, height: 500, borderRadius: 12, overflow: 'hidden' },
  strip: { width: 380, height: 120, overflow: 'hidden' },
});
