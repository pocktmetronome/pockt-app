# POCKT 3.0 Classic Dial Master — visual lock

Worktree: `C:\Apps\POCKT\.tmp-pockt-3`  
Branch: `pockt-3`  
Checkpoint: tag `pockt3-pre-classic-dial-master` = `4958789`  
Checkpoint bundle: `C:\Apps\POCKT-BACKUPS\pockt3-pre-classic-dial-master.bundle`

Owner: Gregg. Implementation: Cursor.  
Implementation: `80c886f`  
RC tag: `pockt3-classic-dial-master-rc`  
RC bundle: `C:\Apps\POCKT-BACKUPS\pockt3-classic-dial-master-rc.bundle`

## TestFlight candidate (ONE internal build)

| | |
|---|---|
| EAS build | `0804a842-1fa6-40be-83f6-aaf0a01c80e0` **FINISHED** |
| Logs | https://expo.dev/accounts/money-test/projects/POCKT/builds/0804a842-1fa6-40be-83f6-aaf0a01c80e0 |
| IPA | https://expo.dev/artifacts/eas/LKEmF0wEJ0le-Uln-eXWZuSsH96goqBwBTC0tkokJ68.ipa (143,419,955 B) |
| Profile | `production` (remote `appVersionSource`, autoIncrement 129 → **130**) |
| Bundle | `com.moneytest.pockt` |
| Version | **13.0.0** |
| `CFBundleVersion` | **130** |
| `MinimumOSVersion` | **15.1** |
| Git | `80c886f` |
| Native dial | `PocktDial.bundle` present (metallib + approved maps) |
| Dial Master / Machine binaries | **0** hits in IPA |

## TestFlight submit (done)

| | |
|---|---|
| Submission | `8cc788a2-c202-4024-abc2-61da32bcf9b9` |
| Details | https://expo.dev/accounts/money-test/projects/POCKT/submissions/8cc788a2-c202-4024-abc2-61da32bcf9b9 |
| Result | **Uploaded to App Store Connect** (Apple processing) |
| TestFlight | https://appstoreconnect.apple.com/apps/6803804512/testflight/ios |
| Testers | internal only — no external group added, no App Store review |

Build 130 is **not** claimed TestFlight-ready until Apple finishes processing.

## Visual acceptance gate

### A. Implemented Classic Dial screenshot

**Not available.** This environment is Windows. There is no iOS Simulator or device attached that can render `PocktDialView` (Metal). A web or concept render would not be the real screen and is not offered as evidence.

### B. Comparison method

Source-level and asset-level comparison against:

- Master reference: `assets-src/pockt-3-docs/POCKT_3_CLASSIC_DIAL_MASTER.jpg`
- Approved dial: build 122 / tag `pockt3-baseline-A` (`260725c`) baked Metal maps + `PocktDialFace` scale
- Device baseline: build 128 RC1 (`e864276`) and RC2 feel restore (`ca6b267`)

### C. Visible differences (honest)

The native dial remains the approved 122 physical instrument, not a re-illustration of the generated image.

Chassis chrome is newly composed to the reference hierarchy. There are no existing Blender-baked button / transport / face-rail maps, so those controls are machined-layer React Native hardware (bronze ring, recessed well, directional sheen). They are real controls, not a flattened screenshot.

Expected remaining differences until a device photo exists:

- Knob and transport photorealism will not match a studio 3D render. The dial will.
- Typography is refined tracked POCKT / FIND YOUR POCKET, not the generated image’s warped lettering.
- Face-rail icons are restrained line marks, not the illustration’s custom glyphs.
- BPM digits use the live system typeface, not the image’s custom numerals.
- Chassis field is the dial’s deep black (`#050607`), not a photographed desk.
- Image errors were not copied: duplicated 160, missing 120, 126 BPM, POCKETTS, TAPP, BPMM, SOUND/TUNER garble.

### D. Scale

Build 122 printed labels, each once, nonlinear Video A map:

`20 40 60 80 100 120 160 200 260 320 400`

120 sits at the fixed gold pointer. Every integer 20–400 is reachable. Direction matches the approved implementation, not the illustration.

### E. Controls wired

| Control | Destination |
|---|---|
| Pockets | existing view selector |
| Settings | existing settings |
| Sound | existing universal sound browser |
| Tuner | existing tuner |
| BPM digits | existing numeric pad |
| Dial | native `PocktDialView` → one `setBpm` |
| TAP | existing tap tempo |
| Play | starts if stopped; no duplicate start |
| Stop | stops if playing |
| Meter | existing meter sheet; long-press / sub label opens subdivision |
| Beats | native `beatIndex`; tap selects; MUTE / SOFT / BEAT / STRONG |
| Face rail | `viewSwitchPatch` only — one engine |

### F. Tests and compilation

| Suite | Result |
|---|---|
| `npm test` | PASS, including new `run-pockt3-classic-dial-tests.js` |
| `tsc --noEmit` | PASS |
| Native iOS compile | not run locally (no Xcode on this host). EAS is the compile. |

### G. Preserved

| Item | Evidence |
|---|---|
| Machine workspace | `C:\Apps\POCKT` `m3-scrub` @ `2418f42` — not edited |
| Build 122 visual baseline | `pockt3-baseline-A` = `260725c` |
| Build 128 RC1 | `e864276` |
| RC2 feel restore | `ca6b267` — Swift/Metal/haptic path unchanged this pass |
| Dial Master 1 | `dial-master-1-final` = `cc39343` |
| Other faces | Pulse, Pendulum, Pro, Beatline, Mechanical, LED Gear still hosted |

## Dial feel

Build 128 snapped the ring to the parked integer and stepped haptics through skipped values. RC2 already restored build 122 tracking:

- Finger angle is authoritative while dragging
- 0.4° grab unlock only
- Latest integer emit, 30 ms haptic sparsify
- Hard stops at 20 / 400
- No flywheel

This pass does **not** retune sensitivity constants. Physical feel still requires Gregg’s iPhone.

## Known limitations

- No on-device screenshot from this toolchain.
- Chassis knobs are not baked IBL assets.
- Per-meter accent memory is session-level plus the live `accentPattern`. No new persisted store.
- SOFT is the engine’s medium/P accent. It is quieter than NORMAL, not a louder mid accent.
- Android Dial remains a placeholder.
- Automated tests cannot certify detent luxury or first-launch audio on hardware.

## Gregg device checklist

1. Cold first-launch (or reset): BPM 120, dial at 120, engine at 120, 4/4, straight, pocket sound.
2. Slow 118–127 and 300–310: every integer, no snap-back.
3. Fast 20–400 and reverse: follows the finger, no haptic backlog.
4. Play / Stop / TAP / keypad agree with the dial.
5. Beat bubbles follow the click. Tap a beat, choose MUTE / SOFT / BEAT / STRONG, hear the change.
6. Meter and subdivision update the engine and the bubble count.
7. Sound browser preview and persist.
8. Pockets, Tuner, Settings, return with BPM and sound intact.
9. Face rail reaches the other six hosted faces without restarting the engine.
10. Background / interruption if testable.
