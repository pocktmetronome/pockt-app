# Timing sync audit

The sample scheduler remains the authority. JavaScript does not schedule musical clicks and does not delay `scheduleBuffer`.

Visual events are aligned to the player sample timeline:

- Target sample comes from the musical schedule.
- `player.lastRenderTime` converted with `playerTime(forNodeTime:)` supplies the current player sample.
- The visual wait is `max(0, (targetSample - nowSample) / sampleRate)`.
- `eventHostTime` is the same musical origin plus the event offset. Pulse, pendulum, and beat lamps consume that host time.

That is scheduled sample time, not the moment sound leaves the speaker.

Each tick now also reports, without applying them to the delay:

- `AVAudioSession.outputLatency`
- `ioBufferDuration`
- session sample rate
- `engine.outputNode.presentationLatency`
- `visualAlignsTo = playerSampleTimeline`
- `presentationCompensation = reported-not-applied`

Built-in speaker and wired output can be compensated later by adding those latencies to the visual delay once a device measurement shows the values match what is heard. Bluetooth and AirPlay can report much larger and less stable delay. Those numbers are instrumented so a device pass can record them. They are not treated as proof of sync.

The first musical event is the first scheduled sample. `firstBeatHostTime` is that event. `pulseBeatShouldLaunch(null, host, true)` opens the first pulse from that host. A repeated host does not open a second pulse.
