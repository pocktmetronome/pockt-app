/** Shared interaction math for the native instrument. Swift PocktEncoder mirrors these constants. */

export const TEMPO_MIN = 20;
export const TEMPO_MAX = 400;
export const NORTH_STAR_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400] as const;
export const MARK_START_DEG = -135;
export const MARK_STEP_DEG = 27;

export function clampTempo(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(value)));
}

export function wrapPi(delta: number): number {
  if (!Number.isFinite(delta)) return 0;
  let next = delta;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

/** Degrees of bezel rotation per 1 BPM. Slow below 180°/s, fast at 360°/s. */
export function degreesPerBpm(speedDegPerSec: number): number {
  const speed = Math.abs(speedDegPerSec);
  if (speed <= 180) return 3;
  if (speed >= 360) return 1.5;
  const t = (speed - 180) / 180;
  return 3 + t * (1.5 - 3);
}

export function angleFromNorthStarBpm(bpm: number): number {
  const safe = clampTempo(bpm);
  const marks = NORTH_STAR_MARKS;
  for (let i = 0; i < marks.length - 1; i += 1) {
    const left = marks[i];
    const right = marks[i + 1];
    if (safe <= right || i === marks.length - 2) {
      const span = right - left;
      const t = span <= 0 ? 0 : (Math.min(safe, right) - left) / span;
      const deg = MARK_START_DEG + (i + t) * MARK_STEP_DEG;
      return (deg * Math.PI) / 180;
    }
  }
  return (MARK_START_DEG * Math.PI) / 180;
}

export type EncoderSample = {
  bpm: number;
  applied: boolean;
  hitMin: boolean;
  hitMax: boolean;
  gear: number;
};

/**
 * Relative encoder. A gesture that has not yet rotated 3° changes nothing.
 * `engaged` becomes true once that threshold is crossed and stays true until release.
 */
export function stepEncoder(input: {
  bpm: number;
  deltaRadians: number;
  dtSeconds: number;
  engaged: boolean;
  pendingDegrees: number;
}): EncoderSample & { engaged: boolean; pendingDegrees: number } {
  const wrapped = wrapPi(input.deltaRadians);
  const degrees = (wrapped * 180) / Math.PI;
  const dt = input.dtSeconds > 0 ? input.dtSeconds : 1 / 120;
  const speed = Math.abs(degrees) / dt;
  const gear = degreesPerBpm(speed);
  let pending = input.pendingDegrees + degrees;
  let engaged = input.engaged;
  if (!engaged) {
    if (Math.abs(pending) < 3) {
      return { bpm: clampTempo(input.bpm), applied: false, hitMin: false, hitMax: false, gear, engaged, pendingDegrees: pending };
    }
    engaged = true;
  }
  const nextRaw = input.bpm + pending / gear;
  const next = clampTempo(nextRaw);
  const hitMin = nextRaw < TEMPO_MIN;
  const hitMax = nextRaw > TEMPO_MAX;
  if (hitMin || hitMax) pending = 0;
  else pending -= (next - input.bpm) * gear;
  return {
    bpm: next,
    applied: next !== clampTempo(input.bpm),
    hitMin,
    hitMax,
    gear,
    engaged,
    pendingDegrees: pending,
  };
}

export function acceptTempoProposal(latest: number, seq: number, bpm: number): { latest: number; bpm: number } | null {
  if (!Number.isFinite(seq) || seq < latest) return null;
  return { latest: seq, bpm: clampTempo(bpm) };
}

export type BeatSchedule = { generation: number; playing: boolean; pending: number[] };

export function acceptBeat(
  state: BeatSchedule,
  event: { generation: number; id: number }
): BeatSchedule {
  if (!state.playing) return { ...state, pending: [] };
  if (event.generation !== state.generation) {
    return { generation: event.generation, playing: true, pending: [event.id] };
  }
  return { ...state, pending: state.pending.concat(event.id) };
}

export function stopBeats(state: BeatSchedule): BeatSchedule {
  return { ...state, playing: false, pending: [] };
}
