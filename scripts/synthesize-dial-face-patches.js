'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/screen-reference.png')));
const needle = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/parts/needle-shaft.png')));
const outDir = path.join(root, 'assets/north-star-v4/parts');
const preview = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(preview, { recursive: true });

const BOSS_R = 46;
const dial = { x: 21, y: 162, w: 456, h: 456 };
const LCX = 228;
const LCY = 228;

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
function polar(x, y) {
  return {
    radius: Math.hypot(x - LCX, y - LCY),
    angle: Math.atan2(x - LCX, LCY - y),
  };
}
function cartesian(radius, angle) {
  return [LCX + Math.sin(angle) * radius, LCY - Math.cos(angle) * radius];
}

const body = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(src, dial.x + x, dial.y + y);
    set(body, x, y, px[0], px[1], px[2], 255);
  }
}

const bg = new Float32Array(220);
for (let radius = 40; radius < 210; radius += 1) {
  const samples = [];
  for (let angle = 0.32; angle <= 0.62; angle += 0.02) {
    for (const sign of [-1, 1]) {
      const [x, y] = cartesian(radius, sign * angle);
      const px = bilinear(body, x, y);
      samples.push(lum(px[0], px[1], px[2]));
    }
  }
  samples.sort((a, b) => a - b);
  bg[radius] = samples[Math.floor(samples.length / 2)] || 0;
}

const mask = new Uint8Array(dial.w * dial.h);
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    const { radius, angle } = polar(x, y);
    if (radius < BOSS_R + 4 || radius > 168) continue;
    if (Math.abs(angle) > 0.11) continue;
    const px = get(body, x, y);
    const level = lum(px[0], px[1], px[2]);
    const limit = Math.abs(angle) < 0.055 ? 12 : 24;
    if (level > bg[Math.round(radius)] + limit) mask[y * dial.w + x] = 1;
  }
}
for (let y = 78; y <= 106; y += 1) {
  for (let x = 206; x <= 258; x += 1) {
    const px = get(body, x, y);
    if (lum(px[0], px[1], px[2]) > 48) mask[y * dial.w + x] = 1;
  }
}
const grown = mask.slice();
for (let y = 2; y < dial.h - 2; y += 1) {
  for (let x = 2; x < dial.w - 2; x += 1) {
    if (mask[y * dial.w + x]) continue;
    let near = false;
    for (let oy = -2; oy <= 2 && !near; oy += 1) {
      for (let ox = -2; ox <= 2; ox += 1) {
        if (mask[(y + oy) * dial.w + (x + ox)]) near = true;
      }
    }
    if (!near) continue;
    const { radius, angle } = polar(x, y);
    const numeral = y >= 76 && y <= 108 && x >= 204 && x <= 260;
    if (numeral || (radius > BOSS_R + 4 && radius < 168 && Math.abs(angle) < 0.13)) grown[y * dial.w + x] = 1;
  }
}
for (let i = 0; i < mask.length; i += 1) mask[i] = grown[i];
function sideBaseline(radius, sign) {
  const samples = [];
  for (let angle = 0.22; angle <= 0.42; angle += 0.02) {
    const px = bilinear(body, ...cartesian(radius, sign * angle));
    samples.push(lum(px[0], px[1], px[2]));
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] || 0;
}
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    const { radius, angle } = polar(x, y);
    if (radius < BOSS_R + 6 || radius > 168 || Math.abs(angle) > 0.26 || Math.abs(angle) < 0.012) continue;
    const level = lum(...get(body, x, y));
    const base = sideBaseline(radius, angle < 0 ? -1 : 1);
    if (angle > 0 && level < base - 2) mask[y * dial.w + x] = 1;
    if (angle < 0 && level > base + 8) mask[y * dial.w + x] = 1;
  }
}
const hole = [];
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) if (mask[y * dial.w + x]) hole.push([x, y]);
}
console.log('damage pixels', hole.length);

