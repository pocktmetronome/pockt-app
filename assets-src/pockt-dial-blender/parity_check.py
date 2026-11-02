"""Offline IBL composite vs Round 4 / ortho Cycles.

Replays the ACTUAL fragment composite order and binding table from
PocktDialShader.metal / PocktDialView.FragTex. Also simulates the
Build 120 swap (slot 6 beauty ↔ slot 7 normal): that path MUST come
out lilac (encoded +Z normals shown as color).

Writes (next to Round 4 full_dial.png unless --out is set):
  parity_ibl.png              shader-approx composite
  parity_swap_lilac.png       beauty↔normal swap (regression must stay lilac)
  parity_side_by_side.png     [ortho Cycles | IBL approx | Round 4 master]
  parity_report.json
"""

from __future__ import annotations

import json
import math
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import bpy

BAKE_EXTENT = 1.08
VIEW_FILL = 0.48
RGBM_MAX = 16.0
RGBM_CLAMP = 2.0
ROT_OUTER = 0.628
HUB_R = 0.556
RING_INNER = 0.820
RING_OUTER = 1.020
STUDIO_KEY = (0.064, 0.834, 0.550)
PI = 3.141592653589793

# MUST match FragTex in PocktDialView.swift and [[texture(n)]] in the metal.
BINDING = {
    0: "faceMap",
    1: "knob_albedo",
    2: "knob_normal",
    3: "knob_ao",
    4: "knob_rough",
    5: "knob_aniso",
    6: "static_beauty",
    7: "static_normal",
    8: "env_rgbm",
}


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


def _load(path):
    if not os.path.exists(path):
        raise RuntimeError(f"missing {path}")
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = [0.0] * (w * h * 4)
    img.pixels.foreach_get(px)
    return w, h, px


def _sample(px, w, h, u, v, repeat_u=False):
    if repeat_u:
        u = u - math.floor(u)
    else:
        u = min(1.0, max(0.0, u))
    v = min(1.0, max(0.0, v))
    x = min(w - 1, max(0, int(u * (w - 1) + 0.5)))
    y = min(h - 1, max(0, int(v * (h - 1) + 0.5)))
    o = (y * w + x) * 4
    return px[o], px[o + 1], px[o + 2], px[o + 3]


def _decode_n(r, g, b):
    return (r * 2.0 - 1.0, g * 2.0 - 1.0, b * 2.0 - 1.0)


def _norm(v):
    l = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if l < 1e-8:
        return (0.0, 0.0, 1.0)
    return (v[0] / l, v[1] / l, v[2] / l)


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _sat(x):
    return min(1.0, max(0.0, x))


def _env_uv(d):
    d = _norm(d)
    lon = math.atan2(d[0], d[1])
    lat = math.asin(min(1.0, max(-1.0, d[2])))
    return lon / (2.0 * PI) + 0.5, 0.5 - lat / PI


def _rgbm(s):
    return (
        min(s[0] * s[3] * RGBM_MAX, RGBM_CLAMP),
        min(s[1] * s[3] * RGBM_MAX, RGBM_CLAMP),
        min(s[2] * s[3] * RGBM_MAX, RGBM_CLAMP),
    )


def _resize_box(px, w, h, nw, nh):
    out = [0.0] * (nw * nh * 4)
    for y in range(nh):
        for x in range(nw):
            u = (x + 0.5) / nw
            v = (y + 0.5) / nh
            s = _sample(px, w, h, u, v)
            o = (y * nw + x) * 4
            out[o : o + 4] = s
    return out


