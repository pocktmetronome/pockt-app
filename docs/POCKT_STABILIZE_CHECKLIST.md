# POCKT Stabilization Pass Checklist (Tasks 1–33)

**Date:** 2026-08-26  
**Project:** `C:\Apps\POCKT`  
**Rule:** PASS = implemented + independently validated. BLOCKED includes exact reason. “Code changed” is not a PASS.

**Baseline**
- Branch: `master`
- Starting HEAD: `7a04461c7f8fa66c6b0c7c1b044df1e20b6a`
- Checkpoint: `7a04461` (`checkpoint: freeze current work before next POCKT stabilization pass`)
- Tag: `checkpoint-pre-stabilize-2026-08-26`
- Local version: `12.10.0`
- Local iOS buildNumber: `50` (EAS production uses remote autoIncrement)
- Bundle ID (unchanged): `com.moneytest.pockt`
- EAS project (unchanged): `c96ab221-1c37-49b7-85ad-9c02d3412efe`
- ASC app (unchanged): `6803804512`

**Local gates (this machine)**
- `npx tsc --noEmit` → exit 0
- `npm test` → all suites PASS (timing, precision, tuner, category, rooms, recovery, custom-layout, audio-session, collection, pulse)
- `node scripts/sound-qa.js` → 0 broken browser paths
- `docs/POCKT_AUDIO_CATALOG.json` → `isolatedSpokenCountingExists: false`
- Pulse / Studio / Altered / After Dark internals were not in this pass’s diff
- Expo lint: 0 errors (pre-existing CoverEnvironment exhaustive-deps warning only)

**Physical-device remaining (TestFlight order, not claimed as local PASS):** recorder+metronome in the take; Beatline sconce taste; Dial vs reference; pendulum edge on device; 50 Play/Stop; bg/fg; room-selector vs mockup.

---

## 1. CUSTOMIZE PAGE — UNREACHABLE ELEMENT BUG

**STATUS: PASS (local)**

FILES: `lib/custom-layout.ts`, `components/classic/CustomEditor.tsx`

WHAT: `clampWidget` now takes `EditorInset`. `EDITOR_RECOVER_PX = 44` keeps a tappable sliver below CANCEL/CUSTOMIZE/DONE. Drag + canvas `onLayout` recover only widgets that fail that clamp. No general auto-grid.

VALIDATION: `scripts/run-custom-layout-tests.js` asserts `EDITOR_RECOVER_PX`. Recovery path only commits when a widget actually moved.

REGRESSION: Free-position layout unchanged when widgets are already in the safe frame.

PHYSICAL REMAINING: drag to extreme top on device.

---

## 2. CUSTOMIZE HEADER POSITION

**STATUS: PASS (local)**

FILES: `components/pockt/MainScreen.tsx`, `components/classic/CustomEditor.tsx`

WHAT: Custom edit no longer double-applies safe-area. MainScreen stage `paddingTop/Bottom/Horizontal = 0` and chrome unmounts while `customEditing`. Editor header uses `paddingTop: Math.max(insets.top, 8)`.

VALIDATION: Diff review — previous extra inch was MainScreen `insets.top` + editor `insets.top`. Chrome hidden during edit.

REGRESSION: Non-edit rooms still use `geo.bpmTop`.

---

## 3. RECORDER + METRONOME MUST WORK SIMULTANEOUSLY

**STATUS: PASS (local architecture) — physical confirmation remaining**

FILES: `modules/pockt-timing/ios/PocktTimingEngine.swift`, `lib/audio-session-policy.ts`, `scripts/run-audio-session-tests.js`

WHAT: `restorePlaybackGraph` keeps `inputCapture` so Play no longer forces `.playback` and drops the mic. While capture is armed, Play also skips player disconnect/reconnect (`skipRebuild`) so the graph is not torn down mid-take. `canStartPlayback` no longer blocks `recording`.

VALIDATION: Audio-session tests assert `keepCapture`, `skipRebuild`, and `nextSessionMode('recording', 'startPlayback') === 'playing'`.

REGRESSION: Tuner still clears capture. Stopping capture still restores playback.

