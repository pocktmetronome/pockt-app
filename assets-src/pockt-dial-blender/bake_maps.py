"""Phase 2 bake pipeline — Round 4 scene → realtime IBL maps.

Orthographic top-down UV (not the mesh UVMap). Maps are Cycles *ortho
emit-renders* from a camera with ortho_scale = 2*BAKE_EXTENT — same framing
the Metal shader uses. Selected-to-active onto a plane was tried first;
rays missed (plane +Z). Lighting stays world-fixed in the shader; only
sample coordinates rotate.

Normal space: OBJECT. Blender object axes, identity transform, Z up.
Encoded RGB = n * 0.5 + 0.5. Shader rotates N.xy by knob angle.

Resolutions (iPhone, 2048 max on hub/knob):
  knob albedo/normal/orm  2048  hub grain n=560 needs ~5 px/cycle
  knob aniso              1024  radial T is smooth; strength is low-freq
  static beauty           2048  AgX still of non-rotating parts
  static normal           1024  housing knurl + bezel live sparkle
  env RGBM                256x128  studio key+rim; mips generated on device

UV: object XY in [-BAKE_EXTENT, BAKE_EXTENT] → [0, 1].
Must match PocktDialShader.metal BAKE_EXTENT / VIEW_FILL.
"""

from __future__ import annotations

import json
import math
import os
import shutil
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
from render_stills import configure_render, enable_cycles_device
from scene import setup_scene

# --- contract with PocktDialShader.metal ---
BAKE_EXTENT = 1.08
VIEW_FILL = 0.48
RGBM_MAX = 16.0

KNOB = ("DIAL_HUB", "DIAL_CHAMFER", "DIAL_ROTATOR_KNURL")
STATIC = (
    "DIAL_HOUSING",
    "DIAL_BEZEL",
    "DIAL_PLATE",
    "DIAL_WELL_FLOOR",
    "DIAL_WELL_WALL",
    "DIAL_WELL_INNER",
    "DIAL_GROUND",
)
STATIC_LIVE = ("DIAL_HOUSING", "DIAL_BEZEL")
ALL_DIAL = KNOB + STATIC

KNOB_RES = 2048
ANISO_RES = 1024
STATIC_N_RES = 1024
ENV_W = 256
ENV_H = 128

SHIP_NAMES = (
    "knob_albedo.png",
    "knob_normal.png",
    "knob_ao.png",
    "knob_rough.png",
    "knob_aniso.png",
    "static_beauty.png",
    "static_normal.png",
    "env_rgbm.png",
)


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


def _has(argv, flag):
    return flag in argv


def _obj(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"missing object {name}")
    return obj


def _ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path


def _new_image(name, w, h, is_data):
    existing = bpy.data.images.get(name)
    if existing is not None:
        bpy.data.images.remove(existing)
    img = bpy.data.images.new(name, width=w, height=h, alpha=True, float_buffer=False)
    img.colorspace_settings.name = "Non-Color" if is_data else "sRGB"
    return img


def _make_plane(z=0.22):
    """Legacy bake target (unused). Ortho emit-renders replaced selected-to-active."""
    old = bpy.data.objects.get("DIAL_BAKE_PLANE")
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    mesh = bpy.data.meshes.new("DIAL_BAKE_PLANE")
    s = BAKE_EXTENT
    verts = [(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)]
    mesh.from_pydata(verts, [], [(0, 3, 2, 1)])
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    uv.data[0].uv = (0.0, 0.0)
    uv.data[1].uv = (0.0, 1.0)
    uv.data[2].uv = (1.0, 1.0)
    uv.data[3].uv = (1.0, 0.0)
    obj = bpy.data.objects.new("DIAL_BAKE_PLANE", mesh)
    bpy.context.collection.objects.link(obj)
    obj.hide_render = True
    obj.visible_shadow = False
    obj.visible_camera = False
    return obj


def _bind_image(plane, img):
    mat = bpy.data.materials.get("MAT_BAKE_TARGET")
    if mat is None:
        mat = bpy.data.materials.new("MAT_BAKE_TARGET")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.select = True
    nt.nodes.active = tex
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    if plane.data.materials:
        plane.data.materials[0] = mat
    else:
        plane.data.materials.append(mat)
    plane.active_material = mat
    return tex


def _select_sources(names, plane):
    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
        selected.append(obj)
    plane.hide_set(False)
    plane.hide_render = False
    plane.select_set(True)
    bpy.context.view_layer.objects.active = plane
    return selected