function radialMean(radius, angle) {
  const acc = [0, 0, 0];
  let count = 0;
  for (let delta = -7; delta <= 7; delta += 1) {
    const px = bilinear(body, ...cartesian(radius + delta, angle));
    acc[0] += px[0];
    acc[1] += px[1];
    acc[2] += px[2];
    count += 1;
  }
  return acc.map((value) => value / count);
}
function cleanShift(radius, angle, shift) {
  const donorAngle = angle + shift;
  const [x, y] = cartesian(radius, donorAngle);
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 1 || yi < 1 || xi >= dial.w - 1 || yi >= dial.h - 1) return false;
  if (mask[yi * dial.w + xi]) return false;
  const px = get(body, xi, yi);
  return lum(px[0], px[1], px[2]) < bg[Math.max(40, Math.min(209, Math.round(radius)))] + 16;
}

const shiftSets = [
  [0.50, -0.68, 0.86, -1.05],
  [-0.58, 0.72, -0.96, 1.12],
  [0.64, -0.84, 1.02, -0.50],
  [-0.74, 0.46, -1.16, 0.92],
];

function paint(shifts) {
  const face = blank(dial.w, dial.h);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const px = get(body, x, y);
      set(face, x, y, px[0], px[1], px[2], 255);
    }
  }
  const edge = new Map();
  function edges(radius) {
    const key = Math.round(radius * 2) / 2;
    if (edge.has(key)) return edge.get(key);
    function walk(sign) {
      const base = sideBaseline(key, sign);
      for (let step = 1; step <= 90; step += 1) {
        const angle = sign * step * 0.006;
        const [sx, sy] = cartesian(key, angle);
        const xi = Math.round(sx);
        const yi = Math.round(sy);
        if (xi < 1 || yi < 1 || xi >= dial.w - 1 || yi >= dial.h - 1) continue;
        if (mask[yi * dial.w + xi]) continue;
        const px = get(body, xi, yi);
        const level = lum(px[0], px[1], px[2]);
        if (level > 130 || level < 2) continue;
        if (sign > 0 && level < base - 3) continue;
        if (sign < 0 && level > base + 6) continue;
        return { px, angle };
      }
      const px = bilinear(body, ...cartesian(key, sign * 0.55));
      return { px, angle: sign * 0.2 };
    }
    const found = [walk(-1), walk(1)];
    edge.set(key, found);
    return found;
  }
  for (const [x, y] of hole) {
    const { radius, angle } = polar(x, y);
    const [left, right] = edges(radius);
    const span = right.angle - left.angle || 1;
    const t = Math.max(0, Math.min(1, (angle - left.angle) / span));
    const band = Math.floor(radius / 28) % shifts.length;
    let shift = shifts[band];
    if (!cleanShift(radius, angle, shift)) shift = shifts.find((candidate) => cleanShift(radius, angle, candidate)) || shift;
    const donor = bilinear(body, ...cartesian(radius, angle + shift));
    const donorLow = radialMean(radius, angle + shift);
    const low = [0, 1, 2].map((channel) => left.px[channel] * (1 - t) + right.px[channel] * t);
    const rgb = [0, 1, 2].map((channel) => {
      const scale = donorLow[channel] > 4 ? low[channel] / donorLow[channel] : 1;
      return donor[channel] * scale;
    });
    set(face, x, y, clampByte(rgb[0]), clampByte(rgb[1]), clampByte(rgb[2]), 255);
  }
  for (const [x, y] of hole) {
    let dist = 99;
    let outside = null;
    for (let oy = -4; oy <= 4; oy += 1) {
      for (let ox = -4; ox <= 4; ox += 1) {
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
    if (!outside || dist >= 2.2 || lum(outside[0], outside[1], outside[2]) > 100) continue;
    const donor = get(face, x, y);
    const fade = dist / 2.2;
    set(face, x, y,
      clampByte(donor[0] * fade + outside[0] * (1 - fade)),
      clampByte(donor[1] * fade + outside[1] * (1 - fade)),
      clampByte(donor[2] * fade + outside[2] * (1 - fade)),
      255);
  }
  return face;
}

function score(face) {
  let boundary = 0;
  let count = 0;
  let repair = 0;
  let repairCount = 0;
  let neighbor = 0;
  let neighborCount = 0;
  for (const [x, y] of hole) {
    const px = get(face, x, y);
    const { radius, angle } = polar(x, y);
    repair += Math.abs(px[0] - get(face, x, Math.max(0, y - 1))[0]);
    repairCount += 1;
    const [nx, ny] = cartesian(radius, angle - 0.42).map(Math.round);
    if (nx > 1 && ny > 1 && nx < dial.w - 1 && ny < dial.h - 1 && !mask[ny * dial.w + nx]) {
      const there = get(body, nx, ny);
      neighbor += Math.abs(there[0] - get(body, nx, ny - 1)[0]);
      neighborCount += 1;
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + ox;
      const yy = y + oy;
      if (mask[yy * dial.w + xx]) continue;
      const out = get(body, xx, yy);
      if (lum(out[0], out[1], out[2]) > 120) continue;
      boundary += Math.abs(px[0] - out[0]) + Math.abs(px[1] - out[1]) + Math.abs(px[2] - out[2]);
      count += 1;
    }
  }
  const repairGrain = repair / Math.max(1, repairCount);
  const neighborGrain = neighbor / Math.max(1, neighborCount);
  return {
    boundary: boundary / Math.max(1, count),
    grainGap: Math.abs(repairGrain - neighborGrain),
    repairGrain,
    neighborGrain,
  };
}

let best = null;
shiftSets.forEach((shifts, index) => {
  const face = paint(shifts);
  const result = score(face);
  console.log('candidate', index, result);
  if (!best || result.boundary + result.grainGap * 4 < best.total) {
    best = { face, total: result.boundary + result.grainGap * 4, index, result, shifts };
  }
});
console.log('chosen', best.index, best.result);

const face = best.face;
for (let radius = 163; radius <= 170; radius += 0.5) {
  for (let deg = 4.6; deg <= 6.2; deg += 0.15) {
    const from = bilinear(body, ...cartesian(radius, (deg * Math.PI) / 180));
    if (lum(from[0], from[1], from[2]) < 140) continue;
    const [x, y] = cartesian(radius, ((deg - 5.4) * Math.PI) / 180);
    set(face, Math.round(x), Math.round(y), clampByte(from[0]), clampByte(from[1]), clampByte(from[2]), 255);
  }
}
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    if ((x - LCX) * (x - LCX) + (y - LCY) * (y - LCY) <= BOSS_R * BOSS_R) set(face, x, y, 0, 0, 0, 0);
  }
}

