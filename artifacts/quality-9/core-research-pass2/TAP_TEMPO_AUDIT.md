# Tap tempo

`TapTempo` uses the monotonic timestamp passed in, which the UI takes from `performance.now()`.

Two taps produce a tempo. The estimator keeps the last four intervals and uses their median. A gap shorter than 62% of the fastest allowed interval is ignored as a double tap. A gap about twice a recent interval is treated as one missed beat. A gap longer than the slow-tempo window clears the history. Results clamp to 20–400. A small change blends with the previous display. A change of 8 BPM or more takes the new estimate so a real tempo move is not averaged away.

The vectors cover steady taps, jitter, a double tap, a missed tap, a sudden change, 20 BPM, 400 BPM, and a stale reset. `tapTempo()` in the metronome hook still calls `setBpm`, the same setter as the dial and the pad.
