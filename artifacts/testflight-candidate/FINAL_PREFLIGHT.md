# Preflight

Starting head `bcdd636d634182cb11b5bbda25ebe7d6d89f9f81`.

## What changed before the build
Every primary face keeps the same instrument shell. Meter and subdivision are machined plates on that shell, including Rhythm, Pulse, Pendulum, Pro, and Beatline, and they stay up when the phrase deck is open. Each plate is 32 pt tall with extra hit slop. The current value stays full size. A waiting change engraves `NEXT` on the same plate and clears when the bar commits. 5/4 and 5/8 groupings still drive the suggested accents. Subdivision opens with the subdivision choices first.

Spoken counts stay on the primary beat. A subdivision under voice uses the short `click` buffer instead of speech. Stopped sound choices audition once. Playing choices join the running clock and do not start a preview player.

Accent gains remain SOFT 0.40, NORMAL 0.66, STRONG 0.84, subdivision 0.24, in one timeline function so a later device pass can retune them. OFF still schedules no buffer.

Play uses the play-commit haptic. Tap, the face rail, the shutter, and meter chips use the shared haptic map. Beat haptics stay off for a new install. UI detents stay on the separate quiet graph.

Presentation delay is still `(targetSample - currentPlayerSample) / sampleRate`, plus `player.outputPresentationLatency` only for built-in and wired routes. Session `outputLatency` is logged and not added again. Bluetooth and AirPlay stay uncompensated.

The sample scheduler was not rewritten.

## Proofs
Phone frames in this directory. The contact sheet is the six faces at 320×568.

## Offline results
`npx tsc --noEmit` passed. `npm test` passed, including the sound matrix (62 facing sounds, 0 general-click overlaps), tap vectors, accent check, first-beat check, abuse harness, and quality-9 stress.

## Not accepted from Windows
Shaped clicks have not been heard. The Swift envelope and presentation offset compile only when the iOS build runs. AVAudioEngine play/stop, memory, Bluetooth, AirPlay, VoiceOver focus order, and haptic feel are device tests.