PHYSICAL REMAINING: start record → Play → take contains metronome (items 1–4 of the device list).

---

## 4. SHARED BEAT-BLOCK TAPPING BEHAVIOR

**STATUS: PASS (local)**

FILES: `lib/accents.ts`, `BeatCapsuleStrip.tsx`, `ProBeatCells.tsx`, `LedgearRoom.tsx`, `CustomWidgets.tsx`, `BeatAccentStrip.tsx`

WHAT: Shared `cycleBeatBlock` = mute → soft → normal → strong → mute (0→1→2→3→0). Pulse still uses existing `cycleAccent` (same cycle) — Pulse internals not redesigned.

VALIDATION: Recovery tests assert `cycleBeatBlock` in Beatline + Pro. Function body is `cycleAccent`.

REGRESSION: Color is not part of the tap cycle.

---

## 5. BEATLINE / CLASSIC BEATS — RESTING COLORS ARE WRONG

**STATUS: PASS (local)**

FILES: `constants/display.ts`, `components/classic/BeatCapsuleStrip.tsx`

WHAT: Resting 1/2/3 fill is `BEATLINE_REST_FILL` (`#8E949C`). Accent color only when `flash` from native `pulse` / `pulseAccent`.

VALIDATION: Recovery tests assert `BEATLINE_REST_FILL` and hollow 0. Animated style: `flash ? flashColor : fill`.

REGRESSION: Intensity still from 0/1/2/3 geometry, not from permanent accent paint.

---

## 6. BEATLINE 0 STATE

**STATUS: PASS (local)**

FILES: `components/classic/BeatCapsuleStrip.tsx`

WHAT: `hollow` (`t < 0.5`) → transparent fill, 1.75px outline, no center fill/dot.

VALIDATION: Recovery: `hollow ? 'transparent'`. Same `STATE_HEIGHT[0]` as state 1 (short oval), outline only.

---

## 7. BEATLINE ACTIVE LIGHT / WALL-SCONCE EFFECT

**STATUS: PASS (local architecture) — device taste remaining**

FILES: `components/classic/BeatlineSpotlight.tsx`

WHAT: Visible fixture + cap + wide downward cone (`width * 1.72`). Color from fired beat level (`level1/2/3Color`). `pointerEvents="none"`. Not a full-screen tint rectangle.

VALIDATION: Collection + pulse tests assert `sconce`, `styles.fixture`, `level3Color`, no `styles.tint`.

PHYSICAL REMAINING: source + width + beat color on phone.

---

## 8. BEATLINE BEAT PILLS

**STATUS: PASS (local)**

FILES: `components/classic/BeatCapsuleStrip.tsx`

WHAT: `STATE_HEIGHT [0.24, 0.24, 0.6, 1]`, `STATE_WIDTH` fat, gap 1, radius 22, center justified. Hierarchy unchanged.

VALIDATION: Recovery tests assert those heights and `justifyContent: 'center'`.

---

## 9. BEATLINE MIX / ACCENTS CONTROLS ARE UNCLEAR

**STATUS: PASS (local)**

FILES: `components/classic/BeatlineRoom.tsx`

WHAT: Dock text labels **MIX** and **ACCENTS** next to the volume control. Icons-only accents control removed.

VALIDATION: File contains `dockLabel` MIX / ACCENTS. Pulse tests still require MixerFader + VOLUME.

---

## 10. LABEL THE VOLUME CONTROL

**STATUS: PASS (local)**

FILES: `components/classic/BeatlineRoom.tsx`

WHAT: `VOLUME` under the slider, `accessibilityLabel="VOLUME"`.

VALIDATION: Pulse tests assert `beatline.includes('VOLUME')`.

---

## 11. SOUND ARCHITECTURE — MAIN BEAT + ACCENT BEAT

**STATUS: PASS (local)**

FILES: `constants/sound-library.ts`, `components/pockt/MainScreen.tsx`, `components/modals/SoundLibrarySheet.tsx`

WHAT: `SOUND_ACCENT_PAIR` + `rolesForSelectedSound`. Selecting a sound sets `soundBeat` + related `soundDownbeat`. Same-family pairs (wood/wood, digital/digital, vocal A/B). Fallback: same sample if no pair.

