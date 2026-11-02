"""Authoritative POCKT North Star V5 scene. The reference PNG is not a texture."""

import math
import os
import sys

import bpy

ROOT = r"C:\Apps\POCKT_4_0"
KNOB = os.path.join(ROOT, "THIRD_PARTY_UI", "Audio Knobs & Switches", "Audio knobs 3D models", "Obj", "Knob_6.obj")
OUT = os.path.join(ROOT, "assets", "north-star-v5")
ART = os.path.join(ROOT, "artifacts", "north-star-build")
BLEND = os.path.join(ROOT, "POCKT_NORTH_STAR_MASTER_V5.blend")
W, H = 390.0, 844.0
FRAMES = 256

PREVIEW = "--preview" in sys.argv
DO_FRAMES = "--frames" in sys.argv
DO_PARTS = "--parts" in sys.argv or not PREVIEW


def by(screen_y):
    return H - screen_y


def set_input(node, name, value):
    sock = node.inputs.get(name)
    if sock is not None:
        sock.default_value = value


def metal(name, color, roughness, anisotropic=0.55, emission=0.0, emission_color=None, metallic=1.0, coat=0.18, bump_strength=0.22):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "Anisotropic", anisotropic)
    set_input(bsdf, "Anisotropic Rotation", 0.0)
    set_input(bsdf, "Specular IOR Level", 0.5)
    set_input(bsdf, "Coat Weight", coat)
    set_input(bsdf, "Coat Roughness", 0.22)
    if emission > 0:
        set_input(bsdf, "Emission Color", (*(emission_color or color), 1))
        set_input(bsdf, "Emission Strength", emission)
    tree = mat.node_tree
    noise = tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 42.0
    noise.inputs["Detail"].default_value = 10.0
    noise.inputs["Roughness"].default_value = 0.62
    bump = tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.35
    tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def assign(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def new_object(name, data, location):
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    return obj


def cube(name, center, size, mat, bevel=0.8):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="Bevel")
    assign(obj, mat)
    return obj


def cylinder(name, center, radius, depth, mat, verts=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center)
    obj = bpy.context.active_object
    obj.name = name
    assign(obj, mat)
    return obj


def bevel_obj(obj, width, segments=2):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier="Bevel")
    obj.select_set(False)


def faced_cap(name, center, width, height, side_mat, face_mat, lip_mat, radius):
    rounded_cap(name, center, width, height, 3.4, side_mat, radius)
    face = rounded_cap(name + "Face", (center[0], center[1], center[2] + 1.15), max(8, width - 5), max(8, height - 5), 1.15, face_mat, max(2.0, radius - 1.5))
    lip = cube(name + "Lip", (center[0], center[1] + height * 0.30, center[2] + 2.15), (width * 0.62, 1.15, 0.32), lip_mat, bevel=0.12)
    return face, lip


