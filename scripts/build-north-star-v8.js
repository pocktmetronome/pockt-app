'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { rigidFrame, FACEPLATE_FRAMES, NORTH_STAR_DIAL } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const masterPath = process.env.POCKT_MASTER || path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png');
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
  const cx = NORTH_STAR_DIAL.cx;
  const cy = NORTH_STAR_DIAL.cy;
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

function at(src, x, y) {
  const xx = Math.max(0, Math.min(src.width - 1, x | 0));
  const yy = Math.max(0, Math.min(src.height - 1, y | 0));
  const i = (yy * src.width + xx) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2]];
}

function dist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function smooth(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function hash(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function profile(src, x) {
  const raw = [];
  for (let y = 12; y < src.height - 12; y += 8) raw.push(at(src, x, y));
  const lum = raw.map((rgb) => rgb[0] + rgb[1] + rgb[2]);
  const filtered = raw.map((rgb, index) => {
    const window = lum.slice(Math.max(0, index - 4), index + 5).slice().sort((a, b) => a - b);
    const mid = window[window.length >> 1];
    if (Math.abs(lum[index] - mid) > 90) {
      const j = lum.findIndex((value, i) => Math.abs(i - index) > 2 && Math.abs(value - mid) < 40);
      return j >= 0 ? raw[j] : raw[Math.max(0, index - 1)];
    }
    return rgb;
  });
  return filtered;
}

function lighting(left, right, x, y, width, height) {
  const ty = Math.max(0, Math.min(0.999, y / height));
  const i = ty * (left.length - 1);
  const i0 = Math.floor(i);
  const i1 = Math.min(left.length - 1, i0 + 1);
  const t = i - i0;
  const u = Math.max(0, Math.min(1, x / (width - 1)));
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c += 1) {
    const l = left[i0][c] * (1 - t) + left[i1][c] * t;
    const r = right[i0][c] * (1 - t) + right[i1][c] * t;
    out[c] = l * (1 - u) + r * u;
  }
  return out;
}

function collectPatches(src) {
  const seeds = [
    [22, 230], [22, 340], [22, 450], [22, 560], [22, 660],
    [868, 230], [868, 360], [868, 500], [868, 640],
    [180, 824], [360, 824], [560, 824],
    [180, 1448], [480, 1448], [700, 1448],
  ];
  const patches = [];
  for (const [x, y] of seeds) {
    if (x < 0 || y < 0 || x + 48 >= src.width || y + 48 >= src.height) continue;
    let sum = 0;
    let sum2 = 0;
    let n = 0;
    for (let yy = 0; yy < 48; yy += 2) {
      for (let xx = 0; xx < 48; xx += 2) {
        const rgb = at(src, x + xx, y + yy);
        const v = rgb[0] + rgb[1] + rgb[2];
        sum += v;
        sum2 += v * v;
        n += 1;
      }
    }
    const mean = sum / n;
    const variance = sum2 / n - mean * mean;
    if (variance > 2800 || mean < 40 || mean > 520) continue;
    const image = new PNG({ width: 48, height: 48 });
    let pr = 0;
    let pg = 0;
    let pb = 0;
    for (let yy = 0; yy < 48; yy += 1) {
      for (let xx = 0; xx < 48; xx += 1) {
        const rgb = at(src, x + xx, y + yy);
        const i = (yy * 48 + xx) * 4;
        image.data[i] = rgb[0];
        image.data[i + 1] = rgb[1];
        image.data[i + 2] = rgb[2];
        image.data[i + 3] = 255;
        pr += rgb[0];
        pg += rgb[1];
        pb += rgb[2];
      }
    }
    const count = 48 * 48;
    patches.push({ image, mean: [pr / count, pg / count, pb / count], y });
  }
  if (patches.length < 4) throw new Error('not enough clean chassis patches');
  return patches;
}

function buildChassis(src, width, height) {
  const stripX = 26;
  const stripY = 236;
  const stripW = 46;
  const stripH = 430;
  const scale = width / 390 * (425 / 941);
  const leftKeys = [220, 420, 980, 1320].map((y) => at(src, 30, y));
  const rightKeys = [220, 420, 980, 1320].map((y) => at(src, 900, y));
  const columnMean = [];
  for (let x = 0; x < stripW; x += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let y = 0; y < stripH; y += 2) {
      const rgb = at(src, stripX + x, stripY + y);
      r += rgb[0];
      g += rgb[1];
      b += rgb[2];
    }
    const n = stripH / 2;
    columnMean.push([r / n, g / n, b / n]);
  }
  const dst = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const su = x / scale;
      const sv = y / scale;
      const sx = stripX + (((su + Math.sin(sv * 0.04) * 4) % stripW) + stripW) % stripW;
      const along = ((sv % stripH) + stripH) % stripH;
      const sy = stripY + along;
      const sy2 = stripY + (along + stripH * 0.5) % stripH;
      const seam = Math.min(along, stripH - along) / stripH;
      const blend = seam < 0.1 ? seam / 0.1 : 1;
      const a = sample(src, sx, sy);
      const b = sample(src, sx, sy2);
      const ty = y / Math.max(1, height - 1);
      const key = ty * (leftKeys.length - 1);
      const k0 = Math.floor(key);
      const k1 = Math.min(leftKeys.length - 1, k0 + 1);
      const kt = key - k0;
      const u = x / Math.max(1, width - 1);
      const light = [0, 0, 0];
      for (let c = 0; c < 3; c += 1) {
        const l = leftKeys[k0][c] * (1 - kt) + leftKeys[k1][c] * kt;
        const r = rightKeys[k0][c] * (1 - kt) + rightKeys[k1][c] * kt;
        light[c] = l * (1 - u) + r * u;
      }
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const picked = a[c] * blend + b[c] * (1 - blend);
        const local = columnMean[Math.max(0, Math.min(stripW - 1, Math.floor(sx - stripX)))][c];
        const grain = 1 + (picked / Math.max(1, local) - 1) * 0.7;
        dst.data[i + c] = Math.max(0, Math.min(255, light[c] * grain));
      }
      dst.data[i + 3] = 255;
    }
  }
  if (width === 390) fs.writeFileSync(path.join(outDir, '_v8-chassis.png'), PNG.sync.write(dst));
  return dst;
}

