import { useEffect, useState, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { loadSkia } from '@/lib/load-skia';
import type { TunerReading } from '@/lib/tuner-math';

type Face = (props: {
  size: number;
  reading: TunerReading | null;
  phase: 'listening' | 'error';
  error?: string | null;
  trailCents?: number[];
  holdTrail?: boolean;
  spinDegrees?: number;
  trailSpin?: number[];
}) => ReactElement | null;

const SIZE = 340;

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

function note(cents: number, state: TunerReading['state'], name = 'E', octave = 3): TunerReading {
  return { frequency: 164.81, midi: 52, note: name as TunerReading['note'], octave, cents, state, confidence: 0.9 };
}

function scene(state: string): {
  reading: TunerReading | null;
  trail?: number[];
  spins?: number[];
  phase: 'listening' | 'error';
  spin?: number;
} {
  if (state === 'silent' || state === 'none') return { reading: null, phase: 'listening' };
  if (state === 'flat-strong') return { reading: note(-42, 'flat'), phase: 'listening' };
  if (state === 'flat-mild' || state === 'flat') return { reading: note(-12, 'flat'), phase: 'listening' };
  if (state === 'approach-flat') return { reading: note(-4.5, 'flat'), phase: 'listening' };
  if (state === 'near' || state === 'approach-sharp') return { reading: note(4.2, 'sharp', 'A', 4), phase: 'listening' };
  if (state === 'lock' || state === 'tune') return { reading: note(0, 'in-tune', 'E', 3), phase: 'listening' };
  if (state === 'sharp-mild') return { reading: note(12, 'sharp'), phase: 'listening' };
  if (state === 'sharp-strong') return { reading: note(42, 'sharp'), phase: 'listening' };
  if (state === 'lost') return { reading: null, trail: [-28, -14, -4, 6, 16], phase: 'listening' };
  if (state === 'error') return { reading: null, phase: 'error' };
  if (state === 'spin-a') return { reading: note(-18, 'flat'), phase: 'listening', spin: 20 };
  if (state === 'spin-b') return { reading: note(-18, 'flat'), phase: 'listening', spin: 150 };
  if (state === 'trace-a' || state === 'trace-b') {
    const nowSpin = state === 'trace-a' ? 30 : 120;
    return {
      reading: note(12, 'sharp', 'G', 3),
      trail: [-42, -24, -8, 12],
      spins: [-6, 8, 18, nowSpin],
      phase: 'listening',
      spin: nowSpin,
    };
  }
  return {
    reading: note(34, 'sharp', 'G', 3),
    trail: [-48, -36, -24, -12, 0, 10, 20, 34],
    spins: [-28, -20, -12, -4, 4, 10, 16, 22],
    phase: 'listening',
    spin: 22,
  };
}

export default function VinylTunerProofScreen() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state = one(params.state, 'lock');
  const [Face, setFace] = useState<Face | null>(Platform.OS === 'web' ? null : null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await loadSkia();
        const mod = await import('@/components/classic/faces/VinylTunerFace');
        if (live) setFace(() => mod.VinylTunerFace);
      } catch (err) {
        if (live) setFailed(err instanceof Error ? err.message : 'Skia did not load');
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const shot = scene(state);
  return (
    <View style={styles.page}>
      <Text style={styles.title} allowFontScaling={false}>
        {state}
      </Text>
      <View style={styles.circle} testID={Face ? 'vinyl-proof-ready' : 'vinyl-proof-loading'}>
        {failed ? (
          <Text style={styles.fail}>{failed}</Text>
        ) : Face ? (
          <Face
            size={SIZE}
            reading={shot.reading}
            phase={shot.phase}
            error={shot.phase === 'error' ? 'Microphone access is needed to tune.' : null}
            trailCents={shot.trail}
            holdTrail={Boolean(shot.trail)}
            spinDegrees={shot.spin}
            trailSpin={shot.spins}
          />
        ) : (
          <Text style={styles.fail}>LOADING</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#050607',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#E7D7B8',
    fontSize: 13,
    letterSpacing: 1.4,
    marginBottom: 12,
    fontWeight: '700',
  },
  circle: {
    width: SIZE,
    height: SIZE,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  fail: {
    color: '#E7D7B8',
    marginTop: 150,
    textAlign: 'center',
  },
});
