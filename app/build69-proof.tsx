import { useMemo } from 'react';
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

const noop = () => undefined;
const FACE = 520;

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? 'pulse';
}

/**
 * Large captures of the transplanted Build 69 rooms.
 * Source and production are the same component. Source is the phone frame.
 * Production is that component fitted to the circular dial viewport.
 * Pro SafeDial and BeatlineSpotlight are Skia. If this web host has no
 * CanvasKit, those two panels are NATIVE CAPTURE REQUIRED.
 */
export default function Build69ProofScreen() {
  const params = useLocalSearchParams<{ face?: string; side?: string }>();
  const face = one(params.face);
  const side = one(params.side) === 'source' ? 'source' : 'production';
  const pulse = useSharedValue(0.35);
  const pulseRole = useSharedValue(1);
  const pulseAccent = useSharedValue(2);
  const pulseBeat = useSharedValue(0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const room = useMemo<ClassicInstrumentProps>(
    () => ({
      config: { ...DEFAULT_CONFIG, bpm: 120, timeSignature: '4/4', subdivision: 'quarter' },
      prefs: DEFAULT_DISPLAY_PREFS,
      compact: false,
      playing: true,
      transport: { beatIndex: 0, measureIndex: 0, silentMeasure: false, playing: true, isDownbeat: true },
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
    [pulse, pulseAccent, pulseBeat, pulseBeatHost, pulseHostOffset, pulseRole, pulseSpb]
  );
  const viewport = side === 'production' ? FACE : undefined;
  const frame = side === 'production' ? FACE : 390;
  const skia = face === 'pro' || face === 'beatline';
  let body = null;
  if (face === 'pulse') body = <PulseRoom {...room} viewport={viewport} />;
  else if (face === 'pendulum') body = <SmartPendulumRoom {...room} viewport={viewport} />;
  else if (face === 'pro') body = <ProRoom {...room} viewport={viewport} />;
  else if (face === 'beatline') body = <BeatlineRoom {...room} viewport={viewport} />;
  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>{side === 'source' ? 'BUILD 69 SOURCE' : 'CURRENT TRANSPLANTED PRODUCTION'}</Text>
      <Text style={styles.title}>{face.toUpperCase()}</Text>
      {skia ? <Text style={styles.native}>Skia face. NATIVE CAPTURE REQUIRED if this web view has no CanvasKit.</Text> : null}
      <View style={[styles.frame, { width: frame, height: side === 'production' ? FACE : 720 }]}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07080B', alignItems: 'center', paddingTop: 24 },
  kicker: { color: '#E7D7B8', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  title: { color: '#F4F1EA', fontSize: 22, marginTop: 6, marginBottom: 12, fontWeight: '700' },
  native: { color: '#E7D7B8', fontSize: 12, marginBottom: 8, textAlign: 'center', paddingHorizontal: 24 },
  frame: { backgroundColor: '#050607', overflow: 'hidden', borderRadius: 28 },
});
