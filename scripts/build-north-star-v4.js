'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'artifacts/north-star-v4-src/screen-guess.png');
const outDir = path.join(root, 'assets/north-star-v4');
fs.mkdirSync(outDir, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(srcPath));
const W = src.width;
const H = src.height;
const cx = 249;
const cy = 390;
const R = 228;

function idx(x, y) {
  return (y * W + x) * 4;
}
function get(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function set(img, x, y, r, g, b, a = 255) {
  const i = (y * img.width + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = a;
}
function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const base = new PNG({ width: W, height: H });
base.data.set(src.data);

const needle = new PNG({ width: W, height: H });
needle.data.fill(0);

// Remove only the thin needle core. Horizontal neighbors keep printed numerals.
for (let y = Math.round(cy - R * 0.78); y < Math.round(cy - R * 0.16); y++) {
  for (let x = cx - 3; x <= cx + 3; x++) {
    const i = idx(x, y);
    const L = lum(src.data[i], src.data[i + 1], src.data[i + 2]);
    const lj = idx(x - 10, y);
    const rj = idx(x + 10, y);
    const side = (lum(src.data[lj], src.data[lj + 1], src.data[lj + 2]) + lum(src.data[rj], src.data[rj + 1], src.data[rj + 2])) / 2;
    if (L < side + 28) continue;
    needle.data[i] = src.data[i];
    needle.data[i + 1] = src.data[i + 1];
    needle.data[i + 2] = src.data[i + 2];
    needle.data[i + 3] = 255;
    base.data[i] = Math.round((src.data[lj] + src.data[rj]) / 2);
    base.data[i + 1] = Math.round((src.data[lj + 1] + src.data[rj + 1]) / 2);
    base.data[i + 2] = Math.round((src.data[lj + 2] + src.data[rj + 2]) / 2);
  }
}

// Clear baked tempo ink with the empty well color. Screws sit outside this rect.
const plate = { x: 168, y: 100, w: 156, h: 58 };
const well = idx(250, 140);
const wr = src.data[well];
const wg = src.data[well + 1];
const wb = src.data[well + 2];
for (let y = plate.y; y < plate.y + plate.h; y++) {
  for (let x = plate.x; x < plate.x + plate.w; x++) {
    const i = idx(x, y);
    if (lum(src.data[i], src.data[i + 1], src.data[i + 2]) < 48) continue;
    base.data[i] = wr;
    base.data[i + 1] = wg;
    base.data[i + 2] = wb;
  }
}

// Crop the needle to its alpha bounds, keeping the dial center as the pivot.
let nx0 = W, ny0 = H, nx1 = 0, ny1 = 0, nn = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (needle.data[idx(x, y) + 3] < 10) continue;
    nn++;
    nx0 = Math.min(nx0, x);
    ny0 = Math.min(ny0, y);
    nx1 = Math.max(nx1, x);
    ny1 = Math.max(ny1, y);
  }
}
const pad = 4;
nx0 = Math.max(0, nx0 - pad);
ny0 = Math.max(0, ny0 - pad);
nx1 = Math.min(W - 1, nx1 + pad);
ny1 = Math.min(H - 1, Math.max(ny1 + pad, cy + 2));
const nw = nx1 - nx0 + 1;
const nh = ny1 - ny0 + 1;
const needleCrop = new PNG({ width: nw, height: nh });
for (let y = 0; y < nh; y++) {
  for (let x = 0; x < nw; x++) {
    const si = idx(x + nx0, y + ny0);
    const di = (y * nw + x) * 4;
    needleCrop.data[di] = needle.data[si];
    needleCrop.data[di + 1] = needle.data[si + 1];
    needleCrop.data[di + 2] = needle.data[si + 2];
    needleCrop.data[di + 3] = needle.data[si + 3];
  }
}

// Boss: circular cap above the needle.
const bossR = Math.round(R * 0.2);
const boss = new PNG({ width: bossR * 2, height: bossR * 2 });
for (let y = 0; y < bossR * 2; y++) {
  for (let x = 0; x < bossR * 2; x++) {
    const sx = Math.round(cx - bossR + x);
    const sy = Math.round(cy - bossR + y);
    const dist = Math.hypot(x - bossR, y - bossR);
    const di = (y * bossR * 2 + x) * 4;
    if (dist > bossR - 0.5 || sx < 0 || sy < 0 || sx >= W || sy >= H) {
      boss.data[di + 3] = 0;
      continue;
    }
    const si = idx(sx, sy);
    boss.data[di] = src.data[si];
    boss.data[di + 1] = src.data[si + 1];
    boss.data[di + 2] = src.data[si + 2];
    boss.data[di + 3] = 255;
  }
}

fs.copyFileSync(srcPath, path.join(outDir, 'screen-reference.png'));
fs.writeFileSync(path.join(outDir, 'screen-base.png'), PNG.sync.write(base));
fs.writeFileSync(path.join(outDir, 'needle.png'), PNG.sync.write(needleCrop));
fs.writeFileSync(path.join(outDir, 'boss.png'), PNG.sync.write(boss));

const geometry = {
  sourceWidth: W,
  sourceHeight: H,
  dial: { cx, cy, r: R },
  needle: { x: nx0, y: ny0, w: nw, h: nh, pivotX: cx - nx0, pivotY: cy - ny0, pixels: nn },
  boss: { r: bossR },
  plate,
};
fs.writeFileSync(path.join(outDir, 'geometry.json'), JSON.stringify(geometry, null, 2));
console.log(JSON.stringify(geometry, null, 2));
