# POCKT Fidelity Pass Checklist (Tasks 1–110)

**Date:** 2026-08-26  
**Project:** `C:\Apps\POCKT`  
**Rule:** PASS = implemented + validated + regression-checked. BLOCKED includes exact reason.

**Baseline**
- Branch: `master`
- Starting HEAD before this pass: `a2b2edf` (forensic freeze) then uncommitted forensic work
- Checkpoint commit: `6216242` (`checkpoint: freeze forensic audio and classic-room work before visual fidelity pass`)
- Tag: `checkpoint-pre-fidelity-2026-08-26`
- Fidelity work proceeds on `master` after that checkpoint
- Bundle ID (unchanged): `com.moneytest.pockt`
- EAS project (unchanged): `c96ab221-1c37-49b7-85ad-9c02d3412efe`
- ASC app (unchanged): `6803804512`

**Local validation this pass**
- `npx tsc --noEmit` PASS
- `npm test` PASS
- `node scripts/sound-qa.js` PASS (0 broken browser paths)
- Ident WAV regenerated: `d-major-rise`, 2.20s, peak 0.62, played via Windows `SoundPlayer` to completion
- `POCKT_AUDIO_SOURCE/` remains gitignored + easignored; Metro blocklist in `metro.config.js`

---

## PHASE 0 — Protect the current build

### 0. Inspect / checkpoint / identity

STATUS: PASS  
FILES CHANGED: git checkpoint only (`6216242`, tag `checkpoint-pre-fidelity-2026-08-26`)  
VALIDATION: `git rev-parse HEAD` after checkpoint = `62162426b52568aae31679bab06800d460ac8b48`. Bundle ID / EAS / ASC unchanged in `app.json` + `eas.json`.  
REGRESSION CHECK: No Heart/Sundown/Roots/Heavy/Tempo rooms in `CLASSIC_ROOM_ORDER` / `IMMERSIVE_ROOM_ORDER` / `CUSTOM_ROOM_ORDER`. Room nav tests still list 11 intended rooms.

---

## PHASE 1 — Opening sonic logo (1–5)

### 1–3. Reject chaotic collage; compose a musical ident

STATUS: PASS (asset + local listen)  
FILES CHANGED: `scripts/prepare-production-audio.js`, `assets/audio/pockt-ident-v94.wav`, `modules/pockt-timing/ios/Clicks/pockt-ident.wav`, `docs/POCKT_SOUND_SOURCES.md`, `constants/ident.ts`  
VALIDATION: Previous mix (blip + wood + bell + kick + timpani) removed. New `composeMusicalIdent` is additive D-major sines only: 2.20s, peak 0.62, no vocal, no percussion collage. Windows `SoundPlayer` played the production WAV to completion (~3.4s including host overhead).  
REGRESSION CHECK: Native copy written beside Metro asset. Library one-shots still prepared from `POCKT_AUDIO_SOURCE` but source pack is not bundled.

### 4. Haptic synchronization

STATUS: PASS (code-level)  
FILES CHANGED: `constants/ident.ts`, `components/intro/BrandedIntro.tsx`  
VALIDATION: Only `hapticIdentFinal` is scheduled, at `IDENT_HAPTIC_FINAL_MS = 1520` (resolution chord). Bass/second ident haptics no longer fire.  
REGRESSION CHECK: Device rumble intensity remains a physical-device check.

### 5. Startup playback

STATUS: PASS (code-level)  
FILES CHANGED: `components/intro/BrandedIntro.tsx` (haptic only; native preview path preserved)  
VALIDATION: Native `PocktTiming.preview('pockt-ident')` is not paused on unmount. Visual fade starts at 1760ms while 2200ms buffer can finish. `identPlayed` still gates once-per-launch.  
REGRESSION CHECK: Device “does not overlap / does not break metronome” is physical.

---

## PHASE 2 — Beatline 0/1/2/3 (6–13)

