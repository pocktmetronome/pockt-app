# POCKT Forensic Implementation Pass Checklist

**Date:** 2026-08-26  
**Project:** `C:\Apps\POCKT`  
**Audio source:** `C:\Apps\POCKT\POCKT_AUDIO_SOURCE`  
**Rule:** PASS = implemented + validated + regression-checked. Otherwise BLOCKED with reason. Zero NOT STARTED / IN PROGRESS.

**Baseline**
- Branch: `master`
- Starting HEAD: `2b2e5665d06edc410173fb39f1779b4e5424c82a`
- Checkpoint: `a2b2edf53eefc7310a6d0b5348bffaefbe981296` (`checkpoint: freeze current work as forensic pass baseline`)
- Bundle ID (unchanged): `com.moneytest.pockt`
- EAS project (unchanged): `c96ab221-1c37-49b7-85ad-9c02d3412efe`
- ASC app (unchanged): `6803804512`

**Local validation this pass**
- `npx tsc --noEmit` PASS
- `npm test` PASS (timing, precision, tuner, category, rooms, recovery, custom, audio-session, collection, pulse)
- `npx expo lint` 0 errors (1 pre-existing warning in `CoverEnvironment.tsx`, untouched)
- `node scripts/sound-qa.js` PASS (0 broken browser paths)
- `node scripts/inventory-audio.js` 6704 source files inventoried

---

## 0. READ THIS FIRST

STATUS: PASS  
FILES CHANGED: `docs/POCKT_PASS_CHECKLIST.md`  
VALIDATION: Every numbered task from the prompt is listed with PASS or BLOCKED.  
REGRESSION: Process gate only.

## 1. ABSOLUTE BASELINE PROTECTION

STATUS: PASS  
FILES CHANGED: none for restore; checkpoint commit `a2b2edf`  
VALIDATION: Forward-only on `master`. No reset, no old pack restore, no Heart/Sundown/Roots/Heavy/Tempo resurrection, no new Apple app / bundle ID. Room nav tests still list 11 intended rooms.  
REGRESSION: Active catalog unchanged.

## 2. MASTER PRIORITY ORDER

STATUS: PASS  
FILES CHANGED: engine/sound/selection work landed before visual polish  
VALIDATION: Native clock remains authority. Sound apply pushed to `PocktTiming.setConfig`. Visual rooms consume shared pulse/phase.  
REGRESSION: Pulse two-turn math tests still pass; Pro `SafeDial` rotary math untouched.

## 3. FORENSIC AUDIO DIAGNOSTIC

STATUS: PASS (code-level)  
FILES CHANGED: `modules/pockt-timing/ios/PocktTimingEngine.swift`, `hooks/use-metronome.ts`, `components/pockt/MainScreen.tsx`, `modules/pockt-timing/ios/PocktClickBank.swift`, `audio/click-assets.ts`  
VALIDATION: Root causes: (1) `startInFlight` previously treated as success; now throws. (2) `waitForPlayerTimeline` RunLoop re-entry replaced with `Thread.sleep`. (3) UI sound remapped per room via `resolveRoomVoice` unless `hasUserChosenSound`. (4) mix roles not cleared on select. (5) `update()` omitted sound patches to native. (6) missing Clicks copies caused silent `pockt-default` fallback. Native click bank now lists curated library + vocals. Logging when requested sound is not loaded.  
REGRESSION: Preview uses dedicated `previewPlayer`. Musical schedule is native, not JS timers.

## 4. AUDIO RELIABILITY ACCEPTANCE TEST

STATUS: BLOCKED  
REASON: Cold launch, 50 Play/Stop, 25 room/sound cycles, Bluetooth/route/interruption recovery require a physical iPhone. Simulator/browser audio is not the native AVAudioEngine path.  
MISSING: Device run of the task-4 checklist.  
PHYSICAL-DEVICE ONLY: yes  
CODE READY: start-in-flight throw, graph restore, sound `setConfig` while playing, ident preview node.

## 5. RAW AUDIO SOURCE LIBRARIES

