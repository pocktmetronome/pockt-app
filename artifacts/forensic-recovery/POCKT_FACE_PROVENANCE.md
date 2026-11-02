# POCKT face provenance

Discovery only. Production instrument faces were not edited. Selected commits were compared by blob id across the whole history, not taken from the recent redesign passes.

Safety checkpoint before this work: `safety/d56d72c-before-forensic-recovery` at `d56d72c7f9c15686694add5cd1b045205e6ff01e`.

Web captures are in this directory. Where Skia could not paint, the panel says NATIVE-ONLY / NO FAITHFUL WEB RENDER. Nothing was drawn in its place.

## RHYTHM

- BEST HISTORICAL COMMIT: `93c6f86a160477e5f04836a533cea10c08667df0` (2026-09-13). Last commit in which `DialWheel` was the dial on every platform, including iOS. Later `4bff3ac` put `PocktDialView` on iOS and left the wheel as the non-iOS path.
- FILE: `components/classic/DialRoom.tsx` (746 lines at `93c6f86`, blob `b2d0a0ef`). Same annulus is still in the file at `ebaec60ba1ea311ce330e78b53bcace277cf4700` (blob `1e1f0f0e`), which also exports `DialSimonSegments` with the same radii.
- COMPONENTS: `DialWheel`, `BeatArc`, `ringSector`.
- WHAT IT DID: One Skia annulus. Outer radius `size * 0.498`, inner `size * 0.348`. One closed sector per beat, gap `min(2.2, 10/beats)`, sweep `360/beats - gap`, beat 1 starting at -90°. Rest fill `#1A2028`. The current beat paints `#E23B3B` on the downbeat and `#3EE6D8` otherwise, with an inner shadow, driven by `pulseBeat` and `pulse`. The wheel also rotates with BPM (`DEG_PER_BPM`) and has a pan gesture that writes tempo.
- WHAT IT LOOKED LIKE: A circular plate, bezel, tick ring, and colored beat sectors. Not the numbered Metal landing dial. No historical screenshot of this wheel was found. `assets-src/pockt-3-docs/POCKT_3_APPROVED_CLASSIC_DIAL.jpg` is the numbered Metal dial and is not this face.
- INTERACTIONS: Rotary drag sets BPM. Center tap toggles play. Beat sectors follow the transport.
- NATIVE DATA: `config.bpm`, `config.timeSignature`, `transport.beatIndex`, `pulse`, `pulseBeat`, `playing`.
- ASSETS: None. Paths are built with Skia.
- LOST IN CURRENT: `RhythmInstrumentFace` is a later View reconstruction of the annulus. It is not `DialWheel`.
- CONFIDENCE: High that this is the segmented dial. The web harness could not load CanvasKit (`canvaskit.wasm` 404, `Skia.Path` undefined), so `RHYTHM_HISTORICAL.png` is marked NATIVE-ONLY and was not redrawn.
- OTHER CANDIDATES: `4cea297` / `ebaec60` still contain the wheel, but iOS shows Metal instead. `DialSimonSegments` is the same sectors without the BPM gesture. The approved Metal still is a different instrument.

## PULSE

