export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTE_FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type TunerNoteName = (typeof NOTE_NAMES)[number];
export type TunerState = 'listening' | 'flat' | 'in-tune' | 'sharp';

export type TunerReading = {
  frequency: number;
  midi: number;
  note: TunerNoteName;
  octave: number;
  cents: number;
  state: TunerState;
  confidence: number;
};

export const DEFAULT_A4 = 440;
export const IN_TUNE_CENTS = 2;
export const IN_TUNE_EXIT_CENTS = 3.4;
export const MIN_CONFIDENCE = 0.22;
export const MIN_RMS = 0.00045;
/** A new note must be clearly pitched and loud enough to be a string, not the room. */
export const ACQUIRE_CONFIDENCE = 0.93;
export const ACQUIRE_RMS = 0.0012;
/** A note already held is followed down its decay (the way a hardware tuner hangs on a ringing string). */
export const SUSTAIN_CONFIDENCE = 0.9;
export const SUSTAIN_RMS = 0.0005;
/** A strummed chord is less 'clear' (several periods at once) but loud: it reads as its root. */
export const CHORD_CONFIDENCE = 0.5;
export const CHORD_ACQUIRE_RMS = 0.003;
export const CHORD_SUSTAIN_RMS = 0.0018;

export function midiFromFrequency(frequency: number, a4 = DEFAULT_A4): number {
  if (!(frequency > 0) || !(a4 > 0) || !Number.isFinite(frequency) || !Number.isFinite(a4)) return 69;
  return 69 + 12 * Math.log2(frequency / a4);
}

export function frequencyFromMidi(midi: number, a4 = DEFAULT_A4): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function nearestMidi(frequency: number, a4 = DEFAULT_A4): number {
  return Math.round(midiFromFrequency(frequency, a4));
}

export function centsFromFrequency(frequency: number, a4 = DEFAULT_A4): number {
  const midi = nearestMidi(frequency, a4);
  return 1200 * Math.log2(frequency / frequencyFromMidi(midi, a4));
}

export function noteFromMidi(midi: number): { note: TunerNoteName; octave: number } {
  const rounded = Math.round(midi);
  const index = ((rounded % 12) + 12) % 12;
  return {
    note: NOTE_NAMES[index] ?? 'A',
    octave: Math.floor(rounded / 12) - 1,
  };
}

export function displayNoteName(note: string, accidental: 'sharps' | 'flats' = 'sharps'): string {
  if (accidental !== 'flats') return note;
  const index = (NOTE_NAMES as readonly string[]).indexOf(note);
  if (index >= 0) return NOTE_FLAT_NAMES[index] ?? note;
  return note;
}

/** Distance-to-center color. Color reinforces the needle; it is not the only signal. */
export function tunerProximityColor(absCents: number): string {
  if (absCents <= 2) return '#3DDC84';
  if (absCents <= 5) return '#B4DC64';
  if (absCents <= 10) return '#E8C848';
  if (absCents <= 20) return '#E87828';
  return '#E23B3B';
}

export function tunerStateFromCents(cents: number, previous: TunerState = 'listening'): TunerState {
  const abs = Math.abs(cents);
  if (previous === 'in-tune') {
    if (abs <= IN_TUNE_EXIT_CENTS) return 'in-tune';
  } else if (abs <= IN_TUNE_CENTS) {
    return 'in-tune';
  }
  return cents < 0 ? 'flat' : 'sharp';
}

