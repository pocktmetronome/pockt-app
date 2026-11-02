"""Camera, studio lighting, world. Contact shadows come from Cycles, not comps."""

from __future__ import annotations

import math
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import bpy
from mathutils import Euler, Vector

from params import PARAMS

WARM = (1.0, 0.72, 0.45)
WARM_SOFT = (1.0, 0.80, 0.58)


def _look_at(obj, target, up=(0.0, 0.0, 1.0)):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _area(name, location, energy, size, rot_euler, shape="RECTANGLE", spread_deg=150.0, color=(1.0, 1.0, 1.0)):
    light = bpy.data.lights.new(name, type="AREA")
    light.energy = energy
    light.color = color
    light.shape = shape
    light.size = size[0]
    if shape == "RECTANGLE":
        light.size_y = size[1]
    light.spread = math.radians(spread_deg)
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = Euler(rot_euler, "XYZ")
    obj.visible_camera = False
    return obj


def _ll_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
    for obj in list(col.objects):
        col.objects.unlink(obj)
    return col


def apply_light_linking():
    """Light linking is set on the *lights* (receiver = meshes they illuminate).

    Plate is excluded from the key so it stays void-black. Well + ground still
    receive the key for contact shadows in the gap.
    """
    metals = (
        "DIAL_HOUSING",
        "DIAL_BEZEL",
        "DIAL_ROTATOR_KNURL",
        "DIAL_CHAMFER",
        "DIAL_HUB",
    )
    well = ("DIAL_WELL_FLOOR", "DIAL_WELL_WALL", "DIAL_WELL_INNER")
    ground = ("DIAL_GROUND",)
    plate = ("DIAL_PLATE",)

    def meshes(*groups):
        names = []
        for g in groups:
            names.extend(g)
        out = []
        for n in names:
            obj = bpy.data.objects.get(n)
            if obj is not None:
                out.append(obj)
        return out

    def set_light(light_name, objects):
        lamp = bpy.data.objects.get(light_name)
        if lamp is None or not objects:
            return
        linking = getattr(lamp, "light_linking", None)
        if linking is None:
            print("[pockt-dial] light linking unavailable on", light_name)
            return
        rec = _ll_collection(f"LL_{light_name}_RECV")
        for obj in objects:
            try:
                rec.objects.link(obj)
            except RuntimeError:
                pass
        try:
            linking.receiver_collection = rec
            print("[pockt-dial] light-link", light_name, "->", [o.name for o in objects])
        except Exception as exc:
            print("[pockt-dial] light-link failed", light_name, exc)

    set_light("LIGHT_KEY", meshes(metals, well, ground))
    set_light("LIGHT_HUB_SWEEP", meshes(metals))
    set_light("LIGHT_BEZEL", meshes(metals))
    set_light("LIGHT_RIM", meshes(metals, well))
    set_light("LIGHT_SILHOUETTE", meshes(metals, ground))
    set_light("LIGHT_FILL", meshes(plate, well, ground))
    set_light("LIGHT_PLATE_SHEEN", meshes(plate, well))


