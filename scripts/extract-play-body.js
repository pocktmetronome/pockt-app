const fs = require('fs');
const { PNG } = require('pngjs');

const CROP_X = 80;
const CROP_Y = 740;
const src = PNG.sync.read(fs.readFileSync('artifacts/dial-hardware-assets/_play-crop.png'));
const { width, height, data } = src;

function sumAt(x, y) {
  const i = (y * width + x) * 4;
  return data[i] + data[i + 1] + data[i + 2];
}

const seen = new Uint8Array(width * height);
const stack = [[100, 62]];
let minX = width, maxX = 0, minY = height, maxY = 0, n = 0;
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const k = y * width + x;
  if (seen[k]) continue;
  seen[k] = 1;
  if (sumAt(x, y) < 150) continue;
  n++;
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
console.log('flood', n, 'bounds', minX, minY, maxX, maxY, 'jpg', CROP_X + minX, CROP_Y + minY, CROP_X + maxX, CROP_Y + maxY);

const pad = 0;
const x0 = minX;
const y0 = minY;
const w = maxX - minX + 1;
const h = maxY - minY + 1;
const out = new PNG({ width: w, height: h });
const rad = h / 2;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const cx = x < rad ? rad : x > w - rad ? w - rad : x;
    const inside = (x - cx) ** 2 + (y - h / 2) ** 2 <= rad * rad + 1;
    const i = (y * w + x) * 4;
    const si = ((y0 + y) * width + (x0 + x)) * 4;
    if (!inside) {
      out.data[i + 3] = 0;
      continue;
    }
    out.data[i] = data[si];
    out.data[i + 1] = data[si + 1];
    out.data[i + 2] = data[si + 2];
    out.data[i + 3] = 255;
  }
}

const cx0 = w / 2;
const cy0 = h / 2;
function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

const icon = new Uint8Array(w * h);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (out.data[i + 3] < 10) continue;
    const dx = (x - cx0) / (w * 0.28);
    const dy = (y - cy0) / (h * 0.48);
    if (dx * dx + dy * dy > 1) continue;
    const r = out.data[i], g = out.data[i + 1], b = out.data[i + 2];
    if (chromaOf(r, g, b) < 22 && r + g + b > 160) icon[y * w + x] = 1;
  }
}
for (let n = 0; n < 3; n++) {
  const grown = new Uint8Array(icon);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!icon[y * w + x]) continue;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const sx = x + ox, sy = y + oy;
          const j = (sy * w + sx) * 4;
          const r = out.data[j], g = out.data[j + 1], b = out.data[j + 2];
          if (chromaOf(r, g, b) < 48) grown[sy * w + sx] = 1;
        }
      }
    }
  }
  icon.set(grown);
}

function isIcon(x, y) {
  return icon[y * w + x] === 1;
}

for (let pass = 0; pass < 8; pass++) {
  const next = Buffer.from(out.data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (out.data[i + 3] < 10) continue;
      if (!isIcon(x, y)) continue;
      const ang = Math.atan2(y - cy0, x - cx0);
      let donor = null;
      for (let dist = 28; dist < 70; dist += 2) {
        const sx = Math.round(cx0 + Math.cos(ang) * dist);
        const sy = Math.round(cy0 + Math.sin(ang) * dist);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const j = (sy * w + sx) * 4;
        if (out.data[j + 3] < 10) continue;
        const r = out.data[j], g = out.data[j + 1], b = out.data[j + 2];
        if (isIcon(sx, sy)) continue;
        donor = [r, g, b];
        break;
      }
      if (!donor) continue;
      next[i] = donor[0];
      next[i + 1] = donor[1];
      next[i + 2] = donor[2];
    }
  }
  out.data = next;
}

fs.writeFileSync('artifacts/dial-hardware-assets/_play-masked.png', PNG.sync.write(out));
console.log('wrote', w, h);
