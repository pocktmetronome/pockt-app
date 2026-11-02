'use strict';

/**
 * Full neutral dial face.
 * The interior is one pipeline for every angle:
 *   North Star global lighting + donor high-frequency brush.
 * There is no 12-o'clock corridor branch.
 */

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
const preview = path.join(root, 'artifacts/north-star-v4-dial/full');
fs.mkdirSync(preview, { recursive: true });

const dial = { x: 21, y: 162, w: 456, h: 456 };
const LCX = 228;
const LCY = 228;
const BOSS_R = 46;
const FACE_IN = 54;
const FACE_OUT = 176;
const HARD_IN = 192;
const DONOR_CX = 385;
const DONOR_CY = 385;
const DONOR_R0 = 120;
const DONOR_R1 = 292;
const AN = 720;
const TWO = Math.PI * 2;
const RMAX = 340;

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
function wrap(angle) {
  let value = angle % TWO;
  if (value < 0) value += TWO;
  return value;
}
function signed(angle) {
  const value = wrap(angle);
  return value > Math.PI ? value - TWO : value;
}
function cartesian(radius, angle, cx, cy) {
  return [cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius];
}
function mapRadius(radius) {
  const u = Math.max(0, Math.min(1, (radius - FACE_IN) / (FACE_OUT - FACE_IN)));
  return DONOR_R0 + u * (DONOR_R1 - DONOR_R0);
}
function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const body = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(src, dial.x + x, dial.y + y);
    set(body, x, y, px[0], px[1], px[2], 255);
  }
}

function solve(ata, atb) {
  const n = atb.length;
  const A = Array.from({ length: n }, (_, row) => ata.slice(row * n, (row + 1) * n).concat(atb[row]));
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    }
    const swap = A[col];
    A[col] = A[pivot];
    A[pivot] = swap;
    const div = Math.abs(A[col][col]) < 1e-8 ? 1e-8 : A[col][col];
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = A[row][col] / div;
      for (let k = col; k <= n; k += 1) A[row][k] -= factor * A[col][k];
    }
    for (let k = col; k <= n; k += 1) A[col][k] /= div;
  }
  return A.map((row) => row[n]);
}
function basis(angle, n) {
  const terms = [1, Math.cos(angle), Math.sin(angle)];
  if (n > 3) terms.push(Math.cos(2 * angle), Math.sin(2 * angle));
  return terms;
}
function lightingClean(px, radius, angle) {
  if (radius < 52 || radius > 186) return false;
  const level = lum(px[0], px[1], px[2]);
  const warm = px[0] - px[2];
  const ang = Math.abs(angle);
  if (ang < 0.12 && radius < 172 && (level > 88 || warm > 34)) return false;
  if (radius > 108 && radius < 168 && level > 92 && px[0] > 125 && px[1] > 105 && warm < 72) return false;
  if (radius > 156 && radius < 188 && level > 108) return false;
  if (warm > 78 && px[2] < 48 && radius > 150) return false;
  return true;
}

