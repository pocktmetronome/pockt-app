/**
 * Intentionally blocks the JavaScript thread.
 * Native audio/haptic scheduling must be unaffected while this runs.
 */
export function stressJsThread(durationMs: number): {
  requestedMs: number;
  durationMs: number;
  iterations: number;
} {
  const start = globalThis.performance?.now?.() ?? Date.now();
  let iterations = 0;
  let acc = 0;
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  while (now() - start < durationMs) {
    acc += Math.sqrt((iterations % 997) + 1.0001);
    iterations += 1;
  }
  return {
    requestedMs: durationMs,
    durationMs: now() - start,
    iterations,
  };
}
