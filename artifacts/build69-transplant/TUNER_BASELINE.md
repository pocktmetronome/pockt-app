# Tuner baseline check — no visual redesign

Build 69 `modules/pockt-timing/ios/PocktTuner.swift` and the current file still agree on the detector:

- YIN, tuner only, not the metronome clock
- `minHz = 40` and CMND `threshold = 0.12` match Build 69
- RMS gate `0.0012` matches Build 69
- Current `maxHz` is `1400`. Build 69 was `2000`. Current file also adds guitar-range octave correction. That drift was left in place.

Current `hooks/use-tuner.ts` still starts and stops through `PocktTiming.startTuner` / `stopTuner`. Opening the tuner from `FoundationDialRoom` still calls `stop()` when playback is running, then `useTuner`.

The vinyl face `components/classic/faces/VinylTunerFace.tsx` was left in place. `TunerScreen.tsx` was not restored over it.
