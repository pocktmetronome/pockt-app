# Build 141 correction acceptance

Web screenshots in this folder are layout evidence. They do not prove native audio, haptics, or finger tracking.

| Requirement | Result | Evidence |
| --- | --- | --- |
| A. Beat 0/1/2/3 materials | PASS | `beats-0.png` through `beats-3.png` are dark, bronze, teal, and white |
| A. Whole-button flash and physical depth | NATIVE DEVICE REQUIRED | Active beat is wired. Feel is not proven on web |
| B. Shutter hides the row and keeps accents | PASS | `shutter-closed.png`. Test asserts the shutter handler does not call `onChange` |
| B. Shutter animation and green/red lamp | PASS for the two states. Motion feel is NATIVE DEVICE REQUIRED | |
| C. Center play always makes sound | NATIVE DEVICE REQUIRED | Play now restores and prepares the native graph every start. No device run proved it |
| D. Rhythm direction mapping | PASS | `rhythmVisualRadians` negates the console angle. Console gesture math was not rewritten |
| D. Rhythm 1:1 feel and metal wheel | NATIVE DEVICE REQUIRED | `rhythm.png` did not render the Skia wheel on web |
| E. Pulse stopped: no BPM, POCKT mark, ring, dot | PASS | `pulse-stopped.png` |
| E. Pulse waves past the rim, native sync | NATIVE DEVICE REQUIRED | Outer scale is 1.45. `pulse-wave.png` is a static stand-in, not a native beat |
| E. Pulse dot BPM, wrap, 20–400 | PASS for the mapping tests. Drag feel is NATIVE DEVICE REQUIRED | |
| F. Pendulum swing, grab, rejoin, 376–400 | PASS for the mapping tests and `pendulum-left.png` pose. Live rejoin and the high-BPM drag are NATIVE DEVICE REQUIRED | |
| G. Pro rectangle, 4/4, 7/8, 12/8, lower action | PASS | `pro-4.png`, `pro-7.png`, `pro-12.png` show cells, the phase strip, and the shared wheel |
| H. Horizontal wheel math | PASS | Direction, 1 BPM step, and 20/400 clamps |
| H. Horizontal wheel as a console-grade machined control | NOT COMPLETE | `wheel.png` is a recessed tick roller. It is not yet the console dial's visual or tactile equal |
| I. Beatline rectangle and 4/4, 7/8, 12/8 wrap | PASS | `beatline-4.png`, `beatline-7.png`, `beatline-12.png` |
| J. Tonearm base off the record, stylus off the label | PASS | Geometry tests and `tuner-flat.png` / `tuner-in.png` / `tuner-sharp.png` |
| J. Flat means up, sharp means down, in-tune lock once | PASS for labels and the latch test. The chime and haptic are NATIVE DEVICE REQUIRED | |
| J. Pitch trail | PASS | `tuner-trail.png` shows a fading scratch. It is thin |
| K. Rapid face switching, no stale audio | NATIVE DEVICE REQUIRED | Face changes close the tuner in code. No device run |
| L. One native clock | PASS | Face sources do not add `setInterval` |
