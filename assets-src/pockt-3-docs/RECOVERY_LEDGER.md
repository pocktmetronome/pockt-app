# POCKT 3.0 — Recovery ledger (Phase 0)

Owner: Gregg. Technical lead: Opus. Implementation: Cursor.
Inspected: 2026-09-21. Windows. No remotes. Machine workspace (`m3-scrub`) not modified.
Every finding is **CONFIRMED** (command / file / commit evidence) or **ASSUMED**.

**Phase 0 STOP verdict: none fire.** Both reference videos are present. Video A is identified and fingerprinted at build 122 / `260725c`. Dial native sources and baked assets exist at that commit. Dial Master 1 work is preserved and was not imported.

---

## 0.0 Reference videos

Path: `assets-src/pockt-3-docs/reference/` (untracked in the `m3-scrub` worktree).

| | Video A (approved) | Video B (regression) |
|---|---|---|
| File | `ScreenRecording_09-17-2026_16-11-49_1.mp4` | `ScreenRecording_09-21-2026_12-24-27_1.mp4` |
| Bytes | 79,831,182 | 123,358,936 |
| SHA-256 | `486CB6344D3C68D779858B24E5AB472E2496C2454EB3EDE5D555A7E81C06207E` | `EE2322F5B9F79E12B848B7FB20F0A4FAA269D249E3DC5890C5A9B34D67FDBBA4` |
| Status | **CONFIRMED** present | **CONFIRMED** present |

Frame-by-frame product claims in the master prompt remain Opus observations until matched below.

---

## 0.1 Git inventory

Command evidence: `git worktree list --porcelain`, `git branch -av`, `git tag -l`, `git status --short --branch`, `git remote -v`, `git show-ref --tags`.

### Remotes

**CONFIRMED:** none. `git remote -v` is empty.

### Worktrees (git-registered)

| Path | HEAD | Branch | Status |
|---|---|---|---|
| `C:\Apps\POCKT` | `2418f42949328078571f4c56b39c0ca93fe5c65b` | `m3-scrub` | **CONFIRMED** dirty. Two tracked Machine heatmaps modified; large `??` set of `.tmp-*`, IPA extracts, Machine bake leftovers, and `assets-src/pockt-3-docs/`. Not committed. **R4: never touched.** |
| `C:\Apps\POCKT\.tmp-dial-master-1` | `7d19caf6ac0f8c87494bd9799641b3e750e939b2` | `dial-master-1` | **CONFIRMED** 3 untracked: `assets-src/pockt-dial-master-1/__pycache__/`, `layers/_m_ring_ss.png`, `layers/_p_calib.png`. |

No other git worktrees. `.tmp-eas-inspect`, `.tmp-dm1-archive`, `.tmp-dm1-prebuild`, `.tmp-ipa-*` are untracked directory copies, not worktrees. **CONFIRMED** via `git worktree list`.

### Main workspace

| | |
|---|---|
| Branch | `m3-scrub` |
| HEAD | `2418f42` — `m3-d: M3D_REPORT retry 3; 126 on internal TestFlight` |
| Dial vs Video A | `git diff --stat 260725c HEAD -- modules/pockt-dial lib/pockt-dial-scale.ts lib/tempo-name.ts components/classic/DialRoom.tsx components/classic/ClassicInstrumentHost.tsx hooks/use-metronome.ts` is **empty**. **CONFIRMED:** the shipping Dial sources on 126 are still the 122 Dial. |

### `dial-master-1` lineage

