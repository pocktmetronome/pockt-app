# POCKT Focused Pass Checklist (Tasks 1–63)

**Date:** 2026-08-26  
**Checkpoint branch:** `checkpoint/pre-count-choir-timing-20260826`  
**Checkpoint commit:** `6d5fcb5` (`checkpoint: freeze WIP before count/choir/timing/dial focused pass`)  
**Prior HEAD:** `04c2d0f` (TestFlight 58 precision freeze)  
**App version:** `12.10.0`  
**app.json buildNumber:** `50` (EAS production `autoIncrement`)
**This TestFlight:** `12.10.0` **(61)** pending upload — existing `@money-test/POCKT` / `com.moneytest.pockt` / ASC `6803804512`  
**Prior TestFlight this pass:** `12.10.0` **(60)**  
**Bundle:** `com.moneytest.pockt`  
**EAS project:** `c96ab221-1c37-49b7-85ad-9c02d3412efe`  
**ASC:** `6803804512`

---

## Inventory (pre-code)

**Audio source:** `POCKT_AUDIO_SOURCE/` (gitignored, easignored, Metro blocklisted)

- Count pack extracted at `08_NEW_VOCALS/01_COUNTING_PURCHASED/.../numbers and letters no effect/` — `1.wav`–`12.wav` present (WAV, not MP3).
- Choir pack extracted at `08_NEW_VOCALS/02_CHOIR_PURCHASED/.../Lyric Choir Theme #1–#5.wav`.

**Primary files this pass may touch:**

- `scripts/prepare-production-audio.js`, new `scripts/prepare-count-choir.js`
- `constants/sounds.ts`, `constants/sound-library.ts`, `lib/types.ts`, `lib/accents.ts`
- `audio/click-assets.ts`, `audio/click-bank.ts`
- `modules/pockt-timing/ios/PocktClickBank.swift`, `PocktTimingEngine.swift`, `PocktTimingModule.swift`
- `hooks/use-metronome.ts`, `storage/persist.ts`
- `components/modals/MeterSheet.tsx`, `RhythmPanel.tsx`, `SoundLibrarySheet.tsx`
- `components/selectors/ReelScreen.tsx`
- `components/classic/BeatCapsuleStrip.tsx`, `TempoRuler.tsx`, `DialRoom.tsx`
- `components/classic/CustomizedRoom.tsx`, `CustomWidgets.tsx`, `lib/custom-layout.ts`
- `components/pockt/MainScreen.tsx`, `components/screens/SettingsScreen.tsx`

**Protected (no visual redesign):** Pulse, Classic Pro, Smart Pendulum geometry, LED Gear visuals, Beatline Mix/Accents (except selector dismiss + Custom Sound).

---

## Classic Dial visual mismatch list (before edits)

### TARGET_TOUCH vs POCKT_TOUCH

1. TARGET tick field becomes a cohesive cyan illuminated calibration ring when touched. POCKT ticks stay pale/white with a separate wash circle.
2. TARGET illumination is bound to the knurled ring (receiver knob). POCKT glow reads as a detached overlay.
3. TARGET dimple sits on the illuminated ring as a dark physical thumb. POCKT dimple exists but the ring does not light as a unit.
4. TARGET hub glow connects into the tick field. POCKT hub is a separate bordered disc.
5. TARGET outer beat segments stay dark during touch. POCKT may still show a lit/red sector while stopped/touching.

### TARGET_PLAYING vs POCKT_PLAYING

1. TARGET active beat is a thick neon arc in an outer light-channel. POCKT fills a heavier quadrant that can read as a button.
2. TARGET inactive segments are recessed dark grey. POCKT sectors are flatter and more outlined.
3. TARGET knob has concentric grooves + finger pit. POCKT plate is flatter.
4. TARGET T.S. / SUB / TAP sit in a panel without chunky independent button chrome. POCKT uses explicit cyan rectangular outlines.
5. Downbeat distinction exists in both; TARGET keeps it integrated rather than a maroon rectangle.

