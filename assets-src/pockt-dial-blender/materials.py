"""PBR materials for the Classic Dial. Principled BSDF only.

Restrained: no fingerprints, no cloudy noise, no mottling.
Hub is dark spun gunmetal — radial hairline grain + anisotropic stretch
along the brush (conical specular sweep). No concentric CNC.
"""

from __future__ import annotations

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import bpy

from params import PARAMS


def _principled(name, **kwargs):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    def set_in(key, value):
        sock = bsdf.inputs.get(key)
        if sock is None:
            print("[pockt-dial] missing socket", name, key, "have", [i.name for i in bsdf.inputs])
            return
        sock.default_value = value

    base = kwargs.pop("base", (0.04, 0.04, 0.04, 1.0))
    if len(base) == 3:
        base = (base[0], base[1], base[2], 1.0)
    set_in("Base Color", base)
    set_in("Metallic", kwargs.pop("metallic", 1.0))
    set_in("Roughness", kwargs.pop("roughness", 0.25))
    set_in("Anisotropic", kwargs.pop("anisotropic", 0.0))
    set_in("Anisotropic Rotation", kwargs.pop("aniso_rot", 0.0))
    set_in("IOR", kwargs.pop("ior", 2.5))
    set_in("Specular IOR Level", kwargs.pop("specular", 0.5))
    set_in("Coat Weight", kwargs.pop("coat", 0.0))
    set_in("Coat Roughness", kwargs.pop("coat_rough", 0.2))

    if kwargs.pop("radial_tangent", False):
        tan = nt.nodes.new("ShaderNodeTangent")
        tan.location = (-280, -80)
        tan.direction_type = "RADIAL"
        tan.axis = "Z"
        nt.links.new(tan.outputs["Tangent"], bsdf.inputs["Tangent"])

    for leftover in kwargs:
        raise KeyError(f"unknown material kwarg {leftover}")
    return mat, bsdf, nt


def _sock(node, *names):
    for n in names:
        s = node.outputs.get(n)
        if s is not None:
            return s
    return node.outputs[0]


def _add_spun_grain(nt, bsdf, p):
    """Radial hairline roughness for spun/circular-brushed metal.

    Radial tangent + rotation 0 stretches the specular along the brush
    (conical / diagonal sweep). Concentric lathe modulation is gone.
    """
    radial_n = float(p.get("hub_shader_radial_n", 340.0))

    tex = nt.nodes.new("ShaderNodeTexCoord")
    tex.location = (-980, -220)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-800, -220)
    nt.links.new(tex.outputs["Object"], sep.inputs["Vector"])

    atan2 = nt.nodes.new("ShaderNodeMath")
    atan2.operation = "ARCTAN2"
    atan2.location = (-620, -40)
    nt.links.new(sep.outputs["Y"], atan2.inputs[0])
    nt.links.new(sep.outputs["X"], atan2.inputs[1])

    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    comb.location = (-620, -280)
    nt.links.new(sep.outputs["X"], comb.inputs["X"])
    nt.links.new(sep.outputs["Y"], comb.inputs["Y"])
    length = nt.nodes.new("ShaderNodeVectorMath")
    length.operation = "LENGTH"
    length.location = (-440, -280)
    nt.links.new(comb.outputs["Vector"], length.inputs[0])

    mul_th = nt.nodes.new("ShaderNodeMath")
    mul_th.operation = "MULTIPLY"
    mul_th.location = (-440, -40)
    mul_th.inputs[1].default_value = radial_n
    nt.links.new(atan2.outputs["Value"], mul_th.inputs[0])
    sin_th = nt.nodes.new("ShaderNodeMath")
    sin_th.operation = "SINE"
    sin_th.location = (-260, -40)
    nt.links.new(mul_th.outputs["Value"], sin_th.inputs[0])

    amp_th = nt.nodes.new("ShaderNodeMath")
    amp_th.operation = "MULTIPLY"
    amp_th.location = (-80, -40)
    amp_th.inputs[1].default_value = 0.052
    nt.links.new(sin_th.outputs["Value"], amp_th.inputs[0])

    add_mid = nt.nodes.new("ShaderNodeMath")
    add_mid.operation = "ADD"
    add_mid.location = (100, -40)
    add_mid.inputs[1].default_value = 0.36
    nt.links.new(amp_th.outputs["Value"], add_mid.inputs[0])

    clamp = nt.nodes.new("ShaderNodeClamp")
    clamp.location = (280, -40)
    clamp.inputs["Min"].default_value = 0.24
    clamp.inputs["Max"].default_value = 0.50
    nt.links.new(add_mid.outputs["Value"], clamp.inputs["Value"])
    rough = bsdf.inputs.get("Roughness")
    if rough is not None:
        nt.links.new(clamp.outputs["Result"], rough)

    # Keep a tiny center fade so the r=0 tangent singularity is not a chrome pip,
    # but leave anisotropy on almost the whole disc for the conical sweep.
    fade = nt.nodes.new("ShaderNodeMapRange")
    fade.location = (100, -280)
    fade.inputs["From Min"].default_value = 0.012
    fade.inputs["From Max"].default_value = 0.045
    fade.inputs["To Min"].default_value = 0.0
    fade.inputs["To Max"].default_value = 0.68
    fade.clamp = True
    nt.links.new(_sock(length, "Value"), fade.inputs["Value"])
    aniso = bsdf.inputs.get("Anisotropic")
    if aniso is not None:
        nt.links.new(fade.outputs["Result"], aniso)


