'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const {
  BEZEL_OUTER,
  DIAL_CANVAS,
  DIAL_CENTER,
  FACE_RADIUS,
  SCALE_FONT,
  dialLabels,
  dialTicks,
  tickSegment,
} = require('../lib/dial-scale-geometry.js');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'dial-clean');
const donorPath = path.join(root, 'assets', 'north-star-v4', 'parts', 'dial-body-empty.png');
const needlePath = path.join(root, 'assets', 'north-star-v4', 'parts', 'needle.png');
const bossPath = path.join(root, 'assets', 'north-star-v4', 'parts', 'boss.png');

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function drawNeedle(size, c) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const along = c - y;
      if (along < 132 || along > 176) continue;
      const t = (along - 132) / 44;
      const half = 5.2 * (1 - t) + 0.8 * t;
      const dist = Math.abs(dx);
      if (dist > half + 0.8) continue;
      const edge = Math.max(0, Math.min(1, (half + 0.6 - dist) / 1.1));
      const ridge = dist < half * 0.22;
      const shade = dx / Math.max(half, 0.4);
      const rgb = ridge ? [255, 236, 206] : shade < -0.2 ? [230, 198, 140] : shade > 0.35 ? [90, 62, 28] : [196, 154, 96];
      const o = (y * size + x) * 4;
      png.data[o] = rgb[0];
      png.data[o + 1] = rgb[1];
      png.data[o + 2] = rgb[2];
      png.data[o + 3] = Math.round(255 * edge);
    }
  }
  return png;
}

function stampSignature(face, bezel, size, c) {
  face.data.fill(0);
  bezel.data.fill(0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const o = (y * size + x) * 4;
      if (r <= FACE_RADIUS) {
        const t = r / FACE_RADIUS;
        const lift = 14 + (1 - t) * 10 + (hash(Math.floor(r * 2)) - 0.5) * 3;
        const key = 0.92 + 0.1 * Math.max(0, Math.cos((deg * Math.PI) / 180)) * t;
        const v = lift * key;
        face.data[o] = clamp(v * 1.05);
        face.data[o + 1] = clamp(v);
        face.data[o + 2] = clamp(v * 0.92);
        face.data[o + 3] = r > FACE_RADIUS - 1.4 ? Math.round(255 * (FACE_RADIUS - r) / 1.4) : 255;
      }
      if (r >= 158 && r <= 164) {
        const v = 42 + (hash(Math.floor(deg * 4)) - 0.5) * 4;
        face.data[o] = clamp(v * 1.15);
        face.data[o + 1] = clamp(v);
        face.data[o + 2] = clamp(v * 0.72);
        face.data[o + 3] = 255;
      }
      if (r >= 200 && r <= 226) {
        const tooth = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((deg * Math.PI) / 180 * 168));
        const key = 0.42 + 0.85 * Math.max(0, Math.cos(((deg - 22) * Math.PI) / 180));
        const v = (22 + tooth * 92) * key;
        const edgeIn = Math.min(1, (r - 200) / 1.6);
        const edgeOut = Math.min(1, (226 - r) / 1.6);
        bezel.data[o] = clamp(v * 1.25);
        bezel.data[o + 1] = clamp(v * 0.92);
        bezel.data[o + 2] = clamp(v * 0.62);
        bezel.data[o + 3] = Math.round(255 * Math.min(edgeIn, edgeOut));
      }
    }
  }
}