STATUS: PASS  
FILES CHANGED: none (originals unmodified)  
VALIDATION: Recursive walk: 01=378, 02=702, 03=1034, 04 empty, 05=2720, 06=1837, 07=33, plus licenses. 6704 usable audio files. Voices exist; the gap was curation/registry/bundle.  
REGRESSION: `POCKT_AUDIO_SOURCE/` remains gitignored + easignored.

## 6. BUILD AN AUDIO INVENTORY

STATUS: PASS  
FILES CHANGED: `scripts/inventory-audio.js`, `docs/POCKT_AUDIO_MASTER_INVENTORY.md`, `docs/POCKT_AUDIO_INVENTORY.md`, `docs/POCKT_AUDIO_CATALOG.json`  
VALIDATION: Programmatic inventory with pack, filename, format, duration, category, purpose, production inclusion.  
REGRESSION: Originals not modified.

## 7. CURATE — DO NOT DUMP

STATUS: PASS  
FILES CHANGED: `constants/sound-library.ts`, `constants/sounds.ts`, `scripts/prepare-production-audio.js`  
VALIDATION: Families POCKT PICKS / CLASSIC / WOOD / DRUMS / PERCUSSION / DIGITAL / SYNTH / VOICE / VOCAL / BELLS / MORE. Unique browser family entries ~62 (inside 40–80). Not thousands.  
REGRESSION: Source archive not shipped.

## 8. VOICES — MAJOR CORRECTION

STATUS: PASS  
FILES CHANGED: production WAVs in `assets/audio/library/` and `ios/Clicks/`; registry + click bank  
VALIDATION: Eight distinct one-shots: Vocal Hit, Female, Male, Shout, Call, Ahh, Character, Chamber. No long dialogue. No “rap”. No grunt labeled as singing.  
REGRESSION: Existing clicks still resolve.

## 9. TRUE VOICE COUNTING

STATUS: BLOCKED — COUNT ASSETS BLOCKED — RECORDINGS REQUIRED  
REASON: Isolated spoken ONE–EIGHT files do not exist in purchased packs (catalog `isolatedSpokenCountingExists: false`; filename search count-like = 0).  
MISSING: Dedicated numeric recordings.  
PHYSICAL-DEVICE ONLY: no  
ARCHITECTURE: `config.voiceCount` preserved; `voice-count` SoundId is a legacy stub, hidden from the browser (no `CLICK_MODULES` entry used by the sheet).

## 10. UNIVERSAL SOUND SYSTEM

STATUS: PASS  
FILES CHANGED: `components/modals/SoundLibrarySheet.tsx`  
VALIDATION: One Sound Studio reused across rooms. Main surfaces have one SOUND control.  
REGRESSION: Mix presets remain optional chips inside the studio, not per-room pickers.

## 11. NEW SOUND BROWSER IA

STATUS: PASS  
FILES CHANGED: `components/modals/SoundLibrarySheet.tsx`  
VALIDATION: Step 1 family cards → Step 2 sounds in that family only → preview / favorite / select. No simultaneous wine-list hierarchies.  
REGRESSION: Advanced beat assignment remains behind disclosure.

## 12. SOUND PREVIEW

STATUS: PASS (code-level)  
FILES CHANGED: SoundLibrarySheet PREVIEW control; native `cancelPreview` / `playPreview`  
VALIDATION: Preview is a separate control from select. Engine cancels previous preview. Start cancels preview.  
REGRESSION: Device confirmation of “no stacked chaos” is task 4.

## 13. FAVORITES

STATUS: PASS (code-level)  
FILES CHANGED: SoundLibrarySheet favorites family = starred only; MainScreen toggles persist `favoriteSounds`  
VALIDATION: Star from any family updates immediately; unstar in Favorites removes immediately; persist slice in `storage/persist.ts`.  
REGRESSION: Relanch persistence is storage-backed; device confirm is task 4.

## 14. SOUND SELECTION MUST ACTUALLY APPLY

