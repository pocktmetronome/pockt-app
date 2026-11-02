import profiles from '@/data/tuning-profiles.json';

export type TunerInstrumentId = 'guitar' | 'bass' | 'ukulele';
export type HeadstockStyle = '3x3' | '6inline';
export type TunerResponse = 'stable' | 'fast';
export type AccidentalPref = 'sharps' | 'flats';

export type TuningProfile = {
  id: string;
  label: string;
  instrument: TunerInstrumentId;
  notes: string[];
};

const LABELS: Record<string, string> = {
  standard: 'STANDARD',
  drop_d: 'DROP D',
  half_step_down: 'HALF STEP DOWN',
  whole_step_down: 'WHOLE STEP DOWN',
  dadgad: 'DADGAD',
  open_g: 'OPEN G',
  open_d: 'OPEN D',
  '4_string_standard': '4-STRING',
  '5_string_standard': '5-STRING',
  drop_d_4_string: 'DROP D',
  standard_high_g: 'HIGH G',
  standard_low_g: 'LOW G',
};

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function parsePitchToken(token: string): { midi: number; label: string } | null {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(token.trim());
  if (!match) return null;
  const letter = match[1] ?? 'A';
  const accidental = match[2] ?? '';
  const octave = Number(match[3]);
  let pc = NOTE_INDEX[letter] ?? 0;
  if (accidental === '#') pc += 1;
  if (accidental === 'b') pc -= 1;
  const midi = (octave + 1) * 12 + ((pc % 12) + 12) % 12;
  return { midi, label: token };
}

export function listTuningProfiles(instrument: TunerInstrumentId): TuningProfile[] {
  const group = profiles[instrument] as Record<string, string[]>;
  return Object.entries(group).map(([id, notes]) => ({
    id,
    label: LABELS[id] ?? id.replace(/_/g, ' ').toUpperCase(),
    instrument,
    notes,
  }));
}

export function defaultProfileId(instrument: TunerInstrumentId): string {
  if (instrument === 'bass') return '4_string_standard';
  if (instrument === 'ukulele') return 'standard_high_g';
  return 'standard';
}

export function profileNotes(instrument: TunerInstrumentId, profileId: string): string[] {
  const group = profiles[instrument] as Record<string, string[]>;
  return group[profileId] ?? group[defaultProfileId(instrument)] ?? [];
}

export function midiForToken(token: string, a4 = 440): { midi: number; frequency: number; label: string } | null {
  const parsed = parsePitchToken(token);
  if (!parsed) return null;
  const frequency = a4 * 2 ** ((parsed.midi - 69) / 12);
  return { midi: parsed.midi, frequency, label: parsed.label };
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function formatMidiToken(midi: number, accidental: AccidentalPref = 'sharps'): string {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const names = accidental === 'flats' ? FLAT_NAMES : SHARP_NAMES;
  return `${names[pc] ?? 'A'}${octave}`;
}

export function nudgePitchToken(token: string, delta: number, accidental: AccidentalPref = 'sharps'): string {
  const parsed = parsePitchToken(token);
  if (!parsed) return token;
  return formatMidiToken(parsed.midi + delta, accidental);
}

export function resizeStringNotes(notes: string[], count: number): string[] {
  const nextCount = Math.min(8, Math.max(1, Math.round(count)));
  if (notes.length >= nextCount) return notes.slice(0, nextCount);
  const last = notes[notes.length - 1] ?? 'E4';
  const extra = Array.from({ length: nextCount - notes.length }, (_, index) =>
    nudgePitchToken(last, index + 1)
  );
  return [...notes, ...extra];
}

export function displayPitchToken(token: string, accidental: AccidentalPref = 'sharps'): string {
  const parsed = parsePitchToken(token);
  if (!parsed) return token;
  return formatMidiToken(parsed.midi, accidental);
}

export function nearestStringIndex(
  midi: number,
  targets: number[],
  current: number | null
): number {
  if (!targets.length) return 0;
  let best = 0;
  let bestDist = Infinity;
  targets.forEach((target, index) => {
    const dist = Math.abs(midi - target);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  if (current != null && targets[current] != null && Math.abs(midi - (targets[current] ?? midi)) <= 1.2) {
    return current;
  }
  return best;
}

export const INSTRUMENTS: { id: TunerInstrumentId; label: string }[] = [
  { id: 'guitar', label: 'GUITAR' },
  { id: 'bass', label: 'BASS' },
  { id: 'ukulele', label: 'UKULELE' },
];