function cleanBoss() {
  const boss = PNG.sync.read(fs.readFileSync(bossPath));
  const cleaned = new PNG({ width: boss.width, height: boss.height });
  const bx = (boss.width - 1) / 2;
  const by = (boss.height - 1) / 2;
  const br = Math.min(bx, by) - 0.5;
  const at = (x, y) => {
    const ix = Math.max(0, Math.min(boss.width - 1, Math.round(x)));
    const iy = Math.max(0, Math.min(boss.height - 1, Math.round(y)));
    const index = (iy * boss.width + ix) * 4;
    return [boss.data[index], boss.data[index + 1], boss.data[index + 2], boss.data[index + 3]];
  };
  for (let y = 0; y < boss.height; y += 1) {
    for (let x = 0; x < boss.width; x += 1) {
      const o = (y * boss.width + x) * 4;
      const r = Math.hypot(x - bx, y - by);
      if (r > br || boss.data[o + 3] < 8) continue;
      const deg = (Math.atan2(x - bx, -(y - by)) * 180) / Math.PI;
      const abs = Math.abs(deg);
      const stub = abs < 36 && r > 18 && y < by;
      const side = ((deg >= 0 ? 58 : -58) * Math.PI) / 180;
      const sampled = at(bx + Math.sin(side) * r, by - Math.cos(side) * r);
      const blend = stub ? Math.max(0, Math.min(1, (36 - abs) / 10)) : 0;
      const pixel = [0, 1, 2, 3].map((channel) => Math.round(boss.data[o + channel] * (1 - blend) + sampled[channel] * blend));
      cleaned.data[o] = pixel[0];
      cleaned.data[o + 1] = pixel[1];
      cleaned.data[o + 2] = pixel[2];
      cleaned.data[o + 3] = pixel[3];
    }
  }
  return cleaned;
}

function drawBoss() {
  const size = 128;
  const c = (size - 1) / 2;
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      if (r > c * 0.38) continue;
      const deg = Math.atan2(dx, -dy);
      const light = 0.78 + 0.28 * Math.cos(deg) * (0.35 + 0.65 * (r / c));
      const slot = Math.abs(dy) < 1.3 && Math.abs(dx) < c * 0.22 && r < c * 0.45;
      let tone = 28;
      if (slot) tone = 12;
      else if (r > c * 0.84) tone = 132;
      else if (r > c * 0.74) tone = 18;
      else if (r > c * 0.66) tone = 108;
      else tone = 36 + (1 - r / (c * 0.66)) * 10;
      const brush = (hash(Math.floor(deg * 40) + Math.floor(r)) - 0.5) * 6;
      const o = (y * size + x) * 4;
      const v = (tone + brush) * light;
      const rim = r > c * 0.66;
      png.data[o] = clamp(v * (rim ? 1.2 : 0.72));
      png.data[o + 1] = clamp(v * (rim ? 0.86 : 0.68));
      png.data[o + 2] = clamp(v * (rim ? 0.48 : 0.62));
      png.data[o + 3] = r > c - 1.4 ? Math.round(255 * (c - r) / 1.4) : 255;
    }
  }
  return png;
}

function gradeTransport() {
  for (const [from, to] of [
    ['transport_primary_shell_rest.png', 'transport-play-rest.png'],
    ['transport_primary_shell_pressed.png', 'transport-play-pressed.png'],
  ]) {
    const png = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'north-star-v3', from)));
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] < 8) continue;
      let r = png.data[i] * 0.9;
      let g = png.data[i + 1] * 0.74;
      let b = png.data[i + 2] * 0.58;
      const lum = r + g + b;
      if (lum > 560) {
        const scale = 560 / lum;
        r *= scale;
        g *= scale;
        b *= scale;
      }
      png.data[i] = clamp(r);
      png.data[i + 1] = clamp(g);
      png.data[i + 2] = clamp(b);
    }
    fs.writeFileSync(path.join(outDir, to), PNG.sync.write(png));
  }
}

