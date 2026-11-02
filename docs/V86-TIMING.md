# POCKT V8.6 Timing Engine

The musical clock is native iOS (`modules/pockt-timing`).
JavaScript sends high-level commands only: BPM, subdivision, meter, sound, feel, haptic sync, start, stop.

## What is measured where

| Kind | What it proves | What it does not prove |
| --- | --- | --- |
| `node scripts/run-timing-math-tests.js` | Absolute-timeline math and no cumulative rounding drift | Speaker output |
| Native `runMathSelfTest` (MIX → DEV TIMING LAB) | Same math inside Swift | Speaker output |
| Native live diagnostics during playback | AVAudioPlayerNode scheduled sample times vs mathematical targets | Acoustic jitter |
| `node scripts/validate-click-recording.js` | Inter-onset intervals in a WAV capture | Nothing unless the WAV is a real device recording |

## Physical iPhone test (required before calling V8.6 finished)

Expo Go cannot run this engine. Use a native build:

```sh
npx expo prebuild --platform ios
npx pod-install
npx expo run:ios --device
```

Or EAS:

```sh
npx eas-cli build --platform ios --profile development
```

Then on device:

1. Start at 60, 80, 88, 120, 200, 240, 300, and 400 BPM for at least 60 seconds each.
2. Confirm 400 BPM quarter / eighth / sixteenth feel like 150 / 75 / 37.5 ms.
3. Open MIX → DEV TIMING LAB → MATH TEST and LIVE DIAG.
4. While playing, tap JS STRESS. Audible spacing must not change.
5. Change BPM, subdivision, and sound while running. Stop must leave no ghost click or haptic.

## External acoustic validation

Record iPhone output (line-out, USB, or a clean room mic of the speaker) to a 16-bit PCM WAV, then:

```sh
node scripts/validate-click-recording.js --file capture.wav --bpm 400 --subdivision quarter
node scripts/validate-click-recording.js --file capture.wav --bpm 400 --subdivision eighths
node scripts/validate-click-recording.js --file capture.wav --bpm 400 --subdivision sixteenths
```

Do not quote those numbers as measured jitter unless the file is a real capture.

## Haptic hardware limit

Audio is never thinned. Core Haptics is scheduled natively from the same timeline, with the user HAPTIC SYNC offset applied only to haptics. The Taptic Engine cannot cleanly render distinct transients closer than about 45 ms, so surplus haptic events are dropped at extreme 16th-note rates.
