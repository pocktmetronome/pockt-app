# Recovery candidate adversarial review

Starting HEAD: `508b86d3844f69f2d7d835027d821f8025e1ba1c`
Tracked tree at review start: clean.
Source was not modified until this file existed.

Evidence is the rendered pack in `artifacts/full-product-recovery/` plus the source those pixels come from. Grades below are the initial grades. A later section records what was fixed.

## Initial grades

| Subsystem | Grade |
| --- | --- |
| Audio architecture | QUESTIONABLE |
| Dial | FAIL |
| Rhythm | PASS |
| Pulse | FAIL |
| Pendulum | FAIL |
| Pro | PASS |
| Beatline | PASS |
| Accent rail | FAIL |
| Shutter | FAIL |
| Beat/Phrase switch | FAIL |
| Phrase deck | FAIL |
| Tuner | PASS |
| Meter/Subdivision | FAIL |
| TAP | PASS |
| Play | FAIL |
| Header/Typography | PASS |
| Shared chassis | PASS |
| Small-phone layout | FAIL |

## What the pixels actually show

### Dial — FAIL

`01-dial-full.png` has two bright lobes around 12 o'clock, about 10–20° apart. The plate image still contains its photographic needle. `DialPlate` then draws a second needle on top of it. That is a hidden pointer plus a drawn pointer.

The scale is not one object. Ticks are Skia lines inside a rotating group. Numerals are a separate React Native text layer using the same angle function on another view. On `02-dial-phone-size.png` the numerals sit in a flat black annulus and crowd each other. `06-dial-40-detail.png` does not read as a manufactured 40.

BPM digits are not covered by +/- in the stills. The steppers sit under the BPM label and stay hidden until the readout is touched. That part is not the failure.

### Rhythm — PASS

`07-rhythm-full.png` and the contact sheet show Rhythm's own wheel: dark face, red sector, teal rings, pause mark. No dial numerals, no dial needle. The console dial view is still mounted underneath for the finger, and Rhythm's face is opaque over it.

### Pulse — FAIL

`09`, `10`, and `11` are the closeup face, not the console room. A gold tick ring (`TempoRingCue`) sits behind the waves, so the instrument reads as a dial. The first-beat still uses progress `0.02`, which is visually the same as stopped. Five technical rings are not the historical pulse.

### Pendulum — FAIL

`12`, `13`, and `14` are the wooden closeup with `TempoRingCue` still mounted, the arm cut by the crop, and most of the 390×844 frame empty. The contact-sheet cell is the chassis pendulum and does not show a dial. The required extreme proofs do not.

### Pro — PASS

`15` and `17` keep the beat cells as the hero. No dial plate. `16` is the same family at 7/8.

### Beatline — PASS

`20-beatline-12.png` keeps oblong capsules with even gaps. They are not circles. The cramped part is the shared accent rail under them, graded on the accent rail.

### Accent rail — FAIL

Source, not just the stills: `bubbleSoft` is `#6E5428` with a gold core, and `bubbleNormal` is `#1A1814` with a near-black core. State 2 is darker than state 1. `21` is off, `24` is a lamp, and `22` versus `23` does not read as soft then stronger. At 12 beats the rail diameter floor is 14px.

### Shutter — FAIL

`26-shutter-closed.png` is a flat black panel, a 3px lip, and one hairline. It does not read as stacked plates.

### Beat/Phrase switch — FAIL

`DeckToggleFace` still paints the hamburger hardware image, then a slot on top of it. The proofs still read as three bars. It is the previous control.

### Phrase deck — FAIL

`27` through `31` do show RECORD, STOP, PLAY, PAUSE, LOOP, CLEAR, and a timeline. `4/4` and `STRAIGHT` are painted over those keys (`zIndex: 6` on the pills). The playhead is a 12px dot. The state machine itself (idle, recording, ready, playing, paused, scrub, loop, clear) is intact in `lib/phrase-deck.ts`.

### Tuner — PASS

`32` is vinyl, the P mark, and NO SIGNAL. No tonearm, no scratch, no measurement line. `33` is outward with TUNE UP. `34` is on the target with IN TUNE. `35` is inward with TUNE DOWN. No tracer carries across the four stills.

### Meter/Subdivision — FAIL

The words are the right words and they are not clipped. They sit on top of the beat caps and, in the deck, on top of the transport keys. They read as another control fighting the rail.

### TAP — PASS

Bronze cap, full TAP label, seated in the transport row on every face in the contact sheet.

### Play — FAIL

`PlayChrome` fills the center with `#C5CED4`. In `01` and `36` that reads as a pale rounded square in the bronze pill. The glyph is a small champagne triangle on top of that badge.