function padBoss(cleaned, scale) {
  const size = cleaned.width;
  const out = new PNG({ width: size, height: size });
  out.data.fill(0);
  const origin = Math.round((size * (1 - scale)) / 2);
  const dest = size - origin * 2;
  for (let y = 0; y < dest; y += 1) {
    for (let x = 0; x < dest; x += 1) {
      const sx = Math.min(size - 1, Math.round((x / dest) * (size - 1)));
      const sy = Math.min(size - 1, Math.round((y / dest) * (size - 1)));
      const so = (sy * size + sx) * 4;
      const o = ((y + origin) * size + (x + origin)) * 4;
      out.data[o] = cleaned.data[so];
      out.data[o + 1] = cleaned.data[so + 1];
      out.data[o + 2] = cleaned.data[so + 2];
      out.data[o + 3] = cleaned.data[so + 3];
    }
  }
  return out;
}

function paintRound(size, pressed) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      if (r > c - 0.5) continue;
      const ny = dy / c;
      const light = pressed ? 0.62 : 1.05 - ny * 0.28;
      const v = (pressed ? 18 : 26) * light;
      const o = (y * size + x) * 4;
      png.data[o] = clamp(v * 1.08);
      png.data[o + 1] = clamp(v);
      png.data[o + 2] = clamp(v * 0.88);
      png.data[o + 3] = 255;
      if (r > c - 3 && r < c - 1.2) {
        png.data[o] = clamp(186 * Math.min(light, 1));
        png.data[o + 1] = clamp(148 * Math.min(light, 1));
        png.data[o + 2] = clamp(88 * Math.min(light, 1));
      }
      if (ny < -0.55 && r < c - 4) {
        png.data[o] = clamp(png.data[o] + 18);
        png.data[o + 1] = clamp(png.data[o + 1] + 14);
        png.data[o + 2] = clamp(png.data[o + 2] + 8);
      }
    }
  }
  return png;
}

function paintCap(w, h, champagne, pressed) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  const rad = Math.round(h * 0.28);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      const cx = x < rad ? rad - x : x > w - rad ? x - (w - rad) : 0;
      const cy = y < rad ? rad - y : y > h - rad ? y - (h - rad) : 0;
      if (cx || cy) {
        if (Math.hypot(cx, cy) > rad) continue;
      }
      const ny = y / h;
      const light = pressed ? 0.58 : 1.18 - ny * 0.42;
      const base = champagne ? [196, 154, 92] : [36, 33, 30];
      const shade = champagne ? [92, 64, 32] : [14, 13, 12];
      const mix = Math.min(1, Math.max(0, (ny - 0.45) / 0.55));
      const o = (y * w + x) * 4;
      png.data[o] = clamp((base[0] * (1 - mix) + shade[0] * mix) * light);
      png.data[o + 1] = clamp((base[1] * (1 - mix) + shade[1] * mix) * light);
      png.data[o + 2] = clamp((base[2] * (1 - mix) + shade[2] * mix) * light);
      png.data[o + 3] = 255;
      if (champagne && ny < 0.42 && inset > 3) {
        const sheen = (0.42 - ny) * 70;
        png.data[o] = clamp(png.data[o] + sheen);
        png.data[o + 1] = clamp(png.data[o + 1] + sheen * 0.85);
        png.data[o + 2] = clamp(png.data[o + 2] + sheen * 0.45);
      }
      if (inset < 1.5) {
        png.data[o] = clamp((champagne ? 230 : 150) * Math.min(light, 1.05));
        png.data[o + 1] = clamp((champagne ? 190 : 124) * Math.min(light, 1.05));
        png.data[o + 2] = clamp((champagne ? 120 : 78) * Math.min(light, 1.05));
      }
    }
  }
  return png;
}

function writeShells() {
  fs.writeFileSync(path.join(outDir, 'shell-utility.png'), PNG.sync.write(paintRound(180, false)));
  fs.writeFileSync(path.join(outDir, 'shell-utility-down.png'), PNG.sync.write(paintRound(180, true)));
  fs.writeFileSync(path.join(outDir, 'shell-secondary.png'), PNG.sync.write(paintCap(320, 160, false, false)));
  fs.writeFileSync(path.join(outDir, 'shell-secondary-down.png'), PNG.sync.write(paintCap(320, 160, false, true)));
  fs.writeFileSync(path.join(outDir, 'shell-primary.png'), PNG.sync.write(paintCap(420, 180, true, false)));
  fs.writeFileSync(path.join(outDir, 'shell-primary-down.png'), PNG.sync.write(paintCap(420, 180, true, true)));
}

