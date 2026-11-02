# POCKT North Star Production Asset Kit

This pack is the production visual kit for the locked POCKT Dial/Home North Star.

## Locked references
- `references/POCKT_NORTH_STAR_DIAL.png` — primary visual contract.
- `references/POCKT_APPROVED_P_LOGO.png` — approved P logo.
- `references/POCKT_LOOP_BUTTON_REFERENCE.png` — loop-symbol reference.
- `dial/dial-base-blank-approved-v3.png` — approved production photographic Dial base.

## Static raster masters
Use the `raster/` files as the physical hardware skins. Do not redraw these in Skia or crop the North Star screenshot at runtime.

### Header
- `header_round_shell_rest.png`
- `header_round_shell_pressed.png`

Overlay `icons/tuner_fork.svg` or `icons/speaker.svg` at runtime.

### Tempo controls
- `tempo_knob_shell_rest.png`
- `tempo_knob_shell_pressed.png`
- `bpm_display_blank.png`

Overlay +, −, BPM value and BPM label at runtime.

### Beat strip
- `beat_visibility_on.png`
- `beat_visibility_off.png`
- `beat_off.png`
- `beat_soft.png`
- `beat_normal.png`
- `beat_strong.png`
- `loop_button_rest.png`
- `loop_button_pressed.png`
- `beat_cover_plate.png`

Beat numbers and current-beat transient illumination are runtime state.

### Transport
- `transport_key_secondary_rest.png`
- `transport_key_secondary_pressed.png`
- `transport_key_primary_rest.png`
- `transport_key_primary_pressed.png`
- `meter_key_shell_rest.png`
- `meter_key_shell_pressed.png`
- `pockt_p_logo_8x.png` — approved P icon with external white background removed.

TAP, play/stop, meter value/subdivision, and P logo are composited at runtime.

### Panels / material
- `panel_top.png`
- `panel_beat_strip.png`
- `panel_transport.png`
- `panel_nav.png`
- `chassis_blackened_metal_tile.png`
- `press_lighting_overlay.png`

## Vector runtime icons
The `icons/` folder contains the canonical tuner, speaker, plus, minus, play, stop, note, loop and six bottom-nav icons. They are currentColor SVGs so state color can be applied without redrawing assets.

## Critical rules
1. Do not use the full North Star PNG as a runtime screen.
2. Do not recrop the North Star screenshot into controls.
3. Do not modify the approved Dial V3 photographic hardware.
4. Dynamic state remains runtime: BPM, tick emphasis, beat progression, meter, selected nav, press state, current beat, etc.
5. The exact P logo remains the supplied approved artwork.
6. The loop access symbol follows the supplied reference and is labeled LOOP, never PHRASE.
