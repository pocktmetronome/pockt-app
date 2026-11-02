'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/screen-reference.png')));
const outDir = path.join(root, 'assets/north-star-v4/parts');
const preview = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(preview, { recursive: true });

const CX = 249;
const CY = 390;
const BOSS_R = 46;
const dial = { x: 21, y: 162, w: 456, h: 456 };
const WEDGE = 0.16;
const FEATHER = 3.2;

function lum(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function get(img, x, y) {
  const xx = Math.max(0, Math.min(img.width - 1, Math.round(x)));
  const yy = Math.max(0, Math.min(img.height - 1, Math.round(y)));
  const i = (yy * img.width + xx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
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
function sample(radius, angle) {
  return get(src, CX + Math.sin(angle) * radius, CY - Math.cos(angle) * radius);
}
function median(bag) {
  if (!bag.length) return [16, 14, 12];
  const channels = [0, 1, 2].map((channel) => {
    const values = bag.map((px) => px[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  return channels;
}
function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
function cosine(t) {
  const x = Math.max(0, Math.min(1, t));
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

const body = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(src, dial.x + x, dial.y + y);
    set(body, x, y, px[0], px[1], px[2], 255);
  }
}

const needle = PNG.sync.read(fs.readFileSync(path.join(outDir, 'needle-shaft.png')));
const estimateCache = new Map();

function sideEstimate(radius, sign) {
  const key = `${Math.round(radius)}:${sign}`;
  if (estimateCache.has(key)) return estimateCache.get(key);
  const bag = [];
  for (let k = 0; k < 14; k += 1) {
    const angle = sign * (0.2 + 0.012 * k);
    const px = sample(radius, angle);
    if (lum(px[0], px[1], px[2]) > 80) continue;
    bag.push(px);
  }
  const value = median(bag);
  estimateCache.set(key, value);
  return value;
}

const hard = new Uint8Array(dial.w * dial.h);

for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const sx = dial.x + x;
    const sy = dial.y + y;
    const dx = sx - CX;
    const dy = sy - CY;
    const radius = Math.hypot(dx, dy);
    if (radius < BOSS_R - 1 || radius > 200) continue;
    const angle = Math.atan2(dx, -dy);
    if (Math.abs(angle) > 0.28) continue;
    const srcPx = get(src, sx, sy);
    const L = lum(srcPx[0], srcPx[1], srcPx[2]);
    const left = sideEstimate(radius, -1);
    const right = sideEstimate(radius, 1);
    const predicted = lum(left[0], left[1], left[2]) * 0.5 + lum(right[0], right[1], right[2]) * 0.5;
    const tick = radius >= 162 && radius <= 184 && L > 90 && Math.abs(angle) > 0.05;
    const shaft = needle.data[(y * needle.width + x) * 4 + 3] > 40;
    const glow = !tick && L > predicted + 18 && L > 40 && Math.abs(angle) < 0.18;
    const numeral = sx >= 230 && sx <= 278 && sy >= 238 && sy <= 270 && L > 48;
    if (!tick && (shaft || glow || numeral)) hard[y * dial.w + x] = 1;
  }
}

for (let y = 2; y < dial.h - 2; y += 1) {
  for (let x = 2; x < dial.w - 2; x += 1) {
    const index = y * dial.w + x;
    if (hard[index]) continue;
    const sx = dial.x + x;
    const sy = dial.y + y;
    const radius = Math.hypot(sx - CX, sy - CY);
    if (radius < BOSS_R - 1 || radius > 200) continue;
    const angle = Math.atan2(sx - CX, -(sy - CY));
    if (Math.abs(angle) > 0.16) continue;
    const srcPx = get(src, sx, sy);
    const L = lum(srcPx[0], srcPx[1], srcPx[2]);
    if (radius >= 162 && radius <= 184 && L > 90) continue;
    const floor = Math.min(lum(...sideEstimate(radius, -1)), lum(...sideEstimate(radius, 1)));
    if (L > floor - 12) continue;
    let near = false;
    for (let oy = -6; oy <= 6 && !near; oy += 1) {
      for (let ox = -5; ox <= 5; ox += 1) {
        if (hard[(y + oy) * dial.w + (x + ox)] && Math.hypot(ox, oy) < 6.5) near = true;
      }
    }
    if (near) hard[index] = 1;
  }
}

const spanMin = new Float32Array(230).fill(1);
const spanMax = new Float32Array(230).fill(-1);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    if (!hard[y * dial.w + x]) continue;
    const radius = Math.hypot(dial.x + x - CX, dial.y + y - CY);
    const angle = Math.atan2(dial.x + x - CX, -(dial.y + y - CY));
    const bucket = Math.round(radius);
    if (angle < spanMin[bucket]) spanMin[bucket] = angle;
    if (angle > spanMax[bucket]) spanMax[bucket] = angle;
  }
}
const spanMin0 = spanMin.slice();
const spanMax0 = spanMax.slice();
for (let radius = 48; radius <= 202; radius += 1) {
  const neighbors = [radius - 1, radius, radius + 1].filter((value) => spanMax0[value] > spanMin0[value]);
  if (!neighbors.length) continue;
  spanMin[radius] = Math.min(...neighbors.map((value) => spanMin0[value]));
  spanMax[radius] = Math.max(...neighbors.map((value) => spanMax0[value]));
}

const edgeCache = new Map();
function edgeColor(radius, edge, sign) {
  const key = `${Math.round(radius)}:${edge.toFixed(3)}:${sign}`;
  if (edgeCache.has(key)) return edgeCache.get(key);
  const bag = [];
  for (let k = 2; k <= 9; k += 1) {
    const px = sample(radius, edge + sign * 0.014 * k);
    if (lum(px[0], px[1], px[2]) > 82) continue;
    bag.push(px);
  }
  const value = median(bag);
  edgeCache.set(key, value);
  return value;
}

const featherAngle = 0.055;

function grain(radius, angle) {
  const here = sample(radius, angle);
  if (lum(here[0], here[1], here[2]) > 76) return [0, 0, 0];
  const blur = [0, 0, 0];
  let count = 0;
  for (const delta of [-3, -2, -1, 1, 2, 3]) {
    const px = sample(radius + delta, angle);
    if (lum(px[0], px[1], px[2]) > 76) continue;
    blur[0] += px[0];
    blur[1] += px[1];
    blur[2] += px[2];
    count += 1;
  }
  if (!count) return [0, 0, 0];
  return [0, 1, 2].map((channel) => Math.max(-16, Math.min(16, here[channel] - blur[channel] / count)));
}
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const sx = dial.x + x;
    const sy = dial.y + y;
    const radius = Math.hypot(sx - CX, sy - CY);
    if (radius < BOSS_R - 1 || radius > 202) continue;
    const bucket = Math.round(radius);
    if (spanMax[bucket] < spanMin[bucket]) continue;
    const angle = Math.atan2(sx - CX, -(sy - CY));
    const leftA = spanMin[bucket];
    const rightA = spanMax[bucket];
    if (angle < leftA - featherAngle || angle > rightA + featherAngle) continue;
    const tick = radius >= 162 && radius <= 184 && Math.abs(angle) > 0.05;
    const existing = get(body, x, y);
    if (tick && lum(existing[0], existing[1], existing[2]) > 90) continue;
    const left = edgeColor(radius, leftA, -1);
    const right = edgeColor(radius, rightA, 1);
    const span = Math.max(0.03, rightA - leftA);
    const t = cosine((angle - leftA) / span);
    const donorAngle = t < 0.5 ? leftA - 0.09 : rightA + 0.09;
    const detail = grain(radius, donorAngle);
    const interior = angle >= leftA && angle <= rightA ? 1 : 0;
    const color = [0, 1, 2].map((channel) => left[channel] * (1 - t) + right[channel] * t + detail[channel] * 0.8 * interior);
    let amount = 1;
    if (angle < leftA) amount = smoothstep((angle - (leftA - featherAngle)) / featherAngle);
    if (angle > rightA) amount = smoothstep((rightA + featherAngle - angle) / featherAngle);
    const mixed = [0, 1, 2].map((channel) => Math.round(color[channel] * amount + existing[channel] * (1 - amount)));
    set(body, x, y, Math.max(0, Math.min(255, mixed[0])), Math.max(0, Math.min(255, mixed[1])), Math.max(0, Math.min(255, mixed[2])), 255);
  }
}

