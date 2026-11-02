"""Shared PARAMS for the Classic Dial Blender pipeline.

Radii are fractions of housing_outer = 1.0, derived from a radial luminance
scan of assets-src/pockt-dial-target/POCKT_CLASSIC_DIAL_TARGET.png (1024²).

The object fills ~0.968 of the image half-width (padding around the dial).
Transitions after dividing by that fill:

  0.00–0.62  hub / rotator (stable mid-grey ~0.21, then chamfer/knurl)
  ~0.625     first hard drop — hub/knurl lip into the scale-plate well
  0.63–0.81  recessed plate (ticks pollute the average; plate itself is darker)
  ~0.816     plate outer / bezel inner
  0.82–1.00  bright bezel + diamond-knurl housing, then falloff to studio black

Round 4: cool titanium hub, finer uncountable grain, muted bronze knurl/bezel.
Geometry, lighting rig, and knurl mesh locked from Round 3.
"""

from __future__ import annotations

PARAMS = {
    # --- overall ---
    "unit": 1.0,
    "housing_outer": 1.0,
    "mesh_circle_segments": 384,
    # Target object fill in the 1024 frame (measured).
    "target_object_fill": 0.968,
    # --- housing knurl ring (fine isometric diamonds on wall + top) ---
    "housing_knurl_inner": 0.918,
    "housing_knurl_teeth": 520,
    "housing_knurl_rows": 0,  # 0 = isometric from tooth pitch
    "housing_knurl_depth": 0.0038,
    "housing_knurl_fillet": 0.30,
    "housing_knurl_subdiv": 3,
    "housing_z0": 0.0,
    "housing_z1": 0.036,
    # --- bezel (bright turned-metal torus lip) ---
    "bezel_center": 0.898,
    "bezel_minor": 0.0105,
    "bezel_z_scale": 0.38,
    "bezel_z": 0.040,
    "bezel_profile_segs": 28,
    # --- recessed scale plate ---
    "plate_outer": 0.876,
    "plate_inner": 0.648,
    "plate_z": 0.014,
    "plate_height": 0.005,
    # --- gap / well ---
    "gap_inner": 0.632,
    "well_floor_z": 0.001,
    "well_floor_outer": 0.876,
    "well_wall_inner": 0.892,
    # --- rotating knurl sidewall ---
    "rot_knurl_outer": 0.628,
    "rot_knurl_inner": 0.590,
    "rot_knurl_teeth": 380,
    "rot_knurl_rows": 0,
    "rot_knurl_depth": 0.0036,
    "rot_knurl_fillet": 0.30,
    "rot_knurl_subdiv": 3,
    "rot_z0": 0.018,
    "rot_z1": 0.132,
    # --- chamfer / inner turned lip: sidewall → hub face ---
    "chamfer_center": 0.572,
    "chamfer_minor": 0.0090,
    "chamfer_z_scale": 0.48,
    "chamfer_z": 0.146,
    "chamfer_profile_segs": 24,
    # --- raised hub (spun gunmetal; no concentric CNC) ---
    "hub_radius": 0.556,
    "hub_z": 0.154,
    "hub_dome": 0.002,
    "hub_rings": 96,
    "hub_radial_hair_n": 160,  # Nyquist-safe on 384 segs; shader carries the fine fan
    "hub_radial_hair_amp": 0.000028,
    "hub_shader_radial_n": 560.0,
    # --- camera (near-orthogonal, slight tactile perspective) ---
    "cam_lens_mm": 85.0,
    "cam_margin": 1.14,
    "cam_shift_x": 0.04,
    "cam_shift_y": -0.82,
    "cam_target": (0.0, 0.03, 0.09),
    # --- lighting (12 o'clock key, warm, real falloff) ---
    "world_strength": 0.00012,
    "key_energy": 240.0,
    "key_size": (0.42, 0.18),
    "key_location": (0.18, 2.35, 1.55),
    "key_look_at": (0.0, 0.90, 0.045),
    "key_tilt_deg": 20.0,
    "fill_energy": 0.7,
    "rim_energy": 22.0,
    "bezel_kick_energy": 55.0,
    "hub_sweep_energy": 52.0,
    "silhouette_energy": 14.0,
    "plate_sheen_energy": 0.8,
    # --- render ---
    "resolution": 2048,
    "samples": 256,
    "preview_samples": 48,
}