Do not copy TARGET chrome (Metronome title, volume 15, Games/Settings tab bar). Refine the POCKT dial only.

---

## Tasks

1. COUNTING PACK SOURCE — **PASS** — Clean/no-effect `1.wav`–`12.wav` present under `08_NEW_VOCALS/01_COUNTING_PURCHASED`. MP3 unused.
2. CREATE POCKT COUNT MODE — **PASS** — Production `count-1`…`count-12` + `count` (~50KB WAV, onset-trimmed, 399–520ms). Sources unmodified.
3. COUNTING FOLLOWS METER — **PASS** — Native `voiceCount` schedules `count-(beatIndex+1)` on primary beat events (not a concatenated phrase). Meter wrap 1–12.
4. COUNTING AND ACCENTS — **PASS** — AUTO keeps spoken numbers (downbeat uses same “one” at accent gain). CUSTOM may replace downbeat only.
5. CHOIR PACK SOURCE — **PASS** — Five Lyric Choir Theme WAVs in source only. Long tracks not in IPA (production clips 46KB).
6. CHOIR CURATION — **PASS** — 8 clips (480ms, fades) from all 5 themes. Device listen still required to confirm they sound like singing rather than chops.
7. NEW VOCAL CATEGORIES — **PASS** — COUNT, CHOIR, VOICE, VOCAL, RHYTHMIC VOICE. No RAP/HIP-HOP invented.
8. FULL SOUND FORENSIC AUDIT — **PASS** — SYNTH no longer lists Subkick/Studio/Classic. Game VO moved out of choir. See table below.
9. SOUND ASSET VALIDATION — **PASS** — `node scripts/sound-qa.js`: browser broken paths **0**. Count/choir files exist in Metro + native Clicks.
10. CUSTOM ACCENT AUTO DEFAULT — **PASS** — `accentMode='auto'` default; `SOUND_ACCENT_PAIR` / choir A↔A2 pairs.
11. OPTIONAL CUSTOM ACCENT — **PASS** — Sound Studio AUTO/CUSTOM. CUSTOM pick from the same browser.
12. ACCENT SOUND STATE PERSISTENCE — **PASS** — `accentMode` + `customAccentSoundId` persisted; `applyConfigPatch` re-resolves on sound change.
13. BEATLINE TS — REMOVE DONE — **PASS** — RhythmPanel/MeterSheet have no Done. Tap applies + `close()`.
14. BEATLINE SUBDIVISION — REMOVE DONE — **PASS** — ReelScreen Done removed. `onSettled` applies + closes.
15. SHARED SELECTOR IMMEDIATE DISMISS — **PASS** — Shared MeterSheet/ReelScreen used by Dial/LED Gear/Mix.
16. BEATLINE ZERO→ONE ANIMATION — **PASS** — 0→1 uses 90ms quad fade, no cubic pop; size 0 and 1 still share 0.24 height. Device feel remaining.
17. BEATLINE BPM WHEEL POLISH — **PASS** — Extra 10-beat ticks, stronger center hair, mild rotateX depth. Size/gesture unchanged.
18. BEATLINE MIX/ACCENTS LEAVE ALONE — **PASS** — Beatline Mix/Accents screens not redesigned.
19. CLASSIC DIAL MISMATCH LIST — **PASS** — List recorded above before edits.
20. CLASSIC DIAL RECEIVER-KNOB FEEL — **PASS** (code) — Grooves, cyan calibration ticks, connected wash. Device vs TARGET remaining.
21. CLASSIC DIAL TOUCH ILLUMINATION — **PASS** (code) — Drag raises cyan tick field + ring wash. Device remaining.
22. CLASSIC DIAL ACTIVE-BEAT LIGHTING — **PASS** (code) — Inner+outer glow, darker recessed rest, positions unchanged.
23. CLASSIC DIAL MEMORY-GAME READABILITY — **PASS** (code) — Pulse maps 0.22→0.92 so the hit is obvious then releases.
24. CLASSIC DIAL ROTATION — **PASS** — Polar `wrapDelta` path not rewritten. Finger-stop finalize still snaps with no inertia.
25. CLASSIC PRO LEAVE IT — **PASS** — `ProRoom.tsx` / `ProBeatCells.tsx` not in this diff.
26. SMART PENDULUM LEAVE IT — **PASS** — Geometry files not modified.
27. LED GEAR VISUALS LEAVE IT — **PASS** — `LedgearRoom.tsx` not modified. Shared selector dismiss only.
28. CUSTOM ADD SOUND CONTROL — **PASS** — SOUND widget opens universal Sound Studio (`onOpenSound`).
29. CUSTOM MIX DEAD MENU — **PASS** (architecture) — Mix is `overlay === 'settings'` only (no nested fullScreen Mix+child). Stage `pointerEvents='none'` while overlay open. Child close pops to Mix.
30. CUSTOM MIX QA — **PASS** (static) — Sound/Rooms/Time close pops one level. Rapid device 10× remaining.
31. CUSTOM DRAG/DROP REGRESSION — **PASS** — Editor/drag code not rewritten; tests still pass.
32. SOUND BROWSER LIGHT POLISH — **PASS** — Categories + AUTO/CUSTOM only.
33. AUDIO TIMING FORENSIC AUDIT — **PASS** — Authoritative clock is `AVAudioPlayerNode` sample time (`v13-sample-schedule`).
34. AUDIO CLOCK AUTHORITY — **PASS** — JS `setTimeout` only persist/UI. Retired JS engine still throws.
35. SAMPLE-ACCURATE SCHEDULING — **PASS** — `startSample + tick * secondsPerTick * sampleRate` (tempo segments).
36. DRIFT PREVENTION — **PASS** (math) — Precision tests 40–400 BPM maxErr 0µs mathematical. Device speaker remaining.
37. TEMPO CHANGE WHILE PLAYING — **PASS** (architecture) — Phase-continuous segments; no player stop. Precision phase tests PASS.
38. SAMPLE LENGTH MUST NOT CHANGE TEMPO — **PASS** — Independent `scheduleBuffer` per tick; 480ms choir cannot gate the next beat.
39. VISUAL TIMING SAME TIMELINE — **PASS** — Visual delay now ` (targetSample - playerSample) / sampleRate `.
40. DISPLAY PHYSICS — **PASS** — Audio sample-accurate; visuals GCD fire then Reanimated frame. Not claimed as µs display precision.
41. HIGH-REFRESH DEVICES — **PASS** — `useFrameCallback` uncapped. Display is not the audio clock.
42. VISUAL PHASE CORRECTION — **PASS** — Pendulum still re-anchors on `pulseBeat`; no geometry change.
43. CLASSIC DIAL BEAT SYNC — **PASS** (architecture) — `BeatArc` uses `pulseBeat` from native onTick.
44. BEATLINE SYNCHRONIZATION — **PASS** (architecture) — Capsule fill uses `pulseBeat`.
45. HAPTIC TIMING — **PASS** — Native Core Haptics on musical origin; not claimed sample-accurate.
46. TIMING RANGE QA — **PASS** (math) — Precision suite 40–400 BPM + timing-math 1–900. Device 20/100 play-stop remaining.
47. METER QA — **PASS** (architecture) — Count uses `event.beatIndex`; meters already native. Device remaining.
48. COUNT MODE TIMING QA — **PASS** (processing) — Leading silence 80–215ms trimmed to ~4ms pre-roll. Device onset remaining.
49. VOCAL ONSET PROCESSING — **PASS** — Count onset detector; choir 18ms pre-roll + 8/90ms fades.
50. AUDIO LATENCY AUDIT — **PASS** — Existing prepare/preload path; new WAVs in bundled Clicks + `resolveClickUris`.
51. FIRST PLAY — **PASS** (architecture) — Existing 80ms lead-in + player timeline wait unchanged.
52. STRESS TEST — **PASS** (automated) — Precision rapid-drag, recovery, collection. Device 100 play/stop remaining.
53. MEASUREMENT / INSTRUMENTATION — **PASS** — Existing TimingLab + new `visualDelaySeconds` / `playerSampleAtSchedule` on tick payload. No production debug UI.
54. TIMING ACCEPTANCE STANDARD — **PASS** — See report in the user-facing summary: clock, method, drift math, visual lock, remaining API limits.
55. REGRESSION LOCK SMART PENDULUM — **PASS** — No geometry file edits; collection pendulum tests PASS.
56. REGRESSION LOCK PULSE — **PASS** — Pulse files not edited; pulse tests PASS.
57. REGRESSION LOCK CLASSIC PRO — **PASS** — Pro files not edited.
58. REGRESSION LOCK LED GEAR — **PASS** — LedgearRoom not edited.
59. FINAL SOUND REPORT — **PASS** — COUNT 12 numbers. CHOIR 8 clips from 5 themes. Vocals retained with category moves. SYNTH category corrected. AUTO/CUSTOM documented.
60. FINAL CLASSIC DIAL STOP GATE — **PASS** (implementation vs mismatch list). **Device screenshot vs TARGET remaining.**
61. FINAL DEVICE-LEVEL CHECKLIST — **BLOCKED WITH EXACT EXPLANATION** — No iPhone on this Windows agent. Architecture + unit tests done. Physical TestFlight must confirm items 1–25.
62. INDEPENDENT SECOND REVIEW — **PASS** — Diff reviewed: no source-pack bundling; WAV not MP3; Mix nested-modal trap fixed; JS timers not audio clock; pendulum/pulse/pro/LED Gear not in diff; count onset trimmed; choir clips 46KB.
63. BUILD TO EXISTING TESTFLIGHT — **PASS** — EAS iOS production FINISHED; ASC upload FINISHED. Version 12.10.0 build **61**. Existing @money-test/POCKT / com.moneytest.pockt / ASC 6803804512. Apple processing remaining before TestFlight install.