### 6–12. Hollow 0, filled 1, medium 2, tall 3, center growth, shared architecture

STATUS: PASS (code + static tests)  
FILES CHANGED: `components/classic/BeatCapsuleStrip.tsx`  
VALIDATION: `STATE_HEIGHT = [0.22, 0.22, 0.58, 1]`, fat `STATE_WIDTH`, gap 2, center `justifyContent`. State 0 is `backgroundColor: 'transparent'` + 1.5px outline only. Recovery tests assert hollow + shared heights. Cycle remains `cycleAccent` 0→1→2→3→0.  
REGRESSION CHECK: Mechanical still uses the same strip. Pixel compare vs screenshot is physical.

### 13. State 0 silent

STATUS: PASS (existing native path)  
FILES CHANGED: none in engine this pass  
VALIDATION: `PocktTimeline.swift` / `PocktAudioChunkRenderer.swift` already skip `accentLevel == "mute"`. Self-test `muteRenderProof` remains.  
REGRESSION CHECK: No JS scheduler added.

---

## PHASE 3 — Accent/color configuration (14–17)

### 14. Dedicated accent control

STATUS: PASS  
FILES CHANGED: `components/classic/BeatlineRoom.tsx`  
VALIDATION: Dock right control is a fader-pair button calling `onOpenAccents`. Primary beat row is unchanged.  
REGRESSION CHECK: MIX + volume remain.

### 15–16. Level editor + color assignment

STATUS: PASS  
FILES CHANGED: `components/screens/AccentsScreen.tsx`, `lib/accents.ts` (`levelTint`), `constants/display.ts`, `storage/display-prefs.ts`  
VALIDATION: LEVEL 1/2/3 cards; selected card enlarges; Demo previews that level’s role sound; Color swatches write `accentColor` / `accentSecondaryColor` / `accentStrongColor`. State 0 is not a color role. Defaults unified to `#F4F6FA` so live taps no longer walk gold/red. Old gold/red defaults migrate.  
REGRESSION CHECK: Pulse swatches independent. Sound Studio remains the sound browser.

### 17. Tap cycles level only

STATUS: PASS  
FILES CHANGED: `BeatCapsuleStrip.tsx` (still `cycleAccent` only)  
VALIDATION: Live tap does not call swatch migration. Color comes from the configured level tint.  
REGRESSION CHECK: LED Gear rest fill is chassis red by height, not a palette walk.

---

## PHASE 4 — Beatline light (18–19)

STATUS: PASS (code)  
FILES CHANGED: `components/classic/BeatlineSpotlight.tsx`, `BeatlineRoom.tsx`  
VALIDATION: PNG flashlight cone removed. Full-width (~132% viewport) rounded wash, LinearGradient fade to transparent, color from configured levels, opacity from master `pulse`. Mute (strength < 0.5) emits no wash.  
REGRESSION CHECK: Pulse room visuals untouched. Device taste is physical.

---

## PHASE 5 — BPM wheel (20–21)

STATUS: PASS  
FILES CHANGED: `components/classic/TempoRuler.tsx`  
VALIDATION: Gesture math still `originBpm - translationX * gain / SPACING`. Visual-only: proximity tick scale, barrel shade, wider fades, taller well.  
REGRESSION CHECK: Pulse two-turn tests still pass.

---

## PHASE 6 — Classic Dial (22–26)

STATUS: PASS (code vs attached Dial reference)  
FILES CHANGED: `components/classic/DialRoom.tsx`  
VALIDATION: `DEG_PER_BPM` 1:1 unwrap preserved. Pan excludes only the hub so Play tap still works; ring activation no longer fails outside a narrow band. BPM commits continuously while dragging; number still opens pad. Outer beat ring is 14 ticks per beat that all illuminate together; downbeat red vs cyan. Radial ticks still rotate with BPM and brighten while dragging.  
REGRESSION CHECK: `SafeDial` rotary math not rebuilt. Pixel-perfect device compare remains physical.

