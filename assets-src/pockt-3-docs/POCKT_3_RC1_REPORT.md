# POCKT 3.0 RC1 report

Worktree: `C:\Apps\POCKT\.tmp-pockt-3`  
Branch: `pockt-3`  
HEAD at report time: `a7da044`

## Status check (what had actually been done before this resume)

After the Phase 2 GO acknowledgement, **nothing of Phase 2 had executed**. No hashes, no fingerprint tests, no pending approval command, no STOP. HEAD was `5d65baf` (`checkpoint before checking out m3-scrub`) with a clean tree. Execution resumed from Phase 2 only.

## Video A identity

| | |
|---|---|
| Video A | build **122** @ `260725c` |
| Baseline tag | `pockt3-baseline-A` = `260725c390cdd09f09cfcc9f5eecf5c20d94f918` |
| Dial blobs vs baseline | **identical** (26 files). SHA-256 table: `DIAL_IDENTITY_HASHES.txt` |
| Shader / baked Resources | **unchanged** vs baseline |
| Engine | **unchanged** (no `PocktTiming` edits) |

## Commits on `pockt-3`

| SHA | Message |
|---|---|
| `9b41ca6` | Phase 0 recovery ledger |
| `5d65baf` | checkpoint (videos + Phase 1 note) |
| `b576c2e` | baseline A restored + fingerprint tests |
| `a971fb4` | integer step, hysteresis, frame emit, haptic scheduler |
| `fa659a4` | foundational Bench screen, launch, Labs |
| `a7da044` | Phase 5 validation fence; exclude recovery videos from EAS |

## Tests (actual results)

| Suite | Result |
|---|---|
| `run-pockt3-fingerprint-tests.js` | **PASS** (marks 0.5°, Video A tempo rows, B3 CCW) |
| `run-pockt3-step-tests.js` | **PASS** (118↔127, 20↔400 every integer, ±0.4° silent, B6 no extra gain) |
| `run-pockt3-haptic-engine-tests.js` | **PASS** (30 ms drop, tens, hard-stop, once-per-frame, B2 store BPM) |
| `run-pockt3-layout-tests.js` | **PASS** (SE/8/14/15PM, B5 transport, 44pt) |
| `npm test` (existing suite + above) | **PASS** |
| `run-pockt-dial-tests.js` | **PASS** |

## Fixes shipped

- **B1** integer step + 0.3 BPM hysteresis + 0.4° deadzone; coalesced path kept
- **B2** preview / readout read store BPM; dial writes while finger is down
- **B3** Video A CCW map unchanged (fingerprint)
- **B4** foundation layout, no overlap on listed devices
- **B5** full-bleed dial stage; transport at `height - max(safeBottom+8, 16)`
- **B6** Video A map only (no DM1 `G_MAX`)
- Release: `omega = 0`, flywheel friction removed
- Engine: at most one `onBpm` per display frame + flush on release
- Haptics: 30 ms drop scheduler; tens 0.70/0.60; hard-stop 1.00/0.30 at 20 and 400
- Launch: cold start applies `viewSwitchPatch('dial')`, `launchGate='resume'`
- Labs: Glass Proof + Machine archive label (Machine module **not** loaded)

## What was not imported

Dial Master 1 textures, encoder, `DialMasterRoom`, opposite ring sign. Machine / `m3-scrub` leftovers not touched (`2418f42`). `dial-master-1-final` = `cc39343` preserved.

## TestFlight candidate (ONE internal build)

| | |
|---|---|
| EAS build | `a23e3871-4bc4-4313-9144-2dc22febaf60` |
| Logs | https://expo.dev/accounts/money-test/projects/POCKT/builds/a23e3871-4bc4-4313-9144-2dc22febaf60 |
| IPA | https://expo.dev/artifacts/eas/VL11gdGRksVSU3Hqbe0mEMXBkYPaKwj30iF8l-H_hIY.ipa (143,400,892 B) |
| Profile | `production` (remote `appVersionSource`, autoIncrement) |
| Bundle | `com.moneytest.pockt` |
| Version | **13.0.0** |
| `CFBundleVersion` | **128** (127 → 128) |
| `MinimumOSVersion` | **15.1** |
| Native dial | `PocktDial.bundle` present |
| Dial Master / Machine binaries | **0** hits in IPA |

## Authorization remaining

This is the single authorized internal TestFlight candidate. No second build. No App Store submission. No external testers unless Gregg adds them.

Device confirmation still required: B1–B6 on hardware against Video A.

## TestFlight submit (done)

| | |
|---|---|
| Submission | `38f647c8-1334-4281-a03c-00d30408aa0a` |
| Details | https://expo.dev/accounts/money-test/projects/POCKT/submissions/38f647c8-1334-4281-a03c-00d30408aa0a |
| Result | **Uploaded to App Store Connect** (Apple processing) |
| TestFlight | https://appstoreconnect.apple.com/apps/6803804512/testflight/ios |
| Testers | internal only — no external group added |
