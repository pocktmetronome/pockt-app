# POCKT 3.0 Console — asset validation

Branch: `pockt-3`  
HEAD at inspection: `e27eb11ffe8c41fb7c534b840c70c1eed2493a09`  
Checkpoint: `pockt-3-console-asset-checkpoint-e27eb11`  
Masters: `assets-src/pockt-3-console/masters/` (bytes inspected; filenames are not treated as proof)  
Method: PNG-24 IHDR + full RGBA walk via `pngjs` (`scripts/inspect-console-masters.js`)  
Masters were not modified.

These candidates are generated stills renamed onto the manifest. None matched the production canvas on disk.

---

## Verdict table

| File | Status | Why |
|---|---|---|
| `console_chassis_deck.png` | **BLOCKED** | Wrong canvas and aspect; phone silhouette + device notch; baked wells/knobs/pills/transport; true center hole. Cannot cover a real iPhone without a second chassis floating inside the screen, and baked hardware would double the live controls. |
| `console_well_annulus.png` | **BLOCKED** | Not 2048²; baked 12-o’clock pointer and tick ring confirmed in pixels. Hole is too small relative to the outer ring, so a 1.28 D composite would cover the live Metal bezel. Removing ticks/pointer would be inpainting, not a reliable correction. |
| `console_knob_housing.png` | **CORRECTED** | Clean circular housing, true exterior alpha, no baked icon. Wrong size (1299×1211, not 256²). Crop-to-square + box downscale is deterministic. |
| `console_tap_housing.png` | **CORRECTED** | Byte-identical to the knob housing (`sha256 9d8a294a…`). No TAP letters. Same crop/downscale. |
| `console_play_plate.png` | **BLOCKED** | Baked Play triangle (center RGBA ≈ 228,182,138,252). Must not be used as the Stop plate. Icon cannot be removed without inventing brushed metal. |
| `console_pockt_housing.png` | **CORRECTED** | Same bytes as knob/TAP. Center is dark bronze, quiet enough for the live `Pockt2Mark`. No baked P. |
| `console_pill_plate.png` | **CORRECTED** | Empty capsule, no labels/chevrons. Aspect 2.00 vs required 4.00. Horizontal 9-slice after a height-192 scale is deterministic; radial brush in the stretch zone will elongate. |
| `console_beats_track.png` | **BLOCKED** | Baked illuminated dots and end sliders (center RGBA ≈ 251,240,155,253). Those lights are not live beat state and cannot be erased without inpainting. |

No file is **PASS** as supplied.

---

## Pixel facts (masters)

Shared notes:

- Every file is a readable PNG, color type 6 (RGBA), 8-bit.
- Exterior corners are true `a = 0`, not “black pretending to be transparent.”
- Almost no pixel is fully `a = 255`. Metal sits at `a ≈ 250–254`. That is a soft AI plate, not a hole. Dark brushed metal is real RGB (chassis has 80,496 pixels with `r,g,b < 8` and `a > 200`). Punching black → transparent would destroy those surfaces. Production prep only lifts `a ≥ 240` to 255.
- Knob / TAP / POCKT are the **same file** (identical SHA-256). Intentional reuse, not three unique housings.

### `console_chassis_deck.png`

| | Master | Manifest |
|---|---|---|
| Pixels | **759×2072** | 1290×2796 |
| Aspect | 0.3663 | 0.4614 |
| Alpha | 24.16% true transparent, 75.83% semi, 0.01% fully opaque | Opaque, no hole |
| Center | `0,0,0,0` (true hole) | Must be opaque deck |

Content conflict vs `computeFoundationLayout`:

- iPhone 14 frame 390×844 (aspect 0.462). Cover-scale of 759×2072 letterboxes or crops ~21% of the short axis.
- The plate is a **phone-shaped silhouette** with a notch/island. Real safe-area chrome is already the device. Putting this on screen draws a second phone inside the phone.
- Baked hardware (two top knobs, well lip, three lower capsules, two round + one capsule transport) does not sit on `layout.sound` / `layout.dial` / `layout.meter` / `layout.play`. Those recesses would show beside or through the live controls.
- The hole is authorial, not a 0.48 D Metal punch. It cannot track `layout.dial` across 320–430 pt widths.