---

## PHASE 7 — Classic Pro (27–35)

STATUS: PASS  
FILES CHANGED: `components/classic/ProBeatCells.tsx` (geometry); `ProRoom.tsx` untouched this pass for rotary / strip  
VALIDATION: Four `CELL=84` bars always rendered with `view="all"`. Interior 3 slots show 0/1/2/3; outer size fixed. Tap uses `cycleAccent` only. Active beat fills the whole inner cell (no hatch). Lower strip still cycles ALL BEATS / ACCENTS+SUBACCENTS / ONLY ACCENTS / PENDULUM. Pendulum is a horizontal bar; top bars keep flashing. Colors from display prefs.  
REGRESSION CHECK: Pulse tests still require Exclusive SafeDial + no `flashFill`.

---

## PHASE 8 — Smart Pendulum (36–39)

STATUS: PASS (geometry + resync)  
FILES CHANGED: `lib/pendulum-motion.ts`, `components/classic/SmartPendulumRoom.tsx`, `hooks/use-pendulum-phase.ts`  
VALIDATION: `tipSwingDegrees(rodHeight, viewportWidth, 2.5)` = `asin((width/2 - tipHalfWidth) / rodHeight)`. Collection test: 300px rod / 390px view travel = 192.5px (edge minus tip half-width). Removed `+10` overshoot and 28–82° clamp. Pulse resync threshold 0.35 / 0.06 beats. Eggshell plate unchanged.  
REGRESSION CHECK: Mechanical still shares `usePendulumPhase`. Device “exactly the bezel” is physical.

---

## PHASE 9 — LED Gear (40–43)

STATUS: PASS  
FILES CHANGED: `components/classic/LedgearRoom.tsx`  
VALIDATION: Tap still `cycleAccent` (levels only). Rest LED is chassis `#C4382C` with height 0/18/36/56. Active illuminates that cell; downbeat `#FFE08A`. Shared accent colors used for the hit tint. No `cellFlash` overlay.  
REGRESSION CHECK: COLOR still opens Accents. Frame edge pulse remains.

---

## PHASE 10 — Sound browser (44–50)

### 44. Hierarchy audit

STATUS: PASS  
VALIDATION: Upper chips were mix presets that applied a sound+roles but did not change the family grid. Lower cards were families/filters. Mixes and families competed. Favorites = starred list. Individual rows = sounds.

### 45–47. One hierarchy; mixes meaningful; universal browser

STATUS: PASS  
FILES CHANGED: `constants/sound-library.ts`, `components/modals/SoundLibrarySheet.tsx`  
VALIDATION: Home is family cards only (Favorites, MIXES, Classic, Wood, …). No second chip row. MIXES lists Classic/Studio/Wood/Deep Mix; selecting one applies the mix and opens the related family (`mixFamilyForPreset`). One Sound Studio across rooms.  
REGRESSION CHECK: Advanced beat assignment still behind disclosure.

### 48–50. Favorites, apply, preview isolation

STATUS: PASS (code-level)  
VALIDATION: Favorites family filters `favoriteSounds` live (unstar removes row). Select requires `CLICK_MODULES`. Preview uses native `preview` / `cancelPreview` (prior engine work). Sound QA: 0 broken browser paths.  
REGRESSION CHECK: Device no-stacking / persistence-after-relaunch is physical.

---

## PHASE 11 — Pick Your Pocket (51–60)

STATUS: PASS (code vs attached selector)  
FILES CHANGED: `components/rooms/RoomBrowser.tsx`, `components/rooms/RoomTile.tsx`  
VALIDATION: Deeper charcoal, restrained metallic type, two-column classic grid, LED Gear featured full-width, immersive 3-up, Custom full-width with “Build your own Pocket.” + tempo/sound/way hints. Press scale 0.978. Header compacted. Section rules refined. Previews still `ClassicPreviewCard` / immersive / custom. No new rooms.  
REGRESSION CHECK: Room nav tests still 11 rooms. Custom layout tests pass. Pulse/Custom internals not rewritten.

