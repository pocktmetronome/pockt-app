# Subdivision

The primary subdivision control is the meter sheet, opened from the subdivision readout on the instrument. It is not buried in settings.

Choices already in `SUBDIVISION_ORDER` stay: beat only, eighths, triplets, sixteenths, and the compound options the engine already schedules.

A change during playback uses the same next-downbeat commit as a meter change. The native player is not stopped. Fast repeats overwrite the pending patch. Only the latest choice is applied, on one bar boundary.

There is no second clock for subdivision.