- BEST HISTORICAL COMMIT: `ebaec60ba1ea311ce330e78b53bcace277cf4700`. Last edit of `PulseRoom`. Blob `2c33cafd`, still the file on disk. It is not `PulseInstrumentFace`.
- FILE: `components/classic/PulseRoom.tsx` (885 lines).
- COMPONENTS: `PulseRoom`, `PulseCore`, `PulseWaves`, `WaveRing`.
- WHAT IT DID: A beat reaction on `pulseBeat` (or `pulse` crossing 0.42) starts one of three slots at progress 0 and runs `withTiming` to 1. Duration is `clamp(420..2200, (60000/bpm)*1.65)`. Scale runs from 0.62 to a BPM-dependent end (about 2.12–3.35). Border width eases from 7.8 to 0.8. Opacity eases from 1 to 0 while playing. Accent (`pulseRingStrength` / role ≥ 0.85) chooses down vs up color. `PulseCore` scales the center ring with `pulse`.
- WHAT IT LOOKED LIKE: `ring_main` in the center, alternating `ring_wave_1` / `ring_wave_2` on the expanding halos, plus a tinted border and a wash. The captured still is that room: center 120, blue core ring, tempo dot, and a faint larger halo from `WaveRing`.
- INTERACTIONS: Pan on the tempo track changes BPM. Tap toggles. Home returns.
- NATIVE DATA: `pulse`, `pulseRole`, `pulseBeat`, `bpm`, `playing`. No second musical timer. The wave timer is `withTiming` on the visual slot only.
- ASSETS: `assets/classic/pulse/ring_main.png`, `ring_wave_1.png`, `ring_wave_2.png` via `lib/classic-assets.ts`.
- LOST IN CURRENT: `PulseInstrumentFace` does not use these ring assets or `WaveRing`.
- CONFIDENCE: High. The only difference from the 885-line room at `7fefab629116ea6cf93ca97b239352e8f17c1903` / `21469e5` is export keywords plus idle opacity 0.22→0.34 and wave-image opacity 0.42→0.58.
- OTHER CANDIDATES: `96de79c` (809 lines) and `25e312d` (759) are earlier and smaller. Gallery `assets/gallery/pulse.png` is a two-ring thumbnail, not the room. App Store `07_Pulse.png` is an older marketing still of two rings and a 125 readout.

## PENDULUM

- BEST HISTORICAL COMMIT: `ca6b2674e27a0a94d200409e573847171d0e7b58` (2026-09-21). Blob `3ecf97d5`, identical to HEAD. 721 lines.
- FILE: `components/classic/PendulaClassicRoom.tsx`.
- COMPONENTS: `PendulaClassicRoom`, plus `lib/pendulum-gesture.ts` (`horizontalAngleFromDrag`, `lockPendulumAxis`) and `lib/mechanical-plate.ts`.
- WHAT IT DID: Walnut studio plate. Rod pivots at the bottom (`transformOrigin: 'bottom'`). Native phase drives the angle unless the pointer is held. Horizontal drag sets the angle from finger travel and does not write BPM. Release can start playback from the visible angle. Vertical drag moves the weight and does write BPM. Tap starts or stops.
- WHAT IT LOOKED LIKE: The captured still is the pyramid walnut body, brushed scale, steel rod, sliding weight, bottom bearing, Allegretto 120, beat lamps, STOP, OPTIONS, TAP.
- INTERACTIONS: Axis-locked pan. Horizontal holds the swing. Vertical slides the weight. This is the developed grab model. It is not “no tempo write” on every axis: only the horizontal axis avoids `setBpm`.
- NATIVE DATA: `usePendulumPhase`, `playing`, `bpm`, `pulse`. Mechanical handoff modes in `lib/pendulum-handoff.ts`. No second musical clock in the render path.
- ASSETS: `assets/classic/mechanical/walnut-studio.jpg` (`MECHANICAL_WALNUT_STUDIO`). The weight in this version is a gradient view, not `pendulum-weight.png`.
- LOST IN CURRENT: `PendulumInstrumentFace` is a separate schematic. It does not mount this plate.
- CONFIDENCE: High for this room and for the capture.
- OTHER CANDIDATES: `SmartPendulumRoom` at `21469e5` (623 lines, blob `51a23047`, still on disk) is the named Smart Pendulum: cream field, orange 5px rod, cream rounded weight, bottom pivot, recorder, and a vertical drag that writes BPM. It does not implement left/right swing grab. It is the App Store `06_Pendulum.png` look and is less developed than `PendulaClassicRoom`. `21b3b11` Smart Pendulum is 656 lines and was replaced by the 21469e5 timeline renderer. `pendulumAngleFromFinger` exists only in the later `PendulumInstrumentFace` / `lib/face-geometry.ts` work.

## PRO

