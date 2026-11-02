# POCKT 13.0 — NEXT PASS REQUIREMENTS

## Whiskey Bar — locked direction
- Active immersive order: Whiskey Bar, Studio, Altered.
- Whiskey Bar remains immersive-first and intentionally simpler than the utility-heavy classic rooms.
- Keep core metronome basics; remove room-specific clutter that hurts immersion.
- Remove Whiskey Bar generic rectangular beat bars.
- Remove the current Behind / Ahead / Straight treatment from Whiskey Bar.
- Move PLAY/STOP into the lower thumb zone where Straight/feel currently dominates.
- Rehouse BPM in the physical Tempo Block near master x=0.500, y=0.742.
- Keep HOME and MIX accessible without covering faces/hands/beat objects.
- Beat object states: 0 absent, 1 small, 2 medium, 3 full. Animate growth smoothly from the base/contact point.
- Native audio clock remains the absolute timing master; no JS beat scheduler.
- Lighting impact is good and should be preserved/refined.
- Initial physical beat set: Tap Puck / Rocks Glass / Jigger / Shaker.
- Retire coaster-v1 from active use, keep file for rollback.
- Do not force bartender-isolation animation until production layers composite cleanly.

## Meter / time-signature redesign
User wants a much easier meter system while preventing invalid configurations.
- Keep useful musical presets.
- Add a constrained custom selector rather than free text.
- Numerator should be quickly adjustable with a dial/slider/wheel and support practical odd meters (e.g. 5, 7, 9, 11, 13 and higher practical values).
- Denominator must be constrained to valid musical note values (e.g. 2, 4, 8, 16; inspect current architecture before choosing final supported set).
- Allow odd signatures such as 7/8 and common compound/grouped patterns.
- Provide as many musically valid combinations as the engine can truly execute without exposing combinations the engine cannot represent correctly.
- Preserve preset groupings such as 5/8 2+3 vs 3+2, 7/8 2+2+3 / 2+3+2 / 3+2+2 where supported.
- Audit how subdivisions and meter currently interact across the app before changing behavior.
- Never fake unsupported meters in UI.

## Tuner — major quality correction
The tuner concept/UI is liked, but tracking quality is not acceptable.
Required engineering audit and improvement:
- Increase practical pitch-detection sensitivity so quiet/plucked strings are picked up more reliably.
- Improve pitch accuracy against stable reference tuners.
- Reduce lag/sticking when a user tightens or loosens a string.
- The cents/needle display should track the changing pitch smoothly and continuously toward center while the string is adjusted.
- Avoid over-smoothing that causes visual latency.
- Avoid jitter when pitch is actually stable.
- Inspect microphone input level, pitch detector window/hop sizes, confidence thresholds, smoothing/filtering, hysteresis/note-lock behavior, update cadence, and UI animation path.
- Tune detection and visual smoothing separately: responsive raw detection plus tasteful UI smoothing.
- Test chromatic response across guitar/bass-relevant ranges and repeated tighten/loosen sweeps.

## Sound-library quality work in same broader version
- SYNTH bank needs a real overhaul/replacement. Current three exposed synth choices are not acceptable.
- Audit unused analog-synth candidates already in the source catalog before acquiring more sounds.
- Rhythmic Voice / Voice fighting-game-like sounds remain a separate cleanup target.
- VOCAL curated POCKT MIX should remain removed until vocal quality is fixed; do not delete the full Vocal library.
- Preserve BAR sound bank and Whiskey Bar curated mix.

## Mix clarity
Audit current AUTO vs CUSTOM behavior and wording.
Goal: make it obvious that AUTO uses POCKT's paired/curated accent behavior while CUSTOM lets the user choose the accent sound manually, if that matches actual implementation.
Use the smallest clear wording/UI correction; do not rebuild Mix unnecessarily.

## QA / release discipline
- Preserve native timing reliability above all else.
- Studio and Altered must remain unchanged unless a shared bug fix is required.
- After Dark code/assets stay preserved but inactive.
- TestFlight only during development; do not disturb the currently submitted public release.