function boxBlur(src, radius) {
  const { width, height } = src;
  const tmp = new PNG({ width, height });
  const out = new PNG({ width, height });
  const win = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let sum = [0, 0, 0];
    for (let x = -radius; x <= radius; x += 1) {
      const i = (y * width + Math.max(0, Math.min(width - 1, x))) * 4;
      sum[0] += src.data[i];
      sum[1] += src.data[i + 1];
      sum[2] += src.data[i + 2];
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      tmp.data[o] = sum[0] / win;
      tmp.data[o + 1] = sum[1] / win;
      tmp.data[o + 2] = sum[2] / win;
      const xOut = x - radius;
      const xIn = x + radius + 1;
      const oi = (y * width + Math.max(0, Math.min(width - 1, xOut))) * 4;
      const ii = (y * width + Math.max(0, Math.min(width - 1, xIn))) * 4;
      sum[0] += src.data[ii] - src.data[oi];
      sum[1] += src.data[ii + 1] - src.data[oi + 1];
      sum[2] += src.data[ii + 2] - src.data[oi + 2];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = [0, 0, 0];
    for (let y = -radius; y <= radius; y += 1) {
      const i = (Math.max(0, Math.min(height - 1, y)) * width + x) * 4;
      sum[0] += tmp.data[i];
      sum[1] += tmp.data[i + 1];
      sum[2] += tmp.data[i + 2];
    }
    for (let y = 0; y < height; y += 1) {
      const o = (y * width + x) * 4;
      out.data[o] = sum[0] / win;
      out.data[o + 1] = sum[1] / win;
      out.data[o + 2] = sum[2] / win;
      out.data[o + 3] = 255;
      const yOut = y - radius;
      const yIn = y + radius + 1;
      const oi = (Math.max(0, Math.min(height - 1, yOut)) * width + x) * 4;
      const ii = (Math.max(0, Math.min(height - 1, yIn)) * width + x) * 4;
      sum[0] += tmp.data[ii] - tmp.data[oi];
      sum[1] += tmp.data[ii + 1] - tmp.data[oi + 1];
      sum[2] += tmp.data[ii + 2] - tmp.data[oi + 2];
    }
  }
  return out;
}

