/**
 * One lane for metronome, tuner, and phrase session changes.
 * Native AVAudioSession / AVAudioEngine remain the only audio writers.
 */

export type AudioMode =
  | 'IDLE'
  | 'PLAYBACK'
  | 'TUNER_CAPTURE'
  | 'RECORDER_CAPTURE'
  | 'TRANSITIONING'
  | 'INTERRUPTED';

export type AudioEvent =
  | 'play'
  | 'stop'
  | 'enterTuner'
  | 'exitTuner'
  | 'enterRecorder'
  | 'exitRecorder'
  | 'interrupt'
  | 'foreground';

let lane: Promise<unknown> = Promise.resolve();
let mode: AudioMode = 'IDLE';
let generation = 0;

export function audioMode(): AudioMode {
  return mode;
}

export function audioGeneration(): number {
  return generation;
}

export function commitAudioMode(next: AudioMode): number {
  generation += 1;
  mode = next;
  return generation;
}

/** A stale Play or capture task must not overwrite a newer owner. */
export function commitAudioModeIf(token: number, next: AudioMode): boolean {
  if (token !== generation) return false;
  generation += 1;
  mode = next;
  return true;
}

export function nextAudioMode(current: AudioMode, event: AudioEvent): AudioMode {
  switch (event) {
    case 'play':
      return 'PLAYBACK';
    case 'stop':
      return current === 'TUNER_CAPTURE' || current === 'RECORDER_CAPTURE' ? current : 'IDLE';
    case 'enterTuner':
      return 'TUNER_CAPTURE';
    case 'exitTuner':
      return current === 'PLAYBACK' ? 'PLAYBACK' : 'IDLE';
    case 'enterRecorder':
      return 'RECORDER_CAPTURE';
    case 'exitRecorder':
      return current === 'PLAYBACK' ? 'PLAYBACK' : 'IDLE';
    case 'interrupt':
      return 'INTERRUPTED';
    case 'foreground':
      return current === 'INTERRUPTED' ? 'IDLE' : current;
    default:
      return current;
  }
}

/** Capture teardown must not run over a Play that already owns the engine. */
export function captureReleaseIsBlocked(current: AudioMode): boolean {
  return current === 'PLAYBACK' || current === 'TRANSITIONING';
}

/**
 * Tasks run one at a time. A native call that never answers must not jam the lane for the rest of the
 * session (that was "Play stops working until the app restarts"): after LANE_TIMEOUT_MS the next task
 * proceeds, while the slow one is still allowed to finish.
 */
const LANE_TIMEOUT_MS = 4500;
export function enqueueAudio<T>(task: () => Promise<T>): Promise<T> {
  const run = lane.then(task, task);
  lane = lane.then(() =>
    Promise.race([run.then(() => undefined, () => undefined), new Promise<void>((resolve) => setTimeout(resolve, LANE_TIMEOUT_MS))])
  );
  return run;
}
