'use strict';

throw new Error('North Star horizontal band face compositor is retired. Use scripts/build-north-star-v8.js.');

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { rigidFrame, FACEPLATE_FRAMES } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const masterPath = path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png');
const outDir = path.join(root, 'artifacts', 'north-star-build');

function isFringe(r, g, b) {
  return g > r + 8 && g > b + 4 && g > 45;
}

function cleanFringe(src) {
  const copy = new PNG({ width: src.width, height: src.height });
  copy.data = Buffer.from(src.data);
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const i = (y * src.width + x) * 4;
      if (!isFringe(copy.data[i], copy.data[i + 1], copy.data[i + 2])) continue;
      let nx = x;
      if (x < src.width / 2) {
        while (nx < src.width - 1 && isFringe(copy.data[(y * src.width + nx) * 4], copy.data[(y * src.width + nx) * 4 + 1], copy.data[(y * src.width + nx) * 4 + 2])) nx += 1;
      } else {
        while (nx > 0 && isFringe(copy.data[(y * src.width + nx) * 4], copy.data[(y * src.width + nx) * 4 + 1], copy.data[(y * src.width + nx) * 4 + 2])) nx -= 1;
      }
      const j = (y * src.width + nx) * 4;
      copy.data[i] = copy.data[j];
      copy.data[i + 1] = copy.data[j + 1];
      copy.data[i + 2] = copy.data[j + 2];
      copy.data[i + 3] = 255;
    }
  }
  return copy;
}

function sample(src, x, y) {
  const x0 = Math.max(0, Math.min(src.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(src.height - 1, Math.floor(y)));
  const x1 = Math.min(src.width - 1, x0 + 1);
  const y1 = Math.min(src.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const out = [0, 0, 0];
  const corners = [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]];
  for (const [cx, cy, w] of corners) {
    const i = (cy * src.width + cx) * 4;
    out[0] += src.data[i] * w;
    out[1] += src.data[i + 1] * w;
    out[2] += src.data[i + 2] * w;
  }
  return out;
}

function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) & 255) / 255;
}

function marginColor(src, y) {
  const samples = [];
  const yy = Math.max(8, Math.min(src.height - 9, Math.round(y)));
  for (const x of [36, 42, 48, 54, 60, 880, 888, 896, 904]) {
    const i = (yy * src.width + x) * 4;
    const rgb = [src.data[i], src.data[i + 1], src.data[i + 2]];
    if (isFringe(rgb[0], rgb[1], rgb[2])) continue;
    samples.push(rgb);
  }
  if (!samples.length) return [48, 40, 32];
  samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  return samples[Math.floor(samples.length / 2)];
}

