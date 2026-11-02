'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'assets/north-star-v4/screen-reference.png');
const outDir = path.join(root, 'assets/north-star-v4/parts');
const maskDir = path.join(root, 'artifacts/north-star-v4-state-clean/masks');
const previewDir = path.join(root, 'artifacts/north-star-v4-state-clean');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(maskDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(srcPath));
const PLATE = { x: 150, y: 84, w: 192, h: 80 };
const BEATS = { x: 14, y: 608, w: 464, h: 128 };
const BEAT_CENTERS = [131, 205, 279, 353];
const BEAT_CY = 666;
const DISC_R = 34;
const NUMERAL = { dy: 28, w: 28, h: 28, pad: 0 };
const NAV = { x: 6, y: 820, w: 480, h: 88 };
const SLOT_W = 80;
const LAMP = { x: 36, y: 640, w: 52, h: 56 };
const LOOP = { x: 392, y: 628, w: 78, h: 96 };
const PLAY = { x: 118, y: 726, w: 112, h: 98 };
const METER = { x: 228, y: 732, w: 152, h: 88 };

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
function write(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}
function cropOf(img, rect) {
  const png = blank(rect.w, rect.h);
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const [r, g, b, a] = get(img, rect.x + x, rect.y + y);
      set(png, x, y, r, g, b, a);
    }
  }
  return png;
}
function blitOpaque(dst, png, x0, y0) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const [r, g, b, a] = get(png, x, y);
      if (a < 8) continue;
      set(dst, x0 + x, y0 + y, r, g, b, 255);
    }
  }
}

function dilate(mask, w, h, radius) {
  const out = new Uint8Array(w * h);
  const r2 = radius * radius;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > r2) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          out[yy * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

function fillHoles(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  function push(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i] || mask[i]) return;
    seen[i] = 1;
    stack.push(x, y);
  }
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  const out = new Uint8Array(mask);
  for (let i = 0; i < out.length; i += 1) if (!seen[i]) out[i] = 1;
  return out;
}

function components(img, accept) {
  const w = img.width;
  const h = img.height;
  const seen = new Uint8Array(w * h);
  const found = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const start = y * w + x;
      if (seen[start]) continue;
      const [r, g, b] = get(img, x, y);
      if (!accept(r, g, b, x, y)) continue;
      const q = [x, y];
      seen[start] = 1;
      let n = 0;
      let minx = x;
      let miny = y;
      let maxx = x;
      let maxy = y;
      const pixels = [];
      for (let qi = 0; qi < q.length; qi += 2) {
        const cx = q[qi];
        const cy = q[qi + 1];
        pixels.push(cx, cy);
        n += 1;
        if (cx < minx) minx = cx;
        if (cy < miny) miny = cy;
        if (cx > maxx) maxx = cx;
        if (cy > maxy) maxy = cy;
        const near = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of near) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const id = ny * w + nx;
          if (seen[id]) continue;
          const [rr, gg, bb] = get(img, nx, ny);
          if (!accept(rr, gg, bb, nx, ny)) continue;
          seen[id] = 1;
          q.push(nx, ny);
        }
      }
      found.push({ n, minx, miny, maxx, maxy, pixels });
    }
  }
  return found;
}

function maskFromComponents(img, comps, radius) {
  const w = img.width;
  const h = img.height;
  const seed = new Uint8Array(w * h);
  for (const comp of comps) {
    for (let i = 0; i < comp.pixels.length; i += 2) seed[comp.pixels[i + 1] * w + comp.pixels[i]] = 1;
  }
  let mask = dilate(seed, w, h, radius);
  mask = fillHoles(mask, w, h);
  const clipped = new Uint8Array(w * h);
  const pad = radius + 2;
  for (const comp of comps) {
    const x0 = Math.max(0, comp.minx - pad);
    const y0 = Math.max(0, comp.miny - pad);
    const x1 = Math.min(w - 1, comp.maxx + pad);
    const y1 = Math.min(h - 1, comp.maxy + pad);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) if (mask[y * w + x]) clipped[y * w + x] = 1;
    }
  }
  return clipped;
}