function build() {
  fs.mkdirSync(outDir, { recursive: true });
  const donor = PNG.sync.read(fs.readFileSync(donorPath));
  if (donor.width !== DIAL_CANVAS || donor.height !== DIAL_CANVAS) {
    throw new Error(`donor is ${donor.width}, expected ${DIAL_CANVAS}`);
  }
  const W = donor.width;
  const cx = DIAL_CENTER;
  const cy = DIAL_CENTER;

  const bezel = new PNG({ width: W, height: W });
  const face = new PNG({ width: W, height: W });
  bezel.data.fill(0);
  face.data.fill(0);

  const profile = [];
  for (let r = 0; r <= FACE_RADIUS + 2; r += 1) {
    const samples = [];
    for (let deg = -180; deg < 180; deg += 3) {
      if (deg >= -155 && deg <= -35) continue;
      const rad = (deg * Math.PI) / 180;
      const x = Math.round(cx + Math.sin(rad) * r);
      const y = Math.round(cy - Math.cos(rad) * r);
      if (x < 0 || y < 0 || x >= W || y >= W) continue;
      const o = (y * W + x) * 4;
      if (donor.data[o + 3] < 20) continue;
      samples.push([donor.data[o], donor.data[o + 1], donor.data[o + 2]]);
    }
    if (!samples.length) {
      profile[r] = [12, 10, 8];
      continue;
    }
    samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    profile[r] = samples[Math.floor(samples.length / 2)];
  }

  function smoothFace(r) {
    const anchor = 100;
    const blend = (index) => {
      const a = profile[index] || [14, 12, 10];
      const b = profile[Math.min(FACE_RADIUS, index + 2)] || a;
      const c = profile[Math.max(0, index - 2)] || a;
      return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    };
    if (r >= anchor) return blend(r);
    const edge = blend(anchor);
    const t = r / anchor;
    const center = [10, 9, 8];
    return edge.map((value, index) => center[index] * (1 - t) + value * t);
  }

  const blank = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'dial-photo-v3', 'dial-base-blank.png')));
  const bcx = (blank.width - 1) / 2;
  const bcy = (blank.height - 1) / 2;
  const blankAt = (deg, br) => {
    const rad = (deg * Math.PI) / 180;
    const x = Math.max(0, Math.min(blank.width - 1, Math.round(bcx + Math.sin(rad) * br)));
    const y = Math.max(0, Math.min(blank.height - 1, Math.round(bcy - Math.cos(rad) * br)));
    const index = (y * blank.width + x) * 4;
    return [blank.data[index], blank.data[index + 1], blank.data[index + 2]];
  };
  const ring = [];
  for (let br = 0; br <= 360; br += 1) {
    const samples = [];
    for (let deg = 36; deg < 170; deg += 6) {
      samples.push(blankAt(deg, br), blankAt(-deg, br));
    }
    samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    ring[br] = samples[Math.floor(samples.length / 2)];
  }
  const faceSample = (r, deg) => {
    const br = Math.round(150 + (r / FACE_RADIUS) * 150);
    const rgb = ring[Math.min(360, br)];
    const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
    const lifted = rgb.map((value) => value + (value - mean) * 2.6 + 14);
    const key = 0.78 + 0.34 * Math.max(0, Math.cos((deg * Math.PI) / 180)) * (0.25 + 0.75 * (r / FACE_RADIUS));
    return lifted.map((value) => clamp(value * key));
  };

  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const o = (y * W + x) * 4;
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;

      const innerStart = 210;
      if (r >= innerStart - 1.2 && r <= BEZEL_OUTER + 0.6) {
        const src = (y * W + x) * 4;
        const lum = donor.data[src] + donor.data[src + 1] + donor.data[src + 2];
        if (donor.data[src + 3] < 16 || lum < 24) {
          // Near-black gaps inside the ring are source residue, not knurl.
        } else {
          const inner = Math.min(1, Math.max(0, (r - (innerStart - 1.2)) / 1.8));
          const outer = Math.min(1, Math.max(0, (BEZEL_OUTER + 0.6 - r) / 1.6));
          const alpha = Math.round(255 * Math.min(inner, outer));
          bezel.data[o] = donor.data[src];
          bezel.data[o + 1] = donor.data[src + 1];
          bezel.data[o + 2] = donor.data[src + 2];
          bezel.data[o + 3] = alpha;
        }
      }

      if (r <= FACE_RADIUS + 1.2) {
        const edge = r > FACE_RADIUS - 2 ? (FACE_RADIUS + 1.2 - r) / 3.2 : 1;
        const sample = faceSample(r, deg);
        const groove = Math.abs(r - 124) < 2.1;
        const inner = Math.abs(r - 72) < 1.2;
        const plate = r < 122;
        const brush = plate ? (hash(Math.floor(r * 3.1)) - 0.5) * 16 : 0;
        const metal = plate ? 34 : 0;
        const lift = groove ? 62 : inner ? 28 : plate ? metal + brush : Math.abs(r - 168) < 1.2 ? 18 : 0;
        face.data[o] = clamp(sample[0] + lift);
        face.data[o + 1] = clamp(sample[1] + lift * 0.86);
        face.data[o + 2] = clamp(sample[2] + lift * 0.55);
        face.data[o + 3] = Math.round(255 * Math.max(0, Math.min(1, edge)));
      }
    }
  }

  stampSignature(face, bezel, W, cx);
  fs.writeFileSync(path.join(outDir, 'dial-bezel-clean.png'), PNG.sync.write(bezel));
  fs.writeFileSync(path.join(outDir, 'dial-face-neutral.png'), PNG.sync.write(face));
  fs.writeFileSync(path.join(outDir, 'dial-needle.png'), PNG.sync.write(drawNeedle(W, cx)));

  fs.writeFileSync(path.join(outDir, 'dial-boss.png'), PNG.sync.write(drawBoss()));
  writeShells();
  gradeTransport();
  console.log('clean dial rasters', outDir);
}

