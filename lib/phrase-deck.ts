/** Transport for one replaceable microphone phrase. Not a musical clock. */

export type PhrasePhase = 'idle' | 'recording' | 'ready' | 'playing' | 'paused';

export type PhraseDeck = {
  phase: PhrasePhase;
  loop: boolean;
  hasTake: boolean;
};

export type PhraseCommand =
  | 'start-record'
  | 'stop-record'
  | 'play'
  | 'pause'
  | 'toggle-loop'
  | 'replace'
  | 'clear'
  | 'finish'
  | 'restart'
  | 'suspend';

export function createPhraseDeck(): PhraseDeck {
  return { phase: 'idle', loop: false, hasTake: false };
}

export function phrasePress(
  deck: PhraseDeck,
  gesture: 'tap' | 'long' | 'loop' | 'clear'
): { deck: PhraseDeck; command: PhraseCommand | null } {
  if (gesture === 'clear') {
    return { deck: createPhraseDeck(), command: deck.hasTake || deck.phase !== 'idle' ? 'clear' : null };
  }
  if (gesture === 'loop') {
    if (!deck.hasTake || deck.phase === 'idle' || deck.phase === 'recording') return { deck, command: null };
    return { deck: { ...deck, loop: !deck.loop }, command: 'toggle-loop' };
  }
  if (gesture === 'long') {
    if (deck.phase === 'idle' && !deck.hasTake) return { deck, command: null };
    return { deck: { phase: 'recording', loop: false, hasTake: false }, command: 'replace' };
  }
  switch (deck.phase) {
    case 'idle':
      return { deck: { ...deck, phase: 'recording', hasTake: false }, command: 'start-record' };
    case 'recording':
      return { deck: { ...deck, phase: 'ready', hasTake: true }, command: 'stop-record' };
    case 'ready':
    case 'paused':
      return { deck: { ...deck, phase: 'playing' }, command: 'play' };
    case 'playing':
      return { deck: { ...deck, phase: 'paused' }, command: 'pause' };
    default:
      return { deck, command: null };
  }
}

/** Playback reached the end. Loop restarts. Otherwise the deck returns to ready. */
export function phraseFinish(deck: PhraseDeck): { deck: PhraseDeck; command: PhraseCommand | null } {
  if (!deck.hasTake || deck.phase === 'recording' || deck.phase === 'idle') return { deck, command: null };
  if (deck.loop) return { deck: { ...deck, phase: 'playing' }, command: 'restart' };
  return { deck: { ...deck, phase: 'ready' }, command: 'finish' };
}

/** Clock for the transport. Not a musical timer. */
export function phraseClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remain = safe - minutes * 60;
  return `${minutes}:${remain.toFixed(1).padStart(4, '0')}`;
}

/** Recording fill keeps moving for the whole take. Playback uses the real ratio. */
export function phraseRecordFill(elapsed: number): number {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return 1 - Math.exp(-safe / 8);
}

/** Map a finger x on the timeline to a playback ratio. */
export function phraseScrubRatio(x: number, width: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return 0;
  return Math.min(1, Math.max(0, x / width));
}

/**
 * Scrub owns the playhead. A playing take resumes from the new position on release.
 * Recording and an empty deck do not seek.
 */
export function phraseScrub(
  deck: PhraseDeck,
  ratio: number
): { ratio: number; resume: boolean } {
  if (!deck.hasTake || deck.phase === 'idle' || deck.phase === 'recording') {
    return { ratio: 0, resume: false };
  }
  const next = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return { ratio: next, resume: deck.phase === 'playing' };
}

/** Tuner is taking the microphone. A take already on disk stays ready. */
/** Beat-rail selector. Every tap flips. Nothing can leave it mid-transition. */
export function nextBeatPhraseMode(mode: 'beats' | 'deck'): 'beats' | 'deck' {
  return mode === 'beats' ? 'deck' : 'beats';
}

export function phraseSuspend(deck: PhraseDeck): PhraseDeck {
  if (deck.phase === 'playing' || deck.phase === 'paused' || (deck.phase === 'ready' && deck.hasTake)) {
    return { ...deck, phase: 'ready' };
  }
  if (deck.phase === 'recording') return { phase: 'idle', loop: deck.loop, hasTake: false };
  return deck;
}