def rounded_cap(name, center, width, height, depth, mat, radius):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (max(0.4, width - radius * 2), max(0.4, height - radius * 2), depth)
    bpy.ops.object.transform_apply(scale=True)
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = radius
    mod.segments = 4
    mod.affect = "VERTICES" if hasattr(mod, "affect") else "EDGES"
    try:
        bpy.ops.object.modifier_apply(modifier="Bevel")
    except Exception:
        mod.affect = "EDGES"
        bpy.ops.object.modifier_apply(modifier="Bevel")
    top = obj.modifiers.new("Lip", "BEVEL")
    top.width = min(1.1, depth * 0.35)
    top.segments = 2
    top.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="Lip")
    assign(obj, mat)
    return obj


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20 if PREVIEW else 28
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 1170 if not PREVIEW else 390
    scene.render.resolution_y = 2532 if not PREVIEW else 844
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.85

    graphite = metal("Graphite", (0.20, 0.17, 0.14), 0.38, 0.85, coat=0.22, bump_strength=0.35)
    graphite_dark = metal("GraphiteDark", (0.07, 0.06, 0.05), 0.46, 0.5, coat=0.05, bump_strength=0.12)
    bronze = metal("Bronze", (0.62, 0.40, 0.18), 0.28, 0.15, coat=0.35)
    bronze_dim = metal("BronzeDim", (0.28, 0.17, 0.08), 0.4, 0.2, coat=0.12)
    ridge = metal("Ridge", (0.78, 0.52, 0.24), 0.22, 0.1, coat=0.45, bump_strength=0.05)
    black = metal("Cap", (0.16, 0.13, 0.11), 0.32, 0.25, coat=0.55, bump_strength=0.18)
    glass = metal("Glass", (0.02, 0.015, 0.01), 0.08, 0.0, metallic=0.0, coat=0.8, bump_strength=0.0)
    amber = metal("Amber", (1.0, 0.62, 0.18), 0.35, 0.0, emission=3.2, emission_color=(1.0, 0.55, 0.12), metallic=0.0, bump_strength=0.0)
    lamp_emit = metal("LampEmit", (1.0, 0.72, 0.28), 0.2, 0.0, emission=1.6, emission_color=(1.0, 0.62, 0.18), metallic=0.0, bump_strength=0.0)
    tick_dim = metal("TickDim", (0.55, 0.36, 0.16), 0.3, 0.0, emission=0.7, emission_color=(0.7, 0.4, 0.14), metallic=0.2, bump_strength=0.0)
    amber_soft = metal("AmberSoft", (0.95, 0.62, 0.22), 0.3, 0.0, emission=2.4, emission_color=(1.0, 0.58, 0.16), metallic=0.15, bump_strength=0.0)
    screw_mat = metal("Screw", (0.18, 0.15, 0.12), 0.28, 0.2, coat=0.3)

    # Full-bleed slab. Slightly oversized so the bevel is not clipped.
    chassis = cube("Chassis", (W / 2, H / 2, -1.2), (W + 8, H + 8, 4.2), graphite, bevel=2.4)

    def cut(name, center, scale):
        cutter = cube(name, center, scale, graphite_dark, bevel=0)
        mod = chassis.modifiers.new(name, "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.object = cutter
        mod.solver = "MANIFOLD"
        bpy.context.view_layer.objects.active = chassis
        bpy.ops.object.modifier_apply(modifier=name)
        bpy.data.objects.remove(cutter, do_unlink=True)

    dial_c = (194.38, by(296.68), 1.2)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=128, depth=3.2, location=(dial_c[0], dial_c[1], 1.6))
    dial_cut = bpy.context.active_object
    mod = chassis.modifiers.new("DialWell", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = dial_cut
    mod.solver = "MANIFOLD"
    bpy.context.view_layer.objects.active = chassis
    bpy.ops.object.modifier_apply(modifier="DialWell")
    bpy.data.objects.remove(dial_cut, do_unlink=True)
    # The cube cut is square; cover the corners with the chassis color by seating a round floor.
    floor = cylinder("DialFloor", (dial_c[0], dial_c[1], 0.15), 126, 0.4, graphite_dark, 96)

    # Champagne collar is a ring. The smoked center stays empty of type.
    bpy.ops.mesh.primitive_torus_add(major_radius=74, minor_radius=4.6, major_segments=96, minor_segments=16, location=(dial_c[0], dial_c[1], 2.4))
    collar = bpy.context.active_object
    collar.name = "Champagne"
    assign(collar, bronze)
    bpy.ops.mesh.primitive_torus_add(major_radius=66, minor_radius=1.6, major_segments=80, minor_segments=12, location=(dial_c[0], dial_c[1], 2.55))
    collar_in = bpy.context.active_object
    collar_in.name = "ChampagneInner"
    assign(collar_in, bronze_dim)
    cylinder("Glass", (dial_c[0], dial_c[1], 2.15), 61.5, 0.55, glass, 80)
    bpy.ops.mesh.primitive_torus_add(major_radius=138, minor_radius=2.4, major_segments=96, minor_segments=12, location=(dial_c[0], dial_c[1], 1.35))
    bezel = bpy.context.active_object
    bezel.name = "DialBezel"
    assign(bezel, bronze)

    # Static tick arc. Upper arc carries the amber witness. It does not rotate.
    for index in range(168):
        deg = index * (360 / 168)
        rad = math.radians(deg)
        radius = 134
        x = dial_c[0] + math.sin(rad) * radius
        y = dial_c[1] + math.cos(rad) * radius
        upper = deg < 72 or deg > 288
        length = 7.2 if upper else 4.6
        tick = cube(
            f"Tick{index}",
            (x, y, 3.4),
            (0.7, length, 0.55),
            amber if upper else tick_dim,
            bevel=0.08,
        )
        tick.rotation_euler = (0, 0, -rad)

    # Beat rail, transport deck, nav tray recesses.
    beat_c = (195, by(502), 1.4)
    cut("BeatWell", (beat_c[0], beat_c[1], 1.5), (352, 78, 2.6))
    cube("BeatFloor", (beat_c[0], beat_c[1], 0.2), (344, 70, 0.35), graphite_dark, bevel=3)
    transport_c = (195, by(662), 1.4)
    cut("TransportWell", (transport_c[0], transport_c[1], 1.5), (360, 130, 2.6))
    cube("TransportFloor", (transport_c[0], transport_c[1], 0.2), (352, 122, 0.35), graphite_dark, bevel=4)
    nav_c = (195, by(801.7), 1.3)
    cut("NavWell", (nav_c[0], nav_c[1], 1.4), (368, 86, 2.4))
    cube("NavFloor", (195, 42, 0.25), (360, 78, 0.4), graphite_dark, bevel=6)

    for sx, sy in ((22, H - 22), (W - 22, H - 22), (22, 22), (W - 22, 22)):
        cylinder(f"Screw{sx}{sy}", (sx, sy, 2.05), 4.4, 0.9, screw_mat, 20)
        cube(f"Slot{sx}", (sx, sy, 2.55), (5.2, 0.55, 0.28), graphite_dark, bevel=0)

    bpy.ops.object.text_add(location=(W / 2, by(70), 2.4))
    word = bpy.context.active_object
    word.name = "POCKT"
    word.data.body = "POCKT"
    word.data.size = 18
    word.data.align_x = "CENTER"
    word.data.extrude = 0.35
    word.data.space_character = 1.05
    font_path = r"C:\Windows\Fonts\arialbd.ttf"
    if os.path.exists(font_path):
        word.data.font = bpy.data.fonts.load(font_path)
        print("wordmark font", font_path)
    else:
        print("wordmark font missing")
    word.data.bevel_depth = 0.04
    word.data.bevel_resolution = 1
    bpy.ops.object.convert(target="MESH")
    assign(word, amber_soft)
    cube("WordRule", (W / 2, by(90), 2.5), (42, 1.1, 0.35), amber, bevel=0.1)

    lamps = []
    for index, cx in enumerate((51.39, 117.29, 183.6, 249.09)):
        c = (cx, by(502.91), 1.2)
        cylinder(f"LampRing{index}", c, 13.2, 1.1, bronze, 48)
        cylinder(f"LampBezel{index}", (c[0], c[1], 1.55), 10.2, 0.7, bronze_dim, 40)
        lens = cylinder(f"LampLens{index}", (c[0], c[1], 1.85), 8.2, 0.28, glass, 40)
        core = cylinder(f"LampCore{index}", (c[0], c[1], 2.05), 4.6, 0.22, lamp_emit, 32)
        lamps.append(lens)
        lamps.append(core)

    # Clean caps. No glyphs.
    face = metal("CapFace", (0.30, 0.25, 0.21), 0.28, 0.2, coat=0.65, bump_strength=0.08)
    lip_mat = metal("CapLip", (0.85, 0.55, 0.22), 0.2, 0.0, emission=1.1, emission_color=(1.0, 0.62, 0.22), metallic=0.4, bump_strength=0.0)
    caps = {}
    caps["utility"] = faced_cap("Utility", (68.6, by(75.4), 2.3), 61, 45, black, face, lip_mat, 7)[0]
    faced_cap("UtilitySound", (327, by(75.6), 2.3), 68, 43, black, face, lip_mat, 7)
    caps["round"] = cylinder("Round", (41.7, by(399.3), 2.4), 20.5, 3.0, black, 48)
    bevel_obj(caps["round"], 1.4, 3)
    cylinder("RoundFace", (41.7, by(399.3), 3.5), 16.5, 0.7, face, 40)
    bpy.ops.mesh.primitive_torus_add(major_radius=18.2, minor_radius=1.15, major_segments=48, minor_segments=8, location=(41.7, by(399.3), 3.7))
    ring = bpy.context.active_object
    ring.name = "RoundLip"
    assign(ring, lip_mat)
    plus = cylinder("RoundPlus", (348.4, by(399.3), 2.4), 20.5, 3.0, black, 48)
    bevel_obj(plus, 1.4, 3)
    cylinder("RoundPlusFace", (348.4, by(399.3), 3.5), 16.5, 0.7, face, 40)
    bpy.ops.mesh.primitive_torus_add(major_radius=18.2, minor_radius=1.15, major_segments=48, minor_segments=8, location=(348.4, by(399.3), 3.7))
    plus_ring = bpy.context.active_object
    plus_ring.name = "RoundPlusLip"
    assign(plus_ring, lip_mat)
    caps["loop"] = faced_cap("Loop", (331.8, by(503.1), 2.5), 58, 47, black, face, lip_mat, 7)[0]
    caps["primary"] = faced_cap("Primary", (276, by(637.1), 2.6), 146, 57, black, face, lip_mat, 8)[0]
    faced_cap("PrimaryTap", (109.6, by(638.6), 2.6), 136, 54, black, face, lip_mat, 8)
    caps["secondary"] = faced_cap("Secondary", (276, by(702.6), 2.5), 146, 50, black, face, lip_mat, 7)[0]
    faced_cap("SecondaryMeter", (109.6, by(702.6), 2.5), 136, 50, black, face, lip_mat, 7)

    knob = import_knob(dial_c, bronze_dim)
    add_flutes(knob, dial_c, ridge)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=6.2, depth=4.5, location=(dial_c[0], dial_c[1] + 136, 4.8))
    pointer = bpy.context.active_object
    pointer.name = "Pointer"
    assign(pointer, amber)
    pointer.parent = knob
    pointer.matrix_parent_inverse = knob.matrix_world.inverted()

    scene.camera = camera()
    lights()
    world()
    return {
        "chassis": chassis,
        "knob": knob,
        "caps": caps,
        "pointer": pointer,
        "dial": dial_c,
    }