function smoothField(img, mask) {
  const w = img.width;
  const h = img.height;
  const cur = new Float32Array(w * h * 3);
  const next = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = get(img, x, y);
      const i = (y * w + x) * 3;
      cur[i] = px[0];
      cur[i + 1] = px[1];
      cur[i + 2] = px[2];
    }
  }
  next.set(cur);
  const iterations = Math.max(w, h) * 8;
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        if (!mask[p]) continue;
        const i = p * 3;
        let r = 0;
        let g = 0;
        let b = 0;
        const neighbors = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ];
        for (const [nx, ny] of neighbors) {
          const j = (ny * w + nx) * 3;
          r += cur[j];
          g += cur[j + 1];
          b += cur[j + 2];
        }
        next[i] = r * 0.25;
        next[i + 1] = g * 0.25;
        next[i + 2] = b * 0.25;
      }
    }
    cur.set(next);
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      const i = (y * w + x) * 3;
      const grain = ((x * 13) ^ (y * 29)) & 3;
      const nudge = grain - 1;
      set(
        img,
        x,
        y,
        Math.max(0, Math.min(255, Math.round(cur[i] + nudge))),
        Math.max(0, Math.min(255, Math.round(cur[i + 1] + nudge))),
        Math.max(0, Math.min(255, Math.round(cur[i + 2] + nudge * 0.5))),
        255,
      );
    }
  }
}

function paintWithDonors(img, mask, donors) {
  if (!donors.length) return;
  const w = img.width;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      const a = donors[(x * 13 + y * 7) % donors.length];
      const b = donors[(x * 5 + y * 17 + 3) % donors.length];
      set(img, x, y, (a[0] + b[0]) >> 1, (a[1] + b[1]) >> 1, (a[2] + b[2]) >> 1, 255);
    }
  }
  const copy = clone(img);
  for (let y = 1; y < img.height - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      if (!mask[y * w + x]) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!mask[(y + dy) * w + (x + dx)]) continue;
          const [rr, gg, bb] = get(copy, x + dx, y + dy);
          r += rr;
          g += gg;
          b += bb;
          n += 1;
        }
      }
      if (!n) continue;
      set(img, x, y, Math.round(r / n), Math.round(g / n), Math.round(b / n), 255);
    }
  }
}

function collectDonors(img, mask, accept) {
  const donors = [];
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (mask[y * img.width + x]) continue;
      const px = get(img, x, y);
      if (!accept(px, x, y)) continue;
      if ((x + y) % 2 === 0) donors.push(px);
    }
  }
  return donors;
}

function inkFrom(img, mask) {
  const ink = blank(img.width, img.height);
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (!mask[y * img.width + x]) continue;
      const [r, g, b] = get(img, x, y);
      set(ink, x, y, r, g, b, 255);
    }
  }
  return ink;
}

function maskPng(mask, w, h) {
  const png = blank(w, h);
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) continue;
    png.data[i * 4] = 255;
    png.data[i * 4 + 1] = 255;
    png.data[i * 4 + 2] = 255;
    png.data[i * 4 + 3] = 255;
  }
  return png;
}

function checker(png) {
  const out = blank(png.width, png.height);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const dark = ((x >> 3) + (y >> 3)) % 2 === 0;
      const base = dark ? 18 : 42;
      const [r, g, b, a] = get(png, x, y);
      if (a < 8) set(out, x, y, base, base, base + 4, 255);
      else set(out, x, y, r, g, b, 255);
    }
  }
  return out;
}

function regionMae(rect, rebuilt) {
  let sum = 0;
  let n = 0;
  let worst = 0;
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const a = get(src, rect.x + x, rect.y + y);
      const b = get(rebuilt, x, y);
      const d = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
      sum += d;
      n += 1;
      if (d > worst) worst = d;
    }
  }
  return { mae: sum / n, worst };
}

