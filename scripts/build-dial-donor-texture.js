'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/screen-reference.png')));
const donorImg = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/POCKT_DIAL_TEXTURE_DONOR_V1.png')));
const needle = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/parts/needle-shaft.png')));
const shadow = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/parts/needle-shadow.png')));
const boss = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/parts/boss.png')));
const outDir = path.join(root, 'assets/north-star-v4/parts');
const preview = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(preview, { recursive: true });
fs.copyFileSync(path.join(outDir, 'dial-fixed-120.png'), path.join(preview, 'dial-fixed-120-rebuilt-previous.png'));

const dial = { x: 21, y: 162, w: 456, h: 456 };
const LCX = 228;
const LCY = 228;
const BOSS_R = 46;
const FACE_IN = 52;
const FACE_OUT = 204;
const DONOR_CX = 385;
const DONOR_CY = 385;
const DONOR_IN = 96;
const DONOR_OUT = 312;
const BLUR = 16;

function lum(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
function get(img, x, y) {
  const xx = Math.max(0, Math.min(img.width - 1, x | 0));
  const yy = Math.max(0, Math.min(img.height - 1, y | 0));
  const i = (yy * img.width + xx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function bilinear(img, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const a = get(img, x0, y0);
  const b = get(img, x0 + 1, y0);
  const c = get(img, x0, y0 + 1);
  const d = get(img, x0 + 1, y0 + 1);
  return [0, 1, 2].map((channel) =>
    a[channel] * (1 - tx) * (1 - ty) + b[channel] * tx * (1 - ty) + c[channel] * (1 - tx) * ty + d[channel] * tx * ty);
}
function set(img, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = a;
}
function blank(w, h) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  return png;
}
function polar(x, y, cx, cy) {
  return { radius: Math.hypot(x - cx, y - cy), angle: Math.atan2(x - cx, cy - y) };
}
function cartesian(radius, angle, cx, cy) {
  return [cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius];
}
function mapRadius(radius) {
  const u = Math.max(0, Math.min(1, (radius - FACE_IN) / (FACE_OUT - FACE_IN)));
  return DONOR_IN + u * (DONOR_OUT - DONOR_IN);
}

const body = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(src, dial.x + x, dial.y + y);
    set(body, x, y, px[0], px[1], px[2], 255);
  }
}

const bg = new Float32Array(240);
for (let radius = 40; radius < 230; radius += 1) {
  const samples = [];
  for (let angle = 0.35; angle <= 0.7; angle += 0.03) {
    for (const sign of [-1, 1]) {
      const px = bilinear(body, ...cartesian(radius, sign * angle, LCX, LCY));
      samples.push(lum(px[0], px[1], px[2]));
    }
  }
  samples.sort((a, b) => a - b);
  bg[radius] = samples[Math.floor(samples.length / 2)] || 0;
}
function sideBase(radius, sign) {
  const samples = [];
  for (let angle = 0.28; angle <= 0.5; angle += 0.03) {
    const px = bilinear(body, ...cartesian(radius, sign * angle, LCX, LCY));
    samples.push(lum(px[0], px[1], px[2]));
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] || 0;
}