### Header/Typography — PASS

POCKT, tempo name, BPM digits, BPM, SOUND, TUNER. No FIND YOUR POCKET. No ellipsis on the hardware labels in the stills. Phrase words are RECORD, STOP, PLAY, PAUSE, LOOP, CLEAR.

### Shared chassis — PASS

`36-six-face-contact-sheet.png` is one machine. Dial, Rhythm, Pulse, Pendulum, Pro, and Beatline are distinguishable. Pulse and Pendulum are the weak cells, graded on their own rows.

### Small-phone layout — FAIL

`02-dial-phone-size.png` keeps SOUND and TUNER whole, and the header is intact. The dial scale at that size is the failure: crowded numerals in the black band, same doubled-pointer architecture.

### Audio architecture — QUESTIONABLE

One lane, one native clock, stale play cannot mark itself playing, tuner and phrase capture join the same queue. Nothing here can prove a live route, a silent engine, or an interruption. That stays on the device.

## Failures to fix before any device build

1. Photographic needle still visible beside the drawn pointer.
2. Scale ticks and numerals are two views.
3. Pulse closeups wear a dial ring, and the first beat is invisible.
4. Pendulum extreme proofs wear a dial ring and do not show the mechanism.
5. Accent state 2 is darker than state 1. Twelve beats are microscopic.
6. Closed shutter is a flat mask.
7. Phrase/beat switch still paints the hamburger asset.
8. Meter pills cover the beat caps and the phrase keys.
9. Play center reads as a pale badge.
10. Phone-size dial scale is the same failed scale.

## Corrections after the initial grades

- The photographic needle is covered before the drawn pointer. A bright-pixel scan around 12 o'clock is one cluster, not a second shaft.
- Numerals are back on the scale, including 40, and they use the same `dialScaleRotation` as the ticks.
- Rhythm no longer mounts the dial plate. The finger view stays for the drag.
- Pulse closeups no longer wear the dial tick ring. The center is the P mark. The first beat is a ring away from the center. Overlapping waves are separate rings.
- Pendulum extremes keep the weight inside the circle. The dial ring is gone.
- Accent wells now run dark, dim bronze, bright brass, cream. Twelve beats wrap to two rows, 1 through 12.
- The closed shutter is four plates. Meter pills sit behind that cover.
- The phrase/beat control no longer paints the hamburger asset. It is a slot and one index.
- Meter and subdivision hide when the phrase deck is open, and they sit above the caps when the beats are showing.
- The pale square on Play was the stop glyph. Stopped proofs were forced into the playing state because an empty `beat` query became beat 0. That parse is fixed. The stopped control is a gold triangle on a steel disc. Pale pixels in that disc: 0.
- The play pill is drawn metal. It no longer uses the photograph that carried a baked mark.

## Final grades

| Subsystem | Grade |
| --- | --- |
| Audio architecture | QUESTIONABLE |
| Dial | PASS |
| Rhythm | PASS |
| Pulse | PASS |
| Pendulum | PASS |
| Pro | PASS |
| Beatline | PASS |
| Accent rail | PASS |
| Shutter | PASS |
| Beat/Phrase switch | PASS |
| Phrase deck | PASS |
| Tuner | PASS |
| Meter/Subdivision | PASS |
| TAP | PASS |
| Play | PASS |
| Header/Typography | PASS |
| Shared chassis | PASS |
| Small-phone layout | PASS |

No static FAIL remains.

QUESTIONABLE, device only:

- Audio route, silent engine, interruption, and session restore.
- Dial grab, reverse, and haptic feel.
- Whether the first audible beat and the first pulse ring land together.
- Pendulum throw and rejoin on the device.
- Phrase microphone record, playback, and scrub feel.
- Tuner pitch on a real microphone, then Play after leaving the tuner.
- Finger ownership between the shutter and beat 1, and between beat 4 and the phrase switch.
- Frame pacing of the rotating scale.

Review sheets:

- `artifacts/full-product-recovery-review/01-all-six-phone-size.png`
- `artifacts/full-product-recovery-review/02-dial-critical-details.png`
- `artifacts/full-product-recovery-review/03-four-accent-states.png`
- `artifacts/full-product-recovery-review/04-beat-vs-phrase.png`
- `artifacts/full-product-recovery-review/05-phrase-five-states.png`
- `artifacts/full-product-recovery-review/06-tuner-four-states.png`
- `artifacts/full-product-recovery-review/07-meter-layouts.png`
- `artifacts/full-product-recovery-review/08-beatline-4-7-12.png`
- `artifacts/full-product-recovery-review/09-play-button-detail.png`
- `artifacts/full-product-recovery-review/10-small-phone-critical-layout.png`
