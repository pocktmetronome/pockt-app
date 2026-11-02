'use strict';

/**
 * Front-view path march of the dial as separate hardware layers.
 * The pendulum baker is not modified. Runtime only rotates the scale ring.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-final-real');
const assetDir = path.join(root, 'assets', 'dial-photoreal');

const TREATMENTS = {
  a: {
    name: 'oil-black',
    face: [0.012, 0.012, 0.013],
    faceRough: 0.42,
    bezel: [0.62, 0.5, 0.32],
    bezelRough: 0.34,
    scale: [0.16, 0.15, 0.14],
    scaleRough: 0.38,
    steel: [0.42, 0.44, 0.46],
  },
  b: {
    name: 'satin-champagne',
    face: [0.04, 0.041, 0.043],
    faceRough: 0.5,
    bezel: [0.72, 0.62, 0.44],
    bezelRough: 0.28,
    scale: [0.22, 0.2, 0.17],
    scaleRough: 0.32,
    steel: [0.55, 0.56, 0.58],
  },
  c: {
    name: 'gunmetal',
    face: [0.03, 0.033, 0.036],
    faceRough: 0.36,
    bezel: [0.55, 0.42, 0.24],
    bezelRough: 0.3,
    scale: [0.18, 0.19, 0.2],
    scaleRough: 0.34,
    steel: [0.38, 0.4, 0.43],
  },
};

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function hypot2(x, y) {
  return Math.hypot(x, y);
}
function nrm(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

const MAJORS = new Set([20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]);
function angleFromBpm(bpm) {
  const safe = Math.min(400, Math.max(20, bpm));
  if (safe <= 120) {
    const t = (safe - 20) / 100;
    return ((-130 * Math.PI) / 180) * (1 - t);
  }
  const t = (safe - 120) / 280;
  return ((140 * Math.PI) / 180) * t;
}
let PASS = 1;
const TICKS = [];
for (let bpm = 20; bpm <= 400; bpm += 10) {
  TICKS.push({ ang: angleFromBpm(bpm), major: MAJORS.has(bpm) });
}

function groove(r, ang) {
  let cut = 0;
  for (const tick of TICKS) {
    let d = Math.abs(ang - tick.ang);
    if (d > Math.PI) d = Math.PI * 2 - d;
    const width = tick.major ? 0.01 : 0.004;
    const inner = tick.major ? 0.675 : 0.72;
    const outer = 0.775;
    if (r > inner && r < outer && d < width) {
      const along = 1 - d / width;
      cut = Math.max(cut, along * (tick.major ? 0.02 : 0.008));
    }
  }
  return cut;
}

function ring(r, z, inner, outer, z0, z1) {
  return Math.max(r - outer, inner - r, z0 - z, z - z1);
}

function scene(x, y, z, part) {
  const r = hypot2(x, y);
  const ang = Math.atan2(x, y);
  let best = 1e9;
  let id = 0;
  const consider = (dist, which) => {
    if (dist < best) {
      best = dist;
      id = which;
    }
  };
  const want = (which) => part === 'all' || part === which;
  if (want('bezel')) {
    const diamond = Math.sin(ang * 42) * Math.sin((r - 0.9) * 210);
    const chamfer = Math.max(0, z - 0.042);
    const outer = 0.972 - chamfer;
    const inner = 0.808 + chamfer * 0.75;
    const crown = 0.05 + diamond * 0.011;
    consider(ring(r, z, inner, outer, -0.018, crown), 1);
  }
  if (want('gap')) {
    consider(ring(r, z, 0.78, 0.825, -0.03, -0.004), 2);
  }
  if (want('scale')) {
    const cut = groove(r, ang);
    consider(ring(r, z, 0.66, 0.785, -0.028, -0.006 - cut), 3);
  }
  if (want('face')) {
    const lip = Math.max(0, r - 0.6) * 0.025;
    const mill = Math.sin(y * 210) * 0.00035;
    const top = -0.021 + lip + mill;
    consider(Math.max(r - 0.645, z - top, -0.05 - z), 4);
  }
  if (want('bearing')) {
    consider(ring(r, z, 0.02, 0.24, -0.012, 0.018), 5);
    consider(ring(r, z, 0.188, 0.228, 0.022, 0.055), 6);
    consider(ring(r, z, 0.145, 0.178, 0.01, 0.042), 2);
    consider(ring(r, z, 0.09, 0.138, 0.03, 0.068), 7);
    consider(ring(r, z, 0, 0.072, 0.048, 0.09), 7);
    consider(ring(r, z, 0, 0.036, 0.082, 0.112), 5);
  }
  if (want('pointer')) {
    const half = 0.016 + Math.max(0, 0.58 - y) * 0.022;
    const along = y - 0.36;
    consider(Math.max(Math.abs(x) - half, Math.abs(along) - 0.28, Math.abs(z - 0.11) - 0.012), 8);
    consider(Math.max(Math.abs(x) - 0.05, Math.abs(y - 0.06) - 0.03, Math.abs(z - 0.09) - 0.014), 8);
  }
  return { d: best, id };
}

function normal(x, y, z, part) {
  const e = 0.0025;
  const dx = scene(x + e, y, z, part).d - scene(x - e, y, z, part).d;
  const dy = scene(x, y + e, z, part).d - scene(x, y - e, z, part).d;
  const dz = scene(x, y, z + e, part).d - scene(x, y, z - e, part).d;
  return nrm(dx, dy, dz);
}

function march(ox, oy, oz, dx, dy, dz, part, steps, far) {
  let t = 0.02;
  for (let i = 0; i < steps; i++) {
    const hit = scene(ox + dx * t, oy + dy * t, oz + dz * t, part);
    if (hit.d < 0.0015) return { t, id: hit.id, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t };
    t += Math.max(hit.d, 0.002);
    if (t > far) return null;
  }
  return null;
}

function env(dx, dy, dz) {
  const sl = Math.hypot(-0.42, 0.78, 0.4);
  const d = Math.max(0, (dx * -0.42 + dy * 0.78 + dz * 0.4) / sl);
  const box = Math.pow(d, 6) * 4.2;
  const broad = Math.pow(Math.max(0, dx * -0.15 + dy * 0.45 + dz * 0.75), 2) * 0.48;
  const sky = Math.max(0, dy) * 0.08;
  return [0.015 + box + broad * 0.95 + sky, 0.014 + box * 0.93 + broad + sky, 0.016 + box * 0.78 + broad * 1.05 + sky * 1.2];
}

function shade(hit, dx, dy, dz, part, mat) {
  const n = normal(hit.x, hit.y, hit.z, part);
  let nx = n[0];
  let ny = n[1];
  let nz = n[2];
  if (nx * dx + ny * dy + nz * dz > 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const face = hit.id === 4;
  const ang = Math.atan2(hit.x, hit.y);
  const brush = face ? Math.sin(hit.y * 210) * 0.006 : 0;
  if (face) nx += brush;
  else {
    const grain = Math.sin(ang * (hit.id === 1 ? 92 : 48));
    nx += -Math.cos(ang) * grain * 0.012;
    ny += Math.sin(ang) * grain * 0.012;
  }
  {
    const nn = nrm(nx, ny, nz);
    nx = nn[0];
    ny = nn[1];
    nz = nn[2];
  }
  if (hit.id === 9) {
    const L = nrm(-0.85, 0.95, 0.7);
    const blocked = march(hit.x, hit.y, hit.z + 0.01, L[0], L[1], L[2], 'all', 16, 1.4);
    const k = blocked ? 0.35 : 1;
    return [0.012 * k, 0.011 * k, 0.01 * k, blocked ? 210 : 0];
  }
  const vx = -dx;
  const vy = -dy;
  const vz = -dz;
  const ndv = Math.max(0.04, nx * vx + ny * vy + nz * vz);
  const front = clamp(nz, 0, 1);
  let rough = mat.rough + (hash(Math.floor(hit.x * 180), Math.floor(hit.y * 180)) - 0.5) * 0.04;
  if (face) rough += Math.abs(brush) * 0.8;
  rough = clamp(rough, 0.16, 0.84);
  const a2 = rough * rough;
  let r = 0;
  let g = 0;
  let b = 0;
  const lights = 3;
  for (let i = 0; i < lights; i++) {
    const jx = (hash(i * 19 + hit.x * 10, hit.y * 8) - 0.5) * 0.9;
    const jy = (hash(i * 7 + hit.z * 9, hit.x * 4) - 0.5) * 0.45;
    const ld = nrm(-1.15 + jx - hit.x, 2.6 + jy - hit.y, 1.7 - hit.z);
    const ndl = nx * ld[0] + ny * ld[1] + nz * ld[2];
    if (ndl <= 0) continue;
    if (march(hit.x + nx * 0.006, hit.y + ny * 0.006, hit.z + nz * 0.006, ld[0], ld[1], ld[2], part, 14, 1.5)) continue;
    const hx = ld[0] + vx;
    const hy = ld[1] + vy;
    const hz = ld[2] + vz;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
    let an = a2 * (1 + mat.aniso * Math.abs(hy / hl) * 3);
    if (face) {
      const ax = Math.max(0.04, rough * (0.16 + Math.abs(hx / hl) * 0.85));
      const ay = Math.max(0.08, rough * (1.35 + Math.abs(hy / hl) * 0.2));
      an = ax * ay;
    }
    const D = Math.min(2.6, (an * an) / (Math.PI * Math.pow(ndh * ndh * (an * an - 1) + 1, 2) + 1e-4));
    const spec = Math.min(0.42, D * ndl * (0.35 + 0.4 * (1 - rough)));
    const light = 2.4 / lights;
    const sheen = face ? [0.52, 0.53, 0.55] : mat.alb;
    r += (mat.alb[0] * ndl * 0.08 + sheen[0] * spec) * light;
    g += (mat.alb[1] * ndl * 0.08 + sheen[1] * spec) * light;
    b += (mat.alb[2] * ndl * 0.08 + sheen[2] * spec) * light;
  }
  for (let i = 0; i < 2; i++) {
    const rx = 2 * ndv * nx - vx;
    const ry = 2 * ndv * ny - vy;
    const rz = 2 * ndv * nz - vz;
    const j = rough * 0.65;
    const rd = nrm(
      rx + (hash(i + hit.x, hit.y) - 0.5) * j,
      ry + (hash(hit.y, i + hit.z) - 0.5) * j * (1 - mat.aniso * 0.7),
      rz + (hash(hit.z + i, hit.x) - 0.5) * j
    );
    const e = env(rd[0], rd[1], rd[2]);
    const gain = (face ? 1.15 : 0.7) / 2;
    r += e[0] * mat.alb[0] * gain;
    g += e[1] * mat.alb[1] * gain;
    b += e[2] * mat.alb[2] * gain;
  }
  return [r, g, b, 255];
}

function materialFor(id, treatment, pass) {
  const t = TREATMENTS[treatment];
  const lift = pass >= 2 ? 0.04 : 0;
  if (id === 1) return { alb: t.bezel.map((v) => v + lift), rough: t.bezelRough - (pass >= 3 ? 0.04 : 0), metal: 1, aniso: 0.72 };
  if (id === 3) return { alb: t.scale, rough: t.scaleRough, metal: 1, aniso: 0.55 };
  if (id === 4) return { alb: t.face, rough: t.faceRough - (pass === 3 ? 0.06 : 0), metal: 1, aniso: pass >= 2 ? 0.86 : 0.6 };
  if (id === 8) return { alb: [0.74, 0.64, 0.42], rough: 0.26, metal: 1, aniso: 0.2 };
  if (id === 7) return { alb: t.steel, rough: 0.22, metal: 1, aniso: 0.3 };
  return { alb: [0.08, 0.08, 0.085], rough: 0.5, metal: 1, aniso: 0.2 };
}

function renderContactShadow(size) {
  const png = new PNG({ width: size, height: size });
  const cx = (size - 1) / 2;
  const cy = cx + size * 0.012;
  const radius = size * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 1.02) continue;
      const fall = Math.pow(Math.max(0, 1 - d), 1.8);
      const i = (y * size + x) * 4;
      png.data[i] = 6;
      png.data[i + 1] = 5;
      png.data[i + 2] = 4;
      png.data[i + 3] = Math.round(150 * fall);
    }
  }
  return png;
}

function renderLayer(treatment, part, pass, size) {
  const png = new PNG({ width: size, height: size });
  const eye = [0.03, 0.18, 2.45];
  const look = [0, 0, 0];
  const fwd = nrm(look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]);
  const right = nrm(fwd[1] * 0 - fwd[2] * 1, fwd[2] * 0 - fwd[0] * 0, fwd[0] * 1 - fwd[1] * 0);
  const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let hits = 0;
      const samples = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
      for (const [sx, sy] of samples) {
        const u = (x + sx) / size * 2 - 1;
        const v = 1 - (y + sy) / size * 2;
        const scale = 1.0;
        const ox = eye[0] + right[0] * u * scale + up[0] * v * scale;
        const oy = eye[1] + right[1] * u * scale + up[1] * v * scale;
        const oz = eye[2] + right[2] * u * scale + up[2] * v * scale;
        const hit = march(ox, oy, oz, fwd[0], fwd[1], fwd[2], part, 56, 4.2);
        if (!hit || (part !== 'shadow' && hit.id === 9)) continue;
        const mat = materialFor(hit.id, treatment, pass);
        const rgba = shade(hit, fwd[0], fwd[1], fwd[2], part, mat);
        accR += rgba[0];
        accG += rgba[1];
        accB += rgba[2];
        hits += 1;
      }
      const i = (y * size + x) * 4;
      if (hits <= 0) {
        png.data[i + 3] = 0;
        continue;
      }
      const rgba = [accR / hits, accG / hits, accB / hits, (hits / samples.length) * (part === 'shadow' ? 170 : 255)];
      const tone = (c) => {
        const x = Math.max(0, c) * (pass >= 3 ? 1.15 : 1);
        return clamp(Math.pow(x / (1 + x * 0.65), 1 / 2.15) * 255, 0, 255);
      };
      png.data[i] = tone(rgba[0]);
      png.data[i + 1] = tone(rgba[1]);
      png.data[i + 2] = tone(rgba[2]);
      png.data[i + 3] = rgba[3];
    }
  }
  return png;
}

function composite(layers, size) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    let r = 8;
    let g = 8;
    let b = 9;
    let a = 255;
    for (const layer of layers) {
      const lr = layer.data[i * 4];
      const lg = layer.data[i * 4 + 1];
      const lb = layer.data[i * 4 + 2];
      const la = layer.data[i * 4 + 3] / 255;
      if (la <= 0) continue;
      r = lr * la + r * (1 - la);
      g = lg * la + g * (1 - la);
      b = lb * la + b * (1 - la);
      a = 255;
    }
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = a;
    void a;
  }
  return png;
}

function write(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log('wrote', path.relative(root, file));
}

function bake(treatment, pass, size) {
  const parts = ['shadow', 'bezel', 'face', 'scale', 'bearing', 'pointer'];
  const layers = {};
  for (const part of parts) {
    const png = part === 'shadow' ? renderContactShadow(size) : renderLayer(treatment, part, pass, size);
    layers[part] = png;
    if (treatment === 'b') write(path.join(assetDir, `${part}.png`), png);
  }
  stampPointerShadow(layers.pointer);
  if (treatment === 'b') write(path.join(assetDir, 'pointer.png'), layers.pointer);
  const plate = composite(
    [layers.shadow, layers.bezel, layers.face, layers.scale, layers.bearing, layers.pointer],
    size
  );
  return { plate, layers };
}

function stampPointerShadow(png) {
  const size = png.width;
  const src = Buffer.from(png.data);
  const ox = Math.max(2, Math.round(size * 0.008));
  const oy = Math.max(2, Math.round(size * 0.014));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (src[i + 3] < 30) continue;
      const nx = x + ox;
      const ny = y + oy;
      if (nx >= size || ny >= size) continue;
      const j = (ny * size + nx) * 4;
      if (src[j + 3] > 40) continue;
      png.data[j] = 8;
      png.data[j + 1] = 7;
      png.data[j + 2] = 6;
      png.data[j + 3] = Math.max(png.data[j + 3], 88);
    }
  }
}

function downsample(src, size) {
  const png = new PNG({ width: size, height: size });
  const scale = src.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      const x0 = Math.floor(x * scale);
      const y0 = Math.floor(y * scale);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale));
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4;
          r += src.data[i];
          g += src.data[i + 1];
          b += src.data[i + 2];
          a += src.data[i + 3];
          n += 1;
        }
      }
      const o = (y * size + x) * 4;
      png.data[o] = r / n;
      png.data[o + 1] = g / n;
      png.data[o + 2] = b / n;
      png.data[o + 3] = a / n;
    }
  }
  return png;
}

function checkerboard(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) === 0;
      const i = (y * size + x) * 4;
      const v = on ? 210 : 120;
      png.data[i] = v;
      png.data[i + 1] = on ? 80 : 120;
      png.data[i + 2] = on ? 80 : 120;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

function over(dst, src) {
  for (let i = 0; i < dst.data.length; i += 4) {
    const la = src.data[i + 3] / 255;
    dst.data[i] = src.data[i] * la + dst.data[i] * (1 - la);
    dst.data[i + 1] = src.data[i + 1] * la + dst.data[i + 1] * (1 - la);
    dst.data[i + 2] = src.data[i + 2] * la + dst.data[i + 2] * (1 - la);
    dst.data[i + 3] = 255;
  }
  return dst;
}

function crop(src, x, y, w, h) {
  const png = new PNG({ width: w, height: h });
  PNG.bitblt(src, png, x, y, w, h, 0, 0);
  return png;
}

function main() {
  const pass = Number(process.env.POCKT_DIAL_PASS || 1);
  PASS = pass;
  const size = Number(process.env.POCKT_DIAL_SIZE || 640);
  fs.mkdirSync(outDir, { recursive: true });
  const { plate, layers } = bake('b', pass, size);
  const view = size === 320 ? plate : downsample(plate, 320);
  write(path.join(outDir, `dial-v${Math.min(pass, 3)}-320.png`), view);
  if (pass >= 3) {
    const stack = downsample(
      composite([layers.shadow, layers.bezel, layers.face, layers.scale, layers.bearing, layers.pointer], size),
      320
    );
    const board = checkerboard(320);
    for (let i = 0; i < stack.data.length; i += 4) {
      const la = plate.width === 320 ? plate.data[i + 3] / 255 : stack.data[i + 3] / 255;
      board.data[i] = stack.data[i] * la + board.data[i] * (1 - la);
      board.data[i + 1] = stack.data[i + 1] * la + board.data[i + 1] * (1 - la);
      board.data[i + 2] = stack.data[i + 2] * la + board.data[i + 2] * (1 - la);
    }
    write(path.join(outDir, 'dial-alpha-check.png'), over(checkerboard(320), downsample(
      compositeAlpha([layers.shadow, layers.bezel, layers.face, layers.scale, layers.bearing, layers.pointer], size),
      320
    )));
    const s = size;
    write(path.join(outDir, 'dial-detail-bezel.png'), crop(plate, Math.round(s * 0.08), Math.round(s * 0.02), Math.round(s * 0.84), Math.round(s * 0.28)));
    write(path.join(outDir, 'dial-detail-bearing.png'), crop(plate, Math.round(s * 0.34), Math.round(s * 0.34), Math.round(s * 0.32), Math.round(s * 0.32)));
    write(path.join(outDir, 'dial-detail-scale.png'), crop(plate, Math.round(s * 0.62), Math.round(s * 0.18), Math.round(s * 0.3), Math.round(s * 0.3)));
    write(path.join(outDir, 'dial-detail-face.png'), crop(plate, Math.round(s * 0.28), Math.round(s * 0.22), Math.round(s * 0.22), Math.round(s * 0.22)));
    void board;
  }
}

function compositeAlpha(layers, size) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (const layer of layers) {
      const la = layer.data[i * 4 + 3] / 255;
      if (la <= 0) continue;
      r = layer.data[i * 4] * la + r * (1 - la);
      g = layer.data[i * 4 + 1] * la + g * (1 - la);
      b = layer.data[i * 4 + 2] * la + b * (1 - la);
      a = la + a * (1 - la);
    }
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = a * 255;
  }
  return png;
}

main();
