# POCKT 3.0 Console — asset manifest

Branch: `pockt-3`  
HEAD: `e27eb11ffe8c41fb7c534b840c70c1eed2493a09`  
Screen: `FoundationDialRoom` via `computeFoundationLayout`  
Approved look: attached Console concept (512×1024 JPEG). That file is a flattened mock, not a device framebuffer and not a production atlas.

This folder receives **new chassis artwork only**. Do not replace the native dial, do not flatten the concept image into the UI, and do not bake live labels.

Incoming masters go in `masters/` as the filenames below. No placeholders have been generated.

---

## 1. Coordinate system (do not invent a new one)

### React Native layout — points, origin top-left of the phone

Source: `lib/compute-foundation-layout.ts`.

| Token | Non-compact (safe height ≥ 640) | Compact |
|---|---|---|
| Side gutter `g` | 20 (14 if width < 375) | same |
| Dial square `D` | `min(width − 10, bandHeight)` | `min(width − 16, bandHeight)` |
| Dial rect | centered in the band between BPM and BEATS | same |
| Sound / Tuner hit | 48×74 | 44×70 |
| Visual knob inside hit | 40×40 | 40×40 |
| Beats strip | full width minus 52 peek, height 54 | height 48 |
| Meter / Subdivision pills | two equal pills, height 48, 8 pt gap | height 44 |
| TAP / POCKT | 56×56 | 50×50 |
| Play | remaining transport width × 56 | × 50 |
| Face rail | full width × 56 | × 50 |

Measured non-compact frames (points):

| Device | Frame | `D` | Dial origin | Visual Metal circle (2×`VIEW_FILL`×`D`) |
|---|---|---|---|---|
| iPhone 14 | 390×844 | 369 | (10.5, 193) | 354.2 |
| iPhone 15 | 393×852 | 365 | (14, 205) | 350.4 |
| iPhone 16 Pro | 402×874 | 384 | (9, 208) | 368.6 |
| iPhone 15 Pro Max | 430×932 | 420 | (5, 217.5) | 403.2 |

Largest current dial square: **420 pt**. All circular masters are sized for that, then scale down.

### Native dial — q-space, origin center of `layout.dial`

Source: `modules/pockt-dial/ios/PocktDialShader.metal`.

```
p = (pixel − center) / D          # axis range ±0.5 on the square
housing radius VIEW_FILL = 0.48   # circle diameter = 0.96 D
bake object extent = ±1.08
circular-alpha punch already ships in e27eb11
```

The Metal view is still a square of size `D`. Only the circle of radius `0.48 D` is opaque. New well art must fill the area **outside** that circle.

Do not paint into `r < 0.48 D`. That disc is the live instrument.

### Production canvas

Do **not** author at the 512×1024 concept size.

| Canvas | Logical | @3x master |
|---|---|---|
| Chassis deck | 430×932 pt (15 Pro Max) | **1290×2796** |
| Well / dial stack | 1.28 × 420 pt = 537.6, snapped | **2048×2048** |
| Controls | largest current hit × 3 | see §5 |

sRGB, PNG-24, **straight** (non-premultiplied) alpha. Soft edges only. No JPEG.

---

## 2. Layer stack around the existing dial

Bottom → top. Z later, not now.

| Z | Layer | Who draws it | Interaction |
|---|---|---|---|
| 0 | `console_chassis_deck.png` | new PNG, full-bleed, `resizeMode: cover` | none |
| 1 | `console_well_annulus.png` | new PNG, centered on `layout.dial`, size `1.28 D` | none |
| 2 | `PocktDialView` | **existing native Metal** | rotary BPM + hub Play/Stop |
| 3 | Live text | RN: wordmark, tempo name, BPM, unit, captions | BPM opens keypad |
| 4 | Control housings | new PNGs in current hit rects | yes — see §5 |
| 5 | Live glyphs / values | RN text, Ionicons play triangle, `Pockt2Mark` | inherit parent hit |
| 6 | Face rail | existing `ClassicDialFaceRail` | face switch — **no new art** |

The native dial stays exactly where `layout.dial` places it. Artwork frames the hole. Artwork does not become the dial.

---

## 3. Reuse vs replace

### Reuse — dial and bezel (do not re-export)

