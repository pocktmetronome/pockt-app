# Build 69 DialRoom sectors — not implemented this pass

Source: `e8c4f6ae63eaa2a095e1d9c300f1a366f079dff6`  
File: `components/classic/DialRoom.tsx`  
Room id: `dial`  
Label: `DIAL`

There is no separate Simon-Says instrument in that commit. `docs/POCKT_PRECISION_CHECKLIST.md` section 5 calls the outer beat arcs “Simon zones” and states the composition is one instrument: outer arcs + tick ring + hub.

The current RHYTHM face was not changed in this pass.

## Geometry

`DialWheel` builds one Skia path per beat:

- `beats` = `TIME_SIGNATURES[timeSignature].beatsPerMeasure`, else `accentPattern.length`, minimum 1
- outer radius `size * 0.498`
- inner radius `size * 0.348`
- gap `min(2.2, 10 / beats)` degrees
- sweep `360 / beats - gap`
- sector `index` starts at `-90 + index * (360 / beats) + gap / 2` (12 o’clock, clockwise)

`ringSector` draws the outer arc, then the inner arc reversed, then closes the path.

## Light

`BeatArc` paints every sector `#1A2028`. The current sector also paints:

- downbeat (index 0): `#E23B3B`
- every other beat: `#3EE6D8`
- current index: `round(pulseBeat) % beats === index`, fallback `transport.beatIndex`
- opacity while playing and current: `pulse` interpolated `[0, 0.12, 1] → [0.28, 1, 1]`
- Skia inner shadow blur 10 in the lit color

Accent level does not recolor these sectors. Only beat index and downbeat do.

## What it is not

- Not a call-and-response game
- Not a recorded pattern
- Not a second room
- The rotary tick ring and hub play control are the same `DialWheel`, not a separate face

`RhythmPanel` in that commit is the meter sheet.
