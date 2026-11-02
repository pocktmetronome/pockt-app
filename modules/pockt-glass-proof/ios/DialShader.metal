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
};

struct VertexOut {
  float4 position [[position]];
  float2 uv;
};

constant float PI = 3.14159265358979323846;

float sdCircle(float2 p, float r) {
  return length(p) - r;
}

float coverage(float d) {
  return saturate(0.5 - d / max(fwidth(d), 1e-4));
}

float3 linearToDisplay(float3 c) {
  return min(c, float3(16.0));
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

vertex VertexOut dial_vertex(uint vid [[vertex_id]]) {
  float2 pos[3] = { float2(-1.0, -1.0), float2(3.0, -1.0), float2(-1.0, 3.0) };
  VertexOut outv;
  outv.position = float4(pos[vid], 0.0, 1.0);
  outv.uv = pos[vid] * 0.5 + 0.5;
  return outv;
}

fragment float4 dial_fragment(VertexOut in [[stage_in]], constant Uniforms &u [[buffer(0)]]) {
  float2 res = u.resolution;
  float minSide = min(res.x, res.y);
  float2 p = (in.uv * res - 0.5 * res) / minSide;
  p.y = -p.y;

  float3 col = float3(0.011, 0.011, 0.013);
  float vig = smoothstep(0.22, 1.08, length(p * float2(1.0, 0.94)));
  col *= 1.0 - 0.38 * vig;

  const float wellOuter = 0.405;
  const float wellFloor = 0.348;
  const float wellChamfer = 0.018;
  const float dialWall = 0.322;
  const float knurlInner = 0.294;
  const float faceR = 0.276;

  float wellLip = wellOuter;
  float wellInner = wellFloor;
  float dWell = sdCircle(p, wellLip);
  float inWell = coverage(dWell);
  float dFloor = sdCircle(p, wellInner);
  float inFloor = coverage(dFloor);
  float inWall = inWell * (1.0 - inFloor);

  float3 Lkey = normalize(u.lightDir.xyz);
  float3 Lfill = normalize(float3(0.25, 0.18, 0.95));
  float3 V = float3(0.0, 0.0, 1.0);
  float3 f0 = float3(0.91, 0.92, 0.92);

  float2 wallQ = p;
  float wallR = length(wallQ);
  float3 Nwall = normalize(float3(-wallQ / max(wallR, 1e-4), 0.22));
  float wallShade = saturate(dot(Nwall, Lkey) * 0.55 + 0.12);
  float3 wellCol = float3(0.028, 0.027, 0.026) * (0.35 + 0.65 * wallShade);
  float lipT = saturate((wallR - (wellLip - wellChamfer)) / wellChamfer);
  float3 Nlip = normalize(mix(float3(0.0, 0.0, 1.0), Nwall, lipT));
  float lipFres = pow(1.0 - saturate(Nlip.z), 2.6);
  wellCol += inWell * (1.0 - inFloor) * lipFres * float3(0.22, 0.21, 0.20);
  float ao = exp(-max(wellInner - wallR, 0.0) * 22.0);
  float3 floorCol = float3(0.018, 0.017, 0.016) * mix(1.0, 0.46, ao);
  float3 Nfloor = float3(0.0, 0.0, 1.0);
  floorCol *= 0.72 + 0.28 * saturate(dot(Nfloor, Lkey));
  col = mix(col, wellCol, inWall);
  col = mix(col, floorCol, inFloor);

  float2 q = p - u.parallax;
  float s = max(u.visualScale, 0.001);
  q /= s;
  float r = length(q);
  float ang = atan2(q.y, q.x) - u.angle;

  float2 shadowP = p;
  shadowP -= u.parallax * 0.35;
  shadowP -= Lkey.xy * mix(0.018, 0.008, u.press);
  shadowP.y += 0.006;
  float shR = mix(0.072, 0.048, u.press);
  float contact = exp(-dot(shadowP, shadowP) / max(shR, 1e-4));
  contact *= mix(0.62, 0.82, u.press);
  float dialMaskEarly = coverage(sdCircle(q, dialWall));
  col *= 1.0 - contact * inFloor * (1.0 - dialMaskEarly);

  float inDial = coverage(sdCircle(q, dialWall));
  float inKnurl = coverage(sdCircle(q, dialWall)) * (1.0 - coverage(sdCircle(q, knurlInner)));
  float inChamfer = coverage(sdCircle(q, knurlInner)) * (1.0 - coverage(sdCircle(q, faceR)));
  float inFace = coverage(sdCircle(q, faceR));

  float nr = saturate(r / max(faceR, 1e-4));
  float z = sqrt(max(1e-5, 1.0 - nr * nr));
  float3 Nface = normalize(float3(q / max(faceR, 1e-4) * 0.22, mix(1.0, z, 0.40)));
  float brush = sin(r * 168.0) + 0.35 * sin(r * 412.0 + ang * 2.0);
  float dh = 0.012 * 168.0 * cos(r * 168.0);
  float2 radial = q / max(r, 1e-4);
  Nface = normalize(Nface + float3(-radial * dh * 0.004, 0.0));

  float3 Nside = normalize(float3(q, 0.10));
  float teeth = ang * 80.0;
  float groove = sin(teeth);
  float3 Nknurl = Nside;
  Nknurl.xy += normalize(q + float2(1e-5, 1e-5)) * (cos(teeth) * 0.34);
  Nknurl = normalize(Nknurl);

  float chamferT = saturate((r - faceR) / max(knurlInner - faceR, 1e-4));
  float3 Nchamfer = normalize(mix(Nface, Nside, chamferT));

  float3 N = Nface;
  N = mix(N, Nchamfer, inChamfer);
  N = mix(N, Nknurl, inKnurl);
  N = normalize(N);

  float3 T = normalize(float3(radial, 0.0));
  if (r < 1e-3) T = float3(1.0, 0.0, 0.0);
  float3 B = normalize(cross(N, T));
  T = normalize(cross(B, N));

  float3 albedo = float3(0.42, 0.43, 0.445);
  albedo *= mix(1.0, 1.0 + 0.016 * brush, inFace);
  albedo *= mix(1.0, mix(0.70, 1.16, 0.5 + 0.5 * groove), inKnurl);
  float inSide = coverage(sdCircle(q, dialWall)) * (1.0 - coverage(sdCircle(q, mix(knurlInner, dialWall, 0.78))));
  albedo *= mix(1.0, 0.62, inSide);

  float at = mix(0.055, 0.16, inKnurl);
  float ab = mix(0.42, 0.22, inKnurl);

  float3 lit = shadeAniso(N, T, B, V, Lkey, albedo, f0, at, ab, 1.35);
  lit += shadeAniso(N, T, B, V, Lfill, albedo, f0, at * 1.4, ab, 0.22);
  float3 env = mix(float3(0.05, 0.055, 0.07), float3(0.38, 0.36, 0.33), pow(saturate(N.y * 0.5 + 0.5), 1.35));
  lit += env * albedo * 0.16;
  lit += float3(0.035, 0.038, 0.048) * albedo;
  float fres = pow(1.0 - saturate(N.z), 2.8);
  lit += fres * f0 * mix(0.08, 0.28, inChamfer);

  float2 pipPos = float2(sin(u.angle), cos(u.angle)) * (faceR * 0.72);
  float2 pq = q - pipPos;
  float pipR = 0.016;
  float pipD = length(pq);
  float inPip = 1.0 - smoothstep(pipR - fwidth(pipD), pipR + fwidth(pipD), pipD);
  float3 Npip = normalize(float3(pq / max(pipR, 1e-4) * 0.85, 0.35));
  float3 pipCol = shadeAniso(Npip, T, B, V, Lkey, float3(0.12, 0.11, 0.09), f0, 0.12, 0.18, 0.9);
  pipCol *= 0.55;
  lit = mix(lit, pipCol, inPip);

  float hub = 1.0 - smoothstep(faceR * 0.16, faceR * 0.11, r);
  float3 Nhub = normalize(float3(q / max(faceR * 0.14, 1e-4) * 0.15, 1.0));
  float3 hubCol = float3(0.07, 0.068, 0.064) * (0.55 + 0.45 * saturate(dot(Nhub, Lkey)));
  lit = mix(lit, hubCol, hub * 0.9);

  col = mix(col, lit, inDial);

  float glass = pow(saturate(1.0 - in.uv.y), 1.8) * 0.045;
  col += glass * float3(0.82, 0.86, 0.95);
  float glassEdge = saturate(1.0 - abs(dWell) * 90.0) * inWell * 0.07;
  col += glassEdge * float3(0.55, 0.56, 0.58);
  col += float3(u.time) * 0.0;

  return float4(linearToDisplay(col), 1.0);
}