function stampEdge(dst, src, x0, x1, scale) {
  const span = 420;
  const y0 = 260;
  for (let y = 0; y < dst.height; y += 1) {
    const sy = y0 + ((y / scale) % span);
    for (let x = x0; x < x1; x += 1) {
      const screenX = Math.round((x / src.width) * dst.width);
      if (screenX < 0 || screenX >= dst.width) continue;
      const inward = x0 === 0 ? (x1 - 1 - x) / 18 : (x - x0) / 18;
      const fade = inward > 1 ? 0 : 1 - smooth(inward);
      if (fade <= 0) continue;
      const rgb = sample(src, x, sy);
      const i = (y * dst.width + Math.max(0, Math.min(dst.width - 1, screenX))) * 4;
      dst.data[i] = dst.data[i] * (1 - fade) + rgb[0] * fade;
      dst.data[i + 1] = dst.data[i + 1] * (1 - fade) + rgb[1] * fade;
      dst.data[i + 2] = dst.data[i + 2] * (1 - fade) + rgb[2] * fade;
    }
  }
}

function roundedDist(x, y, rect, radius) {
  const cx = Math.max(rect.x + radius, Math.min(rect.x + rect.w - radius, x));
  const cy = Math.max(rect.y + radius, Math.min(rect.y + rect.h - radius, y));
  const boxX = Math.max(rect.x, Math.min(rect.x + rect.w, x));
  const boxY = Math.max(rect.y, Math.min(rect.y + rect.h, y));
  const inside = x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  const corner = Math.hypot(x - cx, y - cy);
  if (inside && corner <= radius) return radius - corner;
  if (inside) return Math.min(x - rect.x, rect.x + rect.w - x, y - rect.y, rect.y + rect.h - y);
  return -Math.hypot(x - boxX, y - boxY);
}

function makeSprite(src, bounds, alphaAt) {
  const sprite = new PNG({ width: bounds.w, height: bounds.h });
  for (let y = 0; y < bounds.h; y += 1) {
    for (let x = 0; x < bounds.w; x += 1) {
      const sx = bounds.x + x;
      const sy = bounds.y + y;
      const rgb = at(src, sx, sy);
      const a = Math.max(0, Math.min(255, alphaAt(sx, sy, rgb)));
      const i = (y * bounds.w + x) * 4;
      sprite.data[i] = rgb[0];
      sprite.data[i + 1] = rgb[1];
      sprite.data[i + 2] = rgb[2];
      sprite.data[i + 3] = a;
    }
  }
  return sprite;
}

function chassisAt(src, y) {
  return at(src, 36, Math.max(16, Math.min(src.height - 17, y)));
}

function silhouette(src, bounds, radius, corePad = 0) {
  return makeSprite(src, bounds, (x, y, rgb) => {
    const inside = roundedDist(x, y, bounds, radius);
    if (inside > 10 + corePad) return 255;
    if (inside < -18) return 0;
    if (inside >= 0) return 255;
    const keep = dist(rgb, chassisAt(src, y)) > 36 ? 1 : 0.35;
    return 255 * smooth((18 + inside) / 18) * keep;
  });
}

function circleSprite(src, cx, cy, radius) {
  const bounds = {
    x: Math.floor(cx - radius - 28),
    y: Math.floor(cy - radius - 28),
    w: Math.ceil(radius * 2 + 56),
    h: Math.ceil(radius * 2 + 56),
  };
  const sprite = makeSprite(src, bounds, (x, y, rgb) => {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= radius) return 255;
    if (d > radius + 26) return 0;
    const keep = dist(rgb, chassisAt(src, y)) > 32;
    return keep ? 255 * (1 - smooth((d - radius) / 26)) : 0;
  });
  sprite.anchorY = cy;
  sprite.originX = bounds.x;
  sprite.originY = bounds.y;
  return sprite;
}

function screwSprite(src, cx, cy) {
  return circleSprite(src, cx, cy, 16);
}

