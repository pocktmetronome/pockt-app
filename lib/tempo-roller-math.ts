import { RIG_MAX_BPM, RIG_MIN_BPM } from '@/constants/timing';

export const ROLLER_PX_PER_BPM = 14;
export const ROLLER_MAJOR_EVERY = 10;
export const ROLLER_MID_EVERY = 5;

export function rollerMarkX(mark: number, liveBpm: number, wellWidth: number, pxPerBpm = ROLLER_PX_PER_BPM): number {
  return wellWidth / 2 + (mark - liveBpm) * pxPerBpm;
}

export function rollerLabelForMark(mark: number, majorEvery = ROLLER_MAJOR_EVERY): number | null {
  if (mark < RIG_MIN_BPM || mark > RIG_MAX_BPM) return null;
  return mark % majorEvery === 0 ? mark : null;
}

export function rollerWindow(center: number, span = 48): number[] {
  const safe = Number.isFinite(center) ? center : RIG_MIN_BPM;
  const start = Math.max(RIG_MIN_BPM, Math.round(safe) - span);
  const end = Math.min(RIG_MAX_BPM, Math.round(safe) + span);
  const marks: number[] = [];
  for (let n = start; n <= end; n += 1) marks.push(n);
  return marks;
}

export function rollerStripTranslateX(liveBpm: number, wellWidth: number, pxPerBpm = ROLLER_PX_PER_BPM): number {
  'worklet';
  if (!Number.isFinite(liveBpm) || !Number.isFinite(wellWidth) || !Number.isFinite(pxPerBpm)) return 0;
  return wellWidth / 2 - liveBpm * pxPerBpm;
}

export function rollerValuesAreFinite(liveBpm: number, wellWidth: number, mark?: number): boolean {
  if (!Number.isFinite(liveBpm) || !Number.isFinite(wellWidth)) return false;
  if (mark != null && !Number.isFinite(mark)) return false;
  return Number.isFinite(rollerStripTranslateX(liveBpm, wellWidth));
}

export function rollerScaleMarks(): number[] {
  const marks: number[] = [];
  for (let n = RIG_MIN_BPM; n <= RIG_MAX_BPM; n += 1) marks.push(n);
  return marks;
}

export function clampRollerBpm(value: number): number {
  return Math.min(RIG_MAX_BPM, Math.max(RIG_MIN_BPM, Math.round(value)));
}