def import_knob(center, mat):
    bpy.ops.wm.obj_import(filepath=KNOB)
    obj = bpy.context.selected_objects[0]
    obj.name = "Knob6"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    # Disc lies in XY. Diameter is the max of X/Y.
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    diameter = max(max(xs) - min(xs), max(ys) - min(ys))
    target = 248.0
    thickness = max(v.co.z for v in obj.data.vertices) - min(v.co.z for v in obj.data.vertices)
    flatten = 8.0 / max(0.001, thickness)
    obj.scale = (target / diameter, target / diameter, flatten)
    bpy.ops.object.transform_apply(scale=True)
    obj.location = (center[0], center[1], 2.2)
    # Open the smoked-glass center. Keep the purchased flutes.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    inner = [v for v in bm.verts if v.co.x * v.co.x + v.co.y * v.co.y < 80 * 80]
    bmesh.ops.delete(bm, geom=inner, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    assign(obj, mat)
    return obj


def add_flutes(knob, center, mat):
    """Radial ridges seated on the purchased encoder. They rotate with Knob_6."""
    inner, outer = 86.0, 114.0
    count = 72
    ridges = []
    for index in range(count):
        ang = index * math.tau / count
        mid = (inner + outer) * 0.5
        x = center[0] + math.sin(ang) * mid
        y = center[1] + math.cos(ang) * mid
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 7.2))
        obj = bpy.context.active_object
        obj.scale = (0.9, outer - inner, 0.85)
        obj.rotation_euler = (0, 0, -ang)
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        ridges.append(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ridges:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ridges[0]
    bpy.ops.object.join()
    ring = bpy.context.active_object
    ring.name = "Flutes"
    assign(ring, mat)
    ring.parent = knob
    ring.matrix_parent_inverse = knob.matrix_world.inverted()
    return ring


def camera():
    cam_data = bpy.data.cameras.new("Product")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = H
    cam = bpy.data.objects.new("ProductCam", cam_data)
    cam.location = (W / 2, H / 2, 80)
    cam.rotation_euler = (0, 0, 0)
    bpy.context.scene.collection.objects.link(cam)
    return cam


def lights():
    from mathutils import Vector

    def aim(obj, target):
        direction = Vector(target) - obj.location
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    def area(name, location, size, energy, color, target):
        light = bpy.data.lights.new(name, "AREA")
        light.shape = "RECTANGLE"
        light.size = size
        light.size_y = size * 0.72
        light.energy = energy
        light.color = color
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        bpy.context.scene.collection.objects.link(obj)
        aim(obj, target)
        return obj

    heart = (W / 2, H * 0.62, 0)
    area("Key", (40, 900, 280), 260, 180000, (1.0, 0.78, 0.52), heart)
    area("Fill", (340, 200, 260), 380, 42000, (0.75, 0.78, 0.82), (W / 2, H / 2, 0))
    area("Front", (195, 422, 360), 480, 70000, (1.0, 0.9, 0.78), (W / 2, H / 2, 0))
    area("Rim", (8, 60, 140), 90, 36000, (1.0, 0.62, 0.28), (W / 2, 80, 0))


def world():
    world = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.01, 0.009, 0.008, 1)
        bg.inputs[1].default_value = 0.35


