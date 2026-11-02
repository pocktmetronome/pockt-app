'use strict';

throw new Error('North Star V6 horizontal band compositor is retired. Use scripts/build-north-star-v8.js.');

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { rigidFrame, FACEPLATE_FRAMES, NORTH_STAR_ART } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const masterPath = path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png');
const outDir = path.join(root, 'artifacts', 'north-star-build');
const capDir = path.join(root, 'assets', 'north-star-v6');

function isFringe(r, g, b) {
  return g > r + 8 && g > b + 4 && g > 45;
}

function isGold(r, g, b) {
  return r > 145 && g > 60 && r > b + 25 && g > b;
}

function cleanFringe(src) {
  const copy = new PNG({ width: src.width, height: src.height });
  copy.data = Buffer.from(src.data);
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const i = (y * src.width + x) * 4;
      if (!isFringe(copy.data[i], copy.data[i + 1], copy.data[i + 2])) continue;
      let nx = x < src.width / 2 ? x : x;
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
  const tx = Math.max(0, Math.min(1, x - x0));
  const ty = Math.max(0, Math.min(1, y - y0));
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

function cleanGlass(src) {
  const cx = 469;
  const cy = 501;
  for (let y = cy - 130; y <= cy + 130; y += 1) {
    for (let x = cx - 130; x <= cx + 130; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const rad = Math.hypot(dx, dy);
      if (rad > 112) continue;
      const angle = Math.atan2(dy, dx);
      let fill = [8, 7, 6];
      for (const ring of [122, 130, 138]) {
        const color = sample(src, cx + Math.cos(angle) * ring, cy + Math.sin(angle) * ring);
        if (color[0] < 90) {
          fill = color;
          break;
        }
      }
      const shade = 0.72 + (rad / 112) * 0.28;
      const i = (y * src.width + x) * 4;
      src.data[i] = Math.max(0, Math.min(255, fill[0] * shade));
      src.data[i + 1] = Math.max(0, Math.min(255, fill[1] * shade));
      src.data[i + 2] = Math.max(0, Math.min(255, fill[2] * shade));
    }
  }
}

function repairPlayTriangle(cap) {
  const { width, height, data } = cap;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (y > height * 0.3 && data[i] > 210 && data[i + 1] > 140 && data[i + 1] < 220 && data[i + 2] < 120) {
        count += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!count) return cap;
  minX = Math.max(0, minX - 4);
  maxX = Math.min(width - 1, maxX + 4);
  minY = Math.max(0, minY - 3);
  maxY = Math.min(height - 1, maxY + 3);
  for (let y = minY; y <= maxY; y += 1) {
    let lx = minX;
    while (lx > 0 && data[(y * width + lx) * 4] > 42) lx -= 1;
    let rx = maxX;
    while (rx < width - 1 && data[(y * width + rx) * 4] > 42) rx += 1;
    const li = (y * width + lx) * 4;
    const ri = (y * width + rx) * 4;
    for (let x = minX; x <= maxX; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i] < 48 && data[i] <= data[i + 2] + 18) continue;
      const t = (x - lx) / Math.max(1, rx - lx);
      data[i] = data[li] * (1 - t) + data[ri] * t;
      data[i + 1] = data[li + 1] * (1 - t) + data[ri + 1] * t;
      data[i + 2] = data[li + 2] * (1 - t) + data[ri + 2] * t;
    }
  }
  return cap;
}

function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) & 255) / 255;
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function pixelAt(dst, x, y) {
  const xx = Math.max(0, Math.min(dst.width - 1, x));
  const yy = Math.max(0, Math.min(dst.height - 1, y));
  const i = (yy * dst.width + xx) * 4;
  return [dst.data[i], dst.data[i + 1], dst.data[i + 2]];
}

function lum(rgb) {
  return rgb[0] + rgb[1] + rgb[2];
}

function metalAt(dst, x, y, dir) {
  let best = pixelAt(dst, x, y);
  if (lum(best) > 28) return best;
  for (let step = 1; step <= 3; step += 1) {
    const next = pixelAt(dst, x, y + dir * step);
    if (lum(next) > lum(best)) best = next;
    if (lum(next) > 28) return next;
  }
  return best;
}

