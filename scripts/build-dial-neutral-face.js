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

const CX = 249;
const CY = 390;
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
function sampleSrc(radius, angle) {
  const x = CX + Math.sin(angle) * radius;
  const y = CY - Math.cos(angle) * radius;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const a = get(src, x0, y0);
  const b = get(src, x0 + 1, y0);
  const c = get(src, x0, y0 + 1);
  const d = get(src, x0 + 1, y0 + 1);
  return [0, 1, 2, 255].map((channel, index) => {
    if (index === 3) return 255;
    return a[index] * (1 - tx) * (1 - ty) + b[index] * tx * (1 - ty) + c[index] * (1 - tx) * ty + d[index] * tx * ty;
  });
}

const body = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const px = get(src, dial.x + x, dial.y + y);
    set(body, x, y, px[0], px[1], px[2], 255);
  }
}

const mask = new Uint8Array(dial.w * dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const dx = x - LCX;
    const dy = y - LCY;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dx, -dy);
    const px = get(src, dial.x + x, dial.y + y);
    const L = lum(px[0], px[1], px[2]);
    const shaft = needle.data[(y * needle.width + x) * 4 + 3] > 24;
    const tick = radius >= 162 && radius <= 186 && L > 100 && Math.abs(angle) > 0.04;
    const faceWedge = radius >= BOSS_R + 2 && radius <= 158 && Math.abs(angle) <= 0.27 && !tick;
    const shaftHole = shaft && radius > BOSS_R && radius < 188 && !tick;
    if (faceWedge || shaftHole) mask[y * dial.w + x] = 1;
  }
}

function warpWindow(center, width) {
  const out = [new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h)];
  const destHalf = 0.34;
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const dx = x - LCX;
      const dy = y - LCY;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dx, -dy);
      const mapped = center + (angle / destHalf) * width;
      const px = sampleSrc(radius, mapped);
      const index = y * dial.w + x;
      out[0][index] = px[0];
      out[1][index] = px[1];
      out[2][index] = px[2];
    }
  }
  return out;
}

function boxBlur(channels, radius, w = dial.w, h = dial.h) {
  const tmp = channels.map(() => new Float32Array(w * h));
  const out = channels.map(() => new Float32Array(w * h));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k += 1) {
          const xx = Math.max(0, Math.min(w - 1, x + k));
          sum += channels[c][y * w + xx];
          count += 1;
        }
        tmp[c][y * w + x] = sum / count;
      }
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k += 1) {
          const yy = Math.max(0, Math.min(h - 1, y + k));
          sum += tmp[c][yy * w + x];
          count += 1;
        }
        out[c][y * w + x] = sum / count;
      }
    }
  }
  return out;
}

function harmonicField() {
  const sol = [new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h), new Float32Array(dial.w * dial.h)];
  const interior = [];
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const index = y * dial.w + x;
      const px = get(body, x, y);
      sol[0][index] = px[0];
      sol[1][index] = px[1];
      sol[2][index] = px[2];
      if (mask[index]) interior.push(index);
    }
  }
  for (const index of interior) {
    const x = index % dial.w;
    const y = Math.floor(index / dial.w);
    let best = 1e9;
    let color = [sol[0][index], sol[1][index], sol[2][index]];
    for (let oy = -22; oy <= 22; oy += 2) {
      for (let ox = -22; ox <= 22; ox += 2) {
        const xx = x + ox;
        const yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= dial.w || yy >= dial.h) continue;
        const neighbor = yy * dial.w + xx;
        if (mask[neighbor]) continue;
        if (0.2126 * sol[0][neighbor] + 0.7152 * sol[1][neighbor] + 0.0722 * sol[2][neighbor] > 80) continue;
        const dist = ox * ox + oy * oy;
        if (dist < best) {
          best = dist;
          color = [sol[0][neighbor], sol[1][neighbor], sol[2][neighbor]];
        }
      }
    }
    sol[0][index] = color[0];
    sol[1][index] = color[1];
    sol[2][index] = color[2];
  }
  for (let iter = 0; iter < 500; iter += 1) {
    for (const index of interior) {
      const neighbors = [index - 1, index + 1, index - dial.w, index + dial.w];
      const usable = neighbors.filter((neighbor) => {
        if (neighbor < 0 || neighbor >= sol[0].length) return false;
        if (mask[neighbor]) return true;
        const light = sol[0][neighbor] * 0.2126 + sol[1][neighbor] * 0.7152 + sol[2][neighbor] * 0.0722;
        return light < 72;
      });
      if (!usable.length) continue;
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (const neighbor of usable) acc += sol[c][neighbor];
        sol[c][index] = acc / usable.length;
      }
    }
  }
  return { sol, interior };
}