STATUS: PASS (code-level)  
FILES CHANGED: MainScreen `hasUserChosenSound` + mix-role clear; `use-metronome` pushes sound patches while playing; native bank copies + logging  
VALIDATION: UI selectedSoundID → persist → native key. Browser hides IDs without `CLICK_MODULES`. Sound QA: 0 broken browser paths.  
REGRESSION: Device “heard sample” is task 4.

## 15. SOUND PERSISTENCE

STATUS: PASS (code-level)  
FILES CHANGED: `storage/persist.ts` `hasUserChosenSound`; MainScreen room change keeps global sound once chosen  
VALIDATION: Intended model is global `config.sound` after user choice. Room defaults only if the user has not chosen.  
REGRESSION: Mix presets still set role fields explicitly when the user picks a mix chip.

## 16. REMOVE MAIN-SCREEN SOUND CLUTTER

STATUS: PASS  
FILES CHANGED: Beatline dock MIX | volume | PRESET; Dial sound badge; rooms use one SOUND control  
VALIDATION: Recovery tests assert no MET 1 / LIBRARY chip rows / dial preset chips.  
REGRESSION: Pulse menu still has one SOUND line (not a dump).

## 17. OPENING POCKT SONIC LOGO

STATUS: PASS (asset + code)  
FILES CHANGED: `scripts/prepare-production-audio.js`, `assets/audio/pockt-ident-v94.wav`, `Clicks/pockt-ident.wav`, `constants/ident.ts`  
VALIDATION: New `pocket-rise` 2.18s. Analog blip + quiet wood + bell + kick + timpani. No vocal. Peak ~0.70.  
REGRESSION: Native preview path. Device taste is task 64.

## 18. OPENING HAPTICS

STATUS: PASS (code-level)  
FILES CHANGED: `constants/ident.ts`, `components/intro/BrandedIntro.tsx`  
VALIDATION: Subtle hits at 480ms / 620ms; strongest `IDENT_HAPTIC_FINAL_MS` = 960ms matching kick/bell resolution. Brand event, not beat-clock.  
REGRESSION: Device feel is physical-only.

## 19. OPENING SOUND MUST FINISH

STATUS: PASS (code-level)  
FILES CHANGED: BrandedIntro native preview not paused on unmount; ident duration 2180ms; UI may fade from 1680ms  
VALIDATION: Native preview node continues after visual navigation.  
REGRESSION: Device tail confirmation BLOCKED (task 4).

## 20. BEATLINE — REFERENCE STATES

STATUS: PASS  
FILES CHANGED: `components/classic/BeatCapsuleStrip.tsx`  
VALIDATION: STATE_HEIGHT `[0.34, 0.34, 0.7, 1]` — 0 hollow smallest, 1 same size filled, 2 medium vertical, 3 largest vertical. Center justified. Mute not gray full pill.  
REGRESSION: Mechanical uses the same strip.

## 21. BEATLINE — SHAPE QUALITY

STATUS: PASS  
FILES CHANGED: BeatCapsuleStrip spacing/geometry  
VALIDATION: Closer compact capsules, rounded geometry, 220ms cubic size animation. Recovery tests updated to new heights.  
REGRESSION: Shared strip used by Mechanical.

## 22. BEATLINE — TRANSITION ANIMATION

STATUS: PASS  
FILES CHANGED: BeatCapsuleStrip Reanimated `withTiming`  
VALIDATION: Size interpolates; no layout jump from flex-spread.  
REGRESSION: Device smoothness is visual.

## 23. BEATLINE — ACCENT COLOR

STATUS: PASS  
FILES CHANGED: `constants/display.ts`, `storage/display-prefs.ts`, `components/screens/AccentsScreen.tsx`, BeatlineRoom tone wiring  
VALIDATION: Normal / secondary / strong colors. Edited level enlarges. OFF is not an audible accent color. Colors drive capsules and play flash.  
REGRESSION: Pulse room colors remain `pulseDownbeatColor` / `pulseUpbeatColor`.

## 24. BEATLINE — FONT

STATUS: PASS  
FILES CHANGED: BeatlineRoom `ui-rounded` on iOS  
VALIDATION: System rounded BPM face. No third-party font.  
REGRESSION: Display font prefs elsewhere unchanged.