function fitLighting(radialReach, angularReach) {
  const radii = [];
  for (let radius = 48; radius <= 190; radius += 2) radii.push(radius);
  const angles = [];
  for (let deg = -180; deg < 180; deg += 3) angles.push((deg * Math.PI) / 180);
  const grid = radii.map(() => angles.map(() => [0, 0, 0]));
  for (let rIndex = 0; rIndex < radii.length; rIndex += 1) {
    for (let aIndex = 0; aIndex < angles.length; aIndex += 1) {
      const radius = radii[rIndex];
      const angle = angles[aIndex];
      const acc = [0, 0, 0];
      let weight = 0;
      for (let dr = -radialReach; dr <= radialReach; dr += 2) {
        for (let da = -angularReach; da <= angularReach; da += 0.04) {
          const sampleR = radius + dr;
          const sampleA = angle + da;
          const px = bilinear(body, ...cartesian(sampleR, sampleA, LCX, LCY));
          if (!lightingClean(px, sampleR, sampleA)) continue;
          const w = Math.exp(-(dr * dr) / (2 * radialReach * radialReach))
            * Math.exp(-(da * da) / (2 * angularReach * angularReach));
          acc[0] += px[0] * w;
          acc[1] += px[1] * w;
          acc[2] += px[2] * w;
          weight += w;
        }
      }
      grid[rIndex][aIndex] = weight > 0 ? acc.map((value) => value / weight) : null;
    }
  }
  for (let rIndex = 0; rIndex < radii.length; rIndex += 1) {
    for (let aIndex = 0; aIndex < angles.length; aIndex += 1) {
      if (grid[rIndex][aIndex]) continue;
      const acc = [0, 0, 0];
      let weight = 0;
      for (let rr = 0; rr < radii.length; rr += 1) {
        for (let aa = 0; aa < angles.length; aa += 1) {
          const sample = grid[rr][aa];
          if (!sample) continue;
          const dr = radii[rr] - radii[rIndex];
          let da = angles[aa] - angles[aIndex];
          if (da > Math.PI) da -= TWO;
          if (da < -Math.PI) da += TWO;
          const w = Math.exp(-(dr * dr) / 80 - (da * da) / 0.2);
          acc[0] += sample[0] * w;
          acc[1] += sample[1] * w;
          acc[2] += sample[2] * w;
          weight += w;
        }
      }
      grid[rIndex][aIndex] = acc.map((value) => value / Math.max(weight, 1e-6));
    }
  }
  const field = [new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h)];
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const radius = Math.hypot(x - LCX, y - LCY);
      const angle = signed(Math.atan2(x - LCX, LCY - y));
      const rPos = (radius - 48) / 2;
      const r0 = Math.max(0, Math.min(radii.length - 2, Math.floor(rPos)));
      const tr = Math.max(0, Math.min(1, rPos - r0));
      const aPos = (angle + Math.PI) / (3 * Math.PI / 180);
      const a0 = Math.max(0, Math.min(angles.length - 1, Math.floor(aPos)));
      const ta = Math.max(0, Math.min(1, aPos - a0));
      const a1 = (a0 + 1) % angles.length;
      const index = y * dial.w + x;
      for (let channel = 0; channel < 3; channel += 1) {
        const a = grid[r0][a0][channel];
        const b = grid[r0][a1][channel];
        const c = grid[Math.min(radii.length - 1, r0 + 1)][a0][channel];
        const d = grid[Math.min(radii.length - 1, r0 + 1)][a1][channel];
        field[channel][index] = a * (1 - ta) * (1 - tr) + b * ta * (1 - tr) + c * (1 - ta) * tr + d * ta * tr;
      }
    }
  }
  return field;
}

