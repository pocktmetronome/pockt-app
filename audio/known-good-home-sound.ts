import { setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { BRAND_IDENT_AUDIO } from '@/lib/brand-assets';

/**
 * Exact audio-mode payload used by BrandedIntro when Home produces audible sound.
 * Do not change these values without matching BrandedIntro.tsx.
 */
export const KNOWN_GOOD_HOME_AUDIO_MODE = {
  playsInSilentMode: true,
  interruptionMode: 'mixWithOthers' as const,
  shouldPlayInBackground: false,
  allowsRecording: false,
};

/**
 * Exact useAudioPlayer options used by BrandedIntro.
 * Do not change these values without matching BrandedIntro.tsx.
 */
export const KNOWN_GOOD_HOME_PLAYER_OPTIONS = {
  updateInterval: 10000,
  keepAudioSessionActive: true,
} as const;

/** Same require() module Home ident plays. */
export const KNOWN_GOOD_HOME_SOURCE = BRAND_IDENT_AUDIO;

export const KNOWN_GOOD_HOME_VOLUME = 0.68;

type PlayFn = () => Promise<void>;

let playImpl: PlayFn | null = null;
let playerRef: AudioPlayer | null = null;

export function registerKnownGoodHomeSoundPlayer(
  player: AudioPlayer | null,
  play: PlayFn | null
): void {
  playerRef = player;
  playImpl = play;
}

export async function activateKnownGoodHomeSession(): Promise<void> {
  await setAudioModeAsync(KNOWN_GOOD_HOME_AUDIO_MODE);
}

/**
 * Invokes the exact Home ident playback path:
 * setAudioModeAsync(same options) → AudioPlayer.play() on BRAND_IDENT_AUDIO.
 * Does not create an AVAudioEngine and does not call PocktTiming.
 */
export async function playKnownGoodHomeSound(): Promise<void> {
  if (!playImpl) {
    throw new Error('Known-good Home sound host is not mounted');
  }
  await playImpl();
}

export function knownGoodHomePlayer(): AudioPlayer | null {
  return playerRef;
}
