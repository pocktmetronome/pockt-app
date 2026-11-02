const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-hardware-assets');
const src = PNG.sync.read(fs.readFileSync(path.join(outDir, '_reference.png')));
const W = src.width;

function pix(x, y) {
  const i = (y * W + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2]];
}

function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
  console.log(name, png.width, png.height);
}

function circleImage(cx, cy, r) {
  const size = r * 2 + 1;
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - r;
      const dy = y - r;
      const i = (y * size + x) * 4;
      if (dx * dx + dy * dy > r * r) {
        out.data[i + 3] = 0;
        continue;
      }
      const [pr, pg, pb] = pix(cx - r + x, cy - r + y);
      out.data[i] = pr;
      out.data[i + 1] = pg;
      out.data[i + 2] = pb;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

function inpaintIcon(img) {
  const { width, height, data } = img;
  const r = width / 2;
  const next = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - r;
      const dy = y - r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * width + x) * 4;
      if (data[i + 3] < 10 || dist > r * 0.8) continue;
      const here = data[i] + data[i + 1] + data[i + 2];
      if (here > 360) continue;
      const ang = Math.atan2(dy, dx || 0.001) + 2.4;
      let acc = [0, 0, 0];
      let n = 0;
      const scale = Math.max(0.55, Math.min(0.9, dist / r));
      for (const extra of [0, 0.08, -0.08]) {
        const sx = Math.round(r + Math.cos(ang) * r * (scale + extra));
        const sy = Math.round(r + Math.sin(ang) * r * (scale + extra));
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        const j = (sy * width + sx) * 4;
        const lum = data[j] + data[j + 1] + data[j + 2];
        if (lum < 400) continue;
        acc[0] += data[j];
        acc[1] += data[j + 1];
        acc[2] += data[j + 2];
        n++;
      }
      if (!n) continue;
      next[i] = Math.round(acc[0] / n);
      next[i + 1] = Math.round(acc[1] / n);
      next[i + 2] = Math.round(acc[2] / n);
    }
  }
  img.data = next;
  return img;
}

function lampSprite(cx, cy, r) {
  const img = circleImage(cx, cy, r);
  const { width, data } = img;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 10) continue;
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const warm = pr - pb;
      const dx = x - r;
      const dy = y - r;
      const dist = Math.sqrt(dx * dx + dy * dy) / r;
      const core = warm > 36 && pr > 175 && pg > 90 && dist < 0.5;
      if (!core) {
        data[i + 3] = 0;
        continue;
      }
      const falloff = Math.max(0, 1 - dist / 0.72);
      data[i + 3] = Math.max(0, Math.min(255, Math.round(warm * 3.2 * falloff)));
    }
  }
  return img;
}

function ringImage(cx, cy, r, inner) {
  const img = circleImage(cx, cy, r);
  const { width, data } = img;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - r;
      const dy = y - r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * width + x) * 4;
      if (dist < r * inner) data[i + 3] = 0;
    }
  }
  return img;
}

write('_asset-cap.png', circleImage(274, 703, 22));
write('_asset-lamp.png', lampSprite(112, 698, 16));
write('_asset-tap.png', circleImage(53, 807, 38));
write('_asset-steel.png', inpaintIcon(circleImage(56, 128, 33)));
write('_asset-pfull.png', circleImage(418, 812, 36));
write('_asset-prim.png', ringImage(418, 812, 36, 0.7));

const x0 = 16;
const y0 = 670;
const rw = 424;
const rh = 74;
const rail = new PNG({ width: rw, height: rh });
for (let y = 0; y < rh; y++) {
  for (let x = 0; x < rw; x++) {
    const [pr, pg, pb] = pix(x0 + x, y0 + y);
    const i = (y * rw + x) * 4;
    rail.data[i] = pr;
    rail.data[i + 1] = pg;
    rail.data[i + 2] = pb;
    rail.data[i + 3] = 255;
  }
}

const holes = [
  { x: 112 - x0, y: 700 - y0, r: 26 },
  { x: 194 - x0, y: 703 - y0, r: 26 },
  { x: 274 - x0, y: 703 - y0, r: 26 },
  { x: 353 - x0, y: 703 - y0, r: 26 },
];
const widgets = [
  { x0: 28 - x0, y0: 686 - y0, x1: 64 - x0, y1: 730 - y0 },
  { x0: 404 - x0, y0: 686 - y0, x1: 440 - x0, y1: 732 - y0 },
];

function inHole(x, y) {
  return holes.some((h) => (x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r);
}
function inWidget(x, y) {
  return widgets.some((w) => x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1);
}

function donorAt(x, y) {
  for (const dir of [-1, 1]) {
    for (let sx = x + dir; sx >= 0 && sx < rw; sx += dir) {
      if (inWidget(sx, y)) continue;
      const i = (y * rw + sx) * 4;
      const lum = rail.data[i] + rail.data[i + 1] + rail.data[i + 2];
      if (lum < 240) continue;
      return [rail.data[i], rail.data[i + 1], rail.data[i + 2]];
    }
  }
  return [140, 136, 128];
}

for (let y = 0; y < rh; y++) {
  for (let x = 0; x < rw; x++) {
    if (!inWidget(x, y)) continue;
    let left = null;
    let right = null;
    for (let sx = x - 1; sx >= 0; sx--) {
      if (!inWidget(sx, y) && !inHole(sx, y)) {
        const i = (y * rw + sx) * 4;
        left = [rail.data[i], rail.data[i + 1], rail.data[i + 2]];
        break;
      }
    }
    for (let sx = x + 1; sx < rw; sx++) {
      if (!inWidget(sx, y) && !inHole(sx, y)) {
        const i = (y * rw + sx) * 4;
        right = [rail.data[i], rail.data[i + 1], rail.data[i + 2]];
        break;
      }
    }
    const donor = left && right
      ? left.map((v, k) => (v + right[k]) >> 1)
      : left || right || [120, 118, 112];
    const i = (y * rw + x) * 4;
    rail.data[i] = donor[0];
    rail.data[i + 1] = donor[1];
    rail.data[i + 2] = donor[2];
  }
}

for (const cx of [96, 178, 258, 337]) {
  for (let y = 61; y <= 73 && y < rh; y++) {
    const window = [];
    for (let x = cx - 18; x <= cx + 18; x++) {
      if (x < 0 || x >= rw) continue;
      const i = (y * rw + x) * 4;
      const lum = rail.data[i] + rail.data[i + 1] + rail.data[i + 2];
      window.push({ x, i, lum });
    }
    const sorted = window.map((p) => p.lum).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const donor = window.find((p) => Math.abs(p.lum - median) < 12) || window[0];
    const j = donor.i;
    for (const p of window) {
      if (Math.abs(p.lum - median) < 24) continue;
      rail.data[p.i] = rail.data[j];
      rail.data[p.i + 1] = rail.data[j + 1];
      rail.data[p.i + 2] = rail.data[j + 2];
    }
  }
}

write('_asset-rail.png', rail);
