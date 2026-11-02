import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Asset } from 'expo-asset';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineFace } from '@/components/beatline/BeatlineFace';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { P2 } from '@/constants/pockt-2';
import { DEFAULT_CONFIG } from '@/constants/timing';
import { defaultAccentPattern } from '@/lib/accents';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

const noop = () => undefined;

function num(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = Number(raw);
  return Number.isFinite(next) ? next : fallback;
}

function str(value: string | string[] | undefined, fallback: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length ? raw : fallback;
}

export default function BeatlineProofScreen() {
  const params = useLocalSearchParams();
  const width = Math.max(280, Math.round(num(params.w, 393)));
  const height = Math.max(500, Math.round(num(params.h, 852)));
  const bpm = num(params.bpm, 120);
  const meter = str(params.meter, '4/4') as TimeSignatureId;
  const subd = str(params.subd, meter.includes('8') ? 'eighths' : 'quarter') as SubdivisionId;
  const playing = str(params.playing, '0') === '1';
  const volume = Math.min(1, Math.max(0, num(params.vol, 80) / 100));
  const beat = Math.round(num(params.beat, playing ? 0 : -1));
  const press = str(params.press, '') as 'rhythm' | 'sound' | 'tap' | 'play' | 'settings' | '';
  const [ready, setReady] = useState(false);
  const pulseBeat = useSharedValue(beat);

  useEffect(() => {
    pulseBeat.value = beat;
  }, [beat, pulseBeat]);

  useEffect(() => {
    void Asset.loadAsync(Object.values(BEATLINE_ASSETS)).finally(() => setReady(true));
  }, []);

  const accents = useMemo<AccentLevel[]>(() => {
    const raw = str(params.strengths, '');
    if (!raw) return defaultAccentPattern(meter);
    return raw.split(',').map((part) => {
      const strength = Math.round(Number(part));
      if (strength <= 0) return 'mute';
      if (strength === 1) return 'soft';
      if (strength === 2) return 'normal';
      return 'strong';
    });
  }, [meter, params.strengths]);

  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      bpm,
      timeSignature: meter,
      subdivision: subd,
      volume,
      sound: 'wood' as const,
      accentPattern: accents,
    }),
    [accents, bpm, meter, subd, volume]
  );

  return (
    <SafeAreaProvider>
      <View style={styles.page} testID="beatline-proof-page">
        <View nativeID="beatline-proof-stage" testID="beatline-proof-stage" style={[styles.stage, { width, height }]}>
          {ready ? (
            <BeatlineFace
              config={config}
              playing={playing}
              silent={false}
              pulseBeat={playing && beat >= 0 ? pulseBeat : undefined}
              downbeatColor={DEFAULT_DISPLAY_PREFS.beatlineDownbeatColor}
              accentColor={DEFAULT_DISPLAY_PREFS.beatlineAccentColor}
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
              proofFrame={{ width, height }}
              proofPress={press || undefined}
            />
          ) : (
            <View style={[styles.stage, { width, height, backgroundColor: P2.field }]} />
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    overflow: 'hidden',
    backgroundColor: P2.field,
  },
});