const distance = new Float32Array(dial.w * dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const index = y * dial.w + x;
    if (!mask[index]) continue;
    let best = 18;
    for (let oy = -16; oy <= 16; oy += 1) {
      for (let ox = -16; ox <= 16; ox += 1) {
        const xx = x + ox;
        const yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= dial.w || yy >= dial.h) continue;
        if (mask[yy * dial.w + xx]) continue;
        const dist = Math.hypot(ox, oy);
        if (dist < best) best = dist;
      }
    }
    distance[index] = best;
  }
}

const lighting = harmonicField();

function poisson() {
  const ring = Array.from({ length: 230 }, () => [0, 0, 0]);
  for (let radius = 48; radius <= 210; radius += 1) {
    const bag = [];
    for (const deg of [-34, -32, -30, 30, 32, 34]) {
      const px = sampleSrc(radius, (deg * Math.PI) / 180);
      if (lum(px[0], px[1], px[2]) > 70) continue;
      bag.push(px);
    }
    if (!bag.length) continue;
    ring[radius] = [0, 1, 2].map((channel) => {
      const values = bag.map((px) => px[channel]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    });
  }
  const sol = lighting.sol.map((channel) => new Float32Array(channel));
  for (const index of lighting.interior) {
    const x = index % dial.w;
    const y = Math.floor(index / dial.w);
    const radius = Math.round(Math.hypot(x - LCX, y - LCY));
    const fade = Math.max(0, Math.min(1, distance[index] / 5));
    for (let c = 0; c < 3; c += 1) {
      const around = [radius - 2, radius - 1, radius, radius + 1, radius + 2]
        .filter((value) => value >= 48 && value <= 210)
        .reduce((sum, value) => sum + ring[value][c], 0);
      const count = [radius - 2, radius - 1, radius, radius + 1, radius + 2].filter((value) => value >= 48 && value <= 210).length;
      const detail = Math.max(-14, Math.min(14, ring[radius][c] - around / count));
      sol[c][index] += detail * fade;
    }
  }
  return sol;
}

function paint(sol) {
  const out = blank(dial.w, dial.h);
  for (let y = 0; y < dial.h; y += 1) {
    for (let x = 0; x < dial.w; x += 1) {
      const index = y * dial.w + x;
      const base = get(body, x, y);
      const rgb = mask[index]
        ? [sol[0][index], sol[1][index], sol[2][index]]
        : base;
      set(out, x, y, clampByte(rgb[0]), clampByte(rgb[1]), clampByte(rgb[2]), 255);
    }
  }
  return out;
}

function boundaryScore(img) {
  let sum = 0;
  let count = 0;
  let max = 0;
  for (let y = 2; y < dial.h - 2; y += 1) {
    for (let x = 2; x < dial.w - 2; x += 1) {
      const index = y * dial.w + x;
      if (!mask[index]) continue;
      const edge = !mask[index - 1] || !mask[index + 1] || !mask[index - dial.w] || !mask[index + dial.w];
      if (!edge) continue;
      const here = get(img, x, y);
      const outside = !mask[index - 1] ? get(img, x - 1, y) : !mask[index + 1] ? get(img, x + 1, y) : !mask[index - dial.w] ? get(img, x, y - 1) : get(img, x, y + 1);
      const delta = Math.abs(lum(here[0], here[1], here[2]) - lum(outside[0], outside[1], outside[2]));
      sum += delta;
      count += 1;
      if (delta > max) max = delta;
    }
  }
  return { mean: sum / Math.max(1, count), max, count };
}

function alienInk(img) {
  let bright = 0;
  for (let y = 78; y < 112; y += 1) {
    for (let x = 200; x < 270; x += 1) {
      const px = get(img, x, y);
      if (lum(px[0], px[1], px[2]) > 90) bright += 1;
    }
  }
  return bright;
}
const sol = poisson();
const img = paint(sol);
const score = boundaryScore(img);
console.log('boundary', score.mean.toFixed(2), 'aliens', alienInk(img));
const best = { img, score };

const face = best.img;
for (let radius = 163; radius <= 180; radius += 0.5) {
  for (let deg = 4.8; deg <= 6.4; deg += 0.2) {
    const from = sampleSrc(radius, (deg * Math.PI) / 180);
    if (lum(from[0], from[1], from[2]) < 120) continue;
    const to = ((deg - 5.6) * Math.PI) / 180;
    const x = Math.round(LCX + Math.sin(to) * radius);
    const y = Math.round(LCY - Math.cos(to) * radius);
    set(face, x, y, from[0], from[1], from[2], 255);
  }
}
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const dx = x - LCX + 0.5;
    const dy = y - LCY + 0.5;
    if (dx * dx + dy * dy > BOSS_R * BOSS_R) continue;
    set(face, x, y, 0, 0, 0, 0);
  }
}