def hide_all(except_names):
    for obj in bpy.context.scene.objects:
        obj.hide_render = obj.name not in except_names and obj.type != "CAMERA" and obj.type != "LIGHT"


def render_to(path, transparent=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = path
    scene.render.film_transparent = transparent
    bpy.ops.render.render(write_still=True)
    scene.render.film_transparent = False


def crop_camera(center, width, height):
    scene = bpy.context.scene
    cam = scene.camera
    # Keep the product camera. Use a temporary ortho camera fitted to the part.
    data = bpy.data.cameras.new("Part")
    data.type = "ORTHO"
    data.ortho_scale = max(width, height) * 1.35
    part = bpy.data.objects.new("PartCam", data)
    part.location = (center[0], center[1], 40)
    bpy.context.scene.collection.objects.link(part)
    scene.camera = part
    scene.render.resolution_x = int(width * 3)
    scene.render.resolution_y = int(height * 3)
    return cam


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(ART, exist_ok=True)
    parts = build_scene()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    render_to(os.path.join(ART, "BLENDER_NORTH_STAR_MASTER_V5.png"))
    for obj in bpy.data.objects:
        if obj.name.startswith("LampCore"):
            obj.hide_render = True
    if PREVIEW and not DO_PARTS and not DO_FRAMES:
        print("preview written")
        return

    # Static faceplate: chassis, wells, glass, ticks, lamps. No caps, no knob, no pointer.
    hidden = []
    for obj in bpy.data.objects:
        if obj.name in {"Knob6", "Pointer", "Flutes"} or obj.name.startswith(("Utility", "Round", "Loop", "Primary", "Secondary")):
            obj.hide_render = True
            hidden.append(obj)
    scene = bpy.context.scene
    scene.render.resolution_x = 1170
    scene.render.resolution_y = 2532
    scene.camera = bpy.data.objects["ProductCam"]
    render_to(os.path.join(OUT, "faceplate-static.png"))
    # 1x gate plates are fresh camera renders of this chassis, not a stretched PNG.
    for key, rw, rh in (("320x568", 320, 568), ("375x667", 375, 667), ("390x844", 390, 844), ("393x852", 393, 852), ("430x932", 430, 932)):
        scene.render.resolution_x = rw
        scene.render.resolution_y = rh
        scene.camera.data.ortho_scale = rh
        render_to(os.path.join(ROOT, "assets", "north-star-face", f"faceplate-{key}.png"))
        render_to(os.path.join(ROOT, "assets", "faceplate", f"faceplate-{key}.png"))
    scene.camera.data.ortho_scale = H
    for obj in hidden:
        obj.hide_render = False

    families = {
        "utility": ("Utility", 68, 48),
        "round": ("Round", 48, 48),
        "primary": ("Primary", 156, 64),
        "secondary": ("Secondary", 156, 56),
        "loop": ("Loop", 66, 54),
    }
    product = bpy.data.objects["ProductCam"]
    for family, (obj_name, width, height) in families.items():
        target = bpy.data.objects[obj_name]
        keep = {obj_name, obj_name + "Face", obj_name + "Lip"}
        for others in bpy.data.objects:
            others.hide_render = others.name not in keep and others.type not in {"CAMERA", "LIGHT"}
        companions = [item for item in (bpy.data.objects.get(obj_name + "Face"), bpy.data.objects.get(obj_name + "Lip")) if item]
        rest = [(target, target.location.z)] + [(item, item.location.z) for item in companions]
        previous = crop_camera(target.location, width, height)
        render_to(os.path.join(OUT, f"{family}-rest.png"), transparent=True)
        for item, z in rest:
            item.location.z = z - 1.6
        render_to(os.path.join(OUT, f"{family}-pressed.png"), transparent=True)
        for item, z in rest:
            item.location.z = z
        if family in {"primary", "loop"}:
            render_to(os.path.join(OUT, f"{family}-active.png"), transparent=True)
        bpy.context.scene.camera = product
        bpy.data.objects.remove(bpy.context.scene.camera, do_unlink=True) if False else None
        product.hide_render = False

    # Restore visibility for the knob-only frames. Lights and camera stay.
    for obj in bpy.data.objects:
        obj.hide_render = obj.name not in {"Knob6", "Pointer", "Flutes"} and obj.type not in {"CAMERA", "LIGHT"}
    knob = parts["knob"]
    dial = parts["dial"]
    scene.camera = product
    scene.render.resolution_x = 750
    scene.render.resolution_y = 750
    data = bpy.data.cameras.new("Dial")
    data.type = "ORTHO"
    data.ortho_scale = 290
    dial_cam = bpy.data.objects.new("DialCam", data)
    dial_cam.location = (dial[0], dial[1], 40)
    bpy.context.scene.collection.objects.link(dial_cam)
    scene.camera = dial_cam
    frame_dir = os.path.join(OUT, "dial")
    os.makedirs(frame_dir, exist_ok=True)
    scene.cycles.samples = 8
    count = 8 if PREVIEW else FRAMES
    for index in range(count):
        knob.rotation_euler = (0, 0, -math.radians(index * 360 / FRAMES))
        render_to(os.path.join(frame_dir, f"frame-{index:03d}.png"), transparent=True)
        if index % 16 == 0:
            print("frame", index)

    # Lamp masks from the dark lens, rendered as flat emission plates.
    scene.render.resolution_x = 180
    scene.render.resolution_y = 180
    lamp_cam_data = bpy.data.cameras.new("Lamp")
    lamp_cam_data.type = "ORTHO"
    lamp_cam_data.ortho_scale = 36
    lamp_cam = bpy.data.objects.new("LampCam", lamp_cam_data)
    lens = bpy.data.objects["LampLens0"]
    lamp_cam.location = (lens.location.x, lens.location.y, 20)
    bpy.context.scene.collection.objects.link(lamp_cam)
    scene.camera = lamp_cam
    for obj in bpy.data.objects:
        show = obj.name.startswith("Lamp") and not obj.name.startswith("LampCore")
        obj.hide_render = not show and obj.type not in {"CAMERA", "LIGHT"}
    render_to(os.path.join(OUT, "lamp-fixture.png"), transparent=True)
    core = bpy.data.objects["LampCore0"]
    for obj in bpy.data.objects:
        obj.hide_render = obj.name != "LampCore0" and obj.type not in {"CAMERA", "LIGHT"}
    render_to(os.path.join(OUT, "lamp-emission.png"), transparent=True)
    core.scale = (2.4, 2.4, 1)
    render_to(os.path.join(OUT, "lamp-spill.png"), transparent=True)
    scene.camera = product
    scene.render.resolution_x = 1170
    scene.render.resolution_y = 360
    product.data.ortho_scale = 120
    product.location = (W / 2, 42, 80)
    for obj in bpy.data.objects:
        obj.hide_render = obj.name in {"Knob6", "Pointer"} or obj.name.startswith("Lip") or obj.name in {"Utility", "UtilitySound", "Round", "RoundPlus", "Loop", "Primary", "PrimaryTap", "Secondary", "SecondaryMeter"}
    render_to(os.path.join(OUT, "nav-tray.png"))
    print("v5 render complete")


if __name__ == "__main__":
    main()
