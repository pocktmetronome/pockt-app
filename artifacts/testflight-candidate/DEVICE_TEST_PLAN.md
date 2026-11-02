# Device test plan

This build is for Gregg’s internal TestFlight. Windows proofs are not ear or haptic acceptance.

## First beat
Play from stopped on Dial, Rhythm, Pulse, Pendulum, Pro, and Beatline. The first click and the first visual beat are beat 1. Pulse moves on that beat.

## Play / Stop
Press and release. The housing depresses immediately. Playing appears only after the native start succeeds. Double-tap and rapid Play/Stop do not leave a silent engine or a stuck Playing face.

## Sound
Compare several curated clicks while stopped (one-shot audition) and while playing (the running clock changes click, tempo and phase stay). Voice counts 1–8 speak the primary beat. Subdivisions under voice stay a short click.

## Accents
OFF is silent. SOFT is present and quieter. NORMAL is the reference. STRONG is obvious and not harsh. Downbeat and the active-beat lamp stay different ideas.

## Meter and grouping
From the meter plate: 2/4, 3/4, 4/4, 5/4 3+2, 5/4 2+3, 6/8, 7/8 2+2+3 / 2+3+2 / 3+2+2, 9/8, 12/8, and one custom meter. While playing, the plate shows NOW and NEXT. The bar does not splice. NEXT clears on the downbeat.

## Subdivision
Quarter, 8ths, triplet, 16ths, dotted. While playing, the change lands on a bar boundary and does not restart the clock.

## Tempo
Dial, +/− one BPM, Tap, and the 20–400 keypad all land on the same tempo. Tap is usable within a few intervals. A double tap and a missed tap do not throw the tempo away.

## Faces
Dial scale and pointer. Rhythm drum and bed. Pulse at 40, 120, and 300. Pendulum throw and return. Pro roller versus accent. Beatline 4, 7, and 12. Shutter open, partial, closed. Phrase empty, record, ready, play, pause, clear. Tuner in tune, then exit back to a working metronome.

## Session
Headphones, Bluetooth, AirPlay, a phone call interruption, background and foreground. Built-in and wired visuals should track the click. Bluetooth and AirPlay latency are not compensated; note what you hear against the picture. Logs include sample rate, route, output presentation latency, session output latency, and I/O buffer duration.

## Feel
Haptics: detent, play, tap, selector, shutter, record, in tune. Beat haptics stay off unless turned on. UI clicks must not cover beat 1.

## Small phone
320-wide: BPM, meter, subdivision, Play, Tap, 12 beats, sound browser, meter sheet, phrase, navigation. No collisions.