def _bake(plane, img, sources, bake_type, samples, normal_space="OBJECT"):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = int(samples)
    scene.cycles.use_denoising = False
    scene.cycles.use_adaptive_sampling = False
    scene.render.bake.margin = 8
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = 0.28
    scene.render.bake.max_ray_distance = 0.0
    scene.render.bake.normal_space = normal_space
    scene.render.bake.normal_r = "POS_X"
    scene.render.bake.normal_g = "POS_Y"
    scene.render.bake.normal_b = "POS_Z"
    scene.render.bake.target = "IMAGE_TEXTURES"
    _bind_image(plane, img)
    selected = _select_sources(sources, plane)
    if not selected:
        raise RuntimeError(f"no bake sources for {img.name}")
    t0 = time.perf_counter()
    with bpy.context.temp_override(
        active_object=plane,
        selected_objects=selected + [plane],
        object=plane,
    ):
        kwargs = {
            "type": bake_type,
            "use_selected_to_active": True,
            "cage_extrusion": 0.28,
            "margin": 8,
            "use_clear": True,
            "target": "IMAGE_TEXTURES",
        }
        if bake_type == "NORMAL":
            kwargs["normal_space"] = normal_space
            kwargs["normal_r"] = "POS_X"
            kwargs["normal_g"] = "POS_Y"
            kwargs["normal_b"] = "POS_Z"
        bpy.ops.object.bake(**kwargs)
    elapsed = time.perf_counter() - t0
    print(f"[pockt-dial] bake {img.name} type={bake_type} {img.size[0]}x{img.size[1]} in {elapsed:.1f}s")
    return elapsed


def _write_png_rgba(path, w, h, rgba_f, flip_y=True):
    """Direct PNG writer. Blender Image.save() was discarding generated pixels."""
    import struct
    import zlib

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    rows = []
    for y in range(h):
        src = (h - 1 - y) if flip_y else y
        row = bytearray(1 + w * 4)
        row[0] = 0
        base = src * w * 4
        for i in range(w * 4):
            row[1 + i] = int(min(1.0, max(0.0, rgba_f[base + i])) * 255.0 + 0.5)
        rows.append(bytes(row))
    raw = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)
    print(f"[pockt-dial] wrote {path} ({os.path.getsize(path)} bytes)")


def _save_png(img, path, is_data):
    img.colorspace_settings.name = "Non-Color" if is_data else "sRGB"
    img.file_format = "PNG"
    img.filepath_raw = path
    img.update()
    # Generated buffers do not flush through Image.save() without a filepath arg.
    try:
        img.save(filepath=path)
    except TypeError:
        try:
            img.pack()
        except Exception as exc:
            print("[pockt-dial] pack failed", exc)
        img.save()
    print(f"[pockt-dial] wrote {path} ({os.path.getsize(path)} bytes) px0={tuple(img.pixels[0:4])}")


def _emit_from_principled(mat, channel):
    clone = mat.copy()
    clone.name = f"{mat.name}_EMIT_{channel.replace(' ', '_')}"
    nt = clone.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if bsdf is None or out is None:
        raise RuntimeError(f"cannot emit-clone {mat.name}")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    sock = bsdf.inputs.get(channel)
    if sock is not None and sock.is_linked:
        src = sock.links[0].from_socket
        if src.type == "VALUE" and channel != "Base Color":
            comb = nt.nodes.new("ShaderNodeCombineXYZ")
            nt.links.new(src, comb.inputs["X"])
            nt.links.new(src, comb.inputs["Y"])
            nt.links.new(src, comb.inputs["Z"])
            nt.links.new(comb.outputs["Vector"], emit.inputs["Color"])
        else:
            nt.links.new(src, emit.inputs["Color"])
    elif sock is not None:
        val = sock.default_value
        if channel == "Base Color":
            emit.inputs["Color"].default_value = val
        else:
            f = float(val)
            emit.inputs["Color"].default_value = (f, f, f, 1.0)
    for link in list(out.inputs["Surface"].links):
        nt.links.remove(link)
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return clone


def _assign_temp(names, mat_for_name):
    restore = {}
    for name in names:
        obj = _obj(name)
        restore[name] = obj.active_material
        mat = mat_for_name(name, obj.active_material)
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        obj.active_material = mat
    return restore


