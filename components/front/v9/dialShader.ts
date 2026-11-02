/**
 * The dial's live hardware, one GPU pass over the whole faceplate:
 *  - the knurled ring: 60 machined teeth with rounded inner ends and narrow bevels, shaded per pixel
 *    under a fixed studio light (the art's own light map), so the highlights stay put while the teeth turn;
 *  - the gauge: 60 lit slots on the art's channel, hot core, amber walls, light spilling onto the metal;
 *  - the tuner's green "in tune" wash;
 *  - a reflection of the studio softbox that slides over polished metal and the readout glass as the
 *    phone tilts.
 * Coordinates: canvas points. Art pixels are reached through the dial part's transform.
 */
export const DIAL_SKSL = `
uniform shader light;
uniform shader spec;
uniform float turn;
uniform float r0;
uniform float r1;
uniform float k;
uniform float ps;
uniform float2 pdst;
uniform float2 psrc;
uniform float2 kc;
uniform float2 dialc;
uniform float2 view;
uniform float specScale;
uniform float tiltx;
uniform float tilty;
uniform float lockGlow;
uniform float knurlOn;
uniform float lockFlash;
uniform float cells[60];
uniform float hues[60];

const float TAU = 6.2831853;
const float N = 60.0;

float toothH(float r, float th) {
  float ph = fract((th - turn) * N / TAU) - 0.5;
  float L = r * TAU / N;
  float x = ph * L;
  float hw = L * 0.31;
  float rin = 208.5;
  float d;
  if (r < rin + hw) { d = length(float2(x, r - (rin + hw))) - hw; }
  else { d = max(abs(x) - hw, r - 283.5); }
  float b = clamp(-d / 1.5, 0.0, 1.0);
  b = 1.0 - (1.0 - b) * (1.0 - b);
  float q = x / hw;
  // the outer end of each tooth is chamfered down into the groove under the bezel
  float ch = 0.4 + 0.6 * smoothstep(284.0, 275.0, r);
  return 7.0 * b * (1.0 - 0.08 * q * q) * ch;
}

float3 toothN(float r, float th) {
  float e = 0.3;
  float hr = (toothH(r + e, th) - toothH(r - e, th)) / (2.0 * e);
  float de = e / r;
  float hs = (toothH(r, th + de) - toothH(r, th - de)) / (2.0 * e);
  float2 rad = float2(cos(th), sin(th));
  float2 tg = float2(-sin(th), cos(th));
  float2 g = hr * rad + hs * tg;
  return normalize(float3(-g.x, -g.y, 1.0));
}

float shadeT(float3 n, float h, float r, float th, float3 L, int steps) {
  float dif = max(dot(n, L), 0.0);
  float sh = 1.0;
  if (steps > 0) {
    float2 p = float2(cos(th), sin(th)) * r;
    float2 ld = normalize(L.xy);
    float lz = L.z / length(L.xy);
    for (int i = 1; i <= 4; i++) {
      float t = float(i) * 2.0;
      float2 q = p + ld * t;
      float hq = toothH(length(q), atan(q.y, q.x));
      sh = min(sh, clamp(1.0 - (hq - (h + t * lz)) * 0.35, 0.0, 1.0));
    }
  }
  float ao = 0.2 + 0.8 * clamp(h / 7.0, 0.0, 1.0);
  return (0.16 + 1.05 * dif * sh) * ao;
}

float sdPill(float2 p, float hl, float hw) {
  p.y = max(abs(p.y) - (hl - hw), 0.0);
  return length(p) - hw;
}

half4 main(float2 px) {
  float2 m = (px / k - pdst) / ps + psrc;
  float3 col = float3(0.0);
  float a = 0.0;

  // ---- knurl ----------------------------------------------------------------------------
  float2 d = m - kc;
  float r = length(d);
  float ka = smoothstep(r0, r0 + 0.8, r) * (1.0 - smoothstep(288.0, 289.5, r)) * knurlOn;
  if (ka > 0.0) {
    float th = atan(d.y, d.x);
    if (th < 0.0) { th += TAU; }
    float3 lm = light.eval(float2(th / TAU * 4096.0, clamp((r - r0) / (r1 - r0), 0.0, 1.0) * 127.5)).rgb;
    float3 L = normalize(float3(-0.5 + tiltx * 0.35, -0.62 + tilty * 0.35, 0.62));
    float h = toothH(r, th);
    float3 n = toothN(r, th);
    float s = shadeT(n, h, r, th, L, 1);
    float avg = 0.0;
    for (int i = 0; i < 6; i++) {
      float t2 = th + (float(i) + 0.5) / 6.0 * TAU / N;
      float hh = toothH(r, t2);
      avg += shadeT(toothN(r, t2), hh, r, t2, L, 0);
    }
    avg = avg / 6.0 * 0.92;
    float3 V = float3(0.0, 0.0, 1.0);
    float3 Hh = normalize(L + V);
    float sp1 = pow(max(dot(n, Hh), 0.0), 90.0) * 2.2;
    float3 R = reflect(-V, n);
    float strip = exp(-pow((R.x * 0.8 + R.y * 0.6 - (tiltx * 0.3 + 0.12)) / 0.2, 2.0)) * smoothstep(0.0, 0.3, h / 7.0);
    float mx = max(lm.r, max(lm.g, lm.b));
    float3 lmn = lm / max(mx, 0.02);
    float3 c = lm * pow(s / max(avg, 0.05), 1.08) * 0.92 + (sp1 * 0.5 + strip * 0.14) * mix(float3(1.0, 0.92, 0.82), lmn, 0.5) * (0.35 + 1.4 * dot(lm, float3(0.33)));
    // bounce light from the lamp bay below: the lower teeth are never lost in black
    float3 L2 = normalize(float3(0.15, 0.85, 0.5));
    float bounce = max(dot(n, L2), 0.0) * smoothstep(0.0, 0.6, h / 7.0) * smoothstep(-0.2, 0.8, sin(th));
    c += float3(1.0, 0.72, 0.46) * bounce * 0.075;
    col = c * ka;
    a = ka;
  }

  // ---- gauge slots ------------------------------------------------------------------------
  float gr = length(d);
  if (gr > 300.0 && gr < 362.0) {
    float ang = degrees(atan(d.x, -d.y));
    float3 glow = float3(0.0);
    for (int i = 0; i < 60; i++) {
      float lv = cells[i];
      if (lv > 0.003) {
        float ii = float(i) + (i >= 30 ? 1.0 : 0.0);
        float cang = -120.0 + ii * 4.0;
        if (abs(ang - cang) < 9.0) {
          float ca = radians(cang);
          float2 dirr = float2(sin(ca), -cos(ca));
          float2 tng = float2(cos(ca), sin(ca));
          float2 q = float2(dot(d, tng), dot(d, dirr) - 330.5);
          float sd = sdPill(q, 12.6, 4.3);
          float inside = 1.0 - smoothstep(-0.6, 0.6, sd);
          float core = exp(-pow(q.x / 2.3, 2.0)) * (1.0 - 0.25 * smoothstep(-12.0, 12.0, -q.y));
          float hu = hues[i];
          float3 cEdge = mix(float3(1.0, 0.42, 0.08), float3(0.18, 1.0, 0.42), hu);
          float3 cCore = mix(float3(1.0, 0.86, 0.6), float3(0.8, 1.0, 0.85), hu);
          float3 emit = mix(cEdge, cCore, core) * (0.55 + 0.75 * core);
          glow += emit * inside * lv * 1.15;
          float outd = max(sd, 0.0);
          glow += cEdge * (exp(-outd / 3.2) * 0.42 + exp(-outd / 12.0) * 0.12) * (1.0 - inside) * lv;
        }
      }
    }
    col += glow * (1.0 - a);
  }

  // ---- the lower bezel and recess: a warm reflection of the lamp bay, so the dial sits in light
  {
    float down = smoothstep(0.05, 0.95, d.y / max(r, 1.0));
    float rim = exp(-pow((r - 300.5) / 6.5, 2.0)) * 0.10 + exp(-pow((r - 309.0) / 2.2, 2.0)) * 0.07;
    float floorLift = smoothstep(312.0, 330.0, r) * (1.0 - smoothstep(352.0, 372.0, r)) * 0.028;
    col += float3(1.0, 0.74, 0.48) * (rim + floorLift) * down * (1.0 - a);
  }

  // ---- tuner: in tune -----------------------------------------------------------------------
  if (lockGlow > 0.001) {
    float bez = exp(-pow((r - 330.0) / 22.0, 2.0)) * 0.35 + exp(-pow((r - 150.0) / 8.0, 2.0)) * 0.6;
    col += float3(0.2, 1.0, 0.45) * bez * lockGlow * (1.0 - a * 0.7);
    // the pocket: the index arrow itself lights up when the note is true
    float2 pp = d - float2(0.0, -331.0);
    float pk = exp(-dot(pp, pp) / (2.0 * 13.0 * 13.0)) * 1.1 + exp(-dot(pp, pp) / (2.0 * 34.0 * 34.0)) * 0.35;
    col += float3(0.35, 1.0, 0.55) * pk * lockGlow;
    // the moment it locks: a white-green burst at the arrow and a ring of light racing round the bezel
    float burst = exp(-dot(pp, pp) / (2.0 * 26.0 * 26.0)) * 2.2 + exp(-dot(pp, pp) / (2.0 * 70.0 * 70.0)) * 0.6;
    col += mix(float3(0.4, 1.0, 0.6), float3(1.0), 0.45) * burst * lockFlash;
    float ringR = 300.0;
    col += float3(0.3, 1.0, 0.5) * exp(-pow((r - ringR) / 5.0, 2.0)) * lockFlash * 0.9;
  }

  // ---- the readout glass ---------------------------------------------------------------------
  float2 gd = m - dialc;
  float grr = length(gd);
  if (grr < 146.0 && knurlOn > 0.5) {
    float2 hc = float2(-40.0 - tiltx * 50.0, -62.0 - tilty * 40.0);
    float arc = exp(-pow((length(gd - hc * 0.2) - 120.0) / 10.0, 2.0)) * smoothstep(40.0, -60.0, gd.y + gd.x * 0.5);
    float soft = exp(-dot(gd - hc, gd - hc) / (2.0 * 55.0 * 55.0));
    col += float3(1.0, 0.95, 0.9) * (arc * 0.07 + soft * 0.05) * smoothstep(146.0, 142.0, grr);
  }

  // ---- sheen across all polished metal --------------------------------------------------------
  float2 sp = px / view;
  float specv = spec.eval(px * specScale).r;
  float2 s2 = sp - float2(0.5);
  float band = exp(-pow((s2.x * 0.55 + s2.y * 0.85 - (tilty * 0.42 + tiltx * 0.2)) / 0.16, 2.0));
  float2 pc = s2 - float2(tiltx * 0.35, tilty * 0.3);
  float pool = exp(-dot(pc, pc) / 0.09);
  col += float3(1.0, 0.93, 0.84) * specv * (band * 0.22 + pool * 0.07) * (1.0 - a * 0.6);

  return half4(half3(col), half(a));
}
`;