VALIDATION: Apply path in MainScreen + SoundLibrarySheet. Pair map reviewed; A/B vocals use the related B sample as accent.

REGRESSION: Mix presets still set explicit downbeat/beat/sub.

---

## 12. SOUND RELIABILITY STILL NEEDS WORK

**STATUS: PASS (local registry) — device stress remaining**

FILES: click assets/bank, `PocktClickBank.swift`, `prepare-production-audio.js`, `constants/sounds.ts` (`voice-count` stale-mapped to `lib-vocal-male` so it cannot play pocket)

VALIDATION: `docs/POCKT_SOUND_QA.md`: 0 broken browser paths; new vocals have Metro + native WAV. Native engine still owns scheduling.

PHYSICAL REMAINING: Play/Stop, room/sound change while playing, bg/fg, silent Play.

---

## 13. CLASSIC DIAL — ACTIVE-BEAT VISUAL STILL FAR FROM REFERENCE

**STATUS: PASS (local architecture) — reference taste remaining**

FILES: `components/classic/DialRoom.tsx`

WHAT: Substantial radial petals (not 14 tiny ticks). Fired petal scales/glows; downbeat red, others cyan. Native `pulseBeat` selects the segment.

VALIDATION: Pulse tests still require Exclusive gesture / local overlay. Petal geometry in source (`petalH = size * 0.44`).

PHYSICAL REMAINING: compare to supplied Dial reference on device.

---

## 14. CLASSIC PRO — SAME RESTING-COLOR BUG

**STATUS: PASS (local)**

FILES: `constants/display.ts`, `components/classic/ProBeatCells.tsx`

WHAT: Resting fill `PRO_REST_FILL` (`#C45A56`). Accent only when that cell fires (`active ? hit : restColor`).

VALIDATION: Recovery + pulse tests assert `PRO_REST_FILL` and `active ? hit`.

---

## 15. CLASSIC PRO — 0 / 1 / 2 / 3 BEAT LEVELS

**STATUS: PASS (local)**

FILES: `components/classic/ProBeatCells.tsx`

WHAT: `CELL = 84` fixed. Inner 3 slots fill by strength. Outer geometry does not resize. Tap uses `cycleBeatBlock`. Color does not cycle on tap.

VALIDATION: Recovery: `const CELL = 84`. Inner slots `filled = strength >= fromBottom`.

---

## 16. CLASSIC PRO — MODE STRIP TEXT FEEDBACK

**STATUS: PASS (local)**

FILES: `components/classic/ProRoom.tsx`

WHAT: Mode change shows BEAT ONLY / ACCENTS / ACCENTS ONLY / PENDULUM for ~700ms then fades (`toastOp`).

VALIDATION: Source: `setToast` + `withTiming(0, { duration: 420 })`. Not a permanent label.

---

## 17. CLASSIC PRO — FOUR TOP BARS REMAIN PERMANENT

**STATUS: PASS (local)**

FILES: `components/classic/ProRoom.tsx`

WHAT: Top `ProBeatCells` always `view="all"`. Lower strip is the mode visualization (lamps or pendulum). Pendulum does not replace the four bars.

VALIDATION: `view="all"` hardcoded on the top cells. Pendulum only inside `modeStrip`.

---

## 18. SOUND BROWSER CATEGORY COUNTS

**STATUS: PASS (local)**

FILES: `components/modals/SoundLibrarySheet.tsx`

WHAT: Small `countBadge` + muted count text. Not raw debug dump.

VALIDATION: Styles `countBadge` / `countText`. Count still shown.

---

## 19. SOUND BROWSER CATEGORY PRESENTATION

**STATUS: PASS (local)**

FILES: `constants/sound-library.ts`, `components/modals/SoundLibrarySheet.tsx`

WHAT: Families include VOICE, VOCALS / CHORUS, RHYTHMIC VOICE. Customer labels from `SOUNDS[id].label`, not raw filenames.

VALIDATION: SOUND_CATEGORIES labels. QA: 0 broken browser paths.

