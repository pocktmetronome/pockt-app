/** Center-crossing haptic latch. Visual angle, not a musical timer. */

export function isCenterCrossing(prevAngle: number, nextAngle: number, deadzone = 0.35): boolean {
  'worklet';
  if (!Number.isFinite(prevAngle) || !Number.isFinite(nextAngle)) return false;
  if (Math.abs(prevAngle) < deadzone && Math.abs(nextAngle) < deadzone) return false;
  const crossed = prevAngle > 0 && nextAngle <= 0 || prevAngle < 0 && nextAngle >= 0;
  return crossed && Math.abs(prevAngle) + Math.abs(nextAngle) > deadzone;
}

export function endpointHapticOnTick(isPrimaryBeat: boolean, silent: boolean, accent: string): boolean {
  if (!isPrimaryBeat || silent) return false;
  return accent !== 'mute';
}

/** Visual-center haptic is forbidden. Beat haptic is native at the musical beat (center). */
export function centerHapticAllowed(_enabled: boolean, _playing: boolean): boolean {
  return false;
}

export type PendulumHapticEvent = 'endpoint' | 'center' | 'none';

export function pendulumHapticTimeline(opts: {
  centerEnabled: boolean;
  events: { kind: 'tick' | 'center-cross'; isPrimaryBeat?: boolean; silent?: boolean; accent?: string }[];
}): PendulumHapticEvent[] {
  return opts.events.map((event) => {
    if (event.kind === 'tick') {
      return endpointHapticOnTick(event.isPrimaryBeat !== false, event.silent === true, event.accent ?? 'normal')
        ? 'endpoint'
        : 'none';
    }
    return 'none';
  });
}