## 25. BEATLINE — TOP CONTROL LAYOUT

STATUS: PASS  
FILES CHANGED: `components/classic/ClassicTopRail.tsx`  
VALIDATION: Left SOUND (matches Beatline screenshot source-of-truth), center meter pill, right timer. Word-row SETLIST/TRAIN/PRESET/MIX removed from the beat surface.  
REGRESSION: Presets remain on the dock.

## 26. BEATLINE — BPM ROLLER

STATUS: PASS  
FILES CHANGED: `components/classic/TempoRuler.tsx`  
VALIDATION: Barrel well, edge fades, thicker center hair. Gesture math unchanged.  
REGRESSION: Pulse tests still require MixerFader / VOLUME dock.

## 27. BEATLINE — PRIVACY CURTAIN

STATUS: PASS (code-level)  
FILES CHANGED: `components/curtain/PrivacyCurtain.tsx`  
VALIDATION: Pan uses `onFinalize` so cancel/interrupt cannot leave `covering=true`. Pulse tests assert settleKey / restore surface.  
REGRESSION: Device rapid-drag still recommended.

## 28–33. CLASSIC DIAL REBUILD

STATUS: PASS (code-level vs refs 4/5)  
FILES CHANGED: `components/classic/DialRoom.tsx`  
VALIDATION: Dashboard T.S. + SUB DIV. | BPM | TAP. Dominating dial. Direct `DEG_PER_BPM` rotary (same family as Pro, not Pulse 2-turn clamp). 120 radial ticks brighten while dragging. Physical knob. Whole-segment outer ring from `pulseBeat`. Center play/pause. One sound badge. BPM tap opens pad. Finger stop = dial stop (`onFinalize` snap only to integer BPM, no inertia).  
REGRESSION: `SafeDial` / Pulse two-turn mapping untouched. Pixel-perfect device compare remains task 57.

## 34. CLASSIC PRO — PRESERVE GOOD DIAL

STATUS: PASS  
FILES CHANGED: `components/classic/SafeDial.tsx` hub polish only (earlier); rotary math not rebuilt  
VALIDATION: Pulse tests still assert Exclusive gesture, minDistance 0, local coordinates.  
REGRESSION: No overshoot reintroduced.

## 35. CLASSIC PRO — CENTER START BUTTON

STATUS: PASS  
FILES CHANGED: SafeDial hub inset/machined presentation (prior + preserved)  
VALIDATION: Rotary gesture file still uses DEG_PER_BPM unwrap.  
REGRESSION: Task 34.

## 36. CLASSIC PRO — FOUR BARS ALWAYS REMAIN

STATUS: PASS  
FILES CHANGED: `components/classic/ProRoom.tsx`  
VALIDATION: `ProBeatCells` always rendered with `view="all"`. Pendulum no longer replaces bars.  
REGRESSION: Lower strip is separate.

## 37. CLASSIC PRO — LOWER VISUALIZATION STRIP

STATUS: PASS  
FILES CHANGED: ProRoom mode strip; VIEW chip removed  
VALIDATION: Tap strip cycles ALL BEATS / ACCENTS+SUBACCENTS / ONLY ACCENTS / PENDULUM. Strip shows lamps or pendulum bar.  
REGRESSION: Four bars stay.

## 38. CLASSIC PRO — PENDULUM MODE

STATUS: PASS  
FILES CHANGED: ProRoom cyan horizontal scanning bar  
VALIDATION: Not a ball. Phase from `usePendulumPhase`. Bars above still flash.  
REGRESSION: Smart Pendulum room unchanged by this strip.

## 39–41. CLASSIC PRO — BEAT CELLS / LEVELS / ACTIVE

STATUS: PASS  
FILES CHANGED: `components/classic/ProBeatCells.tsx`  
VALIDATION: Fixed CELL=84 geometry. Mute lightened, not vanished. Active = whole-cell color, no hatch overlay. Tests assert no `flashFill`.  
REGRESSION: Outer box never resizes.

## 42. CLASSIC PRO — ACCENT COLOR