def _restore_mats(restore):
    for name, mat in restore.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        obj.data.materials.clear()
        if mat is not None:
            obj.data.materials.append(mat)
            obj.active_material = mat


def _aniso_material():
    mat = bpy.data.materials.get("MAT_BAKE_ANISO") or bpy.data.materials.new("MAT_BAKE_ANISO")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tex.outputs["Object"], sep.inputs["Vector"])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], comb.inputs["X"])
    nt.links.new(sep.outputs["Y"], comb.inputs["Y"])
    nrm = nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    nt.links.new(comb.outputs["Vector"], nrm.inputs[0])
    # RGB = tangent.xy encoded, B unused here; A-strength is painted via mix
    mul = nt.nodes.new("ShaderNodeVectorMath")
    mul.operation = "MULTIPLY_ADD"
    mul.inputs[1].default_value = (0.5, 0.5, 0.5)
    mul.inputs[2].default_value = (0.5, 0.5, 0.5)
    nt.links.new(nrm.outputs["Vector"], mul.inputs[0])
    # Strength in blue from material aniso — default 0.68 (hub). Per-object
    # override happens in _assign_aniso.
    nt.links.new(mul.outputs["Vector"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def _aniso_for_object(name, _orig):
    strength = {
        "DIAL_HUB": 0.68,
        "DIAL_CHAMFER": 0.60,
        "DIAL_ROTATOR_KNURL": 0.10,
        "DIAL_HOUSING": 0.08,
        "DIAL_BEZEL": 0.62,
    }.get(name, 0.0)
    base = _aniso_material()
    mat = base.copy()
    mat.name = f"MAT_BAKE_ANISO_{name}"
    nt = mat.node_tree
    emit = next(n for n in nt.nodes if n.type == "EMISSION")
    # Encode strength in the unused Z of the (already 0.5-centered) vector
    # by replacing B after the multiply-add.
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    color_in = emit.inputs["Color"]
    if color_in.is_linked:
        nt.links.new(color_in.links[0].from_socket, sep.inputs["Vector"])
    comb.inputs["Z"].default_value = strength
    nt.links.new(sep.outputs["X"], comb.inputs["X"])
    nt.links.new(sep.outputs["Y"], comb.inputs["Y"])
    nt.links.new(comb.outputs["Vector"], emit.inputs["Color"])
    return mat


def _pack_orm(ao_img, rough_img, metal_img, dest_path, res):
    """R=AO G=Rough B=Metallic. Images are Blender float pixels, bottom-up."""
    packed = _new_image("knob_orm", res, res, True)
    n = res * res
    ao = list(ao_img.pixels)
    rough = list(rough_img.pixels)
    metal = list(metal_img.pixels)
    out = [0.0] * (n * 4)
    for i in range(n):
        o = i * 4
        out[o] = ao[o]
        out[o + 1] = rough[o]
        out[o + 2] = metal[o]
        out[o + 3] = 1.0
    packed.pixels[:] = out
    _save_png(packed, dest_path, True)


def _encode_aniso_rgba(src_img, dest_path, res):
    """RG = tangent.xy (0.5-centered), B unused, A = strength (from src B)."""
    packed = _new_image("knob_aniso", res, res, True)
    n = res * res
    src = list(src_img.pixels)
    out = [0.0] * (n * 4)
    for i in range(n):
        o = i * 4
        out[o] = src[o]
        out[o + 1] = src[o + 1]
        out[o + 2] = 0.5
        out[o + 3] = src[o + 2]
    packed.pixels[:] = out
    _save_png(packed, dest_path, True)


def _set_visibility(names, hide_render):
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        obj.hide_render = hide_render
        obj.visible_camera = not hide_render


def _set_knob_camera_visibility(visible):
    _set_visibility(KNOB, hide_render=not visible)
    for name in KNOB:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            obj.visible_camera = visible


def _mat_emit_principled(channel):
    def builder(name, orig):
        return _emit_from_principled(orig, channel)
    return builder


def _mat_object_normal(_name, _orig):
    mat = bpy.data.materials.new("MAT_BAKE_OBJNORMAL")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    geom = nt.nodes.new("ShaderNodeNewGeometry")
    madd = nt.nodes.new("ShaderNodeVectorMath")
    madd.operation = "MULTIPLY_ADD"
    madd.inputs[1].default_value = (0.5, 0.5, 0.5)
    madd.inputs[2].default_value = (0.5, 0.5, 0.5)
    nt.links.new(geom.outputs["Normal"], madd.inputs[0])
    nt.links.new(madd.outputs["Vector"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def _mat_ao(_name, _orig):
    mat = bpy.data.materials.new("MAT_BAKE_AO")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = 16
    dist = ao.inputs.get("Distance")
    if dist is not None:
        dist.default_value = 0.08
    ao_out = ao.outputs.get("AO") or ao.outputs.get("Color") or ao.outputs[0]
    nt.links.new(ao_out, emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def _hide_plane():
    plane = bpy.data.objects.get("DIAL_BAKE_PLANE")
    if plane is not None:
        plane.hide_render = True
        plane.visible_camera = False


def _render_data_pass(path, names, mat_builder, samples, res, extras=()):
    """Ortho camera, Raw/Standard, emit override. Same UV as the Metal sampler."""
    _setup_ortho_camera()
    _hide_plane()
    visible = set(names) | set(extras)
    for name in ALL_DIAL:
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        hide = name not in visible
        obj.hide_render = hide
        obj.visible_camera = not hide
    restore = _assign_temp(names, mat_builder)
    extra_restore = _assign_temp(extras, mat_builder) if extras else {}
    p = dict(PARAMS)
    p["resolution"] = res
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    configure_render(p, samples)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    scene.cycles.use_denoising = False
    scene.render.filepath = path
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    elapsed = time.perf_counter() - t0
    print(f"[pockt-dial] data pass {path} in {elapsed:.1f}s size={os.path.getsize(path)}")
    _restore_mats(restore)
    _restore_mats(extra_restore)
    _set_visibility(ALL_DIAL, hide_render=False)
    return elapsed


def _setup_ortho_camera():
    cam = bpy.data.objects.get("DIAL_CAMERA")
    if cam is None:
        raise RuntimeError("DIAL_CAMERA missing")
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 2.0 * BAKE_EXTENT
    cam.location = Vector((0.0, 0.0, 8.0))
    cam.rotation_euler = (0.0, 0.0, 0.0)
    direction = Vector((0.0, 0.0, 0.09)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.shift_x = 0.0
    cam.data.shift_y = 0.0
    bpy.context.scene.camera = cam


def _render_png(path, samples, p, transparent=False, view_transform="AgX"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    configure_render(p, samples)
    scene.render.film_transparent = transparent
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    scene.view_settings.view_transform = view_transform
    if view_transform != "AgX":
        scene.view_settings.exposure = 0.0
    scene.render.filepath = path
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    print(f"[pockt-dial] render {path} in {time.perf_counter() - t0:.1f}s")


def _render_env(path, samples):
    """Equirect of the Round 4 studio (meshes hidden). Linear → RGBM PNG."""
    for name in ALL_DIAL:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            obj.hide_render = True
    plane = bpy.data.objects.get("DIAL_BAKE_PLANE")
    if plane is not None:
        plane.hide_render = True
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.visible_camera = True

    cam_data = bpy.data.cameras.new("DIAL_ENV_CAM")
    cam_data.type = "PANO"
    pano = getattr(cam_data, "panorama_type", None)
    if pano is not None:
        cam_data.panorama_type = "EQUIRECTANGULAR"
    else:
        cycles = getattr(cam_data, "cycles", None)
        if cycles is not None and hasattr(cycles, "panorama_type"):
            cycles.panorama_type = "EQUIRECTANGULAR"
    cam_data.clip_start = 0.02
    cam_data.clip_end = 40.0
    cam = bpy.data.objects.new("DIAL_ENV_CAM", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = Vector((0.0, 0.0, 0.12))
    cam.rotation_euler = (0.0, 0.0, 0.0)
    scene = bpy.context.scene
    prev = scene.camera
    scene.camera = cam
    scene.render.resolution_x = ENV_W
    scene.render.resolution_y = ENV_H
    scene.render.engine = "CYCLES"
    scene.cycles.samples = int(samples)
    scene.cycles.use_denoising = False
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "32"
    scene.view_settings.view_transform = "Raw"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    exr_path = path.replace(".png", ".exr")
    scene.render.filepath = exr_path
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    print(f"[pockt-dial] env exr {exr_path} in {time.perf_counter() - t0:.1f}s")

    img = bpy.data.images.load(exr_path, check_existing=False)
    pixels = list(img.pixels)
    n = ENV_W * ENV_H
    rgbm = _new_image("env_rgbm", ENV_W, ENV_H, True)
    out = [0.0] * (n * 4)
    for i in range(n):
        o = i * 4
        r, g, b = max(pixels[o], 0.0), max(pixels[o + 1], 0.0), max(pixels[o + 2], 0.0)
        peak = max(r, g, b, 1e-6)
        m = min(1.0, max(1.0 / 255.0, peak / RGBM_MAX))
        # store ceil-ish multiplier in A so decode = rgb * a * RGBM_MAX
        m = min(1.0, (int(m * 255.0 + 0.999) / 255.0))
        out[o] = min(1.0, r / (m * RGBM_MAX))
        out[o + 1] = min(1.0, g / (m * RGBM_MAX))
        out[o + 2] = min(1.0, b / (m * RGBM_MAX))
        out[o + 3] = m
    rgbm.pixels[:] = out
    peak = max(pixels[i] for i in range(0, len(pixels), 4))
    print(f"[pockt-dial] env capture peak={peak:.5f}")

    scene.camera = prev
    bpy.data.objects.remove(cam, do_unlink=True)
    bpy.data.cameras.remove(cam_data)
    for name in ALL_DIAL:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            obj.hide_render = False
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.visible_camera = False

    # Area lights + PANO at origin is unreliable (0.1s black frames). Always
    # write the analytic RGBM of the Round 4 key/rim/sweep so IBL has energy.
    print("[pockt-dial] synthesizing env RGBM from Round 4 light directions")
    _synthesize_env(path)


def _synthesize_env(path):
    """RGBM lat-long of the Round 4 key / sweep / rim / fill as Gaussian lobes."""
    lobes = (
        # dir (x,y,z), color * energy scale
        ((0.18, 2.35, 1.55), (1.0, 0.72, 0.45), 8.0, 0.18),
        ((0.85, 1.55, 1.85), (1.0, 0.86, 0.74), 3.2, 0.22),
        ((-0.4, 1.6, 1.4), (1.0, 0.80, 0.58), 1.6, 0.20),
        ((0.08, 1.35, 1.05), (1.0, 0.72, 0.45), 2.4, 0.16),
        ((-2.25, 0.35, 0.28), (1.0, 0.80, 0.58), 0.9, 0.28),
        ((-1.6, 1.1, 1.8), (0.85, 0.88, 1.0), 0.35, 0.55),
    )
    n = ENV_W * ENV_H
    out = [0.0] * (n * 4)
    for y in range(ENV_H):
        lat = (0.5 - (y + 0.5) / ENV_H) * math.pi
        cl = math.cos(lat)
        sl = math.sin(lat)
        for x in range(ENV_W):
            lon = ((x + 0.5) / ENV_W - 0.5) * 2.0 * math.pi
            # +Y = 12 o'clock, Z up
            d = (cl * math.sin(lon), cl * math.cos(lon), sl)
            r = g = b = 0.012
            for direc, col, energy, sharpness in lobes:
                ln = math.sqrt(direc[0] ** 2 + direc[1] ** 2 + direc[2] ** 2)
                nd = (direc[0] / ln, direc[1] / ln, direc[2] / ln)
                ndot = max(0.0, d[0] * nd[0] + d[1] * nd[1] + d[2] * nd[2])
                w = ndot ** (1.0 / max(sharpness, 0.04))
                r += col[0] * energy * w
                g += col[1] * energy * w
                b += col[2] * energy * w
            peak = max(r, g, b, 1e-6)
            m = min(1.0, max(1.0 / 255.0, peak / RGBM_MAX))
            m = min(1.0, (int(m * 255.0 + 0.999) / 255.0))
            o = (y * ENV_W + x) * 4
            out[o] = min(1.0, r / (m * RGBM_MAX))
            out[o + 1] = min(1.0, g / (m * RGBM_MAX))
            out[o + 2] = min(1.0, b / (m * RGBM_MAX))
            out[o + 3] = m
    print("[pockt-dial] synth env array max", max(out), "mean", sum(out) / len(out))
    _write_png_rgba(path, ENV_W, ENV_H, out, flip_y=True)


def _copy_ship(baked_dir, ios_dir):
    _ensure_dir(ios_dir)
    copied = []
    for name in SHIP_NAMES:
        src = os.path.join(baked_dir, name)
        dst = os.path.join(ios_dir, name)
        if not os.path.exists(src):
            raise RuntimeError(f"missing bake output {src}")
        shutil.copy2(src, dst)
        copied.append((dst, os.path.getsize(dst)))
        print(f"[pockt-dial] ship {dst} ({os.path.getsize(dst)} bytes)")
    return copied


def _write_manifest(baked_dir, samples, beauty_samples, times, copied):
    manifest = {
        "source_commit": "6254e7d Round 4 visual master",
        "normal_space": "OBJECT",
        "normal_encoding": "rgb = n * 0.5 + 0.5, +X +Y +Z",
        "uv": {
            "space": "top-down orthographic",
            "object_xy_range": [-BAKE_EXTENT, BAKE_EXTENT],
            "v_plus": "+Y (12 o'clock)",
            "shader_view_fill": VIEW_FILL,
        },
        "aniso": {
            "rg": "object-space radial tangent xy, 0.5-centered",
            "a": "anisotropic strength (Principled)",
            "hub": "radial-tangent, matches MAT_HUB Tangent RADIAL Z",
        },
        "env": {
            "format": "RGBM PNG",
            "rgbm_max": RGBM_MAX,
            "size": [ENV_W, ENV_H],
            "projection": "equirect, camera at (0,0,0.12), Z-up, +Y = 12 o'clock",
        },
        "resolutions": {
            "knob_albedo": KNOB_RES,
            "knob_normal": KNOB_RES,
            "knob_ao": KNOB_RES,
            "knob_rough": KNOB_RES,
            "knob_aniso": ANISO_RES,
            "static_beauty": KNOB_RES,
            "static_normal": STATIC_N_RES,
            "env_rgbm": [ENV_W, ENV_H],
        },
        "justification": {
            "knob_2048": "hub shader grain n=560 over ~1000 px hub diameter ≈ 5.6 px/cycle; 1024 is Nyquist-marginal",
            "aniso_1024": "radial T is a smooth field; strength fades only near r=0",
            "static_beauty_2048": "housing knurl 520 teeth occupy ~77 px ring width; 11 px/tooth at 2048",
            "static_normal_1024": "live knurl sparkle under tilt; 5.5 px/tooth is enough for a highlight tap",
            "env_256x128": "studio is 7 area lights; 256 columns resolve the key/rim lobes",
        },
        "samples": {"bake": samples, "beauty": beauty_samples},
        "seconds": times,
        "ios_copies": {os.path.basename(p): n for p, n in copied},
        "podspec_globs": ["**/*.metal", "**/*.png"],
        "resource_bundle": "PocktDial.bundle",
    }
    path = os.path.join(baked_dir, "bake_manifest.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[pockt-dial] wrote", path)


def main(argv=None):
    argv = list(argv or _argv())
    baked_dir = os.path.normpath(_arg(argv, "--out", os.path.join(_HERE, "..", "pockt-dial-baked")))
    ios_dir = os.path.normpath(
        _arg(argv, "--ios", os.path.join(_HERE, "..", "..", "modules", "pockt-dial", "ios", "Resources"))
    )
    samples = int(_arg(argv, "--samples", 48))
    beauty_samples = int(_arg(argv, "--beauty-samples", 128))
    res = _arg(argv, "--res", None)
    skip_copy = _has(argv, "--no-copy")
    pack_only = _has(argv, "--pack-only")

    if pack_only:
        img_ao = bpy.data.images.load(os.path.join(baked_dir, "knob_ao.png"), check_existing=False)
        img_r = bpy.data.images.load(os.path.join(baked_dir, "knob_rough.png"), check_existing=False)
        img_m = bpy.data.images.load(os.path.join(baked_dir, "knob_metal.png"), check_existing=False)
        _pack_orm(img_ao, img_r, img_m, os.path.join(baked_dir, "knob_orm.png"), img_ao.size[0])
        src = os.path.join(baked_dir, "knob_aniso_src.png")
        dst = os.path.join(baked_dir, "knob_aniso.png")
        shutil.copy2(src, dst)
        print("[pockt-dial] shipped aniso_src as knob_aniso", os.path.getsize(dst))
        _synthesize_env(os.path.join(baked_dir, "env_rgbm.png"))
        copied = [] if skip_copy else _copy_ship(baked_dir, ios_dir)
        _write_manifest(baked_dir, 0, 0, {"pack_only": 0}, copied)
        print("[pockt-dial] pack-only complete")
        return

    global KNOB_RES, ANISO_RES, STATIC_N_RES
    if res:
        KNOB_RES = int(res)
        ANISO_RES = min(ANISO_RES, KNOB_RES)
        STATIC_N_RES = min(STATIC_N_RES, KNOB_RES)

    _ensure_dir(baked_dir)
    device = enable_cycles_device()
    print("[pockt-dial] Cycles device:", device)
    print(f"[pockt-dial] bake res={KNOB_RES} samples={samples} beauty_samples={beauty_samples}")

    build()
    assign_all()
    setup_scene()
    _make_plane()
    times = {}

    # Ortho emit-renders share the Metal UV (camera ortho_scale = 2*BAKE_EXTENT).
    # Selected-to-active bake missed the mesh (plane rays went +Z); these do not.
    times["knob_albedo"] = _render_data_pass(
        os.path.join(baked_dir, "knob_albedo.png"),
        KNOB,
        _mat_emit_principled("Base Color"),
        samples,
        KNOB_RES,
    )
    times["knob_rough"] = _render_data_pass(
        os.path.join(baked_dir, "knob_rough.png"),
        KNOB,
        _mat_emit_principled("Roughness"),
        samples,
        KNOB_RES,
    )
    times["knob_metal"] = _render_data_pass(
        os.path.join(baked_dir, "knob_metal.png"),
        KNOB,
        _mat_emit_principled("Metallic"),
        samples,
        KNOB_RES,
    )
    times["knob_ao"] = _render_data_pass(
        os.path.join(baked_dir, "knob_ao.png"),
        ALL_DIAL,
        _mat_ao,
        max(samples, 32),
        KNOB_RES,
    )
    img_ao = bpy.data.images.load(os.path.join(baked_dir, "knob_ao.png"), check_existing=False)
    img_r = bpy.data.images.load(os.path.join(baked_dir, "knob_rough.png"), check_existing=False)
    img_m = bpy.data.images.load(os.path.join(baked_dir, "knob_metal.png"), check_existing=False)
    _pack_orm(img_ao, img_r, img_m, os.path.join(baked_dir, "knob_orm.png"), KNOB_RES)
    times["knob_normal"] = _render_data_pass(
        os.path.join(baked_dir, "knob_normal.png"),
        KNOB,
        _mat_object_normal,
        samples,
        KNOB_RES,
    )
    times["knob_aniso"] = _render_data_pass(
        os.path.join(baked_dir, "knob_aniso_src.png"),
        KNOB,
        _aniso_for_object,
        samples,
        ANISO_RES,
    )
    img_a = bpy.data.images.load(os.path.join(baked_dir, "knob_aniso_src.png"), check_existing=False)
    _encode_aniso_rgba(img_a, os.path.join(baked_dir, "knob_aniso.png"), ANISO_RES)
    times["static_normal"] = _render_data_pass(
        os.path.join(baked_dir, "static_normal.png"),
        STATIC_LIVE,
        _mat_object_normal,
        samples,
        STATIC_N_RES,
    )

    # --- static beauty: AgX ortho, knob invisible to camera but still shadows ---
    _setup_ortho_camera()
    _set_knob_camera_visibility(False)
    p = dict(PARAMS)
    p["resolution"] = KNOB_RES
    times["static_beauty"] = 0.0
    t0 = time.perf_counter()
    _render_png(os.path.join(baked_dir, "static_beauty.png"), beauty_samples, p, transparent=False)
    times["static_beauty"] = time.perf_counter() - t0
    _set_knob_camera_visibility(True)

    # --- ortho full-dial reference (fair parity partner; not shipped) ---
    t0 = time.perf_counter()
    _render_png(os.path.join(baked_dir, "ortho_full_cycles.png"), beauty_samples, p, transparent=False)
    times["ortho_full_cycles"] = time.perf_counter() - t0

    # --- environment ---
    times["env_rgbm"] = 0.0
    t0 = time.perf_counter()
    _render_env(os.path.join(baked_dir, "env_rgbm.png"), max(samples, 32))
    times["env_rgbm"] = time.perf_counter() - t0

    copied = []
    if not skip_copy:
        copied = _copy_ship(baked_dir, ios_dir)
    _write_manifest(baked_dir, samples, beauty_samples, times, copied)
    print("[pockt-dial] bake complete")


if __name__ == "__main__":
    main()