function inpaintHorizontal(img, mask) {
  const w = img.width;
  const h = img.height;
  const cur = new Float32Array(w * h * 3);
  const next = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = get(img, x, y);
      const i = (y * w + x) * 3;
      cur[i] = px[0];
      cur[i + 1] = px[1];
      cur[i + 2] = px[2];
    }
  }
  next.set(cur);
  for (let iter = 0; iter < 2500; iter += 1) {
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        if (!mask[p]) continue;
        const i = p * 3;
        const up = ((y - 1) * w + x) * 3;
        const down = ((y + 1) * w + x) * 3;
        const left = (y * w + (x - 1)) * 3;
        const right = (y * w + (x + 1)) * 3;
        next[i] = (cur[up] + cur[down] + cur[left] + cur[right]) * 0.25;
        next[i + 1] = (cur[up + 1] + cur[down + 1] + cur[left + 1] + cur[right + 1]) * 0.25;
        next[i + 2] = (cur[up + 2] + cur[down + 2] + cur[left + 2] + cur[right + 2]) * 0.25;
      }
    }
    cur.set(next);
  }
  const orig = new Float32Array(next);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = get(img, x, y);
      const i = (y * w + x) * 3;
      orig[i] = px[0];
      orig[i + 1] = px[1];
      orig[i + 2] = px[2];
    }
  }
  const blur = new Float32Array(orig.length);
  for (let y = 2; y < h - 2; y += 1) {
    for (let x = 2; x < w - 2; x += 1) {
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) acc += orig[((y + dy) * w + (x + dx)) * 3 + c];
        }
        blur[i + c] = acc / 25;
      }
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (!mask[p]) continue;
      const i = p * 3;
      const sx = 16 + (x % 18);
      const sy = Math.max(2, Math.min(h - 3, y));
      const s = (sy * w + sx) * 3;
      const scale = mask[sy * w + sx] ? 0 : 0.85;
      const r = cur[i] + (orig[s] - blur[s]) * scale;
      const g = cur[i + 1] + (orig[s + 1] - blur[s + 1]) * scale;
      const b = cur[i + 2] + (orig[s + 2] - blur[s + 2]) * scale;
      set(img, x, y, Math.max(0, Math.min(255, Math.round(r))), Math.max(0, Math.min(255, Math.round(g))), Math.max(0, Math.min(255, Math.round(b))), 255);
    }
  }
}

function recolorInk(ink, target) {
  const out = blank(ink.width, ink.height);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = 0; y < ink.height; y += 1) {
    for (let x = 0; x < ink.width; x += 1) {
      const px = get(ink, x, y);
      if (px[3] < 8) continue;
      sr += px[0];
      sg += px[1];
      sb += px[2];
      n += 1;
    }
  }
  const srcL = n ? lum(sr / n, sg / n, sb / n) : 1;
  const dstL = Math.max(1, lum(target[0], target[1], target[2]));
  for (let y = 0; y < ink.height; y += 1) {
    for (let x = 0; x < ink.width; x += 1) {
      const px = get(ink, x, y);
      if (px[3] < 8) continue;
      const scale = lum(px[0], px[1], px[2]) / Math.max(1, srcL);
      set(
        out,
        x,
        y,
        Math.max(0, Math.min(255, Math.round(target[0] * scale * (srcL / dstL)))),
        Math.max(0, Math.min(255, Math.round(target[1] * scale * (srcL / dstL)))),
        Math.max(0, Math.min(255, Math.round(target[2] * scale * (srcL / dstL)))),
        255,
      );
    }
  }
  return out;
}

const report = {};

// --- BPM plate ---
const plateSrc = cropOf(src, PLATE);
const plateComps = components(plateSrc, (r, g, b, x, y) => {
  if (x < 8 || y < 6 || x > PLATE.w - 8 || y > PLATE.h - 4) return false;
  return lum(r, g, b) > 78 && b > 70;
}).filter((comp) => comp.n > 40 && comp.minx > 20 && comp.maxx < PLATE.w - 16);
const valueComps = plateComps.filter((comp) => comp.maxy < 56);
const labelComps = plateComps.filter((comp) => comp.miny >= 56);
const valueMask = maskFromComponents(plateSrc, valueComps, 4);
const labelMask = maskFromComponents(plateSrc, labelComps, 3);
const plateMask = new Uint8Array(PLATE.w * PLATE.h);
for (let i = 0; i < plateMask.length; i += 1) plateMask[i] = valueMask[i] || labelMask[i] ? 1 : 0;
const plate = clone(plateSrc);
const plateDonors = collectDonors(plateSrc, plateMask, (px) => lum(px[0], px[1], px[2]) < 24);
smoothField(plate, plateMask);
const bpmValue = inkFrom(plateSrc, valueMask);
const bpmLabel = inkFrom(plateSrc, labelMask);
write(path.join(outDir, 'bpm-plate.png'), plate);
write(path.join(outDir, 'bpm-plate-empty.png'), plate);
write(path.join(outDir, 'bpm-value.png'), bpmValue);
write(path.join(outDir, 'bpm-label.png'), bpmLabel);
write(path.join(maskDir, 'bpm-120.png'), maskPng(valueMask, PLATE.w, PLATE.h));
write(path.join(maskDir, 'bpm-label.png'), maskPng(labelMask, PLATE.w, PLATE.h));
{
  const rebuilt = clone(plate);
  blitOpaque(rebuilt, bpmLabel, 0, 0);
  blitOpaque(rebuilt, bpmValue, 0, 0);
  report.plate = regionMae(PLATE, rebuilt);
  report.plateGlyphs = plateComps.map((comp) => comp.n);
}