console.log('sampling donor');
const polar = new Float32Array((RMAX + 1) * AN * 3);
for (let radius = 0; radius <= RMAX; radius += 1) {
  for (let bin = 0; bin < AN; bin += 1) {
    const angle = ((bin + 0.5) / AN) * TWO;
    const px = bilinear(donorImg, ...cartesian(radius, angle, DONOR_CX, DONOR_CY));
    const index = (radius * AN + bin) * 3;
    polar[index] = px[0];
    polar[index + 1] = px[1];
    polar[index + 2] = px[2];
  }
}
const filled = new Float32Array(polar.length);
function polarLum(buffer, radius, bin) {
  const index = (radius * AN + bin) * 3;
  return lum(buffer[index], buffer[index + 1], buffer[index + 2]);
}
function donorContaminated(radius, bin) {
  if (radius < 90 || radius > 305) return false;
  const angle = Math.abs(signed(((bin + 0.5) / AN) * TWO));
  if (angle > 0.30) return false;
  const vals = [];
  for (let sample = 0; sample < AN; sample += 3) {
    const sampleAngle = Math.abs(signed(((sample + 0.5) / AN) * TWO));
    if (sampleAngle < 0.5) continue;
    vals.push(polarLum(polar, radius, sample));
  }
  vals.sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)] || 0;
  const level = polarLum(polar, radius, bin);
  return level > median + 16 || (angle < 0.12 && level > median + 8);
}
const shiftBins = [0.8, 1.25, 1.7, 2.15, 2.6, -1.05].map((angle) => Math.round((angle / TWO) * AN));
let bestShift = shiftBins[2];
let bestShiftErr = Infinity;
for (const shift of shiftBins) {
  let err = 0;
  let count = 0;
  for (let radius = 110; radius <= 280; radius += 4) {
    for (const edge of [0.30, -0.30]) {
      const outside = Math.round(wrap(edge + (edge > 0 ? 0.03 : -0.03)) / TWO * AN) % AN;
      const inside = Math.round(wrap(edge + (edge > 0 ? -0.03 : 0.03)) / TWO * AN) % AN;
      const source = (inside + shift + AN * 4) % AN;
      err += Math.abs(polarLum(polar, radius, outside) - polarLum(polar, radius, source));
      count += 1;
    }
  }
  const score = err / count;
  console.log('donor shift', shift, score.toFixed(2));
  if (score < bestShiftErr) {
    bestShiftErr = score;
    bestShift = shift;
  }
}
console.log('donor shift chosen', bestShift);
for (let radius = 0; radius <= RMAX; radius += 1) {
  for (let bin = 0; bin < AN; bin += 1) {
    const index = (radius * AN + bin) * 3;
    let source = bin;
    if (donorContaminated(radius, bin)) source = (bin + bestShift + AN * 4) % AN;
    filled[index] = polar[index + (source - bin) * 3];
    filled[index + 1] = polar[index + 1 + (source - bin) * 3];
    filled[index + 2] = polar[index + 2 + (source - bin) * 3];
  }
}
const donorLow = new Float32Array(filled.length);
const radialReach = 8;
const angularReach = Math.round((12 / 360) * AN);
for (let radius = 0; radius <= RMAX; radius += 1) {
  for (let bin = 0; bin < AN; bin += 1) {
    let acc = [0, 0, 0];
    let weight = 0;
    for (let dr = -radialReach; dr <= radialReach; dr += 1) {
      const rr = Math.max(0, Math.min(RMAX, radius + dr));
      const rw = 1 - Math.abs(dr) / (radialReach + 1);
      for (let da = -angularReach; da <= angularReach; da += 2) {
        const bb = (bin + da + AN) % AN;
        const w = rw * (1 - Math.abs(da) / (angularReach + 1));
        const index = (rr * AN + bb) * 3;
        acc[0] += filled[index] * w;
        acc[1] += filled[index + 1] * w;
        acc[2] += filled[index + 2] * w;
        weight += w;
      }
    }
    const index = (radius * AN + bin) * 3;
    donorLow[index] = acc[0] / weight;
    donorLow[index + 1] = acc[1] / weight;
    donorLow[index + 2] = acc[2] / weight;
  }
}
const donorHf = new Float32Array((RMAX + 1) * AN);
for (let radius = 0; radius <= RMAX; radius += 1) {
  for (let bin = 0; bin < AN; bin += 1) {
    const index = (radius * AN + bin) * 3;
    donorHf[radius * AN + bin] = polarLum(filled, radius, bin) - lum(donorLow[index], donorLow[index + 1], donorLow[index + 2]);
  }
}
function sampleDonorHf(radius, angle) {
  const r0 = Math.max(0, Math.min(RMAX - 1, Math.floor(radius)));
  const tr = Math.max(0, Math.min(1, radius - r0));
  const wrapped = wrap(angle);
  const position = (wrapped / TWO) * AN - 0.5;
  let bin0 = Math.floor(position);
  const ta = position - bin0;
  bin0 = ((bin0 % AN) + AN) % AN;
  const bin1 = (bin0 + 1) % AN;
  const a = donorHf[r0 * AN + bin0];
  const b = donorHf[r0 * AN + bin1];
  const c = donorHf[(r0 + 1) * AN + bin0];
  const d = donorHf[(r0 + 1) * AN + bin1];
  return a * (1 - ta) * (1 - tr) + b * ta * (1 - tr) + c * (1 - ta) * tr + d * ta * tr;
}

function targetRms(field) {
  const rows = [];
  for (let radius = 50; radius <= 190; radius += 1) {
    const sectors = [];
    for (const center of [-2.4, -1.7, -1.05, -0.55, 0.55, 1.05, 1.7, 2.4]) {
      let energy = 0;
      let count = 0;
      for (let delta = -0.12; delta <= 0.12; delta += 0.03) {
        for (let dr = -2; dr <= 2; dr += 1) {
          const angle = center + delta;
          const px = bilinear(body, ...cartesian(radius + dr, angle, LCX, LCY));
          if (!lightingClean(px, radius + dr, angle)) continue;
          const xy = cartesian(radius + dr, angle, LCX, LCY);
          const x = Math.round(xy[0]);
          const y = Math.round(xy[1]);
          const index = y * dial.w + x;
          const light = lum(field[0][index], field[1][index], field[2][index]);
          const deltaL = lum(px[0], px[1], px[2]) - light;
          energy += deltaL * deltaL;
          count += 1;
        }
      }
      if (count > 4) sectors.push(Math.sqrt(energy / count));
    }
    sectors.sort((a, b) => a - b);
    rows[radius] = sectors.length ? sectors[Math.floor(sectors.length / 2)] : 1;
  }
  for (let radius = 50; radius <= 190; radius += 1) {
    let acc = 0;
    let weight = 0;
    for (let delta = -8; delta <= 8; delta += 1) {
      const sample = Math.max(50, Math.min(190, radius + delta));
      const w = Math.exp(-(delta * delta) / 32);
      acc += (rows[sample] || 1) * w;
      weight += w;
    }
    rows[radius] = acc / weight;
  }
  return rows;
}
function donorRmsAt(radius) {
  const mapped = mapRadius(radius);
  const r0 = Math.max(0, Math.min(RMAX, Math.round(mapped)));
  let energy = 0;
  let count = 0;
  for (let bin = 0; bin < AN; bin += 6) {
    const value = donorHf[r0 * AN + bin];
    energy += value * value;
    count += 1;
  }
  return Math.sqrt(energy / count) || 1;
}

