# Nav icon measurements — 390

Labels, tray, selected DIAL tile, columns, and hit regions were not moved. Each glyph has its own scale and optical offset.

Target stroke boxes are the bright icon shapes in y 778–808 (above the target label ink near y 812), min luminance 120. Production boxes below include label ink wherever the scaled glyph meets the label, so a full-column width is not treated as the icon.

## Target (min luminance 120, y 778–808)

| Icon | Box | Center |
| --- | --- | --- |
| DIAL | 28, 783 20×22 | 37.7, 793.4 |
| RHYTHM | 95, 787 15×16 | 101.3, 794.4 |
| PULSE | 153, 785 18×19 | 161.8, 793.9 |
| PENDULUM | 220, 781 10×24 | 224.5, 796.4 |
| PRO | 278, 785 14×18 | 284.5, 793.7 |
| BEATLINE | 336, 785 21×16 | 345.9, 793.0 |

The DIAL target box sits on the same pixels as the large DIAL word. It is not a clean circle separate from the label.

## Production

Per-icon transforms on the 15 px glyph (facade, not compact):

| Icon | scaleX | scaleY | dx | dy |
| --- | --- | --- | --- | --- |
| DIAL | 1.55 | 1.55 | 4 | 6 |
| RHYTHM | 1.45 | 1.45 | 2 | 6 |
| PULSE | 1.05 | 1.70 | 0 | 6 |
| PENDULUM | 1.55 | 1.55 | -1 | 4 |
| PRO | 1.20 | 1.45 | -6 | 5 |
| BEATLINE | 1.45 | 1.70 | -5 | 6 |

Production glyphs sit above the locked labels (label ink about y 784–792). Target icon centers are about y 794. Moving a glyph down to that center covers the label. The safe-area lock keeps the labels higher than the target icon band, so center delta stays above 3 px.

Pendulum is still a pivot, a vertical rod, and a round bob.

## Gate (width ≤ 5%, height ≤ 5%, center ≤ 3 px)

| Icon | Result |
| --- | --- |
| DIAL | FAIL |
| RHYTHM | FAIL |
| PULSE | FAIL |
| PENDULUM | FAIL |
| PRO | FAIL |
| BEATLINE | FAIL |

None of the six is inside the gate.
