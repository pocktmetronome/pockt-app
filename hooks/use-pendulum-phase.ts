import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  pendulumAbsoluteAngle,
  pendulumAngleAtHost,
  pendulumDisplayToHostSeconds,
  pendulumMusicalPosition,
  pendulumSecondsPerBeat,
} from '@/lib/pendulum-absolute';
import { swingAmplitude } from '@/lib/pendulum-motion';
import PocktTiming from '@/modules/pockt-timing';

/**
 * Replacement pendulum renderer.
 * Frame callback only samples native (beat index, host time, seconds/beat)
 * and evaluates the absolute angle. It never increments musical phase,
 * never re-anchors to display now, and never emits audio/haptic.
 */
export function usePendulumPhase(
  playing: boolean,
  bpm: number,
  _pulse?: SharedValue<number>,
  amplitudeDeg?: number,
  _centerOrigin = false,
  pulseBeat?: SharedValue<number>,
  held?: SharedValue<number>,
  _mode?: SharedValue<number>,
  _seedElapsed?: SharedValue<number>,
  _phaseOffset?: SharedValue<number>,
  pulseBeatHost?: SharedValue<number>,
  pulseSpb?: SharedValue<number>,
  pulseHostOffset?: SharedValue<number>
): SharedValue<number> {
  const angle = useSharedValue(0);
  const playingSv = useSharedValue(playing ? 1 : 0);
  const ampSv = useSharedValue(amplitudeDeg ?? swingAmplitude(bpm));
  const fallbackHeld = useSharedValue(0);
  const heldSv = held ?? fallbackHeld;
  const fallbackBeat = useSharedValue(0);
  const fallbackHost = useSharedValue(0);
  const fallbackSpb = useSharedValue(pendulumSecondsPerBeat(bpm));
  const fallbackOffset = useSharedValue(0);
  const beatSv = pulseBeat ?? fallbackBeat;
  const hostSv = pulseBeatHost ?? fallbackHost;
  const spbSv = pulseSpb ?? fallbackSpb;
  const offsetSv = pulseHostOffset ?? fallbackOffset;

  useEffect(() => {
    ampSv.value = amplitudeDeg ?? swingAmplitude(bpm);
    playingSv.value = playing ? 1 : 0;
    if (!pulseSpb) fallbackSpb.value = pendulumSecondsPerBeat(bpm);
    if (!playing) {
      angle.value = 0;
      return;
    }
    const host = hostSv.value;
    if (!(host > 0)) {
      angle.value = 0;
      return;
    }
    const now = PocktTiming?.visualHostSeconds?.();
    if (typeof now === 'number' && now > 0) {
      const next = pendulumAngleAtHost({
        beatIndex: beatSv.value,
        beatHostSeconds: host,
        nowHostSeconds: now,
        secondsPerBeat: spbSv.value,
        amplitude: ampSv.value,
      });
      angle.value = Number.isFinite(next) ? next : 0;
    }
  }, [amplitudeDeg, ampSv, angle, beatSv, bpm, fallbackSpb, hostSv, playing, playingSv, pulseSpb, spbSv]);

  useFrameCallback((frame) => {
    if (heldSv.value > 0.5) return;
    if (playingSv.value < 0.5) {
      angle.value = 0;
      return;
    }
    const host = hostSv.value;
    if (!(host > 0)) {
      angle.value = 0;
      return;
    }
    const nowHost = pendulumDisplayToHostSeconds(frame.timestamp, offsetSv.value);
    const p = pendulumMusicalPosition(beatSv.value, host, nowHost, spbSv.value);
    const next = pendulumAbsoluteAngle(p, ampSv.value);
    angle.value = Number.isFinite(next) ? next : 0;
  });

  return angle;
}
