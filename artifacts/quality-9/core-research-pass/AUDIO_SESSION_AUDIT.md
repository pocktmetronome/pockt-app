# Audio session

The native engine still owns category, activation, sample rate, and buffer duration. `actualSampleRate()` reads the mixer format and falls back to the session. It does not trust a preferred rate that the hardware rejected.

This pass adds the live route facts onto each visual tick: output latency, I/O buffer duration, session sample rate, and output presentation latency. After a route change the next ticks report the new values because they are read at schedule time, not cached at launch.

Tuner and phrase recording still take the session through the existing ownership handoff. Play after those modes goes through `enqueueAudio` and a fresh native start.

Not claimed from this machine: Bluetooth latency, AirPlay delay, interruption recovery, or media-services reset. Those need the device pass. The tick payload is the diagnostic for that pass.