// --- meter ---
const meterSrc = cropOf(src, METER);
const meterComps = components(meterSrc, (r, g, b, x, y) => {
  if (x < 10 || y < 10 || x > METER.w - 10 || y > METER.h - 10) return false;
  return lum(r, g, b) > 96 && r > 140 && g > 130;
}).filter((comp) => comp.n > 20 && comp.minx > 14 && comp.maxx < METER.w - 10);
const meterMask = maskFromComponents(meterSrc, meterComps, 4);
const meterShell = clone(meterSrc);
const meterDonors = collectDonors(meterSrc, meterMask, (px) => lum(px[0], px[1], px[2]) < 28);
smoothField(meterShell, meterMask);
const meterInk = inkFrom(meterSrc, meterMask);
write(path.join(outDir, 'meter-shell.png'), meterShell);
write(path.join(outDir, 'meter-shell-empty.png'), meterShell);
write(path.join(outDir, 'meter-ink.png'), meterInk);
write(path.join(maskDir, 'meter-face.png'), maskPng(meterMask, METER.w, METER.h));
{
  const rebuilt = clone(meterShell);
  blitOpaque(rebuilt, meterInk, 0, 0);
  report.meter = regionMae(METER, rebuilt);
  report.meterGlyphs = meterComps.map((comp) => [comp.n, comp.minx, comp.miny, comp.maxx, comp.maxy]);
}

// --- play ---
const playSrc = cropOf(src, PLAY);
const playComps = components(playSrc, (r, g, b, x, y) => {
  if (x < 30 || y < 18 || x > PLAY.w - 22 || y > PLAY.h - 22) return false;
  return lum(r, g, b) < 88;
}).filter((comp) => comp.n > 80);
playComps.sort((a, b) => b.n - a.n);
const playMask = maskFromComponents(playSrc, playComps.slice(0, 1), 4);
const playShell = clone(playSrc);
inpaintHorizontal(playShell, playMask);
const playIcon = inkFrom(playSrc, playMask);
const playPause = blank(PLAY.w, PLAY.h);
const inkDark = [36, 24, 14];
for (const bx of [40, 64]) {
  for (let y = 28; y < PLAY.h - 30; y += 1) {
    for (let x = bx; x < bx + 11; x += 1) {
      const shade = y < 34 ? 18 : 0;
      set(playPause, x, y, inkDark[0] + shade, inkDark[1] + shade, inkDark[2], 255);
    }
  }
}
write(path.join(outDir, 'play-shell.png'), playShell);
write(path.join(outDir, 'play-shell-empty.png'), playShell);
write(path.join(outDir, 'play-icon.png'), playIcon);
write(path.join(outDir, 'play-pause.png'), playPause);
write(path.join(maskDir, 'play-triangle.png'), maskPng(playMask, PLAY.w, PLAY.h));
{
  const rebuilt = clone(playShell);
  blitOpaque(rebuilt, playIcon, 0, 0);
  report.play = regionMae(PLAY, rebuilt);
  report.playGlyph = playComps[0] ? playComps[0].n : 0;
}