---

## PHASE 12 — Protect working features (61–66)

### 61. Pulse

STATUS: PASS  
FILES CHANGED: none in PulseRoom this pass  
VALIDATION: Pulse two-turn tests still pass (`manualActivation` annular hit unchanged).

### 62. Classic Pro rotary

STATUS: PASS  
VALIDATION: `SafeDial.tsx` not rebuilt; pulse tests still require Skia + wrapDelta.

### 63. Custom editing

STATUS: PASS  
VALIDATION: `npm run test:custom` (via `npm test`) PASS — freeform, no snap.

### 64. Immersive rooms

STATUS: PASS  
VALIDATION: Only selector tiles/presentation changed. Collection tests still require ImmersivePreviewTile focals.

### 65. Navigation

STATUS: PASS (static)  
VALIDATION: Room nav tests: beatline → pulse → dial → pro → smart-pendulum → pendula-classic → ledgear → customized → studio → altered → after-dark.

### 66. Apple identity

STATUS: PASS  
VALIDATION: `com.moneytest.pockt`, EAS `c96ab221-1c37-49b7-85ad-9c02d3412efe`, ASC `6803804512`.

---

## PHASE 13 — Audio / timing gates (67–69)

### 67–69. Immediate tempo, visual sync, haptics

STATUS: PASS (architecture)  
VALIDATION: Precision tests: 13 phase changes, rapid drag, 0 restarts. Visuals consume `pulse` / `pulseBeat` from native events. Pendulum integrates BPM and resyncs to pulse peaks. Haptics remain native-scheduled.  
REGRESSION CHECK: Device drift listen is physical.

---

## PHASE 14 — Error / race audit (70–84)

STATUS: PASS (code-level) / BLOCKED (device matrix)

| Task | Status | Note |
|---|---|---|
| 70 Audio init failures | PASS (code) | Prior start-in-flight throw + logging remain |
| 71 Repeated Play/Stop | BLOCKED | Needs device |
| 72 Rapid Play/Stop | BLOCKED | Needs device |
| 73 Sound change while playing | PASS (code) | `setConfig` sound patches while playing (prior) |
| 74 Room change while playing | BLOCKED | Needs device |
| 75 Preview then selection | PASS (code) | Separate preview node |
| 76 Close browser during preview | PASS (code) | `cancelPreview` on close path (prior) |
| 77 Background → foreground | BLOCKED | Needs device |
| 78 Stuck privacy curtain | PASS (code) | `onFinalize` settle (prior); pulse tests assert restore |
| 79 Partial curtain cancel | PASS (code) | Same |
| 80 Fast navigation | BLOCKED | Needs device |
| 81 Double taps | BLOCKED | Needs device |
| 82 Stale persisted state | PASS (code) | Accent default migration; stale rooms still map home |
| 83 Unhandled promises | PASS (code) | Ident/preview catches remain |
| 84 Silent asset failures | PASS (code) | Sound QA 0 broken paths; native logs missing buffers |

---

## PHASE 15 — Automated validation (85–86)

### 85. Sound registry

STATUS: PASS  
VALIDATION: `node scripts/sound-qa.js` — 0 broken browser paths; 67 registered IDs; 62 family entries.

### 86. Source-library safety

STATUS: PASS  
VALIDATION: `.gitignore` + `.easignore` + Metro blocklist include `POCKT_AUDIO_SOURCE/`. Only curated `assets/audio/library` + `ios/Clicks` ship.

---

## PHASE 16 — Local QA before TestFlight (87–110)