console.log('fitting lighting');
const lights = {
  tight: fitLighting(6, 0.16),
  wide: fitLighting(16, 0.42),
  broad: fitLighting(12, 0.34),
};
const rms = {
  tight: targetRms(lights.tight),
  wide: targetRms(lights.wide),
  broad: targetRms(lights.broad),
};

function synthesize(light, target, offset, amp) {
  const face = blank(dial.w, dial.h);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const radius = Math.hypot(x - LCX, y - LCY);
      const angle = Math.atan2(x - LCX, LCY - y);
      const original = get(body, x, y);
      if (radius < BOSS_R) {
        set(face, x, y, 0, 0, 0, 0);
        continue;
      }
      if (radius >= HARD_IN) {
        set(face, x, y, original[0], original[1], original[2], 255);
        continue;
      }
      const index = y * dial.w + x;
      const key = Math.max(50, Math.min(190, Math.round(radius)));
      const gain = Math.max(0.35, Math.min(2.2, ((target[key] || 1.5) / donorRmsAt(key)) * amp));
      const hf = sampleDonorHf(mapRadius(Math.max(FACE_IN, radius)), angle + offset) * gain;
      let rgb = [0, 1, 2].map((channel) => light[channel][index] + hf);
      let blend = 0;
      if (radius > FACE_OUT) {
        const marking = !lightingClean(original, radius, angle) || Math.abs(angle) < 0.2;
        blend = marking ? 0 : smoothstep(FACE_OUT, HARD_IN, radius);
      }
      if (blend > 0) rgb = rgb.map((value, channel) => value * (1 - blend) + original[channel] * blend);
      set(face, x, y, clampByte(rgb[0]), clampByte(rgb[1]), clampByte(rgb[2]), 255);
    }
  }
  return face;
}

