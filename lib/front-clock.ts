/**
 * One clock for every face, locked to the sound. The native engine stamps each beat with the host
 * time it is heard (eventHostTime + output presentation latency). On every display frame, on the UI
 * thread, the beat position is computed from that stamp and the frame's own host timestamp, so motion
 * is continuous between beats and crosses each beat exactly when the click comes out of the speaker.
 */
import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

export type BeatClockSource = {
  pulseBeat: SharedValue<number>;
  pulseBeatHost: SharedValue<number>;
  pulseSpb: SharedValue<number>;
  pulseCount: SharedValue<number>;
  pulseLatency: SharedValue<number>;
};

export type BeatClock = {
  /** Continuous beats since launch (count + fraction); -1 while stopped. */
  pos: SharedValue<number>;
  /** Continuous position within the bar: beatIndex + fraction; -1 while stopped. */
  barPos: SharedValue<number>;
  /** Host seconds of the current frame (for decays and flashes). */
  now: SharedValue<number>;
  /** Host seconds the last beat was heard. */
  lastBeatAt: SharedValue<number>;
  spb: SharedValue<number>;
};

export function useBeatClock(src: BeatClockSource, playing: boolean): BeatClock {
  const pos = useSharedValue(-1);
  const barPos = useSharedValue(-1);
  const now = useSharedValue(0);
  const lastBeatAt = useSharedValue(0);
  const spb = useSharedValue(0.5);
  const live = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    live.value = playing ? 1 : 0;
  }, [playing, live]);
  useFrameCallback((frame) => {
    'worklet';
    const t = frame.timestamp / 1000;
    now.value = t;
    const host = src.pulseBeatHost.value;
    const s = src.pulseSpb.value > 0 ? src.pulseSpb.value : 0.5;
    spb.value = s;
    if (live.value < 0.5 || !(host > 0)) {
      pos.value = -1;
      barPos.value = -1;
      return;
    }
    const heard = host + src.pulseLatency.value;
    lastBeatAt.value = heard;
    // between two beats the fraction runs 0 → 1; it may overshoot slightly if a beat is late to arrive
    const f = Math.max(-0.2, Math.min(1.15, (t - heard) / s));
    pos.value = src.pulseCount.value + f;
    barPos.value = src.pulseBeat.value + f;
  });
  return { pos, barPos, now, lastBeatAt, spb };
}