const mask = new Uint8Array(dial.w * dial.h);
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    const { radius, angle } = polar(x, y, LCX, LCY);
    if (radius < BOSS_R + 4 || radius > 168) continue;
    const px = get(body, x, y);
    const level = lum(px[0], px[1], px[2]);
    if (Math.abs(angle) < 0.16 && px[0] - px[2] > 32 && level > 28) mask[y * dial.w + x] = 1;
    if (Math.abs(angle) > 0.07) continue;
    if (level > bg[Math.round(radius)] + 16) mask[y * dial.w + x] = 1;
  }
}
for (let y = 80; y <= 104; y += 1) {
  for (let x = 210; x <= 256; x += 1) {
    if (lum(...get(body, x, y)) > 48) mask[y * dial.w + x] = 1;
  }
}
const grown = mask.slice();
for (let y = 2; y < dial.h - 2; y += 1) {
  for (let x = 2; x < dial.w - 2; x += 1) {
    if (mask[y * dial.w + x]) continue;
    let nearBright = false;
    for (let oy = -5; oy <= 5 && !nearBright; oy += 1) {
      for (let ox = -4; ox <= 4; ox += 1) {
        if (ox * ox + oy * oy > 20) continue;
        if (mask[(y + oy) * dial.w + (x + ox)]) nearBright = true;
      }
    }
    if (!nearBright) continue;
    const level = lum(...get(body, x, y));
    const { radius } = polar(x, y, LCX, LCY);
    const numeral = y >= 78 && y <= 106 && x >= 208 && x <= 258 && level > 40;
    const shadow = level < sideBase(radius, x > LCX ? 1 : -1) - 6 || level > bg[Math.round(radius)] + 12;
    if (numeral || shadow) grown[y * dial.w + x] = 1;
  }
}
grown.forEach((value, index) => { mask[index] = value; });
let damage = 0;
for (let i = 0; i < mask.length; i += 1) damage += mask[i];
console.log('damage', damage);

function boxBlur(field, radius) {
  const w = dial.w;
  const h = dial.h;
  const tmp = new Float32Array(field.length);
  const out = new Float32Array(field.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = [0, 0, 0];
      let count = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = Math.max(0, Math.min(w - 1, x + k));
        const i = (y * w + xx) * 3;
        acc[0] += field[i];
        acc[1] += field[i + 1];
        acc[2] += field[i + 2];
        count += 1;
      }
      const o = (y * w + x) * 3;
      tmp[o] = acc[0] / count;
      tmp[o + 1] = acc[1] / count;
      tmp[o + 2] = acc[2] / count;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = [0, 0, 0];
      let count = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const yy = Math.max(0, Math.min(h - 1, y + k));
        const i = (yy * w + x) * 3;
        acc[0] += tmp[i];
        acc[1] += tmp[i + 1];
        acc[2] += tmp[i + 2];
        count += 1;
      }
      const o = (y * w + x) * 3;
      out[o] = acc[0] / count;
      out[o + 1] = acc[1] / count;
      out[o + 2] = acc[2] / count;
    }
  }
  return out;
}

const lit = new Float32Array(dial.w * dial.h * 3);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(body, x, y);
    const i = (y * dial.w + x) * 3;
    if (!mask[y * dial.w + x]) {
      lit[i] = px[0];
      lit[i + 1] = px[1];
      lit[i + 2] = px[2];
      continue;
    }
    const { radius, angle } = polar(x, y, LCX, LCY);
    const left = bilinear(body, ...cartesian(radius, Math.min(angle, -0.22), LCX, LCY));
    const right = bilinear(body, ...cartesian(radius, Math.max(angle, 0.22), LCX, LCY));
    const t = Math.max(0, Math.min(1, (angle + 0.22) / 0.44));
    lit[i] = left[0] * (1 - t) + right[0] * t;
    lit[i + 1] = left[1] * (1 - t) + right[1] * t;
    lit[i + 2] = left[2] * (1 - t) + right[2] * t;
  }
}
let low = lit;
for (let pass = 0; pass < 3; pass += 1) low = boxBlur(low, BLUR);

