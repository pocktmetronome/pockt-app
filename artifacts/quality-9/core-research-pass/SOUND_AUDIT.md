# Sound audit

The shipped library is larger than a tight 40–80 set and is already grouped in `constants/sound-library.ts` (classic, wood, percussion, electronic, voice, and others). Names in the browser are the studio labels, not raw filenames.

This pass did not replace the recordings. A cool sample is not accepted as a metronome click until the matrix shows it stays shorter than the musical gap at the tempos where it will be used. `SOUND_MATRIX.md` is the offline duration and peak evidence. It is not a guitar, bass, piano, drum, or headphone listening test.

Accent levels remain 0 silent, 1 soft, 2 normal, 3 strong. Stored level and the transient lamp are separate. Strong must not be a second clock.

Audition uses the existing preview path when stopped. While playing, a sound change goes through `applyConfig`, which logs the swap and calls `recoverPlaybackPreservingPhase` so the clock is not rebuilt.

Click buffers are prepared in `PocktTiming.prepare` before play, not decoded on the beat.

What still needs ears, on a device: fatigue, masking against instruments, low phone volume, and whether any surviving long sample should be shortened or removed.
