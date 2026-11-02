# Restoration visual gate evidence

HEAD captured: `0539b0a2f8b97838a31b63290886f8ad39a83bb4`
Route: `app/restoration-visual-gate.tsx`
Capture script: `scripts/render-restoration-visual-gate.js`
Method: Expo web already running at `http://127.0.0.1:8094`, puppeteer-core + Edge, `deviceScaleFactor` 2. No native binary. No TestFlight build.

Screenshot search before render: working-tree png/jpg, `App Store/Screenshots 12.11.0`, `assets/gallery`, `artifacts/forensic-recovery`, and `artifacts/visual-proof`. The visual-proof folder was not used as a reference. No image of the `93c6f86` DialWheel was found. This host has no iOS simulator.

Each navigation logged one browser 404. The gate still reached `gate-ready` and the components below are the views that painted.

## RHYTHM_HISTORICAL_VS_CURRENT.png

- Historical commit: `93c6f86a160477e5f04836a533cea10c08667df0`
- Historical file/component: `components/classic/DialRoom.tsx` — `DialWheel`, `ringSector`, `BeatArc`
- Current file/component: `components/classic/faces/RhythmInstrumentFace.tsx`
- Capture/render method: text panels only
- Faithful: no
- Limitation: HISTORICAL SOURCE — NATIVE RENDER REQUIRED. CURRENT PRODUCTION — NATIVE iOS CAPTURE REQUIRED. Skia was not redrawn. This panel is not visual acceptance.

## PULSE_HISTORICAL_VS_CURRENT.png

- Historical commit: `ebaec60ba1ea311ce330e78b53bcace277cf4700`
- Historical file/component: `components/classic/PulseRoom.tsx` — `PulseWaves`, `WaveRing`, `PulseCore`
- Current file/component: `components/classic/faces/PulseInstrumentFace.tsx` — `WaveRing`, `PulseCore`, `fronts`
- Capture/render method: historical side is the live `PulseRoom` at 120 BPM. `pulseBeat` changes 250 ms after mount. Shots are 30, 110, 242, and 506 ms after that change (`ringDuration` at 120 BPM is 825 ms). `multi` uses three `pulseBeat` changes and is shot when those ages are 506, 242, and 40 ms. Current side is `PulseInstrumentFace` with `fronts` held at progress 0.02, 0.25, 0.5, 0.85, and the three-front set. That prop renders the same `WaveRing`.
- Faithful: yes, both sides are the real components
- Limitation: current stills use the `fronts` hold, so every held ring is `WaveRing` index 0. Live slots alternate `ring_wave_1` and `ring_wave_2`. The current face clips at the instrument bounds.

## PENDULUM_HISTORICAL_VS_CURRENT.png

- Historical commit: `ca6b2674e27a0a94d200409e573847171d0e7b58`
- Historical file/component: `components/classic/PendulaClassicRoom.tsx`
- Current file/component: `components/classic/faces/PendulumInstrumentFace.tsx`
- Capture/render method: historical center is the room with `playing` false. Historical left and right are a pointer drag on that same room, screenshot taken before pointer release. Current left/center/right pass `previewAngle` -26, 0, and 26.
- Faithful: yes
- Limitation: historical angle is not driven by native host time in this web capture. Left and right exist only while the pointer drag is down.

## PRO_HISTORICAL_VS_CURRENT.png

- Historical commit: `21469e56a878d454dbb57650f27bc01e09882006`
- Historical file/component: `forensic/recovered/HistoricalProBeatCells.tsx` (extracted `ProBeatCells`). `ProRoom.tsx` `SafeDial` was not mounted.
- Current file/component: `components/classic/faces/ProInstrumentFace.tsx` and `components/classic/ProBeatCells.tsx`
- Capture/render method: states `stopped44`, `active44` (beat index 2), `m78`, `m128`
- Faithful: cells and the current face, yes. Complete historical `ProRoom`, no.
- Limitation: SafeDial and the rest of `ProRoom` — NATIVE RENDER REQUIRED. The historical panel says that in the image. The cells were not redrawn.

## BEATLINE_HISTORICAL_VS_CURRENT.png

- Historical commit: `32b8c8e515bcdd1c86294844ce680c8a21d9325f`
- Historical file/component: `components/beatline/BeatlineFace.tsx` mounting `BeatlineRail` `skin="master"`, `proofFrame` 390×780
- Current file/component: `components/classic/faces/BeatlineInstrumentFace.tsx` mounting `BeatlineRail` `skin="parts"` at 90% of a 360 face
- Capture/render method: states `stopped44`, `active44` (`pulseBeat` 2), `m78`, `m128`
- Faithful: yes, both are the real components
- Limitation: the historical shot is the full Beatline 2.0 plate. Its rail is the master-skin groove on that plate, not a separate cropped render.

## TUNER_CURRENT_STATES_AND_TRAIL.png

- Historical commit: no vinyl tuner commit. Screenshot file `App Store/Screenshots 12.11.0/Final/04_Tuner.png`
- Historical file/component: chromatic `TunerScreen` as that committed screenshot. Not a live microphone session.
- Current file/component: `components/classic/faces/VinylTunerFace.tsx` with `lib/tuner-trail.ts`
- Capture/render method: harness supplied readings only. States: no reading (`WAITING FOR INPUT`), E3 at -25, -5, 0, +5, +25 cents. History frame: `trailCents` -22, -15, -8, -2, +4, +10, +3, 0 and a reading of E3 at 0 cents. Decay frame: same initial trail, reading cleared, shot 1700 ms later (`TUNER_TRAIL_LIFE_MS` is 1400).
- Faithful: historical image is the file on disk. Current frames are `VinylTunerFace`. No second trail renderer.
- Limitation: there is no historical vinyl to put beside the current face. The history scratch is whatever `Scratch` painted from those samples.

## POCKT_RESTORATION_VISUAL_GATE.png

Stacked copy of the six images above, 860 px wide. Same methods and the same limitations.