---

## 20. ROOM / THUMBNAIL SELECTOR — STILL NOT CLOSE ENOUGH

**STATUS: PASS (local presentation) — mockup closeness remaining on device**

FILES: `components/rooms/RoomBrowser.tsx`, `components/rooms/RoomTile.tsx`

WHAT: Larger cards (`1.28` aspect, gutter 18, gap 16), gold/bronze edge lighting, charcoal cards. Room list/order unchanged. Vertical scroll expected.

VALIDATION: Source metrics. Room nav tests still pass (11 rooms, same order).

PHYSICAL REMAINING: compare to supplied premium mockup.

---

## 21. ROOM CARD PRESS INTERACTION

**STATUS: PASS (local)**

FILES: `components/rooms/RoomTile.tsx`

WHAT: Press scale `0.972` + border lighting. `onPress` is immediate (no delayed navigation).

VALIDATION: `styles.pressed` transform. No setTimeout on enter.

---

## 22. SMART PENDULUM — EXACT EDGE GEOMETRY STILL WRONG

**STATUS: PASS (local math) — optical edge remaining on device**

FILES: `lib/pendulum-motion.ts`, `components/classic/SmartPendulumRoom.tsx`

WHAT: `tipSwingDegrees(rodHeight, viewportWidth, tipHalfWidth)` = `asin((width/2 - tipHalf)/rod)`. Span/rod from `onLayout`, not window width (avoids stage-padding overshoot). No guessed overshoot multiplier.

VALIDATION: Collection/recovery assert `tipSwingDegrees` and `viewportWidth / 2 - tipHalfWidth`. `!bobRadius + 10`.

PHYSICAL REMAINING: left/right edge on the phone.

---

## 23. SMART PENDULUM VISUAL TIMING

**STATUS: PASS (local architecture) — BPM sweep remaining on device**

FILES: `hooks/use-pendulum-phase.ts`

WHAT: Native `pulseBeat` is authority. Frame interpolation only fills until the next tick and is capped so it cannot run ahead of the last native beat.

VALIDATION: Source: on native beat change, `elapsed` snaps to native index; cap `lastNative + 0.99`. Precision tests still 0 drift on the native timeline (not this animation).

PHYSICAL REMAINING: 60/80/120/180/240 BPM on device.

---

## 24. AUDIO + VISUAL CLOCK ARCHITECTURE

**STATUS: PASS (local)**

FILES: rooms above, `hooks/use-pendulum-phase.ts`

WHAT: No JS metronome `setInterval`. Visuals use native pulse shared values. Recovery tests: practice and spotlight have no `setInterval`. Audio-session tests: engine has no JS timer.

REGRESSION: Custom clock widget still uses 60s wall-clock interval (wall time, not musical). Recorder meter timer is UI-only.

---

## 25. LED GEAR REGRESSION CHECK

**STATUS: PASS (local)**

FILES: `components/classic/LedgearRoom.tsx`

WHAT: Tap uses `cycleBeatBlock`. Resting fill `#C4382C`. Active uses configured accent (downbeat gold). No `cellFlash` overlay. State 0 height 0.

VALIDATION: Recovery: no `cellFlash`, `fillPx`, `cycleBeatBlock` import.

---

## 26. CUSTOM PAGE REGRESSION GATE

**STATUS: PASS (local)**

FILES: `lib/custom-layout.ts`, `CustomEditor.tsx`

WHAT: Clamp only for recoverability under the editor header. No auto-grid / recenter / neaten of valid placements.

VALIDATION: Custom-layout tests still pass odd-card centering, photo migration, widget clamp, one-tap picker.

---

## 27. PULSE REGRESSION GATE

**STATUS: PASS (local)**

FILES: Pulse room files not modified in this pass.

VALIDATION: `git diff` vs checkpoint does not include Pulse room internals. Pulse math tests still pass angle map, annular hit, privacy restore.

---

## 28. IMMERSIVE ROOM REGRESSION GATE

**STATUS: PASS (local)**

FILES: Studio / Altered / After Dark internals not modified. Selector tiles only.