function scaleSvg() {
  const ticks = dialTicks().map((tick) => {
    const seg = tickSegment(tick.deg, tick.kind);
    const width = tick.kind === 'major' ? 1.45 : tick.kind === 'mid' ? 0.95 : 0.55;
    const color = tick.kind === 'major' ? '#fff4e2' : 'rgba(232,220,198,0.42)';
    return `<line x1="${seg.x1.toFixed(2)}" y1="${seg.y1.toFixed(2)}" x2="${seg.x2.toFixed(2)}" y2="${seg.y2.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="butt"/>`;
  }).join('');
  const labels = dialLabels().map((label) => {
    return `<text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="#f4ecdf" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${SCALE_FONT}" font-weight="500">${label.bpm}</text>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${DIAL_CANVAS}" height="${DIAL_CANVAS}" viewBox="0 0 ${DIAL_CANVAS} ${DIAL_CANVAS}">
  ${ticks}
  ${labels}
</svg>`;
}

async function renderScale() {
  const svg = scaleSvg();
  fs.writeFileSync(path.join(outDir, 'dial-scale.svg'), svg);
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: DIAL_CANVAS, height: DIAL_CANVAS, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`, { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png', omitBackground: true });
  fs.writeFileSync(path.join(outDir, 'dial-scale-generated.png'), png);
  await browser.close();
  console.log('clean scale', path.join(outDir, 'dial-scale-generated.png'));
}

build();
renderScale().catch((error) => {
  console.error(error);
  process.exit(1);
});