const atlas = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const { radius, angle } = polar(x, y);
    if (radius < 54 || radius > 168) continue;
    if (mask[y * dial.w + x]) continue;
    const px = get(body, x, y);
    if (lum(px[0], px[1], px[2]) > bg[Math.round(radius)] + 18) continue;
    if (Math.abs(Math.abs(angle) - 0.45) < 0.18 || Math.abs(Math.abs(angle) - 0.9) < 0.16 || Math.abs(Math.abs(angle) - 1.25) < 0.12) {
      set(atlas, x, y, px[0], px[1], px[2], 255);
    }
  }
}

function sourceNeedle(x, y) {
  const px = get(src, x, y);
  const level = lum(px[0], px[1], px[2]);
  if (level < 210 || px[0] < 240) return false;
  const left = lum(...get(src, x - 2, y));
  const right = lum(...get(src, x + 2, y));
  return level > left + 28 && level > right + 18;
}
const fixed = blank(dial.w, dial.h);
for (let y = 244; y <= 265; y += 1) {
  for (let x = 232; x <= 276; x += 1) {
    if (sourceNeedle(x, y)) continue;
    const px = get(src, x, y);
    const level = lum(px[0], px[1], px[2]);
    if (level < 58) continue;
    set(fixed, x - dial.x, y - dial.y, px[0], px[1], px[2], 255);
  }
}
const donorTwo = { x: 344, y: 294, w: 13, h: 16 };
let bestFit = null;
for (let oy = -2; oy <= 2; oy += 1) {
  for (let ox = -3; ox <= 3; ox += 1) {
    let err = 0;
    let count = 0;
    for (let y = 246; y <= 263; y += 1) {
      for (let x = 247; x <= 263; x += 1) {
        if (sourceNeedle(x, y)) continue;
        const photoL = lum(...get(src, x, y));
        if (photoL < 140) continue;
        const sx = donorTwo.x + (x - 249) + ox;
        const sy = donorTwo.y + (y - 246) + oy;
        if (sx < donorTwo.x || sy < donorTwo.y || sx >= donorTwo.x + donorTwo.w || sy >= donorTwo.y + donorTwo.h) continue;
        const donorOn = lum(...get(src, sx, sy)) > 100 ? 1 : 0;
        err += Math.abs(1 - donorOn);
        count += 1;
      }
    }
    if (count < 30) continue;
    const fit = err / count;
    if (!bestFit || fit < bestFit.fit) bestFit = { fit, ox, oy, count };
  }
}
console.log('two fit', bestFit);
for (let y = 245; y <= 264; y += 1) {
  for (let x = 244; x <= 266; x += 1) {
    if (!sourceNeedle(x, y)) continue;
    let left = null;
    let right = null;
    for (let step = 1; step <= 4; step += 1) {
      if (!left && !sourceNeedle(x - step, y) && lum(...get(src, x - step, y)) > 150) left = get(src, x - step, y);
      if (!right && !sourceNeedle(x + step, y) && lum(...get(src, x + step, y)) > 150) right = get(src, x + step, y);
    }
    const sx = donorTwo.x + (x - 249) + bestFit.ox;
    const sy = donorTwo.y + (y - 246) + bestFit.oy;
    const donorOn = lum(...get(src, sx, sy)) > 100;
    if (!donorOn && !(left && right)) continue;
    const tone = left && right
      ? [0, 1, 2].map((channel) => (left[channel] + right[channel]) / 2)
      : [0, 1, 2].map((channel) => (left || right || get(src, sx, sy))[channel]);
    set(fixed, x - dial.x, y - dial.y, clampByte(tone[0]), clampByte(tone[1]), clampByte(tone[2]), 255);
  }
}