| Task | Status | Validation |
|---|---|---|
| 87 Opening ident architecture | PASS | `d-major-rise` 2.20s, Windows play completed |
| 88 Beatline hollow 0 | PASS | transparent fill + outline; recovery test |
| 89 0→1→2→3→0 | PASS | `cycleAccent` + shared STATE_HEIGHT |
| 90 Accent menu | PASS | AccentsScreen level cards |
| 91 Colors not from beat taps | PASS | tap = cycleAccent only; defaults unified |
| 92 Wide light | PASS | 1.32× viewport wash |
| 93 BPM gesture preserved | PASS | same pan formula |
| 94 Dial rotary | PASS | DEG_PER_BPM unwrap, hub excluded |
| 95 Dial beat illumination | PASS | grouped outer ticks |
| 96 Pro four bars | PASS | always rendered |
| 97 Pro 0/1/2/3 | PASS | 3 interior slots |
| 98 Lower visualization strip | PASS | unchanged cycle |
| 99 Scanner-bar pendulum | PASS | horizontal bar in strip |
| 100 Smart Pendulum edge | PASS | tipSwingDegrees math test |
| 101 Smart Pendulum sync | PASS (code) | pulse resync; device feel physical |
| 102 LED 0/1/2/3 | PASS | height fillPx |
| 103 LED no random colors | PASS | rest LED red; tap changes height |
| 104 Sound Browser hierarchy | PASS | one family step |
| 105 Favorites | PASS (code) | live filter |
| 106 Preview | PASS (code) | isolated preview |
| 107 Selected sound playback | PASS (code) | CLICK_MODULES + QA |
| 108 Room selector | PASS | featured LED + Custom copy |
| 109 Pulse regression | PASS | pulse tests |
| 110 Custom regression | PASS | custom layout tests |

---

## PHASE 17 — Stress QA

STATUS: BLOCKED  
REASON: 50 Play/Stop, multi-room, Bluetooth/route, background/foreground require a physical iPhone native AVAudioEngine path. Simulator/browser is not that path.  
MISSING: Device run of the stress sequence.  
CODE READY: start-in-flight throw, preview node, sound `setConfig` while playing.

---

## PHASE 18 — Independent second review

STATUS: PASS  
VALIDATION: Reviewed diff for leftover percussion ident, guessed pendulum `+10`, competing mix chips, Pulse/SafeDial edits, stale-room resurrection, and `POCKT_AUDIO_SOURCE` bundling. Fixes applied: Dial syntax, RoomBrowser `Props`, spotlight centering, old accent default migration, test assertions.  
REGRESSION CHECK: `npm test` + `tsc` green after review.

---

## PHASE 19 — This report

STATUS: PASS  
FILES CHANGED: `docs/POCKT_FIDELITY_CHECKLIST.md`  
VALIDATION: Tasks 1–110 listed PASS or BLOCKED with reason.

---

## PHASE 20 — TestFlight

STATUS: BLOCKED — EAS iOS **build 55 succeeded**; App Store Connect **upload failed** (Expo Submit outage: “iOS submissions failing on upload to App Store Connect”).  
BUILD: `12.10.0` (55) `@money-test/POCKT` bundle `com.moneytest.pockt` ASC `6803804512`  
EAS BUILD: https://expo.dev/accounts/money-test/projects/POCKT/builds/fdd6378a-92d0-4cbd-b96b-269fc99f717b  
IPA: https://expo.dev/artifacts/eas/AW5tNJdswUn9wHgEQFfDnlKjWHYYkA1E11kz0ma7Nlo.ipa  
SUBMIT ATTEMPTS: `d7f14c7b-ca71-444e-a74b-a82be0d0bd0d`, retry `ae9386ec-638f-48ad-bd22-13e3ae1085a1` both **errored**  
MISSING: Successful ASC/TestFlight processing. Retry `npx eas submit --platform ios --id fdd6378a-92d0-4cbd-b96b-269fc99f717b --profile production` when https://status.expo.dev/ is healthy.  
IDENTITY: No new Apple app, bundle ID, or EAS project.
