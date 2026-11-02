# Quality report

Starting HEAD: `fafad5d1107da27728ecf86d149aecddb56b5d6f`

The scheduler was not changed. 260 BPM remains one-sample quantization at 48 kHz.

Visual tempo bands are documented in `proofs/INDEX.md`. They change persistence, reach, and lifetime. They do not change the musical clock.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | pass | `npx tsc --noEmit` |
| Unit and stress tests | pass | `npm test`, including quality-9 stress |
| Pendulum | remaining failure | Channel section, clamp carriage, and trunnion replaced the fork. At phone size it still reads as a bar, a rectangular slider, and a pivot block |
| Pulse | reconstructed | Trapezoid column from the emitter with a bright leading edge. Slow BPM travels farther. Fast and Reduce Motion stay short. It can still read as a drawn funnel |
| Play | reconstructed | Circular plunger in its own housing, with press travel. The earlier wide key and square cap were rejected |
| Beatline | remaining failure | Metal carriers in a channel. 12-beat still wraps into three rows of small capsules |
| Shutter | reconstructed | Two overlapping plates. Closed covers the beat region. Partial shows the step and the beats underneath |
| Rhythm | partial | Machined annulus with slots between beat segments and a short index |
| Launch | harness was the black frame | First painted frame and settled frame show the dial. Ident no longer holds the instrument for 2.2 s |
| Reduce Motion | rendered | Pulse lifetime and reach shrink. Pendulum throw is 0.22 of the normal swing |
| Device frame pacing, audio, haptics, microphone | device-only | |

No TestFlight, EAS, or release build was made.
