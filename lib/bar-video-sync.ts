import {
  BAR_CANONICAL_CUES,
  BAR_SOURCE_CUES,
  BAR_SOURCE_LOOP_SECONDS,
  barCanonicalCueTime,
  barSourceCueTime,
} from '@/lib/bar-video-calibration';

/** Ambient plate is beat-neutral. Never stretch the living picture to BPM. */
export const BAR_VIDEO_BASE_BPM = 60;
export const BAR_VIDEO_BEATS = 4;
export const BAR_VIDEO_CYCLES_PER_LOOP = 1;
export const BAR_VIDEO_LOOP_SECONDS = BAR_SOURCE_LOOP_SECONDS;
export const BAR_VIDEO_CYCLE_SECONDS = BAR_VIDEO_LOOP_SECONDS;
export const BAR_VIDEO_DURATION_SECONDS = 4;
export const BAR_VIDEO_WIDTH = 1080;
export const BAR_VIDEO_HEIGHT = 1920;
export const BAR_VIDEO_FPS = 24;
export const BAR_VIDEO_FRAME_SECONDS = 1 / BAR_VIDEO_FPS;

/**
 * False: do not follow tempo with playbackRate.
 * v3 was quantized for BPM stretching and is rejected as the ambient plate.
 */
export const BAR_VIDEO_QUANTIZED = false;
export const BAR_VIDEO_FOLLOW_BPM = false;

export function barVideoRate(_bpm?: number): number {
  return 1;
}

export const BAR_VIDEO_MARKERS = BAR_VIDEO_QUANTIZED
  ? BAR_CANONICAL_CUES
  : ([
      BAR_SOURCE_CUES[0].sourceSeconds,
      BAR_SOURCE_CUES[1].sourceSeconds,
      BAR_SOURCE_CUES[2].sourceSeconds,
      BAR_SOURCE_CUES[3].sourceSeconds,
    ] as const);

export const BAR_VIDEO_BEAT1_OFFSET = BAR_VIDEO_MARKERS[0];

/** Ignore decoder jitter below this circular source-time delta. */
export const BAR_VIDEO_CORRECT_MIN = BAR_VIDEO_FRAME_SECONDS;
export const BAR_VIDEO_MATERIAL_DRIFT = 0.12;
export const BAR_VIDEO_SMOOTH_RATE_MIN = 0.5;
export const BAR_VIDEO_SMOOTH_RATE_MAX = 2;


export function barVideoSegmentRate(bpm: number, _beatIndex: number): number {
  return barVideoRate(bpm);
}

export function barVideoNeedsBeatSeek(_bpm: number): boolean {
  return false;
}

export function barVideoNeedsSegmentRate(_bpm: number): boolean {
  return false;
}

/** Source time of Beat 1 / DENIM contact. PLAY and rest seek here. */
export function barVideoPlayTime(): number {
  return BAR_VIDEO_BEAT1_OFFSET;
}

export function barVideoRestTime(): number {
  return BAR_VIDEO_BEAT1_OFFSET;
}

export function barVideoMarker(beatIndex: number): number {
  return BAR_VIDEO_QUANTIZED ? barCanonicalCueTime(beatIndex) : barSourceCueTime(beatIndex);
}

export function barVideoExpectedTime(beatIndex: number): number {
  return barVideoMarker(beatIndex);
}

export function barVideoBeat1Targets(): number[] {
  return [BAR_VIDEO_BEAT1_OFFSET];
}

export function barVideoFollowTime(musicalSeconds: number): number {
  const loop = BAR_VIDEO_LOOP_SECONDS;
  return ((musicalSeconds % loop) + loop) % loop;
}

/** Smallest signed delta on a looping timeline. */
export function barVideoWrappedDelta(
  actual: number,
  expected: number,
  loop = BAR_VIDEO_LOOP_SECONDS
): number {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || loop <= 0) return 0;
  const a = ((actual % loop) + loop) % loop;
  const e = ((expected % loop) + loop) % loop;
  let delta = a - e;
  if (delta > loop / 2) delta -= loop;
  if (delta < -loop / 2) delta += loop;
  return delta;
}

export function barVideoPhaseError(actual: number, expected: number): number {
  return Math.abs(barVideoWrappedDelta(actual, expected));
}

export function barVideoNearestBeat1(actual: number): { target: number; delta: number } {
  const target = BAR_VIDEO_BEAT1_OFFSET;
  return { target, delta: barVideoWrappedDelta(actual, target) };
}

export function barVideoCorrectedTime(actual: number, expected?: number): number | null {
  const target = expected ?? barVideoNearestBeat1(actual).target;
  const delta = barVideoWrappedDelta(actual, target);
  if (Math.abs(delta) < BAR_VIDEO_CORRECT_MIN) return null;
  return ((target % BAR_VIDEO_LOOP_SECONDS) + BAR_VIDEO_LOOP_SECONDS) % BAR_VIDEO_LOOP_SECONDS;
}

export function barVideoMaterialDrift(actual: number, expected: number): boolean {
  return barVideoPhaseError(actual, expected) >= BAR_VIDEO_MATERIAL_DRIFT;
}

export function barVideoSupportedSmoothRate(bpm: number): boolean {
  const rate = barVideoRate(bpm);
  return rate >= BAR_VIDEO_SMOOTH_RATE_MIN && rate <= BAR_VIDEO_SMOOTH_RATE_MAX;
}

export function barVideoDriftOverLoops(loopCount: number, frameError = 0): number {
  if (!Number.isFinite(loopCount) || loopCount <= 0) return 0;
  return Math.abs(frameError) * loopCount;
}
