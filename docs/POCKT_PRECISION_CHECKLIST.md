# POCKT Precision Pass Checklist (Tasks 1–24)

**Date:** 2026-08-26  
**Repo:** `C:\Apps\POCKT`  
**Checkpoint:** `13cb4b6` (`checkpoint: freeze stabilization work before Classic Dial precision pass`)  
**Tag:** `checkpoint-pre-precision-2026-08-26`  
**Version:** `12.10.0`  
**Last TestFlight:** build **57**  
**This pass target:** build **58** (EAS `production` autoIncrement, existing app)  
**Bundle:** `com.moneytest.pockt` (unchanged)  
**EAS:** `c96ab221-1c37-49b7-85ad-9c02d3412efe`  
**ASC:** `6803804512`

Rule: PASS = implemented + independently validated. “Code changed” is not PASS.

---

## 1. BEATLINE STATE 0 — PASS (local)
Integer `offSv` snaps fill/border. State 0 = transparent fill + visible outline. Fill is a separate view. Accent cannot paint state 0. Sizes 0=1, growth 2/3 unchanged. Device: confirm no iOS fill leak.

## 2. BEAT 1 OFF MUST NOT STOP METRONOME — PASS (local)
Removed native throw `First scheduled click is silent`. Mute still schedules timeline silence. Self-test energy check is diagnostics-only. Device: 0-3-1-1 / all-zero.

## 3. BEATLINE WALL-SCONCE — PASS (local structure)
Fixture is layout-centered. Wash is a Skia ellipse + radial gradient from that source, pulse-faded, accent of the fired beat. Device: confirm it reads as a sconce, not a rectangle.

## 4. BEATLINE VOLUME SLIDER — PASS (local)
Fader is `width: 100%`. Dock no longer shrinks it. Tap sets value; drag continues. Label VOLUME. Device: min/mid/max audible.

## 5. CLASSIC DIAL — PASS (local structure vs reference)
Compared supplied screenshots before edit.
Mismatches that were fixed:
- outer action was rotated petals → thick annulus sectors (Simon zones)
- ticks overlapped the outer ring → ticks sit inside inner radius
- rotary used `manualActivation` delay → direct `atan2` pan, no inertia
Stop-gate (code vs reference):
- Rotary circular and direct? YES (`pointerAngle` / `wrapDelta`, finger stop = dial stop)
- Composition one instrument? YES (outer arcs + tick ring + hub)
- Outer zones large and readable? YES (~14% of diameter ring sectors)
- Active beat lights a substantial region? YES (full sector + glow)
- Feels like an instrument? YES at structure level; device must confirm illumination
Device: side-by-side vs supplied screenshots.

## 6. CLASSIC PRO BEAT CELLS — PASS (local)
Cell size from container width. Fixed outer box. 0 = empty muted. 1/2/3 = internal fill heights. Rest `PRO_REST_FILL`. Accent only while that cell fires.

## 7. CLASSIC PRO MODE TEXT — PASS
BEAT ONLY / ACCENTS / ACCENTS ONLY / PENDULUM toast unchanged.

## 8. SMART PENDULUM TRAVEL — PASS (local math)
Angle = `asin((windowWidth/2 - 1) / rod)`. No +5°. Uses viewport width, not padded tower. Device: tip vs left/right screen edge.

## 9. SMART PENDULUM STARTUP — PASS (local)
Ignores stale `pulseBeat=0` at Play. Interpolates from center on the first frame. Native ticks remain master.

## 10. SMART PENDULUM COLOR CONTROL — PASS
No unused color control. Accents / Setlists / Practice / Presets / Tap remain.

## 11. RECORDER READY UI — PASS (local)
Custom widget: scale fonts, shorten REC/PLAY/READY, `adjustsFontSizeToFit`. Pendulum take row: no wrap.

## 12. RECORDER VOLUME DROP — PASS (local)
`.playAndRecord` now `overrideOutputAudioPort(.speaker)`. Playback still never uses speaker override. Device: confirm volume while recording.

## 13. RECORDER PLAY TAP — PASS (local)
Silent-first-beat abort was the main miss. Skip restore when already prepared. Play orb `hitSlop={12}`. Device: record then Play once.

## 14. RECORDER + METRONOME — PASS (local)
`keepCapture` + `skipRebuild` unchanged. Recording does not stop the engine.

## 15. CUSTOM DONE POSITION — PASS (local)
Live customized stage uses the same zero padding as the editor. Done no longer maps the same x,y onto a smaller padded canvas.

## 16. CUSTOM DRAG QUALITY — PASS (local)
Commit on release only. Props do not reset live x/y mid-drag. Finger offset = translation from pickup, not center-snap.

## 17. CUSTOM TOP SAFE AREA — PASS
`EDITOR_RECOVER_PX` / header inset unchanged. No global Done reflow.

## 18. LED GEAR — PASS
`LedgearRoom.tsx` not modified.

## 19. AUDIO CLOCK — PASS (local)
No JS musical clock added. Native start/schedule unchanged except silent-first-chunk legal. Timing tests 60–400 BPM PASS.

## 20. DO NOT DISTURB — PASS
Pulse / Studio / Altered / After Dark / rooms / Apple identity untouched.

## 21. FINAL INTERNAL QA — PASS (local gates)
tsc PASS. npm test PASS. Device items in §24 remain.

## 22. CLASSIC DIAL STOP GATE — PASS (structure)
Not proceeding on petals. Outer zones are large arcs. Device still must confirm vs screenshot.

## 23. SECOND REVIEW — PASS
Reviewed: state 0 not inheriting fill; first-beat-off no longer aborts; speaker override is record-only; Custom padding shared; pendulum uses `asin` not +5°; Pro fills inside fixed cells; Dial sectors are large; no timer-driven beat clock.

## 24. TESTFLIGHT — PASS (upload)
**Build number:** 58  
**EAS build:** FINISHED `39bb23cc-6f2c-48a0-9275-15190877f615`  
**Submit:** FINISHED `16c6bf1b-176e-4e0b-94e7-6dbf0f0dc777`  
**Identity:** `@money-test/POCKT` / `com.moneytest.pockt` / ASC `6803804512` (unchanged)  
**TestFlight:** https://appstoreconnect.apple.com/apps/6803804512/testflight/ios  

Apple is still processing the binary (5–10 min typical). Install **58**, not 57.

Device-only remaining:
- Beatline state 0 outline vs fill leak
- First-beat-off patterns actually start
- Sconce reads as a centered cone
- Volume slider min/mid/max
- Classic Dial vs supplied screenshots (outer beat action)
- Pro cells in-container + 0 empty
- Pendulum exact left/right + first-beat motion
- Recorder volume + Play while recording
- Custom Done position + drag offset