function sourceNeedle(x, y) {
  if (Math.abs(x - (dial.x + LCX)) > 7) return false;
  const px = get(src, x, y);
  const level = lum(px[0], px[1], px[2]);
  if (level < 200 || px[0] < 220) return false;
  const left = lum(...get(src, x - 2, y));
  const right = lum(...get(src, x + 2, y));
  return level > left + 18 && level > right + 12;
}
const ringMed = new Float32Array(260);
for (let radius = 100; radius < 210; radius += 1) {
  const vals = [];
  for (let deg = -170; deg <= 170; deg += 4) {
    if (Math.abs(deg) < 18) continue;
    const px = bilinear(body, ...cartesian(radius, (deg * Math.PI) / 180, LCX, LCY));
    vals.push(lum(px[0], px[1], px[2]));
  }
  vals.sort((a, b) => a - b);
  ringMed[radius] = vals[Math.floor(vals.length / 2)] || 0;
}
const scale = blank(dial.w, dial.h);
const seed = new Uint8Array(dial.w * dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const radius = Math.hypot(x - LCX, y - LCY);
    const angle = Math.atan2(x - LCX, LCY - y);
    const sx = dial.x + x;
    const sy = dial.y + y;
    if (sourceNeedle(sx, sy)) continue;
    const px = get(src, sx, sy);
    const level = lum(px[0], px[1], px[2]);
    const warm = px[0] - px[2];
    const numeral = radius > 110 && radius < 166 && level > 86 && px[0] > 118 && px[1] > 100 && px[2] > 68 && warm < 70 && Math.abs(angle) < 2.8;
    const orange = radius > 164 && radius < 186 && warm > 70 && px[2] < 50 && px[0] > 100 && Math.abs(angle) < 0.12;
    const tick = radius > 158 && radius < 188 && level > Math.max(76, ringMed[Math.round(radius)] + 28) && warm < 85 && !numeral;
    if (numeral || orange || tick) seed[y * dial.w + x] = 1;
  }
}
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    if (seed[y * dial.w + x]) continue;
    let near = false;
    for (let oy = -1; oy <= 1 && !near; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) if (seed[(y + oy) * dial.w + (x + ox)]) near = true;
    }
    if (!near) continue;
    const sx = dial.x + x;
    const sy = dial.y + y;
    if (sourceNeedle(sx, sy)) continue;
    const px = get(src, sx, sy);
    if (lum(px[0], px[1], px[2]) < 58) continue;
    if (px[0] - px[2] > 60 && Math.abs(Math.atan2(x - LCX, LCY - y)) < 0.14) continue;
    seed[y * dial.w + x] = 1;
  }
}
let scaleCount = 0;
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    if (!seed[y * dial.w + x]) continue;
    const px = get(src, dial.x + x, dial.y + y);
    set(scale, x, y, px[0], px[1], px[2], 255);
    scaleCount += 1;
  }
}
const originalSeed = seed.slice();
let bridged = 0;
for (let y = 244; y <= 264; y += 1) {
  for (let x = 246; x <= 262; x += 1) {
    const lx = x - dial.x;
    const ly = y - dial.y;
    if (originalSeed[ly * dial.w + lx]) continue;
    const photo = get(src, x, y);
    const level = lum(photo[0], photo[1], photo[2]);
    const shaft = sourceNeedle(x, y) || (Math.abs(x - (dial.x + LCX)) <= 5 && level > 70 && photo[0] - photo[2] > 16);
    if (!shaft) continue;
    const acc = [0, 0, 0];
    let weight = 0;
    for (let oy = -4; oy <= 4; oy += 1) {
      for (let ox = -4; ox <= 4; ox += 1) {
        if (!ox && !oy) continue;
        if (!originalSeed[(ly + oy) * dial.w + (lx + ox)]) continue;
        const w = 1 / (ox * ox + oy * oy);
        const sample = get(scale, lx + ox, ly + oy);
        acc[0] += sample[0] * w;
        acc[1] += sample[1] * w;
        acc[2] += sample[2] * w;
        weight += w;
      }
    }
    if (weight < 0.2) continue;
    set(scale, lx, ly, clampByte(acc[0] / weight), clampByte(acc[1] / weight), clampByte(acc[2] / weight), 255);
    bridged += 1;
  }
}
console.log('scale pixels', scaleCount, 'bridged', bridged);

function sectorStats(face, angle) {
  const values = [];
  for (let radius = 70; radius <= 165; radius += 1) {
    values.push(lum(...bilinear(face, ...cartesian(radius, angle, LCX, LCY))));
  }
  let mean = 0;
  for (const value of values) mean += value;
  mean /= values.length;
  let energy = 0;
  const grads = [];
  for (let i = 2; i < values.length - 2; i += 1) {
    const smooth = (values[i - 2] + values[i - 1] + values[i] + values[i + 1] + values[i + 2]) / 5;
    energy += (values[i] - smooth) ** 2;
    grads.push(Math.abs(values[i] - values[i - 1]));
  }
  let best = { period: 0, power: 0 };
  for (let period = 4; period <= 16; period += 1) {
    let sin = 0;
    let cos = 0;
    for (let i = 0; i < values.length; i += 1) {
      const w = (Math.PI * 2 * i) / period;
      sin += (values[i] - mean) * Math.sin(w);
      cos += (values[i] - mean) * Math.cos(w);
    }
    const power = sin * sin + cos * cos;
    if (power > best.power) best = { period, power };
  }
  grads.sort((a, b) => a - b);
  return {
    mean,
    hf: Math.sqrt(energy / (values.length - 4)),
    period: best.period,
    power: best.power,
    gradient: grads[Math.floor(grads.length / 2)] || 0,
  };
}
function interiorMae(face) {
  let err = 0;
  let count = 0;
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const radius = Math.hypot(x - LCX, y - LCY);
      if (radius < FACE_IN || radius > FACE_OUT) continue;
      const angle = Math.atan2(x - LCX, LCY - y);
      const photo = get(body, x, y);
      if (!lightingClean(photo, radius, angle)) continue;
      const px = get(face, x, y);
      err += (Math.abs(px[0] - photo[0]) + Math.abs(px[1] - photo[1]) + Math.abs(px[2] - photo[2])) / 3;
      count += 1;
    }
  }
  return err / Math.max(1, count);
}

