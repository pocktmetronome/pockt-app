import { audioMode, commitAudioMode } from '@/lib/audio-ownership';

/** Who currently owns the microphone handoff. Tuner cleanup must not restore over a phrase take. */

export type AudioClaim = 'phrase' | null;

let claim: AudioClaim = null;

export function claimAudio(next: AudioClaim) {
  claim = next;
  if (next === 'phrase') commitAudioMode('RECORDER_CAPTURE');
  else if (audioMode() === 'RECORDER_CAPTURE') commitAudioMode('IDLE');
}

export function audioClaim(): AudioClaim {
  return claim;
}