// --- nav ---
const navSrc = cropOf(src, NAV);
const iconMask = new Uint8Array(NAV.w * NAV.h);
const tileMask = new Uint8Array(NAV.w * NAV.h);
for (let y = 16; y < NAV.h - 8; y += 1) {
  for (let x = 4; x < NAV.w - 4; x += 1) {
    const [r, g, b] = get(navSrc, x, y);
    if (lum(r, g, b) > 72) iconMask[y * NAV.w + x] = 1;
  }
}
const iconDilated = dilate(iconMask, NAV.w, NAV.h, 3);
for (let y = 14; y < NAV.h - 6; y += 1) {
  for (let x = 8; x < SLOT_W - 6; x += 1) {
    const [r, g, b] = get(navSrc, x, y);
    const other = get(navSrc, x + SLOT_W, y);
    const L = lum(r, g, b);
    const Lo = lum(other[0], other[1], other[2]);
    if (iconDilated[y * NAV.w + x]) continue;
    if (L > Lo + 8 && L < 120 && r > b) tileMask[y * NAV.w + x] = 1;
  }
}
const tileDilated = fillHoles(dilate(tileMask, NAV.w, NAV.h, 3), NAV.w, NAV.h);
for (let slot = 0; slot < 6; slot += 1) {
  for (let y = 16; y < NAV.h - 8; y += 1) {
    for (let x = slot * SLOT_W + 6; x < (slot + 1) * SLOT_W - 4; x += 1) {
      const [r, g, b] = get(navSrc, x, y);
      if (lum(r, g, b) < (slot === 0 ? 8 : 13)) continue;
      const i = y * NAV.w + x;
      if (slot === 0 && !iconDilated[i]) tileDilated[i] = 1;
      else iconDilated[i] = 1;
    }
  }
}
for (let i = 0; i < tileDilated.length; i += 1) if (iconDilated[i]) tileDilated[i] = 0;
const navMask = new Uint8Array(NAV.w * NAV.h);
for (let i = 0; i < navMask.length; i += 1) navMask[i] = iconDilated[i] || tileDilated[i] ? 1 : 0;
const navTray = clone(navSrc);
const navDonors = collectDonors(navSrc, navMask, (px, x) => x > SLOT_W * 2 && x < SLOT_W * 5 && lum(px[0], px[1], px[2]) < 9);
smoothField(navTray, navMask);
// Slot 0 sits against the bright tray end. Pull masked pixels back to the
// dark field measured in the middle slots so that end does not bleed in.
{
  const samples = [];
  for (let slot = 2; slot <= 4; slot += 1) {
    for (let y = 18; y < navTray.height - 10; y += 1) {
      for (let x = slot * 80 + 14; x < (slot + 1) * 80 - 12; x += 1) {
        if (navMask[y * navTray.width + x]) continue;
        const px = get(navTray, x, y);
        const L = lum(px[0], px[1], px[2]);
        if (L < 12) samples.push(px);
      }
    }
  }
  samples.sort((a, b) => lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]));
  const tone = samples[Math.floor(samples.length / 2)] || [8, 7, 6, 255];
  for (let y = 0; y < navTray.height; y += 1) {
    for (let x = 0; x < navTray.width; x += 1) {
      if (!navMask[y * navTray.width + x]) continue;
      const grain = ((x * 13) ^ (y * 29)) & 3;
      const nudge = grain - 1;
      set(
        navTray,
        x,
        y,
        Math.max(0, Math.min(255, tone[0] + nudge)),
        Math.max(0, Math.min(255, tone[1] + nudge)),
        Math.max(0, Math.min(255, tone[2] + nudge)),
        255,
      );
    }
  }
}
const slotInk = [];
const slotOn = [];
let dialColor = [214, 186, 120];
let restColor = [214, 206, 190];
{
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let rr = 0;
  let gg = 0;
  let bb = 0;
  let nn = 0;
  for (let y = 0; y < NAV.h; y += 1) {
    for (let x = 0; x < SLOT_W; x += 1) {
      if (!iconDilated[y * NAV.w + x]) continue;
      const px = get(navSrc, x, y);
      if (lum(px[0], px[1], px[2]) < 110) continue;
      r += px[0];
      g += px[1];
      b += px[2];
      n += 1;
    }
    for (let x = SLOT_W; x < SLOT_W * 2; x += 1) {
      if (!iconDilated[y * NAV.w + x]) continue;
      const px = get(navSrc, x, y);
      if (lum(px[0], px[1], px[2]) < 110) continue;
      rr += px[0];
      gg += px[1];
      bb += px[2];
      nn += 1;
    }
  }
  if (n) dialColor = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  if (nn) restColor = [Math.round(rr / nn), Math.round(gg / nn), Math.round(bb / nn)];
}
for (let slot = 0; slot < 6; slot += 1) {
  const ink = blank(SLOT_W, NAV.h);
  for (let y = 0; y < NAV.h; y += 1) {
    for (let x = 0; x < SLOT_W; x += 1) {
      const sx = slot * SLOT_W + x;
      if (!iconDilated[y * NAV.w + sx]) continue;
      const [r, g, b] = get(navSrc, sx, y);
      set(ink, x, y, r, g, b, 255);
    }
  }
  slotInk.push(ink);
  slotOn.push(slot === 0 ? ink : recolorInk(ink, dialColor));
  write(path.join(outDir, `nav-slot-${slot}.png`), ink);
  write(path.join(outDir, `nav-slot-${slot}-on.png`), slot === 0 ? ink : recolorInk(ink, dialColor));
}
const dialRest = recolorInk(slotInk[0], restColor);
const navTile = blank(SLOT_W, NAV.h);
for (let y = 0; y < NAV.h; y += 1) {
  for (let x = 0; x < SLOT_W; x += 1) {
    if (!tileDilated[y * NAV.w + x]) continue;
    const [r, g, b] = get(navSrc, x, y);
    set(navTile, x, y, r, g, b, 255);
  }
}
// Faint icon and label shadows sit below the luminance mask. Replace each
// slot well with the row median of all six wells so the vertical tray shading
// stays and the horizontal glyph shapes do not.
{
  const y0 = 18;
  const y1 = navTray.height - 12;
  for (let y = y0; y < y1; y += 1) {
    const row = [];
    for (let slot = 0; slot < 6; slot += 1) {
      for (let x = slot * SLOT_W + 12; x < (slot + 1) * SLOT_W - 10; x += 1) {
        const px = get(navTray, x, y);
        const L = lum(px[0], px[1], px[2]);
        if (L > 28) continue;
        row.push(px);
      }
    }
    if (!row.length) continue;
    row.sort((a, b) => lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]));
    const tone = row[Math.floor(row.length / 2)];
    for (let slot = 0; slot < 6; slot += 1) {
      for (let x = slot * SLOT_W + 12; x < (slot + 1) * SLOT_W - 10; x += 1) {
        const px = get(navTray, x, y);
        if (lum(px[0], px[1], px[2]) > 28) continue;
        const grain = ((x * 17) ^ (y * 31)) & 3;
        const nudge = grain - 1;
        set(
          navTray,
          x,
          y,
          Math.max(0, Math.min(255, tone[0] + nudge)),
          Math.max(0, Math.min(255, tone[1] + nudge)),
          Math.max(0, Math.min(255, tone[2])),
          255,
        );
      }
    }
  }
}
write(path.join(outDir, 'nav-tray-empty.png'), navTray);
write(path.join(outDir, 'nav-base.png'), navTray);
write(path.join(outDir, 'nav-tile.png'), navTile);
write(path.join(outDir, 'nav-dial-rest.png'), dialRest);
write(path.join(maskDir, 'nav-icons.png'), maskPng(iconDilated, NAV.w, NAV.h));
write(path.join(maskDir, 'nav-tile.png'), maskPng(tileDilated, NAV.w, NAV.h));
{
  const rebuilt = clone(navTray);
  blitOpaque(rebuilt, navTile, 0, 0);
  for (let slot = 0; slot < 6; slot += 1) blitOpaque(rebuilt, slotInk[slot], slot * SLOT_W, 0);
  report.nav = regionMae(NAV, rebuilt);
  report.navColors = { dialColor, restColor };
}

