# North Star geometry

Artboard contract from the locked kit, `spec/north_star_geometry.json`.
The artboard is 1024 by 1536 and includes the phone bezel.
Production maps the same stack onto the live screen between the status area and the home indicator.

## Artboard regions, normalized

| Module | x | y | w | h |
| --- | --- | --- | --- | --- |
| Header | 0.15 | 0.06 | 0.70 | 0.10 |
| Tempo group | 0.18 | 0.14 | 0.64 | 0.10 |
| Dial | center 0.50, 0.45 | diameter 0.68 of artboard width | | |
| Beat strip | 0.16 | 0.67 | 0.68 | 0.105 |
| Transport | 0.16 | 0.79 | 0.68 | 0.085 |
| Bottom nav | 0.15 | 0.88 | 0.70 | 0.085 |

## Production rules

One layout function, `computeFoundationLayout`, derives every width.
It does not invent a separate geometry per breakpoint.

- Side margin is 4% of width, at least 12.
- Header hit is 48 by 52, inset by that margin. Tuner left, Sound right, POCKT centered.
- Tempo row sits 6 below the header. Left knob is +1. Right knob is −1. Both are 48 on short screens and 56 otherwise. The BPM well is the same height as the knobs.
- Dial diameter is the smaller of the stage height and `width - 14%`. It stays circular and centered. On a 390-wide screen that is about 86% of the width. On a 320-wide short screen the height wins, and the dial stays about 79% of the width.
- Beat strip is 64 on short screens, 76 otherwise, and 84 when the meter needs two rows. It never exceeds 84.
- Transport is one row. All four keys share one height: 48 short, 54 otherwise. Play is slightly wider. The row is centered.
- Nav rail is 50 short and 58 otherwise, sitting on the home-indicator inset.

## 390 by 844, top inset 47, bottom inset 34

| Module | x | y | w | h |
| --- | --- | --- | --- | --- |
| Header | 0 | 47 | 390 | 52 |
| Plus | 16 | 105 | 56 | 56 |
| BPM well | 78 | 105 | 234 | 56 |
| Minus | 318 | 105 | 56 | 56 |
| Dial | 27 | 218 | 336 | 336 |
| Beat strip | 16 | 610 | 358 | 76 |
| Transport | 32 | 692 | 327 | 54 |
| Nav rail | 4 | 752 | 382 | 58 |

Spacing between header, tempo, dial, beats, transport, and nav is the remainder after those modules. The dial takes that remainder, minus the 7% side inset.