const donorField = new Float32Array(donorImg.width * donorImg.height * 3);
for (let y = 0; y < donorImg.height; y += 1) {
  for (let x = 0; x < donorImg.width; x += 1) {
    const px = get(donorImg, x, y);
    const i = (y * donorImg.width + x) * 3;
    donorField[i] = px[0];
    donorField[i + 1] = px[1];
    donorField[i + 2] = px[2];
  }
}
function blurDonor(radius) {
  const w = donorImg.width;
  const h = donorImg.height;
  const tmp = new Float32Array(donorField.length);
  const out = new Float32Array(donorField.length);
  const step = 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = [0, 0, 0];
      let count = 0;
      for (let k = -radius; k <= radius; k += step) {
        const xx = Math.max(0, Math.min(w - 1, x + k));
        const i = (y * w + xx) * 3;
        acc[0] += donorField[i];
        acc[1] += donorField[i + 1];
        acc[2] += donorField[i + 2];
        count += 1;
      }
      const o = (y * w + x) * 3;
      tmp[o] = acc[0] / count;
      tmp[o + 1] = acc[1] / count;
      tmp[o + 2] = acc[2] / count;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = [0, 0, 0];
      let count = 0;
      for (let k = -radius; k <= radius; k += step) {
        const yy = Math.max(0, Math.min(h - 1, y + k));
        const i = (yy * w + x) * 3;
        acc[0] += tmp[i];
        acc[1] += tmp[i + 1];
        acc[2] += tmp[i + 2];
        count += 1;
      }
      const o = (y * w + x) * 3;
      out[o] = acc[0] / count;
      out[o + 1] = acc[1] / count;
      out[o + 2] = acc[2] / count;
    }
  }
  return out;
}
const donorLow = blurDonor(8);
function donorAt(radius, angle) {
  const [x, y] = cartesian(mapRadius(radius), angle, DONOR_CX, DONOR_CY);
  const px = bilinear(donorImg, x, y);
  const xi = Math.max(0, Math.min(donorImg.width - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(donorImg.height - 1, Math.round(y)));
  const i = (yi * donorImg.width + xi) * 3;
  return {
    px,
    low: [donorLow[i], donorLow[i + 1], donorLow[i + 2]],
    clean: mapRadius(radius) > DONOR_IN + 4 && mapRadius(radius) < DONOR_OUT - 4 && lum(px[0], px[1], px[2]) < 90,
  };
}
function residual(radius, angle) {
  const sample = donorAt(radius, angle);
  return [0, 1, 2].map((channel) => sample.px[channel] - sample.low[channel]);
}

const donorRms = new Float32Array(240);
for (let radius = 50; radius < 210; radius += 1) {
  let energy = 0;
  let count = 0;
  for (let angle = -0.2; angle <= 0.2; angle += 0.02) {
    const hf = residual(radius, angle - 1.15);
    const delta = lum(hf[0] + 40, hf[1] + 40, hf[2] + 40) - 40;
    energy += delta * delta;
    count += 1;
  }
  donorRms[radius] = Math.sqrt(energy / Math.max(1, count)) || 1;
}
const leftRms = new Float32Array(240);
const rightRms = new Float32Array(240);
for (let radius = 50; radius < 210; radius += 1) {
  for (const [store, sign] of [[leftRms, -1], [rightRms, 1]]) {
    let energy = 0;
    let count = 0;
    for (let angle = 0.25; angle <= 0.42; angle += 0.02) {
      const [x, y] = cartesian(radius, sign * angle, LCX, LCY).map(Math.round);
      if (x < 1 || y < 1 || x >= dial.w - 1 || y >= dial.h - 1 || mask[y * dial.w + x]) continue;
      const px = get(body, x, y);
      if (lum(px[0], px[1], px[2]) > 90) continue;
      const i = (y * dial.w + x) * 3;
      const delta = lum(px[0], px[1], px[2]) - lum(low[i], low[i + 1], low[i + 2]);
      energy += delta * delta;
      count += 1;
    }
    store[radius] = Math.sqrt(energy / Math.max(1, count));
  }
}
console.log('left80', leftRms[80].toFixed(2), 'right80', rightRms[80].toFixed(2), 'donor80', donorRms[80].toFixed(2));

function build(kind) {
  const face = blank(dial.w, dial.h);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const px = get(body, x, y);
      if (!mask[y * dial.w + x]) {
        set(face, x, y, px[0], px[1], px[2], 255);
        continue;
      }
      const { radius, angle } = polar(x, y, LCX, LCY);
      const offsets = kind === 'A' ? [-1.15] : kind === 'B' ? [1.15] : [-1.15, 1.05];
      let hf;
      if (kind === 'D') {
        const samples = [-1.3, -0.85, 0.85, 1.3].map((offset) => residual(radius, angle + offset));
        hf = [0, 1, 2].map((channel) => {
          const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
          return values[1];
        });
      } else if (kind === 'C') {
        const left = residual(radius, angle - 1.15);
        const right = residual(radius, angle + 1.05);
        const t = Math.max(0, Math.min(1, (angle + 0.12) / 0.24));
        const s = t * t * (3 - 2 * t);
        hf = [0, 1, 2].map((channel) => left[channel] * (1 - s) + right[channel] * s);
      } else {
        hf = residual(radius, angle + offsets[0]);
      }
      const key = Math.max(50, Math.min(209, Math.round(radius)));
      const t = Math.max(0, Math.min(1, (angle + 0.16) / 0.32));
      const target = (leftRms[key] || 2) * (1 - t) + (rightRms[key] || 1) * t;
      const scale = Math.max(0.15, Math.min(1.4, target / (donorRms[key] || 1)));
      const i = (y * dial.w + x) * 3;
      const hfL = lum(hf[0], hf[1], hf[2]);
      let rgb = [0, 1, 2].map((channel) => low[i + channel] + hfL * scale);
      const base = lum(low[i], low[i + 1], low[i + 2]);
      const level = lum(rgb[0], rgb[1], rgb[2]);
      const cap = Math.max(4, target * 2.2);
      if (Math.abs(level - base) > cap) {
        const pull = cap / Math.abs(level - base);
        rgb = rgb.map((channel, index) => low[i + index] + (channel - low[i + index]) * pull);
      }
      set(face, x, y, clampByte(rgb[0]), clampByte(rgb[1]), clampByte(rgb[2]), 255);
    }
  }
  for (let y = 1; y < dial.h - 1; y += 1) {
    for (let x = 1; x < dial.w - 1; x += 1) {
      if (!mask[y * dial.w + x]) continue;
      let dist = 99;
      let outside = null;
      for (let oy = -5; oy <= 5; oy += 1) {
        for (let ox = -5; ox <= 5; ox += 1) {
          const xx = x + ox;
          const yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= dial.w || yy >= dial.h || mask[yy * dial.w + xx]) continue;
          const here = Math.hypot(ox, oy);
          if (here < dist) {
            dist = here;
            outside = get(body, xx, yy);
          }
        }
      }
      if (!outside || dist >= 2.2 || lum(outside[0], outside[1], outside[2]) > 110) continue;
      const here = get(face, x, y);
      const fade = dist / 2.2;
      set(face, x, y,
        clampByte(here[0] * fade + outside[0] * (1 - fade)),
        clampByte(here[1] * fade + outside[1] * (1 - fade)),
        clampByte(here[2] * fade + outside[2] * (1 - fade)),
        255);
    }
  }
  for (let radius = 163; radius <= 170; radius += 0.5) {
    for (let deg = 4.6; deg <= 6.2; deg += 0.2) {
      const from = bilinear(body, ...cartesian(radius, (deg * Math.PI) / 180, LCX, LCY));
      if (lum(from[0], from[1], from[2]) < 140) continue;
      const [x, y] = cartesian(radius, ((deg - 5.4) * Math.PI) / 180, LCX, LCY);
      set(face, Math.round(x), Math.round(y), clampByte(from[0]), clampByte(from[1]), clampByte(from[2]), 255);
    }
  }
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      if ((x - LCX) * (x - LCX) + (y - LCY) * (y - LCY) <= BOSS_R * BOSS_R) set(face, x, y, 0, 0, 0, 0);
    }
  }
  return face;
}