| Ref | Full SHA | Subject | Date (author) |
|---|---|---|---|
| `dial-master-1` HEAD | `7d19caf6ac0f8c87494bd9799641b3e750e939b2` | phase 9 report (build 127 internal TestFlight) | after 127 |
| `1fd8a1d` | `1fd8a1d1ff4f4daf119cd43ad94e6bae5e5f18e3` | phase 6 + owner exception; pack ASTC — **EAS build 127** | 2026-09-21 |
| `c129f1b` | (see log) | flush inlay pass | 2026-09-21 |
| `3574bf7` | `3574bf7c51428bdd52409f21e4b5dad062d34ee3` | ring mask pass | 2026-09-21 11:23 PT |
| `90b1256` | `90b125619ccf194caa12be7f400d91b318dbddd1` | phase 3 correction | 2026-09-21 11:04 PT |
| `aed256f` | `aed256f8c1ea126f86165fcd4af65c83f1471b40` | phases 1–3 WIP | 2026-09-21 09:53 PT |
| `pre-dial-master-1` / `260725c` | `260725c390cdd09f09cfcc9f5eecf5c20d94f918` | Bump iOS buildNumber to 122 | 2026-09-17 15:55 PT |

**CONFIRMED:** tag `pre-dial-master-1` → `260725c390cdd09f09cfcc9f5eecf5c20d94f918`.

### Tags

`BEST_BUILD_68_BEFORE_SILENT_PLAY_FIX_20260831`, `BEST_BUILD_BEFORE_MIX_PRACTICE_CLEANUP_20260831`, `BEST_BUILD_BEFORE_SMALL_REFINEMENT_20260826`, `checkpoint-pre-fidelity-2026-08-26`, `checkpoint-pre-fidelity-master-pass-2026-08-25`, `checkpoint-pre-precision-2026-08-26`, `checkpoint-pre-stabilize-2026-08-26`, `checkpoint/pockt-2.0-recovery-start`, **`pre-dial-master-1`**.

`pockt3-baseline-A` and `dial-master-1-final` do **not** exist yet (Phase 1).

---

## 0.2 EAS iOS build ledger

Commands: `npx eas whoami` (greggfrazer / money-test); `npx eas build:list --platform ios --limit 40 --json`; `npx eas submit:list --platform ios --limit 40 --json`. Times converted PDT (UTC−7, Sep 2026). Profile for 118–127 is **`production`**, distribution **STORE**, app `13.0.0`, bundle `com.moneytest.pockt`.

`eas.json` submit.production.ios names only `ascAppId: "6803804512"`. **CONFIRMED:** no external TestFlight group, no `submitForReview` / App Store review field.

| Build | Status | Finished PT | Git | TestFlight submit | Notes |
|---|---|---|---|---|---|
| **127** | FINISHED | 2026-09-21 11:59:29 | `1fd8a1d1` | FINISHED 12:02–12:06 PT | **Video B source.** Dial Master 1. EAS id `c7d55619-71cc-46ec-b1e1-821515f34318` |
| 126 | FINISHED | 2026-09-20 23:28:23 | `84954051` | FINISHED 23:30–23:33 PT (21st 06:30 UTC) | m3-scrub Machine / Glass Proof |
| 125 | ERRORED | 2026-09-20 23:04:27 | `03d08ec0` | — | m3-d compile |
| 124 | ERRORED | 2026-09-20 22:30:02 | `5031d28b` | — | easignore |
| **122** | FINISHED | **2026-09-17 16:03:31** | **`260725c3`** | **FINISHED 16:05–16:08 PT** | **Video A source.** EAS id `dd966dd8-fecc-4a98-9be6-db32c89b9ed8` |
| 121 | FINISHED | 2026-09-17 15:34:04 | `21dc6af8` | FINISHED 15:35–15:38 PT | Dial IBL upload-exclude |
| 120 | FINISHED | 2026-09-17 14:54:22 | `bfab452f` | yes | Dial IBL |
| 119 | FINISHED | 2026-09-17 09:39:01 | `27d59013` | yes | Dial Metal |
| 118 | FINISHED | 2026-09-17 09:05:53 | `151cd3dc` | yes | Dial Metal |
| 117–74 | (see JSON) | | | most submitted | earlier rooms; not Video A |

**CONFIRMED Video B build:** latest iOS build **finished before 2026-09-21 12:24 PM PT** that was on TestFlight = **127**. Finished 11:59 PT; submitted 12:02–12:06 PT; Video B recorded 12:24 PT. Commit message is Dial Master 1 phase 6. Matches the expected Dial Master 1 build.

