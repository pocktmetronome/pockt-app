# POCKT 3.0 RC2 — transforming instrument

Worktree: `C:\Apps\POCKT\.tmp-pockt-3`  
Branch: `pockt-3`  
Checkpoint: tag `pockt3-pre-transforming-instrument` = `7c2f532`  
Implementation commits: `ca6b267`, `32bd91c`  
RC2 tag: `pockt3-rc2` → `32bd91c`  
Bundle: `C:\Apps\POCKT-BACKUPS\pockt3-rc2.bundle`

Owner: Gregg. Implementation: Cursor.

## TestFlight candidate (ONE internal build)

| | |
|---|---|
| EAS build | `13f1edc7-7954-4311-840b-dc0c26556693` **FINISHED** |
| Logs | https://expo.dev/accounts/money-test/projects/POCKT/builds/13f1edc7-7954-4311-840b-dc0c26556693 |
| IPA | https://expo.dev/artifacts/eas/ym5oBTnK_FHAMc2HGgevCTz5XcANV50Jt15cULLbT9U.ipa (143,408,773 B) |
| Profile | `production` (remote `appVersionSource`, autoIncrement 128 → **129**) |
| Bundle | `com.moneytest.pockt` |
| Version | **13.0.0** |
| `CFBundleVersion` | **129** |
| `MinimumOSVersion` | **15.1** |
| Git | `32bd91c` |
| Native dial | `PocktDial.bundle` present (metallib + approved maps) |
| Dial Master / Machine binaries | **0** hits in IPA |

## TestFlight submit (done)

| | |
|---|---|
| Submission | `9965a130-0963-4150-953d-fdc603dd26fa` |
| Details | https://expo.dev/accounts/money-test/projects/POCKT/submissions/9965a130-0963-4150-953d-fdc603dd26fa |
| Result | **Uploaded to App Store Connect** (Apple processing) |
| TestFlight | https://appstoreconnect.apple.com/apps/6803804512/testflight/ios |
| Testers | internal only — no external group added, no App Store review |

## What this build is

One central POCKT instrument. Seven functional faces. One native musical engine. Shared controls and sound. Restored dial tracking. Refined beat indication.

It is not a new dial render, not Dial Master 1, and not a mockup.

## Preserved

| Item | Evidence |
|---|---|
| Build 128 RC1 | `e864276` + `POCKT_3_RC1_REPORT.md` |
| Build 122 visual baseline | `pockt3-baseline-A` = `260725c` |
| Dial shader / baked Resources | unchanged vs 122 (`git diff` empty on those paths) |
| Dial Master 1 | `dial-master-1-final` = `cc39343` — not imported |
| Machine workspace | `C:\Apps\POCKT` `m3-scrub` @ `2418f42` — not modified |
| Recovery ledger | `RECOVERY_LEDGER.md` kept |

## Dial interaction (top priority)

Build 128 snapped the painted ring to the parked integer after every sample and stepped haptics through skipped integers. That is the degraded feel Gregg reported.

Restored:

- Finger angle is authoritative while dragging (build 122 tracking).
- 0.4° grab unlock only — no parked snap-back.
- Latest integer only. A fast 4° sample above 120 emits 128, not 121…128.
- Engine write still once per display frame, flushed on release.
- 30 ms haptic sparsify. Tens stronger. Hard stop at 20/400.
- No flywheel.

Automated tests cover 20–400 integer reach, 118–127 / 300–310, jitter, latest-only emit, and Video A map sign. They do **not** prove physical-device feel.

## Transforming instrument

Faces: Classic Dial, Pulse, Smart Pendulum, Classic Pro, Beatline, Classic Mechanical, Classic LED Gear.

Switching is a restrained TRANSFORM sheet from the bezel face name or the Dial header chip. `viewSwitchPatch` only. Engine is not restarted. Classic face changes do not swap sound.

Other experiences stay in Pockets: Console (Rig), Custom, Studio, Altered. Whiskey Bar remains a Coming Soon teaser. Glass Proof and Machine are Labs.

## Beat indication

Tiny tap-to-cycle dots are gone on Dial. The shared strip shows meter grouping, downbeat, accent/mute, and native `beatIndex`. EDIT opens the existing Accents screen. Mechanical now uses the same strip. Pulse, Pro, Beatline, and LED Gear keep their distinctive beat hardware.

## Other product fixes

- Foundation chrome: METER / SUB / SOUND / PLAY / TAP.
- Meter presets ordered 2/4, 3/4, 4/4, 6/8, 12/8, 5/8, 7/8, 9/8.
- Selecting ONE–TWELVE samples enables voice-count mode (`count`), not a stuck spoken number.
- Tuner default response is `fast`.
- Pulse idle rings made more visible. Still driven by native `pulseBeat`.

## Tests

`npm test` PASS including fingerprint, step/feel, haptic/engine, layout, and transforming-instrument suites.  
`tsc --noEmit` PASS.

Physical feel, haptics, and acoustic reliability are Gregg's device test.

## Known limitations

- Dial 1-BPM above 120 still uses the approved 2 BPM/° printed map. Fine adjustment is now possible because the ring no longer fights the finger.
- Beatline, Pro, Pulse, Smart Pendulum, and LED Gear remain complete hosted rooms inside the shared shell. They were not stripped into illustrations.
- Whiskey Bar is preserved and not enabled as a primary face.
- Machine experiment is archived and not loaded.
- Android Dial remains a placeholder.
- Automated tests cannot certify detent luxury or first-launch audio on hardware.

## Gregg device checklist

1. Slow turn through 118–127 and 300–310: every integer, no sticky snap.
2. Fast sweep 20–400 and back: stays with the finger, no haptic backlog.
3. Reverse, lift, jitter at 120: stops immediately, no rubber-band.
4. Endpoints 20 and 400 feel like stops.
5. Play while turning. Switch faces while playing. BPM, meter, sound, and click continue.
6. Beat strip follows the click. Downbeat is obvious. EDIT opens accents.
7. TRANSFORM through all seven faces. Same BPM and sound.
8. TAP, keypad, meter, subdivision, sound browser, favorites, count voice.
9. Tuner, Settings Labs (Glass Proof / Machine archive), Pockets (Studio / Altered / Console).
10. Background / interruption if testable.
