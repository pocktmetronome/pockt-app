'use strict';

/**
 * Path-traced pendulum layers. Timing and gesture code are not involved.
 * Historical silhouette: bottom axle, rising rod, weight on the rod.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const proof = path.join(root, 'artifacts', 'pendulum-final-micro');
const assetDir = path.join(root, 'assets', 'pendulum-hardware');

const BLACK = 0;
const STEEL = 1;
const BRASS = 2;
const ALUM = 3;
const JEWEL = 4;
const PLANE = 5;
const STOCK = 6;
const HOUSE = 7;
const RING = 8;
const RACE = 9;
const CAP = 10;
const MATS = [
  { alb: [0.07, 0.071, 0.074], rough: 0.46, metal: 1, aniso: 0.7, brush: 'vert' },
  { alb: [0.52, 0.54, 0.56], rough: 0.34, metal: 1, aniso: 0.78, brush: 'vert' },
  { alb: [0.58, 0.42, 0.2], rough: 0.4, metal: 1, aniso: 0.35, brush: 'vert' },
  { alb: [0.5, 0.51, 0.52], rough: 0.4, metal: 1, aniso: 0.5, brush: 'vert' },
  { alb: [0.18, 0.02, 0.03], rough: 0.08, metal: 0.2, aniso: 0, brush: 'vert' },
  { alb: [0.012, 0.012, 0.013], rough: 0.9, metal: 0, aniso: 0, brush: 'vert' },
  { alb: [0.078, 0.079, 0.082], rough: 0.33, metal: 1, aniso: 0.92, brush: 'face', freq: 118 },
  { alb: [0.32, 0.33, 0.35], rough: 0.55, metal: 1, aniso: 0.62, brush: 'circ', freq: 22 },
  { alb: [0.56, 0.58, 0.6], rough: 0.22, metal: 1, aniso: 0.36, brush: 'circ', freq: 70 },
  { alb: [0.48, 0.49, 0.51], rough: 0.2, metal: 1, aniso: 0.22, brush: 'plain', freq: 0 },
  { alb: [0.44, 0.45, 0.47], rough: 0.36, metal: 1, aniso: 0.4, brush: 'axial', freq: 34 },
];

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function nrm(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function builder() {
  return { v: [], f: [] };
}
function vert(b, x, y, z) {
  b.v.push(x, y, z);
  return (b.v.length / 3) - 1;
}
function face(b, i, j, k, mat) {
  if (i === j || j === k || i === k) return;
  b.f.push(i, j, k, mat);
}
function addLatheY(b, profile, segs, mat) {
  const rings = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const ring = [];
    for (const p of profile) ring.push(vert(b, c * p[0], p[1], sn * p[0]));
    rings.push(ring);
  }
  for (let s = 0; s < segs; s++) {
    const n = (s + 1) % segs;
    for (let i = 0; i < profile.length - 1; i++) {
      face(b, rings[s][i], rings[n][i], rings[n][i + 1], mat);
      face(b, rings[s][i], rings[n][i + 1], rings[s][i + 1], mat);
    }
  }
}
function addLoftY(b, y0, y1, steps, around, section, mat) {
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    const ring = [];
    for (let a = 0; a < around; a++) {
      const p = section(t, a / around);
      ring.push(vert(b, p[0], y, p[1]));
    }
    rings.push(ring);
  }
  for (let i = 0; i < steps; i++) {
    for (let a = 0; a < around; a++) {
      const n = (a + 1) % around;
      face(b, rings[i][a], rings[i + 1][a], rings[i + 1][n], mat);
      face(b, rings[i][a], rings[i + 1][n], rings[i][n], mat);
    }
  }
  const c0 = vert(b, 0, y0, 0);
  const c1 = vert(b, 0, y1, 0);
  for (let a = 0; a < around; a++) {
    const n = (a + 1) % around;
    face(b, c0, rings[0][n], rings[0][a], mat);
    face(b, c1, rings[steps][a], rings[steps][n], mat);
  }
}
function addAxleX(b, x0, x1, cy, cz, r0, r1, segs, around, mat, knurl) {
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = x0 + (x1 - x0) * t;
    const base = r0 + (r1 - r0) * t;
    const ring = [];
    for (let a = 0; a < around; a++) {
      const ang = (a / around) * Math.PI * 2;
      const ridge = knurl ? Math.sin(ang * knurl + t * knurl) * 0.011 : 0;
      const rr = base + ridge;
      ring.push(vert(b, x, cy + Math.cos(ang) * rr, cz + Math.sin(ang) * rr));
    }
    rings.push(ring);
  }
  for (let i = 0; i < segs; i++) {
    for (let a = 0; a < around; a++) {
      const n = (a + 1) % around;
      face(b, rings[i][a], rings[i + 1][a], rings[i + 1][n], mat);
      face(b, rings[i][a], rings[i + 1][n], rings[i][n], mat);
    }
  }
  const c0 = vert(b, x0, cy, cz);
  const c1 = vert(b, x1, cy, cz);
  for (let a = 0; a < around; a++) {
    const n = (a + 1) % around;
    face(b, c0, rings[0][n], rings[0][a], mat);
    face(b, c1, rings[segs][a], rings[segs][n], mat);
  }
}
function addSuper(b, cx, cy, cz, rx, ry, rz, uSeg, vSeg, ex, ey, mat) {
  const idx = [];
  for (let iv = 0; iv <= vSeg; iv++) {
    const v = (iv / vSeg) * Math.PI - Math.PI / 2;
    const row = [];
    for (let iu = 0; iu < uSeg; iu++) {
      const u = (iu / uSeg) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      const x = Math.sign(cu) * Math.pow(Math.abs(cu), 2 / ex) * Math.sign(cv) * Math.pow(Math.abs(cv), 2 / ey);
      const y = Math.sign(sv) * Math.pow(Math.abs(sv), 2 / ey);
      const z = Math.sign(su) * Math.pow(Math.abs(su), 2 / ex) * Math.sign(cv) * Math.pow(Math.abs(cv), 2 / ey);
      row.push(vert(b, cx + x * rx, cy + y * ry, cz + z * rz));
    }
    idx.push(row);
  }
  for (let iv = 0; iv < vSeg; iv++) {
    for (let iu = 0; iu < uSeg; iu++) {
      const nu = (iu + 1) % uSeg;
      face(b, idx[iv][iu], idx[iv + 1][iu], idx[iv + 1][nu], mat);
      face(b, idx[iv][iu], idx[iv + 1][nu], idx[iv][nu], mat);
    }
  }
}
function addTorusZ(b, R, r, maj, min, mat, cy) {
  const rings = [];
  for (let i = 0; i < maj; i++) {
    const a = (i / maj) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ring = [];
    for (let j = 0; j < min; j++) {
      const t = (j / min) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const rr = R + r * ct;
      ring.push(vert(b, rr * ca, cy + rr * sa, r * st));
    }
    rings.push(ring);
  }
  for (let i = 0; i < maj; i++) {
    const n = (i + 1) % maj;
    for (let j = 0; j < min; j++) {
      const m = (j + 1) % min;
      face(b, rings[i][j], rings[n][j], rings[n][m], mat);
      face(b, rings[i][j], rings[n][m], rings[i][m], mat);
    }
  }
}
function rotateGroup(b, startVert, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  for (let i = startVert; i < b.v.length; i += 3) {
    const x = b.v[i];
    const y = b.v[i + 1];
    b.v[i] = x * c - y * s;
    b.v[i + 1] = x * s + y * c;
  }
}

function pack(b) {
  const n = b.f.length / 4;
  const tris = new Float32Array(n * 18);
  const mats = new Uint8Array(n);
  const acc = new Float32Array(b.v.length);
  const cnt = new Uint16Array(b.v.length / 3);
  for (let i = 0; i < n; i++) {
    const ia = b.f[i * 4];
    const ib = b.f[i * 4 + 1];
    const ic = b.f[i * 4 + 2];
    const ax = b.v[ia * 3];
    const ay = b.v[ia * 3 + 1];
    const az = b.v[ia * 3 + 2];
    const bx = b.v[ib * 3];
    const by = b.v[ib * 3 + 1];
    const bz = b.v[ib * 3 + 2];
    const cx = b.v[ic * 3];
    const cy = b.v[ic * 3 + 1];
    const cz = b.v[ic * 3 + 2];
    const e1x = bx - ax;
    const e1y = by - ay;
    const e1z = bz - az;
    const e2x = cx - ax;
    const e2y = cy - ay;
    const e2z = cz - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    acc[ia * 3] += nx;
    acc[ia * 3 + 1] += ny;
    acc[ia * 3 + 2] += nz;
    acc[ib * 3] += nx;
    acc[ib * 3 + 1] += ny;
    acc[ib * 3 + 2] += nz;
    acc[ic * 3] += nx;
    acc[ic * 3 + 1] += ny;
    acc[ic * 3 + 2] += nz;
    cnt[ia]++;
    cnt[ib]++;
    cnt[ic]++;
  }
  for (let i = 0; i < cnt.length; i++) {
    const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1;
    acc[i * 3] /= l;
    acc[i * 3 + 1] /= l;
    acc[i * 3 + 2] /= l;
  }
  for (let i = 0; i < n; i++) {
    const ia = b.f[i * 4];
    const ib = b.f[i * 4 + 1];
    const ic = b.f[i * 4 + 2];
    const o = i * 18;
    tris[o] = b.v[ia * 3];
    tris[o + 1] = b.v[ia * 3 + 1];
    tris[o + 2] = b.v[ia * 3 + 2];
    tris[o + 3] = b.v[ib * 3];
    tris[o + 4] = b.v[ib * 3 + 1];
    tris[o + 5] = b.v[ib * 3 + 2];
    tris[o + 6] = b.v[ic * 3];
    tris[o + 7] = b.v[ic * 3 + 1];
    tris[o + 8] = b.v[ic * 3 + 2];
    tris[o + 9] = acc[ia * 3];
    tris[o + 10] = acc[ia * 3 + 1];
    tris[o + 11] = acc[ia * 3 + 2];
    tris[o + 12] = acc[ib * 3];
    tris[o + 13] = acc[ib * 3 + 1];
    tris[o + 14] = acc[ib * 3 + 2];
    tris[o + 15] = acc[ic * 3];
    tris[o + 16] = acc[ic * 3 + 1];
    tris[o + 17] = acc[ic * 3 + 2];
    mats[i] = b.f[i * 4 + 3];
  }
  return { tris, mats, n };
}

function buildBVH(packed) {
  const { tris, n } = packed;
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const nodes = [];
  const boundsOf = (start, count) => {
    let minx = 1e9;
    let miny = 1e9;
    let minz = 1e9;
    let maxx = -1e9;
    let maxy = -1e9;
    let maxz = -1e9;
    for (let i = 0; i < count; i++) {
      const o = order[start + i] * 18;
      for (let k = 0; k < 9; k += 3) {
        const x = tris[o + k];
        const y = tris[o + k + 1];
        const z = tris[o + k + 2];
        if (x < minx) minx = x;
        if (y < miny) miny = y;
        if (z < minz) minz = z;
        if (x > maxx) maxx = x;
        if (y > maxy) maxy = y;
        if (z > maxz) maxz = z;
      }
    }
    return [minx, miny, minz, maxx, maxy, maxz];
  };
  const split = (start, count, depth) => {
    const b = boundsOf(start, count);
    const id = nodes.length;
    nodes.push({ b, left: -1, right: -1, start, count });
    if (count <= 6 || depth > 22) return id;
    const ext = [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
    let axis = 0;
    if (ext[1] > ext[0]) axis = 1;
    if (ext[2] > ext[axis]) axis = 2;
    const cents = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const o = order[start + i] * 18;
      cents[i] = (tris[o + axis] + tris[o + 3 + axis] + tris[o + 6 + axis]) / 3;
    }
    const idx = Array.from({ length: count }, (_, i) => i);
    idx.sort((p, q) => cents[p] - cents[q]);
    const next = order.slice(start, start + count);
    for (let i = 0; i < count; i++) order[start + i] = next[idx[i]];
    const mid = start + (count >> 1);
    const leftCount = mid - start;
    const rightCount = count - leftCount;
    if (leftCount < 1 || rightCount < 1) return id;
    nodes[id].count = 0;
    nodes[id].left = split(start, leftCount, depth + 1);
    nodes[id].right = split(mid, rightCount, depth + 1);
    return id;
  };
  split(0, n, 0);
  return { nodes, order, tris, mats: packed.mats };
}

function rayTri(tris, index, ox, oy, oz, dx, dy, dz) {
  const o = index * 18;
  const ax = tris[o];
  const ay = tris[o + 1];
  const az = tris[o + 2];
  const bx = tris[o + 3];
  const by = tris[o + 4];
  const bz = tris[o + 5];
  const cx = tris[o + 6];
  const cy = tris[o + 7];
  const cz = tris[o + 8];
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  const px = dy * e2z - dz * e2y;
  const py = dz * e2x - dx * e2z;
  const pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (det > -1e-8 && det < 1e-8) return null;
  const inv = 1 / det;
  const tx = ox - ax;
  const ty = oy - ay;
  const tz = oz - az;
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return null;
  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
  if (t < 1e-4) return null;
  const w = 1 - u - v;
  const nx = tris[o + 9] * w + tris[o + 12] * u + tris[o + 15] * v;
  const ny = tris[o + 10] * w + tris[o + 13] * u + tris[o + 16] * v;
  const nz = tris[o + 11] * w + tris[o + 14] * u + tris[o + 17] * v;
  return { t, nx, ny, nz };
}

function closest(scene, ox, oy, oz, dx, dy, dz, maxT) {
  const { nodes, order, tris } = scene;
  const invx = 1 / (dx || 1e-12);
  const invy = 1 / (dy || 1e-12);
  const invz = 1 / (dz || 1e-12);
  let best = maxT;
  let hit = null;
  const stack = [0];
  let sp = 1;
  while (sp) {
    const node = nodes[stack[--sp]];
    const b = node.b;
    const tx1 = (b[0] - ox) * invx;
    const tx2 = (b[3] - ox) * invx;
    const ty1 = (b[1] - oy) * invy;
    const ty2 = (b[4] - oy) * invy;
    const tz1 = (b[2] - oz) * invz;
    const tz2 = (b[5] - oz) * invz;
    const tmin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2), Math.min(tz1, tz2));
    const tmax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2), Math.max(tz1, tz2));
    if (tmax < 0 || tmin > tmax || tmin > best) continue;
    if (node.count > 0) {
      for (let i = 0; i < node.count; i++) {
        const tri = order[node.start + i];
        const h = rayTri(tris, tri, ox, oy, oz, dx, dy, dz);
        if (h && h.t < best) {
          best = h.t;
          hit = h;
          hit.mat = scene.mats[tri];
        }
      }
    } else {
      if (node.left >= 0) stack[sp++] = node.left;
      if (node.right >= 0) stack[sp++] = node.right;
    }
  }
  return hit;
}

function env(dx, dy, dz) {
  const sl = Math.hypot(-0.42, 0.78, 0.4);
  const d = Math.max(0, (dx * -0.42 + dy * 0.78 + dz * 0.4) / sl);
  const box = Math.pow(d, 6) * 4.2;
  const broad = Math.pow(Math.max(0, dx * -0.15 + dy * 0.45 + dz * 0.75), 2) * 0.48;
  const sky = Math.max(0, dy) * 0.08;
  return [0.015 + box + broad * 0.95 + sky, 0.014 + box * 0.93 + broad + sky, 0.016 + box * 0.78 + broad * 1.05 + sky * 1.2];
}
function occluded(scene, ox, oy, oz, dx, dy, dz, dist) {
  return closest(scene, ox, oy, oz, dx, dy, dz, dist) != null;
}
function shade(scene, hit, ox, oy, oz, dx, dy, dz, q) {
  if (hit.mat === PLANE) {
    const px = ox + dx * hit.t;
    const py = oy + dy * hit.t;
    const pz = oz + dz * hit.t;
    const ld = nrm(-1.4 - px, 3.2 - py, 2.1 - pz);
    const blocked = occluded(scene, px, py, pz + 0.01, ld[0], ld[1], ld[2], 6);
    const k = blocked ? 0.45 : 1;
    return [0.00055 * k, 0.00055 * k, 0.0006 * k];
  }
  const mat = MATS[hit.mat];
  let nx = hit.nx;
  let ny = hit.ny;
  let nz = hit.nz;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  if (nx * dx + ny * dy + nz * dz > 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const px = ox + dx * hit.t;
  const py = oy + dy * hit.t;
  const pz = oz + dz * hit.t;
  const brush = mat.brush || 'vert';
  const freq = mat.freq || 48;
  const ang = Math.atan2(pz, px);
  const front = clamp(nz, 0, 1);
  const sideN = clamp(Math.abs(nx) * 1.15 - front * 0.25, 0, 1);
  const corner = clamp(Math.min(front, Math.abs(nx)) * 3.4, 0, 1);
  let grain = 0;
  if (brush === 'face') {
    grain = 0;
  } else if (brush === 'circ') {
    grain = Math.sin(ang * freq + py * 6);
    const tl = Math.hypot(px, pz) || 1;
    nx += (-pz / tl) * grain * 0.014;
    nz += (px / tl) * grain * 0.014;
  } else if (brush === 'axial') {
    grain = Math.sin(py * freq);
    nx += grain * 0.012;
    nz += grain * 0.008;
  } else {
    grain = Math.sin(py * 48 + px * 0.6);
    nx += grain * 0.01 * mat.aniso;
    nz += grain * 0.006;
  }
  const nn = Math.hypot(nx, ny, nz) || 1;
  nx /= nn;
  ny /= nn;
  nz /= nn;
  const vx = -dx;
  const vy = -dy;
  const vz = -dz;
  const ndv = Math.max(0.04, nx * vx + ny * vy + nz * vz);
  let rough = mat.rough;
  if (brush === 'face') {
    rough += sideN * 0.18 - corner * 0.05 - front * 0.14;
    if (ndv < 0.28) rough -= 0.02;
  } else if (brush === 'circ' || brush === 'axial') {
    rough += grain * 0.04;
  } else {
    rough += grain * 0.02 * mat.aniso;
  }
  rough = clamp(rough, 0.18, 0.84);
  const a2 = rough * rough;
  const a4 = a2 * a2;
  const f0 = mat.metal > 0.5 ? mat.alb : [0.04, 0.04, 0.04];
  let r = 0;
  let g = 0;
  let b = 0;
  const bias = 0.004;
  for (let i = 0; i < q.light; i++) {
    const jx = (hash(i * 19 + px * 10, py * 8) - 0.5) * 1.3;
    const jy = (hash(i * 7 + pz * 9, px * 4) - 0.5) * 0.7;
    const lx = -1.5 + jx;
    const ly = 3.4 + jy;
    const lz = 2.2;
    const ld = nrm(lx - px, ly - py, lz - pz);
    const ndl = nx * ld[0] + ny * ld[1] + nz * ld[2];
    if (ndl <= 0) continue;
    if (occluded(scene, px + nx * bias, py + ny * bias, pz + nz * bias, ld[0], ld[1], ld[2], 6)) continue;
    const hx = ld[0] + vx;
    const hy = ld[1] + vy;
    const hz = ld[2] + vz;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
    const tangent = brush === 'circ'
      ? Math.abs((-pz * hx + px * hz) / (hl * (Math.hypot(px, pz) || 1)))
      : Math.abs(hy / hl);
    let an = a2 * (1 + mat.aniso * tangent * 3);
    if (brush === 'face') {
      const across = Math.abs(hx / hl);
      const along = Math.abs(hy / hl);
      const ax = Math.max(0.04, rough * (0.16 + across * 0.85));
      const ay = Math.max(0.08, rough * (1.35 + along * 0.2));
      an = ax * ay;
    }
    const D = Math.min(2.6, (an * an) / (Math.PI * Math.pow(ndh * ndh * (an * an - 1) + 1, 2) + 1e-4));
    const fres = Math.pow(1 - ndv, 5);
    const spec = Math.min(0.42, D * ndl * (0.35 + 0.4 * (1 - rough)));
    const light = 2.4 / q.light;
    if (mat.metal > 0.5) {
      const sheen = brush === 'face' ? [0.52, 0.53, 0.55] : f0;
      const face = brush === 'face' ? front * (1 - sideN * 0.75) : 1;
      r += (f0[0] * ndl * 0.08 + sheen[0] * spec * face) * light;
      g += (f0[1] * ndl * 0.08 + sheen[1] * spec * face) * light;
      b += (f0[2] * ndl * 0.08 + sheen[2] * spec * face) * light;
    } else {
      r += (mat.alb[0] * ndl * 0.8 + spec * 0.04) * light;
      g += (mat.alb[1] * ndl * 0.8 + spec * 0.04) * light;
      b += (mat.alb[2] * ndl * 0.8 + spec * 0.04) * light;
    }
    void fres;
    void a4;
  }
  let ao = 0;
  for (let i = 0; i < q.ao; i++) {
    const jx = hash(px * 13 + i, py * 9) * 2 - 1;
    const jy = hash(pz * 11 + i, px * 5) * 2 - 1;
    const jz = hash(py * 17 + i, pz * 3) * 2 - 1;
    const ad = nrm(nx + jx * 0.8, ny + jy * 0.8, nz + jz * 0.8);
    if (nx * ad[0] + ny * ad[1] + nz * ad[2] < 0.05) continue;
    if (occluded(scene, px + nx * bias, py + ny * bias, pz + nz * bias, ad[0], ad[1], ad[2], 0.22)) ao++;
  }
  const aoK = 1 - (q.ao ? (ao / q.ao) * 0.72 : 0);
  for (let i = 0; i < q.env; i++) {
    const rx = 2 * ndv * nx - vx;
    const ry = 2 * ndv * ny - vy;
    const rz = 2 * ndv * nz - vz;
    const j = rough * 0.65;
    const rd = nrm(rx + (hash(i + px, py) - 0.5) * j, ry + (hash(py, i + pz) - 0.5) * j * (1 - mat.aniso * 0.7), rz + (hash(pz + i, px) - 0.5) * j);
    const e = env(rd[0], rd[1], rd[2]);
    const fres = 0.04 + 0.96 * Math.pow(1 - ndv, 5);
    const gain = (mat.metal > 0.5 ? 0.42 : fres) * aoK / q.env;
    const tint = mat.metal > 0.5 ? mat.alb : [1, 1, 1];
    r += e[0] * tint[0] * gain;
    g += e[1] * tint[1] * gain;
    b += e[2] * tint[2] * gain;
  }
  return [r * aoK, g * aoK, b * aoK];
}

function reflectView(nx, ny, nz, dx, dy, dz) {
  const ndv = -(nx * dx + ny * dy + nz * dz);
  return [dx + 2 * ndv * nx, dy + 2 * ndv * ny, dz + 2 * ndv * nz];
}
void reflectView;

function camera(w, h) {
  const eye = [0.34, 1.04, 4.15];
  const look = [0, 1.0, 0];
  const fwd = nrm(look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]);
  const right = nrm(fwd[1] * 0 - fwd[2] * 1, fwd[2] * 0 - fwd[0] * 0, fwd[0] * 1 - fwd[1] * 0);
  const up = cross(right, fwd);
  return { eye, fwd, right, up, fov: 0.7, w, h };
}
function rayFor(cam, x, y, jx, jy) {
  const aspect = cam.w / cam.h;
  const scale = Math.tan(cam.fov * 0.5);
  const ndcX = ((x + jx) / cam.w * 2 - 1) * aspect * scale;
  const ndcY = (1 - (y + jy) / cam.h * 2) * scale;
  const d = nrm(
    cam.fwd[0] + cam.right[0] * ndcX + cam.up[0] * ndcY,
    cam.fwd[1] + cam.right[1] * ndcX + cam.up[1] * ndcY,
    cam.fwd[2] + cam.right[2] * ndcX + cam.up[2] * ndcY,
  );
  return d;
}
function tonemap(v) {
  const x = Math.max(0, v) * 0.82;
  const m = x / (1 + x * 0.72);
  return clamp(Math.pow(m, 1 / 2.2) * 255, 0, 255);
}

function ellipseSection(wide0, wide1, thick0, thick1, power) {
  return (t, a) => {
    const k = Math.pow(t, power);
    const w = wide0 + (wide1 - wide0) * k;
    const th = thick0 + (thick1 - thick0) * k;
    const ang = a * Math.PI * 2;
    return [Math.cos(ang) * w, Math.sin(ang) * th];
  };
}
function bladeSection(wide0, wide1, thick0, thick1) {
  return (t, a) => {
    const k = Math.pow(t, 0.8);
    const w = wide0 + (wide1 - wide0) * k;
    const th = thick0 + (thick1 - thick0) * k;
    const ang = a * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const p = 3.1;
    return [
      Math.sign(c) * Math.pow(Math.abs(c), 2 / p) * w,
      Math.sign(s) * Math.pow(Math.abs(s), 2 / p) * th,
    ];
  };
}

function buildScene(kind, rev, angleDeg, groups) {
  const b = builder();
  const armStart = () => b.v.length;
  const ang = (angleDeg * Math.PI) / 180;
  const want = (name) => groups === 'all' || groups === name;
  if (want('mount')) {
    if (kind === 'a') {
      addLatheY(b, [[0.0, -0.2], [0.52, -0.2], [0.58, -0.1], [0.5, -0.04], [0.36, 0.0]], 64, BLACK);
      addLatheY(b, [[0.0, -0.07], [0.46, -0.07], [0.5, -0.02], [0.5, 0.1], [0.36, 0.1], [0.36, 0.125], [0.16, 0.125]], 72, HOUSE);
      addLatheY(b, [[0.3, 0.132], [0.48, 0.132], [0.48, 0.142], [0.3, 0.142]], 48, BLACK);
      addLatheY(b, [[0.34, 0.158], [0.46, 0.158], [0.46, 0.192], [0.34, 0.192], [0.34, 0.158]], 64, RING);
      addLatheY(b, [[0.14, 0.206], [0.3, 0.206], [0.3, 0.216], [0.14, 0.216]], 48, BLACK);
      addLatheY(b, [[0.168, 0.224], [0.228, 0.224], [0.246, 0.242], [0.228, 0.266], [0.168, 0.266], [0.15, 0.242], [0.168, 0.224]], 72, RACE);
      addLatheY(b, [[0.0, 0.34], [0.08, 0.34], [0.09, 0.4], [0.035, 0.44], [0.0, 0.44]], 36, CAP);
      addSuper(b, 0.32, 0.02, 0.16, 0.04, 0.028, 0.028, 14, 10, 2.6, 2.6, BRASS);
      addSuper(b, -0.32, 0.02, 0.16, 0.04, 0.028, 0.028, 14, 10, 2.6, 2.6, BRASS);
    } else if (kind === 'b') {
      addTorusZ(b, 0.2, 0.055, 56, 18, STEEL, 0.02);
      addLatheY(b, [[0.0, -0.08], [0.12, -0.08], [0.14, -0.02], [0.08, 0.02], [0.03, 0.02]], 40, BLACK);
      addLatheY(b, [[0.0, 0.0], [0.045, 0.0], [0.05, 0.06], [0.02, 0.08]], 28, ALUM);
    } else {
      addLatheY(b, [[0.0, -0.12], [0.26, -0.12], [0.28, -0.06], [0.18, -0.02], [0.08, 0.02]], 48, BLACK);
      addLatheY(b, [[0.0, 0.0], [0.11, 0.0], [0.12, 0.045], [0.07, 0.07], [0.0, 0.07]], 40, BRASS);
      addLatheY(b, [[0.0, 0.05], [0.035, 0.05], [0.04, 0.09], [0.0, 0.09]], 24, JEWEL);
      addTorusZ(b, 0.15, 0.018, 40, 12, STEEL, 0.03);
    }
  }
  const armAt = armStart();
  if (want('arm')) {
    const yTip = 2.35 + (rev >= 3 ? 0.08 : 0);
    if (kind === 'a') {
      addLoftY(b, 0.28, yTip, 28, 22, ellipseSection(0.09, 0.016, 0.05, 0.016, 0.8), STEEL);
      addLatheY(b, [[0.02, 0.12], [0.07, 0.14], [0.075, 0.2], [0.04, 0.24], [0.02, 0.24]], 28, BLACK);
    } else if (kind === 'b') {
      addLoftY(b, 0.1, yTip, 30, 18, bladeSection(0.085, 0.02, 0.02, 0.008), ALUM);
      addLatheY(b, [[0.015, 0.1], [0.05, 0.12], [0.055, 0.18], [0.02, 0.2]], 24, BLACK);
    } else {
      addLoftY(b, 0.1, yTip + 0.15, 34, 16, ellipseSection(0.028, 0.008, 0.02, 0.006, 1.15), STEEL);
      addLatheY(b, [[0.01, 0.1], [0.045, 0.12], [0.05, 0.17], [0.02, 0.2]], 24, BRASS);
    }
    if (ang) rotateGroup(b, armAt, ang);
  }
  const bobAt = armStart();
  if (want('bob')) {
    const y = 1.28 - (rev >= 2 ? 0.06 : 0);
    if (kind === 'a') {
      addSuper(b, 0, y, 0.06, 0.32, 0.42, 0.22, 40, 24, 4.6, 3.4, STOCK);
      addAxleX(b, 0.26, 0.4, y, 0.14, 0.032, 0.036, 8, 16, STEEL, 0);
      addAxleX(b, 0.4, 0.58, y, 0.14, 0.09, 0.09, 10, 32, BRASS, 11);
      addLatheY(b, [[0.0, y + 0.36], [0.09, y + 0.36], [0.1, y + 0.44], [0.0, y + 0.44]], 24, STEEL);
    } else if (kind === 'b') {
      addSuper(b, 0, y + 0.05, 0.03, 0.34, 0.16, 0.12, 32, 18, 3.4, 2.2, BLACK);
      addSuper(b, 0.36, y + 0.05, 0.08, 0.07, 0.07, 0.05, 18, 12, 2, 2, BRASS);
      addLatheY(b, [[0.02, y - 0.12], [0.09, y - 0.1], [0.1, y - 0.02], [0.04, y + 0.02]], 20, STEEL);
    } else {
      addSuper(b, 0, y + 0.18, 0.02, 0.16, 0.28, 0.09, 28, 20, 2.1, 1.6, BRASS);
      addSuper(b, 0, y - 0.02, 0.03, 0.1, 0.08, 0.06, 20, 14, 2, 2, BLACK);
      addSuper(b, 0.14, y + 0.05, 0.07, 0.03, 0.03, 0.03, 12, 10, 2, 2, STEEL);
    }
    if (ang) rotateGroup(b, bobAt, ang);
  }
  if (want('plane')) {
    const s = 3.2;
    const z = -0.42;
    const i0 = vert(b, -s, -0.6, z);
    const i1 = vert(b, s, -0.6, z);
    const i2 = vert(b, s, 2.8, z);
    const i3 = vert(b, -s, 2.8, z);
    face(b, i0, i1, i2, PLANE);
    face(b, i0, i2, i3, PLANE);
  }
  return buildBVH(pack(b));
}

function renderView(size, kind, rev, angle, groups, q) {
  const scene = buildScene(kind, rev, angle, groups);
  const cam = camera(size, size);
  const rgba = new Float32Array(size * size * 3);
  const alpha = new Uint8Array(size * size);
  const samples = q.spp;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2;
      const cy = size * 0.48;
      const rad = size * 0.48;
      if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let s = 0; s < samples; s++) {
        const jx = hash(x + s * 3, y + s) ;
        const jy = hash(y + s * 5, x + 2);
        const d = rayFor(cam, x, y, jx, jy);
        const hit = closest(scene, cam.eye[0], cam.eye[1], cam.eye[2], d[0], d[1], d[2], 30);
        if (!hit) continue;
        if (hit.mat === PLANE && groups !== 'all') continue;
        const col = shade(scene, hit, cam.eye[0], cam.eye[1], cam.eye[2], d[0], d[1], d[2], q);
        r += col[0];
        g += col[1];
        b += col[2];
        hits++;
      }
      const o = (y * size + x) * 3;
      if (!hits) continue;
      rgba[o] = r / samples;
      rgba[o + 1] = g / samples;
      rgba[o + 2] = b / samples;
      alpha[y * size + x] = 255;
    }
  }
  return { rgba, alpha, size };
}
function toPng(view, phoneW, phoneH) {
  const image = new PNG({ width: phoneW, height: phoneH });
  const rad = Math.round(phoneW * 0.46);
  const cx = phoneW / 2;
  const cy = rad + Math.round(phoneH * 0.05);
  for (let y = 0; y < phoneH; y++) {
    for (let x = 0; x < phoneW; x++) {
      const o = (y * phoneW + x) << 2;
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
      image.data[o] = inside ? 10 : 8;
      image.data[o + 1] = inside ? 10 : 8;
      image.data[o + 2] = inside ? 11 : 9;
      image.data[o + 3] = 255;
    }
  }
  const dest = rad * 2;
  for (let y = 0; y < dest; y++) {
    for (let x = 0; x < dest; x++) {
      const sx = Math.floor((x / dest) * view.size);
      const sy = Math.floor((y / dest) * view.size);
      if (!view.alpha[sy * view.size + sx]) continue;
      const dx = Math.round(cx - rad + x);
      const dy = Math.round(cy - rad + y);
      if (dx < 0 || dy < 0 || dx >= phoneW || dy >= phoneH) continue;
      const s = (sy * view.size + sx) * 3;
      const o = (dy * phoneW + dx) << 2;
      image.data[o] = tonemap(view.rgba[s]);
      image.data[o + 1] = tonemap(view.rgba[s + 1]);
      image.data[o + 2] = tonemap(view.rgba[s + 2]);
      image.data[o + 3] = 255;
    }
  }
  return image;
}
function save(image, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
}

const mode = process.argv[2] || 'draft';
const q = mode === 'final'
  ? { spp: 5, light: 4, env: 3, ao: 3 }
  : { spp: 3, light: 4, env: 3, ao: 2 };
const size = mode === 'final' ? 480 : 400;

function shot(file, w, h, kind, rev, angle) {
  const t0 = Date.now();
  const view = renderView(size, kind, rev, angle, 'all', q);
  save(toPng(view, w, h), path.join(proof, file));
  console.log(file, Date.now() - t0);
}

if (mode === 'check') {
  const dir = path.join(root, 'artifacts', 'full-product-recovery');
  const saveShot = (file, w, h) => {
    const t0 = Date.now();
    const view = renderView(size, 'a', 0, 0, 'all', q);
    save(toPng(view, w, h), path.join(dir, file));
    console.log(file, Date.now() - t0);
  };
  saveShot('pendulum-320.png', 320, 568);
  saveShot('pendulum-390.png', 390, 844);
} else if (mode === 'v1' || mode === 'v2' || mode === 'v3') {
  shot(`final-${mode}-320.png`, 320, 568, 'a', 0, 0);
} else if (mode !== 'final') {
  shot('final-v1-320.png', 320, 568, 'a', 0, 0);
} else {
  shot('final-320.png', 320, 568, 'a', 0, 0);
  const hero = renderView(size, 'a', 0, 0, 'all', q);
  const png = toPng(hero, 390, 844);
  save(png, path.join(proof, 'final-390.png'));
  save(png, path.join(proof, 'center.png'));
  shot('left.png', 390, 844, 'a', 0, -24);
  shot('right.png', 390, 844, 'a', 0, 24);
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      if (png.data[i] === 10 && png.data[i + 1] === 10 && png.data[i + 2] === 11) continue;
      if (png.data[i] < 12 && png.data[i + 1] < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  console.log('content', minX, minY, maxX, maxY);
  const crop = (x, y, w, h, name) => {
    const image = new PNG({ width: w, height: h });
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const sx = clamp(x + px, 0, png.width - 1);
        const sy = clamp(y + py, 0, png.height - 1);
        const i = (png.width * sy + sx) << 2;
        const o = (w * py + px) << 2;
        image.data[o] = png.data[i];
        image.data[o + 1] = png.data[i + 1];
        image.data[o + 2] = png.data[i + 2];
        image.data[o + 3] = 255;
      }
    }
    save(image, path.join(proof, name));
  };
  const bw = Math.max(40, maxX - minX);
  const bh = Math.max(40, maxY - minY);
  crop(minX - 16, maxY - Math.round(bh * 0.34), bw + 32, Math.round(bh * 0.36), 'pivot-detail.png');
  crop(minX - 8, minY + Math.round(bh * 0.08), Math.round(bw * 0.72), Math.round(bh * 0.42), 'weight-detail.png');
  crop(minX + Math.round(bw * 0.48), minY + Math.round(bh * 0.16), Math.round(bw * 0.55), Math.round(bh * 0.34), 'adjuster-detail.png');
  const layers = ['mount', 'arm', 'bob'];
  for (const group of layers) {
    const view = renderView(360, 'a', 0, 0, group, q);
    const image = new PNG({ width: view.size, height: view.size });
    for (let y = 0; y < view.size; y++) {
      for (let x = 0; x < view.size; x++) {
        const o = (y * view.size + x) << 2;
        const s = (y * view.size + x) * 3;
        if (!view.alpha[y * view.size + x]) continue;
        image.data[o] = tonemap(view.rgba[s]);
        image.data[o + 1] = tonemap(view.rgba[s + 1]);
        image.data[o + 2] = tonemap(view.rgba[s + 2]);
        image.data[o + 3] = 255;
      }
    }
    const file = group === 'mount' ? 'housing.png' : group === 'arm' ? 'arm.png' : 'mass.png';
    let minX = image.width;
    let minY = image.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (image.data[(image.width * y + x) * 4 + 3] < 8) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const cw = Math.max(1, maxX - minX + 8);
    const ch = Math.max(1, maxY - minY + 8);
    const cropped = new PNG({ width: cw, height: ch });
    for (let py = 0; py < ch; py++) {
      for (let px = 0; px < cw; px++) {
        const sx = clamp(minX - 4 + px, 0, image.width - 1);
        const sy = clamp(minY - 4 + py, 0, image.height - 1);
        const i = (image.width * sy + sx) << 2;
        const o = (cw * py + px) << 2;
        cropped.data[o] = image.data[i];
        cropped.data[o + 1] = image.data[i + 1];
        cropped.data[o + 2] = image.data[i + 2];
        cropped.data[o + 3] = image.data[i + 3];
      }
    }
    save(cropped, path.join(assetDir, file));
    console.log('layer', file, cropped.width, cropped.height);
  }
}
console.log('photoreal bake', mode);
