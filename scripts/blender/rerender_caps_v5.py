"""Re-render textless caps with a local light so the metal is visible on transparent film."""

import os

import bpy
from mathutils import Vector

ROOT = r"C:\Apps\POCKT_4_0"
BLEND = os.path.join(ROOT, "POCKT_NORTH_STAR_MASTER_V5.blend")
OUT = os.path.join(ROOT, "assets", "north-star-v5")

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.cycles.device = "CPU"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.use_compositing = False
scene.use_nodes = False

for mat in bpy.data.materials:
    if mat.name in {"Cap", "CapFace"} and mat.use_nodes:
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf and "Base Color" in bsdf.inputs:
            color = (0.34, 0.28, 0.22, 1) if mat.name == "CapFace" else (0.16, 0.13, 0.11, 1)
            bsdf.inputs["Base Color"].default_value = color
            if "Metallic" in bsdf.inputs:
                bsdf.inputs["Metallic"].default_value = 0.72
            if "Roughness" in bsdf.inputs:
                bsdf.inputs["Roughness"].default_value = 0.34

light = bpy.data.lights.new("CapKey", "AREA")
light.shape = "DISK"
light.size = 80
light.energy = 25000
light.color = (1.0, 0.86, 0.7)
key = bpy.data.objects.new("CapKey", light)
bpy.context.scene.collection.objects.link(key)

def solid_cap(name, center, width, height):
    import bmesh

    for suffix in ("", "Face", "Lip"):
        old = bpy.data.objects.get(name + suffix)
        if old is not None:
            bpy.data.objects.remove(old, do_unlink=True)
    mesh = bpy.data.meshes.new(name + "Mesh")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vert in bm.verts:
        vert.co.x *= width
        vert.co.y *= height
        vert.co.z *= 3.2
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (center[0], center[1], 4.0)
    bpy.context.scene.collection.objects.link(obj)
    mat = bpy.data.materials.new(name + "Mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.20, 0.16, 0.13, 1)
    bsdf.inputs["Metallic"].default_value = 0.78
    bsdf.inputs["Roughness"].default_value = 0.32
    bsdf.inputs["Emission Color"].default_value = (0.35, 0.18, 0.05, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.18
    obj.data.materials.append(mat)
    print("made", obj.name, tuple(round(v, 1) for v in obj.dimensions))
    return obj


by = lambda screen_y: 844.0 - screen_y
solid_cap("Utility", (68.6, by(75.4), 3.2), 61, 45)
solid_cap("Primary", (276, by(637.1), 3.2), 146, 57)
solid_cap("PrimaryTap", (109.6, by(638.6), 3.2), 136, 54)
solid_cap("Secondary", (276, by(702.6), 3.2), 146, 50)
solid_cap("SecondaryMeter", (109.6, by(702.6), 3.2), 136, 50)
solid_cap("Loop", (331.8, by(503.1), 3.2), 58, 47)

families = {
    "utility": ("Utility", 68, 48),
    "round": ("Round", 48, 48),
    "primary": ("Primary", 156, 64),
    "secondary": ("Secondary", 156, 56),
    "loop": ("Loop", 66, 54),
}

def render_family(family, obj_name, width, height):
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH" and (obj.name == obj_name or obj.name.startswith(obj_name + "."))]
    target = max(meshes, key=lambda obj: len(obj.data.polygons))
    print("render", family, target.name, tuple(round(v, 1) for v in target.matrix_world.translation))
    keep = {target.name, obj_name + "Lip", "CapKey"}
    for obj in bpy.data.objects:
        obj.hide_render = obj.name not in keep and obj.type not in {"CAMERA", "LIGHT"}
    key.location = (target.location.x, target.location.y + 8, target.location.z + 40)
    key.rotation_euler = (Vector((target.location.x, target.location.y, target.location.z)) - key.location).to_track_quat("-Z", "Y").to_euler()
    data = bpy.data.cameras.new("Part" + family)
    data.type = "ORTHO"
    data.ortho_scale = max(width, height) * 1.15
    cam = bpy.data.objects.new("PartCam" + family, data)
    cam.location = (target.location.x, target.location.y, 40)
    bpy.context.scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x = int(width * 3)
    scene.render.resolution_y = int(height * 3)
    companions = [item for item in (bpy.data.objects.get(obj_name + "Face"), bpy.data.objects.get(obj_name + "Lip")) if item]
    rest = [(target, target.location.z)] + [(item, item.location.z) for item in companions]
    scene.render.filepath = os.path.join(OUT, f"{family}-rest.png")
    bpy.ops.render.render(write_still=True)
    for item, z in rest:
        item.location.z = z - 1.6
    scene.render.filepath = os.path.join(OUT, f"{family}-pressed.png")
    bpy.ops.render.render(write_still=True)
    for item, z in rest:
        item.location.z = z
    if family in {"primary", "loop"}:
        scene.render.filepath = os.path.join(OUT, f"{family}-active.png")
        bpy.ops.render.render(write_still=True)
    print("cap", family)

for family, (name, width, height) in families.items():
    render_family(family, name, width, height)
print("caps refreshed")