const ink = [242, 232, 216];
const inkLevel = lum(ink[0], ink[1], ink[2]);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(fixed, x, y);
    if (px[3] < 8 || px[0] - px[2] < 36) continue;
    const scale = lum(px[0], px[1], px[2]) / inkLevel;
    set(fixed, x, y, clampByte(ink[0] * scale), clampByte(ink[1] * scale), clampByte(ink[2] * scale), px[3]);
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
    if (delta < 16) continue;
    set(local, x, y, photo[0], photo[1], photo[2], clampByte(Math.min(160, delta)));
  }
}

fs.writeFileSync(path.join(outDir, 'dial-body-empty.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-body.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-fixed-120.png'), PNG.sync.write(fixed));
fs.writeFileSync(path.join(outDir, 'needle-local-120.png'), PNG.sync.write(local));
fs.writeFileSync(path.join(preview, 'dial-texture-donor-atlas.png'), PNG.sync.write(atlas));

function cropOf(png, x, y, w, h) {
  const out = blank(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const px = get(png, x + xx, y + yy);
      set(out, xx, yy, px[3] < 8 ? 14 : px[0], px[3] < 8 ? 12 : px[1], px[3] < 8 ? 10 : px[2], 255);
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
const neutral = cropOf(face, 130, 18, 200, 230);
fs.writeFileSync(path.join(preview, 'dial-neutral-original-size.png'), PNG.sync.write(neutral));
fs.writeFileSync(path.join(preview, 'dial-neutral-2x.png'), PNG.sync.write(scale(neutral, 2)));
fs.writeFileSync(path.join(preview, 'dial-neutral-4x.png'), PNG.sync.write(scale(neutral, 4)));
for (const degrees of [0, 45, 90, 135, 180]) {
  fs.writeFileSync(path.join(preview, `dial-neutral-${degrees}deg.png`), PNG.sync.write(rotate(neutral, degrees)));
}
const low = blank(neutral.width, neutral.height);
const high = blank(neutral.width, neutral.height);
for (let y = 0; y < neutral.height; y += 1) {
  for (let x = 0; x < neutral.width; x += 1) {
    let acc = [0, 0, 0];
    let count = 0;
    for (let oy = -8; oy <= 8; oy += 1) {
      for (let ox = -8; ox <= 8; ox += 1) {
        const px = get(neutral, x + ox, y + oy);
        acc = acc.map((value, index) => value + px[index]);
        count += 1;
      }
    }
    const px = get(neutral, x, y);
    const base = acc.map((value) => value / count);
    set(low, x, y, clampByte(base[0]), clampByte(base[1]), clampByte(base[2]), 255);
    set(high, x, y, clampByte(128 + (px[0] - base[0]) * 3), clampByte(128 + (px[1] - base[1]) * 3), clampByte(128 + (px[2] - base[2]) * 3), 255);
  }
}
fs.writeFileSync(path.join(preview, 'dial-neutral-low-frequency.png'), PNG.sync.write(low));
fs.writeFileSync(path.join(preview, 'dial-neutral-high-frequency.png'), PNG.sync.write(high));
const falseColor = blank(neutral.width, neutral.height);
for (let y = 0; y < neutral.height; y += 1) {
  for (let x = 0; x < neutral.width; x += 1) {
    const px = get(neutral, x, y);
    const base = get(low, x, y);
    const delta = lum(px[0], px[1], px[2]) - lum(base[0], base[1], base[2]);
    const mag = Math.min(255, Math.abs(delta) * 8);
    set(falseColor, x, y, delta > 0 ? mag : 0, 40, delta < 0 ? mag : 0, 255);
  }
}
fs.writeFileSync(path.join(preview, 'dial-repair-falsecolor.png'), PNG.sync.write(falseColor));
fs.writeFileSync(path.join(preview, 'dial-fixed-120-closeup.png'), PNG.sync.write(scale(cropOf(fixed, 205, 75, 70, 40), 4)));
fs.writeFileSync(path.join(preview, 'dial-empty-12oclock-closeup.png'), PNG.sync.write(scale(neutral, 2)));

function columnGrain(angle) {
  const values = [];
  for (let radius = 60; radius <= 160; radius += 1) {
    const [x, y] = cartesian(radius, angle);
    values.push(lum(...bilinear(face, x, y)));
  }
  let energy = 0;
  for (let i = 2; i < values.length - 2; i += 1) {
    const smooth = (values[i - 2] + values[i - 1] + values[i] + values[i + 1] + values[i + 2]) / 5;
    energy += (values[i] - smooth) ** 2;
  }
  return Math.sqrt(energy / (values.length - 4));
}
const textureQa = {
  repairHfRms: columnGrain(0),
  leftHfRms: columnGrain(-0.45),
  rightHfRms: columnGrain(0.45),
  chosenCandidate: best.index,
  boundary: best.result.boundary,
  damagePixels: hole.length,
};
fs.writeFileSync(path.join(preview, 'texture-qa.json'), JSON.stringify(textureQa, null, 2));
console.log(textureQa);
console.log('synthesized');