| File | Size | Role |
|---|---|---|
| `modules/pockt-dial/ios/Resources/static_beauty.png` | 2048² | Static housing / bezel / plate beauty |
| `modules/pockt-dial/ios/Resources/static_normal.png` | 1024² | Tilt sparkle on knurl |
| `modules/pockt-dial/ios/Resources/knob_albedo.png` | 2048² | Rotating hub albedo |
| `modules/pockt-dial/ios/Resources/knob_normal.png` | 2048² | Hub object-space normal |
| `modules/pockt-dial/ios/Resources/knob_ao.png` | 2048² | Hub AO |
| `modules/pockt-dial/ios/Resources/knob_rough.png` | 2048² | Hub roughness |
| `modules/pockt-dial/ios/Resources/knob_aniso.png` | 1024² | Radial anisotropy |
| `modules/pockt-dial/ios/Resources/env_rgbm.png` | 256×128 | Studio IBL |
| `PocktDialFace.makeAtlas` | runtime 2048² | Scale ticks 20…400, 120 at 12 o’clock |

Reference stills only (not shipped, not Console chassis):

- `assets-src/pockt-dial-target/POCKT_CLASSIC_DIAL_TARGET.png` (1024²)
- `assets-src/pockt-dial-renders/round4/full_dial.png` (2048²)

### Reuse — POCKT mark

| File | Size | Role |
|---|---|---|
| `assets/branding/pockt-2-mark-approved.png` | 1024² | Live P on the POCKT button (`Pockt2Mark` at 36 pt) |

### Do not reuse as Console hardware

Current Sound / Tuner / TAP / Play / pills are `LinearGradient` + Ionicons in `ClassicDialHardware.tsx`. They are stand-ins. Titanium / Beatline / bar / studio plates are other products. Image A itself is not a sliceable atlas (labels are baked, several are misspelled, and the rail does not match the shipping faces).

---

## 4. What Image A still needs

Missing for a faithful Console **around** the live dial:

1. Full-face machined deck (warm black metal, studio key from above).
2. Recessed circular well that the native bezel sits in.
3. Matching Sound and Tuner knob housings (icons stay live).
4. TAP housing (Image A draws TAP as a caption; shipping TAP is a 56 pt round hit — skin the hit, do not delete it).
5. Play/Stop capsule housing (glyph stays live).
6. POCKT button housing (approved P raster stays live).
7. Meter and Subdivision capsule housings (values stay live).
8. Optional quiet track behind the live beat bubbles.

Image A extras that **do not fit the current layout** and must not be integrated until Gregg authorizes a layout pass:

- `+/−` steppers beside BPM
- Third equal “BEATS” pill (shipping BEATS is a live accent editor)
- CONSOLE / SETTINGS rail (shipping rail is DIAL…LED GEAR)
- Replacing the native hub / pointer / ticks with the concept still

Do not copy Image A string errors (`SOUNDWOOD`, `Wooden Blockex`, `TAPP`, `DIALIAL`, `POCKETTS`, `Moderatoato`).

---

## 5. Masters to produce

All files land in `assets-src/pockt-3-console/masters/`.  
Lighting: warm 12-o’clock key, bronze edge, black metal. Match Image A, not a generic chrome gradient.  
No wordmarks, no BPM, no tempo names, no face-rail icons, no ticks.

### Phase A — fits current rects (produce these)

#### `console_chassis_deck.png`

| | |
|---|---|
| Pixels | **1290×2796** |
| Alpha | Opaque. No hole. |
| Content | Full-phone machined deck only. Soft vignette allowed. |
| Must omit | Dial, well lip, knobs, pills, transport, rail, status bar, device bezel, any text |
| Use | Z0, `cover` on every phone. Centered. |

#### `console_well_annulus.png`

| | |
|---|---|
| Pixels | **2048×2048** |
| Alpha | Transparent outside the well and **inside the dial hole** |
| Hole | Circle, center (1024, 1024), radius **768 px**, 2 px AA |
| Why 768 | Asset represents `1.28 D`. Dial square maps to the centered 1600 px. `VIEW_FILL × 1600 = 768`. |
| Visible ring | Roughly 768 → 1020 px, then fade to 0 by the edge |
| Must omit | Bezel, ticks, hub, pointer, “POCKT” engraving |
| Use | Z1, width/height `1.28 D`, centered on `layout.dial` |

If the hole is smaller than 768, the well will cover the live bezel. If larger, a dark ring appears between well and Metal.

#### `console_knob_housing.png`

| | |
|---|---|
| Pixels | **256×256** |
| Alpha | Transparent outside the knob and its contact shadow |
| Knob body | Centered, diameter **200 px** (40 pt @3x plus rim/shadow) |
| States | One idle plate. Press is RN opacity, not a second file. |
| Must omit | Note icon, fork icon, SOUND / TUNER labels, captions |
| Use | Same PNG for Sound and Tuner, 40×40 pt body inside the 48×74 hit |

#### `console_tap_housing.png`

| | |
|---|---|
| Pixels | **256×256** |
| Alpha | Transparent outside the round housing |
| Body | Centered, diameter **216 px** (56 pt @3x = 168, plus rim/shadow) |
| Must omit | The letters TAP |
| Use | TAP hit 56×56. Live `TAP` text sits on top. |

