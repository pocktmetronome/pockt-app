/**
 * Every change to the selected tempo is recorded with the control that made it, so an unexplained BPM
 * change can be traced. Kept in memory only (the last 64); nothing leaves the phone.
 */
export type TempoSource =
  | 'dial'
  | 'wheel'
  | 'pendulum'
  | 'plus'
  | 'minus'
  | 'hold'
  | 'tap'
  | 'keypad'
  | 'quick'
  | 'trainer'
  | 'setup'
  | 'reset'
  | 'other';

export type TempoChange = { at: number; from: number; to: number; source: TempoSource };

const LOG: TempoChange[] = [];
const MAX = 64;

export function recordTempoChange(from: number, to: number, source: TempoSource): void {
  if (from === to) return;
  LOG.push({ at: Date.now(), from, to, source });
  if (LOG.length > MAX) LOG.splice(0, LOG.length - MAX);
  if (__DEV__) console.log(`[POCKT TEMPO] ${from} -> ${to} (${source})`);
}

export function tempoChanges(): readonly TempoChange[] {
  return LOG;
}

export function clearTempoChanges(): void {
  LOG.length = 0;
}
