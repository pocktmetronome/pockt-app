import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineRoom } from '@/components/classic/BeatlineRoom';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { ProRoom } from '@/components/classic/ProRoom';
import { PulseRoom } from '@/components/classic/PulseRoom';
import { SmartPendulumRoom } from '@/components/classic/SmartPendulumRoom';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_CONFIG } from '@/constants/timing';
import type { TimeSignatureId } from '@/lib/types';

const FACE = 360;
const noop = () => undefined;

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

/**
 * Web-faithful captures of the circular faces.
 * Rhythm sectors and the console dial are Skia/Metal.
 * Pendulum extremes need a live native phase.
 */
export default function FacePassProofScreen() {
  const params = useLocalSearchParams<{ shot?: string; meter?: string; playing?: string }>();
  const shot = one(params.shot, 'pulse-stopped');
  const meter = one(params.meter, '4/4') as TimeSignatureId;
  const playing = one(params.playing, shot.includes('active') || shot.includes('pro') || shot.includes('beat') ? '1' : '0') === '1';
  const pulse = useSharedValue(playing ? 0.4 : 0);
  const pulseRole = useSharedValue(1);
  const pulseAccent = useSharedValue(2);
  const pulseBeat = useSharedValue(0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const room = useMemo<ClassicInstrumentProps>(
    () => ({
      config: { ...DEFAULT_CONFIG, bpm: 120, timeSignature: meter, subdivision: 'quarter' },
      prefs: DEFAULT_DISPLAY_PREFS,
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
    [meter, playing, pulse, pulseAccent, pulseBeat, pulseBeatHost, pulseHostOffset, pulseRole, pulseSpb]
  );
  useEffect(() => {
    if (!shot.startsWith('pulse') || !playing) return;
    pulseRole.value = 2;
    pulseBeat.value = 0;
    pulseBeatHost.value = 1.2;
  }, [playing, pulseBeat, pulseBeatHost, pulseRole, shot]);
  const native =
    shot.startsWith('console') ||
    shot.startsWith('rhythm') ||
    shot.startsWith('pendulum-left') ||
    shot.startsWith('pendulum-right');
  let body = null;
  if (shot.startsWith('pulse')) body = <PulseRoom {...room} viewport={FACE} />;
  else if (shot.startsWith('pendulum')) body = <SmartPendulumRoom {...room} viewport={FACE} />;
  else if (shot.startsWith('pro')) body = <ProRoom {...room} viewport={FACE} />;
  else if (shot.startsWith('beatline')) body = <BeatlineRoom {...room} viewport={FACE} />;
  return (
    <View style={styles.page}>
      <Text style={styles.title}>{shot}</Text>
      {native ? <Text style={styles.native}>NATIVE DEVICE VALIDATION REQUIRED</Text> : null}
      <View testID="face-proof-ready" style={styles.frame}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#050607', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F4F1EA', fontSize: 16, marginBottom: 12, fontWeight: '700' },
  native: { color: '#E7C27A', fontSize: 13, marginBottom: 8 },
  frame: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    overflow: 'hidden',
    backgroundColor: '#07080B',
  },
});