// Pull isolated dark notches beside the repaired span back to their angular neighbors.
for (let pass = 0; pass < 2; pass += 1) {
  const next = Buffer.from(body.data);
  for (let y = 1; y < dial.h - 1; y += 1) {
    for (let x = 1; x < dial.w - 1; x += 1) {
      const sx = dial.x + x;
      const sy = dial.y + y;
      const radius = Math.hypot(sx - CX, sy - CY);
      if (radius < BOSS_R || radius > 190) continue;
      const angle = Math.atan2(sx - CX, -(sy - CY));
      if (Math.abs(angle) > 0.14) continue;
      if (radius >= 162 && radius <= 184) continue;
      const here = get(body, x, y);
      const L = lum(here[0], here[1], here[2]);
      if (L > 70) continue;
      const leftPx = get(body, Math.round(CX + Math.sin(angle - 0.07) * radius) - dial.x, Math.round(CY - Math.cos(angle - 0.07) * radius) - dial.y);
      const rightPx = get(body, Math.round(CX + Math.sin(angle + 0.07) * radius) - dial.x, Math.round(CY - Math.cos(angle + 0.07) * radius) - dial.y);
      const leftL = lum(leftPx[0], leftPx[1], leftPx[2]);
      const rightL = lum(rightPx[0], rightPx[1], rightPx[2]);
      const darker = leftL < rightL ? leftPx : rightPx;
      const darkerL = Math.min(leftL, rightL);
      if (L > darkerL - 4) continue;
      const i = (y * dial.w + x) * 4;
      next[i] = darker[0];
      next[i + 1] = darker[1];
      next[i + 2] = darker[2];
    }
  }
  body.data.set(next);
}