function boundaryScore(face) {
  let err = 0;
  let count = 0;
  for (let y = 1; y < dial.h - 1; y += 1) {
    for (let x = 1; x < dial.w - 1; x += 1) {
      if (!mask[y * dial.w + x]) continue;
      const here = get(face, x, y);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + ox;
        const yy = y + oy;
        if (mask[yy * dial.w + xx]) continue;
        const out = get(body, xx, yy);
        if (lum(out[0], out[1], out[2]) > 120) continue;
        err += Math.abs(here[0] - out[0]) + Math.abs(here[1] - out[1]) + Math.abs(here[2] - out[2]);
        count += 1;
      }
    }
  }
  return err / Math.max(1, count);
}
function radialSeries(face, angle) {
  const values = [];
  for (let radius = 60; radius <= 160; radius += 1) {
    const px = bilinear(face, ...cartesian(radius, angle, LCX, LCY));
    values.push(lum(px[0], px[1], px[2]));
  }
  return values;
}
function hfRms(values) {
  let energy = 0;
  for (let i = 2; i < values.length - 2; i += 1) {
    const smooth = (values[i - 2] + values[i - 1] + values[i] + values[i + 1] + values[i + 2]) / 5;
    energy += (values[i] - smooth) ** 2;
  }
  return Math.sqrt(energy / (values.length - 4));
}
function dominantPeriod(values) {
  let best = { period: 0, power: 0 };
  for (let period = 3; period <= 12; period += 1) {
    let sin = 0;
    let cos = 0;
    for (let i = 0; i < values.length; i += 1) {
      const w = (Math.PI * 2 * i) / period;
      sin += values[i] * Math.sin(w);
      cos += values[i] * Math.cos(w);
    }
    const power = sin * sin + cos * cos;
    if (power > best.power) best = { period, power };
  }
  return best;
}

