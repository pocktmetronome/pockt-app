import { TIME_SIGNATURES } from '@/constants/meter';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

export const beatsOf = (ts: TimeSignatureId) => (TIME_SIGNATURES[ts] ?? TIME_SIGNATURES['4/4']).beatsPerMeasure;

/** Beat groups for the lamps. Simple meters (up to four beats) light one lamp per beat. */
export function groupsOf(ts: TimeSignatureId): number[] | null {
  const def = TIME_SIGNATURES[ts] ?? TIME_SIGNATURES['4/4'];
  const n = def.beatsPerMeasure;
  if (def.grouping) return def.grouping.split('+').map((v) => parseInt(v, 10));
  if (n <= 4) return null;
  const starts = [...new Set([0, ...def.accentBeats])].sort((a, b) => a - b);
  return starts.map((s, i) => (starts[i + 1] ?? n) - s);
}

export function lampOfBeat(ts: TimeSignatureId, beat: number): { lamp: number; lead: boolean } {
  const groups = groupsOf(ts);
  if (!groups) return { lamp: beat < 4 ? beat : -1, lead: true };
  let acc = 0;
  for (let g = 0; g < groups.length; g++) {
    if (beat < acc + groups[g]) return { lamp: Math.min(3, g), lead: beat === acc };
    acc += groups[g];
  }
  return { lamp: -1, lead: false };
}

/** First beat of each lamp's group: the beat whose accent the lamp shows and edits. */
export function lampLeadBeats(ts: TimeSignatureId): number[] {
  const groups = groupsOf(ts);
  if (!groups) return Array.from({ length: Math.min(4, beatsOf(ts)) }, (_, i) => i);
  const out: number[] = [];
  let acc = 0;
  for (const g of groups) {
    if (out.length < 4) out.push(acc);
    acc += g;
  }
  return out;
}

export const ACCENT_ORDER: AccentLevel[] = ['strong', 'normal', 'soft', 'mute'];
export const nextAccent = (a: AccentLevel): AccentLevel => {
  const i = ACCENT_ORDER.indexOf(a === 'accent' ? 'strong' : a);
  return ACCENT_ORDER[(i + 1) % ACCENT_ORDER.length];
};
export const ACCENT_WORD: Record<AccentLevel, string> = { strong: 'ACCENT', accent: 'ACCENT', normal: 'NORMAL', soft: 'SOFT', mute: 'OFF' };

export function meterLabel(ts: TimeSignatureId): string {
  const def = TIME_SIGNATURES[ts] ?? TIME_SIGNATURES['4/4'];
  return def.grouping ? `${ts.split('-')[0]}  ${def.grouping}` : ts;
}

/** The common meters, as a musician reaches for them. */
export const COMMON_METERS: TimeSignatureId[] = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8', '2/2', '3/8', '6/4', '7/4'];

/** Every grouping variant that shares a meter's beat count and note value. */
export function groupingVariants(ts: TimeSignatureId): TimeSignatureId[] {
  const base = ts.split('-')[0];
  return (Object.keys(TIME_SIGNATURES) as TimeSignatureId[]).filter((id) => id.split('-')[0] === base && TIME_SIGNATURES[id].grouping && id !== base);
}

export function meterFor(beats: number, unit: number): TimeSignatureId | null {
  const id = `${beats}/${unit}` as TimeSignatureId;
  return TIME_SIGNATURES[id] ? id : null;
}
