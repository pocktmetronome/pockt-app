# Beat ring measurements — 390

Compared `artifacts/north-star-pixel-lock/target-aligned-390.png` with `production-390.png` after the final glow pass. No new art. Shell opacity on the 390 presentation is 0 so the bronze dome does not read as a black marble. The existing strong-glow asset is clipped into each well.

Target rings are thin illuminated annuli. A radial fit (center chosen to maximize ring-versus-core contrast) is the measurement that matches that shape. A filled luminance box on the target collapses to a few pixels because the ring center is darker than the rim.

## Target radial fit

| Beat | Center | Peak radius | Outer D at lum 60 | Outer D at lum 50 | Outer D at lum 40 |
| --- | --- | --- | --- | --- | --- |
| 1 | 93, 614 | 13 | 44 | 62 | 72 |
| 2 | 157, 615 | 14 | 34 | 74 | 78 |
| 3 | fit contaminated by the dial edge | — | — | — | — |
| 4 | 271, 615 | 13 | 34 | 40 | 44 |

Beat 4 is the clean ring. Its visible outer diameter is about 44 px (lum 40) and the bright annulus peaks at radius 13. Beat 1’s lum-40 diameter includes downward bloom.

## Production cross-section (lum ≥ 50, scan stopped above the numerals)

| Beat | Width | Reported center | Peak |
| --- | --- | --- | --- |
| 1 | 40 | 89.5, 611.5 | 90, 608 |
| 2 | 40 | 150.5, 612.5 | 150, 608 |
| 3 | 38 | 211.5, 612.0 | 211, 608 |
| 4 | 34 | 272.5, 614.0 | 274, 608 |

Height of these crosses is cut by the numeral mask, so the outer diameter used for the gate is the width.

## Gate (outer diameter ≤ 5%, center ≤ 3 px)

Using beat 4’s clean target outer diameter of 44 px, and each target center from the radial fit:

| Beat | Diameter delta | Center delta | Result |
| --- | --- | --- | --- |
| 1 | 40 vs 44 = 9% (vs bloomed D50 62 = 35%) | x 3.5 px, y 2.5 px | FAIL |
| 2 | 40 vs 44 = 9% | x 6.5 px, y 2.5 px | FAIL |
| 3 | 38 vs 44 = 14% | center not established on the target | FAIL |
| 4 | 34 vs 44 = 23% | x 1.5 px, y 1.0 px | FAIL |

The glows are separate warm discs, not black marbles. They are still smaller than the target rings, and beats 1–2 are not inside the center gate. Growing the same asset further merged the discs into one another.
