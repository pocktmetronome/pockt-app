"""Parametric Classic Dial solid model.

All key dimensions live in params.PARAMS. This script only builds geometry.
Materials and lighting are applied by materials.py / scene.py.

Bake-ready: every solid is named DIAL_*, sits in collection DIAL_MODEL,
has object-scale applied, and carries a radial or cylindrical UVMap.
"""

from __future__ import annotations

import math
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from params import PARAMS  # single PARAMS block — edit params.py to iterate

import bpy


def _reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def _ensure_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def _link(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    obj["pockt_bake"] = True


def _mesh(name, verts, faces, col, shade="smooth"):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    _link(obj, col)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if shade == "flat":
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_auto_smooth(use_auto_smooth=True, angle=math.radians(40.0))
    obj.select_set(False)
    return obj


def _annulus(name, r_out, r_in, z0, z1, segs, col, shade="smooth"):
    verts = []
    for r in (r_out, r_in):
        for z in (z0, z1):
            for i in range(segs):
                th = 2.0 * math.pi * i / segs
                verts.append((r * math.cos(th), r * math.sin(th), z))
    faces = []
    b_out_lo, b_out_hi, b_in_lo, b_in_hi = 0, segs, 2 * segs, 3 * segs
    for i in range(segs):
        a, b = i, (i + 1) % segs
        faces.append((b_out_lo + a, b_out_lo + b, b_out_hi + b, b_out_hi + a))
        faces.append((b_in_lo + a, b_in_hi + a, b_in_hi + b, b_in_lo + b))
        faces.append((b_out_hi + a, b_out_hi + b, b_in_hi + b, b_in_hi + a))
        faces.append((b_out_lo + a, b_in_lo + a, b_in_lo + b, b_out_lo + b))
    return _mesh(name, verts, faces, col, shade)


def _turned_lip(name, r_center, r_minor, z_center, segs, profile_segs, col, z_scale=1.0):
    """Revolved bead — circular or flattened (z_scale < 1) CNC-turned lip."""
    verts = []
    z_scale = max(0.15, float(z_scale))
    for j in range(profile_segs):
        a = 2.0 * math.pi * j / profile_segs
        pr = r_center + r_minor * math.cos(a)
        pz = z_center + r_minor * z_scale * math.sin(a)
        for i in range(segs):
            th = 2.0 * math.pi * i / segs
            verts.append((pr * math.cos(th), pr * math.sin(th), pz))
    faces = []
    for j in range(profile_segs):
        j2 = (j + 1) % profile_segs
        for i in range(segs):
            i2 = (i + 1) % segs
            a = j * segs + i
            b = j * segs + i2
            c = j2 * segs + i2
            d = j2 * segs + i
            faces.append((a, b, c, d))
    return _mesh(name, verts, faces, col, "smooth")


def _hub(name, radius, z0, z1, segs, col, dome, rings, radial_n, radial_amp):
    """Raised hub with fine RADIAL brush hairlines. No concentric grooving."""
    rings = max(24, int(rings))
    radial_n = int(radial_n or 0)
    radial_amp = float(radial_amp or 0.0)
    lo = [(0.0, 0.0, z0)]
    hi = [(0.0, 0.0, z1 + dome)]
    for j in range(1, rings + 1):
        t = j / rings
        r = radius * t
        z_base = z1 + dome * (1.0 - t * t)
        for i in range(segs):
            th = 2.0 * math.pi * i / segs
            z_top = z_base
            if radial_n and radial_amp:
                z_top += radial_amp * math.sin(radial_n * th)
            lo.append((r * math.cos(th), r * math.sin(th), z0))
            hi.append((r * math.cos(th), r * math.sin(th), z_top))
    verts = lo + hi
    n_lo = len(lo)
    faces = []

    def lo_i(ring, i):
        if ring == 0:
            return 0
        return 1 + (ring - 1) * segs + (i % segs)

    def hi_i(ring, i):
        if ring == 0:
            return n_lo
        return n_lo + 1 + (ring - 1) * segs + (i % segs)

    for i in range(segs):
        faces.append((0, lo_i(1, i + 1), lo_i(1, i)))
        faces.append((n_lo, hi_i(1, i), hi_i(1, i + 1)))
    for ring in range(1, rings):
        for i in range(segs):
            a = lo_i(ring, i)
            b = lo_i(ring, i + 1)
            c = lo_i(ring + 1, i + 1)
            d = lo_i(ring + 1, i)
            faces.append((a, b, c, d))
            a = hi_i(ring, i)
            b = hi_i(ring + 1, i)
            c = hi_i(ring + 1, i + 1)
            d = hi_i(ring, i + 1)
            faces.append((a, b, c, d))
    for i in range(segs):
        faces.append(
            (
                lo_i(rings, i),
                lo_i(rings, i + 1),
                hi_i(rings, i + 1),
                hi_i(rings, i),
            )
        )
    return _mesh(name, verts, faces, col, "smooth")


def _diamond_h(u, v, fillet):
    """Isometric diamond knurl height in 0..1. Peaks at half-integer crosses."""
    s = u + v
    t = u - v
    fs = s - math.floor(s)
    ft = t - math.floor(t)
    d = max(abs(fs - 0.5), abs(ft - 0.5)) * 2.0
    h = 1.0 - d
    if fillet > 0.0 and h > 1.0 - fillet:
        x = (h - (1.0 - fillet)) / fillet
        h = (1.0 - fillet) + fillet * math.sin(0.5 * math.pi * x)
    return max(0.0, h)


def _knurl_ring(name, r_out, r_in, z0, z1, n_th, n_rows, depth, col, fillet=0.24, subdiv=3):
    """Solid ring: isometric diamond cells wrapping outer wall + top annulus.

    Crossed-cut lattice (u+v, u-v), not a bump map. Peaks are filleted so
    highlights read as points rather than ribbons.
    """
    n_th = max(16, int(n_th))
    subdiv = max(2, int(subdiv))
    wall_len = max(1e-6, float(z1 - z0))
    top_len = max(1e-6, float(r_out - r_in))
    total = wall_len + top_len
    r_mid = 0.5 * (r_out + r_in)
    pitch = 2.0 * math.pi * r_mid / n_th
    if int(n_rows) <= 0:
        n_dia_v = max(3, int(round(total / pitch)))
    else:
        n_dia_v = max(3, int(n_rows))
    n_i = n_th * subdiv
    n_j = n_dia_v * subdiv
    nrm_blend = 0.012 * max(r_out, 0.2)

    def profile(j):
        dist = (j / n_j) * total
        if dist <= wall_len:
            z = z0 + dist
            r_base = r_out
            nx, ny, nz = 1.0, 0.0, 0.0  # radial; rotated by theta later
            on_wall = True
        else:
            inward = dist - wall_len
            t = min(1.0, inward / top_len)
            # tiny rounded corner so wall→top is not a razor edge
            z = z1
            r_base = r_out - inward
            nx, ny, nz = 0.0, 0.0, 1.0
            on_wall = False
            if inward < nrm_blend:
                w = 0.5 * (1.0 - math.cos(math.pi * inward / nrm_blend))
                nx = 1.0 - w
                nz = w
                mag = math.hypot(nx, nz) or 1.0
                nx, nz = nx / mag, nz / mag
        return r_base, z, nx, nz, on_wall

    verts = []
    # Outer knurl surface (wall then top). Displacement follows the
    # blended wall/top normal so the rim corner stays a continuous lattice.
    for j in range(n_j + 1):
        r_base, z, nx, nz, _on_wall = profile(j)
        v = j / subdiv
        for i in range(n_i):
            th = 2.0 * math.pi * i / n_i
            u = i / subdiv
            h = _diamond_h(u, v, fillet)
            disp = depth * (h - 0.22)
            cth, sth = math.cos(th), math.sin(th)
            verts.append(
                (
                    r_base * cth + disp * nx * cth,
                    r_base * sth + disp * nx * sth,
                    z + disp * nz,
                )
            )

    surf_count = (n_j + 1) * n_i

    # Smooth inner bore + bottom ring
    inner0 = surf_count
    for j in range(n_j + 1):
        t = j / n_j
        z = z0 + t * (z1 - z0)
        for i in range(n_i):
            th = 2.0 * math.pi * i / n_i
            verts.append((r_in * math.cos(th), r_in * math.sin(th), z))

    def vs(j, i):
        return j * n_i + (i % n_i)

    def vi(j, i):
        return inner0 + j * n_i + (i % n_i)

    faces = []
    for j in range(n_j):
        for i in range(n_i):
            faces.append((vs(j, i), vs(j, i + 1), vs(j + 1, i + 1), vs(j + 1, i)))
            faces.append((vi(j, i), vi(j + 1, i), vi(j + 1, i + 1), vi(j, i + 1)))
    # Top inner stitch (end of knurl top → inner bore top)
    for i in range(n_i):
        faces.append((vs(n_j, i), vi(n_j, i), vi(n_j, i + 1), vs(n_j, i + 1)))
    # Bottom cap
    for i in range(n_i):
        faces.append((vs(0, i), vs(0, i + 1), vi(0, i + 1), vi(0, i)))
    return _mesh(name, verts, faces, col, "flat")


def _well_floor(name, r_out, r_in, z, thick, segs, col):
    return _annulus(name, r_out, r_in, z, z + thick, segs, col, "smooth")


def _radial_uv(obj):
    mesh = obj.data
    uv_layer = mesh.uv_layers.get("UVMap") or mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v = mesh.vertices[mesh.loops[li].vertex_index].co
            th = math.atan2(v.y, v.x)
            r = math.hypot(v.x, v.y)
            uv_layer.data[li].uv = ((th / (2.0 * math.pi)) + 0.5, r)


def _ground(col, p):
    segs = 64
    r = 1.05
    z = -0.001
    verts = [(0.0, 0.0, z)]
    for i in range(segs):
        th = 2.0 * math.pi * i / segs
        verts.append((r * math.cos(th), r * math.sin(th), z))
    faces = []
    for i in range(segs):
        faces.append((0, i + 1, 1 + ((i + 1) % segs)))
    return _mesh("DIAL_GROUND", verts, faces, col, "smooth")


def build(p=None):
    p = dict(PARAMS if p is None else p)
    _reset_scene()
    col = _ensure_collection("DIAL_MODEL")
    segs = int(p["mesh_circle_segments"])

    _knurl_ring(
        "DIAL_HOUSING",
        p["housing_outer"],
        p["housing_knurl_inner"],
        p["housing_z0"],
        p["housing_z1"],
        int(p["housing_knurl_teeth"]),
        int(p["housing_knurl_rows"]),
        p["housing_knurl_depth"],
        col,
        fillet=p.get("housing_knurl_fillet", 0.24),
        subdiv=int(p.get("housing_knurl_subdiv", 3)),
    )
    _turned_lip(
        "DIAL_BEZEL",
        p["bezel_center"],
        p["bezel_minor"],
        p["bezel_z"],
        segs,
        int(p.get("bezel_profile_segs", 24)),
        col,
        z_scale=p.get("bezel_z_scale", 1.0),
    )
    _annulus(
        "DIAL_PLATE",
        p["plate_outer"],
        p["plate_inner"],
        p["plate_z"],
        p["plate_z"] + p["plate_height"],
        segs,
        col,
        "smooth",
    )
    _well_floor(
        "DIAL_WELL_FLOOR",
        p["well_floor_outer"],
        p["gap_inner"],
        p["well_floor_z"],
        0.006,
        segs,
        col,
    )
    _annulus(
        "DIAL_WELL_WALL",
        p["plate_outer"] + 0.001,
        p["plate_outer"] - 0.004,
        p["well_floor_z"],
        p["plate_z"],
        segs,
        col,
        "smooth",
    )
    _annulus(
        "DIAL_WELL_INNER",
        p["plate_inner"] + 0.001,
        p["plate_inner"] - 0.005,
        p["well_floor_z"],
        p["plate_z"],
        segs,
        col,
        "smooth",
    )
    _knurl_ring(
        "DIAL_ROTATOR_KNURL",
        p["rot_knurl_outer"],
        p["rot_knurl_inner"],
        p["rot_z0"],
        p["rot_z1"],
        int(p["rot_knurl_teeth"]),
        int(p["rot_knurl_rows"]),
        p["rot_knurl_depth"],
        col,
        fillet=p.get("rot_knurl_fillet", 0.24),
        subdiv=int(p.get("rot_knurl_subdiv", 3)),
    )
    _turned_lip(
        "DIAL_CHAMFER",
        p["chamfer_center"],
        p["chamfer_minor"],
        p["chamfer_z"],
        segs,
        int(p.get("chamfer_profile_segs", 20)),
        col,
        z_scale=p.get("chamfer_z_scale", 1.0),
    )
    _hub(
        "DIAL_HUB",
        p["hub_radius"],
        p["rot_z0"],
        p["hub_z"],
        segs,
        col,
        p["hub_dome"],
        int(p.get("hub_rings", 96)),
        int(p.get("hub_radial_hair_n", 0)),
        p.get("hub_radial_hair_amp", 0.0),
    )
    _ground(col, p)

    for obj in col.objects:
        if obj.name.startswith("DIAL_"):
            _radial_uv(obj)
            obj.location = (0.0, 0.0, 0.0)

    return col


def save_blend(path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path)


def main(argv=None):
    argv = list(argv or [])
    out = os.path.join(_HERE, "pockt_classic_dial.blend")
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
    build()
    from materials import assign_all
    from scene import setup_scene

    assign_all()
    setup_scene()
    save_blend(out)
    print("[pockt-dial] wrote", out)


if __name__ == "__main__":
    extra = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    main(extra)
