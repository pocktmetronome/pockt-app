import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useRef } from 'react';

import { familyForSound } from '@/constants/sounds';
import type { SoundId, SoundRole } from '@/lib/types';

/**
 * Unused JS preview helpers. Production metronome audio is native AVAudioEngine only.
 * Heavy / Roots default tones are generated in Swift, not loaded from these modules.
 */

const SOURCES: Record<SoundId, number> = {
  click: require('@/assets/audio/classic/click.wav'),
  wood: require('@/assets/audio/pockt/wood.wav'),
  stick: require('@/assets/audio/classic/stick.wav'),
  clave: require('@/assets/audio/classic/clave.wav'),
  pulse: require('@/assets/audio/classic/pulse.wav'),
  subkick: require('@/assets/audio/pockt/subkick.wav'),
  'pockt-default': require('@/assets/audio/pockt/classic.wav'),
  'pockt-studio': require('@/assets/audio/pockt/studio.wav'),
  'pockt-altered': require('@/assets/audio/pockt/altered.wav'),
  'pockt-after-dark': require('@/assets/audio/pockt/after_dark.wav'),
  pocket: require('@/assets/audio/pockt/pocket.wav'),
  'pockt-heavy': require('@/assets/audio/pockt/heavy.wav'),
  'pockt-heart': require('@/assets/audio/pockt/heart.wav'),
  brass: require('@/assets/audio/pockt/brass.wav'),
  tight: require('@/assets/audio/pockt/tight.wav'),
  clap: require('@/assets/audio/pockt/clap.wav'),
  sharp: require('@/assets/audio/pockt/sharp.wav'),
  'pockt-roots': require('@/assets/audio/pockt/wood.wav'),
  'pockt-sundown': require('@/assets/audio/pockt/after_dark.wav'),
  'digital-click': require('@/assets/audio/pockt/digital.wav'),
  mechanical: require('@/assets/audio/tools/mechanical.wav'),
  woodblock: require('@/assets/audio/tools/woodblock.wav'),
  rim: require('@/assets/audio/tools/rim.wav'),
  cowbell: require('@/assets/audio/tools/cowbell.wav'),
  beep: require('@/assets/audio/tools/beep.wav'),
  'soft-click': require('@/assets/audio/pockt/soft.wav'),
  'hard-click': require('@/assets/audio/tools/hard-click.wav'),
  'high-click': require('@/assets/audio/tools/high-click.wav'),
  'low-click': require('@/assets/audio/tools/low-click.wav'),
  'studio-click': require('@/assets/audio/tools/studio-click.wav'),
  'plain-tick': require('@/assets/sounds/tick.wav'),
  'blend-tick': require('@/assets/sounds/warm.wav'),
  bell: require('@/assets/sounds/accent.wav'),
  'electronic-tick': require('@/assets/audio/tools/beep.wav'),
  snare: require('@/assets/audio/tools/hard-click.wav'),
  kick: require('@/assets/sounds/kick.wav'),
  hihat: require('@/assets/sounds/soft.wav'),
  temple: require('@/assets/audio/classic/wood.wav'),
  'dry-stick': require('@/assets/sounds/stick.wav'),
  'soft-wood': require('@/assets/sounds/soft.wav'),
  'stage-cut': require('@/assets/audio/pockt/stage_cut.wav'),
  precision: require('@/assets/audio/pockt/precision.wav'),
  'lib-wood': require('@/assets/audio/library/lib-wood.wav'),
  'lib-jam': require('@/assets/audio/library/lib-jam.wav'),
  'lib-kick-deep': require('@/assets/audio/library/lib-kick-deep.wav'),
  'lib-kick': require('@/assets/audio/library/lib-kick.wav'),
  'lib-snare': require('@/assets/audio/library/lib-snare.wav'),
  'lib-hat': require('@/assets/audio/library/lib-hat.wav'),
  'lib-djembe': require('@/assets/audio/library/lib-djembe.wav'),
  'lib-doumbek': require('@/assets/audio/library/lib-doumbek.wav'),
  'lib-bell': require('@/assets/audio/library/lib-bell.wav'),
  'lib-tom': require('@/assets/audio/library/lib-tom.wav'),
  'lib-timpani': require('@/assets/audio/library/lib-timpani.wav'),
  'lib-click': require('@/assets/audio/library/lib-click.wav'),
  'lib-click-tight': require('@/assets/audio/library/lib-click-tight.wav'),
  'lib-blip': require('@/assets/audio/library/lib-blip.wav'),
  'lib-digital': require('@/assets/audio/library/lib-digital.wav'),
  'lib-synth': require('@/assets/audio/library/lib-synth.wav'),
  'lib-vocal-hit': require('@/assets/audio/library/lib-vocal-hit.wav'),
  'lib-vocal-male': require('@/assets/audio/library/lib-vocal-male.wav'),
  'lib-vocal-female': require('@/assets/audio/library/lib-vocal-female.wav'),
  'lib-vocal-shout': require('@/assets/audio/library/lib-vocal-shout.wav'),
  'lib-vocal-call': require('@/assets/audio/library/lib-vocal-call.wav'),
  'lib-vocal-ahh': require('@/assets/audio/library/lib-vocal-ahh.wav'),
  'lib-vocal-character': require('@/assets/audio/library/lib-vocal-character.wav'),
  'lib-vocal-chamber': require('@/assets/audio/library/lib-vocal-chamber.wav'),
  'lib-vocal-hit-b': require('@/assets/audio/library/lib-vocal-hit-b.wav'),
  'lib-vocal-male-b': require('@/assets/audio/library/lib-vocal-male-b.wav'),
  'lib-vocal-effort': require('@/assets/audio/library/lib-vocal-effort.wav'),
  'lib-vocal-effort-m': require('@/assets/audio/library/lib-vocal-effort-m.wav'),
  'lib-vocal-emote': require('@/assets/audio/library/lib-vocal-emote.wav'),
  'lib-vocal-emote-b': require('@/assets/audio/library/lib-vocal-emote-b.wav'),
  'lib-vocal-ooh': require('@/assets/audio/library/lib-vocal-ooh.wav'),
  'lib-vocal-ahh-deep': require('@/assets/audio/library/lib-vocal-ahh-deep.wav'),
  'lib-vocal-chorus': require('@/assets/audio/library/lib-vocal-chorus.wav'),
  'lib-vocal-chorus-b': require('@/assets/audio/library/lib-vocal-chorus-b.wav'),
  'lib-vocal-ensemble': require('@/assets/audio/library/lib-vocal-ensemble.wav'),
  'lib-vocal-ensemble-b': require('@/assets/audio/library/lib-vocal-ensemble-b.wav'),
  'lib-choir-a': require('@/assets/audio/library/lib-choir-a.wav'),
  'lib-choir-b': require('@/assets/audio/library/lib-choir-b.wav'),
  'lib-choir-c': require('@/assets/audio/library/lib-choir-c.wav'),
  'lib-choir-d': require('@/assets/audio/library/lib-choir-d.wav'),
  'lib-choir-e': require('@/assets/audio/library/lib-choir-e.wav'),
  'lib-choir-f': require('@/assets/audio/library/lib-choir-f.wav'),
  'lib-choir-g': require('@/assets/audio/library/lib-choir-g.wav'),
  'lib-choir-h': require('@/assets/audio/library/lib-choir-h.wav'),
  count: require('@/assets/audio/library/count.wav'),
  'count-1': require('@/assets/audio/library/count-1.wav'),
  'count-2': require('@/assets/audio/library/count-2.wav'),
  'count-3': require('@/assets/audio/library/count-3.wav'),
  'count-4': require('@/assets/audio/library/count-4.wav'),
  'count-5': require('@/assets/audio/library/count-5.wav'),
  'count-6': require('@/assets/audio/library/count-6.wav'),
  'count-7': require('@/assets/audio/library/count-7.wav'),
  'count-8': require('@/assets/audio/library/count-8.wav'),
  'count-9': require('@/assets/audio/library/count-9.wav'),
  'count-10': require('@/assets/audio/library/count-10.wav'),
  'count-11': require('@/assets/audio/library/count-11.wav'),
  'count-12': require('@/assets/audio/library/count-12.wav'),
  'voice-count': require('@/assets/audio/library/count.wav'),
  'bar-tap': require('@/assets/audio/library/bar-tap.wav'),
  'bar-metal-tap': require('@/assets/audio/library/bar-metal-tap.wav'),
  'bar-jigger': require('@/assets/audio/library/bar-jigger.wav'),
  'bar-shaker': require('@/assets/audio/library/bar-shaker.wav'),
  'bar-ice': require('@/assets/audio/library/bar-ice.wav'),
  'bar-wood-tap': require('@/assets/audio/library/bar-wood-tap.wav'),
  'bar-glass': require('@/assets/audio/library/bar-glass.wav'),
  'bar-spoon': require('@/assets/audio/library/bar-spoon.wav'),
  'bar-thud': require('@/assets/audio/library/bar-thud.wav'),
  'bar-shake': require('@/assets/audio/library/bar-shake.wav'),
  'bar-bottle': require('@/assets/audio/library/bar-bottle.wav'),
  'bar-knock': require('@/assets/audio/library/bar-knock.wav'),
  'bar-clink': require('@/assets/audio/library/bar-clink.wav'),
  'bar-crate': require('@/assets/audio/library/bar-crate.wav'),
  'marimba': require('@/assets/audio/library/marimba.wav'),
  'side-stick': require('@/assets/audio/library/side-stick.wav'),
  'conga': require('@/assets/audio/library/conga.wav'),
  'cajon': require('@/assets/audio/library/cajon.wav'),
  'tambourine': require('@/assets/audio/library/tambourine.wav'),
  'shaker': require('@/assets/audio/library/shaker.wav'),
  'triangle': require('@/assets/audio/library/triangle.wav'),
  'analog-blip': require('@/assets/audio/library/analog-blip.wav'),
  'snap': require('@/assets/audio/library/snap.wav'),
  'sticks': require('@/assets/audio/library/sticks.wav'),
  'kalimba': require('@/assets/audio/library/kalimba.wav'),
  'tick-tock': require('@/assets/audio/library/tick-tock.wav'),
};