function wordmarkSprite(src) {
  const bounds = { x: 320, y: 68, w: 300, h: 80 };
  return makeSprite(src, bounds, (x, y, rgb) => {
    const gold = rgb[0] > 90 && rgb[0] > rgb[1] + 8 && rgb[1] > rgb[2] + 4 && rgb[0] < 230;
    if (!gold) return 0;
    const edge = Math.min(x - bounds.x, bounds.x + bounds.w - x, y - bounds.y, bounds.y + bounds.h - y);
    return edge < 2 ? 180 : 255;
  });
}

function place(dst, sprite, frame, anchorY) {
  const originX = sprite.originX ?? 0;
  const originY = sprite.originY ?? 0;
  const anchor = anchorY ?? originY;
  const screenX = frame.mapX(originX);
  const screenY = frame.mapY(anchor) - (anchor - originY) * frame.s;
  const destW = Math.ceil(sprite.width * frame.s) + 1;
  const destH = Math.ceil(sprite.height * frame.s) + 1;
  for (let y = 0; y < destH; y += 1) {
    const py = Math.floor(screenY + y);
    if (py < 0 || py >= dst.height) continue;
    const sy = y / frame.s;
    for (let x = 0; x < destW; x += 1) {
      const px = Math.floor(screenX + x);
      if (px < 0 || px >= dst.width) continue;
      const sx = x / frame.s;
      const x0 = Math.max(0, Math.min(sprite.width - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(sprite.height - 1, Math.floor(sy)));
      const x1 = Math.min(sprite.width - 1, x0 + 1);
      const y1 = Math.min(sprite.height - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, sx - x0));
      const ty = Math.max(0, Math.min(1, sy - y0));
      const i00 = (y0 * sprite.width + x0) * 4;
      const i10 = (y0 * sprite.width + x1) * 4;
      const i01 = (y1 * sprite.width + x0) * 4;
      const i11 = (y1 * sprite.width + x1) * 4;
      const a = (sprite.data[i00 + 3] * (1 - tx) * (1 - ty)
        + sprite.data[i10 + 3] * tx * (1 - ty)
        + sprite.data[i01 + 3] * (1 - tx) * ty
        + sprite.data[i11 + 3] * tx * ty) / 255;
      if (a <= 0.01) continue;
      const color = [0, 0, 0];
      const corners = [[i00, (1 - tx) * (1 - ty)], [i10, tx * (1 - ty)], [i01, (1 - tx) * ty], [i11, tx * ty]];
      for (const [index, w] of corners) {
        color[0] += sprite.data[index] * w;
        color[1] += sprite.data[index + 1] * w;
        color[2] += sprite.data[index + 2] * w;
      }
      const d = (py * dst.width + px) * 4;
      dst.data[d] = dst.data[d] * (1 - a) + color[0] * a;
      dst.data[d + 1] = dst.data[d + 1] * (1 - a) + color[1] * a;
      dst.data[d + 2] = dst.data[d + 2] * (1 - a) + color[2] * a;
    }
  }
}

function tag(sprite, x, y) {
  sprite.originX = x;
  sprite.originY = y;
  return sprite;
}

function objectsFrom(src) {
  const tuner = tag(silhouette(src, { x: 90, y: 64, w: 152, h: 114 }, 22), 90, 64);
  tuner.anchorY = 120;
  const sound = tag(silhouette(src, { x: 704, y: 66, w: 170, h: 112 }, 22), 704, 66);
  sound.anchorY = 122;
  const word = tag(wordmarkSprite(src), 320, 68);
  word.anchorY = 110;
  const dial = circleSprite(src, NORTH_STAR_DIAL.cx, NORTH_STAR_DIAL.cy, 324);
  const minus = circleSprite(src, 100.5, 748.5, 54);
  const plus = circleSprite(src, 840.5, 748.5, 54);
  const beats = tag(silhouette(src, { x: 34, y: 860, w: 874, h: 214 }, 42), 34, 860);
  beats.anchorY = 960;
  const transport = tag(silhouette(src, { x: 26, y: 1090, w: 890, h: 364 }, 36), 26, 1090);
  transport.anchorY = 1270;
  const nav = tag(silhouette(src, { x: 22, y: 1456, w: 898, h: 216 }, 28), 22, 1456);
  nav.anchorY = 1560;
  return [
    ['dial', dial, NORTH_STAR_DIAL.cy],
    ['minus', minus, 748.5],
    ['plus', plus, 748.5],
    ['beats', beats, 960],
    ['transport', transport, 1270],
    ['nav', nav, 1560],
    ['wordmark', word, 110],
    ['tuner', tuner, 120],
    ['sound', sound, 122],
  ];
}