123 has no row in the last-40 list. **ASSUMED** (from M3D_REPORT): remote autoIncrement consumed 123 without a finished artifact.

Internal TestFlight profile for the one authorized POCKT 3 build: **`production`** (same as 122/126/127). **CONFIRMED** from ledger + `eas.json`.

---

## 0.3 Video A build

Rule: latest iOS build **finished before 2026-09-17 4:11 PM PT** that was on TestFlight.

| | |
|---|---|
| Build number | **122** |
| EAS id | `dd966dd8-fecc-4a98-9be6-db32c89b9ed8` |
| Commit | `260725c390cdd09f09cfcc9f5eecf5c20d94f918` |
| Build finished | 2026-09-17 **16:03:31 PT** |
| Submit finished | 2026-09-17 **16:08:42 PT** |
| Video A | 2026-09-17 **16:11–16:12 PT** |
| Profile | `production` |

**CONFIRMED.** 121 also finished earlier the same afternoon and was submitted, but 122 is later and still before 16:11. Expected match in the master prompt (build 122 / `260725c…`) is confirmed, not assumed.

---

## 0.4 Fingerprint of `260725c`

All items from `git show 260725c:<path>`. Adjacent commits were not needed.

### (a) Scale label sequence — **CONFIRMED PASS**

`modules/pockt-dial/ios/PocktDialTuning.swift` and `lib/pockt-dial-scale.ts`:

```
static let marks: [Int] = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]
export const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]
```

`PocktDialFace.makeAtlas` iterates `PocktDialTuning.marks` and draws those numerals.

### (b) Piecewise angle ↔ BPM map — **CONFIRMED PASS** (constants quoted; Opus 220° observation corrected)

```
minBpm = 20, maxBpm = 400, homeBpm = 120
minAngle = -130°   // 20 BPM
homeAngle = 0°     // 120 BPM
maxAngle = +140°   // 400 BPM
```

- 20–120 spans **130°** (1.3°/BPM).
- 120–400 spans **140°** (0.5°/BPM = **2 BPM/degree**).
- Total printed arc **270°**; gap at the bottom.

Atlas placement (`PocktDialFace.swift`): `world = π/2 - dial`, UIKit `y` flipped via `-sin`. At `dial = 0`, 120 is at 12 o'clock. At `dial = -130°`, 20 sits near **7:40**. At `dial = +140°`, 400 sits near **4:40**. Matches Video A “20 ~7:30, 400 ~4:30, gap at bottom.”

Opus’s “~220° below 120” is the **complementary** arc (360−130 = 230°), not the printed scale. **CONFIRMED** the code is 130°/140°, not 220°/140°. Fingerprint uses the code constants.

`clampBpm` / `bpmFromAngle` end with `.rounded()` (Swift) / `Math.round` (TS).

### (c) Tempo-name table — **CONFIRMED PASS**

`lib/tempo-name.ts` (`safe < until`):

| until | name | Video A rows |
|---|---|---|
| 40 | Grave | 20 GRAVE |
| 60 | Largo | 46, 51, 59 LARGO |
| 76 | Adagio | 64, 65, 75 ADAGIO |
| 109 | Andante | 76, 84, 95, 100, 103 ANDANTE |
| 120 | Moderato | (none observed; 109–119) |
| 138 | Allegretto | 120, 123, 131 ALLEGRETTO |
| 156 | Allegro | — |
| 176 | Vivace | — |
| 200 | Presto | 190 PRESTO |
| else | Prestissimo | 203, 211, 316, 400 PRESTISSIMO |

Every Video A row matches. 120 is Allegretto because `120 < 120` is false.

### (d) Header — **CONFIRMED PASS**

`components/classic/DialRoom.tsx`: left `T.S.` + `SUB DIV.`; centre `BPM` + teal readout + `tempoName`; right `TAP`. Readout type: teal `#3EE6D8`, 64 pt bold (52 compact), marking gold-teal tracked uppercase.

### (e) Top bar — **CONFIRMED PASS**

