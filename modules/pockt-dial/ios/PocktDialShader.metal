#include <metal_stdlib>
using namespace metal;

struct Uniforms {
  float2 resolution;
  float angle;
  float press;
  float4 lightDir;
  float2 parallax;
  float time;
  float visualScale;
  float playing;
  float pad;
};

struct VertexOut {
  float4 position [[position]];
  float2 uv;
};

constant float PI = 3.14159265358979323846;

/// Must match assets-src/pockt-dial-blender/bake_maps.py / params.py
constant float BAKE_EXTENT = 1.08;
constant float VIEW_FILL = 0.48;
constant float ROT_OUTER = 0.628;
constant float HUB_R = 0.556;
/// q-space plate ring (object × VIEW_FILL). Atlas edge = plate outer.
constant float FACE_R_Q = 0.42048;
constant float HUB_R_Q = 0.31104;
constant float RGBM_MAX = 16.0;
constant float RGBM_CLAMP = 2.0;
constant float RING_INNER = 0.820;
constant float RING_OUTER = 1.020;
constant float3 STUDIO_KEY = float3(0.064, 0.834, 0.550);

float sdCircle(float2 p, float r) {
  return length(p) - r;
}

float coverage(float d) {
  return saturate(0.5 - d / max(fwidth(d), 1e-4));
}

/// Linear output for an sRGB drawable. Do not pow(1/2.2) here — .bgra8Unorm_srgb encodes once.
float3 writeLinear(float3 c) {
  return saturate(c);
}

float2 rotate2(float2 v, float ca, float sa) {
  return float2(ca * v.x - sa * v.y, sa * v.x + ca * v.y);
}

float2 bakeUV(float2 obj) {
  return obj / (2.0 * BAKE_EXTENT) + 0.5;
}

float3 decodeNormal(float3 enc) {
  return enc * 2.0 - 1.0;
}

float3 decodeRGBM(float4 s) {
  return min(s.rgb * s.a * RGBM_MAX, float3(RGBM_CLAMP));
}