// --- beats housing ---
const beatsSrc = cropOf(src, BEATS);
const beatsMask = new Uint8Array(BEATS.w * BEATS.h);
function punchRect(rect, pad = 0) {
  const x0 = rect.x - BEATS.x - pad;
  const y0 = rect.y - BEATS.y - pad;
  const x1 = rect.x - BEATS.x + rect.w + pad;
  const y1 = rect.y - BEATS.y + rect.h + pad;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (x < 0 || y < 0 || x >= BEATS.w || y >= BEATS.h) continue;
      beatsMask[y * BEATS.w + x] = 1;
    }
  }
}
punchRect(LAMP, 0);
punchRect(LOOP, 0);
for (const cx of BEAT_CENTERS) {
  const lx = cx - BEATS.x;
  const ly = BEAT_CY - BEATS.y;
  for (let y = ly - DISC_R; y < ly + DISC_R; y += 1) {
    for (let x = lx - DISC_R; x < lx + DISC_R; x += 1) {
      const dx = x - lx + 0.5;
      const dy = y - ly + 0.5;
      if (dx * dx + dy * dy > DISC_R * DISC_R) continue;
      if (x < 0 || y < 0 || x >= BEATS.w || y >= BEATS.h) continue;
      beatsMask[y * BEATS.w + x] = 1;
    }
  }
  const nx = lx - (NUMERAL.w / 2 + NUMERAL.pad);
  const ny = ly + NUMERAL.dy - NUMERAL.pad;
  const nw = NUMERAL.w + NUMERAL.pad * 2;
  const nh = NUMERAL.h + NUMERAL.pad * 2;
  const local = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      const [r, g, b] = get(beatsSrc, nx + x, ny + y);
      if (lum(r, g, b) > 55) local[y * nw + x] = 1;
    }
  }
  const grown = dilate(local, nw, nh, 2);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      if (!grown[y * nw + x]) continue;
      const hx = nx + x;
      const hy = ny + y;
      if (hx < 0 || hy < 0 || hx >= BEATS.w || hy >= BEATS.h) continue;
      beatsMask[hy * BEATS.w + hx] = 1;
    }
  }
}
const housing = clone(beatsSrc);
const beatDonors = collectDonors(beatsSrc, beatsMask, (px) => {
  const L = lum(px[0], px[1], px[2]);
  return L > 8 && L < 42 && px[1] < px[0] + 12;
});
paintWithDonors(housing, beatsMask, beatDonors);
write(path.join(outDir, 'beats-housing.png'), housing);
write(path.join(outDir, 'beats-housing-empty.png'), housing);
write(path.join(maskDir, 'beats-state.png'), maskPng(beatsMask, BEATS.w, BEATS.h));