function buildFace() {
  const src = cleanFringe(PNG.sync.read(fs.readFileSync(masterPath)));
  const frameSpec = FACEPLATE_FRAMES['390x844'];
  const frame = rigidFrame(frameSpec.w, frameSpec.h, frameSpec.insets);
  const width = frameSpec.w;
  const height = frameSpec.h;
  const dst = new PNG({ width, height });
  const upper = marginColor(src, 40);
  const lower = marginColor(src, 1500);
  for (let y = 0; y < height; y += 1) {
    const t = y / (height - 1);
    const edge = [
      upper[0] + (lower[0] - upper[0]) * t,
      upper[1] + (lower[1] - upper[1]) * t,
      upper[2] + (lower[2] - upper[2]) * t,
    ];
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      dst.data[i] = edge[0];
      dst.data[i + 1] = edge[1];
      dst.data[i + 2] = edge[2];
      dst.data[i + 3] = 255;
    }
  }

  for (const band of frame.bands) {
    const destTop = Math.max(0, Math.floor(band.y));
    const destBottom = Math.min(height, Math.ceil(band.y + band.h));
    for (let y = destTop; y < destBottom; y += 1) {
      const local = (y + 0.5 - band.y) / band.h;
      const sourceY = band.from + local * (band.to - band.from);
      for (let x = 0; x < width; x += 1) {
        const sourceX = (x + 0.5 - frame.padX) / frame.s;
        if (sourceX < 0 || sourceX > src.width - 1) continue;
        const color = sample(src, sourceX, sourceY);
        const i = (y * width + x) * 4;
        dst.data[i] = color[0];
        dst.data[i + 1] = color[1];
        dst.data[i + 2] = color[2];
        dst.data[i + 3] = 255;
      }
    }
  }

  const spans = [[0, Math.floor(frame.bands[0].y)]];
  for (let index = 0; index < frame.bands.length - 1; index += 1) {
    spans.push([
      Math.min(height - 1, Math.ceil(frame.bands[index].y + frame.bands[index].h)),
      Math.max(0, Math.floor(frame.bands[index + 1].y)),
    ]);
  }
  for (const [y0, y1] of spans) {
    if (y1 <= y0) continue;
    const topY = Math.max(0, y0 - 1);
    const botY = Math.min(height - 1, y1);
    for (let y = y0; y < y1; y += 1) {
      const t = y0 === 0 ? 1 : (y + 0.5 - y0) / Math.max(1, y1 - y0);
      const toneOf = (row) => {
        const samples = [];
        for (const x of [22, 28, 34, 40, width - 40, width - 34, width - 28]) {
          const p = (row * width + Math.max(0, Math.min(width - 1, x))) * 4;
          samples.push([dst.data[p], dst.data[p + 1], dst.data[p + 2]]);
        }
        samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
        return samples[Math.floor(samples.length / 2)];
      };
      const aboveTone = toneOf(Math.max(0, topY - 6));
      const belowTone = toneOf(Math.min(height - 1, botY + 6));
      for (let x = 0; x < width; x += 1) {
        const edge = Math.min(x, width - 1 - x) / 46;
        const shade = Math.min(1, edge);
        const n = (hash(x, y) - 0.5) * 5;
        const i = (y * width + x) * 4;
        const mix = [
          aboveTone[0] * (1 - t) + belowTone[0] * t,
          aboveTone[1] * (1 - t) + belowTone[1] * t,
          aboveTone[2] * (1 - t) + belowTone[2] * t,
        ];
        dst.data[i] = Math.max(0, Math.min(255, mix[0] * (1 - shade * 0.45) + n));
        dst.data[i + 1] = Math.max(0, Math.min(255, mix[1] * (1 - shade * 0.48) + n));
        dst.data[i + 2] = Math.max(0, Math.min(255, mix[2] * (1 - shade * 0.52) + n));
      }
    }
  }

  for (let index = 0; index < frame.bands.length - 1; index += 1) {
    const above = frame.bands[index];
    const below = frame.bands[index + 1];
    const y0 = Math.ceil(above.y + above.h);
    const y1 = Math.floor(below.y);
    if (y1 <= y0) continue;
    for (let k = 0; k < 7; k += 1) {
      const fade = (7 - k) / 12;
      for (const y of [y0 - 1 - k, y1 + k]) {
        if (y < 0 || y >= height) continue;
        for (let x = 0; x < width; x += 1) {
          const gap = ((k < 0 ? y0 : (y < y0 ? y0 : y1 - 1)) * width + x) * 4;
          const srcY = y < y0 ? y0 : y1 - 1;
          const g = (srcY * width + x) * 4;
          const i = (y * width + x) * 4;
          dst.data[i] = dst.data[i] * (1 - fade) + dst.data[g] * fade;
          dst.data[i + 1] = dst.data[i + 1] * (1 - fade) + dst.data[g + 1] * fade;
          dst.data[i + 2] = dst.data[i + 2] * (1 - fade) + dst.data[g + 2] * fade;
        }
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V6.png');
  fs.writeFileSync(file, PNG.sync.write(dst));
  console.log(file, width, height, 'bands', frame.bands.map((band) => `${Math.round(band.y)}+${Math.round(band.h)}`).join(' '));
}

buildFace();
