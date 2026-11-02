/**
 * JS mirror of the native AVAudioSession policy in PocktAudioSession.swift.
 * Native code is the source of truth at runtime.
 *
 * Ownership:
 * - PocktAudioSession.swift is the only code allowed to set AVAudioSession category.
 * - PocktTimingEngine owns AVAudioEngine, the production player, and the preview node.
 * - Tuner and recorder borrow the engine through startTuner / setInputCapture.
 * - Rooms, previews, and UI must not deactivate the session or destroy the engine.
 */

export type AudioSessionCategory = 'playback' | 'playAndRecord';
export type AudioSessionOption =
  | 'mixWithOthers'
  | 'defaultToSpeaker'
  | 'allowBluetooth'
  | 'allowBluetoothA2DP'
  | 'duckOthers'
  | 'allowAirPlay';

export type AudioSessionModeState =
  | 'idle'
  | 'starting'
  | 'playing'
  | 'stopped'
  | 'previewing'
  | 'tunerInput'
  | 'recording'
  | 'interrupted'
  | 'recovering';

export const PLAYBACK_CATEGORY: AudioSessionCategory = 'playback';
export const RECORDING_CATEGORY: AudioSessionCategory = 'playAndRecord';

/** Legal playback options. Never include defaultToSpeaker or allowBluetooth (HFP). */
export function playbackCategoryOptions(mixWithOthers: boolean): AudioSessionOption[] {
  return mixWithOthers ? ['mixWithOthers'] : [];
}

/** Legal recording options. defaultToSpeaker is only valid with playAndRecord. */
export function recordingCategoryOptions(): AudioSessionOption[] {
  return ['defaultToSpeaker', 'mixWithOthers'];
}

export function isValidSessionCombo(
  category: AudioSessionCategory,
  options: readonly AudioSessionOption[]
): boolean {
  if (category === 'playback') {
    return !options.includes('defaultToSpeaker') && !options.includes('allowBluetooth');
  }
  return true;
}

const PLAYBACK_LIKE = new Set<AudioSessionModeState>(['idle', 'stopped', 'playing', 'starting', 'previewing', 'recovering']);

export function nextSessionMode(
  current: AudioSessionModeState,
  event:
    | 'startPlayback'
    | 'stopPlayback'
    | 'startRecording'
    | 'stopRecording'
    | 'startTuner'
    | 'stopTuner'
    | 'startPreview'
    | 'interrupt'
    | 'resume'
    | 'recover'
): AudioSessionModeState {
  switch (event) {
    case 'startPlayback':
      if (current === 'recording') return 'playing';
      return current === 'tunerInput' || current === 'interrupted' ? 'recovering' : 'playing';
    case 'stopPlayback':
      return 'stopped';
    case 'startRecording':
      return 'recording';
    case 'stopRecording':
      return 'stopped';
    case 'startTuner':
      return 'tunerInput';
    case 'stopTuner':
      return 'stopped';
    case 'startPreview':
      return current === 'playing' ? 'playing' : 'previewing';
    case 'interrupt':
      return 'interrupted';
    case 'recover':
      return 'recovering';
    case 'resume':
      return current === 'recording' || current === 'tunerInput' ? current : 'playing';
    default:
      return current;
  }
}

export function canStartPlayback(state: AudioSessionModeState): boolean {
  return state !== 'starting' && state !== 'tunerInput';
}

export function overlapIsIllegal(a: AudioSessionModeState, b: AudioSessionModeState): boolean {
  if (a === b) return false;
  if (a === 'playing' && b === 'previewing') return false;
  if (a === 'tunerInput' && PLAYBACK_LIKE.has(b) && b === 'playing') return true;
  if (a === 'recording' && b === 'tunerInput') return true;
  return false;
}

/** Persist load: 0/NaN/out-of-range must not silence future launches. Live 0 is still allowed. */
export function sanitizeMasterVolume(value: unknown, fallback = 0.8): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < 0 || value > 1) return fallback;
  if (value === 0) return fallback;
  return value;
}

export function clampLiveVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0;
  return Math.min(1, Math.max(0, volume));
}

/** Perceptual master gain. Slider 0 is silence. Low slider values stay audible. */
export function masterGain(volume: number): number {
  const linear = clampLiveVolume(volume);
  if (linear <= 0) return 0;
  return Math.pow(linear, 0.55) * 0.92;
}

export function startReportIsAlive(started: {
  engineRunning?: unknown;
  running?: unknown;
  playerPlaying?: unknown;
  playerNodePlaying?: unknown;
  scheduledEventCount?: unknown;
  hasDefaultBuffer?: unknown;
  firstChunkPeakAmplitude?: unknown;
  firstChunkNonZeroSampleCount?: unknown;
} | null | undefined, volume: number): boolean {
  if (!started) return false;
  const engineUp = Boolean(started.engineRunning || started.running);
  const playerUp = Boolean(started.playerPlaying || started.playerNodePlaying);
  const scheduled =
    typeof started.scheduledEventCount === 'number' && started.scheduledEventCount > 0;
  if (!engineUp || !playerUp || !scheduled) return false;
  if (volume > 0.02 && started.hasDefaultBuffer === false) return false;
  return true;
}

export function friendlyTransportError(raw: string): string {
  const text = raw.trim();
  if (!text) return 'The click could not start. Tap Play again.';
  if (/native iOS build|Expo Go/i.test(text)) return text;
  if (/OSStatus|-50|paramErr|invalid parameter|setCategory|configureAudioSession/i.test(text)) {
    return 'The click could not start. Tap Play once more.';
  }
  return 'The click could not start. Tap Play again.';
}

export function transportShouldStayStopped(startFailed: boolean, playing: boolean): boolean {
  return startFailed ? false : playing;
}