const ACCENT_SOURCE = require('@/assets/sounds/accent.wav');

const PLAYER_OPTIONS = {
  keepAudioSessionActive: true,
  updateInterval: 10000,
} as const;

function playOn(player: AudioPlayer, volume: number): void {
  player.volume = Math.max(0, Math.min(1, volume));
  player.play();
}

function useDuplexVoice(source: number) {
  const a = useAudioPlayer(source, PLAYER_OPTIONS);
  const b = useAudioPlayer(source, PLAYER_OPTIONS);
  const useA = useRef(true);

  const play = useCallback(
    (volume: number) => {
      if (volume <= 0.001) return;
      const current = useA.current ? a : b;
      const other = useA.current ? b : a;
      useA.current = !useA.current;
      playOn(current, volume);
      void other.seekTo(0);
    },
    [a, b]
  );

  const stop = useCallback(() => {
    a.pause();
    b.pause();
    void a.seekTo(0);
    void b.seekTo(0);
  }, [a, b]);

  return { play, stop };
}

export function useClickBank() {
  const click = useDuplexVoice(SOURCES.click);
  const wood = useDuplexVoice(SOURCES.wood);
  const stick = useDuplexVoice(SOURCES.stick);
  const clave = useDuplexVoice(SOURCES.clave);
  const pulse = useDuplexVoice(SOURCES.pulse);
  const subkick = useDuplexVoice(SOURCES.subkick);
  const pocktDefault = useDuplexVoice(SOURCES['pockt-default']);
  const studio = useDuplexVoice(SOURCES['pockt-studio']);
  const altered = useDuplexVoice(SOURCES['pockt-altered']);
  const afterDark = useDuplexVoice(SOURCES['pockt-after-dark']);
  const pocket = useDuplexVoice(SOURCES.pocket);
  const heavy = useDuplexVoice(SOURCES['pockt-heavy']);
  const roots = useDuplexVoice(SOURCES['pockt-roots']);
  const sundown = useDuplexVoice(SOURCES['pockt-sundown']);
  const accent = useDuplexVoice(ACCENT_SOURCE);

  const prepare = useCallback(async () => {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
  }, []);

  const play = useCallback(
    (sound: SoundId, role: SoundRole, eventVolume: number, masterVolume: number) => {
      const volume = eventVolume * masterVolume;
      if (volume <= 0.001) return;
      const bank: Partial<Record<SoundId, ReturnType<typeof useDuplexVoice>>> = {
        click,
        wood,
        stick,
        clave,
        pulse,
        subkick,
        'pockt-default': pocktDefault,
        'pockt-studio': studio,
        'pockt-altered': altered,
        'pockt-after-dark': afterDark,
        pocket,
        'pockt-heavy': heavy,
        'pockt-roots': roots,
        'pockt-sundown': sundown,
      };
      (bank[sound] ?? click).play(volume);
      if (role === 'downbeat' && familyForSound(sound) === 'classic') {
        accent.play(Math.min(1, volume * 0.55));
      }
    },
    [accent, afterDark, altered, click, clave, heavy, pocket, pocktDefault, pulse, roots, stick, studio, subkick, sundown, wood]
  );

  const preview = useCallback(
    (sound: SoundId, masterVolume: number) => {
      const bank: Partial<Record<SoundId, ReturnType<typeof useDuplexVoice>>> = {
        click,
        wood,
        stick,
        clave,
        pulse,
        subkick,
        'pockt-default': pocktDefault,
        'pockt-studio': studio,
        'pockt-altered': altered,
        'pockt-after-dark': afterDark,
        pocket,
        'pockt-heavy': heavy,
        'pockt-roots': roots,
        'pockt-sundown': sundown,
      };
      (bank[sound] ?? click).play(Math.max(0.55, masterVolume));
    },
    [afterDark, altered, click, clave, heavy, pocket, pocktDefault, pulse, roots, stick, studio, subkick, sundown, wood]
  );

  const stop = useCallback(() => {
    click.stop();
    wood.stop();
    stick.stop();
    clave.stop();
    pulse.stop();
    subkick.stop();
    pocktDefault.stop();
    studio.stop();
    altered.stop();
    afterDark.stop();
    pocket.stop();
    heavy.stop();
    roots.stop();
    sundown.stop();
    accent.stop();
  }, [accent, afterDark, altered, click, clave, heavy, pocket, pocktDefault, pulse, roots, stick, studio, subkick, sundown, wood]);

  return { play, preview, stop, prepare };
}