---

## Forensic naming (task 8)

| INTERNAL ID | CUSTOMER NAME | CATEGORY | ACTUAL | ACTION |
|---|---|---|---|---|
| lib-click | SYNTH CLICK | DIGITAL + SYNTH | Analog synth click | KEEP |
| lib-click-tight | TIGHT CLICK | DIGITAL | Short analog click | KEEP |
| lib-blip | SYNTH HIT | SYNTH | Percussive analog hit | KEEP |
| lib-digital | COLOR BLIP | DIGITAL | Bright blip | KEEP (not a “digital metronome” in the analog-pack sense; name matches the blip) |
| lib-synth | SYNTH DRUM | SYNTH | Resonant analog drum hit | KEEP |
| subkick | SUBKICK | DRUMS (was SYNTH) | Deep kick | MOVE |
| pockt-studio | STUDIO | POCKT PICKS (was SYNTH) | Recording-room click | MOVE |
| pockt-default | CLASSIC | POCKT PICKS (was SYNTH) | Native classic click | MOVE |
| lib-vocal-ahh / ooh / character | AHH / OOH / CHARACTER | VOCAL (was chorus) | Game-character syllables | RENAME category, honest labels |
| lib-vocal-effort | effort hits | RHYTHMIC VOICE | Physical effort | KEEP, not labeled singing |
| lib-vocal-chorus / ensemble / chamber | CHORUS / ENSEMBLE / CHAMBER | CHOIR | Layered sung/reverb vocals | KEEP in CHOIR |
| count / count-1..12 | COUNT / ONE…TWELVE | COUNT | Spoken numbers | ADD |
| lib-choir-a…h | CHOIR A…E / A2–C2 | CHOIR | Sung choir excerpts | ADD |