function glyphAlpha(box) {
  const [sx, sy, sw, sh] = box;
  const values = [];
  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) values.push(lum(...get(src, sx + x, sy + y)));
  }
  values.sort((a, b) => a - b);
  const floor = values[Math.floor(values.length * 0.35)];
  const alpha = [];
  let ink = [];
  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const px = get(src, sx + x, sy + y);
      const L = lum(px[0], px[1], px[2]);
      const a = Math.max(0, Math.min(1, (L - floor - 6) / 78));
      alpha.push(a);
      if (a > 0.45 && L > 165 && L < 250) ink.push(px);
    }
  }
  return { sw, sh, alpha, ink };
}

function medianInk(samples) {
  if (!samples.length) return [232, 224, 208];
  return [0, 1, 2].map((channel) => {
    const values = samples.map((px) => px[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
}

const one = glyphAlpha([234, 244, 12, 22]);
const two = glyphAlpha([343, 293, 14, 18]);
const zero = glyphAlpha([262, 244, 14, 22]);
const ink = medianInk(one.ink.length ? [...one.ink, ...zero.ink] : two.ink);
console.log('shared ink', ink.map((v) => Math.round(v)).join(','));

function blitShape(img, shape, destX, destY, destW, destH) {
  for (let y = 0; y < destH; y += 1) {
    for (let x = 0; x < destW; x += 1) {
      const gx = ((x + 0.5) * shape.sw) / destW - 0.5;
      const gy = ((y + 0.5) * shape.sh) / destH - 0.5;
      const x0 = Math.max(0, Math.min(shape.sw - 1, Math.floor(gx)));
      const y0 = Math.max(0, Math.min(shape.sh - 1, Math.floor(gy)));
      const x1 = Math.min(shape.sw - 1, x0 + 1);
      const y1 = Math.min(shape.sh - 1, y0 + 1);
      const tx = gx - x0;
      const ty = gy - y0;
      const alpha =
        shape.alpha[y0 * shape.sw + x0] * (1 - tx) * (1 - ty) +
        shape.alpha[y0 * shape.sw + x1] * tx * (1 - ty) +
        shape.alpha[y1 * shape.sw + x0] * (1 - tx) * ty +
        shape.alpha[y1 * shape.sw + x1] * tx * ty;
      if (alpha < 0.08) continue;
      const shade = 1.06 - (y / Math.max(1, destH - 1)) * 0.14;
      const lx = destX + x - dial.x;
      const ly = destY + y - dial.y;
      set(
        img,
        lx,
        ly,
        clampByte(ink[0] * shade),
        clampByte(ink[1] * shade),
        clampByte(ink[2] * shade),
        clampByte(alpha * 255)
      );
    }
  }
}

const fixed = blank(dial.w, dial.h);
blitShape(fixed, one, 234, 244, 12, 22);
blitShape(fixed, two, 246, 244, 15, 21);
blitShape(fixed, zero, 262, 244, 14, 22);

function blurAlpha(img, radius) {
  const w = img.width;
  const h = img.height;
  const srcA = new Float32Array(w * h);
  const srcC = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  for (let i = 0; i < w * h; i += 1) {
    const a = img.data[i * 4 + 3] / 255;
    srcA[i] = a;
    srcC[0][i] = img.data[i * 4] * a;
    srcC[1][i] = img.data[i * 4 + 1] * a;
    srcC[2][i] = img.data[i * 4 + 2] * a;
  }
  const blur = (input) => {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k += 1) {
          sum += input[y * w + Math.max(0, Math.min(w - 1, x + k))];
          count += 1;
        }
        tmp[y * w + x] = sum / count;
      }
    }
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k += 1) {
          sum += tmp[Math.max(0, Math.min(h - 1, y + k)) * w + x];
          count += 1;
        }
        out[y * w + x] = sum / count;
      }
    }
    return out;
  };
  const a = blur(srcA);
  const c = srcC.map((channel) => blur(channel));
  for (let i = 0; i < w * h; i += 1) {
    const alpha = a[i];
    if (alpha < 0.004) {
      img.data[i * 4] = 0;
      img.data[i * 4 + 1] = 0;
      img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = 0;
      continue;
    }
    img.data[i * 4] = clampByte(c[0][i] / alpha);
    img.data[i * 4 + 1] = clampByte(c[1][i] / alpha);
    img.data[i * 4 + 2] = clampByte(c[2][i] / alpha);
    img.data[i * 4 + 3] = clampByte(alpha * 255);
  }
}

