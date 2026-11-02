/** True when restore handed back a running playback graph. */
export function playbackReady(probe: { engineRunning?: boolean | number } | null | undefined): boolean {
  const running = probe?.engineRunning;
  return running === true || running === 1;
}