Replacement required: full-bleed **1290×2796** machined deck, opaque, **no hole**, no device bezel, no baked controls, no text.

### `console_well_annulus.png`

| | Master | Manifest |
|---|---|---|
| Pixels | **1230×1278** | 2048×2048 |
| Content | 1229×1218, center (614, 637.5) | Square, center (1024, 1024) |
| Outer / inner radius | 599.6 / 399.8 px | Visible ring 768→1020, hole r=768 |
| Pointer / ticks | **detected** | Must omit |

Hole ratio `inner/outer ≈ 0.667`. Sized at the spec `1.28 D`, the hole is `0.85 D`. Native Metal circle is `0.96 D` (`VIEW_FILL = 0.48`). The ring would paint over the live bezel. Pixel walk also flags a 12-o’clock pointer and ≥12 mid-ring brightness crossings (ticks).

Replacement required: **2048×2048** well only, hole r=768 ±2 px AA, no bezel, ticks, pointer, hub, or “POCKT” engraving.

### `console_knob_housing.png` / TAP / POCKT

| | Master | Knob spec | TAP / POCKT spec |
|---|---|---|---|
| Pixels | **1299×1211** (not square) | 256×256 | 256×256 |
| Body | Circular, outerR 578.4, center (647.5, 600) | ⌀ 200 | ⌀ 216 |
| Center | `44,31,23,252` dark bronze | idle plate | quiet inner ~108 px |
| Labels / icons | none | none | none |

Usable. Production: square crop around the circle, box-filter to 256×256, lift near-opaque alpha. Same derivative is written to all three production names.

### `console_play_plate.png`

| | Master | Manifest |
|---|---|---|
| Pixels | **2185×720** | 1024×192 |
| Aspect | 3.03 | 5.33 |
| Center | `228,182,138,252` (the triangle) | empty capsule |

Keep the existing live Play/Stop control.

Replacement required: **1024×192** empty capsule, 9-slice x 168…856, no triangle, no stop square, no teal ring.

### `console_pill_plate.png`

| | Master | Manifest |
|---|---|---|
| Pixels | **1774×887** | 768×192 |
| Aspect | 2.00 | 4.00 |
| Center | `45,31,20,252` dark bronze | empty |
| Labels | none | none |

Usable after crop → height 192 → horizontal 9-slice to 768. Ends stay circular; the radial brush in x 144…624 elongates. That is accepted 9-slice distortion, not invented metal.

### `console_beats_track.png`

| | Master | Manifest |
|---|---|---|
| Pixels | **2048×768** | 1176×162 |
| Aspect | 2.67 | 7.26 |
| Center | `251,240,155,253` (lit marker) | empty rail |

Keep the existing live `ClassicDialBeats` bubbles.

Replacement required: **1176×162** shallow recessed rail, no dots, numbers, sliders, or “BEATS.”

---

## Integration rule for this pass

- **Do not** place the chassis or annulus. Geometry and baked hardware are significant defects. No mask / gradient reconstruction was attempted (stop condition).
- **Do not** place the Play plate or beats track.
- **Do** skin Sound, Tuner, TAP, POCKT, Meter, and Subdivision with the corrected plates. Live glyphs, values, TAP label, and `Pockt2Mark` stay React Native.
- Native `PocktDialView` remains the only dial. No second pointer or scale.

Device appearance is unverified on iOS. These measurements are file bytes, not a Metal framebuffer.

---

## Production derivatives created

Written by `scripts/prepare-console-assets.js`. Masters untouched.

| File | Pixels | Notes |
|---|---|---|
| `assets/pockt-3-console/console_knob_housing.png` | 256×256 | Square crop of the circular housing, box-filter downscale, `a ≥ 240` lifted to 255 |
| `assets/pockt-3-console/console_tap_housing.png` | 256×256 | Same bytes as the knob housing |
| `assets/pockt-3-console/console_pockt_housing.png` | 256×256 | Same bytes as the knob housing |
| `assets/pockt-3-console/console_pill_plate.png` | 768×192 | Content crop 1678×674 → height 192 → 9-slice caps 144 → 768 |

