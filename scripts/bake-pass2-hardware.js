'use strict';

/**
 * Photographic hardware plates for dial, pendulum, and Play.
 * Live tempo, phase, and musical state stay out of these images.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const dialOut = path.join(root, 'assets', 'dial-hardware');
const pendOut = path.join(root, 'assets', 'pendulum-hardware');
const proof = path.join(root, 'artifacts', 'device-recovery-pass2');

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  return noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function mix(a, b, t) {
  return a + (b - a) * t;
}
function smooth(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function fract(v) {
  return v - Math.floor(v);
}
function png(width, height) {
  return new PNG({ width, height });
}
function put(image, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (image.width * y + x) << 2;
  image.data[i] = clamp(r, 0, 255);
  image.data[i + 1] = clamp(g, 0, 255);
  image.data[i + 2] = clamp(b, 0, 255);
  image.data[i + 3] = clamp(a, 0, 255);
}
function save(image, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
  console.log(path.relative(root, file), image.width, image.height);
}

const LIGHT = { x: -0.46, y: -0.58, z: 0.67 };
function shade(nx, ny, nz, power) {
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const llen = Math.hypot(LIGHT.x, LIGHT.y, LIGHT.z);
  const lx = LIGHT.x / llen;
  const ly = LIGHT.y / llen;
  const lz = LIGHT.z / llen;
  const nd = clamp(nx * lx + ny * ly + nz * lz, 0, 1);
  const hx = lx;
  const hy = ly;
  const hz = lz + 1;
  const hlen = Math.hypot(hx, hy, hz);
  const spec = Math.pow(clamp(nx * (hx / hlen) + ny * (hy / hlen) + nz * (hz / hlen), 0, 1), power);
  return { nd, spec };
}

function knurl(ang, band) {
  const u = ((ang + Math.PI) / (Math.PI * 2)) * 220;
  const v = band * 9;
  const d1 = Math.abs(fract(u + v) - 0.5);
  const d2 = Math.abs(fract(u * 0.97 - v) - 0.5);
  const h = clamp(Math.min(d1, d2) * 4.4, 0, 1);
  return h * h * (3 - 2 * h);
}

function brass(nd, spec, grain) {
  const valley = [58, 40, 24];
  const mid = [138, 108, 72];
  const high = [214, 188, 146];
  const t = clamp(0.22 + nd * 0.62, 0, 1);
  let r = mix(valley[0], mid[0], t);
  let g = mix(valley[1], mid[1], t);
  let b = mix(valley[2], mid[2], t);
  const crest = spec * 0.55;
  r = mix(r, high[0], crest);
  g = mix(g, high[1], crest);
  b = mix(b, high[2], crest);
  const tone = 0.9 + (grain - 0.5) * 0.06;
  return [r * tone, g * tone, b * tone];
}

function steel(nd, spec, grain, cool) {
  const base = 42 + nd * 78 + spec * 90;
  const g = (grain - 0.5) * 8;
  return [base + g, base + g * 0.4 + cool, base - 4 + g * 0.2];
}

function faceSample(qx, qy, r, ang, kind) {
  const grain = fbm(qx * 46 + 3, qy * 46 - 2);
  const fine = noise(qx * 180, qy * 180);
  const nx = (grain - 0.5) * 0.4 + (fine - 0.5) * 0.12;
  const ny = (fine - 0.5) * 0.12;
  const lit = shade(nx - 0.08, ny - 0.12, 1, kind === 'blue' ? 46 : 70);
  const rim = smooth(0.7, 0.748, r);
  if (kind === 'oil') {
    let v = 6 + lit.nd * 8 + (grain - 0.5) * 2.2 + (fine - 0.5) * 1.4;
    v += lit.spec * 16;
    v *= 1 - rim * 0.45;
    return [v, v * 0.97, v * 0.92];
  }
  if (kind === 'phosphate') {
    const hatch = knurl(ang * 2.2, r * 18);
    let v = 10 + lit.nd * 7 + (hatch - 0.5) * 4 + (grain - 0.5) * 2 + (fine - 0.5) * 1.2;
    v += lit.spec * 6;
    v *= 1 - rim * 0.4;
    return [v * 0.95, v * 0.96, v * 0.9];
  }
  let v = 6 + lit.nd * 8 + (fine - 0.5) * 1.5;
  v += lit.spec * 14;
  v *= 1 - rim * 0.42;
  return [v * 0.72, v * 0.82, v * 0.95];
}

function bakePlate(kind) {
  const size = 768;
  const image = png(size, size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - cx) / radius;
      const qy = (y - cy) / radius;
      const r = Math.hypot(qx, qy);
      const ang = Math.atan2(qy, qx);
      if (r > 1.06) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      if (r > 1) {
        put(image, x, y, 0, 0, 0, Math.pow(1 - (r - 1) / 0.06, 2) * 160);
        continue;
      }
      const grain = fbm(x * 0.03, y * 0.03);
      if (r > 0.9) {
        const band = (r - 0.9) / 0.1;
        const hL = knurl(Math.atan2(qy, (x - 1 - cx) / radius), band);
        const hR = knurl(Math.atan2(qy, (x + 1 - cx) / radius), band);
        const hU = knurl(Math.atan2((y - 1 - cy) / radius, qx), band);
        const hD = knurl(Math.atan2((y + 1 - cy) / radius, qx), band);
        const lit = shade(hL - hR, hU - hD, 0.55, 22);
        let col = kind === 'phosphate' ? steel(lit.nd, lit.spec, grain, 4) : brass(lit.nd, lit.spec, grain);
        const lip = smooth(0.985, 1, r);
        const inner = 1 - smooth(0.9, 0.918, r);
        col = col.map((c) => c * (1 - lip * 0.55) * (1 - inner * 0.35));
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      if (r > 0.868) {
        put(image, x, y, 4, 3, 2, 255);
        continue;
      }
      if (r > 0.755) {
        const u = (r - 0.755) / (0.868 - 0.755);
        const dome = Math.sin(Math.PI * clamp(u, 0, 1));
        const lit = shade(qx * dome, qy * dome, 0.42 + (1 - dome) * 0.4, 28);
        const col = steel(lit.nd * 0.9, lit.spec * 0.55, grain, kind === 'blue' ? 8 : 0);
        const groove = smooth(0.755, 0.768, r) * (1 - smooth(0.84, 0.868, r));
        put(image, x, y, col[0] * (0.55 + groove * 0.45), col[1] * (0.55 + groove * 0.45), col[2] * (0.55 + groove * 0.45), 255);
        continue;
      }
      if (r > 0.735) {
        put(image, x, y, 2, 2, 2, 255);
        continue;
      }
      if (r > 0.168) {
        const col = faceSample(qx, qy, r, ang, kind);
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      if (r > 0.132) {
        const u = (0.168 - r) / 0.036;
        put(image, x, y, 3 + u * 8, 3 + u * 7, 2 + u * 6, 255);
        continue;
      }
      put(image, x, y, 8, 7, 6, 255);
    }
  }
  return image;
}

function bakeHub() {
  const size = 512;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / radius;
      const qy = (y - c) / radius;
      const r = Math.hypot(qx, qy);
      if (r > 1.02) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      const grain = fbm(x * 0.04, y * 0.04);
      if (r > 0.86) {
        const lit = shade(-qx, -qy, 0.45, 18);
        const col = brass(lit.nd, lit.spec, grain);
        const edge = smooth(0.96, 1.02, r);
        put(image, x, y, col[0] * (1 - edge), col[1] * (1 - edge), col[2] * (1 - edge), r > 1 ? 0 : 255);
        continue;
      }
      if (r > 0.78) {
        put(image, x, y, 6, 5, 4, 255);
        continue;
      }
      if (r > 0.48) {
        const lit = shade(-qx * 0.4, -qy * 0.4, 0.85, 36);
        const col = steel(lit.nd, lit.spec * 0.5, grain, 2);
        put(image, x, y, col[0] * 0.72, col[1] * 0.72, col[2] * 0.7, 255);
        continue;
      }
      if (r > 0.4) {
        put(image, x, y, 4, 3, 3, 255);
        continue;
      }
      const sphere = Math.sqrt(Math.max(0, 1 - (r / 0.4) * (r / 0.4)));
      const lit = shade(-qx, -qy, sphere, 24);
      const col = brass(0.3 + lit.nd * 0.7, lit.spec, grain);
      put(image, x, y, col[0], col[1], col[2], 255);
    }
  }
  return image;
}

const GLYPH = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function stampDigits(image, text, cx, cy, scale) {
  const glyphs = String(text).split('').map((ch) => GLYPH[ch]);
  const gw = 3 * scale;
  const gap = scale;
  const total = glyphs.length * gw + (glyphs.length - 1) * gap;
  let left = Math.round(cx - total / 2);
  const top = Math.round(cy - (5 * scale) / 2);
  for (const rows of glyphs) {
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < 3; col++) {
        if (rows[row][col] !== '1') continue;
        for (let yy = 0; yy < scale; yy++) {
          for (let xx = 0; xx < scale; xx++) {
            put(image, left + col * scale + xx, top + row * scale + yy, 214, 206, 192, 230);
          }
        }
      }
    }
    left += gw + gap;
  }
}

function fitSquare(src, size) {
  const out = png(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / size) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / size) * src.height));
      const i = (src.width * sy + sx) << 2;
      put(out, x, y, src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3] || 255);
    }
  }
  const marks = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
  const optical = { 20: 1.02, 40: 1, 60: 0.99, 80: 1, 100: 1.02, 120: 1.08, 160: 1.03, 200: 1.02, 260: 1, 320: 1.02, 400: 1.05 };
  const tangent = { 20: 0.02, 400: 0.03, 320: 0.015, 260: -0.01 };
  for (const mark of marks) {
    const theta = angleFromBpm(mark) + (tangent[mark] || 0);
    const placed = size * 0.36 * (optical[mark] || 1);
    const x = size / 2 + Math.sin(theta) * placed;
    const y = size / 2 - Math.cos(theta) * placed;
    stampDigits(out, mark, x, y, mark >= 100 ? 2 : 3);
  }
  return out;
}

function angleFromBpm(bpm) {
  const minA = (-130 * Math.PI) / 180;
  const maxA = (140 * Math.PI) / 180;
  if (bpm <= 120) return minA + ((bpm - 20) / 100) * (0 - minA);
  return ((bpm - 120) / 280) * maxA;
}

function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = px - ax;
  const v2y = py - ay;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const inv = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= 0 && v >= 0 && u + v < 1;
}

function bakePlay(concept, state) {
  const size = 256;
  const image = png(size, size);
  const c = (size - 1) / 2;
  const travel = state === 'down' ? 7 : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = (x - c) / (size * 0.5);
      const qy = (y - c) / (size * 0.5);
      const r = Math.hypot(qx, qy);
      const grain = fbm(x * 0.05, y * 0.05);
      if (concept === 'a') {
        if (r > 0.98) {
          put(image, x, y, 0, 0, 0, 0);
          continue;
        }
        if (r > 0.9) {
          const lit = shade(-qx, -qy, 0.4, 20);
          const col = steel(lit.nd, lit.spec, grain, 0);
          put(image, x, y, col[0] * 0.55, col[1] * 0.55, col[2] * 0.5, 255);
          continue;
        }
        if (r > 0.76) {
          put(image, x, y, 8, 7, 6, 255);
          continue;
        }
        const cy = (y - travel - c) / (size * 0.5);
        const cr = Math.hypot(qx, cy);
        if (cr > 0.7) {
          put(image, x, y, 4, 3, 3, 255);
          continue;
        }
        const lit = shade(-qx, -cy, 0.8, 34);
        const col = steel(0.35 + lit.nd * 0.85, lit.spec * (state === 'down' ? 0.15 : 0.65), grain, 8);
        let rr = col[0];
        let gg = col[1];
        let bb = col[2];
        const glyph = playGlyph(concept, state, x, y, c, c + travel);
        if (glyph) {
          rr *= 0.22;
          gg *= 0.2;
          bb *= 0.16;
        }
        put(image, x, y, rr, gg, bb, 255);
        continue;
      }
      if (concept === 'b') {
        const ax = Math.abs(qx);
        const ay = Math.abs(qy);
        if (ax > 0.92 || ay > 0.92) {
          put(image, x, y, 0, 0, 0, 0);
          continue;
        }
        if (ax > 0.72 || ay > 0.72) {
          const lit = shade(-qx, -qy, 0.5, 24);
          const col = steel(lit.nd, lit.spec * 0.3, grain, 0);
          put(image, x, y, col[0] * 0.4, col[1] * 0.4, col[2] * 0.38, 255);
          continue;
        }
        const cy = qy + travel / (size * 0.5);
        if (Math.abs(qx) < 0.58 && Math.abs(cy) < 0.5) {
          const lit = shade(-qx, -cy, 0.9, 30);
          const col = brass(0.4 + lit.nd * 0.5, lit.spec * (state === 'down' ? 0.15 : 0.55), grain);
          const glyph = playGlyph(concept, state, x, y, c, c + travel);
          put(image, x, y, glyph ? col[0] * 0.2 : col[0], glyph ? col[1] * 0.18 : col[1], glyph ? col[2] * 0.14 : col[2], 255);
        } else {
          put(image, x, y, 6, 5, 4, 255);
        }
        continue;
      }
      if (r > 0.98) {
        put(image, x, y, 0, 0, 0, 0);
        continue;
      }
      const band = (r - 0.7) / 0.28;
      if (r > 0.7) {
        const h = knurl(Math.atan2(qy, qx), band);
        const lit = shade((h - 0.5) * 0.8, -qy * 0.2, 0.6, 16);
        const col = brass(0.2 + h * 0.5 + lit.nd * 0.3, lit.spec, grain);
        put(image, x, y, col[0], col[1], col[2], 255);
        continue;
      }
      if (r > 0.58) {
        put(image, x, y, 5, 4, 3, 255);
        continue;
      }
      const cy = (y - travel - c) / (size * 0.5);
      const cr = Math.hypot(qx, cy);
      if (cr < 0.5) {
        const lit = shade(-qx, -cy, 0.75, 26);
        const col = steel(lit.nd * 0.7, lit.spec * (state === 'down' ? 0.2 : 0.8), grain, 6);
        const glyph = playGlyph(concept, state, x, y, c, c + travel);
        put(image, x, y, glyph ? 18 : col[0], glyph ? 16 : col[1], glyph ? 12 : col[2], 255);
      } else put(image, x, y, 3, 3, 2, 255);
    }
  }
  return image;
}

function playGlyph(concept, state, x, y, cx, cy) {
  if (state === 'stop') {
    const s = concept === 'b' ? 22 : 24;
    const left = Math.abs(x - (cx - 14)) < 6 && Math.abs(y - cy) < s;
    const right = Math.abs(x - (cx + 14)) < 6 && Math.abs(y - cy) < s;
    return left || right;
  }
  return inTri(x, y, cx - 14, cy - 22, cx + 22, cy, cx - 14, cy + 22);
}

function bakeArm(kind) {
  const w = 180;
  const h = 720;
  const image = png(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) image.data[(w * y + x) * 4 + 3] = 0;
  }
  const pivot = h - 36;
  for (let y = 30; y < pivot; y++) {
    const t = (pivot - y) / (pivot - 30);
    let half = kind === 'b' ? 28 + (1 - t) * 16 : kind === 'c' ? 10 + (1 - t) * 6 : 14 + (1 - t) * 22;
    if (kind === 'b' && t > 0.82) half = 22;
    for (let x = Math.round(w / 2 - half); x <= w / 2 + half; x++) {
      const u = (x - w / 2) / half;
      const grain = fbm(x * 0.08, y * 0.02);
      const lit = shade(-u, -0.2, 0.85, 32);
      let col = steel(lit.nd, lit.spec * 0.35, grain, 1);
      if (kind === 'b') {
        const flange = Math.abs(u) > 0.62;
        col = flange ? col.map((c) => c * 0.55) : col.map((c) => c * 1.05);
      }
      const edge = Math.abs(u) > 0.92 ? 0.45 : 1;
      put(image, x, y, col[0] * edge, col[1] * edge, col[2] * edge, 255);
    }
  }
  for (let y = pivot - 28; y < pivot + 8; y++) {
    for (let x = w / 2 - 28; x < w / 2 + 28; x++) {
      const u = (x - w / 2) / 28;
      const lit = shade(-u, 0.1, 0.7, 20);
      const col = brass(lit.nd, lit.spec, 0.5);
      put(image, x, y, col[0] * 0.75, col[1] * 0.75, col[2] * 0.75, 255);
    }
  }
  return image;
}

function bakeMass(kind) {
  const w = 280;
  const h = kind === 'c' ? 160 : 120;
  const image = png(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) image.data[(w * y + x) * 4 + 3] = 0;
  }
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / (w * 0.48);
      const ny = (y - cy) / (h * 0.42);
      const r = nx * nx + ny * ny;
      if (r > 1) continue;
      if (Math.abs(x - cx) < 18) continue;
      const grain = fbm(x * 0.03, y * 0.05);
      const lit = shade(-nx, -ny, Math.sqrt(Math.max(0.05, 1 - r)), 22);
      const col = kind === 'b' ? steel(lit.nd, lit.spec, grain, 0) : brass(0.25 + lit.nd * 0.7, lit.spec, grain);
      put(image, x, y, col[0], col[1], col[2], 255);
    }
  }
  for (let y = cy - 8; y < cy + 8; y++) {
    for (let x = cx - 70; x < cx + 70; x++) {
      if (Math.abs(x - cx) < 18) continue;
      put(image, x, y, 18, 16, 12, 255);
    }
  }
  for (const sx of [cx - 90, cx + 90]) {
    for (let y = cy - 7; y <= cy + 7; y++) {
      for (let x = sx - 7; x <= sx + 7; x++) {
        if ((x - sx) ** 2 + (y - cy) ** 2 > 36) continue;
        put(image, x, y, 24, 20, 14, 255);
        if ((x - sx) ** 2 + (y - cy) ** 2 < 6) put(image, x, y, 180, 160, 120, 255);
      }
    }
  }
  return image;
}

function bakeHousing(kind) {
  const w = 640;
  const h = 180;
  const image = png(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) image.data[(w * y + x) * 4 + 3] = 0;
  }
  for (let y = 28; y < h - 10; y++) {
    for (let x = 40; x < w - 40; x++) {
      const u = (x - w / 2) / (w * 0.5);
      const v = (y - h / 2) / (h * 0.5);
      const lit = shade(-u * 0.2, -0.4, 0.8, 26);
      const col = steel(lit.nd * 0.6, lit.spec * 0.25, fbm(x * 0.02, y * 0.04), 0);
      const recess = Math.abs(x - w / 2) < (kind === 'b' ? 70 : 54) && y < h * 0.72;
      put(image, x, y, recess ? 8 : col[0] * 0.42, recess ? 7 : col[1] * 0.42, recess ? 6 : col[2] * 0.4, 255);
    }
  }
  const cx = w / 2;
  const cy = 78;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.hypot(x - cx, y - cy);
      if (r > 46 || r < 18) continue;
      const lit = shade(-(x - cx) / 46, -(y - cy) / 46, 0.45, 18);
      const col = brass(lit.nd, lit.spec, 0.5);
      put(image, x, y, col[0], col[1], col[2], 255);
    }
  }
  for (const bx of [110, w - 110]) {
    for (let y = cy - 10; y <= cy + 10; y++) {
      for (let x = bx - 10; x <= bx + 10; x++) {
        const r = Math.hypot(x - bx, y - cy);
        if (r > 10) continue;
        const col = r > 7 ? [40, 36, 30] : [170, 140, 90];
        put(image, x, y, col[0], col[1], col[2], 255);
      }
    }
  }
  return image;
}

function composePendulum(kind, arm, mass, housing) {
  const size = 320;
  const image = png(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      put(image, x, y, 8, 8, 9, r < 1 ? 255 : 0);
    }
  }
  blit(image, housing, 16, 214, 288, 86);
  blit(image, arm, 118, 24, 84, 220);
  blit(image, mass, 70, 70, 180, kind === 'c' ? 72 : 64);
  return image;
}

function blit(dst, src, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / dw) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / dh) * src.height));
      const i = (src.width * sy + sx) << 2;
      const a = src.data[i + 3];
      if (a < 8) continue;
      const j = (dst.width * (dy + y) + (dx + x)) << 2;
      if (dy + y >= dst.height || dx + x >= dst.width) continue;
      const t = a / 255;
      dst.data[j] = dst.data[j] * (1 - t) + src.data[i] * t;
      dst.data[j + 1] = dst.data[j + 1] * (1 - t) + src.data[i + 1] * t;
      dst.data[j + 2] = dst.data[j + 2] * (1 - t) + src.data[i + 2] * t;
      dst.data[j + 3] = 255;
    }
  }
}

fs.mkdirSync(dialOut, { recursive: true });
fs.mkdirSync(pendOut, { recursive: true });
fs.mkdirSync(proof, { recursive: true });

const plates = {
  a: bakePlate('oil'),
  b: bakePlate('phosphate'),
  c: bakePlate('blue'),
};
save(plates.a, path.join(dialOut, 'dial-plate-a.png'));
save(plates.b, path.join(dialOut, 'dial-plate-b.png'));
save(plates.c, path.join(dialOut, 'dial-plate-c.png'));
save(plates.a, path.join(dialOut, 'dial-plate.png'));
save(bakeHub(), path.join(dialOut, 'hub.png'));
for (const key of ['a', 'b', 'c']) {
  save(fitSquare(plates[key], 320), path.join(proof, `dial-candidate-${key}-320.png`));
  save(fitSquare(plates[key], 390), path.join(proof, `dial-candidate-${key}-390.png`));
}
for (const concept of ['a', 'b', 'c']) {
  const rest = bakePlay(concept, 'rest');
  save(rest, path.join(proof, `play-candidate-${concept}.png`));
  if (concept === 'a') {
    save(rest, path.join(dialOut, 'play-rest.png'));
    save(bakePlay(concept, 'down'), path.join(dialOut, 'play-down.png'));
    save(bakePlay(concept, 'stop'), path.join(dialOut, 'play-stop.png'));
  }
}
for (const kind of ['a', 'b', 'c']) {
  const arm = bakeArm(kind);
  const mass = bakeMass(kind);
  const housing = bakeHousing(kind);
  save(composePendulum(kind, arm, mass, housing), path.join(proof, `pendulum-candidate-${kind}-320.png`));
  if (kind === 'b') {
    save(arm, path.join(pendOut, 'arm.png'));
    save(mass, path.join(pendOut, 'mass.png'));
    save(housing, path.join(pendOut, 'housing.png'));
  }
}
console.log('pass2 hardware baked');