const candidates = [
  { id: 'A', light: 'tight', offset: 1.7, amp: 0.9 },
  { id: 'B', light: 'tight', offset: -2.05, amp: 0.82 },
  { id: 'C', light: 'wide', offset: 1.7, amp: 1.08 },
  { id: 'D', light: 'broad', offset: 2.55, amp: 0.9 },
];
const built = {};
let winner = null;
for (const candidate of candidates) {
  const face = synthesize(lights[candidate.light], rms[candidate.light], candidate.offset, candidate.amp);
  const noon = sectorStats(face, 0);
  const eleven = sectorStats(face, -Math.PI / 6);
  const one = sectorStats(face, Math.PI / 6);
  const hfMid = (eleven.hf + one.hf) / 2;
  const meanMid = (eleven.mean + one.mean) / 2;
  const outlier = Math.abs(noon.hf - hfMid) / Math.max(0.2, hfMid) + Math.abs(noon.mean - meanMid) / 8;
  const mae = interiorMae(face);
  const score = outlier * 4 + mae * 0.15;
  console.log(candidate.id, { outlier: +outlier.toFixed(3), mae: +mae.toFixed(2), noonHf: +noon.hf.toFixed(2), elevenHf: +eleven.hf.toFixed(2), oneHf: +one.hf.toFixed(2), score: +score.toFixed(3) });
  built[candidate.id] = { face, noon, eleven, one, outlier, mae, score, candidate };
  if (!winner || score < winner.score) winner = built[candidate.id];
}
console.log('chosen', winner.candidate.id);

function cropOf(png, x, y, w, h) {
  const out = blank(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const px = get(png, x + xx, y + yy);
      const empty = px[3] < 8;
      set(out, xx, yy, empty ? 8 : px[0], empty ? 8 : px[1], empty ? 8 : px[2], 255);
    }
  }
  return out;
}
function scaleImage(png, factor) {
  const out = blank(png.width * factor, png.height * factor);
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const px = get(png, Math.floor(x / factor), Math.floor(y / factor));
      set(out, x, y, px[0], px[1], px[2], 255);
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
      const px = bilinear(png, sx, sy);
      set(out, x, y, clampByte(px[0]), clampByte(px[1]), clampByte(px[2]), 255);
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
function composite(base, glyphLayer, degrees) {
  const out = blank(dial.w, dial.h);
  const shaft = rotateLayer(needle, degrees);
  const shade = rotateLayer(shadow, degrees);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      let px = get(base, x, y);
      if (px[3] < 8) px = [0, 0, 0, 255];
      for (const layer of [glyphLayer, shade, shaft, boss]) {
        const over = get(layer, x, y);
        const alpha = (over[3] || 0) / 255;
        if (alpha <= 0) continue;
        px = [0, 1, 2].map((channel) => over[channel] * alpha + px[channel] * (1 - alpha));
      }
      set(out, x, y, clampByte(px[0]), clampByte(px[1]), clampByte(px[2]), 255);
    }
  }
  return out;
}
function over(base, glyphLayer) {
  const out = blank(dial.w, dial.h);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      let px = get(base, x, y);
      if (px[3] < 8) px = [0, 0, 0, 255];
      const mark = get(glyphLayer, x, y);
      const alpha = (mark[3] || 0) / 255;
      if (alpha > 0) px = [0, 1, 2].map((channel) => mark[channel] * alpha + px[channel] * (1 - alpha));
      set(out, x, y, clampByte(px[0]), clampByte(px[1]), clampByte(px[2]), 255);
    }
  }
  return out;
}

const face = winner.face;
const local = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const radius = Math.hypot(x - LCX, y - LCY);
    const angle = Math.atan2(x - LCX, LCY - y);
    if (radius < BOSS_R + 2 || radius > 168 || Math.abs(angle) > 0.16) continue;
    if (seed[y * dial.w + x]) continue;
    const photo = get(src, dial.x + x, dial.y + y);
    if (lum(photo[0], photo[1], photo[2]) > 210) continue;
    const base = get(face, x, y);
    const delta = Math.abs(photo[0] - base[0]) + Math.abs(photo[1] - base[1]) + Math.abs(photo[2] - base[2]);
    if (delta < 24) continue;
    set(local, x, y, photo[0], photo[1], photo[2], clampByte(Math.min(120, delta)));
  }
}

