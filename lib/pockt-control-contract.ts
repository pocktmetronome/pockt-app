import type { MetronomeConfig, RoomId, SoundId, SubdivisionId, TimeSignatureId } from '@/lib/types';

/**
 * Shared POCKT 2.0 control surface.
 *
 * This is a binding over the existing metronome store — not a second timing system,
 * not a duplicate musical state owner. Authority remains:
 *   PocktTimingEngine (native) → useMetronome → this contract.
 *
 * Future chrome should call these methods instead of reaching into room-private copies.
 */
export type PocktControlContract = {
  playing: boolean;
  playStop: () => void;
  stop: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  tapTempo: () => void;
  timeSignature: TimeSignatureId;
  setTimeSignature: (timeSignature: TimeSignatureId) => void;
  subdivision: SubdivisionId;
  setSubdivision: (subdivision: SubdivisionId) => void;
  sound: SoundId;
  setSound: (sound: SoundId) => void;
  volume: number;
  setVolume: (volume: number) => void;
  haptic: boolean;
  setHaptic: (haptic: boolean) => void;
  activeViewId: RoomId;
  switchView: (id: RoomId) => void;
  openViewSelector: () => void;
  openHome: () => void;
  openTuner: () => void;
  openSound: () => void;
  openMeter: () => void;
  openMix: () => void;
};

export type PocktControlBinding = {
  config: MetronomeConfig;
  playing: boolean;
  toggle: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  tapTempo: () => void;
  update: (patch: Partial<MetronomeConfig>) => void;
  activeViewId: RoomId;
  switchView: (id: RoomId) => void;
  openViewSelector: () => void;
  openHome: () => void;
  openTuner: () => void;
  openSound: () => void;
  openMeter: () => void;
  openMix: () => void;
};

/** Bind the existing useMetronome store to the shared control contract. */
export function bindPocktControls(input: PocktControlBinding): PocktControlContract {
  return {
    playing: input.playing,
    playStop: input.toggle,
    stop: input.stop,
    bpm: input.config.bpm,
    setBpm: input.setBpm,
    tapTempo: input.tapTempo,
    timeSignature: input.config.timeSignature,
    setTimeSignature: (timeSignature) => input.update({ timeSignature }),
    subdivision: input.config.subdivision,
    setSubdivision: (subdivision) => input.update({ subdivision }),
    sound: input.config.sound,
    setSound: (sound) => input.update({ sound, hasUserChosenSound: true }),
    volume: input.config.volume,
    setVolume: (volume) => input.update({ volume }),
    haptic: input.config.haptic,
    setHaptic: (haptic) => input.update({ haptic }),
    activeViewId: input.activeViewId,
    switchView: input.switchView,
    openViewSelector: input.openViewSelector,
    openHome: input.openHome,
    openTuner: input.openTuner,
    openSound: input.openSound,
    openMeter: input.openMeter,
    openMix: input.openMix,
  };
}
