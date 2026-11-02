/** Finger-driven North Star ring. 3 degrees of rotation is 1 BPM. No inertia. */

export const DIAL_DEG_PER_BPM = 3;
export const DIAL_BPM_MIN = 20;
export const DIAL_BPM_MAX = 400;
export const DIAL_HOME_BPM = 120;

const RAD_PER_BPM = (DIAL_DEG_PER_BPM * Math.PI) / 180;

export function wrapPi(delta: number): number {
  'worklet';
  if (!Number.isFinite(delta)) return 0;
  let next = delta;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

export function fingerAngle(x: number, y: number, cx: number, cy: number): number {
  'worklet';
  return Math.atan2(y - cy, x - cx);
}

export function rotationForBpm(bpm: number): number {
  'worklet';
  return (bpm - DIAL_HOME_BPM) * RAD_PER_BPM;
}

export function bpmFromRotation(rotation: number, originRotation: number, originBpm: number): number {
  'worklet';
  return originBpm + (rotation - originRotation) / RAD_PER_BPM;
}

/** Apply one wrapped finger delta. The ring stops at 20 and 400 and does not coast. */
export function turnDial(input: {
  rotation: number;
  originRotation: number;
  originBpm: number;
  deltaRadians: number;
}): { rotation: number; bpm: number } {
  'worklet';
  const delta = wrapPi(input.deltaRadians);
  const proposed = input.rotation + delta;
  let bpm = bpmFromRotation(proposed, input.originRotation, input.originBpm);
  let rotation = proposed;
  if (bpm < DIAL_BPM_MIN) {
    bpm = DIAL_BPM_MIN;
    rotation = input.originRotation + (DIAL_BPM_MIN - input.originBpm) * RAD_PER_BPM;
  } else if (bpm > DIAL_BPM_MAX) {
    bpm = DIAL_BPM_MAX;
    rotation = input.originRotation + (DIAL_BPM_MAX - input.originBpm) * RAD_PER_BPM;
  }
  return { rotation, bpm };
}

export function integerBpm(bpm: number): number {
  'worklet';
  return Math.min(DIAL_BPM_MAX, Math.max(DIAL_BPM_MIN, Math.round(bpm)));
}
