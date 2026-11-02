'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'assets/north-star-v4/screen-reference.png');
const outDir = path.join(root, 'assets/north-star-v4/parts');
const previewDir = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(previewDir, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(srcPath));
const CX = 249;
const CY = 390;
const R = 228;
const BOSS_R = 46;
const dialRect = { x: CX - R, y: CY - R, w: R * 2, h: R * 2 };

function lum(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function get(img, x, y) {
  const xx = Math.max(0, Math.min(img.width - 1, x));
  const yy = Math.max(0, Math.min(img.height - 1, y));
  const i = (yy * img.width + xx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function set(img, x, y, r, g, b, a = 255) {
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
function clone(img) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  return png;
}

// Source-space polygon. dx is relative to CX. Chosen from the measured shaft,
// widened for bronze edges and shadow, and held narrow through the printed 120.
const PROFILE = [
  [208, -3, 5],
  [218, -8, 10],
  [230, -5, 8],
  [243, -4, 6],
  [266, -4, 6],
  [278, -5, 4],
  [296, -6, 5],
  [318, -8, 7],
  [336, -10, 8],
  [352, -12, 10],
  [364, -13, 11],
];

function profileBounds(y) {
  if (y <= PROFILE[0][0] || y >= PROFILE[PROFILE.length - 1][0]) return null;
  let i = 0;
  while (i < PROFILE.length - 1 && PROFILE[i + 1][0] < y) i += 1;
  const a = PROFILE[i];
  const b = PROFILE[i + 1];
  const t = (y - a[0]) / (b[0] - a[0]);
  return {
    left: a[1] + (b[1] - a[1]) * t - 2,
    right: a[2] + (b[2] - a[2]) * t + 2,
  };
}

function inShaft(x, y, narrow) {
  const dx = x - CX;
  const dy = y - CY;
  if (dx * dx + dy * dy < (BOSS_R - 2) * (BOSS_R - 2)) return false;
  const bounds = profileBounds(y);
  if (!bounds) return false;
  // The body hole is wider than the sprite so the glow fringe is painted out.
  // Through the printed 120 the hole stays a thin cut so the digit can be rebuilt.
  if (narrow && y >= 244 && y <= 265) return dx >= -2 && dx <= 3;
  const extra = narrow ? 3 : 0;
  return dx >= bounds.left - extra && dx <= bounds.right + extra;
}

function inNeedle(x, y) {
  return inShaft(x, y, true);
}

function cropDial(img) {
  const png = blank(dialRect.w, dialRect.h);
  for (let y = 0; y < dialRect.h; y += 1) {
    for (let x = 0; x < dialRect.w; x += 1) {
      const [r, g, b, a] = get(img, dialRect.x + x, dialRect.y + y);
      set(png, x, y, r, g, b, a);
    }
  }
  return png;
}

const body = cropDial(src);
const needle = blank(dialRect.w, dialRect.h);
let needlePixels = 0;

function angularSamples(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const radius = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dx, -dy);
  const found = [];
  for (const delta of [0.07, -0.07, 0.12, -0.12, 0.18, -0.18, 0.26, -0.26]) {
    const a = angle + delta;
    const sx = Math.round(CX + Math.sin(a) * radius);
    const sy = Math.round(CY - Math.cos(a) * radius);
    if (inNeedle(sx, sy)) continue;
    const px = get(src, sx, sy);
    const L = lum(px[0], px[1], px[2]);
    if (radius > 50 && radius < 200 && L > 78 && (radius < 158 || radius > 186)) continue;
    found.push(px);
  }
  return found;
}

function sideFill(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const radius = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dx, -dy);
  const tickRing = radius >= 164 && radius <= 178;
  let left = null;
  let right = null;
  for (let step = 6; step <= 48 && (!left || !right); step += 1) {
    for (const dir of [-1, 1]) {
      if ((dir < 0 && left) || (dir > 0 && right)) continue;
      const a = angle + dir * step * 0.014;
      const sx = Math.round(CX + Math.sin(a) * radius);
      const sy = Math.round(CY - Math.cos(a) * radius);
      if (inShaft(sx, sy, true)) continue;
      const px = get(src, sx, sy);
      const sampleL = lum(px[0], px[1], px[2]);
      if (!tickRing && sampleL > 90) continue;
      if (dir < 0) left = { px, step };
      else right = { px, step };
    }
  }
  if (left && right) {
    const t = left.step / (left.step + right.step);
    return [0, 1, 2].map((channel) => Math.round(left.px[channel] * (1 - t) + right.px[channel] * t));
  }
  const fallback = left || right;
  return fallback ? fallback.px.slice(0, 3) : [14, 12, 10];
}

function digitBridge(x, y) {
  let xl = x;
  let xr = x;
  while (xl > CX - 36 && inNeedle(xl, y)) xl -= 1;
  while (xr < CX + 36 && inNeedle(xr, y)) xr += 1;
  const left = get(src, xl, y);
  const right = get(src, xr, y);
  const lL = lum(left[0], left[1], left[2]);
  const rL = lum(right[0], right[1], right[2]);
  if (lL > 150 && rL > 150) return lL >= rL ? left : right;
  if (x - xl <= 2 && lL > 160) return left;
  if (xr - x <= 2 && rL > 160) return right;
  return null;
}

function restoredTick(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const radius = Math.hypot(dx, dy);
  if (radius < 164 || radius > 178) return null;
  const angle = Math.atan2(dx, -dy);
  let best = null;
  let bestL = 0;
  for (const delta of [0.05, -0.05, 0.09, -0.09]) {
    const a = angle + delta;
    const sx = Math.round(CX + Math.sin(a) * radius);
    const sy = Math.round(CY - Math.cos(a) * radius);
    if (inNeedle(sx, sy)) continue;
    const px = get(src, sx, sy);
    const L = lum(px[0], px[1], px[2]);
    if (L > bestL) {
      bestL = L;
      best = px;
    }
  }
  if (!best || bestL < 90) return null;
  return best;
}

for (let y = dialRect.y; y < dialRect.y + dialRect.h; y += 1) {
  for (let x = dialRect.x; x < dialRect.x + dialRect.w; x += 1) {
    const sprite = inShaft(x, y, false);
    const hole = inShaft(x, y, true);
    if (!sprite && !hole) continue;
    const lx = x - dialRect.x;
    const ly = y - dialRect.y;
    if (sprite) {
      let shaft = get(src, x, y);
      if (y >= 244 && y <= 265) {
        const above = get(src, x, 236);
        const below = get(src, x, 270);
        const t = (y - 244) / 21;
        shaft = [0, 1, 2].map((channel) => Math.round(above[channel] * (1 - t) + below[channel] * t));
      }
      set(needle, lx, ly, shaft[0], shaft[1], shaft[2], 255);
      needlePixels += 1;
    }
    if (!hole) continue;
    const bridged = y >= 244 && y <= 265 ? digitBridge(x, y) : null;
    const tick = restoredTick(x, y);
    const chosen = bridged || tick || sideFill(x, y);
    set(body, lx, ly, chosen[0], chosen[1], chosen[2], 255);
  }
}

// Snapshot the fixed 120 so the polar rebuild can pass underneath it
// and the numeral can be stamped back afterward.
const numeralSnap = clone(body);

// Polar rebuild of the old needle corridor. Anchors sit outside the shaft,
// the glow, and the previous fill, at the same radius on both sides.
function halfAngle(radius) {
  if (radius >= 158 && radius <= 184) return Math.atan2(6, radius);
  const px = 12;
  return Math.max(0.045, Math.min(0.12, Math.atan2(px, Math.max(radius, 48))));
}

function sampleRing(radius, angle) {
  const x = Math.round(CX + Math.sin(angle) * radius);
  const y = Math.round(CY - Math.cos(angle) * radius);
  return get(src, x, y);
}

function anchorColor(radius, sign) {
  let start = sign * (halfAngle(radius) + 0.02);
  for (let k = 0; k < 16; k += 1) {
    const angle = sign * (halfAngle(radius) + 0.02 + k * 0.012);
    const x = Math.round(CX + Math.sin(angle) * radius);
    const y = Math.round(CY - Math.cos(angle) * radius);
    if (inShaft(x, y, true)) continue;
    const px = get(src, x, y);
    if (lum(px[0], px[1], px[2]) > 95) continue;
    start = angle;
    break;
  }
  const bag = [];
  for (let k = 0; k < 5; k += 1) {
    const px = sampleRing(radius, start + sign * k * 0.01);
    if (lum(px[0], px[1], px[2]) > 95) continue;
    bag.push(px);
  }
  if (!bag.length) return { px: sampleRing(radius, start), angle: start };
  bag.sort((a, b) => lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]));
  return { px: bag[Math.floor(bag.length / 2)], angle: start };
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