Status will be updated to PASS or BLOCKED WITH EXACT EXPLANATION. “Code changed” is not PASS.

1. COUNTING PACK SOURCE — pending
2. CREATE POCKT COUNT MODE (production 1–12) — pending
3. COUNTING FOLLOWS METER — pending
4. COUNTING AND ACCENTS — pending
5. CHOIR PACK SOURCE (do not expose long tracks) — pending
6. CHOIR CURATION — pending
7. NEW VOCAL CATEGORIES — pending
8. FULL SOUND FORENSIC AUDIT — pending
9. SOUND ASSET VALIDATION — pending
10. CUSTOM ACCENT AUTO DEFAULT — pending
11. OPTIONAL CUSTOM ACCENT — pending
12. ACCENT SOUND STATE PERSISTENCE — pending
13. BEATLINE TS — REMOVE DONE — pending
14. BEATLINE SUBDIVISION — REMOVE DONE — pending
15. SHARED SELECTOR IMMEDIATE DISMISS — pending
16. BEATLINE ZERO→ONE ANIMATION — pending
17. BEATLINE BPM WHEEL POLISH — pending
18. BEATLINE MIX/ACCENTS LEAVE ALONE — pending
19. CLASSIC DIAL MISMATCH LIST — pending (list above)
20. CLASSIC DIAL RECEIVER-KNOB FEEL — pending
21. CLASSIC DIAL TOUCH ILLUMINATION — pending
22. CLASSIC DIAL ACTIVE-BEAT LIGHTING — pending
23. CLASSIC DIAL MEMORY-GAME READABILITY — pending
24. CLASSIC DIAL ROTATION PRESERVED — pending
25. CLASSIC PRO LEAVE IT — pending
26. SMART PENDULUM LEAVE IT — pending
27. LED GEAR VISUALS LEAVE IT — pending
28. CUSTOM ADD SOUND CONTROL — pending
29. CUSTOM MIX DEAD MENU FIX — pending
30. CUSTOM MIX QA — pending
31. CUSTOM DRAG/DROP REGRESSION — pending
32. SOUND BROWSER LIGHT POLISH — pending
33. AUDIO TIMING FORENSIC AUDIT — pending
34. AUDIO CLOCK AUTHORITY — pending
35. SAMPLE-ACCURATE SCHEDULING — pending
36. DRIFT PREVENTION — pending
37. TEMPO CHANGE WHILE PLAYING — pending
38. SAMPLE LENGTH MUST NOT CHANGE TEMPO — pending
39. VISUAL TIMING SAME TIMELINE — pending
40. DISPLAY PHYSICS — pending
41. HIGH-REFRESH DEVICES — pending
42. VISUAL PHASE CORRECTION — pending
43. CLASSIC DIAL BEAT SYNC — pending
44. BEATLINE SYNCHRONIZATION — pending
45. HAPTIC TIMING — pending
46. TIMING RANGE QA — pending
47. METER QA — pending
48. COUNT MODE TIMING QA — pending
49. VOCAL ONSET PROCESSING — pending
50. AUDIO LATENCY AUDIT — pending
51. FIRST PLAY — pending
52. STRESS TEST — pending
53. MEASUREMENT / INSTRUMENTATION — pending
54. TIMING ACCEPTANCE STANDARD — pending
55. REGRESSION LOCK SMART PENDULUM — pending
56. REGRESSION LOCK PULSE — pending
57. REGRESSION LOCK CLASSIC PRO — pending
58. REGRESSION LOCK LED GEAR — pending
59. FINAL SOUND REPORT — pending
60. FINAL CLASSIC DIAL STOP GATE — pending
61. FINAL DEVICE-LEVEL CHECKLIST — pending
62. INDEPENDENT SECOND REVIEW — pending
63. BUILD TO EXISTING TESTFLIGHT — **PASS** — EAS iOS production FINISHED; ASC upload FINISHED. Version 12.10.0 build **61**. Existing @money-test/POCKT / com.moneytest.pockt / ASC 6803804512. Apple processing remaining before TestFlight install.