function discAt(cx) {
  const png = blank(DISC_R * 2, DISC_R * 2);
  for (let y = 0; y < DISC_R * 2; y += 1) {
    for (let x = 0; x < DISC_R * 2; x += 1) {
      const dx = x - DISC_R + 0.5;
      const dy = y - DISC_R + 0.5;
      if (dx * dx + dy * dy > (DISC_R + 1) * (DISC_R + 1)) continue;
      const [r, g, b] = get(src, cx - DISC_R + x, BEAT_CY - DISC_R + y);
      set(png, x, y, r, g, b, 255);
    }
  }
  return png;
}
function numeralAt(cx) {
  const w = NUMERAL.w + NUMERAL.pad * 2;
  const h = NUMERAL.h + NUMERAL.pad * 2;
  const png = blank(w, h);
  const x0 = cx - NUMERAL.w / 2 - NUMERAL.pad;
  const y0 = BEAT_CY + NUMERAL.dy - NUMERAL.pad;
  const local = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b] = get(src, x0 + x, y0 + y);
      if (lum(r, g, b) > 55) local[y * w + x] = 1;
    }
  }
  const grown = dilate(local, w, h, 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!grown[y * w + x]) continue;
      const [r, g, b] = get(src, x0 + x, y0 + y);
      set(png, x, y, r, g, b, 255);
    }
  }
  return png;
}
const discs = BEAT_CENTERS.map((cx) => discAt(cx));
discs.forEach((disc, index) => write(path.join(outDir, `beat-disc-${index}.png`), disc));
BEAT_CENTERS.forEach((cx, index) => write(path.join(outDir, `beat-numeral-${index}.png`), numeralAt(cx)));