const faces = {};
let best = null;
for (const kind of ['A', 'B', 'C', 'D']) {
  const face = build(kind);
  faces[kind] = face;
  const repair = radialSeries(face, 0);
  const neighbor = radialSeries(body, -0.4);
  const score = {
    boundary: boundaryScore(face),
    repairHf: hfRms(repair),
    neighborHf: hfRms(neighbor),
    repairPeriod: dominantPeriod(repair),
    neighborPeriod: dominantPeriod(neighbor),
  };
  score.gap = Math.abs(score.repairHf - score.neighborHf);
  console.log(kind, score);
  const total = score.boundary + score.gap * 3;
  if (!best || total < best.total) best = { kind, total, score, face };
}
console.log('chosen', best.kind, best.score);
const face = best.face;

function sourceNeedle(x, y) {
  const px = get(src, x, y);
  const level = lum(px[0], px[1], px[2]);
  if (level < 214 || px[0] < 240) return false;
  return level > lum(...get(src, x - 2, y)) + 24 && level > lum(...get(src, x + 2, y)) + 16;
}
const fixed = blank(dial.w, dial.h);
const glyph = new Uint8Array(dial.w * dial.h);
for (let y = 243; y <= 266; y += 1) {
  for (let x = 230; x <= 278; x += 1) {
    if (sourceNeedle(x, y)) continue;
    const px = get(src, x, y);
    const level = lum(px[0], px[1], px[2]);
    if (level < 64 || px[0] - px[2] > 48) continue;
    const localX = x - dial.x;
    const localY = y - dial.y;
    glyph[localY * dial.w + localX] = 1;
    set(fixed, localX, localY, px[0], px[1], px[2], 255);
  }
}
for (let y = 244; y <= 265; y += 1) {
  for (let x = 244; x <= 266; x += 1) {
    if (!sourceNeedle(x, y)) continue;
    let left = null;
    let right = null;
    for (let step = 1; step <= 3; step += 1) {
      const ly = y - dial.y;
      if (!left && glyph[ly * dial.w + (x - step - dial.x)]) left = get(fixed, x - step - dial.x, ly);
      if (!right && glyph[ly * dial.w + (x + step - dial.x)]) right = get(fixed, x + step - dial.x, ly);
    }
    if (!left || !right) continue;
    set(fixed, x - dial.x, y - dial.y,
      clampByte((left[0] + right[0]) / 2),
      clampByte((left[1] + right[1]) / 2),
      clampByte((left[2] + right[2]) / 2),
      255);
  }
}

const local = blank(dial.w, dial.h);
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    if (!mask[y * dial.w + x]) continue;
    const photo = get(src, dial.x + x, dial.y + y);
    if (lum(photo[0], photo[1], photo[2]) > 210) continue;
    const base = get(face, x, y);
    const delta = Math.abs(photo[0] - base[0]) + Math.abs(photo[1] - base[1]) + Math.abs(photo[2] - base[2]);
    if (delta < 18) continue;
    set(local, x, y, photo[0], photo[1], photo[2], clampByte(Math.min(150, delta)));
  }
}