#### `console_play_plate.png`

| | |
|---|---|
| Pixels | **1024×192** |
| Alpha | Transparent outside the capsule |
| 9-slice | Stretch **x 168…856** (56 pt caps @3x). Top/bottom do not slice. |
| Must omit | Play triangle, stop square, teal playing ring |
| Use | Play hit (width 203–258 × 56). Live play/stop glyph centered. |

#### `console_pockt_housing.png`

| | |
|---|---|
| Pixels | **256×256** |
| Alpha | Transparent outside the round housing |
| Body | Centered, diameter **216 px** |
| Center | Keep the inner ~108 px quiet — `Pockt2Mark` 36 pt draws there |
| Must omit | Any P, wordmark, or new logo |
| Use | POCKT hit 56×56 |

#### `console_pill_plate.png`

| | |
|---|---|
| Pixels | **768×192** |
| Alpha | Transparent outside the capsule |
| 9-slice | Stretch **x 144…624** (48 pt caps @3x) |
| Must omit | TIME SIGNATURE / SUBDIVISION / values / chevrons |
| Use | Shared by both pills (max 191×48). Live kicker + value + chevron on top. |

#### `console_beats_track.png`

| | |
|---|---|
| Pixels | **1176×162** (392×54 pt @3x — full iPhone 14 content width) |
| Alpha | Transparent outside a shallow recessed rail |
| Must omit | Dots, numbers, 5/4 peek, “BEATS” |
| Use | Behind `ClassicDialBeats`. Live bubbles (8–21 pt) stay RN. Scale width to `layout.beats`. |

### Phase B — Image A only, layout-gated (produce later, do not integrate)

| Filename | Pixels | Notes |
|---|---|---|
| `console_stepper_minus.png` | 128×128 | Requires new BPM `+/−` hits |
| `console_stepper_plus.png` | 128×128 | Same |
| `console_pill_beats.png` | 768×192 | Only if BEATS becomes a third pill and the editor moves |

Do not produce a baked face rail. Do not produce a still of the concept dial.

---

## 6. Interaction map (what must stay separate)

| Control | Current hit | Housing file | Live child | Must remain tappable |
|---|---|---|---|---|
| Native dial | `layout.dial` D×D | none | Metal | Rotary + hub tap |
| BPM | `layout.readout` | none | RN digits | Opens keypad |
| Sound | `layout.sound` | `console_knob_housing.png` | note icon + caption | Sound sheet |
| Tuner | `layout.tuner` | `console_knob_housing.png` | fork + TUNER | Tuner |
| Each beat | bubble 8–21 pt | `console_beats_track.png` (non-hit) | bubble + index | Accent editor |
| Meter | `layout.meter` | `console_pill_plate.png` | kicker + value | Meter sheet |
| Subdivision | `layout.division` | `console_pill_plate.png` | kicker + value | Division sheet |
| TAP | `layout.tap` | `console_tap_housing.png` | TAP | Tap tempo |
| Play/Stop | `layout.play` | `console_play_plate.png` | triangle / stop | `toggle()` |
| POCKT | `layout.pockt` | `console_pockt_housing.png` | `pockt-2-mark-approved.png` | Settings |
| Face rail | `layout.faceRail` | none | existing icons/labels | Face switch |

Chassis and well are not hit targets. They must not steal touches from the dial or controls (`pointerEvents: 'none'` at integration time).

---

## 7. Constraints

- Native dial lighting is already baked (`STUDIO_KEY`). New chassis should match Image A; a small mismatch at the bezel/well joint is expected until a later dial bake, which this pass must not start.
- `D` changes by phone. Circular assets scale uniformly. Capsules 9-slice horizontally only.
- Windows cannot render Metal or capture a real iOS screenshot. Acceptance is a device photo over the live `PocktDialView`, not a composite of Image A.
- First-launch defaults stay 120 BPM / 4/4. Do not bake 120 or 4/4 into plates.
- Navigation stays the seven shipping faces. Image A’s CONSOLE/SETTINGS rail is not in this manifest.

---

## 8. Delivery checklist

Place only these Phase A files in `masters/`:

```
console_chassis_deck.png      1290×2796
console_well_annulus.png      2048×2048   hole r=768
console_knob_housing.png      256×256
console_tap_housing.png       256×256
console_play_plate.png        1024×192    9-slice x 168…856
console_pockt_housing.png     256×256
console_pill_plate.png        768×192     9-slice x 144…624
console_beats_track.png       1176×162
```

Stop. Integration is a separate authorization after these files exist and have been inspected.
