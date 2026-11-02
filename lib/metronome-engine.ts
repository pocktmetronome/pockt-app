/**
 * Retired JS metronome clock.
 * POCKT V8.6 timing is owned by the native iOS module:
 * modules/pockt-timing (AVAudioEngine sample timeline).
 * This file is kept only so old imports fail loudly instead of silently using setTimeout.
 */

export class MetronomeEngine {
  constructor() {
    throw new Error(
      'The JavaScript MetronomeEngine is retired. Use the native PocktTiming module.'
    );
  }
}