Blocked masters were not copied into `assets/pockt-3-console/`.

---

## Replacement pass (`bf3f287` → this commit)

Source: `assets-src/pockt-3-console/replacements/` (untouched).  
Checkpoint: `pockt-3-console-replace-checkpoint-bf3f287`.

| File | Status | Why |
|---|---|---|
| `console_chassis_deck.png` | **BLOCKED** | 853×1844 RGB, fully opaque, no silhouette/notch/hole/baked controls. Aspect 0.4626 matches iPhone. **Baked decorative ring** is centered on the plate but ~38–45 pt below `layout.dial` and smaller than the Metal circle (`innerR` 153–169 pt vs `0.48 D` 175–202 pt on current iPhones). Cover-placed, the gold ring cuts across the live instrument. Removing it would be inpainting. Not stacked with the well. |
| `console_well_annulus.png` | **CORRECTED** | 1254×1254, true center hole, no ticks (9 crossings), no pointer/hub/numbers. Native hole r=408.8 (0.326 of canvas). At `1.28 D` that is `0.417 D` and would cover `VIEW_FILL` 0.48 D (gap −23 to −26 pt). Deterministic fix: box-scale to 2048 and punch circular alpha r=768, 2 px AA. Remaining ring is a well lip only. |
| `console_play_plate.png` | **CORRECTED** | 2048×768 empty capsule. Center `138,93,61,253` (dark bronze, not a triangle). Crop → 192 h → 9-slice cap 168 → 1024×192. |
| `console_beats_track.png` | **CORRECTED** | 2127×739 empty rail. Center `132,94,66,253` (no lit marker). Crop → 162 h → 9-slice cap 81 → 1176×162. |

### Layering

Chassis is not placed. Well is placed at `1.28 D` centered on `layout.dial`, `pointerEvents: 'none'`, under `PocktDialView`. Play plate sits behind the live triangle/stop. Beats track sits behind live bubbles. No second pointer or scale.

### Production added this pass

| File | Pixels |
|---|---|
| `assets/pockt-3-console/console_well_annulus.png` | 2048×2048, hole r=768 |
| `assets/pockt-3-console/console_play_plate.png` | 1024×192 |
| `assets/pockt-3-console/console_beats_track.png` | 1176×162 |

Chassis was not copied into production.

---

## Chassis + dial pass (`40f1ed2` → this commit)

New replacement chassis (overwrote the ringed candidate in `replacements/`). Checkpoint: `pockt-3-console-chassis-dial-checkpoint-40f1ed2`.

| File | Status | Why |
|---|---|---|
| `console_chassis_deck.png` | **CORRECTED** | 852×1846 RGB, 100% opaque, aspect 0.4615 vs 1290/2796 = 0.4614. No hole, no circular recess, no notch, no baked controls. Wavy bronze frame is lighting on the plate, not a cutout. Cover-mapped, the live dial clears the inner deck on iPhone 8 / 14 / 15 / 16 Pro / 15 Pro Max. Uniform box-scale → **1290×2796**. |

Layering now: chassis (cover, `pointerEvents: none`) → well `1.28 D` → native `PocktDialView` → live chrome. No second pointer or chassis ring.

### Dial pipeline (inspected before edits)

`UITouch` → `fingerAngle` → 1:1 angle add after 0.4° grab unlock → `rawBpmFromAngle` (Video A piecewise 20–120–400) → `latestInteger` (0.85 BPM hysteresis) → `committedBpm` → `onBpm` → RN `setBpm` → `PocktTiming.setConfig` (no restart) → `bpm` prop → `applyBpm` (ignored while dragging).

Confirmed defects, then fixed:

1. `onBpm` fired only in `endDrag` via `pendingEngineBpm`. During drag the Metal ring moved but the readout and native clock stayed on the previous integer.
2. `touches.first` could let a second finger steal the grab.

Preserved: nonlinear marks, 1:1 finger degrees, hysteresis, no flywheel (`omega = 0` while dragging), hub tap, 20/400 clamps, latest-integer emit (not a step train).
