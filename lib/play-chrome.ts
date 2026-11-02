export type PlayChrome = 'rest' | 'down' | 'committing' | 'playing' | 'stop' | 'release';

export function playChrome(input: { down: boolean; armed: boolean; playing: boolean; released: boolean }): PlayChrome {
  if (input.down) return 'down';
  if (input.armed && !input.playing) return 'committing';
  if (input.playing) return 'stop';
  if (input.released) return 'release';
  return 'rest';
}