for (let y = dialRect.y; y < dialRect.y + dialRect.h; y += 1) {
  for (let x = dialRect.x; x < dialRect.x + dialRect.w; x += 1) {
    const dx = x - CX;
    const dy = y - CY;
    const radius = Math.hypot(dx, dy);
    if (radius < BOSS_R + 2 || radius > 206) continue;
    const angle = Math.atan2(dx, -dy);
    const half = halfAngle(radius);
    const feather = 0.03;
    const inHole = inShaft(x, y, true);
    const limit = half + feather;
    if (!inHole && Math.abs(angle) > limit) continue;
    const left = anchorColor(radius, -1);
    const right = anchorColor(radius, 1);
    const span = Math.max(0.04, right.angle - left.angle);
    const clamped = Math.max(0, Math.min(1, (angle - left.angle) / span));
    const base = [0, 1, 2].map((channel) => left.px[channel] * (1 - clamped) + right.px[channel] * clamped);
    const grainSign = angle < 0 ? -1 : 1;
    const grain = sampleRing(radius, (grainSign < 0 ? left.angle : right.angle) + grainSign * 0.04);
    const grainAnchor = grainSign < 0 ? left.px : right.px;
    const grainL = lum(grain[0], grain[1], grain[2]);
    const color = base.map((channel, index) => {
      if (grainL > 100) return channel;
      return channel + (grain[index] - grainAnchor[index]) * 0.55;
    });
    let weight = 1;
    if (!inHole && Math.abs(angle) > half) weight = smoothstep((limit - Math.abs(angle)) / feather);
    const lx = x - dialRect.x;
    const ly = y - dialRect.y;
    const existing = get(body, lx, ly);
    const mixed = [0, 1, 2].map((channel) => Math.round(color[channel] * weight + existing[channel] * (1 - weight)));
    set(body, lx, ly, Math.max(0, Math.min(255, mixed[0])), Math.max(0, Math.min(255, mixed[1])), Math.max(0, Math.min(255, mixed[2])), 255);
  }
}

