export type RecorderNativePhase = 'active' | 'unmounting' | 'released';

type RecorderFlush = () => Promise<void>;

let activeFlush: RecorderFlush | null = null;

/** Home / navigation must stop a live take while the native object is still valid. */
export function registerRecorderFlush(fn: RecorderFlush | null): void {
  activeFlush = fn;
}

export async function flushActiveRecorder(): Promise<void> {
  const fn = activeFlush;
  if (!fn) return;
  try {
    await fn();
  } catch {
    /* Home must still proceed. */
  }
}

/** Native recorder getters are unsafe after Expo releases the SharedObject. */
export function canQueryNativeRecorder(phase: RecorderNativePhase): boolean {
  return phase === 'active';
}

export function jsRecordingFlag(started: boolean, stopped: boolean): boolean {
  return started && !stopped;
}
