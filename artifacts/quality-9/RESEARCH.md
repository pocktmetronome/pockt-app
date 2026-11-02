# Quality research

Date: 2026-09-28. Starting commit: `535f7d19479c97ce820a1d8a256164dca48fe2c4`.

This note extracts principles. It does not copy another product's appearance.

## Timing

Apple's `AVAudioPlayerNode` timeline is the render sample clock. `play()` without a time starts on the next render quantum. `play(at:)` and `scheduleBuffer(_:at:)` pin a buffer to a sample time on that clock. `lastRenderTime` is the way to name a shared future sample. Host time and sample time are different clocks; mixing them across nodes loses the common origin. `.interrupt` resets a node's sample timeline. Output latency is buffer duration plus safety offset, stream latency, and device latency. `AVAudioSession` preferred sample rate and I/O buffer are requests. The actual values are `sampleRate` and `ioBufferDuration` after activation.

Musician reports repeat the same split: an app can schedule a steady pulse and still sound late once Bluetooth, a large buffer, or a route change sits between the render clock and the ear. A click that only the player hears can be late and still be usable. A click that must meet a track, a band, or a recording cannot. Wired output is the practical low-latency path. Bluetooth delay is a property of the route, not something a UI timer can cancel. Tempo changes must keep already-heard beats where they were. Restarting the player to apply a new BPM is the usual source of a doubled or dropped beat.

POCKT already schedules clicks with `AVAudioTime` sample times in `PocktTimingEngine` and keeps the same rules in `lib/native-transport-math.ts`. That JS file is an offline mirror. It is not a playback clock. The phrase recorder's `setInterval` only updates the recording clock on screen.

## Interaction

Apple's HIG treats haptics as reinforcement of a visible change, not as a second narrator. Different actions need different transients. Reduce Motion removes travel that can cause discomfort and keeps the state change. Touch targets stay at least 44 points. Color is not the only channel for on/off. A custom control has to supply press, release, and selected feedback itself.

Practice use is one hand, often imprecise, often in a dark room. The tempo, play/stop, and accent controls have to be obvious before any secondary tool. Hidden gestures for those three are a deletion risk.

## What this pass did with the findings

The sample-timeline mirror and the audio-ownership lane were stressed offline. See `TIMING_AUDIT.md` and `stress-results.json`.

The faces in `artifacts/visual-gate-8/` were already judged, externally, to read as software rather than manufactured hardware. Another coat of gradients, capsules, and lamps would repeat the failure those pixels already show. This pass did not repaint them. The visual gate stays open.