float2 envUV(float3 d) {
  d = normalize(d);
  float lon = atan2(d.x, d.y);
  float lat = asin(clamp(d.z, -1.0, 1.0));
  return float2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

float D_GGX_aniso(float at, float ab, float ToH, float BoH, float NoH) {
  float a2 = at * ab;
  float3 v = float3(ab * ToH, at * BoH, a2 * NoH);
  float v2 = dot(v, v);
  float w2 = a2 / max(v2, 1e-8);
  return a2 * w2 * w2 / PI;
}

float V_SmithGGX_aniso(float at, float ab, float ToV, float BoV, float ToL, float BoL, float NoV, float NoL) {
  float lambdaV = NoL * length(float3(at * ToV, ab * BoV, NoV));
  float lambdaL = NoV * length(float3(at * ToL, ab * BoL, NoL));
  return 0.5 / max(lambdaV + lambdaL, 1e-5);
}

float3 F_Schlick(float3 f0, float VoH) {
  float f = pow(saturate(1.0 - VoH), 5.0);
  return f0 + (1.0 - f0) * f;
}

float3 shadeAniso(float3 N, float3 T, float3 B, float3 V, float3 L, float3 albedo, float3 f0, float at, float ab, float lightI) {
  float3 H = normalize(V + L);
  float NoL = saturate(dot(N, L));
  float NoV = max(dot(N, V), 1e-4);
  float NoH = saturate(dot(N, H));
  float VoH = saturate(dot(V, H));
  float ToH = dot(T, H);
  float BoH = dot(B, H);
  float ToV = dot(T, V);
  float BoV = dot(B, V);
  float ToL = dot(T, L);
  float BoL = dot(B, L);
  float D = D_GGX_aniso(at, ab, ToH, BoH, NoH);
  float Vis = V_SmithGGX_aniso(at, ab, ToV, BoV, ToL, BoL, NoV, NoL);
  float3 F = F_Schlick(f0, VoH);
  float3 spec = D * Vis * F;
  float3 diff = albedo / PI * (1.0 - F) * NoL;
  return (diff + spec * NoL) * lightI;
}

vertex VertexOut pockt_dial_vertex(uint vid [[vertex_id]]) {
  float2 pos[3] = { float2(-1.0, -1.0), float2(3.0, -1.0), float2(-1.0, 3.0) };
  VertexOut outv;
  outv.position = float4(pos[vid], 0.0, 1.0);
  outv.uv = pos[vid] * 0.5 + 0.5;
  return outv;
}

/// Binding table — MUST match FragTex in PocktDialView.swift 1:1.
/// 0 faceMap / 1 knobAlbedo / 2 knobNormal / 3 knobAo / 4 knobRough
/// 5 knobAniso / 6 staticBeauty / 7 staticNormal / 8 envMap
/// A swap of 6↔7 or 1↔2 displays encoded normals (lilac 0.5,0.5,1) as color.
fragment float4 pockt_dial_fragment(
  VertexOut in [[stage_in]],
  constant Uniforms &u [[buffer(0)]],
  texture2d<float> faceMap [[texture(0)]],
  texture2d<float> knobAlbedo [[texture(1)]],
  texture2d<float> knobNormal [[texture(2)]],
  texture2d<float> knobAo [[texture(3)]],
  texture2d<float> knobRough [[texture(4)]],
  texture2d<float> knobAniso [[texture(5)]],
  texture2d<float> staticBeauty [[texture(6)]],
  texture2d<float> staticNormal [[texture(7)]],
  texture2d<float> envMap [[texture(8)]],
  sampler faceSamp [[sampler(0)]],
  sampler envSamp [[sampler(1)]]
) {
  float2 res = u.resolution;
  float minSide = min(res.x, res.y);
  float2 p = (in.uv * res - 0.5 * res) / minSide;
  p.y = -p.y;

  float3 Lspec = normalize(u.lightDir.xyz);
  float3 Lbase = normalize(STUDIO_KEY);
  float3 V = float3(0.0, 0.0, 1.0);
  float3 gold = float3(0.72, 0.48, 0.16);

  float2 q = p - u.parallax;
  float s = max(u.visualScale, 0.001);
  q /= s;

  float ca = cos(u.angle);
  float sa = sin(u.angle);
  float2 qr = float2(ca * q.x - sa * q.y, sa * q.x + ca * q.y);

  float2 obj = q / VIEW_FILL;
  float2 restObj = rotate2(obj, ca, -sa);
  float2 kuv = bakeUV(restObj);
  float2 suv = bakeUV(obj);

  // Static: beauty is the ONLY base. Env/tilt are a masked spec tap, never a mix.
  float3 col = staticBeauty.sample(faceSamp, suv).rgb;
  float3 nEnc = staticNormal.sample(faceSamp, suv).xyz;
  float ring = coverage(sdCircle(obj, RING_OUTER)) * (1.0 - coverage(sdCircle(obj, RING_INNER)));
  float nClear = step(0.92, min(min(nEnc.r, nEnc.g), nEnc.b));
  float nValid = (1.0 - nClear) * ring;
  float3 sN = normalize(decodeNormal(nEnc));
  float3 sEnv = decodeRGBM(envMap.sample(envSamp, envUV(reflect(-V, sN))));
  float sparkle = pow(saturate(dot(sN, Lspec)), 20.0);
  col += sEnv * sparkle * nValid * 0.09;

  float3 albedo = knobAlbedo.sample(faceSamp, kuv).rgb;
  float3 Nobj = decodeNormal(knobNormal.sample(faceSamp, kuv).xyz);
  Nobj.xy = rotate2(Nobj.xy, ca, sa);
  float3 N = normalize(Nobj);
  if (dot(N, V) < 0.0) N = -N;

  float ao = knobAo.sample(faceSamp, kuv).r;
  float rough = clamp(knobRough.sample(faceSamp, kuv).r, 0.04, 1.0);
  float4 an = knobAniso.sample(faceSamp, kuv);
  float aniso = saturate(max(an.a, an.b));
  float3 T = decodeNormal(float3(an.rg, 0.5));
  T.xy = rotate2(T.xy, ca, sa);
  T.z = 0.0;
  if (length(T.xy) < 0.08) {
    float2 rad = obj / max(length(obj), 1e-4);
    T = float3(rad, 0.0);
  }
  T = normalize(T);
  float3 B = normalize(cross(N, T));
  T = normalize(cross(B, N));

  // Emit-baked albedo is already display-referred (~0.11), not Cycles 0.011.
  // Use it as metallic F0. Never scale it — that + unclamped RGBM is the slate hub.
  float3 specF0 = clamp(albedo, float3(0.06), float3(0.22));
  float at = rough * mix(1.0, 0.32, aniso);
  float ab = rough * mix(1.0, 1.85, aniso);
  float3 lit = albedo * ao * (0.82 + 0.18 * saturate(dot(N, Lbase)));
  lit += shadeAniso(N, T, B, V, Lspec, albedo, specF0, max(at, 0.045), max(ab, 0.045), 0.80) * ao;
  float3 envCol = decodeRGBM(envMap.sample(envSamp, envUV(reflect(-V, N))));
  float3 Fenv = F_Schlick(specF0, saturate(dot(N, V)));
  lit += envCol * specF0 * Fenv * (1.0 - rough) * 0.12 * ao;

  float inKnob = coverage(sdCircle(obj, ROT_OUTER + 0.003));
  float inHub = coverage(sdCircle(obj, HUB_R));
  col = mix(col, lit, inKnob);

  float2 atlasUV = qr / (2.0 * FACE_R_Q) + 0.5;
  atlasUV.y = 1.0 - atlasUV.y;
  float4 faceTex = faceMap.sample(faceSamp, atlasUV);
  float inFace = coverage(sdCircle(q, FACE_R_Q)) * (1.0 - coverage(sdCircle(q, HUB_R_Q)));
  col = mix(col, mix(col, faceTex.rgb, 0.92), inFace * faceTex.a);

  float py = -q.y;
  float hubQ = HUB_R * VIEW_FILL;
  float knobQ = ROT_OUTER * VIEW_FILL;
  float pointer = smoothstep(0.008, 0.002, abs(q.x)) * smoothstep(hubQ * 0.85, hubQ * 0.96, py) * smoothstep(knobQ * 1.005, knobQ * 0.92, py);
  float goldAmt = pointer * mix(0.62, 0.78, u.playing);
  col = mix(col, gold * (0.40 + 0.35 * saturate(dot(N, Lspec))), goldAmt);

  float rim = saturate(1.0 - abs(sdCircle(q, VIEW_FILL)) * 70.0) * coverage(sdCircle(q, VIEW_FILL));
  col += rim * gold * 0.04;

  col += float3(u.time) * 0.0;
  col += float3(u.pad) * 0.0;
  col += float3(inHub) * 0.0;
  return float4(writeLinear(col), 1.0);
}
