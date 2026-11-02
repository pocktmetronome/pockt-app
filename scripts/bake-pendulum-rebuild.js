'use strict';

/**
 * Three different pendulum mechanisms. Layers stay separate so the arm can rotate
 * and the mass can slide. Musical timing is not involved.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'pendulum-hardware');
const proof = path.join(root, 'artifacts', 'pendulum-rebuild');

const S = 2;
const STEEL = [168, 174, 178];
const BLACK = [22, 23, 24];
const BRASS = [176, 138, 78];
const GRAPHITE = [48, 52, 56];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function layer(w, h) {
  const image = new PNG({ width: Math.max(1, Math.round(w * S)), height: Math.max(1, Math.round(h * S)) });
  image.data.fill(0);
  return image;
}
function put(image, x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (image.width * y + x) << 2;
  const src = clamp(a, 0, 255) / 255;
  if (src <= 0) return;
  const dst = image.data[i + 3] / 255;
  const out = src + dst * (1 - src);
  if (out <= 0) return;
  image.data[i] = (r * src + image.data[i] * dst * (1 - src)) / out;
  image.data[i + 1] = (g * src + image.data[i + 1] * dst * (1 - src)) / out;
  image.data[i + 2] = (b * src + image.data[i + 2] * dst * (1 - src)) / out;
  image.data[i + 3] = out * 255;
}
function save(image, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
}

function shade(nx, ny, nz, base, power, gain) {
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const lx = -0.48;
  const ly = -0.62;
  const lz = 0.62;
  const ll = Math.hypot(lx, ly, lz);
  const nd = Math.max(0, (nx * lx + ny * ly + nz * lz) / ll);
  const hx = lx / ll;
  const hy = ly / ll;
  const hz = lz / ll + 1;
  const hl = Math.hypot(hx, hy, hz);
  const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), power) * gain;
  const amb = 0.16 + nd * 0.84;
  return [base[0] * amb + spec * 210, base[1] * amb + spec * 196, base[2] * amb + spec * 160];
}

function rrSDF(px, py, x, y, w, h, rad) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hx = Math.max(0, w / 2 - rad);
  const hy = Math.max(0, h / 2 - rad);
  const dx = Math.abs(px - cx) - hx;
  const dy = Math.abs(py - cy) - hy;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - rad;
}

function bevelBox(image, x, y, w, h, rad, base, power = 28) {
  x *= S; y *= S; w *= S; h *= S; rad *= S;
  const bevel = Math.max(2, Math.min(w, h) * 0.12);
  const x0 = Math.floor(x - 8);
  const y0 = Math.floor(y - 8);
  const x1 = Math.ceil(x + w + 14);
  const y1 = Math.ceil(y + h + 16);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const sd = rrSDF(px, py, x, y, w, h, rad);
      if (sd > 5) continue;
      if (sd > 0) {
        const sh = Math.pow(1 - sd / 5, 2);
        put(image, px + 3, py + 4, 0, 0, 0, sh * 90);
        continue;
      }
      const gx = rrSDF(px + 1, py, x, y, w, h, rad) - rrSDF(px - 1, py, x, y, w, h, rad);
      const gy = rrSDF(px, py + 1, x, y, w, h, rad) - rrSDF(px, py - 1, x, y, w, h, rad);
      const edge = sd > -bevel;
      const n = hash(px, py);
      const rough = base.map((c) => c * (0.94 + (n - 0.5) * 0.08));
      const col = edge ? shade(gx, gy, 0.22, rough.map((c) => c * 0.72), 18, 0.35) : shade(-0.05, -0.12, 1, rough, power, base === BRASS ? 0.45 : 0.22);
      put(image, px, py, col[0], col[1], col[2], 255);
    }
  }
}

function vCyl(image, x, y, w, h, base) {
  x *= S; y *= S; w *= S; h *= S;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  for (let py = y0; py < y + h; py++) {
    for (let px = x0; px < x + w; px++) {
      const u = ((px + 0.5 - x) / w) * 2 - 1;
      if (u * u > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      const n = hash(Math.floor(px / 2), Math.floor(py / 3));
      const rough = base.map((c) => c * (0.95 + (n - 0.5) * 0.06));
      const col = shade(u, -0.05, nz, rough, 36, 0.4);
      put(image, px, py, col[0], col[1], col[2], 255);
      if (px === Math.floor(x + w - 1)) put(image, px + 2, py + 2, 0, 0, 0, 40);
    }
  }
}

function disc(image, cx, cy, r, base, power = 24) {
  cx *= S; cy *= S; r *= S;
  for (let py = Math.floor(cy - r - 6); py <= cy + r + 8; py++) {
    for (let px = Math.floor(cx - r - 6); px <= cx + r + 8; px++) {
      const dx = (px - cx) / r;
      const dy = (py - cy) / r;
      const d = dx * dx + dy * dy;
      if (d > 1.15) continue;
      if (d > 1) {
        const sh = Math.pow(1 - (Math.sqrt(d) - 1) / 0.15, 2);
        put(image, px + 2, py + 3, 0, 0, 0, sh * 80);
        continue;
      }
      const nz = Math.sqrt(Math.max(0, 1 - d));
      const col = shade(dx, dy, nz, base, power, 0.55);
      put(image, px, py, col[0], col[1], col[2], 255);
    }
  }
}

function ring(image, cx, cy, outer, inner, base) {
  cx *= S; cy *= S; outer *= S; inner *= S;
  for (let py = Math.floor(cy - outer - 2); py <= cy + outer + 2; py++) {
    for (let px = Math.floor(cx - outer - 2); px <= cx + outer + 2; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const r = Math.hypot(dx, dy);
      if (r > outer || r < inner) continue;
      const mid = (outer + inner) / 2;
      const span = (outer - inner) / 2;
      const side = (r - mid) / span;
      const nz = Math.sqrt(Math.max(0.05, 1 - side * side));
      const col = shade(dx / outer, dy / outer, nz * 0.8, base, 22, 0.35);
      put(image, px, py, col[0], col[1], col[2], 255);
    }
  }
}

function bolt(image, cx, cy) {
  disc(image, cx, cy, 7, GRAPHITE, 16);
  disc(image, cx, cy, 3.2, BRASS, 12);
}

function punchSlot(image, x, y, w, h) {
  x *= S; y *= S; w *= S; h *= S;
  for (let py = Math.floor(y); py < y + h; py++) {
    for (let px = Math.floor(x); px < x + w; px++) {
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
      const i = (image.width * py + px) << 2;
      image.data[i + 3] = 0;
    }
  }
}

function conceptA(arm, mass, housing) {
  bevelBox(housing, 40, 70, 520, 78, 8, GRAPHITE, 20);
  bevelBox(housing, 70, 48, 460, 36, 4, BLACK, 16);
  ring(housing, 300, 78, 46, 34, STEEL);
  ring(housing, 300, 78, 30, 18, BRASS);
  disc(housing, 300, 78, 14, BLACK, 10);
  bolt(housing, 92, 108);
  bolt(housing, 508, 108);
  bolt(housing, 92, 128);
  bolt(housing, 508, 128);
  vCyl(arm, 168, 40, 64, 620, STEEL);
  bevelBox(arm, 154, 48, 92, 28, 3, BLACK, 14);
  bevelBox(arm, 160, 250, 80, 36, 3, BLACK, 14);
  bevelBox(arm, 166, 470, 68, 30, 3, BLACK, 14);
  bevelBox(arm, 146, 600, 108, 36, 4, BRASS, 20);
  disc(mass, 200, 90, 72, BRASS, 20);
  disc(mass, 200, 90, 34, BLACK, 8);
  vCyl(mass, 236, 66, 40, 48, BRASS);
  disc(mass, 276, 90, 9, GRAPHITE, 10);
  punchSlot(mass, 176, 50, 48, 80);
}

function conceptB(arm, mass, housing) {
  bevelBox(housing, 30, 88, 540, 64, 6, BLACK, 18);
  bevelBox(housing, 70, 36, 28, 90, 3, GRAPHITE, 16);
  bevelBox(housing, 500, 36, 28, 90, 3, GRAPHITE, 16);
  vCyl(housing, 78, 70, 16, 16, STEEL);
  vCyl(housing, 506, 70, 16, 16, STEEL);
  vCyl(housing, 250, 78, 100, 18, STEEL);
  vCyl(arm, 146, 24, 34, 650, STEEL);
  vCyl(arm, 220, 24, 34, 650, STEEL);
  bevelBox(arm, 146, 180, 108, 14, 4, BRASS, 18);
  bevelBox(arm, 146, 360, 108, 14, 4, BRASS, 18);
  bevelBox(arm, 140, 590, 120, 22, 4, BLACK, 16);
  bevelBox(mass, 70, 36, 260, 110, 10, GRAPHITE, 18);
  bevelBox(mass, 96, 54, 208, 74, 6, STEEL, 22);
  punchSlot(mass, 146, 48, 34, 86);
  punchSlot(mass, 220, 48, 34, 86);
  disc(mass, 292, 90, 14, BRASS, 14);
}

function conceptBVersion(arm, mass, housing, version) {
  bevelBox(housing, 16, 108, 568, 52, 5, BLACK, 18);
  const cheek = version >= 1 ? 54 : 34;
  disc(housing, 246, 86, cheek, GRAPHITE, 16);
  disc(housing, 354, 86, cheek, GRAPHITE, 16);
  disc(housing, 246, 86, 28, STEEL, 24);
  disc(housing, 354, 86, 28, STEEL, 24);
  disc(housing, 246, 86, 11, BLACK, 8);
  disc(housing, 354, 86, 11, BLACK, 8);
  vCyl(housing, 230, 78, 140, 16, STEEL);
  if (version >= 4) {
    ring(housing, 246, 86, 20, 13, BRASS);
    ring(housing, 354, 86, 20, 13, BRASS);
  }
  if (version >= 3) {
    for (let y = 16; y < 500; y += 2) {
      vCyl(arm, 149, y, 28, 2, STEEL);
      vCyl(arm, 223, y, 28, 2, STEEL);
    }
    for (let y = 500; y < 660; y += 2) {
      const t = (y - 500) / 160;
      const w = 28 + t * 40;
      vCyl(arm, 163 - w / 2, y, w, 2, STEEL);
      vCyl(arm, 237 - w / 2, y, w, 2, t > 0.62 ? BRASS : STEEL);
    }
    bevelBox(arm, 132, 48, 136, 28, 4, BRASS, 18);
    disc(arm, 163, 62, 16, GRAPHITE, 14);
    disc(arm, 237, 62, 16, GRAPHITE, 14);
  } else {
    vCyl(arm, 149, 24, 28, 640, STEEL);
    vCyl(arm, 223, 24, 28, 640, STEEL);
    bevelBox(arm, 146, 180, 108, 14, 4, BRASS, 18);
    bevelBox(arm, 140, 590, 120, 22, 4, BLACK, 16);
  }
  const deep = version >= 2;
  bevelBox(mass, 72, deep ? 16 : 36, deep ? 236 : 260, deep ? 148 : 110, 10, GRAPHITE, 18);
  if (deep) {
    bevelBox(mass, 292, 8, 62, 164, 8, [30, 32, 34], 16);
    vCyl(mass, 306, 22, 34, 40, BRASS);
    disc(mass, 323, 42, 9, GRAPHITE, 12);
  }
  bevelBox(mass, 96, deep ? 38 : 54, 196, deep ? 104 : 74, 6, STEEL, 22);
  punchSlot(mass, 149, deep ? 24 : 48, 28, deep ? 128 : 86);
  punchSlot(mass, 223, deep ? 24 : 48, 28, deep ? 128 : 86);
  if (!deep) disc(mass, 292, 90, 14, BRASS, 14);
}

function conceptC(arm, mass, housing) {
  bevelBox(housing, 80, 96, 440, 28, 6, BLACK, 16);
  bevelBox(housing, 150, 40, 300, 70, 40, GRAPHITE, 18);
  disc(housing, 300, 78, 22, BRASS, 16);
  disc(housing, 300, 78, 8, [120, 40, 48], 8);
  bolt(housing, 120, 112);
  bolt(housing, 480, 112);
  for (let y = 80; y < 560; y++) {
    const t = (y - 80) / 480;
    const half = 18 + t * 46;
    vCyl(arm, 200 - half, y, half * 2, 2, t > 0.72 ? BRASS : STEEL);
  }
  bevelBox(arm, 150, 80, 100, 22, 4, BLACK, 14);
  bevelBox(arm, 168, 600, 64, 40, 6, BRASS, 20);
  ring(mass, 180, 80, 70, 46, BRASS);
  ring(mass, 180, 80, 42, 28, STEEL);
  disc(mass, 248, 80, 10, GRAPHITE, 12);
  punchSlot(mass, 150, 40, 60, 80);
}

function sample(src, x, y) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= src.width || iy >= src.height) return null;
  const i = (src.width * iy + ix) << 2;
  if (src.data[i + 3] < 8) return null;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

function fitPhone(w, h, housing, arm, mass, angleDeg = 0) {
  const P = 2;
  const image = new PNG({ width: w * P, height: h * P });
  image.data.fill(0);
  const paint = (x, y, r, g, b, a) => put(image, x, y, r, g, b, a);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) paint(x, y, 8, 8, 9, 255);
  }
  const cx = image.width / 2;
  const rad = Math.round(w * 0.46) * P;
  const cy = rad + Math.round(h * 0.06) * P;
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) paint(x, y, 6, 6, 7, 255);
    }
  }
  const unit = (rad * 1.92) / 700;
  const step = unit / S;
  const blit = (src, dx, dy, spin) => {
    if (!spin) {
      for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
          const pix = sample(src, x, y);
          if (!pix) continue;
          paint(dx + x * step, dy + y * step, pix[0], pix[1], pix[2], pix[3]);
        }
      }
      return;
    }
    const radA = (angleDeg * Math.PI) / 180;
    const c = Math.cos(radA);
    const s = Math.sin(radA);
    const ox = cx;
    const oy = dy + 650 * unit;
    const sw = src.width * step;
    const sh = src.height * step;
    const corners = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([x, y]) => {
      const px = dx + x - ox;
      const py = dy + y - oy;
      return [ox + px * c - py * s, oy + px * s + py * c];
    });
    const minX = Math.floor(Math.min(...corners.map((p) => p[0]))) - 1;
    const maxX = Math.ceil(Math.max(...corners.map((p) => p[0]))) + 1;
    const minY = Math.floor(Math.min(...corners.map((p) => p[1]))) - 1;
    const maxY = Math.ceil(Math.max(...corners.map((p) => p[1]))) + 1;
    const ic = Math.cos(-radA);
    const is = Math.sin(-radA);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const lx = px - ox;
        const ly = py - oy;
        const ux = ox + lx * ic - ly * is;
        const uy = oy + lx * is + ly * ic;
        const pix = sample(src, (ux - dx) / step, (uy - dy) / step);
        if (!pix) continue;
        paint(px, py, pix[0], pix[1], pix[2], pix[3]);
      }
    }
  };
  blit(housing, cx - 300 * unit, cy + rad * 0.38, false);
  blit(arm, cx - 200 * unit, cy - rad * 0.95, angleDeg !== 0);
  blit(mass, cx - 200 * unit, cy - rad * 0.18, angleDeg !== 0);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let oy = 0; oy < P; oy++) {
        for (let ox = 0; ox < P; ox++) {
          const i = (image.width * (y * P + oy) + (x * P + ox)) << 2;
          r += image.data[i];
          g += image.data[i + 1];
          b += image.data[i + 2];
          a += image.data[i + 3];
          n++;
        }
      }
      const o = (w * y + x) << 2;
      out.data[o] = r / n;
      out.data[o + 1] = g / n;
      out.data[o + 2] = b / n;
      out.data[o + 3] = a / n;
    }
  }
  return out;
}

function crop(src, x, y, w, h) {
  const image = new PNG({ width: w, height: h });
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const sx = Math.min(src.width - 1, Math.max(0, x + px));
      const sy = Math.min(src.height - 1, Math.max(0, y + py));
      const i = (src.width * sy + sx) << 2;
      const o = (w * py + px) << 2;
      image.data[o] = src.data[i];
      image.data[o + 1] = src.data[i + 1];
      image.data[o + 2] = src.data[i + 2];
      image.data[o + 3] = src.data[i + 3];
    }
  }
  return image;
}

function build(kind) {
  const housing = layer(600, 180);
  const arm = layer(400, 700);
  const mass = layer(400, 180);
  if (kind === 'a') conceptA(arm, mass, housing);
  else if (kind === 'b') conceptB(arm, mass, housing);
  else conceptC(arm, mass, housing);
  return { housing, arm, mass };
}

fs.mkdirSync(proof, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });

for (const kind of ['a', 'b', 'c']) {
  const parts = build(kind);
  save(fitPhone(320, 568, parts.housing, parts.arm, parts.mass), path.join(proof, `concept-${kind}-320.png`));
  save(fitPhone(390, 844, parts.housing, parts.arm, parts.mass), path.join(proof, `concept-${kind}-390.png`));
}

function buildVersion(version) {
  const housing = layer(600, 220);
  const arm = layer(400, 700);
  const mass = layer(400, 220);
  conceptBVersion(arm, mass, housing, version);
  return { housing, arm, mass };
}

const versions = [
  [1, 'winner-v1-320.png'],
  [2, 'winner-v2-320.png'],
  [3, 'winner-v3-320.png'],
  [4, 'winner-final-320.png'],
];
let finalParts = null;
for (const [version, file] of versions) {
  const parts = buildVersion(version);
  save(fitPhone(320, 568, parts.housing, parts.arm, parts.mass), path.join(proof, file));
  if (version === 4) finalParts = parts;
}
save(fitPhone(390, 844, finalParts.housing, finalParts.arm, finalParts.mass), path.join(proof, 'winner-final-390.png'));
const center = fitPhone(390, 844, finalParts.housing, finalParts.arm, finalParts.mass, 0);
const left = fitPhone(390, 844, finalParts.housing, finalParts.arm, finalParts.mass, -28);
const right = fitPhone(390, 844, finalParts.housing, finalParts.arm, finalParts.mass, 28);
save(center, path.join(proof, 'winner-center.png'));
save(left, path.join(proof, 'winner-left.png'));
save(right, path.join(proof, 'winner-right.png'));
save(crop(center, 70, 250, 250, 220), path.join(proof, 'winner-detail-pivot.png'));
save(crop(center, 90, 120, 210, 180), path.join(proof, 'winner-detail-weight.png'));
save(finalParts.arm, path.join(assetDir, 'arm.png'));
save(finalParts.mass, path.join(assetDir, 'mass.png'));
save(finalParts.housing, path.join(assetDir, 'housing.png'));
console.log('pendulum concepts baked');