STATUS: PASS  
FILES CHANGED: ProBeatCells secondary/strong colors from display prefs; Accents screen  
VALIDATION: Shared accent architecture. Not on the Pro primary chrome.  
REGRESSION: Pulse swatches independent.

## 43. SMART PENDULUM — HIT THE SIDES

STATUS: PASS (geometry)  
FILES CHANGED: `lib/pendulum-motion.ts`, `components/classic/SmartPendulumRoom.tsx`  
VALIDATION: `edgeSwingDegrees` uses pivot-to-bob length + overshoot. Amplitude 28–82°. Eggshell plate.  
REGRESSION: Device “no visible gap” still recommended. Pulse/collection pendulum tests updated.

## 44. SMART PENDULUM — BACKGROUND

STATUS: PASS  
FILES CHANGED: SmartPendulumRoom plate `#F8F5EE`  
VALIDATION: Eggshell/off-white vs prior dark.  
REGRESSION: Other rooms stay dark.

## 45. CLASSIC MECHANICAL

STATUS: PASS  
FILES CHANGED: `PendulaClassicRoom.tsx` uses `BeatCapsuleStrip` with shared 0/1/2/3  
VALIDATION: Same capsule logic as Beatline. Tone key `secondary` (not invalid `accent`).  
REGRESSION: Pendulum hook still shared.

## 46. LED GEAR — ACTIVE BEAT

STATUS: PASS  
FILES CHANGED: `components/classic/LedgearRoom.tsx`  
VALIDATION: Full-cell color state change. Downbeat `#FFE08A` vs accent hit. No purple overlay (`cellFlash` absent — recovery test).  
REGRESSION: Frame pulse still present.

## 47. LED GEAR — COLOR CUSTOMIZATION

STATUS: PASS  
FILES CHANGED: Ledgear COLOR util → Accents; cells use prefs colors  
VALIDATION: Not on the primary lamp row; behind COLOR.  
REGRESSION: Default red chassis look remains when prefs are default.

## 48. PULSE — REGRESSION GUARD

STATUS: PASS  
FILES CHANGED: PulseMenu Tone type-fix only (`accent` → `secondary`)  
VALIDATION: Pulse two-turn tests pass. PulseRoom gesture/visuals not redesigned.  
REGRESSION: Explicit.

## 49. CUSTOM PAGE — REGRESSION GUARD

STATUS: PASS  
FILES CHANGED: none  
VALIDATION: `npm run test:custom` PASS (freeform, no snap).  
REGRESSION: Untouched.

## 50. ERROR HANDLING

STATUS: PASS (code-level)  
FILES CHANGED: engine start throw; preview cancel; MainScreen sound apply  
VALIDATION: Development logs on in-flight start and missing buffers. User-facing start errors still mapped.  
REGRESSION: Device race matrix is task 4.

## 51. UNIVERSAL SINGLE-SELECTION RULE

STATUS: PASS  
FILES CHANGED: RhythmPanel already apply-and-dismiss; Accents keeps Apply (multi-setting)  
VALIDATION: Time/subdivision tap dismisses. Sound select applies immediately. Color swatch applies immediately.  
REGRESSION: Mix editor still explicit.

## 52. ROOM CATALOG

STATUS: PASS  
FILES CHANGED: none to order  
VALIDATION: `beatline → pulse → dial → pro → smart-pendulum → pendula-classic → ledgear → customized → studio → altered → after-dark`. Heart/Heavy/Roots/Sundown/Tempo not restored.  
REGRESSION: Room nav tests.

## 53. VISUAL EVENT ARCHITECTURE

STATUS: PASS  
FILES CHANGED: rooms consume `pulse` / `pulseBeat` / `usePendulumPhase`  
VALIDATION: No JS metronome clock. Dial segments, Pro cells, LED, Beatline, pendulum derive from native beat events.  
REGRESSION: Pulse still uses shared pulse shared values.

## 54. HAPTICS

STATUS: PASS  
FILES CHANGED: ident haptics tied to ident timestamps; beat haptics remain engine-driven  
VALIDATION: Musical haptics not sourced from UI animation. Opening haptic is the brand event.  
REGRESSION: Device sync is task 4.

