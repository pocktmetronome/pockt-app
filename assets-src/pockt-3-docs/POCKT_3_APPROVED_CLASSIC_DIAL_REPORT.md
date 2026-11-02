# POCKT 3.0 Approved Classic Dial — implementation report

Worktree: `C:\Apps\POCKT\.tmp-pockt-3`  
Branch: `pockt-3`  
Checkpoint: tag `pockt3-pre-approved-classic-dial` = `8f12d35`  
Owner: Gregg. Implementation: Cursor.

No EAS build was created. Gregg must authorize the next internal build after reviewing this report.

## Implementation summary

The Classic Dial chassis now follows the attached approved image.

- Centered POCKT / FIND YOUR POCKET. No Pockets knob. No Settings knob.
- Live tempo name + BPM + BPM. First launch is 120 / Moderato, not the image’s 126 or garbled “Moderatoato”.
- SOUND and TUNER are matching physical round buttons.
- Native Metal dial (build 122 maps and Video A scale) is unchanged.
- BEATS: numbered physical bubbles from native `beatIndex`. Tap a beat, then MUTE / SOFT / BEAT / STRONG.
- TIME SIGNATURE and SUBDIVISION are separate metal pills. Quarter reads STRAIGHT.
- Transport is TAP · Play/Stop · approved POCKT P. One transport. Playing turns the same pill into Stop with restrained teal.
- The P button uses `assets/branding/pockt-2-mark-approved.png` and opens existing Settings.
- Bottom rail: DIAL, PULSE, PENDULUM, PRO, BEATLINE, MECHANICAL, LED GEAR.

## Audio

The previous Play control only started and never stopped. That is now one `toggle()`.

The native start path already restores a silent/stale AVAudio graph (`restorePlaybackGraph` + `startReportIsAlive`) before Play. That path was preserved. The engine was not replaced.

Acoustic reliability still requires Gregg’s iPhone. A passing UI test is not a claim that first Play is audible on device.

## Dial feel

RC2 already restored build 122 tracking. Sensitivity constants were not retuned this pass.

## Visual comparison

No real iOS screenshot is available on this Windows host. The Metal dial cannot be rendered here.

Expected remaining differences until a device photo exists:

- Chassis knobs and pills are machined-layer controls. There are no Blender-baked button maps.
- The dial is the approved 122 instrument, not a re-render of the illustration’s lighting or incorrect scale.
- Image text errors were corrected: POCKT, FIND YOUR POCKET, SOUND, TUNER, BPM, TAP, STRAIGHT, face names.
- Printed scale remains `20 40 60 80 100 120 160 200 260 320 400`.
- Pockets (Studio / Custom / Rig) are no longer on this face. They stay in the existing view selector, reachable from other faces’ bezel.

## Validation

| Suite | Result |
|---|---|
| `npm test` | PASS |
| `tsc --noEmit` | PASS |
| Native local compile | not available (no Xcode) |

## Preserved

| Item | Evidence |
|---|---|
| Machine workspace | `C:\Apps\POCKT` `m3-scrub` @ `2418f42` |
| Build 122 dial | `pockt3-baseline-A` |
| Build 128 / 130 | prior `pockt-3` commits untouched except Classic Dial chrome |
| Other faces | still hosted |

## Physical-device checklist

1. First launch or reset: 120, pointer at 120, 4/4, STRAIGHT, pocket sound.
2. Play produces click on the first press. Stop is the same button.
3. Slow 120→121→122→120. Fast sweep and reverse. Lift stops immediately.
4. SOUND, TUNER, TIME SIGNATURE, SUBDIVISION, TAP, P → Settings.
5. Beat bubbles follow the click. Accents are audible.
6. Face rail keeps BPM and sound.
7. Background / interruption if testable.