const atlas = blank(donorImg.width, donorImg.height);
for (let y = 0; y < donorImg.height; y += 1) {
  for (let x = 0; x < donorImg.width; x += 1) {
    const { radius, angle } = polar(x, y, DONOR_CX, DONOR_CY);
    if (radius < DONOR_IN || radius > DONOR_OUT) continue;
    if (Math.abs(angle) < 0.18 && radius < 230) continue;
    const px = get(donorImg, x, y);
    if (lum(px[0], px[1], px[2]) > 80) continue;
    set(atlas, x, y, px[0], px[1], px[2], 255);
  }
}
const donorHfPng = blank(donorImg.width, donorImg.height);
for (let y = 0; y < donorImg.height; y += 4) {
  for (let x = 0; x < donorImg.width; x += 4) {
    const px = get(donorImg, x, y);
    const i = (y * donorImg.width + x) * 3;
    const hf = [0, 1, 2].map((channel) => 128 + (px[channel] - donorLow[i + channel]) * 4);
    set(donorHfPng, x, y, clampByte(hf[0]), clampByte(hf[1]), clampByte(hf[2]), 255);
  }
}

fs.writeFileSync(path.join(outDir, 'dial-body-empty.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-body.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-fixed-120.png'), PNG.sync.write(fixed));
fs.writeFileSync(path.join(outDir, 'needle-local-120.png'), PNG.sync.write(local));
fs.writeFileSync(path.join(preview, 'dial-clean-texture-donor-atlas.png'), PNG.sync.write(atlas));
fs.writeFileSync(path.join(preview, 'dial-donor-high-frequency.png'), PNG.sync.write(donorHfPng));

function cropOf(png, x, y, w, h) {
  const out = blank(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const px = get(png, x + xx, y + yy);
      set(out, xx, yy, px[3] < 8 ? 12 : px[0], px[3] < 8 ? 10 : px[1], px[3] < 8 ? 8 : px[2], 255);
    }
  }
  return out;
}
function rotate(png, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const out = blank(png.width, png.height);
  const cx = (png.width - 1) / 2;
  const cy = (png.height - 1) / 2;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cx + dx * Math.cos(rad) + dy * Math.sin(rad);
      const sy = cy - dx * Math.sin(rad) + dy * Math.cos(rad);
      const px = get(png, sx, sy);
      set(out, x, y, px[0], px[1], px[2], 255);
    }
  }
  return out;
}
function scale(png, factor) {
  const out = blank(png.width * factor, png.height * factor);
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const px = get(png, Math.floor(x / factor), Math.floor(y / factor));
      set(out, x, y, px[0], px[1], px[2], 255);
    }
  }
  return out;
}
function rotateLayer(png, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const out = blank(png.width, png.height);
  const cx = (png.width - 1) / 2;
  const cy = (png.height - 1) / 2;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cx + dx * Math.cos(rad) + dy * Math.sin(rad);
      const sy = cy - dx * Math.sin(rad) + dy * Math.cos(rad);
      const px = bilinear(png, sx, sy);
      const alpha = get(png, Math.round(sx), Math.round(sy))[3];
      if (alpha < 8) continue;
      set(out, x, y, clampByte(px[0]), clampByte(px[1]), clampByte(px[2]), alpha);
    }
  }
  return out;
}
function composite60(base, glyphLayer) {
  const out = blank(dial.w, dial.h);
  const shaft = rotateLayer(needle, -78);
  const shade = rotateLayer(shadow, -78);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      let px = get(base, x, y);
      const layers = [glyphLayer, shade, shaft, boss];
      for (const layer of layers) {
        const over = get(layer, x, y);
        const a = over[3] / 255;
        if (a <= 0) continue;
        px = [0, 1, 2].map((channel) => over[channel] * a + px[channel] * (1 - a));
      }
      set(out, x, y, clampByte(px[0]), clampByte(px[1]), clampByte(px[2]), 255);
    }
  }
  return out;
}

