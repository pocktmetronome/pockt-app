"""POCKT signature instrument. One camera, one light rig, the purchased Knob_6 mesh."""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OBJ_DIR = os.path.join(ROOT, "THIRD_PARTY_UI", "Audio Knobs & Switches", "Audio knobs 3D models", "Obj")
OUT = os.path.join(ROOT, "artifacts", "signature-instrument", "blender")
MANIFEST = os.path.join(ROOT, "artifacts", "signature-instrument", "layout-manifest.json")
os.makedirs(OUT, exist_ok=True)

BODY = None
STEP = None
DIAL_METAL = None
CHAMPAGNE = None
WELL = None
CAP = None
CAP_FACE = None
GLASS = None


def argv_after():
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def set_input(node, name, value):
    sock = node.inputs.get(name)
    if sock is not None:
        sock.default_value = value


def metal(name, color, rough, metallic, bump=0.012):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", rough)
    set_input(bsdf, "Anisotropic", 0.35)
    set_input(bsdf, "Specular IOR Level", 0.42)
    noise = mat.node_tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 90.0
    noise.inputs["Detail"].default_value = 4.0
    bump_node = mat.node_tree.nodes.new("ShaderNodeBump")
    bump_node.inputs["Strength"].default_value = bump
    bump_node.inputs["Distance"].default_value = 0.015
    mat.node_tree.links.new(noise.outputs["Fac"], bump_node.inputs["Height"])
    mat.node_tree.links.new(bump_node.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def ensure_materials():
    global BODY, DIAL_METAL, CHAMPAGNE, WELL, CAP, CAP_FACE, GLASS
    BODY = metal("POCKT_Body", (0.58, 0.54, 0.49), 0.34, 0.82, 0.012)
    DIAL_METAL = metal("POCKT_Dial", (0.40, 0.37, 0.34), 0.28, 0.88, 0.008)
    CHAMPAGNE = metal("POCKT_Champagne", (0.62, 0.48, 0.32), 0.28, 0.92, 0.002)
    WELL = metal("POCKT_Well", (0.24, 0.22, 0.20), 0.48, 0.55, 0.006)
    CAP = metal("POCKT_Cap", (0.07, 0.065, 0.06), 0.22, 0.62, 0.01)
    CAP_FACE = metal("POCKT_CapFace", (0.24, 0.22, 0.19), 0.2, 0.58, 0.004)
    GLASS = metal("POCKT_Glass", (0.035, 0.032, 0.028), 0.16, 0.04, 0.0)
    global STEP
    STEP = metal("POCKT_Step", (0.16, 0.145, 0.13), 0.5, 0.42, 0.006)


def configure(scene, w, h, samples=48, transparent=False):
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    scene.render.image_settings.compression = 12
    eevee = scene.eevee
    eevee.taa_render_samples = samples
    if hasattr(eevee, "use_raytracing"):
        eevee.use_raytracing = True
    if hasattr(eevee, "use_shadows"):
        eevee.use_shadows = True
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    scene.view_settings.exposure = 0.18
    try:
        scene.view_settings.look = "AgX - Base Contrast"
    except TypeError:
        pass


def studio(scene, width, height):
    world = bpy.data.worlds.new("POCKT_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.22, 0.20, 0.18, 1)
    bg.inputs[1].default_value = 0.85

    def area(name, energy, size, loc, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "RECTANGLE"
        data.size = size
        data.size_y = size * 0.72
        data.color = color
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = Vector(loc)
        direction = Vector((width * 0.5, height * 0.5, 0)) - obj.location
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return obj

    sun = bpy.data.lights.new("KeySun", "SUN")
    sun.energy = 1.7
    sun.angle = math.radians(18)
    sun.color = (1.0, 0.96, 0.88)
    sun_obj = bpy.data.objects.new("KeySun", sun)
    scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(52), math.radians(6), math.radians(-36))
    area("Fill", 36000, width * 1.8, (width * 0.72, height * 0.28, 760), (0.86, 0.9, 0.98))
    area("Over", 18000, width * 2.2, (width * 0.4, height * 0.7, 900), (1.0, 0.97, 0.92))


def camera_top(scene, width, height):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = height
    cam_data.sensor_fit = "VERTICAL"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (width / 2, height / 2, 900)
    cam.rotation_euler = (0, 0, 0)
    scene.camera = cam
    return cam


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def shade(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError:
        pass
    obj.select_set(False)


def bevel(obj, width, segments=3):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(40)


def box(name, w, h, d, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, h, d)
    bpy.ops.object.transform_apply(scale=True)
    assign(obj, mat)
    shade(obj)
    return obj


def cylinder(name, radius, depth, loc, mat, verts=72):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    assign(obj, mat)
    shade(obj)
    return obj


def screen_to_world(rect, height):
    return rect["x"] + rect["w"] / 2, height - (rect["y"] + rect["h"] / 2)


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def hide_all():
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.hide_render = True


def show_lights():
    for obj in bpy.data.objects:
        if obj.type in {"LIGHT", "CAMERA"}:
            obj.hide_render = False


def import_obj(path):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path)
    created = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if not created:
        raise RuntimeError(f"no mesh in {path}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in created:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = created[0]
    if len(created) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def spans(obj):
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


def stand_up(obj):
    """Put the short axis on Z so a top-down camera sees the grip."""
    sx, sy, sz = spans(obj)
    short = [sx, sy, sz].index(min(sx, sy, sz))
    if short == 0:
        obj.rotation_euler = (0, math.radians(90), 0)
    elif short == 1:
        obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True)


def fit_diameter(obj, diameter, z_scale=0.78):
    sx, sy, sz = spans(obj)
    factor = diameter / max(sx, sy, 1e-6)
    obj.scale = (factor, factor, factor * z_scale)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True)


def trim_flange(obj, keep=0.56):
    """Keep the fluted hub. The outer disc is a flange, not the grip."""
    sx, sy, sz = spans(obj)
    radius = max(sx, sy) * 0.5 * keep
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=radius, depth=max(sx, sy, sz) * 6, location=(0, 0, 0))
    cutter = bpy.context.active_object
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new("TrimFlange", "BOOLEAN")
    mod.operation = "INTERSECT"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def cut_center(obj, radius):
    before = obj.data.vertices
    source_count = len(before)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=radius * 12, location=(0, 0, 0))
    cutter = bpy.context.active_object
    cutter.name = "KnobHoleCutter"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new("CenterOpening", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return source_count, len(obj.data.vertices)


def prepare_knob(diameter, record=False):
    source = import_obj(os.path.join(OBJ_DIR, "Knob_6.obj"))
    source.name = "Knob6Purchased"
    stand_up(source)
    fit_diameter(source, diameter, 1.0)
    raw = source.copy()
    raw.data = source.data.copy()
    raw.name = "Knob6Uncut"
    bpy.context.scene.collection.objects.link(raw)
    # 0.70 keeps the gear teeth (they sit near 0.55–0.66 of the full radius) and drops the smooth flange.
    trim_flange(source, 0.70)
    fit_diameter(source, diameter, 0.42)
    hole = diameter * 0.36
    before, after = cut_center(source, hole)
    assign(source, DIAL_METAL)
    source.name = "Knob6Encoder"
    note = {
        "file": "Knob_6.obj",
        "object": "007.001_Gear.003",
        "verts_before_boolean": before,
        "verts_after_boolean": after,
        "diameter": diameter,
        "hole_radius": hole,
    }
    if record:
        with open(os.path.join(OUT, "mesh-proof.json"), "w", encoding="utf-8") as handle:
            json.dump(note, handle, indent=2)
    return source, raw, hole


def key_cap(name, w, h, depth=8.5):
    body = box(name, w * 0.86, h * 0.78, depth, (0, 0, depth / 2), CAP)
    bevel(body, min(w, h) * 0.12, 4)
    face = box(name + "Face", w * 0.74, h * 0.58, 1.1, (0, 0, depth - 0.35), CAP_FACE)
    bevel(face, min(w, h) * 0.08, 2)
    return [body, face]


def move_parts(parts, x, y, z=0):
    for obj in parts:
        obj.location.x += x
        obj.location.y += y
        obj.location.z += z


def apply_mods(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    zs = [p.z for p in pts]
    print("BBOX", obj.name, "x", round(min(xs), 1), round(max(xs), 1), "y", round(min(ys), 1), round(max(ys), 1), "z", round(min(zs), 1), round(max(zs), 1))


def carve(plate, cutter):
    apply_mods(cutter)
    if cutter.name in {"NavTray", "tunerSocket", "TransportDeck", "BeatRail"}:
        world_bbox(plate)
        world_bbox(cutter)
    before = len(plate.data.vertices)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = plate
    plate.select_set(True)
    mod = plate.modifiers.new("Carve", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    after = len(plate.data.vertices)
    print("CARVE", cutter.name, before, "->", after)
    bpy.data.objects.remove(cutter, do_unlink=True)
    plate.select_set(False)


def build_chassis(layout, width, height, knob, hole):
    under = box("Underplate", width + 4, height + 4, 4, (width / 2, height / 2, -2.6), STEP)
    plate = box("Plate", width, height, 2.2, (width / 2, height / 2, -1.1), BODY)
    bevel(plate, 4, 2)
    apply_mods(plate)
    parts = [under, plate]
    dial = layout["dial"]
    dx, dy = screen_to_world(dial, height)
    well_r = dial["w"] * 0.5
    carve(plate, cylinder("DialWell", well_r * 0.99, 6, (dx, dy, -1.2), WELL, verts=96))
    collar = cylinder("DialCollar", well_r * 1.02, 0.9, (dx, dy, 0.35), BODY, verts=96)
    bevel(collar, 0.35, 2)
    parts.append(collar)
    ring = cylinder("ChampagneRing", hole + 2.6, 0.45, (dx, dy, 1.55), CHAMPAGNE, verts=96)
    inner = cylinder("ChampagneInner", hole + 0.4, 1.2, (dx, dy, 1.55), WELL, verts=96)
    bpy.context.view_layer.objects.active = ring
    mod = ring.modifiers.new("Lip", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = inner
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(inner, do_unlink=True)
    parts.append(ring)
    glass = cylinder("Glass", max(8, hole * 0.96), 0.45, (dx, dy, 0.55), GLASS, verts=96)
    parts.append(glass)
    _sx, _sy, knob_h = spans(knob)
    knob.location = (dx, dy, knob_h / 2 + 0.35)
    parts.append(knob)

    def pocket(name, rect, depth=3.4):
        x, y = screen_to_world(rect, height)
        cutter = box(name, rect["w"] * 1.04, rect["h"] * 1.08, depth, (x, y, -depth * 0.35), WELL)
        bevel(cutter, min(rect["w"], rect["h"]) * 0.08, 2)
        carve(plate, cutter)
        return x, y

    for key in ("tuner", "sound", "bpmMinus", "bpmPlus", "tap", "play", "meter", "pockt"):
        x, y = pocket(key + "Socket", layout[key], 3.6 if key in {"tap", "play"} else 3.0)
        cap_h = 7.2 if key in {"tap", "play"} else 5.6
        caps = key_cap("Cap" + key, layout[key]["w"] * 0.82, layout[key]["h"] * 0.72, cap_h)
        move_parts(caps, x, y, 1.6 - cap_h)
        parts.extend(caps)

    beats = layout["beats"]
    bx, by = screen_to_world(beats, height)
    channel = box("BeatRail", beats["w"] * 0.96, beats["h"] * 0.62, 4.2, (bx, by, -1.0), WELL)
    bevel(channel, 6, 2)
    carve(plate, channel)
    for index, sock in enumerate(layout["sockets"]):
        x, y = screen_to_world(sock, height)
        radius = min(sock["w"], sock["h"]) * 0.5
        carve(plate, cylinder(f"LampCavity{index}", radius * 1.05, 4.5, (x, y, -1.4), WELL, verts=48))
        bezel = cylinder(f"LampBezel{index}", radius * 0.92, 0.7, (x, y, 0.15), BODY, verts=48)
        hole_cut = cylinder(f"LampBezelHole{index}", radius * 0.62, 2.0, (x, y, 0.15), WELL, verts=40)
        bpy.context.view_layer.objects.active = bezel
        lip = bezel.modifiers.new("Lip", "BOOLEAN")
        lip.operation = "DIFFERENCE"
        lip.solver = "EXACT"
        lip.object = hole_cut
        bpy.ops.object.modifier_apply(modifier=lip.name)
        bpy.data.objects.remove(hole_cut, do_unlink=True)
        lens = cylinder(f"LampLens{index}", radius * 0.58, 0.35, (x, y, -0.55), GLASS, verts=40)
        parts.extend([bezel, lens])
    loop = layout["loop"]
    x, y = pocket("LoopSocket", loop, 2.8)
    caps = key_cap("Caploop", loop["w"] * 0.84, loop["h"] * 0.72, 4.6)
    move_parts(caps, x, y, 1.2 - 4.6)
    parts.extend(caps)

    transport = layout["transport"]
    tx, ty = screen_to_world(transport, height)
    deck = box("TransportDeck", transport["w"] + 4, transport["h"] + 12, 4.2, (tx, ty, -1.0), WELL)
    bevel(deck, 5, 2)
    carve(plate, deck)
    tray_rect = {
        "x": 8,
        "y": transport["y"] + transport["h"] + 8,
        "w": width - 16,
        "h": height - 4 - (transport["y"] + transport["h"] + 8),
    }
    print("TRAY RECT", tray_rect)
    rx, ry = screen_to_world(tray_rect, height)
    tray = box("NavTray", tray_rect["w"], tray_rect["h"], 4.2, (rx, ry, -1.0), WELL)
    bevel(tray, 4, 2)
    carve(plate, tray)
    bpy.ops.object.select_all(action="DESELECT")
    plate.select_set(True)
    bpy.context.view_layer.objects.active = plate
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(28))
    except RuntimeError:
        pass
    plate.select_set(False)
    return parts


def load_layout():
    with open(MANIFEST, encoding="utf-8") as handle:
        return json.load(handle)


def phase_master():
    manifest = load_layout()
    frame = manifest["390x844"]
    layout = frame["layout"]
    layout["sockets"] = frame["apertures"]["sockets"]
    layout["loop"] = frame["apertures"]["loop"]
    layout["navBar"] = frame["layout"]["navBar"]
    width = frame["frame"]["w"]
    height = frame["frame"]["h"]
    reset()
    ensure_materials()
    scene = bpy.context.scene
    configure(scene, width * 3, height * 3, samples=36, transparent=False)
    studio(scene, width, height)
    camera_top(scene, width, height)
    knob, raw, hole = prepare_knob(layout["dial"]["w"] * 0.92, record=True)
    # Mesh proof uses the same materials and a temporary camera crop, then the master uses the phone camera.
    raw.location = (-layout["dial"]["w"] * 0.62, 0, 0)
    knob.location = (layout["dial"]["w"] * 0.62, 0, 0)
    hide_all()
    raw.hide_render = False
    knob.hide_render = False
    show_lights()
    scene.camera.location = (0, 0, 900)
    scene.camera.data.ortho_scale = layout["dial"]["w"] * 2.5
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    render_to(os.path.join(OUT, "mesh-proof.png"))
    raw.hide_render = True
    scene.camera.location = (width / 2, height / 2, 900)
    scene.camera.data.ortho_scale = height
    scene.render.resolution_x = width * 3
    scene.render.resolution_y = height * 3
    build_chassis(layout, width, height, knob, hole)
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.hide_render = False
    raw.hide_render = True
    show_lights()
    render_to(os.path.join(OUT, "signature-master-3x.png"))
    print("MASTER DONE", knob.name, "verts", len(knob.data.vertices))
    for obj in bpy.data.objects:
        if obj.name.startswith("Knob6") or obj.name.startswith("Cap"):
            obj.hide_render = True
    render_to(os.path.join(OUT, "faceplate-390x844.png"))
    hide_all()
    knob.hide_render = False
    show_lights()
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    render_to(os.path.join(OUT, "dial-ring.png"))
    hide_all()
    for obj in bpy.data.objects:
        if obj.name.startswith("Cap"):
            obj.hide_render = False
    show_lights()
    render_to(os.path.join(OUT, "caps.png"))
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"
    print("LAYERS DONE")


def render_other_plates():
    manifest = load_layout()
    for key, frame in manifest.items():
        if key == "390x844":
            continue
        reset()
        ensure_materials()
        scene = bpy.context.scene
        layout = frame["layout"]
        layout["sockets"] = frame["apertures"]["sockets"]
        layout["loop"] = frame["apertures"]["loop"]
        width = frame["frame"]["w"]
        height = frame["frame"]["h"]
        configure(scene, width * 2, height * 2, samples=24, transparent=False)
        studio(scene, width, height)
        camera_top(scene, width, height)
        knob, _raw, hole = prepare_knob(layout["dial"]["w"] * 0.92)
        build_chassis(layout, width, height, knob, hole)
        for obj in bpy.data.objects:
            if obj.type == "MESH" and not (obj.name.startswith("Knob6") or obj.name.startswith("Cap")):
                obj.hide_render = False
            elif obj.type == "MESH":
                obj.hide_render = True
        show_lights()
        render_to(os.path.join(OUT, f"faceplate-{key}.png"))
        print("PLATE", key)


def main():
    phase = (argv_after() or ["master"])[0]
    if phase == "debug":
        manifest = load_layout()
        frame = manifest["390x844"]
        layout = frame["layout"]
        layout["sockets"] = frame["apertures"]["sockets"]
        layout["loop"] = frame["apertures"]["loop"]
        reset()
        ensure_materials()
        knob, _raw, hole = prepare_knob(layout["dial"]["w"] * 0.92)
        build_chassis(layout, frame["frame"]["w"], frame["frame"]["h"], knob, hole)
        raise SystemExit(0)
    if phase in {"master", "all", "look"}:
        phase_master()
    if phase in {"master", "all"}:
        render_other_plates()


if __name__ == "__main__":
    main()