const donorFull = blank(donorImg.width, donorImg.height);
for (let y = 0; y < donorImg.height; y += 1) {
  for (let x = 0; x < donorImg.width; x += 1) {
    const radius = Math.hypot(x - DONOR_CX, y - DONOR_CY);
    const angle = Math.atan2(x - DONOR_CX, DONOR_CY - y);
    if (radius < 96 || radius > 308) {
      const px = get(donorImg, x, y);
      set(donorFull, x, y, px[0], px[1], px[2], 255);
      continue;
    }
    const bin = Math.max(0, Math.min(AN - 1, Math.floor(wrap(angle) / TWO * AN)));
    const index = (Math.round(radius) * AN + bin) * 3;
    set(donorFull, x, y, clampByte(filled[index]), clampByte(filled[index + 1]), clampByte(filled[index + 2]), 255);
  }
}
const donorHfPng = blank(donorImg.width, donorImg.height);
for (let y = 0; y < donorImg.height; y += 2) {
  for (let x = 0; x < donorImg.width; x += 2) {
    const radius = Math.hypot(x - DONOR_CX, y - DONOR_CY);
    if (radius < 96 || radius > 308) continue;
    const value = sampleDonorHf(radius, Math.atan2(x - DONOR_CX, DONOR_CY - y));
    const gray = clampByte(128 + value * 6);
    set(donorHfPng, x, y, gray, gray, gray, 255);
    set(donorHfPng, x + 1, y, gray, gray, gray, 255);
    set(donorHfPng, x, y + 1, gray, gray, gray, 255);
    set(donorHfPng, x + 1, y + 1, gray, gray, gray, 255);
  }
}
const lightPng = blank(dial.w, dial.h);
const chosenLight = lights[winner.candidate.light];
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const index = y * dial.w + x;
    set(lightPng, x, y, clampByte(chosenLight[0][index]), clampByte(chosenLight[1][index]), clampByte(chosenLight[2][index]), 255);
  }
}