const shadow = blank(dial.w, dial.h);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    if (needle.data[(y * needle.width + x) * 4 + 3] < 200) continue;
    const tx = x + 5;
    const ty = y + 1;
    if (tx < 0 || ty < 0 || tx >= dial.w || ty >= dial.h) continue;
    set(shadow, tx, ty, 6, 4, 3, 180);
  }
}
blurAlpha(shadow, 3);
for (let y = 0; y < dial.h; y += 1) {
  for (let x = 0; x < dial.w; x += 1) {
    const i = (y * dial.w + x) * 4;
    if (needle.data[i + 3] > 160) shadow.data[i + 3] = 0;
  }
}

const local = blank(dial.w, dial.h);
for (let y = 1; y < dial.h - 1; y += 1) {
  for (let x = 1; x < dial.w - 1; x += 1) {
    if (needle.data[(y * needle.width + x) * 4 + 3] > 40) continue;
    let near = false;
    for (let oy = -10; oy <= 10 && !near; oy += 1) {
      for (let ox = -8; ox <= 8; ox += 1) {
        if (ox * ox + oy * oy > 100) continue;
        const xx = x + ox;
        const yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= dial.w || yy >= dial.h) continue;
        if (needle.data[(yy * needle.width + xx) * 4 + 3] > 200) near = true;
      }
    }
    if (!near) continue;
    const photo = get(src, dial.x + x, dial.y + y);
    const base = get(face, x, y);
    if (base[3] < 10) continue;
    const delta = [photo[0] - base[0], photo[1] - base[1], photo[2] - base[2]];
    const mag = Math.abs(delta[0]) + Math.abs(delta[1]) + Math.abs(delta[2]);
    if (mag < 18) continue;
    const L = lum(photo[0], photo[1], photo[2]);
    if (L > 150) continue;
    set(local, x, y, clampByte(base[0] + delta[0]), clampByte(base[1] + delta[1]), clampByte(base[2] + delta[2]), clampByte(Math.min(180, mag)));
  }
}
blurAlpha(local, 1);

