import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import {
  KNOWN_GOOD_HOME_PLAYER_OPTIONS,
  KNOWN_GOOD_HOME_SOURCE,
  KNOWN_GOOD_HOME_VOLUME,
  activateKnownGoodHomeSession,
  registerKnownGoodHomeSoundPlayer,
} from '@/audio/known-good-home-sound';

/**
 * Permanently mounted replica of the Home ident player.
 * BrandedIntro keeps its own player (untouched). This host exists so rooms can
 * invoke that same expo-audio source + session + play() path after ident unmounts.
 */
export function KnownGoodHomeSoundHost() {
  const player = useAudioPlayer(KNOWN_GOOD_HOME_SOURCE, KNOWN_GOOD_HOME_PLAYER_OPTIONS);

  useEffect(() => {
    registerKnownGoodHomeSoundPlayer(player, async () => {
      await activateKnownGoodHomeSession();
      try {
        await player.seekTo(0);
      } catch {
        /* first play is already at 0 */
      }
      player.volume = KNOWN_GOOD_HOME_VOLUME;
      player.play();
    });
    return () => {
      registerKnownGoodHomeSoundPlayer(null, null);
    };
  }, [player]);

  return null;
}