fs.writeFileSync(path.join(outDir, 'dial-body-empty.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-body.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-fixed-120.png'), PNG.sync.write(scale));
fs.writeFileSync(path.join(outDir, 'dial-scale-markings.png'), PNG.sync.write(scale));
fs.writeFileSync(path.join(outDir, 'needle-local-120.png'), PNG.sync.write(local));
fs.writeFileSync(path.join(preview, 'dial-donor-neutral-full.png'), PNG.sync.write(donorFull));
fs.writeFileSync(path.join(preview, 'dial-donor-high-frequency.png'), PNG.sync.write(donorHfPng));
fs.writeFileSync(path.join(preview, 'dial-global-lighting.png'), PNG.sync.write(lightPng));
fs.writeFileSync(path.join(preview, 'dial-neutral-face.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(preview, 'dial-scale-markings.png'), PNG.sync.write(scale));

const crop = { x: 128, y: 8, w: 200, h: 220 };
const neutralCrop = cropOf(face, crop.x, crop.y, crop.w, crop.h);
fs.writeFileSync(path.join(preview, 'neutral-face-1x.png'), PNG.sync.write(neutralCrop));
fs.writeFileSync(path.join(preview, 'neutral-face-2x.png'), PNG.sync.write(scaleImage(neutralCrop, 2)));
fs.writeFileSync(path.join(preview, 'neutral-face-4x.png'), PNG.sync.write(scaleImage(neutralCrop, 4)));
const withScale = over(face, scale);
const scaleCrop = cropOf(withScale, crop.x, crop.y, crop.w, crop.h);
fs.writeFileSync(path.join(preview, 'neutral-face-scale-4x.png'), PNG.sync.write(scaleImage(scaleCrop, 4)));
fs.writeFileSync(path.join(preview, 'dial-fixed-120-closeup.png'), PNG.sync.write(scaleImage(cropOf(scale, 200, 70, 80, 50), 4)));
const lowCrop = cropOf(lightPng, crop.x, crop.y, crop.w, crop.h);
fs.writeFileSync(path.join(preview, 'neutral-face-low-frequency.png'), PNG.sync.write(scaleImage(lowCrop, 2)));
const highCrop = blank(crop.w, crop.h);
for (let y = 0; y < crop.h; y += 1) {
  for (let x = 0; x < crop.w; x += 1) {
    const px = get(neutralCrop, x, y);
    const base = get(lowCrop, x, y);
    set(highCrop, x, y,
      clampByte(128 + (px[0] - base[0]) * 4),
      clampByte(128 + (px[1] - base[1]) * 4),
      clampByte(128 + (px[2] - base[2]) * 4),
      255);
  }
}
fs.writeFileSync(path.join(preview, 'neutral-face-high-frequency.png'), PNG.sync.write(scaleImage(highCrop, 2)));

for (const id of Object.keys(built)) {
  const shot = composite(built[id].face, scale, -78);
  fs.writeFileSync(path.join(preview, `candidate-${id.toLowerCase()}-60-2x.png`), PNG.sync.write(scaleImage(cropOf(shot, crop.x, crop.y, crop.w, crop.h), 2)));
}
const shot60 = composite(face, scale, -78);
fs.writeFileSync(path.join(preview, 'dial-60-1x.png'), PNG.sync.write(cropOf(shot60, crop.x, crop.y, crop.w, crop.h)));
fs.writeFileSync(path.join(preview, 'dial-60-2x.png'), PNG.sync.write(scaleImage(cropOf(shot60, crop.x, crop.y, crop.w, crop.h), 2)));
fs.writeFileSync(path.join(preview, 'dial-60-4x.png'), PNG.sync.write(scaleImage(cropOf(shot60, crop.x, crop.y, crop.w, crop.h), 4)));

const sectors = [];
for (let deg = -180; deg < 180; deg += 15) {
  const stats = sectorStats(face, (deg * Math.PI) / 180);
  sectors.push({ deg, hf: +stats.hf.toFixed(3), mean: +stats.mean.toFixed(2), period: stats.period });
}
sectors.sort((a, b) => b.hf - a.hf);
const rotations = {};
for (const degrees of [17, 63, 111, 204, 287]) {
  const turned = rotate(face, degrees);
  let peak = null;
  for (let deg = -180; deg < 180; deg += 15) {
    const stats = sectorStats(turned, (deg * Math.PI) / 180);
    if (!peak || stats.hf > peak.hf) peak = { deg, hf: stats.hf };
  }
  const former = signed((0 - degrees) * Math.PI / 180) * 180 / Math.PI;
  rotations[degrees] = {
    peakDeg: peak.deg,
    peakHf: +peak.hf.toFixed(3),
    formerNoon: +former.toFixed(1),
    peakNearFormer: Math.abs(signed((peak.deg - former) * Math.PI / 180)) < 0.35,
  };
  fs.writeFileSync(path.join(preview, `rotate-${degrees}.png`), PNG.sync.write(scaleImage(cropOf(turned, crop.x, crop.y, crop.w, crop.h), 2)));
}
const donorSectors = [];
for (let deg = -180; deg < 180; deg += 20) {
  const values = [];
  for (let radius = 140; radius <= 260; radius += 2) {
    const bin = Math.max(0, Math.min(AN - 1, Math.floor(wrap((deg * Math.PI) / 180) / TWO * AN)));
    values.push(polarLum(filled, radius, bin));
  }
  let mean = 0;
  for (const value of values) mean += value;
  mean /= values.length;
  let energy = 0;
  for (let i = 1; i < values.length - 1; i += 1) {
    const smooth = (values[i - 1] + values[i] + values[i + 1]) / 3;
    energy += (values[i] - smooth) ** 2;
  }
  donorSectors.push({ deg, hf: Math.sqrt(energy / (values.length - 2)) });
}
donorSectors.sort((a, b) => b.hf - a.hf);

const qa = {
  chosen: winner.candidate,
  noon: winner.noon,
  eleven: winner.eleven,
  one: winner.one,
  interiorMae: winner.mae,
  outlier: winner.outlier,
  scaleCount,
  bridged,
  sectors: sectors.slice(0, 6),
  rotations,
  donorPeak: donorSectors[0],
  donorMedianHf: donorSectors[Math.floor(donorSectors.length / 2)].hf,
  candidates: Object.fromEntries(Object.entries(built).map(([id, row]) => [id, {
    outlier: row.outlier,
    mae: row.mae,
    noonHf: row.noon.hf,
    elevenHf: row.eleven.hf,
    oneHf: row.one.hf,
    score: row.score,
  }])),
};
fs.writeFileSync(path.join(preview, 'texture-qa.json'), JSON.stringify(qa, null, 2));
console.log(JSON.stringify(qa, null, 2));
console.log('full neutral face built');