const neutral = cropOf(face, 130, 18, 200, 230);
fs.writeFileSync(path.join(preview, 'dial-neutral-original-size.png'), PNG.sync.write(neutral));
fs.writeFileSync(path.join(preview, 'dial-neutral-2x.png'), PNG.sync.write(scale(neutral, 2)));
fs.writeFileSync(path.join(preview, 'dial-neutral-4x.png'), PNG.sync.write(scale(neutral, 4)));
for (const degrees of [0, 45, 90, 135, 180]) {
  fs.writeFileSync(path.join(preview, `dial-neutral-${degrees}deg.png`), PNG.sync.write(rotate(neutral, degrees)));
}
for (const kind of ['A', 'B', 'C', 'D']) {
  const shot = cropOf(composite60(faces[kind], fixed), 130, 18, 200, 230);
  fs.writeFileSync(path.join(preview, `candidate-${kind.toLowerCase()}-60.png`), PNG.sync.write(scale(shot, 2)));
}
const lowPng = blank(neutral.width, neutral.height);
const high = blank(neutral.width, neutral.height);
for (let y = 0; y < neutral.height; y += 1) {
  for (let x = 0; x < neutral.width; x += 1) {
    const sx = 130 + x;
    const sy = 18 + y;
    const i = (sy * dial.w + sx) * 3;
    const px = get(neutral, x, y);
    set(lowPng, x, y, clampByte(low[i]), clampByte(low[i + 1]), clampByte(low[i + 2]), 255);
    set(high, x, y,
      clampByte(128 + (px[0] - low[i]) * 3),
      clampByte(128 + (px[1] - low[i + 1]) * 3),
      clampByte(128 + (px[2] - low[i + 2]) * 3),
      255);
  }
}
fs.writeFileSync(path.join(preview, 'dial-neutral-low-frequency.png'), PNG.sync.write(lowPng));
fs.writeFileSync(path.join(preview, 'dial-neutral-high-frequency.png'), PNG.sync.write(high));
const falseColor = blank(neutral.width, neutral.height);
for (let y = 0; y < neutral.height; y += 1) {
  for (let x = 0; x < neutral.width; x += 1) {
    const px = get(neutral, x, y);
    const base = get(lowPng, x, y);
    const delta = lum(px[0], px[1], px[2]) - lum(base[0], base[1], base[2]);
    const mag = Math.min(255, Math.abs(delta) * 8);
    set(falseColor, x, y, delta > 0 ? mag : 0, 30, delta < 0 ? mag : 0, 255);
  }
}
fs.writeFileSync(path.join(preview, 'dial-repair-falsecolor.png'), PNG.sync.write(falseColor));
fs.writeFileSync(path.join(preview, 'dial-fixed-120-closeup.png'), PNG.sync.write(scale(cropOf(fixed, 205, 75, 70, 40), 4)));
fs.writeFileSync(path.join(preview, 'dial-fixed-120-previous-closeup.png'), PNG.sync.write(scale(cropOf(PNG.sync.read(fs.readFileSync(path.join(preview, 'dial-fixed-120-rebuilt-previous.png'))), 205, 75, 70, 40), 4)));

const repairSeries = radialSeries(face, 0);
const leftSeries = radialSeries(body, -0.42);
const rightSeries = radialSeries(body, 0.42);
function gradientHist(series) {
  const bins = [0, 0, 0, 0];
  for (let i = 1; i < series.length; i += 1) {
    const g = Math.abs(series[i] - series[i - 1]);
    bins[Math.min(3, Math.floor(g / 4))] += 1;
  }
  return bins;
}
const qa = {
  chosen: best.kind,
  boundary: best.score.boundary,
  repairHf: hfRms(repairSeries),
  leftHf: hfRms(leftSeries),
  rightHf: hfRms(rightSeries),
  repairPeriod: dominantPeriod(repairSeries),
  leftPeriod: dominantPeriod(leftSeries),
  rightPeriod: dominantPeriod(rightSeries),
  repairGradient: gradientHist(repairSeries),
  leftGradient: gradientHist(leftSeries),
  damage,
};
fs.writeFileSync(path.join(preview, 'texture-qa.json'), JSON.stringify(qa, null, 2));
console.log(qa);
console.log('donor texture built');
