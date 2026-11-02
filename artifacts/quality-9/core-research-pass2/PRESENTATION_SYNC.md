# Presentation sync

Visual delay starts from the player sample timeline:

`delay = max(0, (targetSample - currentPlayerSample) / sampleRate)`

That moment is when the engine renders the click, not when the speaker moves.

For a built-in speaker or a wired output, the same delay then adds `player.outputPresentationLatency`. That is the player's published latency from render to presentation. `AVAudioSession.outputLatency` is reported and is not added again, so the hardware figure is not counted twice.

Bluetooth and AirPlay take the same measurements (`outputLatency`, `ioBufferDuration`, `outputNode.presentationLatency`, `player.outputPresentationLatency`) and leave the visual delay on the sample timeline. Their route delay is too large and too variable to apply from a Windows run.

The musical schedule is still the sample clock. This offset only moves the visual emission. It does not delay `scheduleBuffer`, and it does not create a second clock.

Device testing still has to confirm the built-in and wired offset against a microphone.
