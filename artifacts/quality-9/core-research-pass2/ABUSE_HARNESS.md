# Abuse harness

`scripts/run-abuse-harness.js` runs 1000 play/stop pairs, 1000 BPM writes inside 20–400, 1000 sound id swaps, and 500 meter queues on the same commit rule as the live hook. It checks that the hook and the native engine contain no `setInterval`, and that start rejects a second start already in flight.

It does not boot AVAudioEngine, allocate native buffers, or measure iOS memory. Those cycles stay device-only.