def setup_scene(p=None, key_azimuth_offset=0.0):
    p = dict(PARAMS if p is None else p)
    scene = bpy.context.scene

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    wn = world.node_tree
    wn.nodes.clear()
    bg = wn.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.0008, 0.0007, 0.0006, 1.0)
    bg.inputs["Strength"].default_value = p["world_strength"]
    out = wn.nodes.new("ShaderNodeOutputWorld")
    wn.links.new(bg.outputs["Background"], out.inputs["Surface"])

    cam_data = bpy.data.cameras.new("DIAL_CAMERA")
    cam_data.lens = p["cam_lens_mm"]
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.05
    cam_data.clip_end = 40.0
    cam = bpy.data.objects.new("DIAL_CAMERA", cam_data)
    bpy.context.collection.objects.link(cam)
    lens = float(p["cam_lens_mm"])
    half = float(p["housing_outer"]) * float(p["cam_margin"])
    dist = half * lens / (cam_data.sensor_width * 0.5)
    cam.location = Vector(
        (
            float(p.get("cam_shift_x", 0.0)),
            float(p.get("cam_shift_y", -0.22)),
            dist,
        )
    )
    target = p.get("cam_target", (0.0, 0.0, 0.09))
    _look_at(cam, target)
    scene.camera = cam
    p["cam_location"] = tuple(cam.location)

    az = math.radians(key_azimuth_offset)

    def rot_xy(loc):
        v = Vector(loc)
        return Vector(
            (
                v.x * math.cos(az) - v.y * math.sin(az),
                v.x * math.sin(az) + v.y * math.cos(az),
                v.z,
            )
        )

    key_look = p.get("key_look_at", (0.0, 0.90, 0.045))
    key = _area(
        "LIGHT_KEY",
        rot_xy(p["key_location"]),
        p["key_energy"],
        p["key_size"],
        (math.radians(-58.0), 0.0, 0.0),
        spread_deg=48.0,
        color=WARM,
    )
    _look_at(key, rot_xy(key_look))

    hub_sweep = _area(
        "LIGHT_HUB_SWEEP",
        rot_xy((0.85, 1.55, 1.85)),
        p.get("hub_sweep_energy", 70.0),
        (0.70, 0.22),
        (math.radians(-50.0), math.radians(12.0), 0.0),
        spread_deg=55.0,
        color=(1.0, 0.86, 0.74),
    )
    _look_at(hub_sweep, (0.04, 0.10, p.get("hub_z", 0.15)))

    fill = _area(
        "LIGHT_FILL",
        (-1.6, 1.1, 1.8),
        p["fill_energy"],
        (1.8, 1.4),
        (math.radians(-40.0), math.radians(-25.0), 0.0),
        spread_deg=170.0,
        color=(0.85, 0.88, 1.0),
    )
    _look_at(fill, (0.0, 0.0, 0.08))

    rim = _area(
        "LIGHT_RIM",
        rot_xy((-0.4, 1.6, 1.4)),
        p["rim_energy"],
        (0.45, 0.14),
        (math.radians(-65.0), 0.0, 0.0),
        spread_deg=70.0,
        color=WARM_SOFT,
    )
    _look_at(rim, (0.0, 0.55, 0.05))

    bezel_kick = _area(
        "LIGHT_BEZEL",
        rot_xy((0.08, 1.35, 1.05)),
        p.get("bezel_kick_energy", 55.0),
        (0.35, 0.12),
        (math.radians(-70.0), 0.0, 0.0),
        spread_deg=40.0,
        color=WARM,
    )
    _look_at(bezel_kick, rot_xy((0.0, 0.90, 0.040)))

    silhouette = _area(
        "LIGHT_SILHOUETTE",
        (-2.25, 0.35, 0.28),
        p.get("silhouette_energy", 16.0),
        (0.80, 0.16),
        (math.radians(-8.0), math.radians(80.0), 0.0),
        spread_deg=42.0,
        color=WARM_SOFT,
    )
    _look_at(silhouette, (-0.96, 0.05, 0.03))

    plate_sheen = _area(
        "LIGHT_PLATE_SHEEN",
        (-1.5, -0.4, 0.18),
        p.get("plate_sheen_energy", 0.8),
        (1.0, 0.08),
        (math.radians(-8.0), math.radians(12.0), 0.0),
        spread_deg=35.0,
        color=(0.7, 0.72, 0.75),
    )
    _look_at(plate_sheen, (0.0, 0.0, 0.016))

    apply_light_linking()

    scene.eevee.use_gtao = True
    return cam


def set_key_azimuth(degrees):
    """Rebuild lights only, keep camera and geometry."""
    for name in (
        "LIGHT_KEY",
        "LIGHT_HUB_SWEEP",
        "LIGHT_FILL",
        "LIGHT_RIM",
        "LIGHT_BEZEL",
        "LIGHT_SILHOUETTE",
        "LIGHT_PLATE_SHEEN",
        "LIGHT_SPEC",
        "DIAL_CAMERA",
    ):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    for name in (
        "LIGHT_KEY",
        "LIGHT_HUB_SWEEP",
        "LIGHT_FILL",
        "LIGHT_RIM",
        "LIGHT_BEZEL",
        "LIGHT_SILHOUETTE",
        "LIGHT_PLATE_SHEEN",
        "LIGHT_SPEC",
    ):
        lamp = bpy.data.lights.get(name)
        if lamp:
            bpy.data.lights.remove(lamp)
    setup_scene(key_azimuth_offset=degrees)


if __name__ == "__main__":
    setup_scene()
    print("[pockt-dial] scene ready")