export function readingFromFrequency(
  frequency: number,
  confidence: number,
  a4 = DEFAULT_A4,
  previous: TunerState = 'listening'
): TunerReading | null {
  if (!Number.isFinite(frequency) || frequency < 40 || frequency > 2000) return null;
  if (confidence < MIN_CONFIDENCE) return null;
  const midi = nearestMidi(frequency, a4);
  const named = noteFromMidi(midi);
  const cents = centsFromFrequency(frequency, a4);
  return {
    frequency,
    midi,
    note: named.note,
    octave: named.octave,
    cents,
    state: tunerStateFromCents(cents, previous),
    confidence,
  };
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function ema(previous: number, next: number, alpha = 0.28): number {
  if (!Number.isFinite(previous)) return next;
  return previous + alpha * (next - previous);
}

/** Faster when pitch is moving, slower when it is stable. */
export function trackingAlpha(previous: number, next: number): number {
  const delta = Math.abs(next - previous);
  if (delta >= 14) return 0.52;
  if (delta >= 6) return 0.38;
  if (delta >= 2) return 0.26;
  return 0.16;
}

export const ACQUIRE_FRAMES = 3;
export const SWITCH_FRAMES = 3;
export const RELEASE_FRAMES = 8;
export const HOLD_MS = 600;

export type TunerTracker = {
  lockedMidi: number | null;
  acquireMidi: number | null;
  acquireCount: number;
  switchMidi: number | null;
  switchCount: number;
  miss: number;
  freqHistory: number[];
  centsEma: number;
  lastGood: TunerReading | null;
  lastHeardAt: number;
};

export function createTunerTracker(): TunerTracker {
  return {
    lockedMidi: null,
    acquireMidi: null,
    acquireCount: 0,
    switchMidi: null,
    switchCount: 0,
    miss: 0,
    freqHistory: [],
    centsEma: 0,
    lastGood: null,
    lastHeardAt: 0,
  };
}

/** Fold obvious 2x / 1/2 harmonic errors toward a guitar-useful range. */
export function foldHarmonicFrequency(frequency: number, lockedMidi: number | null, a4 = DEFAULT_A4): number {
  if (!Number.isFinite(frequency) || frequency <= 0) return frequency;
  let f = frequency;
  if (lockedMidi != null) {
    const target = frequencyFromMidi(lockedMidi, a4);
    let best = f;
    let bestErr = Math.abs(Math.log2(f / target));
    for (const mul of [0.5, 2, 0.25, 4]) {
      const cand = f * mul;
      if (cand < 40 || cand > 2000) continue;
      const err = Math.abs(Math.log2(cand / target));
      if (err < bestErr) {
        best = cand;
        bestErr = err;
      }
    }
    // Only fold octaves when we are still on the locked note. A new string must not be pulled toward the old pitch.
    if (bestErr * 1200 <= 50) return best;
    return f;
  }
  while (f > 700) f /= 2;
  while (f < 58 && f * 2 <= 700) f *= 2;
  return f;
}

export function advanceTunerTracker(
  tracker: TunerTracker,
  frequency: number,
  confidence: number,
  rms: number,
  now = Date.now(),
  a4 = DEFAULT_A4,
  response: 'stable' | 'fast' = 'stable'
): { tracker: TunerTracker; reading: TunerReading | null } {
  const fast = response === 'fast';
  // a loud, clear attack is taken in two frames; quieter or less clear ones need three
  const acquireNeed = fast ? 1 : rms >= 0.004 ? 2 : ACQUIRE_FRAMES;
  const holdMs = fast ? 120 : HOLD_MS;
  const releaseNeed = fast ? 4 : RELEASE_FRAMES;
  const held = tracker.lockedMidi != null;
  const single = held ? rms >= SUSTAIN_RMS && confidence >= SUSTAIN_CONFIDENCE : rms >= ACQUIRE_RMS && confidence >= ACQUIRE_CONFIDENCE;
  const chord = confidence >= CHORD_CONFIDENCE && rms >= (held ? CHORD_SUSTAIN_RMS : CHORD_ACQUIRE_RMS);
  const silent = frequency <= 0 || !(single || chord);
  if (silent) {
    const next: TunerTracker = { ...tracker, miss: tracker.miss + 1 };
    if (tracker.lastGood && now - tracker.lastHeardAt < holdMs) {
      return { tracker: next, reading: tracker.lastGood };
    }
    if (next.miss >= releaseNeed) {
      return {
        tracker: createTunerTracker(),
        reading: null,
      };
    }
    return { tracker: next, reading: tracker.lastGood };
  }

  const folded = foldHarmonicFrequency(frequency, tracker.lockedMidi, a4);
  const midi = nearestMidi(folded, a4);
  const named = noteFromMidi(midi);
  const centsRaw = 1200 * Math.log2(folded / frequencyFromMidi(midi, a4));

  if (tracker.lockedMidi == null) {
    const same = tracker.acquireMidi === midi;
    const acquireCount = same ? tracker.acquireCount + 1 : 1;
    const acquiring: TunerTracker = {
      ...tracker,
      acquireMidi: midi,
      acquireCount,
      miss: 0,
      lastHeardAt: now,
    };
    if (acquireCount < acquireNeed) {
      return { tracker: acquiring, reading: tracker.lastGood };
    }
  } else if (midi !== tracker.lockedMidi) {
    const same = tracker.switchMidi === midi;
    const switchCount = same ? tracker.switchCount + 1 : 1;
    const need = fast ? 1 : confidence >= 0.96 ? 2 : SWITCH_FRAMES;
    if (switchCount < need) {
      const cents = ema(tracker.centsEma, centsRaw, Math.min(0.85, trackingAlpha(tracker.centsEma, centsRaw) * (fast ? 1.7 : 1)));
      const namedLock = noteFromMidi(tracker.lockedMidi);
      const reading: TunerReading = {
        frequency: folded,
        midi: tracker.lockedMidi,
        note: namedLock.note,
        octave: namedLock.octave,
        cents,
        state: tunerStateFromCents(tracker.lastGood?.cents ?? cents, tracker.lastGood?.state ?? 'listening'),
        confidence,
      };
      return {
        tracker: {
          ...tracker,
          switchMidi: midi,
          switchCount,
          miss: 0,
          lastHeardAt: now,
          lastGood: reading,
        },
        reading,
      };
    }
  }

  const lockMidi = midi;
  const history = [...(lockMidi === tracker.lockedMidi ? tracker.freqHistory : []), folded].slice(fast ? -2 : -3);
  const stable = median(history.length ? history : [folded]);
  const rawCents = 1200 * Math.log2(stable / frequencyFromMidi(lockMidi, a4));
  const cents = ema(
    lockMidi === tracker.lockedMidi ? tracker.centsEma : rawCents,
    rawCents,
    Math.min(0.85, trackingAlpha(lockMidi === tracker.lockedMidi ? tracker.centsEma : rawCents, rawCents) * (fast ? 1.7 : 1))
  );
  const namedLock = noteFromMidi(lockMidi);
  const reading: TunerReading = {
    frequency: stable,
    midi: lockMidi,
    note: namedLock.note,
    octave: namedLock.octave,
    cents,
    state: tunerStateFromCents(cents, tracker.lastGood?.state ?? 'listening'),
    confidence,
  };
  return {
    tracker: {
      lockedMidi: lockMidi,
      acquireMidi: lockMidi,
      acquireCount: acquireNeed,
      switchMidi: null,
      switchCount: 0,
      miss: 0,
      freqHistory: history,
      centsEma: cents,
      lastGood: reading,
      lastHeardAt: now,
    },
    reading,
  };
}