- BEST HISTORICAL COMMIT: `21469e56a878d454dbb57650f27bc01e09882006`. `ProRoom` blob `1dda54ab` is unchanged at HEAD. `ProBeatCells` blob `ec311cd9` is not: HEAD cells are `7cf40c08` after later visual edits, so the harness renders the extracted 21469e5 cells.
- FILES: `components/classic/ProRoom.tsx` (722), `components/classic/ProBeatCells.tsx` (249). Copies, with one import path change, are `forensic/recovered/HistoricalProRoom.tsx` and `HistoricalProBeatCells.tsx`.
- COMPONENTS: `ProRoom`, `ProBeatCells`, `ProModeLamps`, `SafeDial`, footer glyphs.
- WHAT IT DID: OLED tempo / time / subdivision readout. `ProBeatCells` in view `all`: 84px cells, fill ratios 0, 1/3, 2/3, 1, `PRO_REST_FILL`, tap cycles the accent. A mode strip cycles pendulum / accents / beat. `SafeDial` is the rotary under the cells. Corners: ACCENT, SOUND, TIME, TAP. Footer: PRESETS, SETLIST, TRAIN, HAPTIC.
- WHAT IT LOOKED LIKE: The web capture shows the 21469e5 cells (downbeat block, active white block, two rest blocks). `SafeDial` is Skia and threw `PictureRecorder` because CanvasKit did not load. That dial was not redrawn. The lower half of `PRO_HISTORICAL.png` says so. App Store `02_Pro.png` is an older full-screen capture of this layout, including the metal dial.
- INTERACTIONS: Cell press cycles accent strength. Dial drag sets BPM. Mode strip changes `proView`. Subdivision sheet edits meter.
- NATIVE DATA: `transport.beatIndex`, `pulse`, `pulseRole`, `pulseBeat`, `accentPattern`, `onChangeAccents`.
- ASSETS: `PRO_REST_FILL` and accent swatches from `constants/display.ts`. Dial artwork is inside `SafeDial`, not redrawn here.
- LOST IN CURRENT: `ProInstrumentFace` is a different circular deck. HEAD `ProBeatCells` is no longer the 21469e5 blob.
- CONFIDENCE: High for the cells and the room source. The rotary dial has no faithful web render in this pass.
- OTHER CANDIDATES: `04c2d0f` is 687 / 219 lines, earlier. `625fdc6` is 197 / 135. App Store `02_Pro.png` matches the layout but is a marketing still, not a substitute for the cell source.

## BEATLINE

- BEST HISTORICAL COMMIT: `32b8c8e515bcdd1c86294844ce680c8a21d9325f` (2026-09-15). Face blob `29566bba`, rail blob `ad0da0e5`. Both match HEAD. This is the last Beatline 2.0 hardware commit, after `e21de56`, `31d91bc`, `43ca2ca`, and `e1e7925`.
- FILES: `components/beatline/BeatlineFace.tsx`, `BeatlineRail.tsx`, plus `BeatlineTempoDial`, `BeatlineSlider`, `BeatlinePlayInsert`, `BeatlineEngrave`, `BeatlineHardwarePress`, `lib/beatline-layout.ts`, `lib/beatline-2.ts`.
- COMPONENTS: `BeatlineFace`, `BeatlineRail`.
- WHAT IT DID: Full instrument plate. Tempo dial writes BPM. Rail nodes are the beat controls, grouped for 6/8 and 12/8, with strength, current-beat halo, and accent editing. Volume slider, play, tap, rhythm, sound, settings. `proofFrame` is how the still was sized. `pulseBeat` drives the live node.
- WHAT IT LOOKED LIKE: The capture is the machined Beatline 2.0 plate: medallion, rhythm and sound buttons, 120 BPM window, volume rail, tap and settings. Assets are the `assets/beatline/2.0/` plates, including `beatline_final_master.png` and `06_beatline_beat_node_shell.png`.
- INTERACTIONS: Node press cycles strength. Dial and slider are hardware presses. Meter and sound open from the buttons.
- NATIVE DATA: `config` meter, subdivision, accent pattern, `playing`, `pulseBeat`, `onChangeAccents`, `setBpm`.
- ASSETS: `assets/beatline/2.0/01` through `16` and `beatline_final_master.png`.
- LOST IN CURRENT: `BeatlineInstrumentFace` is a short node row. It does not mount `BeatlineFace`.
- CONFIDENCE: High. The component rendered.
- OTHER CANDIDATES: `components/classic/BeatlineRoom.tsx` at `21469e5` is 328 lines and is the older classic room (bar cells), not Beatline 2.0. `assets/gallery/beatline.png` is that older four-bar thumbnail.