for (let y = 244; y <= 266; y += 1) {
  for (let dx = -20; dx <= 22; dx += 1) {
    const lx = CX + dx - dialRect.x;
    const ly = y - dialRect.y;
    const ink = get(numeralSnap, lx, ly);
    if (lum(ink[0], ink[1], ink[2]) < 140) continue;
    set(body, lx, ly, ink[0], ink[1], ink[2], 255);
  }
}

for (let y = dialRect.y; y < dialRect.y + dialRect.h; y += 1) {
  for (let x = dialRect.x; x < dialRect.x + dialRect.w; x += 1) {
    const tick = restoredTick(x, y);
    if (!tick) continue;
    const dx = x - CX;
    const dy = y - CY;
    if (Math.abs(Math.atan2(dx, -dy)) > 0.045) continue;
    set(body, x - dialRect.x, y - dialRect.y, tick[0], tick[1], tick[2], 255);
  }
}

// The needle shadow cuts the top and bottom bars of the printed 120.
// Bridge only those short horizontal gaps. Leave the digit counters dark.
function numeralInk(x, y) {
  if (inShaft(x, y, false)) return 0;
  return lum(...get(src, x, y));
}

for (const y of [246, 247, 248, 249, 261]) {
  for (let dx = -10; dx <= 6; dx += 1) {
    const x = CX + dx;
    const lx = x - dialRect.x;
    const ly = y - dialRect.y;
    const current = get(body, lx, ly);
    if (lum(current[0], current[1], current[2]) > 150) continue;
    let left = null;
    let right = null;
    for (let d = 1; d <= 14; d += 1) {
      if (!left && numeralInk(x - d, y) > 180) left = get(src, x - d, y);
      if (!right && numeralInk(x + d, y) > 180) right = get(src, x + d, y);
    }
    if (!left || !right) continue;
    const ink = lum(...left) >= lum(...right) ? left : right;
    set(body, lx, ly, ink[0], ink[1], ink[2], 255);
  }
}

