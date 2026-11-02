/**
 * Retired JS musical timer. Isolated so accidental imports fail loudly.
 * Musical authority is modules/pockt-timing (PocktTimingEngine).
 * Do not schedule beats, clicks, or metronome events from this file.
 */
const RETIRED =
  'EventDispatch is retired. Use the native PocktTiming module. Do not introduce a JS musical timer.';

export class EventDispatch {
  constructor() {
    throw new Error(RETIRED);
  }

  cancel(): void {
    throw new Error(RETIRED);
  }

  schedule(_delayMs: number, _fn: () => void): void {
    throw new Error(RETIRED);
  }
}