## TUNER

- BEST HISTORICAL COMMIT: `21469e56a878d454dbb57650f27bc01e09882006`. `components/tuner/TunerScreen.tsx` blob `e148d420` (701 lines). Identical at `69663eb` and at HEAD.
- COMPONENTS: `TunerScreen`, `TunerHeadstock`.
- WHAT IT DID: Chromatic readout (note, octave, IN TUNE / TUNE UP / TUNE DOWN, cents, Hz) and a strings mode with 3+3 or 6-inline headstock. Pitch comes from `useTuner` / `advanceTunerTracker` in `lib/tuner-math.ts`. There is no vinyl record, tonearm, stylus, groove, or fading pitch trail in this file.
- WHAT IT LOOKED LIKE: `TUNER_HISTORICAL.png` is the committed App Store capture `App Store/Screenshots 12.11.0/Final/04_Tuner.png` (B3, IN TUNE, flat/sharp meter). It is a screenshot of that chromatic tuner, not a new drawing. The live `TunerScreen` needs the microphone, so it was not re-simulated.
- INTERACTIONS: Close, chromatic vs strings, A4, sharps/flats, headstock layout, string select.
- NATIVE DATA: `hooks/use-tuner.ts`, `modules/pockt-timing/ios/PocktTuner.swift`, `onTunerPitch` / `startTuner`. Not metronome pulse.
- ASSETS: `assets/tuner/pockt-headstock-3x3.svg`, `pockt-headstock-6inline.svg`.
- LOST IN CURRENT: `VinylTunerFace` and `lib/tuner-trail.ts` are not this tuner.
- CONFIDENCE: High that the historical tuner is chromatic/headstock. High that no historical pitch trail exists.
- TRAIL SEARCH: `git log -S tonearm` hits only `a2319a7`. `lib/tuner-trail.ts` and `VinylTunerFace.tsx` were added in `fc78a7c5560e746ca5b0539f99274892ae1c4630` (“cover the dial with evolved faces and a vinyl tuner”). The word vinyl before that is a custom-widget play style (`lib/custom-layout.ts`), not a record/stylus. No historical scratch, contrail, or pitch-history renderer was found. None was invented here.
- OTHER CANDIDATES: App Store `04_Tuner2.png`. Headstock SVGs. `VinylTunerFace` is a later face, not a recovered historical instrument.

## Render notes

Harness: `app/forensic-historical.tsx`. Capture: `scripts/render-forensic-recovery.js` against the already running Expo web server. It does not start a native build.

| Face | Capture | How |
| --- | --- | --- |
| Rhythm | `RHYTHM_HISTORICAL.png` | NATIVE-ONLY. Skia `DialWheel` not redrawn. |
| Pulse | `PULSE_HISTORICAL.png` | `PulseRoom` from the tree (ebaec60 blob). |
| Pendulum | `PENDULUM_HISTORICAL.png` | `PendulaClassicRoom`. |
| Pro | `PRO_HISTORICAL.png` | 21469e5 `ProBeatCells` only. `SafeDial` marked NATIVE-ONLY. |
| Beatline | `BEATLINE_HISTORICAL.png` | `BeatlineFace` at 32b8c8e. |
| Tuner | `TUNER_HISTORICAL.png` | Historical screenshot. No trail source. |

`POCKT_HISTORICAL_FACE_SHEET.png` and `POCKT_CURRENT_VS_HISTORICAL.png` use the same mounts. The current column is the existing instrument faces, unmodified.
