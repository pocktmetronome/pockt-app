# Classic Dial — Blender stills (Phase 1)

Path-traced stills judged against `assets-src/pockt-dial-target/POCKT_CLASSIC_DIAL_TARGET.png`.
Phase 2 bake maps are ortho emit-renders (not selected-to-active); objects stay named `DIAL_*`.

## Blender

No system Blender install was present. The pipeline uses a portable **Blender 4.5.3 LTS** tree (not committed; `.tmp-blender/` is gitignored):

`C:\Apps\POCKT\.tmp-blender\extract\blender-4.5.3-windows-x64\blender.exe`

Cycles ran on **CPU** (i7-13700H). OPTIX/CUDA/HIP/ONEAPI reported no GPU devices.

A system install works the same. All work is headless:

```
blender.exe --background --python <script> -- <args>
```

## Scripts

| File | Role |
|---|---|
| `params.py` | Single PARAMS block — radii, knurl, heights, camera, lights, samples |
| `build_dial.py` | Parametric solids (real isometric diamond knurl, turned bezel lip) |
| `materials.py` | Principled BSDF + spun-gunmetal hub grain + plate AO |
| `scene.py` | Camera + dark studio area lights + plate light-linking |
| `render_stills.py` | Builds everything and writes the five stills |

## Commands

```
set BLENDER=C:\Apps\POCKT\.tmp-blender\extract\blender-4.5.3-windows-x64\blender.exe

# Round 4 judgment set
%BLENDER% --background --python assets-src/pockt-dial-blender/render_stills.py -- --out assets-src/pockt-dial-renders/round4 --samples 256

# Subset / preview
%BLENDER% --background --python assets-src/pockt-dial-blender/render_stills.py -- --only full_dial --res 1024 --samples 48
```

Default `--out` is `assets-src/pockt-dial-renders/round4`.

## Judgment stills

`assets-src/pockt-dial-renders/round1/` — first pass (coarse knurl, gray plate).

`assets-src/pockt-dial-renders/round2/` — 2048², 256 samples, OpenImageDenoise:

| File | Seconds (CPU) |
|---|---|
| `full_dial.png` | 149 |
| `detail_knurl.png` | 133 |
| `detail_chamfer_hub.png` | 211 |
| `detail_plate_gap.png` | 177 |
| `light_tilt.png` | 146 |

`assets-src/pockt-dial-renders/round3/` — spun hub, 12 o'clock key, muted knurl:

| File | Seconds (CPU) |
|---|---|
| `full_dial.png` | 138 |
| `detail_knurl.png` | 133 |
| `detail_chamfer_hub.png` | 239 |
| `detail_plate_gap.png` | 189 |
| `light_tilt.png` | 122 |

`assets-src/pockt-dial-renders/round4/` — cool titanium hub, muted bronze ring:

| File | Seconds (CPU) |
|---|---|
| `full_dial.png` | 132 |
| `detail_knurl.png` | 127 |
| `detail_chamfer_hub.png` | 225 |
| `detail_plate_gap.png` | 188 |
| `light_tilt.png` | 123 |

## Iteration

Edit numbers in `params.py` and re-run `render_stills.py`. Do not remodel by hand.

## Phase 2 — bake + IBL maps

Round 4 (`6254e7d`) is the visual master. `bake_maps.py` rebuilds that scene and writes top-down orthographic maps.

```
set BLENDER=C:\Apps\POCKT\.tmp-blender\extract\blender-4.5.3-windows-x64\blender.exe

%BLENDER% --background --python assets-src/pockt-dial-blender/bake_maps.py -- --out assets-src/pockt-dial-baked --samples 48 --beauty-samples 128

%BLENDER% --background --python assets-src/pockt-dial-blender/parity_check.py -- --baked assets-src/pockt-dial-baked --ref assets-src/pockt-dial-renders/round4
```

Outputs land in `assets-src/pockt-dial-baked/` and ship copies go to `modules/pockt-dial/ios/Resources/` for `PocktDial.bundle` (`resource_bundles` globs `**/*.metal` and `**/*.png`).

| Map | Res | Space |
|---|---|---|
| `knob_albedo.png` | 2048 | sRGB |
| `knob_normal.png` | 2048 | object-space, RGB = n*0.5+0.5 |
| `knob_ao.png` | 2048 | linear AO |
| `knob_rough.png` | 2048 | linear roughness (spun grain) |
| `knob_aniso.png` | 1024 | RG=radial tangent B=strength |
| `static_beauty.png` | 2048 | AgX ortho, knob camera-hidden |
| `static_normal.png` | 1024 | housing+bezel object-space |
| `env_rgbm.png` | 256×128 | RGBM, max 16 |

UV: object XY in [−1.08, 1.08] → [0, 1], +Y = 12 o'clock. Shader `VIEW_FILL = 0.48` (housing r=1.0). The mesh `UVMap` is still radial and unused by this bake.