def _add_plate_ao(nt, bsdf):
    """Slight AO grading near the sidewall / bezel — Cycles AO, not a comp."""
    try:
        ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    except Exception as exc:
        print("[pockt-dial] AO node unavailable", exc)
        return
    ao.location = (-400, 240)
    ao.samples = 8
    dist = ao.inputs.get("Distance")
    if dist is not None:
        dist.default_value = 0.055
    ao_out = _sock(ao, "AO", "Color")
    grade = nt.nodes.new("ShaderNodeMapRange")
    grade.location = (-200, 240)
    grade.inputs["From Min"].default_value = 0.0
    grade.inputs["From Max"].default_value = 1.0
    grade.inputs["To Min"].default_value = 0.16
    grade.inputs["To Max"].default_value = 1.0
    grade.clamp = True
    nt.links.new(ao_out, grade.inputs["Value"])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    comb.location = (0, 200)
    nt.links.new(grade.outputs["Result"], comb.inputs["X"])
    nt.links.new(grade.outputs["Result"], comb.inputs["Y"])
    nt.links.new(grade.outputs["Result"], comb.inputs["Z"])
    mix = None
    for ntype in ("ShaderNodeMixRGB", "ShaderNodeMix"):
        try:
            mix = nt.nodes.new(ntype)
            break
        except RuntimeError:
            continue
    if mix is None:
        return
    mix.location = (200, 160)
    if hasattr(mix, "data_type"):
        mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    fac = mix.inputs.get("Fac") or mix.inputs.get("Factor")
    if fac is not None:
        fac.default_value = 0.80
    base = bsdf.inputs.get("Base Color")
    if base is None:
        return
    c1 = mix.inputs.get("Color1") or mix.inputs.get("A")
    c2 = mix.inputs.get("Color2") or mix.inputs.get("B")
    if c1 is not None and getattr(c1, "type", "") == "RGBA":
        c1.default_value = tuple(base.default_value)
    if c2 is not None:
        nt.links.new(comb.outputs["Vector"], c2)
    result = mix.outputs.get("Color") or mix.outputs.get("Result") or mix.outputs[0]
    nt.links.new(result, base)


def assign_all():
    p = PARAMS
    # Muted steel-bronze — not brass-gold. Housing knurl geo is unchanged.
    housing, _, _ = _principled(
        "MAT_HOUSING",
        base=(0.040, 0.035, 0.029),
        metallic=1.0,
        roughness=0.32,
        anisotropic=0.08,
        radial_tangent=True,
    )
    bezel, _, _ = _principled(
        "MAT_BEZEL",
        base=(0.22, 0.155, 0.10),
        metallic=1.0,
        roughness=0.11,
        anisotropic=0.62,
        aniso_rot=0.25,
        coat=0.12,
        coat_rough=0.09,
        radial_tangent=True,
    )
    plate, plate_bsdf, plate_nt = _principled(
        "MAT_PLATE",
        base=(0.00035, 0.00032, 0.00028),
        metallic=0.0,
        roughness=0.90,
        specular=0.06,
        ior=1.45,
    )
    _add_plate_ao(plate_nt, plate_bsdf)
    well, _, _ = _principled(
        "MAT_WELL",
        base=(0.0005, 0.00045, 0.0004),
        metallic=0.0,
        roughness=0.90,
        specular=0.04,
        ior=1.45,
    )
    well_wall, _, _ = _principled(
        "MAT_WELL_WALL",
        base=(0.0008, 0.0007, 0.0006),
        metallic=0.0,
        roughness=0.85,
        specular=0.06,
        ior=1.45,
    )
    rot, _, _ = _principled(
        "MAT_ROT_KNURL",
        base=(0.042, 0.037, 0.031),
        metallic=1.0,
        roughness=0.30,
        anisotropic=0.10,
        radial_tangent=True,
    )
    chamfer, _, _ = _principled(
        "MAT_CHAMFER",
        base=(0.23, 0.16, 0.10),
        metallic=1.0,
        roughness=0.11,
        anisotropic=0.60,
        aniso_rot=0.25,
        coat=0.10,
        coat_rough=0.09,
        radial_tangent=True,
    )
    hub, hub_bsdf, hub_nt = _principled(
        "MAT_HUB",
        base=(0.011, 0.012, 0.014),
        metallic=1.0,
        roughness=0.36,
        anisotropic=0.68,
        aniso_rot=0.0,
        radial_tangent=True,
    )
    _add_spun_grain(hub_nt, hub_bsdf, p)
    ground, _, _ = _principled(
        "MAT_GROUND",
        base=(0.00035, 0.00035, 0.00035),
        metallic=0.0,
        roughness=1.0,
        specular=0.0,
    )
    mats = {
        "DIAL_HOUSING": housing,
        "DIAL_BEZEL": bezel,
        "DIAL_PLATE": plate,
        "DIAL_WELL_FLOOR": well,
        "DIAL_WELL_WALL": well_wall,
        "DIAL_WELL_INNER": well_wall,
        "DIAL_ROTATOR_KNURL": rot,
        "DIAL_CHAMFER": chamfer,
        "DIAL_HUB": hub,
        "DIAL_GROUND": ground,
    }
    for obj in bpy.data.objects:
        mat = mats.get(obj.name)
        if mat is None:
            continue
        if obj.data and hasattr(obj.data, "materials"):
            obj.data.materials.clear()
            obj.data.materials.append(mat)
            obj.active_material = mat
        if obj.name == "DIAL_GROUND":
            obj.is_shadow_catcher = False
        if obj.name in (
            "DIAL_HOUSING",
            "DIAL_BEZEL",
            "DIAL_ROTATOR_KNURL",
            "DIAL_CHAMFER",
            "DIAL_HUB",
        ):
            obj.visible_diffuse = False
        print("[pockt-dial] material", obj.name, "->", mat.name)


if __name__ == "__main__":
    assign_all()
    print("[pockt-dial] materials assigned")
