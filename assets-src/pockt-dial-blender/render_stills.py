"""Render the Phase 1 judgment set to assets-src/pockt-dial-renders/round4/."""

from __future__ import annotations

import json
import os
import sys
import time

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import bpy
from mathutils import Vector

from build_dial import build
from materials import assign_all
from params import PARAMS
from scene import set_key_azimuth, setup_scene


def _argv():
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return sys.argv[1:]


def _arg(argv, flag, default=None):
    if flag in argv:
        i = argv.index(flag)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def enable_cycles_device():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    addon = bpy.context.preferences.addons.get("cycles")
    if addon is None:
        scene.cycles.device = "CPU"
        return "CPU"
    prefs = addon.preferences
    for dtype in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = dtype
            prefs.get_devices()
            print("[pockt-dial] devices", dtype, [(d.name, d.type, bool(d.use)) for d in prefs.devices])
            used = False
            for device in prefs.devices:
                is_cpu = device.type == "CPU"
                device.use = not is_cpu
                used = used or (not is_cpu and device.use)
            if used:
                scene.cycles.device = "GPU"
                return dtype
        except Exception as exc:
            print("[pockt-dial] GPU", dtype, "unavailable:", exc)
    scene.cycles.device = "CPU"
    return "CPU"


def configure_render(p, samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.resolution_x = int(p["resolution"])
    scene.render.resolution_y = int(p["resolution"])
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.cycles.samples = int(samples)
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.01
    scene.cycles.adaptive_min_samples = min(64, max(16, int(samples) // 4))
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 2
    scene.cycles.transparent_max_bounces = 4
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = -0.28
    scene.view_settings.gamma = 1.0


def _place_camera(location, target, lens=None):
    cam = bpy.data.objects.get("DIAL_CAMERA")
    if cam is None:
        raise RuntimeError("DIAL_CAMERA missing")
    cam.location = Vector(location)
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    if lens is not None:
        cam.data.lens = lens


def render_one(path, samples, p):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = path
    configure_render(p, samples)
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    elapsed = time.perf_counter() - t0
    print(f"[pockt-dial] wrote {path} in {elapsed:.1f}s")
    return elapsed


def _shot_cameras():
    cam = bpy.data.objects.get("DIAL_CAMERA")
    loc = tuple(cam.location) if cam else PARAMS.get("cam_location", (0.0, -0.52, 6.0))
    target = PARAMS.get("cam_target", (0.0, 0.02, 0.075))
    return {
        "full_dial.png": (loc, target, PARAMS["cam_lens_mm"], 0.0),
        "detail_knurl.png": ((1.05, -0.48, 0.62), (0.96, 0.02, 0.038), 78.0, 0.0),
        "detail_chamfer_hub.png": ((0.74, -0.40, 0.52), (0.56, 0.02, 0.148), 68.0, 0.0),
        "detail_plate_gap.png": ((0.86, -0.58, 0.50), (0.74, 0.0, 0.04), 64.0, 0.0),
        "light_tilt.png": (loc, target, PARAMS["cam_lens_mm"], PARAMS["key_tilt_deg"]),
    }


def render_set(out_dir, samples, only=None):
    p = dict(PARAMS)
    times = {}
    existing = {}
    meta_path = os.path.join(out_dir, "render_times.json")
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as fh:
            existing = json.load(fh).get("seconds", {})
    shots = _shot_cameras()
    names = list(shots)
    if only:
        names = []
        for part in only.split(","):
            part = part.strip()
            if not part.endswith(".png"):
                part += ".png"
            names.append(part)
    last_az = 0.0
    for name in names:
        loc, target, lens, az = shots[name]
        if abs(az - last_az) > 0.01:
            set_key_azimuth(az)
            last_az = az
        _place_camera(loc, target, lens)
        times[name] = render_one(os.path.join(out_dir, name), samples, p)
    existing.update(times)
    with open(meta_path, "w", encoding="utf-8") as fh:
        json.dump({"samples": samples, "seconds": existing}, fh, indent=2)
    print("[pockt-dial] times", json.dumps(times, indent=2))
    return times


def main(argv=None):
    argv = list(argv or _argv())
    default_out = os.path.normpath(
        os.path.join(_HERE, "..", "pockt-dial-renders", "round4")
    )
    out_dir = _arg(argv, "--out", default_out)
    samples = int(_arg(argv, "--samples", PARAMS["samples"]))
    res = _arg(argv, "--res", None)
    only = _arg(argv, "--only", None)
    device = enable_cycles_device()
    print("[pockt-dial] Cycles device:", device)
    build()
    assign_all()
    setup_scene()
    p = dict(PARAMS)
    if res:
        p["resolution"] = int(res)
    PARAMS.update(p)
    render_set(out_dir, samples, only=only)


if __name__ == "__main__":
    main()
