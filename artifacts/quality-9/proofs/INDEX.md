# Proof index

Phone renders from reconstruction pass 4. Starting head `fafad5d1107da27728ecf86d149aecddb56b5d6f`.

Authoritative size order is 320×568 (`320-*.png`, `40-final-small-phone.png`), then 390×844 (`390-*.png` and the numbered stills), then detail crops.

Candidates kept from the phone-size comparison: `pendulum-candidate-beam.png`, `pendulum-candidate-fork.png`, `pulse-candidate-bars.png`, `pulse-candidate-cone.png`, `play-candidate-round.png`, `play-candidate-square.png`, `beatline-candidate-blocks.png`, `beatline-candidate-lenses.png`, `shutter-candidate-leaf.png`, `shutter-candidate-slab.png`.

Tempo bands change presentation only. Musical timing is the native scheduler.

- Slow, under 80 BPM: pulse reach scale 1.18, every stored front stays visible, ring lifetime uses `(60000 / bpm) * 1.9` clamped between 640 and 2400 ms.
- Medium, 80–239 BPM: reach scale 1, at most two fronts, lifetime 380 ms from 160 BPM upward.
- Fast, 240 BPM and above: reach scale 0.62, one front, lifetime 260 ms.
- Reduce Motion: one front, 140 ms lifetime, pendulum throw scaled by 0.22.

Sequences: `pulse-bpm-40.png`, `pulse-bpm-120.png`, `pulse-bpm-300.png`, and the matching `*-reduced.png` files. Pendulum comparison: `pendulum-motion-normal.png`, `pendulum-motion-reduced.png`.

Launch: `launch-cold.png` is the first non-black paint, the short ident. `launch-first-frame.png` is the first tempo frame. `launch-settled.png` is the instrument after layout. The earlier solid-black file was a screenshot taken before the webview painted.

Motion strips are ordered stills, not a device frame-rate recording.