function composite(src, width, height, insets) {
  const frame = rigidFrame(width, height, insets);
  const dst = new PNG({ width, height });
  dst.data.fill(0);
  for (let i = 3; i < dst.data.length; i += 4) dst.data[i] = 255;
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
  for (let index = 0; index < frame.bands.length - 1; index += 1) {
    const above = frame.bands[index];
    const below = frame.bands[index + 1];
    const y0 = Math.min(height, Math.ceil(above.y + above.h));
    const y1 = Math.max(0, Math.floor(below.y));
    if (y1 <= y0) continue;
    for (let y = y0; y < y1; y += 1) {
      const t = smoothstep((y + 0.5 - y0) / (y1 - y0));
      for (let x = 0; x < width; x += 1) {
        const top = metalAt(dst, x, y0 - 1, -1);
        const bot = metalAt(dst, x, y1, 1);
        const sourceX = (x + 0.5 - frame.padX) / frame.s;
        const sourceY = above.to + (hash(x * 3, y) - 0.5) * 2;
        const jitter = sample(src, sourceX + (hash(y, x) - 0.5) * 1.5, sourceY);
        const quiet = sample(src, sourceX, above.to);
        const n = (hash(x, y) - 0.5) * 3;
        const i = (y * width + x) * 4;
        const grain = (channel) => Math.max(-5, Math.min(5, jitter[channel] - quiet[channel]));
        dst.data[i] = Math.max(0, Math.min(255, top[0] * (1 - t) + bot[0] * t + grain(0) + n));
        dst.data[i + 1] = Math.max(0, Math.min(255, top[1] * (1 - t) + bot[1] * t + grain(1) + n));
        dst.data[i + 2] = Math.max(0, Math.min(255, top[2] * (1 - t) + bot[2] * t + grain(2) + n));
        dst.data[i + 3] = 255;
      }
    }
    for (let k = 1; k <= 5; k += 1) {
      const fade = (6 - k) / 14;
      for (const y of [y0 - k, y1 + k - 1]) {
        if (y < 0 || y >= height) continue;
        const refY = y < y0 ? y0 : y1 - 1;
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const g = (refY * width + x) * 4;
          dst.data[i] = dst.data[i] * (1 - fade) + dst.data[g] * fade;
          dst.data[i + 1] = dst.data[i + 1] * (1 - fade) + dst.data[g + 1] * fade;
          dst.data[i + 2] = dst.data[i + 2] * (1 - fade) + dst.data[g + 2] * fade;
        }
      }
    }
  }
  return { plate: dst, frame };
}

function artBox(frame, key) {
  const art = NORTH_STAR_ART[key];
  return {
    x: Math.round(frame.mapX(art.x)),
    y: Math.round(frame.mapY(art.y)),
    w: Math.max(1, Math.round(art.w * frame.s)),
    h: Math.max(1, Math.round(art.h * frame.s)),
  };
}

function cropOf(src, box) {
  const x0 = Math.max(0, box.x);
  const y0 = Math.max(0, box.y);
  const x1 = Math.min(src.width, box.x + box.w);
  const y1 = Math.min(src.height, box.y + box.h);
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = ((y0 + y) * src.width + (x0 + x)) * 4;
      const d = (y * w + x) * 4;
      out.data[d] = src.data[s];
      out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = 255;
    }
  }
  return out;
}

function punchWells(plate, frame) {
  const keys = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'pockt'];
  for (const key of keys) {
    const box = artBox(frame, key);
    const y1 = Math.min(plate.height, box.y + 3);
    const x0 = box.x + Math.round(box.w * 0.08);
    const x1 = box.x + box.w - Math.round(box.w * 0.08);
    for (let y = Math.max(0, box.y); y < y1; y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(plate.width, x1); x += 1) {
        const i = (y * plate.width + x) * 4;
        plate.data[i] = Math.round(plate.data[i] * 0.28);
        plate.data[i + 1] = Math.round(plate.data[i + 1] * 0.28);
        plate.data[i + 2] = Math.round(plate.data[i + 2] * 0.28);
      }
    }
  }
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

function build() {
  const raw = PNG.sync.read(fs.readFileSync(masterPath));
  const src = cleanFringe(raw);
  cleanGlass(src);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(capDir, { recursive: true });

  const clear = new PNG({ width: 8, height: 8 });
  writePng(path.join(capDir, 'clear.png'), clear);

  const arc = new PNG({ width: 512, height: 512 });
  const arcCx = 256;
  const arcCy = 256;
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const dx = x - arcCx;
      const dy = y - arcCy;
      const rad = Math.hypot(dx, dy);
      const ang = Math.atan2(dx, -dy);
      const i = (y * 512 + x) * 4;
      const on = rad > 196 && rad < 214 && Math.abs(ang) < 0.045;
      arc.data[i] = on ? 232 : 0;
      arc.data[i + 1] = on ? 164 : 0;
      arc.data[i + 2] = on ? 64 : 0;
      arc.data[i + 3] = on ? 210 : 0;
    }
  }
  writePng(path.join(capDir, 'position-arc.png'), arc);

  const spec = FACEPLATE_FRAMES['390x844'];
  const built = composite(src, spec.w, spec.h, spec.insets);
  const capKeys = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'pockt'];
  for (const key of capKeys) {
    const cap = cropOf(built.plate, artBox(built.frame, key));
    writePng(path.join(capDir, `${key}.png`), cap);
    if (key === 'play') writePng(path.join(capDir, 'play-running.png'), repairPlayTriangle(cropOf(built.plate, artBox(built.frame, key))));
  }
  punchWells(built.plate, built.frame);
  writePng(path.join(outDir, '_v7-plate.png'), built.plate);
  console.log('scale', built.frame.s.toFixed(5), 'padX', built.frame.padX.toFixed(2), 'bands', built.frame.bands.map((band) => `${Math.round(band.y)}+${Math.round(band.h)}`).join(' '));

  for (const [key, frameSpec] of Object.entries(FACEPLATE_FRAMES)) {
    const plate = key === '390x844' ? built : composite(src, frameSpec.w, frameSpec.h, frameSpec.insets);
    const image = plate.plate;
    const frame = plate.frame;
    if (key !== '390x844') punchWells(image, frame);
    const name = `faceplate-${key}.png`;
    writePng(path.join(root, 'assets', 'north-star-face', name), image);
    writePng(path.join(root, 'assets', 'faceplate', name), image);
    console.log(name, image.width, image.height);
  }
  console.log('caps', capDir);
}

build();