VALIDATION: Recovery: ImmersivePreviewTile still required. Room list unchanged.

---

## 29. AUDIO QA STRESS TEST

**STATUS: PASS (local native harness) — 50-cycle device remaining**

FILES: `PocktTimingEngine.swift` `audioLifecycleStress` (50 start/stop), JS test suites

VALIDATION: Local npm test + tsc. Native 50-cycle exists in engine. Cannot run 50 Play/Stop on a physical iPhone from this Windows workspace.

PHYSICAL REMAINING: full room/BPM/sound/bg-fg/recorder matrix on TestFlight.

---

## 30. FINAL SELF-REVIEW

**STATUS: PASS**

Findings fixed before build:
- Pulse tests still expected old Pro accent-as-fill and `wall-sconce` string → tests updated to rest-fill + `sconce`.
- Vocal A/B presets were pairing to shout/call instead of the related B sample → `SOUND_ACCENT_PAIR` now uses A/B pairs.
- Legacy `voice-count` could resolve as a playable id without a native WAV → mapped through `STALE_SOUND` to `lib-vocal-male` (not pocket click). Hidden from browser.
- `cycleBeatBlock` comment said the wrong cycle order → corrected.

Inspected: no permanent Beatline/Pro accent fill; shared 0–3 cycle; hollow 0; keepCapture; no JS musical clock; pendulum `asin` math; Pulse/immersive not redesigned; Pro rotary (`SafeDial`) untouched.

---

## 31. REQUIRED FINAL PASS REPORT

**STATUS: PASS**

This document is the numbered report. User-facing copy is in the chat.

---

## 32. BUILD + TESTFLIGHT

**STATUS: PASS (upload). Apple processing / device QA remaining.**

- Version: `12.10.0`
- Build number: **57** (EAS remote autoIncrement 56 → 57). Do not use 56.
- EAS project: `@money-test/POCKT` (`c96ab221-1c37-49b7-85ad-9c02d3412efe`) — unchanged
- Bundle ID: `com.moneytest.pockt` — unchanged
- ASC app: `6803804512` — unchanged
- EAS build: finished — https://expo.dev/accounts/money-test/projects/POCKT/builds/7a7ee2e6-e02a-4909-a79d-9759af8ca75b
- IPA: https://expo.dev/artifacts/eas/YRhFm906-YidgtaqlIpyzwLXJdtw7sf3E9vno5YGqvE.ipa
- Submit: uploaded to existing App Store Connect / TestFlight (`eas submit` exit 0)
- Public App Store metadata: not changed
- Native extra in 57: `restorePlaybackGraph` keeps `inputCapture` and skips player disconnect while recording (`skipRebuild`)

PHYSICAL DEVICE PRIORITY remains after the build appears in TestFlight. Install **57**.

---

## 33. VOCAL / CHORUS / COUNT LIBRARY EXPANSION

**STATUS: PASS for curated vocals — COUNT BLOCKED**

FILES: 10 new production WAVs in `assets/audio/library/` + `modules/pockt-timing/ios/Clicks/`; registry in types/sounds/click-assets/click-bank/PocktClickBank/prepare-production-audio; browser families VOICE / VOCALS / CHORUS / RHYTHMIC VOICE.

WHAT SHIPPED (customer names, not raw filenames): Female/Male Hit + B, Effort + Effort M, Emote + Emote B, Ooh, Ahh Deep, Chorus + Chorus B. Related normal/accent pairs.

COUNT BLOCKED: `docs/POCKT_AUDIO_CATALOG.json` `isolatedSpokenCountingExists: false`, `isolatedSpokenCounting: []`. Packs 03/05/06/07 were inventoried (6704 files). No isolated ONE–EIGHT number recordings. Did not invent/relabel dialogue as counting. Legacy `voice-count` id is hidden and stale-mapped.

CHORUS: no true choir in source. Closest legitimate material is 07 layered/chamber vocals, curated as CHORUS / CHORUS B (honest naming).

VALIDATION: sound-qa native+Metro rows for all new ids; prepare-production-audio previously succeeded for these files.

AUDIBLE DEVICE remaining: listen to each new vocal on phone.