`components/pockt2/ShellBezel.tsx` at `260725c`: **Pockets** (left), `Pockt2Mark` (centre P), **Tuner** + **Settings** (right). Mounted from `MainScreen` for classic rooms.

### (f) Rotation sign — **CONFIRMED PASS** (Video A / B3 guard)

Convention used:

1. `PocktDialScale.angleFromBpm` is a signed dial parameter: `0` at 120, **negative** below, **positive** above (to +140° at 400).
2. Finger angle is `atan2(-(y − cy), x − cx)` (math angle, 0 at 3 o'clock, CCW+). Clockwise finger motion **decreases** `angle` and therefore BPM; CCW finger **increases** BPM (`invert` flips the delta).
3. The face atlas is painted in the rest pose (120 at 12 o'clock). The Metal shader samples it with `u.angle` plus an atlas V flip (`PocktDialShader.metal` `qr` / `atlasUV.y = 1 - atlasUV.y`).
4. Empirically vs Video A: as BPM rises, `u.angle` becomes more positive and the printed **“120” moves counter-clockwise** under the fixed 12 o'clock hub index (≈11 o'clock mid-200s, ≈9 at ~316, ≈7 at 400). As BPM falls, the scale rotates clockwise (“120” near 3 o'clock around 64–65).

This is the Video A fingerprint. Dial Master 1 inverts it (see 0.6 B3).

---

## 0.5 Dial behaviour audit at `260725c`

### Touches → rotation → BPM

`PocktDialView.applyCoalesced` already uses `UIEvent.coalescedTouches(for:)`. Each sample: unwrap delta, add to `angle`, clamp `[minAngle, maxAngle]`, `emitBpmIfNeeded`.

`emitBpmIfNeeded`: `Int(PocktDialScale.bpmFromAngle(angle))`; emit only on integer change.

**Rounding:** `bpmFromAngle` → `clampBpm` → `value.rounded()`. Above 120 this is a **2 BPM/degree** map, so a single sample can jump multiple integers. **CONFIRMED** demonstrated skip defect (Phase 3.1).

### Event → engine

```
PocktDialView.onBpm
  → DialRoom sanitizeBpm(...) + setBpm(next)
  → hooks/use-metronome.ts setBpm
  → update({ bpm }) + if playing: PocktTiming.setConfig(toNativeConfig({ ...config, bpm }))
```

`setConfig` is a full-config replace. Live BPM uses `applyPhaseContinuousTempo()` — **does not** `player.stop()`, does not reset beat index. Comment in `PocktTimingEngine.swift`: “Live tempo/meter change. Never stops the player.” Frequency: once per emitted integer (plus a `useEffect` on `config` that re-sends while playing). **No JS musical clock.**

Whether rapid `setConfig` while playing causes audible gaps: **ASSUMED none** from the phase-continuous path; must be confirmed on device (Phase 3.3 / Gregg checklist).

### Haptics

Core Haptics `CHHapticEngine.playsHapticsOnly = true`. On each new integer, if `now - lastHapticAt >= hapticMinGap` (**0.018 s**), play a transient: intensity `mix(0.72, 0.26, speed)`, sharpness `mix(0.40, 0.82, speed)`. Fires per integer with 18 ms spacing; **no** hard-stop thud at 20/400; tens are not stronger. JS `rotaryDetent` is audio-only (`haptic=false`) so it does not double-fire.

### Post-release inertia

`endDrag` sets `omega = 0`. `stepPhysics` then springs `angle` to `angleFromBpm(bpmFromAngle(angle))` (snap to the integer’s angle). The `abs(omega) >= captureSpeed` friction/flywheel branch exists but is **dead** because release zeroes `omega`. **CONFIRMED:** no coasting. Small snap-to-tick spring only. Phase 3.2: disable only if we treat that spring as inertia; the value on release is already the last emitted integer.

### Hub tap

`beganInHub && dragTravel < hubTapMaxTravel (0.035 rad)` → `onCenterTap` → `DialRoom` `toggle` (play/stop). Secondary gesture. **CONFIRMED.**

### ♪ POCKET

Not a navigation control. `DialRoom` stage badge (`styles.soundBadge`, circular teal, 54 pt) shows a note glyph + `SOUNDS[resolvePlayableSound(config.sound)].label`. Default sound id is `'pocket'`, label **`POCKET`**. `onPress={onOpenSound}`. **CONFIRMED:** this is the Video A “♪ POCKET” button; it opens the sound list. It does **not** duplicate `Pockets`.

### TAP / T.S. / SUB DIV

- TAP cell → `useClassicTapReaction(tapTempo)` → `TapTempo.tap()` (`lib/tap-tempo.ts`: stale 3400 ms, max 6 samples, integers only) → `setBpm`.
- `T.S.` → `onOpenTime` → `MainScreen` time-signature overlay (`TIME_SIGNATURES`).
- `SUB DIV.` → `onOpenDivision` → subdivision overlay (`SUBDIVISIONS`).
- BPM readout tap → `onOpenPad` → `BpmPadSheet` (existing keypad, `sanitizeBpm`).

### Sound list preview

`onOpenSound` → `SoundLibrarySheet` `onPreview={previewSound}`. `previewSound` → `PocktTiming.preview(sound, volume)` (native engine preview, not a JS clock).

### Persistence

`storage/persist.ts` `loadSettings` / `saveSettings` from `use-metronome` hydration. Last BPM, meter, sound persist. **CONFIRMED** mechanism; not re-tested this phase.

### Deployment target

`PocktDial.podspec` / `PocktTiming.podspec`: **iOS 15.1**. Smallest supported iPhone class **ASSUMED** iPhone SE 1st gen **320×568** (same as Dial Master 1 Phase 0; Expo 54 default). Quote for Phase 4 layout tests.

### iOS native size

`DialRoom`: `size = min(compact ? 372 : 424, round(width * 0.92), round(height * 0.62))`. **CONFIRMED** Video A native size cap.

---

## 0.6 Dial Master 1 audit

### How it became the Dial pocket — **CONFIRMED**

`.tmp-dial-master-1/components/classic/ClassicInstrumentHost.tsx`:

```tsx
const [dialMaster1] = useState(true);
if (room === 'dial') return dialMaster1 ? <DialMasterRoom {...props} /> : <DialRoom {...props} />;
```

At `260725c` this flag **does not exist**; Dial routes to `<DialRoom />` only.

Shipped as build **127** from `1fd8a1d`. Worktree HEAD `7d19caf` is the phase 9 report only.

### B1 · snap-back — **CONFIRMED** mechanism

Video: readout 20 → 27 → 71 → 223 → 279 → 224 → 80 → 20 in ~3 s, then sits at 20.

- Encoder `G_MAX = 1.25` with velocity smoothstep (`DialEncoderCore.advance`) emits large integer jumps in one gesture.
- `DialMasterRoom` keeps **local** `displayBpm` plus `useEffect(() => { lastBpm = safeBpm; setDisplayBpm(safeBpm); }, [safeBpm])`.
- Native view `bpm={safeBpm}` (store), readout shows `displayBpm`. After release, `ignorePropsUntil` is only **0.2 s**, then store props overwrite the encoder (`applyExternal`).
- If `setBpm` / store lagged or stayed at 20 (`DEFAULT_BPM`), the effect snaps the readout back to 20.

The jump train is the gain curve; the final 20 is store/prop overwrite. **ASSUMED** the store was still 20 in the Video B take (not separately logged).

### B2 · state split — **CONFIRMED**

Two independent facts:

1. `DialMasterRoom` display ≠ store (`displayBpm` vs `config.bpm` / `safeBpm`).
2. Chooser Dial tile **never reads the store**: `components/classic/ClassicPreviewCard.tsx` `DialPreview` hardcodes the literal `120` (present at `260725c` too). Pockets will show Dial at 120 even when the instrument is 20.

### B3 · wrong direction — **CONFIRMED**

`RingProjection.swift`: “`ringAngle` is **clockwise-positive** radians.”  
`ringRadians(for:)` = `(value - 20) * K - 165` with `K = 330/380`. As BPM rises, `ringAngle` increases → clockwise ring motion.

Video A / 0.4(f): BPM up → **counter-clockwise** scale under a fixed index.

Different map (linear K vs piecewise 130°/140°) **and** opposite sign. This is why Gregg saw the wrong direction. **Do not import** Dial Master 1 textures, encoder, or ring matrix.

### B4 · illegible scale — **CONFIRMED** as a new-texture defect

Video A numerals are CoreText in `PocktDialFace.makeAtlas` (120 at 5.5% of atlas dim, others 3.2%, gold). Dial Master 1 replaced that with baked gold-inlay textures; G1/G2 gold tile MAD 18–26/255 (composite darker than R-REF). Owner exception accepted those gates as FAIL for the 127 device build. At phone size the gold reads faint. Restoring byte-identical Video A atlas/shaders is the B4 guard (Phase 2.1), not a new render.

### B5 · clipped chips — **CONFIRMED** layout nesting

`computeDialMasterLayout` pins transport to `windowHeight - max(safeBottom+8, 16)` — correct **if** the room is full-screen.

`MainScreen` already applies classic `paddingBottom: Math.max(insets.bottom, 18) + 14` (and top chrome). `DialMasterRoom` is `flex: 1` **inside that padded stage** but sizes itself with `useWindowDimensions().height` and absolute coordinates. Transport/chip Y then overflow the parent and sit in the home-indicator band.

Video A `DialRoom` is flow layout inside the same padded stage (`paddingBottom: max(insets.bottom - 8, 4)`), so it does not exhibit B5.

### B6 · over-acceleration — **CONFIRMED**

`DialEncoderConstants.gMax = 1.25`, `wFast = 540`, plus `dragGFast = 1.2`. A moderate turn is multiplied by the gain curve (Video A has **no** extra gain: 1 finger-degree = 1 dial-degree). Combined with 2 BPM/° above 120 on the Video A map, DM1 can jump 50+ BPM/frame. Phase 3 forbids importing this curve.

---

## 0.4 / 0.5 fingerprint summary

| Item | Result |
|---|---|
| (a) marks 20…400 | PASS |
| (b) 130° / 140° map | PASS |
| (c) tempo names | PASS |
| (d) T.S. / SUB DIV / BPM / TAP / ♪ POCKET | PASS |
| (e) Pockets / P / Tuner / Settings | PASS |
| (f) CCW as BPM rises | PASS |
| Dial files present at `260725c` | PASS |

No adjacent-commit search required.

---

## ASSUMED / deferred

- Video A/B were not re-scored frame-by-frame in this Phase 0; Opus observations stand except the 220° arc, which code disproves.
- 123 missing from EAS last-40: assumed consumed by a failed/abandoned remote increment.
- 122/127 TestFlight **group** membership (internal vs external) is not in `eas.json`. Same `production` submit path as prior internal testers. Dial Master 1 report stated 127 internal only; treated as **CONFIRMED** for 127 by that report, **ASSUMED** identical ASC routing for 122.
- Audible gaps on rapid `setConfig` while playing: not measured (no device). Engine comments claim phase-continuous, no `player.stop()`.
- Smallest device 320×568 from iOS 15.1 + Expo 54 default: **ASSUMED** for Phase 4 tests.
- Inspection scratch `C:\Apps\POCKT\.tmp-pockt3-phase0-show\` is untracked read-only extract; not committed; Machine leftovers not deleted (R4).

---

## Phase 0 authorization to continue

Proceed to Phase 1: preserve Dial Master 1 (`dial-master-1-final`), tag `pockt3-baseline-A` = `260725c`, new `pockt-3` worktree from that tag, commit this ledger there. Import nothing from Dial Master 1 except the later-allowed layout/haptic scheduler items.

---

## Phase 1 — Recovery checkpoint (done)

| | |
|---|---|
| `dial-master-1-final` | `cc393432ecc370180df6beebf367243ec17034ec` — `dial-master-1: final state before POCKT 3 recovery` (2 leftover layer PNGs; `__pycache__` left untracked) |
| `pockt3-baseline-A` | `260725c390cdd09f09cfcc9f5eecf5c20d94f918` |
| Branch / worktree | `pockt-3` at `C:\Apps\POCKT\.tmp-pockt-3` |
| Ledger commit | `9b41ca6` `pockt-3: Phase 0 recovery ledger` |
| `npm ci` | **CONFIRMED** 941 packages in this worktree |
| Videos | present untracked at `assets-src/pockt-3-docs/reference/` (not in the ledger commit; ~203 MB) |
| Machine / `m3-scrub` | **CONFIRMED** still at `2418f42`, not switched, leftovers not deleted |

All further implementation is only in `.tmp-pockt-3`. Dial Master 1 rendering was not restarted.

---

## Phase 2 — Dial identity and fingerprint tests

`git diff --stat pockt3-baseline-A HEAD -- modules/pockt-dial lib/pockt-dial-scale.ts components/classic/DialRoom.tsx` is empty. Git blobs on HEAD equal `pockt3-baseline-A` for every listed dial file. **CONFIRMED** byte-identical.

SHA-256 of those blobs: `assets-src/pockt-3-docs/DIAL_IDENTITY_HASHES.txt` (26 files). Native view, shader, textures, RN wrapper, and JS scale are included.

Fingerprint tests: `scripts/run-pockt3-fingerprint-tests.js` (wired into `npm test`).

| Test | Result |
|---|---|
| Marks 20…400 round-trip onto painted angles within 0.5° | **PASS** |
| Video A tempo-name rows | **PASS** |
| B3: increasing BPM rotates printed 120 counter-clockwise | **PASS** |

---

## Phase 3 — Interaction (done)

| Item | Result |
|---|---|
| 3.1 integer step + 0.3 BPM hysteresis + 0.4° deadzone | `run-pockt3-step-tests.js` **PASS** (118↔127, 20↔400, ±0.4° silent) |
| 3.2 release = last sample, omega=0, flywheel friction removed | **PASS** |
| 3.3 engine write queued, flushed once per CADisplayLink + on release | **PASS** |
| 3.4 30 ms drop scheduler, tens 0.70/0.60, hard-stop 1.00/0.30 at 20/400 | **PASS** |
| 3.5 Dial preview reads store BPM | **PASS** |
| Existing `run-pockt-dial-tests.js` | **PASS** |
| Engine / shader / textures | not rewritten |

---

## Phase 4 — Foundation screen (done)

| Item | Result |
|---|---|
| Layout `computeFoundationLayout` (DM1 4.4, Video A dial) | **PASS** SE/8/14/15PM, no overlap, 44pt targets, B5 transport |
| `FoundationDialRoom` + host swap | store BPM readout, PocktDialView, beat strip, METER/SOUND, PLAY/TAP |
| Full-bleed dial stage | MainScreen padding exempt for `dial` |
| Launch | cold start applies `viewSwitchPatch('dial')`, `launchGate='resume'` (no chooser) |
| Labs | Glass Proof + Machine archive label (Machine module not loaded) |

---

## Phase 5 — Validation (done)

| Check | Result |
|---|---|
| `npm test` (existing suite + Phase 2/3/4) | **PASS** |
| Shader / baked Resources vs `pockt3-baseline-A` | **identical** (empty `git diff`) |
| `eas.json` / app version | unchanged; remote `appVersionSource`, production autoIncrement |

---

## Phase 6 / 7 — One internal TestFlight + RC1

| | |
|---|---|
| EAS iOS production | `a23e3871-4bc4-4313-9144-2dc22febaf60` **finished** |
| Build number | **128** |
| IPA inspect | 13.0.0 / 128 / iOS 15.1 / `com.moneytest.pockt` / `PocktDial.bundle` / no DialMaster / no Machine |
| Submit | `38f647c8-1334-4281-a03c-00d30408aa0a` uploaded to ASC |
| Report | `assets-src/pockt-3-docs/POCKT_3_RC1_REPORT.md` |