function shadeDisc(disc, mode) {
  const png = clone(disc);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const px = get(png, x, y);
      if (px[3] < 8) continue;
      const dx = x - DISC_R + 0.5;
      const dy = y - DISC_R + 0.5;
      const rad = Math.hypot(dx, dy);
      if (mode === 'mute' && rad < 27) {
        set(png, x, y, 22, 18, 15, 255);
        continue;
      }
      if (mode === 'soft') {
        const t = rad < 27 ? 0.42 : 0.75;
        set(png, x, y, Math.round(px[0] * t + 20 * (1 - t)), Math.round(px[1] * t + 16 * (1 - t)), Math.round(px[2] * t + 13 * (1 - t)), 255);
      }
    }
  }
  return png;
}
write(path.join(outDir, 'beat-disc-strong.png'), discs[0]);
write(path.join(outDir, 'beat-disc-normal.png'), discs[2]);
write(path.join(outDir, 'beat-disc-soft.png'), shadeDisc(discs[2], 'soft'));
write(path.join(outDir, 'beat-disc-mute.png'), shadeDisc(discs[2], 'mute'));

const lampSrc = cropOf(src, LAMP);
write(path.join(outDir, 'lamp-on.png'), lampSrc);
const lampOff = clone(lampSrc);
const lampMask = new Uint8Array(LAMP.w * LAMP.h);
for (let y = 0; y < LAMP.h; y += 1) {
  for (let x = 0; x < LAMP.w; x += 1) {
    const [r, g, b] = get(lampSrc, x, y);
    if (g > r + 6 && g > 28) lampMask[y * LAMP.w + x] = 1;
  }
}
const lampDilated = dilate(lampMask, LAMP.w, LAMP.h, 4);
const lampDonors = collectDonors(lampSrc, lampDilated, (px) => lum(px[0], px[1], px[2]) < 36 && px[1] <= px[0] + 6);
paintWithDonors(lampOff, lampDilated, lampDonors.length ? lampDonors : [[12, 10, 9, 255]]);
write(path.join(outDir, 'lamp-off.png'), lampOff);
write(path.join(maskDir, 'lamp-green.png'), maskPng(lampDilated, LAMP.w, LAMP.h));
const loopSrc = cropOf(src, LOOP);
write(path.join(outDir, 'loop.png'), loopSrc);

{
  const rebuilt = clone(housing);
  blitOpaque(rebuilt, lampSrc, LAMP.x - BEATS.x, LAMP.y - BEATS.y);
  blitOpaque(rebuilt, loopSrc, LOOP.x - BEATS.x, LOOP.y - BEATS.y);
  BEAT_CENTERS.forEach((cx, index) => {
    blitOpaque(rebuilt, discs[index], cx - BEATS.x - DISC_R, BEAT_CY - BEATS.y - DISC_R);
    blitOpaque(rebuilt, numeralAt(cx), cx - BEATS.x - NUMERAL.w / 2 - NUMERAL.pad, BEAT_CY - BEATS.y + NUMERAL.dy - NUMERAL.pad);
  });
  report.beats = regionMae(BEATS, rebuilt);
}

const geometryPath = path.join(outDir, 'geometry.json');
const geometry = JSON.parse(fs.readFileSync(geometryPath, 'utf8'));
geometry.discR = DISC_R;
geometry.numeral.pad = NUMERAL.pad;
geometry.stateClean = true;
fs.writeFileSync(geometryPath, JSON.stringify(geometry, null, 2));

function placeOnSheet(sheet, png, x, y) {
  blitOpaque(sheet, checker(png), x, y);
}
const sheet = blank(1100, 760);
sheet.data.fill(12);
for (let i = 3; i < sheet.data.length; i += 4) sheet.data[i] = 255;
placeOnSheet(sheet, plate, 20, 20);
placeOnSheet(sheet, meterShell, 240, 20);
placeOnSheet(sheet, playShell, 420, 20);
placeOnSheet(sheet, navTray, 20, 140);
placeOnSheet(sheet, housing, 20, 260);
placeOnSheet(sheet, lampOff, 520, 260);
placeOnSheet(sheet, lampSrc, 600, 260);
write(path.join(previewDir, 'clean-bases-sheet.png'), sheet);
write(path.join(previewDir, 'bpm-plate-empty.png'), checker(plate));
write(path.join(previewDir, 'meter-shell-empty.png'), checker(meterShell));
write(path.join(previewDir, 'play-shell-empty.png'), checker(playShell));
write(path.join(previewDir, 'nav-tray-empty.png'), checker(navTray));
write(path.join(previewDir, 'beats-housing-empty.png'), checker(housing));

console.log(JSON.stringify(report, null, 2));