def _save(path, w, h, px):
    img = bpy.data.images.new("parity_out", width=w, height=h, alpha=True, float_buffer=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(px)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    print(f"[pockt-dial] wrote {path}")


def _mae(a, b, n):
    acc = 0.0
    for i in range(n):
        acc += abs(a[i] - b[i])
    return acc / max(n, 1)


def _region_mean(px, res, r0, r1):
    acc = [0.0, 0.0, 0.0]
    n = 0
    for y in range(res):
        for x in range(res):
            obj = (
                ((x + 0.5) / res - 0.5) * 2.0 * BAKE_EXTENT,
                ((y + 0.5) / res - 0.5) * 2.0 * BAKE_EXTENT,
            )
            r = math.hypot(obj[0], obj[1])
            if r0 <= r <= r1:
                o = (y * res + x) * 4
                acc[0] += px[o]
                acc[1] += px[o + 1]
                acc[2] += px[o + 2]
                n += 1
    if n == 0:
        return (0.0, 0.0, 0.0)
    return (acc[0] / n, acc[1] / n, acc[2] / n)


def _looks_lilac(rgb, tol=0.18):
    return abs(rgb[0] - 0.5) < tol and abs(rgb[1] - 0.5) < tol and rgb[2] > 0.72


def _composite(slots, env, maps_size, res, angle, Lspec):
    """Replay the Metal fragment: beauty-only static base, masked spec, steel F0 hub."""
    ca, sa = math.cos(angle), math.sin(angle)
    V = (0.0, 0.0, 1.0)
    Lbase = _norm(STUDIO_KEY)
    albedo, aw, ah = slots[1]
    knorm, nw, nh = slots[2]
    ao_px, aow, aoh = slots[3]
    rough_px, rww, rwh = slots[4]
    beauty, bw, bh = slots[6]
    snorm, sw, sh = slots[7]
    ew, eh, env_px = env
    out = [0.0] * (res * res * 4)
    env_peak = 0.0
    for y in range(res):
        for x in range(res):
            obj = (
                ((x + 0.5) / res - 0.5) * 2.0 * BAKE_EXTENT,
                ((y + 0.5) / res - 0.5) * 2.0 * BAKE_EXTENT,
            )
            rest = (ca * obj[0] + sa * obj[1], -sa * obj[0] + ca * obj[1])
            su = obj[0] / (2.0 * BAKE_EXTENT) + 0.5
            sv = obj[1] / (2.0 * BAKE_EXTENT) + 0.5
            ku = rest[0] / (2.0 * BAKE_EXTENT) + 0.5
            kv = rest[1] / (2.0 * BAKE_EXTENT) + 0.5
            r = math.hypot(obj[0], obj[1])
            o = (y * res + x) * 4

            sb = _sample(beauty, bw, bh, su, sv)
            col = [sb[0], sb[1], sb[2]]
            nEnc = _sample(snorm, sw, sh, su, sv)
            ring = 1.0 if RING_INNER <= r <= RING_OUTER else 0.0
            n_clear = 1.0 if min(nEnc[0], nEnc[1], nEnc[2]) >= 0.92 else 0.0
            n_valid = (1.0 - n_clear) * ring
            sN = _norm(_decode_n(nEnc[0], nEnc[1], nEnc[2]))
            sR = _norm(
                (
                    2.0 * _dot(sN, V) * sN[0] - V[0],
                    2.0 * _dot(sN, V) * sN[1] - V[1],
                    2.0 * _dot(sN, V) * sN[2] - V[2],
                )
            )
            eu, ev = _env_uv(sR)
            sEnv = _rgbm(_sample(env_px, ew, eh, eu, ev, True))
            sparkle = pow(_sat(_dot(sN, Lspec)), 20.0)
            col[0] += sEnv[0] * sparkle * n_valid * 0.10
            col[1] += sEnv[1] * sparkle * n_valid * 0.10
            col[2] += sEnv[2] * sparkle * n_valid * 0.10

            if r <= ROT_OUTER + 0.006:
                al = _sample(albedo, aw, ah, ku, kv)
                nm = _sample(knorm, nw, nh, ku, kv)
                om = _sample(ao_px, aow, aoh, ku, kv)
                rm = _sample(rough_px, rww, rwh, ku, kv)
                N = _decode_n(nm[0], nm[1], nm[2])
                N = (ca * N[0] - sa * N[1], sa * N[0] + ca * N[1], N[2])
                N = _norm(N)
                ao = om[0]
                rough = min(1.0, max(0.04, rm[0]))
                specF0 = (
                    min(max(al[0], 0.06), 0.22),
                    min(max(al[1], 0.06), 0.22),
                    min(max(al[2], 0.06), 0.22),
                )
                NoL = _sat(_dot(N, Lspec))
                NoBase = _sat(_dot(N, Lbase))
                R = _norm(
                    (
                        2.0 * _dot(N, V) * N[0] - V[0],
                        2.0 * _dot(N, V) * N[1] - V[1],
                        2.0 * _dot(N, V) * N[2] - V[2],
                    )
                )
                eu, ev = _env_uv(R)
                evs = _rgbm(_sample(env_px, ew, eh, eu, ev, True))
                env_peak = max(env_peak, evs[0], evs[1], evs[2])
                spec = pow(NoL, 18.0) * (1.0 - 0.55 * rough) * 0.70
                col = [
                    (al[0] * (0.82 + 0.18 * NoBase) + spec * specF0[0] + evs[0] * specF0[0] * (1.0 - rough) * 0.12) * ao,
                    (al[1] * (0.82 + 0.18 * NoBase) + spec * specF0[1] + evs[1] * specF0[1] * (1.0 - rough) * 0.12) * ao,
                    (al[2] * (0.82 + 0.18 * NoBase) + spec * specF0[2] + evs[2] * specF0[2] * (1.0 - rough) * 0.12) * ao,
                ]

            out[o], out[o + 1], out[o + 2], out[o + 3] = (
                _sat(col[0]),
                _sat(col[1]),
                _sat(col[2]),
                1.0,
            )
    return out, env_peak


def main(argv=None):
    argv = list(argv or _argv())
    baked = os.path.normpath(_arg(argv, "--baked", os.path.join(_HERE, "..", "pockt-dial-baked")))
    ref_dir = os.path.normpath(_arg(argv, "--ref", os.path.join(_HERE, "..", "pockt-dial-renders", "round4")))
    out_dir = os.path.normpath(_arg(argv, "--out", ref_dir))
    os.makedirs(out_dir, exist_ok=True)
    angle = float(_arg(argv, "--angle", 0.0))

    aw, ah, albedo = _load(os.path.join(baked, "knob_albedo.png"))
    nw, nh, normal = _load(os.path.join(baked, "knob_normal.png"))
    aow, aoh, ao_px = _load(os.path.join(baked, "knob_ao.png"))
    rww, rwh, rough_px = _load(os.path.join(baked, "knob_rough.png"))
    anw, anh, aniso = _load(os.path.join(baked, "knob_aniso.png"))
    bw, bh, beauty = _load(os.path.join(baked, "static_beauty.png"))
    sw, sh, snorm = _load(os.path.join(baked, "static_normal.png"))
    ew, eh, env = _load(os.path.join(baked, "env_rgbm.png"))
    cw, ch, cycles = _load(os.path.join(baked, "ortho_full_cycles.png"))
    rw, rh, master = _load(os.path.join(ref_dir, "full_dial.png"))

    res = min(aw, 512)
    L = _norm(STUDIO_KEY)

    slots = {
        1: (albedo, aw, ah),
        2: (normal, nw, nh),
        3: (ao_px, aow, aoh),
        4: (rough_px, rww, rwh),
        5: (aniso, anw, anh),
        6: (beauty, bw, bh),
        7: (snorm, sw, sh),
    }
    out, env_peak = _composite(slots, (ew, eh, env), None, res, angle, L)

    # Simulate the swapped-index bug: slot 6 gets the normal map.
    swapped = dict(slots)
    swapped[6] = slots[7]
    swap_out, _ = _composite(swapped, (ew, eh, env), None, res, angle, L)

    ibl_path = os.path.join(out_dir, "parity_ibl.png")
    _save(ibl_path, res, res, out)
    swap_path = os.path.join(out_dir, "parity_swap_lilac.png")
    _save(swap_path, res, res, swap_out)

    cycles_r = _resize_box(cycles, cw, ch, res, res)
    master_r = _resize_box(master, rw, rh, res, res)
    side_w = res * 3
    side = [0.0] * (side_w * res * 4)
    for y in range(res):
        for x in range(res):
            i = (y * res + x) * 4
            for tile, src in enumerate((cycles_r, out, master_r)):
                d = (y * side_w + tile * res + x) * 4
                side[d : d + 4] = src[i : i + 4]
    side_path = os.path.join(out_dir, "parity_side_by_side.png")
    _save(side_path, side_w, res, side)

    plate = _region_mean(out, res, 0.65, 0.81)
    knurl = _region_mean(out, res, 0.88, 0.98)
    hub = _region_mean(out, res, 0.00, 0.50)
    swap_static = _region_mean(swap_out, res, 0.90, 0.98)
    swap_plate = _region_mean(swap_out, res, 0.65, 0.81)
    layout_ok = plate[0] < 0.18 and knurl[0] > knurl[2] and knurl[0] > 0.12 and hub[0] < 0.35
    swap_lilac = _looks_lilac(swap_static) or (
        abs(swap_static[0] - swap_static[1]) < 0.12 and swap_static[2] > swap_static[0] + 0.08
    )

    report = {
        "ibl": ibl_path,
        "swap_lilac": swap_path,
        "side_by_side": side_path,
        "resolution": res,
        "binding_table": BINDING,
        "env_peak": env_peak,
        "region_means": {"plate": plate, "knurl": knurl, "hub": hub},
        "swap_region_means": {"plate": swap_plate, "knurl_ring": swap_static},
        "layout_dark_plate_bronze_knurl_dark_hub": layout_ok,
        "swap_reproduces_lilac": swap_lilac,
        "mean_abs_err_vs_ortho_cycles": _mae(out, cycles_r, res * res * 3),
        "mean_abs_err_vs_round4_perspective": _mae(out, master_r, res * res * 3),
        "notes": [
            "Binding 6=static_beauty, 7=static_normal. Swap 6↔7 is the lilac regression.",
            "Correct composite: beauty-only static base, spec masked to housing ring, steel F0 hub.",
            "Left: ortho Cycles. Middle: CPU IBL. Right: Round 4 full_dial.png.",
        ],
    }
    report_path = os.path.join(out_dir, "parity_report.json")
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print("[pockt-dial] parity", json.dumps(report, indent=2))
    if not layout_ok:
        raise SystemExit("parity layout failed: expected dark plate, bronze knurl, dark hub")
    if not swap_lilac:
        raise SystemExit("swap regression failed: beauty↔normal did not produce lilac")


if __name__ == "__main__":
    main()
