# Crash and stress

This pass ran `npm test` to exit 0. That includes quality-9 timing stress, the structural-commit check, the first-beat check, and the offline sound matrix (154 WAV files). 260 BPM remains one-sample quantization at 48 kHz. The scheduler was not rewritten.

New offline checks:

- Structural commit: 1000 successive bar boundaries stay deterministic. Tempo patches are not held.
- First beat: a null previous host launches one pulse. The same host does not launch another. The engine exposes `firstBeatHostTime` and schedules with `AVAudioTime(sampleTime:)`.

Not run on this machine, and not marked passed:

- 1000 native Play/Stop cycles
- route-change, interruption, and media-services reset
- memory growth of the audio graph
- haptics and the microphone

Those remain device-only.