// Boss stays a separate overlay. Clear it from the body so it is not painted twice.
for (let y = 0; y < BOSS_R * 2; y += 1) {
  for (let x = 0; x < BOSS_R * 2; x += 1) {
    const dx = x - BOSS_R + 0.5;
    const dy = y - BOSS_R + 0.5;
    if (dx * dx + dy * dy > BOSS_R * BOSS_R) continue;
    const lx = CX - BOSS_R + x - dialRect.x;
    const ly = CY - BOSS_R + y - dialRect.y;
    set(body, lx, ly, 0, 0, 0, 0);
  }
}

function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}
write('dial-body.png', body);
write('dial-body-empty.png', body);
write('needle.png', needle);
write('needle-shaft.png', needle);

// Reference rebuild: body + needle + boss must match the source dial.
const boss = PNG.sync.read(fs.readFileSync(path.join(outDir, 'boss.png')));
const rebuilt = clone(body);
for (let y = 0; y < needle.height; y += 1) {
  for (let x = 0; x < needle.width; x += 1) {
    const px = get(needle, x, y);
    if (px[3] < 8) continue;
    set(rebuilt, x, y, px[0], px[1], px[2], 255);
  }
}
for (let y = 0; y < boss.height; y += 1) {
  for (let x = 0; x < boss.width; x += 1) {
    const px = get(boss, x, y);
    if (px[3] < 8) continue;
    const lx = CX - BOSS_R + x - dialRect.x;
    const ly = CY - BOSS_R + y - dialRect.y;
    set(rebuilt, lx, ly, px[0], px[1], px[2], 255);
  }
}
let err = 0;
let n = 0;
let worst = 0;
for (let y = 0; y < dialRect.h; y += 1) {
  for (let x = 0; x < dialRect.w; x += 1) {
    const a = get(src, dialRect.x + x, dialRect.y + y);
    const b = get(rebuilt, x, y);
    const d = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    err += d;
    n += 1;
    if (d > worst) worst = d;
  }
}

// Residue: bright shaft pixels left on the body inside the polygon, outside the 120 rows.
let shaftLeft = 0;
for (let y = 212; y <= 360; y += 1) {
  if (y >= 244 && y <= 265) continue;
  for (let x = CX - 16; x <= CX + 16; x += 1) {
    if (!inNeedle(x, y)) continue;
    const px = get(body, x - dialRect.x, y - dialRect.y);
    if (lum(px[0], px[1], px[2]) > 90) shaftLeft += 1;
  }
}

function zoom(png, x, y, w, h, scale) {
  const out = blank(w * scale, h * scale);
  for (let yy = 0; yy < out.height; yy += 1) {
    for (let xx = 0; xx < out.width; xx += 1) {
      const sx = x + Math.floor(xx / scale);
      const sy = y + Math.floor(yy / scale);
      const px = get(png, sx, sy);
      const dark = ((Math.floor(xx / 8) + Math.floor(yy / 8)) % 2) === 0;
      if (px[3] < 8) set(out, xx, yy, dark ? 16 : 36, dark ? 16 : 36, dark ? 20 : 40, 255);
      else set(out, xx, yy, px[0], px[1], px[2], 255);
    }
  }
  return out;
}
fs.writeFileSync(path.join(previewDir, 'dial-body-empty-zoom.png'), PNG.sync.write(zoom(body, 160, 40, 140, 280, 2)));
fs.writeFileSync(path.join(previewDir, 'needle-shaft-zoom.png'), PNG.sync.write(zoom(needle, 180, 40, 100, 280, 3)));
fs.writeFileSync(path.join(previewDir, 'dial-120-numeral.png'), PNG.sync.write(zoom(body, 190, 70, 80, 70, 4)));

console.log(JSON.stringify({ needlePixels, mae: err / n, worst, shaftLeft }, null, 2));
