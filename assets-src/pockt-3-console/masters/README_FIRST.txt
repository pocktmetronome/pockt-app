POCKT CONSOLE — ARTWORK CANDIDATES (NOT PRODUCTION READY)

These are individually generated image files, renamed to the intended manifest filenames. No storyboard crops. They have NOT been fitted to the app, compiled, or verified on an iPhone.

IMPORTANT: Do not blindly import these into the app. Compare to approved Console master and inspect overlap with existing native dial. Several images have different dimensions than manifest; no upscaling or destructive cropping has been applied.

Candidate files:
- console_chassis_deck.png: 759 x 2072, RGBA; original: a_close_up_vertical_product_style_render_of_a_lu.png
- console_well_annulus.png: 1230 x 1278, RGBA; original: a_high_resolution_photorealistic_metallic_ui_grap.png
- console_knob_housing.png: 1299 x 1211, RGBA; original: a_clean_product_style_close_up_render_on_a_transpa.png
- console_tap_housing.png: 1299 x 1211, RGBA; original: a_clean_product_style_close_up_render_on_a_transpa.png
- console_play_plate.png: 2185 x 720, RGBA; original: a_clean_graphic_design_render_on_a_transparent_bac.png
- console_pockt_housing.png: 1299 x 1211, RGBA; original: a_clean_product_style_close_up_render_on_a_transpa.png
- console_pill_plate.png: 1774 x 887, RGBA; original: a_clean_high_resolution_isolated_ui_component_on.png

Known blockers:
- console_beats_track.png is MISSING: generated control panels were not the specified recessed beats track.
- console_chassis_deck.png includes baked control shapes and a large transparent hole; requires layout alignment and may duplicate live controls.
- console_well_annulus.png includes a pointer and tick marks; these may duplicate the native dial and must be checked.
- console_play_plate.png contains a baked play triangle; must be removed or made state-specific before functional Play/Stop integration.
- Three housing filenames currently contain identical blank housing artwork by design; reuse is intentional, not three unique renders.
- Pill plate is not yet a validated nine-slice asset.
- These are source candidate resolutions, NOT the manifest target dimensions. Do not treat as final production assets.

Original approved master reference is supplied separately in the conversation.
NEW: console_beats_track.png is a visual candidate only: it contains baked illuminated beat markers and may conflict with the live beat bubbles. Verify/correct before integration.
