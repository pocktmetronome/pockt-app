# POCKT Refinement Pass Checklist (Tasks 1–47)

**Date:** 2026-08-26  
**Checkpoint:** `04c2d0f` (`checkpoint: freeze TestFlight 58 precision pass before refinement`)  
**Prior TestFlight:** build **58**  
**This pass target:** build **59**  
**Bundle:** `com.moneytest.pockt`  
**EAS:** `c96ab221-1c37-49b7-85ad-9c02d3412efe`  
**ASC:** `6803804512`

---

## 1. PROTECT WORKING AREAS — PASS
Pulse, opening screen, Custom, Pro mode toast, Beatline accent mapping, first-beat-off, room order, Apple identity left in place. Smart Pendulum geometry files not edited.

## 2. ROOM THUMBNAIL POLISH — PASS
Bottom-only shade (~52px), rim highlight instead of mid-card glass belt. Section rules at 8% opacity.

## 3. ROOM CARD PRESS FEEL — PASS
Press scale ~0.968 + 1px translateY, quicker shadow; no bounce, no delayed navigation.

## 4. BEATLINE STATE 0 — PASS (device-confirm)
Hard architecture: state 0 renders **no fill view**. White outline `#F4F6FA`, transparent interior. Size interpolation skipped at strength 0. Active flash cannot mutate persisted mute style.

## 5. BEATLINE LIGHT SOURCE OBJECT — PASS
Fixture/cap lamp objects removed. Origin is implied by the taper only.

## 6. BEATLINE LIGHT SHAPE — PASS
Skia tapered sconce path: narrow top → wider bottom + vertical LinearGradient. Accent color mapping unchanged.

## 7. BEATLINE VOLUME LABEL — PASS
`VOLUME` is centered under the slider (`textAlign: 'center'`, `width: '100%'`). Behavior unchanged.

## 8. MIX SUBDIVISION STAYS OPEN — PASS
Division `onChange` does not close. Mix Settings stays mounted under nested modals. DONE on division uses `closeMix` → metronome.

## 9. MIX ACCENT COLOR REDUNDANCY — PASS
Beatline Mix ACCENT COLOR swatch removed. Accents screen remains the 3-level color editor. Pulse Mix downbeat/upbeat colors kept (Pulse-only).

## 10. ACCENTS CRASH — PASS (device-confirm)
Parent Mix modal no longer unmounts when Accents opens (stacked `showing()`). Preview/color apply wrapped in try/catch. `TIME_SIGNATURES` optional-chained in Mix.

## 11–16. CLASSIC DIAL REFINE — PASS (device visual QA)
Preserved polar rotary. Smaller sector gaps, filled (not outlined) regions, denser ticks, drag illumination on tick field + soft engage wash, thinner plate, recessed dimple, raised hub. Beat count follows time signature. Compare on device vs target still required.

## 17–19. CLASSIC PRO + FIT ALL BEATS — PASS
Permanent four-top architecture preserved. Primary row sizes from container width; gap shrinks at 8/12. No ScrollView. Syntax error in cycle (`const next`) fixed.

## 20. BEATLINE BEAT COUNT — PASS
All beats in one non-wrapping row; cell width from `onLayout`. 2 centered through 12 fitted.

## 21–22. SHARED / LED GEAR SUBDIVISION — PASS
Shared ReelScreen stays open until DONE. Selector settle/commit cannot crash-unmount. LED Gear uses the same division overlay. Lamp cycle pads to beat count. Other LED Gear controls untouched.

## 23. RESTORE DEFAULT — PASS
`restoreDefaultMeter()` → 4/4 + quarter + default accents. Wired on MeterSheet, RhythmPanel, ReelScreen, Pro subdivision sheet. Does not reset sound/volume/room/custom.

## 24. COUNT ASSETS — BLOCKED / SOURCE ASSETS NOT FOUND
Re-scanned `POCKT_AUDIO_SOURCE` (6704 files across 03/05/06/07). No isolated ONE/TWO/THREE/FOUR (or 5–8) spoken count takes. Count preset not surfaced. `voice-count` remains a legacy remap.

## 25–27. VOCALS / CHORUS — PASS
Existing Chorus/Chorus B layered pair kept. Added Ensemble / Ensemble B from related layered chamber vocals (04 + 06), paired as normal/accent. Dialogue libraries not dumped. Not labeled as rap.

## 28. IMMERSIVE DEFAULT SOUND — PASS
`resolveRoomEntrySound`: immersive uses `roomVoice[id] ??` room default, never Classic `hasUserChosenSound` carry-over. Library/Look entry paths use the same helper.

## 29. SMART PENDULUM GEOMETRY LOCK — PASS
`use-pendulum-phase.ts` / `pendulum-motion.ts` / `SmartPendulumRoom.tsx` not modified this pass.

## 30. CUSTOM REGRESSION — PASS
No Custom editor/layout changes.

## 31–32. BPM ROLLER — PASS
Shorter black well (38px), numeric strip labels removed, fine ticks, stronger center hair, live float drag, integer commit, **no release inertia**.

## 33–37. iOS BACKGROUND / NOW PLAYING — PASS (device-confirm)
**Mechanism:** `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` (Lock Screen / Control Center / Dynamic Island media). Live-stream Now Playing. Play/Pause/Stop/Toggle. Tapping the system Now Playing card is the supported route back into the app.  
**Not used:** Home Screen widget, Live Activity (cannot drive the audio engine; no widget entitlements).  
`UIBackgroundModes: audio` already present. `backgroundPlay` default remains true. Same engine instance — no second scheduler. JS `onEngineState` + foreground `isRunning()` sync.

## 38–39. SOUND + TIMING — PASS
No JS musical timers added. Native chunk scheduler unchanged. Sound browser not redesigned.

## 40–45. FINAL QA — LOCAL GATES / DEVICE-CONFIRM
Local architecture tests cover 0-state, sconce, stay-open, restore, immersive, Now Playing. Device still required for visual/touch and lock-screen transport.

## 46. SECOND REVIEW — PASS
Reviewed for: state 0 fill leak, selector auto-dismiss, Accents modal unmount crash, 8/12 overflow, Dial outlines, pendulum geometry, immersive reset, duplicate engines, fake widgets.

## 47. TESTFLIGHT — PASS
Build **59** (`12.10.0`) uploaded to existing TestFlight.

* EAS build: `884a06a3-3d23-4c0b-af5f-a96ebea50a3f` — finished
* Submit: `3d2b4ad0-bafc-4efa-9393-a6f44da25b41` — uploaded to App Store Connect `6803804512`
* Bundle: `com.moneytest.pockt`
* Apple is still processing the binary (typical 5–10 min)
