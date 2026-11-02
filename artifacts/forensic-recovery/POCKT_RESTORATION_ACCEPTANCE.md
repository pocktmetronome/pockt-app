# POCKT restoration acceptance

Production faces now mount the historical instruments. The native Metal dial, BPM gesture, and audio/timing engine were not changed.

Starting point: `8c2622b9db0572e4ccb343fd2b2b1e1535da5a30`.

## RHYTHM

- Historical source: `93c6f86a160477e5f04836a533cea10c08667df0` `components/classic/DialRoom.tsx` (`DialWheel`, `ringSector`, `BeatArc`).
- Production component: `components/classic/faces/RhythmInstrumentFace.tsx`.
- Ported unchanged: Skia annulus. Outer radius `size * 0.498`, inner `size * 0.348`. One closed sector per beat. Rest `#1A2028`. Downbeat `#E23B3B`, other beats `#3EE6D8`, inner shadow. Current beat comes from `pulseBeat`, with `pulse` raising the lit sector.
- Adapted: Sector count follows the meter (3, 4, 6, 7, 9, 12). `beatGroupsFor` opens a wider seam at group starts without merging beats. `accentStrength` / `rhythmGlow` scale the lit sector. `TempoRingCue` stays as the shell perimeter.
- Not ported: The wheel's own BPM pan. The outer native dial already owns tempo.
- Device validation: This face is Skia. Expo web does not load CanvasKit here, so a web screenshot is not proof. Confirm the sectors on iOS.

## PULSE

- Historical source: `ebaec60ba1ea311ce330e78b53bcace277cf4700` `components/classic/PulseRoom.tsx` (`PulseWaves`, `WaveRing`, `PulseCore`).
- Production component: `components/classic/faces/PulseInstrumentFace.tsx`.
- Ported unchanged: Three slots. A native `pulseBeat` change sets one slot to 0 and `withTiming`s it to 1 over `clamp(420..2200, (60000/bpm)*1.65)`. Scale runs from 0.62 to the historical BPM scale (2.12–3.35). Border width 7.8→0.8. Assets `ring_wave_1`, `ring_wave_2`, `ring_main`. Role ≥ 0.85 picks the downbeat tint via `pulseRingStrength`.
- Adapted: The wave is clipped to the circular face. The shell keeps BPM, so the Pulse tempo-track pan was not copied. No second musical clock.
- Not ported: PulseRoom chrome (HOME, TAP, BPM digits).

## PENDULUM

- Historical source: `ca6b2674e27a0a94d200409e573847171d0e7b58` `components/classic/PendulaClassicRoom.tsx`.
- Production component: `components/classic/faces/PendulumInstrumentFace.tsx`.
- Ported unchanged: Walnut studio plate, steel gradient rod, machined weight with the center slot, bottom `transformOrigin`. Weight height follows `mechanicalWeightT` / `weightTopFromT` as a readout of the current BPM.
- Adapted: The swing uses the product grab: `pendulumAngleFromFinger` while held, `pendulumRenderedDegrees` so native phase cannot overwrite a hold, `withTiming` blend back to `usePendulumPhase` on release. Fitted inside the circular face.
- Not ported: Vertical weight-drag that writes BPM. Phone chrome (STOP, OPTIONS, TAP, +/−). No second timer.

## PRO

- Historical source: `21469e56a878d454dbb57650f27bc01e09882006` `ProRoom.tsx` and `ProBeatCells.tsx`.
- Production components: `components/classic/faces/ProInstrumentFace.tsx`, `components/classic/ProBeatCells.tsx`.
- Ported unchanged: Cell size 84, fill ratios 0 / 1/3 / 2/3 / 1, `cycleBeatBlock`, `highlightAllowed`, level bands, `PRO_REST_FILL`, and the pendulum phase bar (2px rail, glowing 36×10 bar) driven by `usePendulumPhase`.
- Adapted: `proModuleRows` wraps 7/8 into two rows and 12/8 into three so the cells stay inside the circle. The phase bar's travel uses `size * 0.36`, the existing face contract.
- Not ported: `SafeDial` (BPM belongs to the native dial). ACCENT / SOUND / TIME / TAP / PRESETS / SETLIST / TRAIN / HAPTIC chrome (the shell has those). The status flash uses `#7EE8DE` in place of the historical diagnostic `#3DDC84` / `#E23B3B` pair.

## BEATLINE

- Historical source: `32b8c8e515bcdd1c86294844ce680c8a21d9325f` `BeatlineFace.tsx` and `BeatlineRail.tsx`.
- Production component: `components/classic/faces/BeatlineInstrumentFace.tsx` mounts `components/beatline/BeatlineRail.tsx` at 90% of the face width, `skin="parts"`, which includes the rail housing image.
- Ported unchanged: Rail housing, node shells, halos, grouping, `beatlineCycleBeat`, `beatlineBeadIsCurrent`, `strengthDotRatio`, meter and subdivision captions.
- Adapted: The full Beatline 2.0 chassis (tempo dial, volume slider, play, settings) is not shrunk into the circle. Those jobs belong to the shell. The rail itself is the instrument and is the large element.
- Not ported: Beatline's own tempo dial and volume slider.

## TUNER

- Historical tuner: `21469e56` `TunerScreen` is chromatic/headstock. There is no historical vinyl trail.
- Production component: `components/classic/faces/VinylTunerFace.tsx` with `lib/tuner-trail.ts`.
- Path: microphone → `useTuner` / native `onTunerPitch` → `TunerReading` note and cents → `tonearmPose` moves the stylus → `pushTunerTrail` stores the cents sample with `Date.now()` → `Scratch` draws the segment between consecutive stylus tips and `tunerTrailOpacity` fades it over `TUNER_TRAIL_LIFE_MS`. The frame clock is the same `Date.now()`, so age is real. Newest sample is strongest. Lost pitch stops new samples and the existing scratch decays. Denied/error clears it. No `pulseBeat`, `pulseRole`, or `beatIndex`. No invented note in the production path (`FoundationDialRoom` passes `tuner.reading`).

## Shell

`FoundationDialRoom` still mounts `PocktDialView` for BPM. Rhythm, Pulse, Pendulum, Pro, Beatline, and Tuner are interiors. Launch remains the numbered dial.
