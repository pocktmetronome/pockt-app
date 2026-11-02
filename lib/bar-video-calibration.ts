/**
 * Perceptual cue table for whiskey-bar-living-v2.mp4
 * 4.000s / 1080×1920 / 24 fps / 96 frames.
 *
 * These are not the old 0.5 / 1.5 / 2.5 / 3.5 guesses.
 * Each cue is the visual event that should coincide with a primary click.
 *
 * Temporary labeled frame sheets live in scripts/bar-calibration-frames/
 * and must never be packaged.
 */

export const BAR_SOURCE_FPS = 24;
export const BAR_SOURCE_FRAMES = 96;
export const BAR_SOURCE_LOOP_SECONDS = 4;

export type BarCueId = 'denim' | 'bartender' | 'red-dress' | 'blonde';

export type BarCue = {
  id: BarCueId;
  beat: 1 | 2 | 3 | 4;
  frame: number;
  sourceSeconds: number;
  event: string;
  why: string;
};

/** Canonical even musical positions after beat-quantized remapping. */
export const BAR_CANONICAL_CUES = [0.5, 1.5, 2.5, 3.5] as const;

/**
 * Selected source frames from the 96-frame v2 plate.
 * Frame N displays at N/24 seconds (0-based).
 */
export const BAR_SOURCE_CUES: readonly BarCue[] = [
  {
    id: 'denim',
    beat: 1,
    frame: 21,
    sourceSeconds: 21 / 24,
    event: 'downward table/coaster contact',
    why: 'Hand is mid-lift at 0.500. Visible return/contact is frames 20–21. Beat 1 uses contact, not the top of the lift.',
  },
  {
    id: 'bartender',
    beat: 2,
    frame: 37,
    sourceSeconds: 37 / 24,
    event: 'decisive shaker stroke / direction reversal',
    why: 'Strongest stroke/blur is 1.458–1.583. Frame 37 is the readable accent inside that window.',
  },
  {
    id: 'red-dress',
    beat: 3,
    frame: 76,
    sourceSeconds: 76 / 24,
    event: 'visible return / table contact',
    why: '2.500 is not contact. Motion continues; return/contact is 3.125–3.208. Frame 76 is the contact accent.',
  },
  {
    id: 'blonde',
    beat: 4,
    frame: 90,
    sourceSeconds: 90 / 24,
    event: 'right-most spoon tangent',
    why: 'Stir has no impact. The right-most spoon tangent is a repeatable angular landmark on every loop.',
  },
] as const;

export function barCueFrameToSeconds(frame: number, fps = BAR_SOURCE_FPS): number {
  return frame / fps;
}

export function barCueSecondsToFrame(seconds: number, fps = BAR_SOURCE_FPS): number {
  return Math.round(seconds * fps);
}

export function barSourceCueTime(beatIndex: number): number {
  const beat = ((Math.round(beatIndex) % 4) + 4) % 4;
  return BAR_SOURCE_CUES[beat]?.sourceSeconds ?? BAR_SOURCE_CUES[0].sourceSeconds;
}

export function barCanonicalCueTime(beatIndex: number): number {
  const beat = ((Math.round(beatIndex) % 4) + 4) % 4;
  return BAR_CANONICAL_CUES[beat] ?? BAR_CANONICAL_CUES[0];
}

/** Piecewise source span that plays during one musical beat at 60 BPM. */
export function barSourceSegment(fromBeat: number): { from: number; to: number; sourceDelta: number } {
  const a = barSourceCueTime(fromBeat);
  const rawTo = barSourceCueTime(fromBeat + 1);
  const to = rawTo > a ? rawTo : rawTo + BAR_SOURCE_LOOP_SECONDS;
  return { from: a, to: rawTo, sourceDelta: to - a };
}

/**
 * Map a 60 BPM musical timeline (Beat 1 at 0.500) onto v2 source time.
 * Used when the packaged plate is not yet beat-quantized.
 */
export function barMusicalToSource(musicalSeconds: number, loop = BAR_SOURCE_LOOP_SECONDS): number {
  if (!Number.isFinite(musicalSeconds) || loop <= 0) return BAR_SOURCE_CUES[0].sourceSeconds;
  const musical = ((musicalSeconds % loop) + loop) % loop;
  for (let i = 0; i < 4; i += 1) {
    const start = BAR_CANONICAL_CUES[i];
    const nextCanon = i === 3 ? BAR_CANONICAL_CUES[0] + loop : BAR_CANONICAL_CUES[i + 1];
    const sourceStart = BAR_SOURCE_CUES[i].sourceSeconds;
    const nextSourceRaw = BAR_SOURCE_CUES[(i + 1) % 4].sourceSeconds;
    const sourceEnd = nextSourceRaw > sourceStart ? nextSourceRaw : nextSourceRaw + loop;
    const span = nextCanon - start;
    let local = musical - start;
    if (i === 3 && musical < BAR_CANONICAL_CUES[0]) local = musical + loop - start;
    if (local < 0 || local > span + 1e-9) continue;
    const t = span <= 0 ? 0 : Math.min(1, Math.max(0, local / span));
    const mapped = sourceStart + (sourceEnd - sourceStart) * t;
    return ((mapped % loop) + loop) % loop;
  }
  return BAR_SOURCE_CUES[0].sourceSeconds;
}

export function barSourceToMusical(sourceSeconds: number, loop = BAR_SOURCE_LOOP_SECONDS): number {
  if (!Number.isFinite(sourceSeconds) || loop <= 0) return BAR_CANONICAL_CUES[0];
  const source = ((sourceSeconds % loop) + loop) % loop;
  for (let i = 0; i < 4; i += 1) {
    const sourceStart = BAR_SOURCE_CUES[i].sourceSeconds;
    const nextSourceRaw = BAR_SOURCE_CUES[(i + 1) % 4].sourceSeconds;
    const sourceEnd = nextSourceRaw > sourceStart ? nextSourceRaw : nextSourceRaw + loop;
    const start = BAR_CANONICAL_CUES[i];
    const nextCanon = i === 3 ? BAR_CANONICAL_CUES[0] + loop : BAR_CANONICAL_CUES[i + 1];
    let local = source - sourceStart;
    if (i === 3 && source < BAR_SOURCE_CUES[0].sourceSeconds) local = source + loop - sourceStart;
    if (local < 0 || local > sourceEnd - sourceStart + 1e-9) continue;
    const t = sourceEnd === sourceStart ? 0 : Math.min(1, Math.max(0, local / (sourceEnd - sourceStart)));
    const mapped = start + (nextCanon - start) * t;
    return ((mapped % loop) + loop) % loop;
  }
  return BAR_CANONICAL_CUES[0];
}

export function barCalibrationTable(): string {
  return BAR_SOURCE_CUES.map(
    (cue) =>
      `Beat ${cue.beat} ${cue.id}: frame ${cue.frame} / ${cue.sourceSeconds.toFixed(3)}s — ${cue.event}`
  ).join('\n');
}