fs.writeFileSync(path.join(outDir, 'dial-body-empty.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-body.png'), PNG.sync.write(face));
fs.writeFileSync(path.join(outDir, 'dial-fixed-120.png'), PNG.sync.write(fixed));
fs.writeFileSync(path.join(outDir, 'needle-shadow.png'), PNG.sync.write(shadow));
fs.writeFileSync(path.join(outDir, 'needle-local-120.png'), PNG.sync.write(local));

function zoom(png, x, y, w, h, scale, name) {
  const out = blank(w * scale, h * scale);
  for (let yy = 0; yy < out.height; yy += 1) {
    for (let xx = 0; xx < out.width; xx += 1) {
      const px = get(png, x + Math.floor(xx / scale), y + Math.floor(yy / scale));
      const dark = (Math.floor(xx / 8) + Math.floor(yy / 8)) % 2 === 0;
      const rgb = px[3] < 8 ? (dark ? [18, 18, 22] : [36, 36, 42]) : px;
      set(out, xx, yy, rgb[0], rgb[1], rgb[2], 255);
    }
  }
  fs.writeFileSync(path.join(preview, name), PNG.sync.write(out));
}
function rotate(png, turns) {
  const out = blank(png.width, png.height);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      let sx = x;
      let sy = y;
      if (turns === 1) {
        sx = y;
        sy = png.width - 1 - x;
      } else if (turns === 2) {
        sx = png.width - 1 - x;
        sy = png.height - 1 - y;
      } else if (turns === 3) {
        sx = png.height - 1 - y;
        sy = x;
      }
      const px = get(png, sx, sy);
      set(out, x, y, px[0], px[1], px[2], px[3] || 255);
    }
  }
  return out;
}
const crop = blank(220, 250);
for (let y = 0; y < crop.height; y += 1) {
  for (let x = 0; x < crop.width; x += 1) {
    const px = get(face, 118 + x, 20 + y);
    set(crop, x, y, px[3] < 8 ? 12 : px[0], px[3] < 8 ? 10 : px[1], px[3] < 8 ? 8 : px[2], 255);
  }
}
fs.writeFileSync(path.join(preview, 'dial-neutral-0deg.png'), PNG.sync.write(crop));
fs.writeFileSync(path.join(preview, 'dial-neutral-90deg.png'), PNG.sync.write(rotate(crop, 1)));
fs.writeFileSync(path.join(preview, 'dial-neutral-180deg.png'), PNG.sync.write(rotate(crop, 2)));
fs.writeFileSync(path.join(preview, 'dial-neutral-270deg.png'), PNG.sync.write(rotate(crop, 3)));

const low = boxBlur(
  [0, 1, 2].map((channel) => {
    const data = new Float32Array(crop.width * crop.height);
    for (let i = 0; i < data.length; i += 1) data[i] = crop.data[i * 4 + channel];
    return data;
  }),
  9,
  crop.width,
  crop.height
);
const lowPng = blank(crop.width, crop.height);
const highPng = blank(crop.width, crop.height);
for (let i = 0; i < crop.width * crop.height; i += 1) {
  for (let c = 0; c < 3; c += 1) {
    lowPng.data[i * 4 + c] = clampByte(low[c][i]);
    highPng.data[i * 4 + c] = clampByte(128 + (crop.data[i * 4 + c] - low[c][i]) * 3);
  }
  lowPng.data[i * 4 + 3] = 255;
  highPng.data[i * 4 + 3] = 255;
}
fs.writeFileSync(path.join(preview, 'dial-neutral-low-frequency.png'), PNG.sync.write(lowPng));
fs.writeFileSync(path.join(preview, 'dial-neutral-high-frequency.png'), PNG.sync.write(highPng));
zoom(face, 150, 20, 160, 220, 3, 'dial-empty-12oclock-closeup.png');
zoom(fixed, 200, 70, 90, 50, 6, 'dial-fixed-120-closeup.png');
console.log('built', 'boundary', best.score.mean.toFixed(2));
