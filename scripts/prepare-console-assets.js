'use strict';

/**
 * Deterministic Console derivatives.
 * Masters are read-only. No black-to-alpha punch. No inpainting.
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const mastersDir = path.join(root, 'assets-src/pockt-3-console/masters');
const outDir = path.join(root, 'assets/pockt-3-console');

const ALPHA_SOLID = 240;
const ALPHA_EDGE = 16;

function readPng(rel) {
  return PNG.sync.read(fs.readFileSync(path.join(mastersDir, rel)));
}

function writePng(name, png) {
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, name);
  fs.writeFileSync(dest, PNG.sync.write(png));
  return dest;
}

function px(png, x, y) {
  return (png.width * y + x) << 2;
}

function liftSolidAlpha(png) {
  const { data } = png;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= ALPHA_SOLID) data[i] = 255;
  }
}

function contentBox(png, minA = ALPHA_EDGE) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[px(png, x, y) + 3] >= minA) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('no visible content');
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function circleCrop(png) {
  const box = contentBox(png);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  let maxR = 0;
  const rays = 180;
  for (let i = 0; i < rays; i += 1) {
    const ang = (i / rays) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let r = 0;
    let last = 0;
    const limit = Math.hypot(png.width, png.height);
    while (r < limit) {
      const x = Math.round(cx + dx * r);
      const y = Math.round(cy + dy * r);
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) break;
      if (png.data[px(png, x, y) + 3] >= ALPHA_EDGE) last = r;
      r += 1;
    }
    if (last > maxR) maxR = last;
  }
  const pad = 6;
  const side = Math.ceil(maxR * 2 + pad * 2);
  const x0 = Math.round(cx - side / 2);
  const y0 = Math.round(cy - side / 2);
  return crop(png, x0, y0, side, side);
}

function crop(png, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h, colorType: 6 });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = x0 + x;
      const sy = y0 + y;
      const di = px(out, x, y);
      if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) {
        out.data[di] = 0;
        out.data[di + 1] = 0;
        out.data[di + 2] = 0;
        out.data[di + 3] = 0;
        continue;
      }
      const si = px(png, sx, sy);
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function boxScale(png, tw, th) {
  const out = new PNG({ width: tw, height: th, colorType: 6 });
  const xScale = png.width / tw;
  const yScale = png.height / th;
  for (let y = 0; y < th; y += 1) {
    const sy0 = y * yScale;
    const sy1 = Math.min(png.height, (y + 1) * yScale);
    for (let x = 0; x < tw; x += 1) {
      const sx0 = x * xScale;
      const sx1 = Math.min(png.width, (x + 1) * xScale);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wsum = 0;
      const ix0 = Math.floor(sx0);
      const iy0 = Math.floor(sy0);
      const ix1 = Math.min(png.width - 1, Math.ceil(sx1) - 1);
      const iy1 = Math.min(png.height - 1, Math.ceil(sy1) - 1);
      for (let sy = iy0; sy <= iy1; sy += 1) {
        const yOverlap = Math.min(sy1, sy + 1) - Math.max(sy0, sy);
        if (yOverlap <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx += 1) {
          const xOverlap = Math.min(sx1, sx + 1) - Math.max(sx0, sx);
          if (xOverlap <= 0) continue;
          const weight = xOverlap * yOverlap;
          const i = px(png, sx, sy);
          const pa = png.data[i + 3];
          r += png.data[i] * weight;
          g += png.data[i + 1] * weight;
          b += png.data[i + 2] * weight;
          a += pa * weight;
          wsum += weight;
        }
      }
      const di = px(out, x, y);
      out.data[di] = wsum ? Math.round(r / wsum) : 0;
      out.data[di + 1] = wsum ? Math.round(g / wsum) : 0;
      out.data[di + 2] = wsum ? Math.round(b / wsum) : 0;
      out.data[di + 3] = wsum ? Math.round(a / wsum) : 0;
    }
  }
  return out;
}

function scaleToHeight(png, height) {
  const width = Math.max(1, Math.round((png.width * height) / png.height));
  return boxScale(png, width, height);
}

function nineSliceH(png, left, right, destW) {
  if (left + right >= png.width) {
    throw new Error('9-slice caps exceed source width');
  }
  const midSrc = png.width - left - right;
  const midDst = destW - left - right;
  if (midDst < 1) throw new Error('destination too narrow for 9-slice');
  const out = new PNG({ width: destW, height: png.height, colorType: 6 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < destW; x += 1) {
      let sx;
      if (x < left) sx = x;
      else if (x >= destW - right) sx = png.width - (destW - x);
      else sx = left + ((x - left) * midSrc) / midDst;
      const sxi = Math.min(png.width - 1, Math.max(0, Math.floor(sx)));
      const frac = sx - sxi;
      const sxi2 = Math.min(png.width - 1, sxi + 1);
      const i0 = px(png, sxi, y);
      const i1 = px(png, sxi2, y);
      const di = px(out, x, y);
      for (let c = 0; c < 4; c += 1) {
        out.data[di + c] = Math.round(png.data[i0 + c] * (1 - frac) + png.data[i1 + c] * frac);
      }
    }
  }
  return out;
}

function prepareHousing() {
  const src = readPng('console_knob_housing.png');
  const cropped = circleCrop(src);
  const scaled = boxScale(cropped, 256, 256);
  liftSolidAlpha(scaled);
  const names = ['console_knob_housing.png', 'console_tap_housing.png', 'console_pockt_housing.png'];
  const written = names.map((name) => writePng(name, scaled));
  return { names: written, source: `${cropped.width}x${cropped.height} -> 256x256` };
}

function preparePill() {
  const src = readPng('console_pill_plate.png');
  const box = contentBox(src, 20);
  const pad = 4;
  const cropped = crop(
    src,
    box.minX - pad,
    box.minY - pad,
    box.w + pad * 2,
    box.h + pad * 2
  );
  const scaled = scaleToHeight(cropped, 192);
  const cap = Math.min(144, Math.max(64, Math.floor(scaled.height * 0.75)));
  if (cap * 2 + 32 > scaled.width) {
    throw new Error(`pill too narrow to 9-slice (${scaled.width}x${scaled.height})`);
  }
  const sliced = nineSliceH(scaled, cap, cap, 768);
  liftSolidAlpha(sliced);
  return {
    dest: writePng('console_pill_plate.png', sliced),
    source: `${box.w}x${box.h} -> ${scaled.width}x192 cap=${cap} -> 768x192`,
  };
}

const housing = prepareHousing();
const pill = preparePill();
console.log(JSON.stringify({ housing, pill }, null, 2));