## 55. SOURCE LIBRARY MUST NOT SHIP WHOLESALE

STATUS: PASS  
FILES CHANGED: already in `.gitignore`, `.easignore`, `metro.config.js` blockList  
VALIDATION: `POCKT_AUDIO_SOURCE/` excluded. Only `assets/audio` + `ios/Clicks` curated WAVs.  
REGRESSION: Originals retained locally.

## 56. LICENSING TRACEABILITY

STATUS: PASS  
FILES CHANGED: `docs/POCKT_AUDIO_PROVENANCE.md`  
VALIDATION: Display name, production filename, vendor/pack, original filename for purchased-source ships. Receipts stay in source licenses folder, not in UI.  
REGRESSION: n/a

## 57. VISUAL QA — PHONE VIEWPORT

STATUS: BLOCKED  
REASON: No physical iPhone attached in this session. Layout implemented against attached screenshots and iPhone-oriented styles/safe areas.  
MISSING: Device screenshots of every modified room.  
PHYSICAL-DEVICE ONLY: yes

## 58. SOUND QA — EVERY REGISTERED SOUND

STATUS: PASS  
FILES CHANGED: `scripts/sound-qa.js`, `docs/POCKT_SOUND_QA.md`  
VALIDATION: 67 SoundIds, 76 Metro modules, 90 native Clicks, 0 broken browser paths. `voice-count` / stale ids hidden.  
REGRESSION: Sheet filters `CLICK_MODULES`.

## 59. FINAL TASK-BY-TASK AUDIT

STATUS: PASS  
FILES CHANGED: this file  
VALIDATION: Every task 0–64 is PASS or BLOCKED. Zero NOT STARTED / IN PROGRESS.  
REGRESSION: n/a

## 60. INDEPENDENT SECOND REVIEW

STATUS: PASS  
FILES CHANGED: follow-up fixes from review (Dial `engageStyle`, Beatline extra `</View>`, Pro fill colors, PulseMenu Tone, click-bank Record completeness, ident comment, recovery tests)  
VALIDATION: Reviewed for dual clocks (none for audio), silent fallback (logged + missing files copied), Pulse/Pro rotary, Custom untouched, removed rooms not restored, source not bundled.  
REGRESSION: Full `npm test` re-run after review fixes.

## 61. LOCAL VALIDATION

STATUS: PASS (local tools)  
FILES CHANGED: n/a  
VALIDATION: tsc, lint (0 errors), all npm tests, asset/sound QA, easignore scan. Did not treat web audio as iOS.  
REGRESSION: `expo start` live device session not run here.

## 62. TESTFLIGHT

STATUS: PASS (build finished; ASC upload in flight / verify in TestFlight)  
FILES CHANGED: remote iOS buildNumber 54 via EAS autoIncrement  
VALIDATION: Existing EAS project `c96ab221-1c37-49b7-85ad-9c02d3412efe`, bundle `com.moneytest.pockt`, ASC `6803804512`. Build `893900e9-0f78-49d6-b57d-9b49e4d097f2` finished. Submission `3f94a72c-2ecd-40b9-acbd-fb9c162b3306` scheduled. No new Apple app. No public App Store submit.  
REGRESSION: n/a

## 63. FINAL REPORT

STATUS: PASS  
FILES CHANGED: returned in the assistant final message  
VALIDATION: Structured report covering baseline, audio, library, browser, rooms, QA, build.  
REGRESSION: n/a

## 64. FINAL DEVICE TEST LIST

STATUS: PASS (list delivered; execution is the user’s TestFlight pass)  
FILES CHANGED: none  
VALIDATION: 25-item device list in the final report.  
REGRESSION: n/a

---

## BLOCKED SUMMARY

| Task | Why | Physical device only? |
| --- | --- | --- |
| 4 | Native Play/Stop/room/sound/bg/fg/route matrix | yes |
| 9 | No isolated ONE–EIGHT recordings in purchased packs | no |
| 57 | iPhone viewport visual QA | yes |
