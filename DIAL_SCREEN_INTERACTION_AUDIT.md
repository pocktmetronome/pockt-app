# Dial screen interaction audit

Build 160. The North Star face stays the V8 screen. Touch on this screen no longer goes through `PocktMechButton` or `PocktDialControl`.

| CONTROL | IMPLEMENTATION | CALLBACK | HAPTIC | PRESSED VISUAL |
| --- | --- | --- | --- | --- |
| DIAL | PocktDialView, opacity 0.001, hit testing on | onBpm → sanitize BPM → setBpm | native PocktDialView haptic | North Star artwork stays fixed. BPM readout and amber position arc follow the tempo. |
| TUNER | NorthStarLiveButton / Pressable, tuner cap | props.onTuner | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| SOUND | NorthStarLiveButton / Pressable, sound cap | props.onSound | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| MINUS | NorthStarLiveButton / Pressable, minus cap, JS repeat | props.onMinus → stepTempo(-1), clamp 20 | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Repeat after 400ms at 8 Hz, then 20 Hz after 1.5s. Stops on release. |
| PLUS | NorthStarLiveButton / Pressable, plus cap, JS repeat | props.onPlus → stepTempo(+1), clamp 400 | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Repeat after 400ms at 8 Hz, then 20 Hz after 1.5s. Stops on release. |
| BPM | Pressable | props.onBpm → keypad | none | readout only |
| LOOP | NorthStarLiveButton / Pressable, loop cap | props.onLoop | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| TAP | NorthStarLiveButton / Pressable, tap cap | props.onTap(timestamp) → tapTempo | tap | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| PLAY | NorthStarLiveButton / Pressable, play.png stopped, play-running.png while running | props.onPlay → toggle | playCommit | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Running cap shows the pause mark. |
| METER | NorthStarLiveButton / Pressable, meter cap | props.onMeter | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| P | NorthStarLiveButton / Pressable, options cap | props.onOptions | controlPress | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| BEAT 1 | NorthStarLiveButton / Pressable | cycle(0) → onAccents | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Lamp rendering unchanged. |
| BEAT 2 | NorthStarLiveButton / Pressable | cycle(1) → onAccents | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Lamp rendering unchanged. |
| BEAT 3 | NorthStarLiveButton / Pressable | cycle(2) → onAccents | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Lamp rendering unchanged. |
| BEAT 4 | NorthStarLiveButton / Pressable | cycle(3) → onAccents | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms. Lamp rendering unchanged. |
| NAV DIAL | NorthStarLiveButton / Pressable | props.onSelectRail('dial') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| NAV RHYTHM | NorthStarLiveButton / Pressable | props.onSelectRail('rhythm') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| NAV PULSE | NorthStarLiveButton / Pressable | props.onSelectRail('pulse') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| NAV PENDULUM | NorthStarLiveButton / Pressable | props.onSelectRail('smart-pendulum') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| NAV PRO | NorthStarLiveButton / Pressable | props.onSelectRail('pro') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |
| NAV BEATLINE | NorthStarLiveButton / Pressable | props.onSelectRail('beatline') | selector | translateY 1.5, scaleY 0.985, opacity 0.92, release 75ms |

Static faceplate, wordmark, position arc, and lamps use `pointerEvents="none"`. The screen root and instrument use `pointerEvents="box-none"`. The dial driver does not.