function composite(src, sprites, width, height, insets) {
  const frame = rigidFrame(width, height, insets);
  const plate = buildChassis(src, width, height);
  for (const [, sprite, anchor] of sprites) place(plate, sprite, frame, anchor);
  return { plate, frame };
}

function checker(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = ((x >> 4) + (y >> 4)) % 2 === 0 ? 214 : 168;
      const i = (y * width + x) * 4;
      png.data[i] = v;
      png.data[i + 1] = v;
      png.data[i + 2] = v - 6;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

function fitSprite(sheet, sprite, cellX, cellY, cell) {
  const scale = Math.min((cell - 16) / sprite.width, (cell - 16) / sprite.height);
  const w = Math.max(1, Math.round(sprite.width * scale));
  const h = Math.max(1, Math.round(sprite.height * scale));
  const ox = cellX + Math.round((cell - w) / 2);
  const oy = cellY + Math.round((cell - h) / 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(sprite.width - 1, Math.floor(x / scale));
      const sy = Math.min(sprite.height - 1, Math.floor(y / scale));
      const i = (sy * sprite.width + sx) * 4;
      const a = sprite.data[i + 3] / 255;
      if (a <= 0) continue;
      const d = ((oy + y) * sheet.width + (ox + x)) * 4;
      sheet.data[d] = sheet.data[d] * (1 - a) + sprite.data[i] * a;
      sheet.data[d + 1] = sheet.data[d + 1] * (1 - a) + sprite.data[i + 1] * a;
      sheet.data[d + 2] = sheet.data[d + 2] * (1 - a) + sprite.data[i + 2] * a;
    }
  }
}

function writeMasks(sprites) {
  const names = ['tuner', 'sound', 'dial', 'beats', 'transport', 'nav', 'wordmark', 'minus', 'plus'];
  const cell = 280;
  const cols = 3;
  const rows = Math.ceil(names.length / cols);
  const sheet = checker(cols * cell, rows * cell);
  names.forEach((name, index) => {
    const found = sprites.find((item) => item[0] === name);
    if (!found) return;
    fitSprite(sheet, found[1], (index % cols) * cell, Math.floor(index / cols) * cell, cell);
  });
  fs.writeFileSync(path.join(outDir, 'OBJECT_MASKS_V8.png'), PNG.sync.write(sheet));
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
  const sprites = objectsFrom(src);
  writeMasks(sprites);
  const hd = Number(process.env.POCKT_FACEPLATE_SCALE || 0);
  if (hd > 1) {
    // Device-resolution faceplates (@3x). Same rigid frame, every coordinate times the scale.
    const dir = path.join(root, 'assets', 'north-star-face', 'hd');
    for (const [key, f] of Object.entries(FACEPLATE_FRAMES)) {
      const ins = { top: f.insets.top * hd, bottom: f.insets.bottom * hd, left: 0, right: 0 };
      const { plate } = composite(src, sprites, f.w * hd, f.h * hd, ins);
      writePng(path.join(dir, `faceplate-${key}@${hd}x.png`), plate);
      console.log('hd', key, plate.width, plate.height);
    }
    return;
  }
  for (const [key, frameSpec] of Object.entries(FACEPLATE_FRAMES)) {
    const { plate, frame } = composite(src, sprites, frameSpec.w, frameSpec.h, frameSpec.insets);
    const name = `faceplate-${key}.png`;
    writePng(path.join(root, 'assets', 'north-star-face', name), plate);
    writePng(path.join(root, 'assets', 'faceplate', name), plate);
    if (key === '390x844') writePng(path.join(outDir, '_v8-plate.png'), plate);
    console.log(name, plate.width, plate.height, 's', frame.s.toFixed(5), 'pad', frame.padX.toFixed(2));
  }
}

build();
