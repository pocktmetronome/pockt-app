"""POCKT premium dial. Blender 4.5. Purchased OBJs are raw material, not the product."""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OBJ_DIR = os.path.join(ROOT, "THIRD_PARTY_UI", "Audio Knobs & Switches", "Audio knobs 3D models", "Obj")
OUT = os.path.join(ROOT, "artifacts", "premium-dial", "blender")
MANIFEST = os.path.join(ROOT, "artifacts", "premium-dial", "layout-manifest.json")
os.makedirs(OUT, exist_ok=True)

KNOBS = [f"Knob_{i}.obj" for i in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)]
SWITCHES = ["Switcher_1.obj", "Switcher_2.obj", "Switcher_3.obj"]


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


def metal(name, color, rough, aniso=0.55, bump=0.035, metallic=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", rough)
    set_input(bsdf, "Anisotropic", aniso)
    set_input(bsdf, "Anisotropic Rotation", 0.15)
    set_input(bsdf, "Specular IOR Level", 0.45)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 180.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.55
    bump_node = nt.nodes.new("ShaderNodeBump")
    bump_node.inputs["Strength"].default_value = bump
    bump_node.inputs["Distance"].default_value = 0.02
    nt.links.new(noise.outputs["Fac"], bump_node.inputs["Height"])
    nt.links.new(bump_node.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def glass(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (0.02, 0.015, 0.01, 1))
    set_input(bsdf, "Metallic", 0.0)
    set_input(bsdf, "Roughness", 0.08)
    set_input(bsdf, "Transmission Weight", 0.92)
    set_input(bsdf, "IOR", 1.5)
    set_input(bsdf, "Alpha", 0.35)
    mat.blend_method = "BLEND"
    return mat


def emission(name, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (0.62, 0.32, 0.08, 1))
    set_input(bsdf, "Emission Color", (1.0, 0.58, 0.14, 1))
    set_input(bsdf, "Emission Strength", strength)
    return mat


GRAPHITE = None
CHAMPAGNE = None
WELL = None
PLATE = None
LENS = None


def ensure_materials():
    global GRAPHITE, CHAMPAGNE, WELL, PLATE, LENS
    GRAPHITE = metal("POCKT_Graphite", (0.045, 0.043, 0.040), 0.42, 0.55, 0.03)
    CHAMPAGNE = metal("POCKT_Champagne", (0.28, 0.20, 0.11), 0.38, 0.22, 0.015)
    WELL = metal("POCKT_Well", (0.012, 0.011, 0.010), 0.94, 0.0, 0.0, 0.0)
    # Chassis is lighter than the recesses so the face reads as one machined plate.
    PLATE = metal("POCKT_Plate", (0.11, 0.105, 0.098), 0.46, 0.45, 0.02)
    LENS = glass("POCKT_Lens")


def studio(scene, cx=0, cy=0, span=400):
    world = bpy.data.worlds.new("POCKT_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.02, 0.018, 0.016, 1)
        bg.inputs[1].default_value = 0.4

    def sun(name, energy, color, rot):
        light_data = bpy.data.lights.new(name, "SUN")
        light_data.energy = energy
        light_data.color = color
        light_data.angle = math.radians(8)
        obj = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(obj)
        obj.location = (cx, cy, span)
        obj.rotation_euler = rot
        return obj

    # Suns are scale-stable. Grazing key reveals bevels on a dark plate.
    sun("Key", 2.1, (1.0, 0.96, 0.90), (math.radians(48), 0, math.radians(-28)))
    sun("Fill", 1.25, (0.82, 0.86, 0.92), (math.radians(64), 0, math.radians(150)))
    sun("Rim", 0.7, (1.0, 0.90, 0.76), (math.radians(32), math.radians(6), math.radians(118)))


def configure_render(scene, w, h, samples=48, transparent=False):
    engines = {"BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"}
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    scene.render.image_settings.compression = 15
    if scene.render.engine in engines or "EEVEE" in scene.render.engine:
        eevee = getattr(scene, "eevee", None)
        if eevee:
            if hasattr(eevee, "taa_render_samples"):
                eevee.taa_render_samples = samples
            if hasattr(eevee, "use_raytracing"):
                eevee.use_raytracing = True
            if hasattr(eevee, "use_shadows"):
                eevee.use_shadows = True
    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    scene.view_settings.exposure = -0.05
    try:
        scene.view_settings.look = "AgX - Base Contrast"
    except TypeError:
        pass


def camera_top(scene, cx, cy, ortho_h):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_h
    cam_data.sensor_fit = "VERTICAL"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (cx, cy, 500)
    cam.rotation_euler = (0, 0, 0)
    scene.camera = cam
    return cam


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
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
    mod.angle_limit = math.radians(35)


def new_cylinder(name, radius, depth, loc, verts=96, mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign(obj, mat)
    shade(obj)
    return obj


def new_box(name, w, h, d, loc, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w / 2, h / 2, d / 2)
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        assign(obj, mat)
    shade(obj)
    return obj


def annulus(name, r_outer, r_inner, z0, z1, ribs=0, depth=0.0, segs=240, mat=None):
    """Closed annular solid. Ribs are shallow vertical flutes, not a sawtooth."""
    import bmesh

    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    def ring(z, radius, fluted):
        verts = []
        for i in range(segs):
            ang = math.tau * i / segs
            radius_here = radius
            if fluted and ribs > 1 and depth:
                radius_here += depth * (0.5 + 0.5 * math.cos(ang * ribs))
            verts.append(bm.verts.new((math.cos(ang) * radius_here, math.sin(ang) * radius_here, z)))
        return verts

    def bridge(a, b, flip=False):
        for i in range(segs):
            j = (i + 1) % segs
            quad = (a[i], b[i], b[j], a[j]) if flip else (a[i], a[j], b[j], b[i])
            try:
                bm.faces.new(quad)
            except ValueError:
                pass

    outer_bottom = ring(z0, r_outer, True)
    inner_bottom = ring(z0, r_inner, False)
    inner_top = ring(z1, r_inner * 0.985, False)
    outer_top = ring(z1, r_outer * 0.955, True)
    crown = ring((z0 + z1) * 0.5, r_outer + depth * 0.35, True)
    bridge(outer_bottom, crown)
    bridge(crown, outer_top)
    bridge(outer_top, inner_top)
    bridge(inner_top, inner_bottom, flip=True)
    bridge(inner_bottom, outer_bottom, flip=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        assign(obj, mat)
    shade(obj)
    return obj


def index_pip(radius, z, mat):
    obj = new_box("Index", radius * 0.018, radius * 0.16, radius * 0.028, (0, radius * 0.9, z), mat)
    bevel(obj, radius * 0.006, 2)
    return obj


def import_obj(path):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path)
    created = [obj for obj in bpy.data.objects if obj not in before]
    return created


def normalize_imported(objects, target=1.6):
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    span = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs), 1e-6)
    scale = target / span
    obj.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(scale=True)
    # Stand the knob upright if it is short in Z after the file's Y-up export.
    zs = [v.co.z for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    if (max(ys) - min(ys)) > (max(zs) - min(zs)) * 1.4:
        obj.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
        obj.location = (0, 0, 0)
    assign(obj, GRAPHITE)
    shade(obj)
    return obj


def bounds_dict(obj):
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    return {
        "verts": len(obj.data.vertices),
        "faces": len(obj.data.polygons),
        "span": [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)],
    }


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def hide_all():
    for obj in bpy.data.objects:
        obj.hide_render = True


def show(objects):
    for obj in objects:
        obj.hide_render = False


def phase_board():
    reset()
    ensure_materials()
    scene = bpy.context.scene
    configure_render(scene, 640, 640, samples=32, transparent=True)
    studio(scene, 0, 0, 3.2)
    cam = camera_top(scene, 0, 0, 2.8)
    cam.location = Vector((1.7, -1.55, 1.45))
    cam.rotation_euler = (Vector((0, 0, 0.15)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    notes = {}
    for name in KNOBS + SWITCHES:
        path = os.path.join(OBJ_DIR, name)
        created = import_obj(path)
        obj = normalize_imported(created, 1.7)
        if obj is None:
            notes[name] = {"error": "no mesh"}
            continue
        notes[name] = bounds_dict(obj)
        hide_all()
        obj.hide_render = False
        # Keep lights and camera visible.
        for light in bpy.data.objects:
            if light.type in {"LIGHT", "CAMERA"}:
                light.hide_render = False
        render_to(os.path.join(OUT, f"board-{os.path.splitext(name)[0]}.png"))
        bpy.data.objects.remove(obj, do_unlink=True)
    with open(os.path.join(OUT, "geometry-notes.json"), "w", encoding="utf-8") as handle:
        json.dump(notes, handle, indent=2)
    print("BOARD DONE", len(notes))


def build_hero(radius):
    """Redesigned encoder. Knob_6's gear crown informs the rib count and height, the mesh is new."""
    objects = []
    grip_h = radius * 0.085
    ring = annulus(
        "Encoder",
        r_outer=radius * 0.97,
        r_inner=radius * 0.72,
        z0=0.6,
        z1=0.6 + grip_h,
        ribs=96,
        depth=radius * 0.012,
        segs=288,
        mat=GRAPHITE,
    )
    objects.append(ring)
    witness = annulus(
        "Witness",
        r_outer=radius * 0.735,
        r_inner=radius * 0.705,
        z0=0.85,
        z1=0.85 + grip_h * 0.35,
        ribs=0,
        depth=0.0,
        segs=160,
        mat=CHAMPAGNE,
    )
    objects.append(witness)
    collar = new_cylinder("Collar", radius * 0.66, radius * 0.045, (0, 0, 0.55), verts=128, mat=GRAPHITE)
    bevel(collar, radius * 0.012, 2)
    objects.append(collar)
    # Fixed center is a separate object so the ring render can hide it.
    center = annulus(
        "Center",
        r_outer=radius * 0.58,
        r_inner=radius * 0.28,
        z0=0.35,
        z1=0.35 + radius * 0.04,
        ribs=0,
        depth=0.0,
        segs=160,
        mat=GRAPHITE,
    )
    objects.append(center)
    pip = index_pip(radius, 0.6 + grip_h * 0.55, CHAMPAGNE)
    objects.append(pip)
    seat = new_cylinder("Seat", radius * 1.02, radius * 0.03, (0, 0, 0.12), verts=128, mat=WELL)
    objects.append(seat)
    return {"ring": [ring, witness, pip], "center": [center, collar, seat], "all": objects}


def phase_parts():
    reset()
    ensure_materials()
    scene = bpy.context.scene
    with open(MANIFEST, encoding="utf-8") as handle:
        manifest = json.load(handle)
    layout = manifest["390x844"]["layout"]
    dial = layout["dial"]["w"]
    configure_render(scene, 1536, 1536, samples=64, transparent=True)
    studio(scene, 0, 0, dial)
    camera_top(scene, 0, 0, dial * 1.08)
    hero = build_hero(dial / 2)
    hide_all()
    for obj in hero["ring"]:
        obj.hide_render = False
    for obj in bpy.data.objects:
        if obj.type in {"LIGHT", "CAMERA"}:
            obj.hide_render = False
    render_to(os.path.join(OUT, "dial-ring.png"))
    hide_all()
    for obj in hero["center"]:
        obj.hide_render = False
    for obj in bpy.data.objects:
        if obj.type in {"LIGHT", "CAMERA"}:
            obj.hide_render = False
    render_to(os.path.join(OUT, "dial-center.png"))
    hide_all()
    for obj in hero["all"]:
        obj.hide_render = False
    for obj in bpy.data.objects:
        if obj.type in {"LIGHT", "CAMERA"}:
            obj.hide_render = False
    render_to(os.path.join(OUT, "hero-dial.png"))

    # Caps share one lighting rig. Each is framed to its own ortho.
    def render_cap(name, w, h, depth, roundness):
        hide_all()
        for obj in list(bpy.data.objects):
            if obj.name.startswith("Cap"):
                bpy.data.objects.remove(obj, do_unlink=True)
        cap = new_box(f"Cap{name}", w * 0.94, h * 0.9, depth, (0, 0, depth / 2), GRAPHITE)
        bevel(cap, min(w, h) * roundness, 4)
        skin = new_box(f"CapSkin{name}", w * 0.72, h * 0.58, max(2.4, depth * 0.22), (0, 0, depth * 0.95), GRAPHITE)
        bevel(skin, min(w, h) * 0.06, 2)
        rw, rh = 900, max(180, int(900 * (h / w)))
        scene.render.resolution_x = rw
        scene.render.resolution_y = rh
        cam = scene.camera
        cam.data.ortho_scale = h * 1.16
        cam.location = (0, 0, 400)
        for obj in (cap, skin):
            obj.hide_render = False
        for obj in bpy.data.objects:
            if obj.type in {"LIGHT", "CAMERA"}:
                obj.hide_render = False
        render_to(os.path.join(OUT, f"cap-{name}.png"))

    render_cap("primary", 220, 120, 16, 0.18)
    render_cap("secondary", 180, 110, 12, 0.16)
    render_cap("utility", 120, 120, 12, 0.42)
    render_cap("nav", 90, 70, 8, 0.2)

    # Optical fixture and five energy levels.
    def render_lamp(tag, strength, radius):
        hide_all()
        for obj in list(bpy.data.objects):
            if obj.name.startswith("Lamp"):
                bpy.data.objects.remove(obj, do_unlink=True)
        socket = new_cylinder("LampSocket", 28, 10, (0, 0, 4), verts=64, mat=WELL)
        ring = new_cylinder("LampRing", 30, 3.2, (0, 0, 9), verts=64, mat=GRAPHITE)
        bevel(ring, 0.8, 2)
        lens = new_cylinder("LampLens", 18, 1.4, (0, 0, 10.4), verts=48, mat=WELL)
        core = None
        if strength > 0:
            core = new_cylinder("LampCore", radius, 0.8, (0, 0, 11.3), verts=40, mat=emission(f"Emit{tag}", strength))
        cam = scene.camera
        cam.data.ortho_scale = 78
        cam.location = (0, 0, 400)
        for obj in (socket, ring, lens):
            obj.hide_render = False
        if core:
            core.hide_render = False
        for obj in bpy.data.objects:
            if obj.type in {"LIGHT", "CAMERA"}:
                obj.hide_render = False
        render_to(os.path.join(OUT, f"lamp-{tag}.png"))

    render_lamp("off", 0, 0)
    render_lamp("l1", 1.1, 7)
    render_lamp("l2", 2.0, 10)
    render_lamp("l3", 3.2, 13)
    render_lamp("peak", 4.6, 16)
    print("PARTS DONE")


def screen_to_world(rect, height):
    cx = rect["x"] + rect["w"] / 2
    cy = height - (rect["y"] + rect["h"] / 2)
    return cx, cy


def add_well_disc(name, cx, cy, radius, mat):
    well = new_cylinder(name, radius, 5, (cx, cy, -1.2), verts=80, mat=mat)
    lip = new_cylinder(name + "Lip", radius + 2.2, 1.4, (cx, cy, 0.7), verts=80, mat=GRAPHITE)
    bevel(lip, 0.6, 2)
    return [well, lip]


def add_well_round_rect(name, cx, cy, w, h, mat):
    well = new_box(name, w, h, 5, (cx, cy, -1.2), mat)
    bevel(well, min(w, h) * 0.18, 3)
    lip = new_box(name + "Lip", w + 3, h + 3, 1.3, (cx, cy, 0.65), GRAPHITE)
    bevel(lip, min(w, h) * 0.16, 2)
    return [well, lip]


def sockets_for(layout, count=4):
    beats = layout["beats"]
    loop_w = min(72, max(52, round(beats["h"] * 0.56)))
    timebase = 16
    inner_x = beats["x"] + timebase + 22
    inner_right = beats["x"] + beats["w"] - loop_w - 18
    inner_w = max(48, inner_right - inner_x)
    col = inner_w / max(1, count)
    disc = min(col * 0.7, beats["h"] * 0.56)
    sockets = []
    for index in range(count):
        x = inner_x + col * index + (col - disc) / 2
        y = beats["y"] + (beats["h"] - disc) * 0.42
        sockets.append({"x": x, "y": y, "w": disc, "h": disc})
    loop_h = min(44, max(36, round(beats["h"] * 0.48)))
    loop = {
        "x": beats["x"] + beats["w"] - loop_w - 12,
        "y": beats["y"] + (beats["h"] - loop_h) / 2,
        "w": loop_w,
        "h": loop_h,
    }
    return sockets, loop


def build_plate(layout, width, height, screws=False, dial_scale=1.0, apertures=None):
    w = width
    plate = new_box("Plate", w - 8, height - 8, 8, (w / 2, height / 2, -3.2), PLATE)
    bevel(plate, 6.5, 3)
    objects = [plate]
    dial = layout["dial"]
    cx, cy = screen_to_world(dial, height)
    seat = dial["w"] * 0.46 * dial_scale
    well = new_cylinder("DialWell", seat * 0.98, 16, (cx, cy, -7), verts=96, mat=WELL)
    land = annulus("DialLand", seat * 1.06, seat * 0.9, -0.6, 1.2, mat=GRAPHITE)
    land.location = (cx, cy, 0)
    objects += [well, land]
    for key, kind in (
        ("tuner", "disc"),
        ("sound", "disc"),
        ("bpmMinus", "disc"),
        ("bpmPlus", "disc"),
        ("tap", "rect"),
        ("play", "rect"),
        ("meter", "rect"),
        ("pockt", "rect"),
    ):
        rect = layout[key]
        x, y = screen_to_world(rect, height)
        if kind == "disc":
            objects += add_well_disc(key, x, y, min(rect["w"], rect["h"]) * 0.5, WELL)
        else:
            objects += add_well_round_rect(key, x, y, rect["w"] * 0.96, rect["h"] * 0.9, WELL)
    sockets = (apertures or {}).get("sockets")
    loop = (apertures or {}).get("loop")
    if not sockets:
        sockets, loop = sockets_for(layout)
    for index, sock in enumerate(sockets):
        x, y = screen_to_world(sock, height)
        objects += add_well_disc(f"LampWell{index}", x, y, min(sock["w"], sock["h"]) * 0.52, WELL)
    if loop:
        x, y = screen_to_world(loop, height)
        objects += add_well_round_rect("LoopWell", x, y, loop["w"] * 0.96, loop["h"] * 0.88, WELL)
    rail = layout["faceRail"]
    rx, ry = screen_to_world(rail, height)
    tray = new_box("NavTray", rail["w"] * 0.98, rail["h"] * 0.78, 3.2, (rx, ry, -1.2), WELL)
    bevel(tray, 5, 2)
    objects.append(tray)
    if screws:
        for sx, sy in ((22, height - 70), (w - 22, height - 70), (22, 48), (w - 22, 48)):
            objects.append(new_cylinder(f"Screw{sx}", 3.2, 1.2, (sx, sy, 0.8), verts=12, mat=CHAMPAGNE))
    return objects


def place_hero_on_dial(layout, height, scale=1.0):
    dial = layout["dial"]
    cx, cy = screen_to_world(dial, height)
    hero = build_hero(dial["w"] * 0.5 * scale)
    for obj in hero["all"]:
        obj.location.x += cx
        obj.location.y += cy
    return hero


def phase_plate():
    with open(MANIFEST, encoding="utf-8") as handle:
        manifest = json.load(handle)
    for key, frame in manifest.items():
        reset()
        ensure_materials()
        scene = bpy.context.scene
        layout = frame["layout"]
        w = frame["frame"]["w"]
        h = frame["frame"]["h"]
        scale = 3 if key == "390x844" else 2
        configure_render(scene, w * scale, h * scale, samples=32, transparent=False)
        studio(scene, w / 2, h / 2, h)
        for obj in scene.objects:
            if obj.type == "LIGHT" and obj.name == "Key":
                obj.data.energy = 1.15
            if obj.type == "LIGHT" and obj.name == "Fill":
                obj.data.energy = 1.6
        camera_top(scene, w / 2, h / 2, h)
        build_plate(layout, w, h, screws=False, apertures=frame.get("apertures"))
        scene.view_settings.exposure = 0.22
        render_to(os.path.join(OUT, f"faceplate-{key}.png"))
        if key == "390x844":
            render_to(os.path.join(OUT, "faceplate-3x.png"))
        print("PLATE", key)


def phase_directions():
    with open(MANIFEST, encoding="utf-8") as handle:
        manifest = json.load(handle)
    base = manifest["390x844"]["layout"]
    h = 844
    variants = {
        "A": {
            "layout": dict(base, dial={"x": 55, "y": 250, "w": 280, "h": 280},
                           bpmHit={"x": 70, "y": 168, "w": 250, "h": 64},
                           tuner={"x": 24, "y": 64, "w": 48, "h": 48},
                           sound={"x": 318, "y": 64, "w": 48, "h": 48},
                           bpmMinus={"x": 24, "y": 176, "w": 40, "h": 40},
                           bpmPlus={"x": 326, "y": 176, "w": 40, "h": 40},
                           beats={"x": 36, "y": 560, "w": 318, "h": 64},
                           tap={"x": 28, "y": 648, "w": 70, "h": 52},
                           play={"x": 106, "y": 644, "w": 110, "h": 58},
                           meter={"x": 224, "y": 648, "w": 70, "h": 52},
                           pockt={"x": 302, "y": 648, "w": 60, "h": 52},
                           faceRail={"x": 18, "y": 742, "w": 354, "h": 56}),
            "screws": False,
            "dial_scale": 1.0,
        },
        "B": {
            "layout": dict(base, dial={"x": 48, "y": 150, "w": 294, "h": 294},
                           bpmMinus={"x": 12, "y": 268, "w": 36, "h": 36},
                           bpmPlus={"x": 342, "y": 268, "w": 36, "h": 36},
                           tuner={"x": 16, "y": 62, "w": 52, "h": 52},
                           sound={"x": 322, "y": 62, "w": 52, "h": 52},
                           beats={"x": 16, "y": 470, "w": 358, "h": 92},
                           tap={"x": 16, "y": 582, "w": 78, "h": 78},
                           play={"x": 104, "y": 574, "w": 140, "h": 92},
                           meter={"x": 254, "y": 582, "w": 60, "h": 78},
                           pockt={"x": 322, "y": 582, "w": 52, "h": 78},
                           faceRail={"x": 12, "y": 730, "w": 366, "h": 70}),
            "screws": True,
            "dial_scale": 1.0,
        },
        "C": {"layout": base, "screws": False, "dial_scale": 1.0},
    }
    for key, spec in variants.items():
        reset()
        ensure_materials()
        scene = bpy.context.scene
        configure_render(scene, 780, 1688, samples=36, transparent=False)
        studio(scene, 195, h / 2, h)
        for obj in scene.objects:
            if obj.type == "LIGHT" and obj.name == "Key":
                obj.data.energy = 1.15
            if obj.type == "LIGHT" and obj.name == "Fill":
                obj.data.energy = 1.6
        camera_top(scene, 195, h / 2, h)
        apertures = manifest["390x844"].get("apertures") if key == "C" else None
        build_plate(spec["layout"], 390, h, screws=spec["screws"], dial_scale=spec["dial_scale"], apertures=apertures)
        scene.view_settings.exposure = 0.22
        place_hero_on_dial(spec["layout"], h, spec["dial_scale"])
        render_to(os.path.join(OUT, f"direction-{key}.png"))
        print("DIRECTION", key)


def phase_lamps():
    reset()
    ensure_materials()
    scene = bpy.context.scene
    configure_render(scene, 512, 512, samples=32, transparent=True)
    studio(scene, 0, 0, 80)
    camera_top(scene, 0, 0, 78)

    def render_lamp(tag, strength, radius):
        hide_all()
        for obj in list(bpy.data.objects):
            if obj.name.startswith("Lamp"):
                bpy.data.objects.remove(obj, do_unlink=True)
        socket = new_cylinder("LampSocket", 28, 10, (0, 0, 4), verts=64, mat=WELL)
        ring = new_cylinder("LampRing", 30, 3.2, (0, 0, 9), verts=64, mat=GRAPHITE)
        bevel(ring, 0.8, 2)
        lens = new_cylinder("LampLens", 18, 1.4, (0, 0, 10.4), verts=48, mat=WELL)
        core = None
        if strength > 0:
            core = new_cylinder("LampCore", radius, 0.8, (0, 0, 11.3), verts=40, mat=emission(f"Emit{tag}", strength))
        for obj in (socket, ring, lens):
            obj.hide_render = False
        if core:
            core.hide_render = False
        for obj in bpy.data.objects:
            if obj.type in {"LIGHT", "CAMERA"}:
                obj.hide_render = False
        render_to(os.path.join(OUT, f"lamp-{tag}.png"))

    render_lamp("off", 0, 0)
    render_lamp("l1", 1.1, 7)
    render_lamp("l2", 2.0, 10)
    render_lamp("l3", 3.2, 13)
    render_lamp("peak", 4.6, 16)
    print("LAMPS DONE")


def main():
    args = argv_after() or ["all"]
    for phase in args:
        if phase in {"all", "board"}:
            phase_board()
        if phase in {"all", "parts"}:
            phase_parts()
        if phase in {"all", "plate"}:
            phase_plate()
        if phase in {"all", "directions"}:
            phase_directions()
        if phase == "lamps" or (phase == "all" and "parts" not in args):
            phase_lamps()


if __name__ == "__main__":
    main()