// Restore the center tick from the clean minor tick just clockwise of 12.
for (let radius = 162; radius <= 180; radius += 0.5) {
  for (let deg = 4.6; deg <= 6.6; deg += 0.2) {
    const fromAngle = (deg * Math.PI) / 180;
    const from = sample(radius, fromAngle);
    if (lum(from[0], from[1], from[2]) < 120) continue;
    const toAngle = fromAngle - (5.6 * Math.PI) / 180;
    const x = Math.round(CX + Math.sin(toAngle) * radius) - dial.x;
    const y = Math.round(CY - Math.cos(toAngle) * radius) - dial.y;
    set(body, x, y, from[0], from[1], from[2], 255);
  }
}

for (let y = 0; y < BOSS_R * 2; y += 1) {
  for (let x = 0; x < BOSS_R * 2; x += 1) {
    const dx = x - BOSS_R + 0.5;
    const dy = y - BOSS_R + 0.5;
    if (dx * dx + dy * dy > BOSS_R * BOSS_R) continue;
    set(body, CX - BOSS_R + x - dial.x, CY - BOSS_R + y - dial.y, 0, 0, 0, 0);
  }
}

function blitDigit(img, srcBox, destBox, recolor) {
  const [sx, sy, sw, sh] = srcBox;
  const [dx, dy, dw, dh] = destBox;
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const px = get(src, sx + ((x + 0.5) * sw) / dw, sy + ((y + 0.5) * sh) / dh);
      const L = lum(px[0], px[1], px[2]);
      const alpha = Math.max(0, Math.min(255, Math.round(((L - 55) / 145) * 255)));
      if (alpha < 8) continue;
      const rgb = recolor
        ? recolor.map((channel) => Math.max(0, Math.min(255, Math.round(channel * (L / 230)))))
        : [px[0], px[1], px[2]];
      const lx = Math.round(dx + x) - dial.x;
      const ly = Math.round(dy + y) - dial.y;
      set(img, lx, ly, rgb[0], rgb[1], rgb[2], alpha);
    }
  }
}

const fixed = blank(dial.w, dial.h);
const cream = [236, 226, 210];
blitDigit(fixed, [234, 244, 12, 22], [234, 244, 12, 22], null);
blitDigit(fixed, [343, 293, 13, 17], [247, 245, 13, 19], cream);
blitDigit(fixed, [262, 244, 14, 22], [262, 244, 14, 22], null);

fs.writeFileSync(path.join(outDir, 'dial-body-empty.png'), PNG.sync.write(body));
fs.writeFileSync(path.join(outDir, 'dial-body.png'), PNG.sync.write(body));
fs.writeFileSync(path.join(outDir, 'dial-fixed-120.png'), PNG.sync.write(fixed));

function zoom(png, x, y, w, h, scale, name) {
  const out = blank(w * scale, h * scale);
  for (let yy = 0; yy < out.height; yy += 1) {
    for (let xx = 0; xx < out.width; xx += 1) {
      const px = get(png, x + Math.floor(xx / scale), y + Math.floor(yy / scale));
      const dark = ((Math.floor(xx / 8) + Math.floor(yy / 8)) % 2) === 0;
      const rgb = px[3] < 8 ? (dark ? [18, 18, 22] : [36, 36, 42]) : px;
      set(out, xx, yy, rgb[0], rgb[1], rgb[2], 255);
    }
  }
  fs.writeFileSync(path.join(preview, name), PNG.sync.write(out));
}
const stacked = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const base = get(body, x, y);
    const ink = get(fixed, x, y);
    const w = ink[3] / 255;
    const rgb = [0, 1, 2].map((channel) => Math.round(ink[channel] * w + base[channel] * (1 - w)));
    set(stacked, x, y, rgb[0], rgb[1], rgb[2], 255);
  }
}
zoom(body, 150, 30, 160, 210, 3, 'dial-empty-12oclock-closeup.png');
zoom(fixed, 200, 70, 90, 50, 5, 'dial-fixed-120-closeup.png');
zoom(stacked, 160, 40, 140, 120, 3, 'dial-face-with-120-closeup.png');
console.log('rebuilt');
