'use strict';

/**
 * Photographed twin-rail pendulum. Separate bed, arm, and carriage layers.
 * Musical timing is not involved.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const proof = path.join(root, 'artifacts', 'pendulum-rebuild-2');
const assetDir = path.join(root, 'assets', 'pendulum-hardware');

const STEEL = { rgb: [158, 164, 168], rough: 0.38, aniso: 1, metal: 0.9 };
const BRUSH = { rgb: [176, 180, 184], rough: 0.28, aniso: 1, metal: 1 };
const BLACK = { rgb: [22, 24, 26], rough: 0.55, aniso: 2, metal: 0.7 };
const GRAPH = { rgb: [46, 49, 52], rough: 0.62, aniso: 2, metal: 0.45 };
const BRASS = { rgb: [176, 142, 78], rough: 0.32, aniso: 0, metal: 1 };
const DARK = { rgb: [12, 13, 14], rough: 0.8, aniso: 0, metal: 0.2 };

const LX = -0.46;
const LY = -0.58;
const LZ = 0.67;
const LL = Math.hypot(LX, LY, LZ);
const LXN = LX / LL;
const LYN = LY / LL;
const LZN = LZ / LL;
const SHEAR_X = 0.52;
const SHEAR_Y = 0.3;
let MOVE = false;
let SPIN = 0;
let PIVX = 0;
let PIVY = 0;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function buf(w, h) {
  return {
    w,
    h,
    rgba: new Uint8ClampedArray(w * h * 4),
    z: new Float32Array(w * h),
    bed: new Uint8Array(w * h),
  };
}
function shade(nx, ny, nz, mat, u, v) {
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const ndl = Math.max(0, nx * LXN + ny * LYN + nz * LZN);
  const hx = LXN;
  const hy = LYN;
  const hz = LZN + 1;
  const hl = Math.hypot(hx, hy, hz);
  const hxn = hx / hl;
  const hyn = hy / hl;
  const hzn = hz / hl;
  const ndh = Math.max(0, nx * hxn + ny * hyn + nz * hzn);
  let spec = Math.pow(ndl > 0 ? ndh : 0, 22 + (1 - mat.rough) * 90) * (1 - mat.rough) * mat.metal;
  if (mat.aniso === 1) {
    const axial = Math.abs(hyn);
    spec = Math.pow(ndl > 0 ? 1 - axial : 0, 4 + (1 - mat.rough) * 10) * (1 - mat.rough) * mat.metal * Math.max(ndl, 0.35);
  } else if (mat.aniso === 2) {
    const axial = Math.abs(hxn);
    spec = Math.pow(ndl > 0 ? 1 - axial : 0, 5) * (1 - mat.rough) * mat.metal * 0.8 * ndl;
  }
  const scratch = hash(Math.floor(u * 0.5), Math.floor(v * 0.35));
  const grain = mat.aniso === 1
    ? 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(v * 2.6 + scratch * 2.2))
    : 0.8 + scratch * 0.12;
  const stripe = mat.aniso === 2 ? 0.74 + 0.26 * (0.5 + 0.5 * Math.sin(v * 1.7 + u * 0.04)) : 1;
  const wrap = 0.16 + ndl * 0.84;
  const fres = Math.pow(1 - Math.max(0, nz), 2.2) * 0.22 * mat.metal;
  const cool = Math.max(0, nx) * 10;
  const r = mat.rgb[0] * grain * stripe * wrap + spec * 210 + fres * 50;
  const g = mat.rgb[1] * grain * stripe * wrap + spec * 196 + fres * 46 + cool * 0.15;
  const b = mat.rgb[2] * grain * stripe * wrap + spec * 170 + fres * 40 + cool;
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
function emit(image, x, y, z, nx, ny, nz, mat, bedFlag) {
  if (MOVE && SPIN) {
    const dx = x - PIVX;
    const dy = y - PIVY;
    const c = Math.cos(SPIN);
    const sn = Math.sin(SPIN);
    x = PIVX + dx * c - dy * sn;
    y = PIVY + dx * sn + dy * c;
  }
  const sx = Math.round(x + z * SHEAR_X);
  const sy = Math.round(y - z * SHEAR_Y);
  if (sx < 0 || sy < 0 || sx >= image.w || sy >= image.h) return;
  const i = sy * image.w + sx;
  if (z <= image.z[i]) return;
  image.z[i] = z;
  const col = shade(nx, ny, nz, mat, sx, sy);
  const o = i << 2;
  image.rgba[o] = col[0];
  image.rgba[o + 1] = col[1];
  image.rgba[o + 2] = col[2];
  image.rgba[o + 3] = 255;
  if (bedFlag) image.bed[i] = 1;
}
function drawBox(image, x, y, z, w, h, d, mat, holes, bedFlag) {
  const cham = Math.max(3, Math.min(w, h, d) * 0.16);
  const inside = (px, py) => {
    if (!holes) return true;
    for (const hole of holes) {
      if (px >= hole.x && px <= hole.x + hole.w && py >= hole.y && py <= hole.y + hole.h) return false;
    }
    return true;
  };
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (!inside(px, py)) continue;
      const ex = Math.min(px - x, x + w - px);
      const ey = Math.min(py - y, y + h - py);
      const m = Math.min(ex, ey);
      let nx = 0;
      let ny = 0;
      let nz = 1;
      let zz = z + d;
      if (m < cham) {
        const t = (cham - m) / cham;
        zz = z + d - t * cham * 0.85;
        if (ex < ey) nx = px - x < cham ? -t : t;
        else ny = py - y < cham ? -t : t;
        nz = 1 - t * 0.75;
      }
      emit(image, px, py, zz, nx, ny, nz, mat, bedFlag);
    }
  }
  for (let py = y; py < y + h; py++) {
    for (let pz = z; pz < z + d; pz++) {
      emit(image, x + w, py, pz, 1, 0, 0, mat, bedFlag);
      emit(image, x, py, pz, -1, 0, 0, mat, bedFlag);
    }
  }
  for (let px = x; px < x + w; px++) {
    for (let pz = z; pz < z + d; pz++) {
      emit(image, px, y, pz, 0, -1, 0, mat, bedFlag);
      emit(image, px, y + h, pz, 0, 1, 0, mat, bedFlag);
    }
  }
  for (let py = y; py < y + h; py++) {
    for (let k = 0; k < cham; k++) {
      const t = k / cham;
      emit(image, x + k, py, z + d - (cham - k), -0.7, 0, 0.7, mat, bedFlag);
      emit(image, x + w - k, py, z + d - (cham - k), 0.7, 0, 0.7, mat, bedFlag);
    }
  }
  for (let px = x; px < x + w; px++) {
    for (let k = 0; k < cham; k++) {
      emit(image, px, y + k, z + d - (cham - k), 0, -0.7, 0.7, mat, bedFlag);
      emit(image, px, y + h - k, z + d - (cham - k), 0, 0.7, 0.7, mat, bedFlag);
    }
  }
  if (holes) {
    for (const hole of holes) {
      for (let py = hole.y; py < hole.y + hole.h; py++) {
        for (let pz = z + d * 0.35; pz < z + d; pz++) {
          emit(image, hole.x, py, pz, -1, 0, 0, DARK, false);
          emit(image, hole.x + hole.w, py, pz, 1, 0, 0, DARK, false);
        }
      }
    }
  }
}
function drawCylY(image, cx, y0, y1, r, zc, mat) {
  const x0 = Math.floor(cx - r);
  const x1 = Math.ceil(cx + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - cx) / r;
      if (u * u > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      emit(image, x, y, zc + nz * r, u, 0, nz, mat, false);
    }
  }
  for (let y = y0; y < y0 + Math.max(2, r * 0.18); y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - cx) / r;
      if (u * u > 1) continue;
      emit(image, x, y, zc, 0, -1, 0.15, mat, false);
    }
  }
}
function drawCylX(image, x0, x1, cy, zc, r, mat) {
  const y0 = Math.floor(cy - r);
  const y1 = Math.ceil(cy + r);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const u = (y - cy) / r;
      if (u * u > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      emit(image, x, y, zc + nz * r, 0, u, nz, mat, false);
    }
  }
  for (const end of [x0, x1]) {
    const nx = end === x1 ? 1 : -1;
    for (let y = y0; y <= y1; y++) {
      for (let dz = -r; dz <= r; dz++) {
        if ((y - cy) ** 2 + dz * dz > r * r) continue;
        emit(image, end, y, zc + dz, nx, (y - cy) / r, dz / r, mat, false);
      }
    }
  }
}
function drawKnurl(image, cx, cy, zc, r, len, mat) {
  const y0 = cy - len / 2;
  const y1 = cy + len / 2;
  for (let y = y0; y <= y1; y++) {
    for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      const u = (x - cx) / r;
      if (u * u > 1) continue;
      const ridge = Math.sin((Math.asin(clamp(u, -1, 1)) + y * 0.55) * 9);
      const rr = 1 + ridge * 0.045;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      emit(image, x, y, zc + nz * r * rr, u + ridge * 0.35, ridge * 0.2, nz, mat, false);
    }
  }
}
function drawScrew(image, cx, cy, z, r, mat) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(Math.max(0.08, 1 - d2));
      emit(image, x, y, z + nz * r * 0.45, dx * 0.8, dy * 0.8, nz, mat, false);
    }
  }
  const hr = r * 0.42;
  for (let y = cy - hr; y <= cy + hr; y++) {
    for (let x = cx - hr; x <= cx + hr; x++) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const hex = Math.max(dx * 0.866 + dy * 0.5, dy);
      if (hex > hr) continue;
      emit(image, x, y, z + 1, 0, 0, 1, DARK, false);
    }
  }
}
function drawDisk(image, cx, cy, z, r, mat) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(Math.max(0.05, 1 - d2));
      emit(image, x, y, z + (1 - d2) * 4, dx, dy, nz, mat, false);
    }
  }
}
function finish(image) {
  const { w, h, rgba, z, bed } = image;
  const src = rgba.slice(0);
  const zs = z.slice(0);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] < 10 || bed[i]) continue;
      const depth = zs[i];
      for (let t = 3; t < depth * 0.85; t += 2) {
        const sx = Math.round(x + t * 0.62);
        const sy = Math.round(y + t * 0.78);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) break;
        const j = sy * w + sx;
        if (!bed[j]) continue;
        const fall = 1 - t / (depth * 0.85 + 1);
        const o = j << 2;
        const dark = 0.22 + 0.35 * (1 - fall);
        src[o] = Math.min(src[o], rgba[o] * dark);
        src[o + 1] = Math.min(src[o + 1], rgba[o + 1] * dark);
        src[o + 2] = Math.min(src[o + 2], rgba[o + 2] * dark);
      }
    }
  }
  rgba.set(src);
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] < 10) continue;
      let occ = 0;
      const z0 = zs[i];
      for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [4, 1], [-1, 4]]) {
        const j = (y + oy) * w + (x + ox);
        if (zs[j] > z0 + 3.5) occ++;
      }
      if (occ > 0) {
        const k = 1 - occ * 0.11;
        const o = i << 2;
        rgba[o] *= k;
        rgba[o + 1] *= k;
        rgba[o + 2] *= k;
      }
    }
  }
}
function paintCircle(image, cx, cy, rad) {
  for (let y = 0; y < image.h; y++) {
    for (let x = 0; x < image.w; x++) {
      const o = (y * image.w + x) << 2;
      image.rgba[o] = 8;
      image.rgba[o + 1] = 8;
      image.rgba[o + 2] = 9;
      image.rgba[o + 3] = 255;
      image.z[y * image.w + x] = -1;
    }
  }
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
      const o = (y * image.w + x) << 2;
      image.rgba[o] = 7;
      image.rgba[o + 1] = 7;
      image.rgba[o + 2] = 8;
    }
  }
}
function metrics(W) {
  const s = W / 640;
  const cx = W / 2;
  const rad = W * 0.46;
  const top = rad * 0.16;
  return { s, cx, rad, top };
}
function scene(image, kind, rev, group) {
  const { s, cx } = metrics(image.w);
  PIVX = cx;
  PIVY = 492 * s;
  const railL = cx - 86 * s;
  const railR = cx + 86 * s;
  const rr = (kind === 'c' ? 16 : 24) * s;
  const zc = 40 * s;
  const y0 = 78 * s;
  const y1 = 470 * s;
  const draw = (name) => group === 'all' || group === name;
  const bed = kind === 'b' ? GRAPH : kind === 'c' ? BLACK : GRAPH;
  const railMat = kind === 'c' ? BRUSH : STEEL;
  const massMat = kind === 'b' ? BLACK : kind === 'c' ? GRAPH : BLACK;

  if (draw('bed')) {
    if (kind === 'a') {
      drawBox(image, cx - 250 * s, 430 * s, 0, 500 * s, 150 * s, 18 * s, GRAPH, null, true);
      drawBox(image, cx - 250 * s, 430 * s, 0, 54 * s, 150 * s, 78 * s, BLACK, null, true);
      drawBox(image, cx + 196 * s, 430 * s, 0, 54 * s, 150 * s, 78 * s, BLACK, null, true);
      drawBox(image, cx - 196 * s, 528 * s, 0, 392 * s, 52 * s, 46 * s, GRAPH, null, true);
      drawBox(image, cx - 168 * s, 392 * s, 16 * s, 92 * s, 150 * s, 86 * s, STEEL);
      drawBox(image, cx + 76 * s, 392 * s, 16 * s, 92 * s, 150 * s, 86 * s, STEEL);
      drawCylX(image, cx - 150 * s, cx + 150 * s, 468 * s, 58 * s, 14 * s, BRUSH);
      drawBox(image, cx - 180 * s, 378 * s, 96 * s, 360 * s, 28 * s, 22 * s, BLACK);
      for (const [sx, sy] of [
        [cx - 160 * s, 386 * s],
        [cx + 150 * s, 386 * s],
        [cx - 40 * s, 386 * s],
        [cx + 30 * s, 386 * s],
      ]) drawScrew(image, sx, sy, 120 * s, 8 * s, BRASS);
      drawScrew(image, cx - 220 * s, 470 * s, 80 * s, 7 * s, STEEL);
      drawScrew(image, cx + 220 * s, 470 * s, 80 * s, 7 * s, STEEL);
    } else if (kind === 'b') {
      drawBox(image, cx - 270 * s, 448 * s, 0, 540 * s, 130 * s, 16 * s, GRAPH, null, true);
      drawBox(image, cx - 270 * s, 448 * s, 8 * s, 36 * s, 130 * s, 70 * s, BLACK, null, true);
      drawBox(image, cx + 234 * s, 448 * s, 8 * s, 36 * s, 130 * s, 70 * s, BLACK, null, true);
      drawBox(image, cx - 234 * s, 548 * s, 8 * s, 468 * s, 30 * s, 58 * s, BLACK, null, true);
      if (rev >= 1) {
        drawCylX(image, cx - 168 * s, cx - 78 * s, 468 * s, 58 * s, 52 * s, GRAPH);
        drawCylX(image, cx + 78 * s, cx + 168 * s, 468 * s, 58 * s, 52 * s, GRAPH);
        drawCylX(image, cx - 150 * s, cx - 96 * s, 468 * s, 58 * s, 18 * s, DARK);
        drawCylX(image, cx + 96 * s, cx + 150 * s, 468 * s, 58 * s, 18 * s, DARK);
        drawBox(image, cx - 150 * s, 400 * s, 78 * s, 300 * s, 26 * s, 24 * s, BLACK);
        drawScrew(image, cx - 120 * s, 408 * s, 104 * s, 7 * s, BRASS);
        drawScrew(image, cx + 110 * s, 408 * s, 104 * s, 7 * s, BRASS);
        drawBox(image, cx - 290 * s, 430 * s, 0, 28 * s, 160 * s, 96 * s, BLACK, null, true);
        drawBox(image, cx + 262 * s, 430 * s, 0, 28 * s, 160 * s, 96 * s, BLACK, null, true);
      } else {
        drawDisk(image, cx - 120 * s, 470 * s, 40 * s, 58 * s, GRAPH);
        drawDisk(image, cx + 120 * s, 470 * s, 40 * s, 58 * s, GRAPH);
        drawDisk(image, cx - 120 * s, 470 * s, 48 * s, 34 * s, STEEL);
        drawDisk(image, cx + 120 * s, 470 * s, 48 * s, 34 * s, STEEL);
        drawDisk(image, cx - 120 * s, 470 * s, 54 * s, 12 * s, DARK);
        drawDisk(image, cx + 120 * s, 470 * s, 54 * s, 12 * s, DARK);
        drawScrew(image, cx - 120 * s, 418 * s, 78 * s, 7 * s, BRASS);
        drawScrew(image, cx + 120 * s, 418 * s, 78 * s, 7 * s, BRASS);
      }
      drawCylX(image, cx - 90 * s, cx + 90 * s, 470 * s, 52 * s, 11 * s, BRUSH);
    } else {
      drawBox(image, cx - 240 * s, 450 * s, 0, 480 * s, 120 * s, 14 * s, BLACK, null, true);
      drawBox(image, cx - 200 * s, 470 * s, 8 * s, 70 * s, 90 * s, 64 * s, GRAPH);
      drawBox(image, cx + 130 * s, 470 * s, 8 * s, 70 * s, 90 * s, 64 * s, GRAPH);
      for (let i = -8; i <= 8; i++) {
        const a = (i / 8) * 1.15;
        const px = cx + Math.sin(a) * 150 * s;
        const py = 430 * s + (1 - Math.cos(a)) * 70 * s;
        drawBox(image, px - 10 * s, py, 20 * s, 20 * s, 16 * s, 28 * s, STEEL);
      }
      drawDisk(image, cx, 500 * s, 36 * s, 22 * s, BRASS);
      drawDisk(image, cx, 500 * s, 42 * s, 8 * s, DARK);
      drawCylX(image, cx - 70 * s, cx + 70 * s, 500 * s, 40 * s, 7 * s, BRUSH);
      drawScrew(image, cx - 150 * s, 455 * s, 52 * s, 5 * s, BRASS);
      drawScrew(image, cx + 150 * s, 455 * s, 52 * s, 5 * s, BRASS);
    }
  }

  if (draw('arm')) {
    MOVE = true;
    const collar = kind === 'c' ? BRASS : BLACK;
    drawCylY(image, railL, y0 + 30 * s, y1, rr, zc, railMat);
    drawCylY(image, railR, y0 + 30 * s, y1, rr, zc, railMat);
    drawCylY(image, railL, y0 + 18 * s, y0 + 42 * s, rr + 8 * s, zc, collar);
    drawCylY(image, railR, y0 + 18 * s, y0 + 42 * s, rr + 8 * s, zc, collar);
    drawCylY(image, railL, y1 - 36 * s, y1 + 8 * s, rr + 10 * s, zc, kind === 'c' ? BRASS : STEEL);
    drawCylY(image, railR, y1 - 36 * s, y1 + 8 * s, rr + 10 * s, zc, kind === 'c' ? BRASS : STEEL);
    if (rev >= 3 || kind !== 'b') {
      drawCylY(image, railL, y0 + 120 * s, y0 + 128 * s, rr + 5 * s, zc, collar);
      drawCylY(image, railR, y0 + 120 * s, y0 + 128 * s, rr + 5 * s, zc, collar);
    }
    if (kind === 'a') {
      drawBox(image, cx - 150 * s, y0, 18 * s, 300 * s, 78 * s, 58 * s, STEEL);
      drawBox(image, cx - 120 * s, y0 + 16 * s, 70 * s, 240 * s, 18 * s, 14 * s, BLACK);
      drawScrew(image, railL, y0 + 28 * s, 78 * s, 7 * s, BRASS);
      drawScrew(image, railR, y0 + 28 * s, 78 * s, 7 * s, BRASS);
    } else if (kind === 'b') {
      if (rev >= 3) {
        drawBox(image, cx - 70 * s, y0, 28 * s, 140 * s, 96 * s, 70 * s, BLACK);
        drawBox(image, cx - 150 * s, y0 + 28 * s, 20 * s, 90 * s, 36 * s, 40 * s, STEEL);
        drawBox(image, cx + 60 * s, y0 + 28 * s, 20 * s, 90 * s, 36 * s, 40 * s, STEEL);
        drawCylY(image, cx, y0 + 8 * s, y0 + 88 * s, 22 * s, zc + 16 * s, BRASS);
      } else {
        drawBox(image, cx - 130 * s, y0 + 4 * s, 22 * s, 260 * s, 70 * s, 62 * s, BLACK);
        drawBox(image, cx - 100 * s, y0 + 18 * s, 78 * s, 200 * s, 40 * s, 16 * s, STEEL);
        drawDisk(image, railL, y0 + 36 * s, 96 * s, 16 * s, BRASS);
        drawDisk(image, railR, y0 + 36 * s, 96 * s, 16 * s, BRASS);
      }
    } else {
      drawBox(image, cx - 40 * s, y0, 24 * s, 80 * s, 90 * s, 50 * s, BRASS);
      drawBox(image, cx - 150 * s, y0 + 20 * s, 30 * s, 70 * s, 16 * s, 18 * s, STEEL);
      drawBox(image, cx + 80 * s, y0 + 20 * s, 30 * s, 70 * s, 16 * s, 18 * s, STEEL);
      drawCylY(image, cx, y0 + 10 * s, y0 + 86 * s, 18 * s, zc + 10 * s, STEEL);
    }
    MOVE = false;
  }

  if (draw('mass')) {
    MOVE = true;
    const my = 230 * s + (rev >= 2 ? 6 * s : 0);
    const mh = 128 * s;
    if (kind === 'a') {
      drawBox(image, cx - 168 * s, my + 20 * s, 8 * s, 336 * s, mh - 10 * s, 28 * s, GRAPH);
      drawBox(image, cx - 168 * s, my, 36 * s, 34 * s, mh + 16 * s, 70 * s, BLACK);
      drawBox(image, cx + 134 * s, my, 36 * s, 40 * s, mh + 16 * s, 70 * s, BLACK);
      drawBox(
        image,
        cx - 134 * s,
        my + 16 * s,
        78 * s,
        268 * s,
        78 * s,
        20 * s,
        STEEL,
        [
          { x: railL - rr * 0.55, y: my + 8 * s, w: rr * 1.15, h: mh },
          { x: railR - rr * 0.55, y: my + 8 * s, w: rr * 1.15, h: mh },
        ],
      );
      drawBox(image, cx - 150 * s, my + mh - 8 * s, 40 * s, 300 * s, 26 * s, 55 * s, BLACK);
      drawKnurl(image, cx + 168 * s, my + 48 * s, 90 * s, 16 * s, 42 * s, BRASS);
      drawScrew(image, cx - 150 * s, my + 36 * s, 100 * s, 6 * s, STEEL);
      drawScrew(image, cx + 120 * s, my + 36 * s, 100 * s, 6 * s, STEEL);
      drawScrew(image, cx - 20 * s, my + mh + 4 * s, 96 * s, 6 * s, BRASS);
    } else if (kind === 'b') {
      drawBox(image, cx - 150 * s, my + 18 * s, 10 * s, 300 * s, mh, 24 * s, GRAPH);
      drawBox(image, cx - 172 * s, my + 8 * s, 30 * s, 46 * s, mh + 20 * s, 78 * s, BLACK);
      drawBox(image, cx + 126 * s, my + 8 * s, 30 * s, 52 * s, mh + 28 * s, 84 * s, BLACK);
      drawBox(
        image,
        cx - 126 * s,
        my + 24 * s,
        84 * s,
        252 * s,
        86 * s,
        22 * s,
        STEEL,
        [
          { x: railL - rr * 0.5, y: my + 10 * s, w: rr * 1.05, h: mh + 10 * s },
          { x: railR - rr * 0.5, y: my + 10 * s, w: rr * 1.05, h: mh + 10 * s },
        ],
      );
      drawBox(image, cx - 140 * s, my + mh - 4 * s, 36 * s, 300 * s, 30 * s, 60 * s, GRAPH);
      drawKnurl(image, cx + 176 * s, my + 54 * s, 100 * s, rev >= 2 ? 26 * s : 22 * s, rev >= 2 ? 64 * s : 54 * s, BRASS);
      drawScrew(image, cx + 150 * s, my + 24 * s, 108 * s, 6 * s, DARK);
      if (rev >= 2) {
        drawBox(
          image,
          cx - 126 * s,
          my + 4 * s,
          70 * s,
          252 * s,
          22 * s,
          28 * s,
          BLACK,
          [
            { x: railL - rr * 0.45, y: my, w: rr * 0.9, h: 30 * s },
            { x: railR - rr * 0.45, y: my, w: rr * 0.9, h: 30 * s },
          ],
        );
        drawBox(image, cx - 150 * s, my + mh + 8 * s, 48 * s, 320 * s, 22 * s, 36 * s, STEEL);
      }
    } else {
      drawCylY(image, cx, my, my + mh, 78 * s, zc + 8 * s, massMat);
      drawKnurl(image, cx, my + 20 * s, zc + 8 * s, 84 * s, 28 * s, BRASS);
      drawBox(image, cx - 20 * s, my + mh - 10 * s, zc, 40 * s, 24 * s, 20 * s, BRASS);
      drawScrew(image, cx + 48 * s, my + mh * 0.5, zc + 70 * s, 6 * s, BRASS);
      drawScrew(image, cx - 48 * s, my + mh * 0.5, zc + 70 * s, 6 * s, BRASS);
    }
    MOVE = false;
  }
}
function down2(src) {
  const w = src.w / 2;
  const h = src.h / 2;
  const image = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let oy = 0; oy < 2; oy++) {
        for (let ox = 0; ox < 2; ox++) {
          const i = ((y * 2 + oy) * src.w + (x * 2 + ox)) << 2;
          r += src.rgba[i];
          g += src.rgba[i + 1];
          b += src.rgba[i + 2];
          a += src.rgba[i + 3];
        }
      }
      const o = (y * w + x) << 2;
      image.data[o] = r / 4;
      image.data[o + 1] = g / 4;
      image.data[o + 2] = b / 4;
      image.data[o + 3] = a / 4;
    }
  }
  return image;
}
function renderPhone(w, h, kind, rev, angleDeg = 0) {
  SPIN = (angleDeg * Math.PI) / 180;
  const image = buf(w * 2, h * 2);
  const rad = Math.round(w * 0.46) * 2;
  const cx = image.w / 2;
  const cy = rad + Math.round(h * 0.05) * 2;
  paintCircle(image, cx, cy, rad);
  scene(image, kind, rev, 'all');
  finish(image);
  return down2(image);
}
function savePng(image, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
}
function renderLayers(kind, rev) {
  SPIN = 0;
  const w = 720;
  const h = 980;
  const bed = buf(w, h);
  const arm = buf(w, h);
  const mass = buf(w, h);
  scene(bed, kind, rev, 'bed');
  scene(arm, kind, rev, 'arm');
  scene(mass, kind, rev, 'mass');
  finish(bed);
  finish(arm);
  finish(mass);
  const pack = (src) => {
    const image = new PNG({ width: src.w, height: src.h });
    image.data.set(src.rgba);
    return image;
  };
  const packed = { bed: pack(bed), arm: pack(arm), mass: pack(mass) };
  const span = (png) => {
    let minX = png.width;
    let minY = png.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        if (png.data[(png.width * y + x) * 4 + 3] < 12) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return { minX, minY, maxX, maxY };
  };
  const a = span(packed.arm);
  const m = span(packed.mass);
  const cx = w / 2;
  const half = Math.ceil(Math.max(cx - Math.min(a.minX, m.minX), Math.max(a.maxX, m.maxX) - cx)) + 8;
  const armPng = crop(packed.arm, Math.round(cx - half), a.minY - 6, half * 2, a.maxY - a.minY + 14);
  const massPng = crop(packed.mass, Math.round(cx - half), m.minY - 6, half * 2, m.maxY - m.minY + 14);
  const b = span(packed.bed);
  const bedPng = crop(packed.bed, b.minX - 8, b.minY - 8, b.maxX - b.minX + 16, b.maxY - b.minY + 16);
  console.log('layer sizes', armPng.width, armPng.height, massPng.width, massPng.height, bedPng.width, bedPng.height);
  return { bed: bedPng, arm: armPng, mass: massPng };
}
function crop(src, x, y, w, h) {
  const image = new PNG({ width: w, height: h });
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const sx = clamp(x + px, 0, src.width - 1);
      const sy = clamp(y + py, 0, src.height - 1);
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

fs.mkdirSync(proof, { recursive: true });
const mode = process.argv[2] || 'concepts';
if (mode === 'concepts' || mode === 'all') {
  for (const kind of ['a', 'b', 'c']) {
    savePng(renderPhone(320, 568, kind, 0), path.join(proof, `${kind}-320.png`));
    savePng(renderPhone(390, 844, kind, 0), path.join(proof, `${kind}-390.png`));
    console.log('concept', kind);
  }
}
if (mode === 'winner' || mode === 'all') {
  const kind = 'b';
  savePng(renderPhone(320, 568, kind, 1), path.join(proof, 'winner-v1-320.png'));
  savePng(renderPhone(320, 568, kind, 2), path.join(proof, 'winner-v2-320.png'));
  savePng(renderPhone(320, 568, kind, 3), path.join(proof, 'winner-v3-320.png'));
  savePng(renderPhone(320, 568, kind, 4), path.join(proof, 'winner-final-320.png'));
  const final390 = renderPhone(390, 844, kind, 4, 0);
  savePng(final390, path.join(proof, 'winner-final-390.png'));
  savePng(final390, path.join(proof, 'winner-center.png'));
  savePng(renderPhone(390, 844, kind, 4, -26), path.join(proof, 'winner-left.png'));
  savePng(renderPhone(390, 844, kind, 4, 26), path.join(proof, 'winner-right.png'));
  savePng(crop(final390, 90, 20, 210, 150), path.join(proof, 'winner-detail-head.png'));
  savePng(crop(final390, 70, 120, 250, 150), path.join(proof, 'winner-detail-carriage.png'));
  savePng(crop(final390, 30, 200, 330, 170), path.join(proof, 'winner-detail-lower.png'));
  const layers = renderLayers(kind, 4);
  savePng(layers.arm, path.join(assetDir, 'arm.png'));
  savePng(layers.mass, path.join(assetDir, 'mass.png'));
  savePng(layers.bed, path.join(assetDir, 'housing.png'));
  console.log('winner layers');
}
console.log('pendulum rebuild 2 baked', mode);
