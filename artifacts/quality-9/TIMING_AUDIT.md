# Timing audit

Authority: `modules/pockt-timing/ios/PocktTimingEngine.swift`, architecture string `v13-sample-schedule`.

The player sample timeline is the musical clock. Beat and subdivision deadlines are sample positions on tempo segments (`PocktTransport.swift`). A tempo change appends or coalesces a segment at the last committed tick. It does not move samples already scheduled and it does not call `player.stop()` for a live BPM edit. Visual phase, pulse launches, and pendulum angle are consumers of that clock. The JS mirror in `lib/native-transport-math.ts` is diagnostic only.

`AVAudioSession` category, mode, options, and activation live in `PocktAudioSession.swift`. Preferred rate and buffer are not treated as the actual rate. `actualSampleRate()` reads the running mixer and the session after activation. Route changes, interruptions, and media-services reset are handled in the engine. Tuner and phrase capture take the input graph and must restore the playback graph on exit. JS serializes those owners through `lib/audio-ownership.ts`.

## What was measured

Command: `node --experimental-strip-types scripts/run-quality-9-stress.js`

Sample rate in the harness: 48000. Each constant-tempo row is 2400 events. Meters and subdivisions used ticks-per-beat 1, 2, 3, 4, 5, 6, 7, 8, and 12 at every BPM below. Max scheduled error is rounding to one sample.

| BPM | Interval | Max error | Drift over 2399 intervals | Result |
| --- | --- | --- | --- | --- |
| 20 | 3000 ms | 0 | 0 | PASS |
| 30 | 2000 ms | 0 | 0 | PASS |
| 40 | 1500 ms | 0 | 0 | PASS |
| 60 | 1000 ms | 0 | 0 | PASS |
| 96 | 625 ms | 0 | 0 | PASS |
| 120 | 500 ms | 0 | 0 | PASS |
| 160 | 375 ms | 0 | 0 | PASS |
| 200 | 300 ms | 0 | 0 | PASS |
| 260 | 230.7692 ms | 0.019231 ms | -0.009615 ms | PASS |

At 48000 Hz one sample is 0.020833 ms. 60/260 seconds is 11076.923 samples, so the nearest sample is the only legal deadline. The 0.019 ms peak is that quantization, not a second clock and not a drift that grows with the run. The cumulative error over 2399 intervals stays under one sample. Sub-sample scheduling was not added.
| 320 | 187.5 ms | 0 | 0 | PASS |
| 400 | 150 ms | 0 | 0 | PASS |

Also PASS in the same run: 1000 tempo mutations alternating 20 and 400, phase continuity 20→400 and 400→20, 1000 play/stop lane cycles, 200 tuner and recorder enter/exit cycles, one stale-token rejection, 1000 phrase record/stop/clear cycles. Output: `artifacts/quality-9/stress-results.json`.

These numbers are scheduled sample positions. They are not rendered audio.

## Not claimed

Sample-accurate playback on a device is NOT PROVEN. Host-time alignment, buffer underruns, Bluetooth delay, headphone route changes, interruptions, background/foreground, and tuner or recorder recovery were not measured on hardware. The engine contains those paths. This audit did not execute them.
