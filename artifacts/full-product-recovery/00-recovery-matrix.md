# POCKT full-product recovery matrix

Starting source: `pockt-3` @ `60ab35d7ec4476863c7a18f2cab013d016e2a6b9`
Checkpoint: `checkpoint/full-product-recovery-pre`
Hierarchy: device feedback, then reference imagery, then known-good history, then current code where it is better.

Historical references inspected, not cherry-picked:

- `e8c4f6ae63eaa2a095e1d9c300f1a366f079dff6` — 12.11.0 build 69. Silent-Play fix restarts a zombie `AVAudioEngine`. Rooms: Dial, Pulse, SmartPendulum, Beatline, Pro, Tuner.
- `bcb1329` — dial drag keeps BPM lockstep. Native constants already live in `PocktDialTuning.swift` (0.4° unlock, 0.85 BPM hysteresis, hard 20–400, `omega = 0`, no flywheel).
- `14892d28e416ee18bab2f7f81bffe57793d8a2fa` — phrase deck transport, Pulse first-beat host time, five residual rings, Pro hierarchy, Beatline capsules.

## 1. Native audio / session

- Current: `PocktTimingEngine` + `PocktAudioSession` are the only native session writers. Play calls `restorePlaybackGraph` then `prepare` then `start`, and sets playing only when `startReportIsAlive` passes.
- Historical: build 69 restarts a zombie engine on the same native path.
- Failure: tuner `stopTuner`, phrase `setAudioModeAsync` / `restorePlaybackGraph`, and Play can overlap. A late capture teardown can silence a Play that already started.
- Reference: one owner, one sequence per transition.
- Source of truth: native engine. JS only serializes who may call it.
- Recovery: `lib/audio-ownership.ts` lane. Play, tuner enter/exit, and phrase capture run one at a time. Play still refuses a dead start report.

## 2. Shared Play / Stop

- Current: one `toggle()` in `FoundationDialRoom`. Stop glyph shares the Play body.
- Failure: Play can look alive if a later capture teardown kills the graph after the UI flipped.
- Recovery: lane plus the existing alive-report gate. Foreground restore is queued and skipped unless mode is `PLAYBACK`.

## 3. Sound selection

- Current: native click bank via `prepare(uris)`. SOUND is a fixed hardware label.
- Recovery: no second preview engine on the instrument. Sound changes still go through the native setter.

## 4. Dial

- Current: fixed pointer, rotating photographic plate, native touch in `PocktDialView.swift`.
- Historical feel: `bcb1329` / `PocktDialTuning.swift`. Do not invent new gesture constants.
- Failure: numerals are 10–11 px. Photographic ticks and a second procedural tick stack disagree. The 40 region shows a stray line from that stack.
- Recovery: one scale model (`dialScaleTicks`, every 10 BPM, majors at the labeled marks). A mask covers the photographic tick band. Numerals grow and move out to a single radius.

## 5. Rhythm

- Current: `RhythmInstrumentFace` over the dial circle. Stronger than the other rooms.
- Recovery: leave the instrument. It keeps the dial underneath because that is its current mounting. Shared header, beat rail, TAP, and Play stay.

## 6. Pulse

- Current console mount: `PulseRoom` viewport draws `TempoDot`, an orbit, on top of the waves.
- Historical: `PulseRoom` / `PulseInstrumentFace` waves from `pulseBeatShouldLaunch`, including beat 0 via host time. Five overlapping rings.
- Failure: the orbit is the rejected descendant.
- Recovery: viewport shows the static POCKT mark and native-timed waves. `TempoDot` stays in the file for the standalone room and existing tests. No JS musical clock.

## 7. Pendulum

- Current: `SmartPendulumRoom` is transparent, and `DialFacade` is painted in the same circle for every face.
- Failure: Dial scale shows through the pendulum.
- Recovery: mount `DialFacade` only when the dial or rhythm is the instrument. Pendulum viewport is opaque graphite. Physics stay on `pulseBeatHost`.

## 8. Pro

- Current: `ProRoom` fitted frame, own cells, `HorizontalTempoWheel`.
- Recovery: shared shell only. Do not restyle the cells.

## 9. Beatline

- Current: fitted `BeatlineRoom` uses `BeatCapsuleStrip` (oblong capsules, equal width and gap per row).
- Recovery: keep that strip. Do not switch to the circular bead rail.

## 10. Beat / accent rail

- Current: Dial uses the Skia `BeatMetal` facade. Other rooms use the bubble wells (`bubbleMute/Soft/Normal/Strong`).
- Failure: the Dial-only caps are the ones Gregg cannot read.
- Recovery: every face uses the bubble wells. Levels stay mute → soft → normal → strong. Playback flash is a separate halo and does not write the accent.

## 11. Shutter

- Current: one shutter in `ClassicDialBeats`, 320 ms linear, horizontal louvers, isolated hit slop.
- Recovery: keep that single control. No new animation.

## 12. Phrase-deck switch

- Current: one toggle, 160 ms out + 160 ms in, linear.
- Recovery: keep the single control. Do not add a second Dial-only transformation.

## 13. Phrase recorder

- Current engine: `lib/phrase-deck.ts` states `idle | recording | ready | playing | paused`. Scrub, loop, and clear already exist.
- Failure: the record key says `REC` at 7 px inside a 46 px key. The timeline hit is 14 px tall.
- Recovery: `RECORD` / `STOP`, flexible keys, taller scrub lane. Engine states stay. Audio handoff goes through the lane.

## 14. Tuner

- Current: `PocktTuner.swift` plus `VinylTunerFace`. In-tune dwell is 280 ms. Haptic plus `playTuneConfirm` on the live tuner engine (does not reconfigure the session).
- Failure: with no reading the stylus is parked at −50, which draws a flat line.
- Recovery: hide stylus and tracer unless cents are finite and inside −50…+50. Copy reads `NO SIGNAL`. Enter/exit joins the audio lane.

## 15. Meter

- Current: 4/4 and subdivision are inside the beat chassis but the beat view paints over them (`beatsWrap` zIndex 3, pills unstacked).
- Recovery: raise the readouts above the rail and increase the type.

## 16. Subdivision

- Same readout pair as meter. Still opens the existing sheet.

## 17. TAP

- Current hardware is the accepted round control.
- Recovery: use that same `facade` control on every face. Do not redraw it.

## 18. P / settings

- Current: `ClassicDialPocktButton` opens settings. Approved mark.
- Recovery: same control on every face.

## 19. Navigation

- Current: `ClassicDialFaceRail` with `facade` always on.
- Recovery: leave the rail and the room ids alone.

## 20. Shared chassis

- Current: `ChassisFill` and the dial nav are already universal. The dial plate was not.
- Recovery: chassis stays. Instrument artwork does not. Pendulum, Pulse, Pro, and Beatline keep their own fields.

## +/- 

- Failure: steppers occupy the digit row and the BPM type overflows into them.
- Recovery: BPM hit uses the full center column. Steppers move to a row under the BPM label, clear of the digits, the tempo name, and the dial.
