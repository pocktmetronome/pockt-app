'use strict';

throw new Error('Retired. V4 raster surgery is not the production face. Use scripts/blender/build_north_star_v5.py.');

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout, faceplateApertures, FACEPLATE_FRAMES, rigidFrame, NORTH_STAR_DIAL } = require('../lib/compute-foundation-layout.ts');
const { dialAngleDeg } = require('../lib/dial-scale-geometry.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'north-star-build');
const assets = path.join(root, 'assets', 'north-star-face');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const masterPath = path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png');
const TRAVEL = 1.8;
const FRAME_COUNT = 128;
const MASTER_W = 941;
const MASTER_H = 1672;

const PARTS = {
  tuner: { x: 92, y: 67, width: 147, height: 109 },
  sound: { x: 707, y: 70, width: 164, height: 104 },
  pockt: { x: 337, y: 79, width: 268, height: 82 },
  minus: { x: 48, y: 696, width: 105, height: 105 },
  plus: { x: 788, y: 696, width: 105, height: 105 },
  loop: { x: 731, y: 904, width: 139, height: 113 },
  beat1: { x: 88, y: 924, width: 72, height: 72 },
  beat2: { x: 247, y: 924, width: 72, height: 72 },
  beat3: { x: 407, y: 924, width: 72, height: 72 },
  beat4: { x: 565, y: 924, width: 72, height: 72 },
  tap: { x: 101, y: 1135, width: 327, height: 131 },
  play: { x: 490, y: 1128, width: 352, height: 138 },
  meter: { x: 101, y: 1295, width: 327, height: 120 },
  p: { x: 490, y: 1295, width: 352, height: 120 },
  nav: { x: 28, y: 1468, width: 886, height: 204 },
  dialOuter: { x: NORTH_STAR_DIAL.cx - NORTH_STAR_DIAL.fluteOuter, y: NORTH_STAR_DIAL.cy - NORTH_STAR_DIAL.fluteOuter, width: NORTH_STAR_DIAL.fluteOuter * 2, height: NORTH_STAR_DIAL.fluteOuter * 2 },
  dialCenter: { x: NORTH_STAR_DIAL.cx - NORTH_STAR_DIAL.glass, y: NORTH_STAR_DIAL.cy - NORTH_STAR_DIAL.glass, width: NORTH_STAR_DIAL.glass * 2, height: NORTH_STAR_DIAL.glass * 2 },
};

const NAV = [
  { id: 'dial', label: 'DIAL', x: 95 },
  { id: 'rhythm', label: 'RHYTHM', x: 241 },
  { id: 'pulse', label: 'PULSE', x: 392 },
  { id: 'pendulum', label: 'PENDULUM', x: 538 },
  { id: 'pro', label: 'PRO', x: 689 },
  { id: 'beatline', label: 'BEATLINE', x: 839 },
];

function record(box) {
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
  };
}

function sample(src, x, y) {
  const x0 = Math.max(0, Math.min(src.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(src.height - 1, Math.floor(y)));
  const x1 = Math.min(src.width - 1, x0 + 1);
  const y1 = Math.min(src.height - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, x - x0));
  const ty = Math.max(0, Math.min(1, y - y0));
  const at = (px, py) => {
    const o = (py * src.width + px) * 4;
    return [src.data[o], src.data[o + 1], src.data[o + 2]];
  };
  const a = at(x0, y0);
  const b = at(x1, y0);
  const c = at(x0, y1);
  const d = at(x1, y1);
  return [0, 1, 2].map((i) => Math.round(a[i] * (1 - tx) * (1 - ty) + b[i] * tx * (1 - ty) + c[i] * (1 - tx) * ty + d[i] * tx * ty));
}

function fringe(pixel) {
  return pixel[1] > pixel[0] + 8 && pixel[1] > pixel[2] + 4 && pixel[1] > 45;
}

function sampleSafe(src, x, y) {
  const color = sample(src, x, y);
  if (!fringe(color)) return color;
  const inward = sample(src, Math.min(src.width - 80, Math.max(80, x)), Math.min(src.height - 80, Math.max(80, y)));
  return fringe(inward) ? sample(src, 36, 250) : inward;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function gold(color) {
  return color[0] > 120 && color[0] > color[2] + 28 && color[1] > 70;
}

function put(png, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const o = (y * png.width + x) * 4;
  png.data[o] = color[0];
  png.data[o + 1] = color[1];
  png.data[o + 2] = color[2];
  png.data[o + 3] = alpha;
}

function makeGrain(src) {
  const x0 = 180;
  const y0 = 1076;
  const w = 400;
  const h = 12;
  const pix = [];
  let mean = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const color = sampleSafe(src, x0 + x, y0 + y);
      pix.push(color);
      mean += (color[0] + color[1] + color[2]) / 3;
    }
  }
  mean /= pix.length;
  return {
    w,
    h,
    deviation(x, y) {
      const mx = ((x % w) + w) % w;
      const my = ((y % h) + h) % h;
      const color = pix[my * w + mx];
      return (color[0] + color[1] + color[2]) / 3 - mean;
    },
  };
}

function fillGaps(dst, src, frame) {
  const grain = makeGrain(src);
  const bands = frame.bands;
  const gaps = [[0, Math.floor(bands[0].y)]];
  for (let index = 0; index < bands.length - 1; index += 1) {
    gaps.push([Math.ceil(bands[index].y + bands[index].h), Math.floor(bands[index + 1].y)]);
  }
  gaps.push([Math.ceil(bands[bands.length - 1].y + bands[bands.length - 1].h), dst.height]);
  const at = (x, y) => {
    const o = (y * dst.width + x) * 4;
    return [dst.data[o], dst.data[o + 1], dst.data[o + 2]];
  };
  for (const [y0, y1] of gaps) {
    if (y1 - y0 < 1) continue;
    for (let y = y0; y < y1; y += 1) {
      const t = (y + 0.5 - y0) / (y1 - y0);
      const edge = Math.min(y - y0, y1 - 1 - y, 6) / 6;
      for (let x = 0; x < dst.width; x += 1) {
        const above = y0 > 0 ? at(x, y0 - 1) : null;
        const below = y1 < dst.height ? at(x, y1) : null;
        let base;
        if (above && below) base = above.map((value, channel) => value * (1 - t) + below[channel] * t);
        else if (below) base = below.slice();
        else base = above.slice();
        const shift = grain.deviation(x * 3 + y, y) * 0.55 * edge;
        const o = (y * dst.width + x) * 4;
        dst.data[o] = clamp(base[0] + shift);
        dst.data[o + 1] = clamp(base[1] + shift * 0.94);
        dst.data[o + 2] = clamp(base[2] + shift * 0.82);
        dst.data[o + 3] = 255;
      }
    }
  }
}

function blitBands(dst, src, frame) {
  const x0 = Math.max(0, Math.floor(frame.padX));
  const x1 = Math.min(dst.width, Math.ceil(frame.padX + src.width * frame.s));
  for (const band of frame.bands) {
    const y0 = Math.max(0, Math.floor(band.y));
    const y1 = Math.min(dst.height, Math.ceil(band.y + band.h));
    for (let y = y0; y < y1; y += 1) {
      const sy = frame.unmapY(y + 0.5);
      for (let x = x0; x < x1; x += 1) {
        const color = sampleSafe(src, (x + 0.5 - frame.padX) / frame.s, sy);
        put(dst, x, y, color);
      }
    }
  }
}

function paintDisk(plate, cx, cy, radius, colorAt) {
  const r = Math.ceil(radius);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (x < 0 || y < 0 || x >= plate.width || y >= plate.height) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > radius) continue;
      const color = colorAt(d, x, y);
      if (!color) continue;
      put(plate, x, y, color);
    }
  }
}

function glassProfile(src) {
  const bins = [];
  for (let step = 0; step <= 48; step += 1) {
    const radius = (NORTH_STAR_DIAL.glass * step) / 48;
    const colors = [];
    for (let turn = 0; turn < 72; turn += 1) {
      const angle = (turn / 72) * Math.PI * 2;
      const color = sample(src, NORTH_STAR_DIAL.cx + Math.cos(angle) * radius, NORTH_STAR_DIAL.cy + Math.sin(angle) * radius);
      if (gold(color)) continue;
      colors.push(color);
    }
    if (!colors.length) {
      bins.push(bins.length ? bins[bins.length - 1] : [18, 14, 12]);
      continue;
    }
    colors.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    bins.push(colors[Math.floor(colors.length / 2)]);
  }
  return bins;
}

function lightingField(src) {
  const cx = NORTH_STAR_DIAL.cx;
  const cy = NORTH_STAR_DIAL.cy;
  const raw = [];
  for (let deg = 0; deg < 360; deg += 1) {
    const angle = (deg * Math.PI) / 180;
    let sum = 0;
    let n = 0;
    for (let radius = NORTH_STAR_DIAL.fluteInner + 4; radius <= 276; radius += 4) {
      const color = sample(src, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      sum += (color[0] + color[1] + color[2]) / 3;
      n += 1;
    }
    raw.push(sum / Math.max(1, n));
  }
  const sigma = 16;
  const smooth = raw.map((_, index) => {
    let acc = 0;
    let weight = 0;
    for (let k = -48; k <= 48; k += 1) {
      const w = Math.exp(-(k * k) / (2 * sigma * sigma));
      acc += raw[(index + k + 360) % 360] * w;
      weight += w;
    }
    return acc / weight;
  });
  return (rad) => {
    const deg = (((rad * 180) / Math.PI) % 360 + 360) % 360;
    const index = Math.floor(deg) % 360;
    const t = deg - Math.floor(deg);
    return smooth[index] * (1 - t) + smooth[(index + 1) % 360] * t;
  };
}

function encoderPixel(src, sx, sy) {
  const dx = sx - NORTH_STAR_DIAL.cx;
  const dy = sy - NORTH_STAR_DIAL.cy;
  const radius = Math.hypot(dx, dy);
  if (radius >= NORTH_STAR_DIAL.fluteInner && radius <= 278) return true;
  const angle = Math.atan2(dy, dx);
  let delta = Math.abs(angle + Math.PI / 2);
  if (delta > Math.PI) delta = Math.PI * 2 - delta;
  if (delta < 0.2 && radius > 255 && radius < 348 && gold(sample(src, sx, sy))) return true;
  return false;
}

function buildRotor(src, light, angleDeg, size, flatten) {
  const png = new PNG({ width: size, height: size });
  const cx = NORTH_STAR_DIAL.cx;
  const cy = NORTH_STAR_DIAL.cy;
  const radius = NORTH_STAR_DIAL.fluteOuter;
  const turn = (angleDeg * Math.PI) / 180;
  let mean = 0;
  if (flatten) {
    for (let deg = 0; deg < 360; deg += 1) mean += light((deg * Math.PI) / 180);
    mean /= 360;
  }
  for (let y = 0; y < size; y += 1) {
    const ny = ((y + 0.5) / size) * 2 - 1;
    for (let x = 0; x < size; x += 1) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const sourceRadius = Math.hypot(nx, ny) * radius;
      const world = Math.atan2(ny, nx);
      const local = world - turn;
      const sx = cx + Math.cos(local) * sourceRadius;
      const sy = cy + Math.sin(local) * sourceRadius;
      if (!encoderPixel(src, sx, sy)) continue;
      const color = sample(src, sx, sy);
      const gain = flatten ? mean / Math.max(8, light(local)) : light(world) / Math.max(8, light(local));
      put(png, x, y, color.map((channel) => clamp(channel * gain)));
    }
  }
  return png;
}

function buildAlbedo(src, light, size) {
  return buildRotor(src, light, 0, size, true);
}

function buildLightOverlay(src, light, size) {
  const png = new PNG({ width: size, height: size });
  const radius = NORTH_STAR_DIAL.fluteOuter;
  let mean = 0;
  for (let deg = 0; deg < 360; deg += 1) mean += light((deg * Math.PI) / 180);
  mean /= 360;
  for (let y = 0; y < size; y += 1) {
    const ny = ((y + 0.5) / size) * 2 - 1;
    for (let x = 0; x < size; x += 1) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const sourceRadius = Math.hypot(nx, ny) * radius;
      if (sourceRadius < NORTH_STAR_DIAL.fluteInner || sourceRadius > 278) continue;
      const gain = light(Math.atan2(ny, nx)) / mean;
      const delta = gain - 1;
      const alpha = clamp(Math.abs(delta) * 180);
      const color = delta >= 0 ? [236, 214, 180] : [12, 10, 8];
      put(png, x, y, color, alpha);
    }
  }
  return png;
}

function scrubGold(png, rect) {
  const x0 = Math.round(rect.x);
  const y0 = Math.round(rect.y);
  const w = Math.round(rect.width ?? rect.w);
  const h = Math.round(rect.height ?? rect.h);
  const samples = [];
  const top = h > 160 ? 0.06 : 0.12;
  const inside = (x, y) => x > w * 0.1 && x < w * 0.9 && y > h * top && y < h * 0.9;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!inside(x, y)) continue;
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const o = (py * png.width + px) * 4;
      const luma = (png.data[o] + png.data[o + 1] + png.data[o + 2]) / 3;
      if (luma < 46) samples.push([png.data[o], png.data[o + 1], png.data[o + 2]]);
    }
  }
  if (!samples.length) return;
  const mean = [0, 1, 2].map((channel) => Math.round(samples.reduce((sum, color) => sum + color[channel], 0) / samples.length));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!inside(x, y)) continue;
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const o = (py * png.width + px) * 4;
      const color = [png.data[o], png.data[o + 1], png.data[o + 2]];
      const luma = (color[0] + color[1] + color[2]) / 3;
      const warm = color[0] > color[2] + 10 && color[0] > 55;
      if (luma > 52 || warm) {
        png.data[o] = mean[0];
        png.data[o + 1] = mean[1];
        png.data[o + 2] = mean[2];
      }
    }
  }
}

function darkenLamps(png, frame) {
  for (const name of ['beat1', 'beat2', 'beat3', 'beat4']) {
    const box = screenBox(frame, PARTS[name]);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const radius = Math.min(box.w, box.h) / 2;
    paintDisk(png, cx, cy, radius * 0.92, (d) => {
      const shade = 18 + (d / Math.max(1, radius * 0.92)) * 8;
      return [shade + 3, shade, shade - 2];
    });
  }
}

function erasePointer(png, frame) {
  const cx = frame.mapX(NORTH_STAR_DIAL.cx);
  const cy = frame.mapY(NORTH_STAR_DIAL.cy);
  const radius = NORTH_STAR_DIAL.fluteOuter * frame.s;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy - radius * 0.72); y += 1) {
    for (let x = Math.floor(cx - 18 * frame.s); x <= Math.ceil(cx + 18 * frame.s); x += 1) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const o = (y * png.width + x) * 4;
      const color = [png.data[o], png.data[o + 1], png.data[o + 2]];
      if (!gold(color)) continue;
      const side = sample(png, x + (x < cx ? -14 : 14), y + 2);
      png.data[o] = side[0];
      png.data[o + 1] = side[1];
      png.data[o + 2] = side[2];
    }
  }
}

function screenBox(frame, box) {
  return {
    x: frame.mapX(box.x),
    y: frame.mapY(box.y),
    w: box.width * frame.s,
    h: box.height * frame.s,
  };
}

function shapeContains(x, y, w, h) {
  const roundness = Math.min(w, h) / Math.max(w, h) > 0.8 ? 0.5 : 0.18;
  const rx = Math.min(w, h) * roundness;
  const cx = Math.min(Math.max(x, rx), w - rx);
  const cy = Math.min(Math.max(y, rx), h - rySafe(h, rx));
  return Math.hypot(x - cx, y - cy) <= rx;
}

function rySafe(h, rx) {
  return Math.min(rx, h / 2);
}

function cropCap(plate, rect) {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(plate.width - x0, Math.round(rect.w)));
  const h = Math.max(1, Math.min(plate.height - y0, Math.round(rect.h)));
  const next = new PNG({ width: w, height: h });
  const round = Math.min(w, h) / Math.max(w, h) > 0.82;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = ((y0 + y) * plate.width + (x0 + x)) * 4;
      let alpha = 255;
      if (round) {
        const cx = w / 2;
        const cy = h / 2;
        alpha = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= Math.min(cx, cy) - 0.5 ? 255 : 0;
      } else {
        const rx = Math.min(w, h) * 0.16;
        const nx = Math.min(Math.max(x, rx), w - rx);
        const ny = Math.min(Math.max(y, rx), h - rx);
        alpha = Math.hypot(x - nx, y - ny) <= rx ? 255 : 0;
      }
      const o = (y * w + x) * 4;
      next.data[o] = plate.data[s];
      next.data[o + 1] = plate.data[s + 1];
      next.data[o + 2] = plate.data[s + 2];
      next.data[o + 3] = alpha;
    }
  }
  return next;
}

function seatWell(plate, rect) {
  const x0 = Math.round(rect.x);
  const y0 = Math.round(rect.y);
  const w = Math.round(rect.w);
  const h = Math.round(rect.h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= plate.width || py >= plate.height) continue;
      const o = (py * plate.width + px) * 4;
      const lip = y < 3 ? 0.55 : 0.78;
      plate.data[o] = clamp(plate.data[o] * lip);
      plate.data[o + 1] = clamp(plate.data[o + 1] * lip);
      plate.data[o + 2] = clamp(plate.data[o + 2] * lip);
    }
  }
}

function clearGlass(plate, src, frame) {
  const cx = frame.mapX(NORTH_STAR_DIAL.cx);
  const cy = frame.mapY(NORTH_STAR_DIAL.cy);
  const glass = NORTH_STAR_DIAL.glass * frame.s;
  const bins = glassProfile(src);
  paintDisk(plate, cx, cy, glass, (d) => bins[Math.min(bins.length - 1, Math.round((d / glass) * (bins.length - 1)))]);
}

function buildFrame(src, spec, light) {
  const frame = rigidFrame(spec.w, spec.h, spec.insets);
  const plate = new PNG({ width: spec.w, height: spec.h });
  blitBands(plate, src, frame);
  fillGaps(plate, src, frame);
  const caps = {};
  for (const name of ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'p']) {
    const box = screenBox(frame, PARTS[name]);
    scrubGold(plate, box);
    caps[name] = cropCap(plate, box);
    seatWell(plate, box);
  }
  scrubGold(plate, screenBox(frame, PARTS.nav));
  darkenLamps(plate, frame);
  erasePointer(plate, frame);
  clearGlass(plate, src, frame);
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  return { plate, caps, frame, layout, apertures: faceplateApertures(layout, 4) };
}

function write(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function cssBox(box, extra = '') {
  return `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;${extra}`;
}

function labelStyle(size) {
  return `display:flex;align-items:center;justify-content:center;color:#E8C48A;font-family:'Segoe UI',sans-serif;font-weight:650;letter-spacing:${Math.max(0.4, size * 0.08)}px;font-size:${size}px;line-height:1;text-align:center;`;
}

function playGlyph(running) {
  const icon = running
    ? `<svg viewBox="0 0 100 100" width="46%" height="46%"><rect x="32" y="24" width="12" height="52" rx="2" fill="#F2C27A"/><rect x="56" y="24" width="12" height="52" rx="2" fill="#F2C27A"/></svg>`
    : `<svg viewBox="0 0 100 100" width="46%" height="46%"><polygon points="34,22 34,78 78,50" fill="#F2C27A"/></svg>`;
  return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${icon}</div>`;
}

function lampEmission(level) {
  const glow = [0, 0.28, 0.48, 0.7, 1][level];
  return `<i style="position:absolute;left:8%;top:8%;width:84%;height:84%;border-radius:50%;background:radial-gradient(circle, rgba(255,220,150,${glow}) 0%, rgba(220,130,40,${glow * 0.55}) 42%, rgba(120,48,8,${glow * 0.2}) 68%, transparent 78%)"></i>`;
}

function navGlyph(label) {
  const common = 'fill="none" stroke="#E8C48A" stroke-width="1.6" stroke-linecap="round"';
  const paths = {
    DIAL: `<circle cx="12" cy="12" r="4" ${common}/><path d="M12 5v2M12 17v2M5 12h2M17 12h2" ${common}/>`,
    RHYTHM: `<path d="M6 16V8M12 18V6M18 16v-5" ${common}/>`,
    PULSE: `<path d="M3 12h4l2-5 3 10 2-5h7" ${common}/>`,
    PENDULUM: `<path d="M12 4v8" ${common}/><circle cx="12" cy="16" r="3" ${common}/>`,
    PRO: `<path d="M12 5l1.6 4.2H18l-3.4 2.6 1.3 4.2L12 13.6 8.1 16l1.3-4.2L6 9.2h4.4z" fill="#E8C48A" stroke="none"/>`,
    BEATLINE: `<circle cx="7" cy="8" r="1.2" fill="#E8C48A"/><circle cx="12" cy="8" r="1.2" fill="#E8C48A"/><circle cx="17" cy="8" r="1.2" fill="#E8C48A"/><circle cx="7" cy="13" r="1.2" fill="#E8C48A"/><circle cx="12" cy="13" r="1.2" fill="#E8C48A"/><circle cx="17" cy="13" r="1.2" fill="#E8C48A"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="16" height="16">${paths[label]}</svg>`;
}

function compose(home, state) {
  const { frame } = home;
  const glassX = frame.mapX(NORTH_STAR_DIAL.cx);
  const glassY = frame.mapY(NORTH_STAR_DIAL.cy);
  const dial = screenBox(frame, PARTS.dialOuter);
  const angle = dialAngleDeg(state.bpm);
  const frameIndex = ((Math.round(((angle % 360) + 360) % 360 / 360 * FRAME_COUNT) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
  const controls = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'p'].map((name) => {
    const box = screenBox(frame, PARTS[name]);
    const down = state.pressed === name ? TRAVEL : 0;
    const text = {
      tuner: 'TUNER', sound: 'SOUND', loop: 'LOOP', tap: 'TAP', meter: 'METER', p: 'P',
    }[name];
    const glyph = name === 'play' ? playGlyph(state.playing) : '';
    const size = name === 'tuner' || name === 'sound' ? 9 : name === 'p' ? 18 : 13;
    return `<img src="/assets/north-star-face/cap-${name === 'p' ? 'p' : name}.png" style="position:absolute;${cssBox(box)}transform:translateY(${down}px)">
      <div style="position:absolute;${cssBox(box)}transform:translateY(${down}px);${labelStyle(size)}">${glyph}${text || ''}</div>`;
  }).join('');
  const lamps = ['beat1', 'beat2', 'beat3', 'beat4'].map((name, index) => {
    const box = screenBox(frame, PARTS[name]);
    const level = state.playing && index === 0 ? 4 : state.playing ? 2 : 0;
    return `<div style="position:absolute;${cssBox(box)}">${lampEmission(level)}</div>`;
  }).join('');
  const nav = NAV.map((item, index) => {
    const x = frame.mapX(item.x);
    const y = frame.mapY(1556);
    const selected = index === 0;
    return `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);text-align:center;color:${selected ? '#F0D7A4' : '#B7A48A'};font-family:'Segoe UI',sans-serif;font-size:8px;letter-spacing:0.5px;font-weight:650">
      <div style="display:flex;justify-content:center;margin-bottom:3px">${navGlyph(item.label)}</div>
      <div>${item.label}</div>
      ${selected ? '<i style="display:block;height:2px;margin:3px auto 0;width:16px;background:#E4C48A;border-radius:1px"></i>' : ''}
    </div>`;
  }).join('');
  const pad = String(state.bpm);
  return `<!doctype html><body style="margin:0;width:390px;height:844px;overflow:hidden;background:#14110e">
    <img src="/artifacts/north-star-build/v4-plate.png" style="position:absolute;inset:0;width:390px;height:844px">
    <img src="/artifacts/north-star-build/rotary/frame-${String(frameIndex).padStart(3, '0')}.png" style="position:absolute;left:${dial.x}px;top:${dial.y}px;width:${dial.w}px;height:${dial.h}px">
    ${controls}${lamps}${nav}
    <div style="position:absolute;left:${glassX}px;top:${glassY}px;transform:translate(-50%,-50%);text-align:center;color:#F2C27A;font-family:'Segoe UI',sans-serif">
      <b style="display:flex;justify-content:center;width:78px;font-size:32px;font-weight:560;line-height:1;font-variant-numeric:tabular-nums">${pad.split('').map((digit) => `<i style="display:block;width:24px;text-align:center;font-style:normal">${digit}</i>`).join('')}</b>
      <span style="display:block;margin-top:2px;font-size:11px;letter-spacing:0.28em;font-weight:650">BPM</span>
    </div>
  </body>`;
}

function cross(box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return `<i style="position:absolute;left:${cx}px;top:${box.y}px;width:1px;height:${box.h}px;background:rgba(80,220,255,.85)"></i>
    <i style="position:absolute;left:${box.x}px;top:${cy}px;width:${box.w}px;height:1px;background:rgba(80,220,255,.85)"></i>
    <i style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;outline:1px solid rgba(255,190,80,.9)"></i>`;
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  const rotaryDir = path.join(out, 'rotary');
  fs.mkdirSync(rotaryDir, { recursive: true });
  const src = PNG.sync.read(fs.readFileSync(masterPath));
  const light = lightingField(src);
  const homeSpec = FACEPLATE_FRAMES['390x844'];
  const home = buildFrame(src, homeSpec, light);
  write(path.join(out, 'v4-plate.png'), home.plate);
  const dial = screenBox(home.frame, PARTS.dialOuter);
  const rotorSize = Math.max(8, Math.round(dial.w));
  console.log('rendering', FRAME_COUNT, 'rotary frames at', rotorSize);
  const started = Date.now();
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const angle = (index / FRAME_COUNT) * 360;
    write(path.join(rotaryDir, `frame-${String(index).padStart(3, '0')}.png`), buildRotor(src, light, angle, rotorSize));
  }
  console.log('frames', ((Date.now() - started) / 1000).toFixed(1), 's');
  write(path.join(assets, 'dial-ring.png'), buildAlbedo(src, light, rotorSize));
  write(path.join(assets, 'dial-light.png'), buildLightOverlay(src, light, rotorSize));
  write(path.join(assets, 'dial-center.png'), new PNG({ width: 8, height: 8 }));
  write(path.join(assets, 'dial-scale.png'), new PNG({ width: 8, height: 8 }));
  write(path.join(assets, 'dial-shadow.png'), new PNG({ width: 8, height: 8 }));
  write(path.join(assets, 'dial-boss.png'), new PNG({ width: 8, height: 8 }));
  for (const name of ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'p']) {
    write(path.join(assets, `cap-${name}.png`), home.caps[name]);
  }
  write(path.join(assets, 'cap-pause.png'), home.caps.play);
  write(path.join(assets, 'cap-nav.png'), new PNG({ width: 8, height: 8 }));
  const socket = home.apertures.sockets[0];
  const lamp = new PNG({ width: Math.max(8, Math.round(socket.w * 1.8)), height: Math.max(8, Math.round(socket.h * 1.8)) });
  const sx = Math.round(socket.x - socket.w * 0.4);
  const sy = Math.round(socket.y - socket.h * 0.4);
  for (let y = 0; y < lamp.height; y += 1) {
    for (let x = 0; x < lamp.width; x += 1) {
      const color = sample(home.plate, sx + x, sy + y);
      put(lamp, x, y, color);
    }
  }
  write(path.join(assets, 'lamp-fixture.png'), lamp);

  for (const spec of Object.values(FACEPLATE_FRAMES)) {
    const built = spec.w === 390 && spec.h === 844 ? home : buildFrame(src, spec, light);
    const key = `${spec.w}x${spec.h}`;
    write(path.join(assets, `faceplate-${key}.png`), built.plate);
    write(path.join(root, 'assets', 'faceplate', `faceplate-${key}.png`), built.plate);
  }

  const mapped = {};
  for (const [name, box] of Object.entries(PARTS)) {
    const screen = screenBox(home.frame, box);
    mapped[name] = {
      master: record(box),
      screen390: {
        x: Math.round(screen.x * 100) / 100,
        y: Math.round(screen.y * 100) / 100,
        width: Math.round(screen.w * 100) / 100,
        height: Math.round(screen.h * 100) / 100,
        centerX: Math.round((screen.x + screen.w / 2) * 100) / 100,
        centerY: Math.round((screen.y + screen.h / 2) * 100) / 100,
      },
    };
  }
  mapped.navSlots = NAV.map((item) => ({
    label: item.label,
    master: { x: item.x - 36, y: 1506, width: 72, height: 100, centerX: item.x, centerY: 1556 },
    screen390: { centerX: Math.round(home.frame.mapX(item.x) * 100) / 100, centerY: Math.round(home.frame.mapY(1556) * 100) / 100 },
  }));
  fs.writeFileSync(path.join(root, 'north-star-v4-geometry.json'), JSON.stringify({
    master: { width: MASTER_W, height: MASTER_H },
    canvas: { width: 390, height: 844 },
    scale: home.frame.s,
    dial: NORTH_STAR_DIAL,
    objects: mapped,
  }, null, 2));

  const server = await new Promise((resolve) => {
    const app = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^[/\\]+/, '');
      const file = path.normalize(path.join(root, rel));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200);
      fs.createReadStream(file).pipe(res);
    });
    app.listen(0, '127.0.0.1', () => resolve(app));
  });
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}`;
  async function shot(html, w, h, file) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html.replaceAll('src="/', `src="${base}/`), { waitUntil: 'load', timeout: 120000 });
    const buf = await page.screenshot({ type: 'png' });
    fs.writeFileSync(file, buf);
    return PNG.sync.read(buf);
  }

  const face = await shot(compose(home, { bpm: 120, playing: false }), 390, 844, path.join(out, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V4.png'));
  await shot(compose(home, { bpm: 120, playing: true }), 390, 844, path.join(out, 'CURRENT_RUNNING_FOR_GREGG_NORTH_STAR_V4.png'));

  const reference = new PNG({ width: 390, height: 844 });
  for (let y = 0; y < 844; y += 1) {
    for (let x = 0; x < 390; x += 1) put(reference, x, y, sampleSafe(src, 200, 1080));
  }
  const cardH = Math.round(390 * (src.height / src.width));
  const cardY = Math.round((844 - cardH) / 2);
  for (let y = 0; y < cardH; y += 1) {
    const sy = ((y + 0.5) / cardH) * src.height;
    for (let x = 0; x < 390; x += 1) {
      put(reference, x, cardY + y, sampleSafe(src, ((x + 0.5) / 390) * src.width, sy));
    }
  }
  const compare = new PNG({ width: 390 * 2 + 16, height: 844 });
  for (let i = 0; i < compare.data.length; i += 4) {
    compare.data[i] = 18;
    compare.data[i + 1] = 15;
    compare.data[i + 2] = 12;
    compare.data[i + 3] = 255;
  }
  PNG.bitblt(reference, compare, 0, 0, 390, 844, 0, 0);
  PNG.bitblt(face, compare, 0, 0, 390, 844, 406, 0);
  write(path.join(out, 'NORTH_STAR_VS_PRODUCTION_V4.png'), compare);

  const glassX = home.frame.mapX(NORTH_STAR_DIAL.cx);
  const glassY = home.frame.mapY(NORTH_STAR_DIAL.cy);
  const bpmCells = [60, 99, 100, 120, 240, 400].map((bpm) => {
    const html = compose(home, { bpm, playing: false });
    const inner = html.replace('<!doctype html><body style="margin:0;width:390px;height:844px;overflow:hidden;background:#14110e">', '').replace('</body>', '');
    return `<div style="position:relative;width:220px;height:220px;overflow:hidden">
      <div style="position:absolute;left:${110 - glassX}px;top:${110 - glassY}px;width:390px;height:844px">${inner}</div>
      <i style="position:absolute;left:110px;top:0;width:1px;height:220px;background:rgba(80,220,255,.9)"></i>
      <i style="position:absolute;left:0;top:110px;width:220px;height:1px;background:rgba(80,220,255,.9)"></i>
    </div>`;
  }).join('');
  await shot(`<!doctype html><body style="margin:0;display:flex;gap:8px;background:#100e0c">${bpmCells}</body>`, 1364, 220, path.join(out, 'BPM_CENTER_VALIDATION_V4.png'));

  const typeNames = ['tuner', 'sound', 'loop', 'tap', 'meter', 'p'];
  const typeCells = typeNames.map((name) => {
    const box = screenBox(home.frame, PARTS[name]);
    const text = name === 'p' ? 'P' : name.toUpperCase();
    return `<div style="position:relative;width:180px;height:120px;overflow:hidden;background:#16130f">
      <img src="/assets/north-star-face/cap-${name}.png" style="position:absolute;left:${90 - box.w / 2}px;top:${48 - box.h / 2}px;width:${box.w}px;height:${box.h}px">
      <div style="position:absolute;left:${90 - box.w / 2}px;top:${48 - box.h / 2}px;width:${box.w}px;height:${box.h}px;${labelStyle(name === 'p' ? 18 : 12)}">${text}</div>
      <i style="position:absolute;left:90px;top:8px;width:1px;height:104px;background:rgba(80,220,255,.9)"></i>
      <i style="position:absolute;left:8px;top:48px;width:164px;height:1px;background:rgba(80,220,255,.9)"></i>
    </div>`;
  }).join('');
  const navCells = NAV.map((item) => `<div style="position:relative;width:120px;height:90px;background:#16130f">
      <div style="position:absolute;left:60px;top:36px;transform:translate(-50%,-50%);color:#E8C48A;font:650 10px 'Segoe UI',sans-serif;letter-spacing:.6px">${item.label}</div>
      <i style="position:absolute;left:60px;top:8px;width:1px;height:74px;background:rgba(80,220,255,.9)"></i>
      <i style="position:absolute;left:8px;top:36px;width:104px;height:1px;background:rgba(80,220,255,.9)"></i>
    </div>`).join('');
  await shot(`<!doctype html><body style="margin:0;background:#100e0c;padding:12px"><div style="display:flex;gap:8px;flex-wrap:wrap">${typeCells}</div><div style="display:flex;gap:8px;margin-top:12px">${navCells}</div></body>`, 1140, 280, path.join(out, 'TYPOGRAPHY_ALIGNMENT_V4.png'));

  const play = screenBox(home.frame, PARTS.play);
  const playCell = (mode) => {
    const down = mode === 'pressed' ? TRAVEL : 0;
    const running = mode === 'running';
    return `<div style="position:relative;width:${Math.ceil(play.w) + 8}px;height:${Math.ceil(play.h) + 16}px">
      <img src="/assets/north-star-face/cap-play.png" style="position:absolute;left:4px;top:${4 + down}px;width:${play.w}px;height:${play.h}px">
      <div style="position:absolute;left:4px;top:${4 + down}px;width:${play.w}px;height:${play.h}px;display:flex;align-items:center;justify-content:center">${playGlyph(running)}</div>
      ${cross({ x: 4, y: 4 + down, w: play.w, h: play.h })}
    </div>`;
  };
  const masterPlay = `<div style="position:relative;width:${Math.ceil(play.w) + 8}px;height:${Math.ceil(play.h) + 16}px;overflow:hidden">
    <img src="/REFERENCE/POCKT_NORTH_STAR_MASTER.png" style="position:absolute;left:${4 - PARTS.play.x * (play.w / PARTS.play.width)}px;top:${4 - PARTS.play.y * (play.h / PARTS.play.height)}px;width:${MASTER_W * (play.w / PARTS.play.width)}px;height:${MASTER_H * (play.h / PARTS.play.height)}px">
  </div>`;
  await shot(`<!doctype html><body style="margin:0;display:flex;gap:12px;padding:16px;background:#100e0c;align-items:flex-start">${masterPlay}${playCell('rest')}${playCell('pressed')}${playCell('running')}</body>`, 980, 160, path.join(out, 'PLAY_ALIGNMENT_V4.png'));

  const navBox = screenBox(home.frame, PARTS.nav);
  const navScale = 390 / MASTER_W;
  await shot(`<!doctype html><body style="margin:0;background:#100e0c;width:390px">
    <div style="position:relative;width:390px;height:${Math.round(PARTS.nav.height * navScale)}px;overflow:hidden">
      <img src="/REFERENCE/POCKT_NORTH_STAR_MASTER.png" style="position:absolute;left:${-PARTS.nav.x * navScale}px;top:${-PARTS.nav.y * navScale}px;width:${390}px;height:${Math.round(MASTER_H * navScale)}px">
      <i style="position:absolute;left:0;top:0;width:390px;height:${Math.round(PARTS.nav.height * navScale)}px;outline:1px solid rgba(255,190,80,.8)"></i>
    </div>
    <div style="position:relative;width:390px;height:${Math.ceil(navBox.h)}px;overflow:hidden">
      <img src="/artifacts/north-star-build/v4-plate.png" style="position:absolute;left:${-navBox.x}px;top:${-navBox.y}px;width:390px;height:844px">
      ${NAV.map((item, index) => `<div style="position:absolute;left:${home.frame.mapX(item.x)}px;top:${home.frame.mapY(1556) - navBox.y}px;transform:translate(-50%,-50%);color:${index === 0 ? '#F0D7A4' : '#B7A48A'};font:650 9px 'Segoe UI',sans-serif;letter-spacing:.5px;text-align:center">${item.label}${index === 0 ? '<i style="display:block;height:2px;width:16px;margin:2px auto 0;background:#E4C48A"></i>' : ''}</div>`).join('')}
      <i style="position:absolute;left:0;bottom:0;width:390px;height:1px;background:#E4C48A"></i>
    </div>
  </body>`, 390, 180, path.join(out, 'NAV_ALIGNMENT_V4.png'));

  const buttonCells = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'p'].map((name) => {
    const box = screenBox(home.frame, PARTS[name]);
    const text = { tuner: 'TUNER', sound: 'SOUND', loop: 'LOOP', tap: 'TAP', meter: 'METER', p: 'P' }[name] || '';
    const cell = (down) => `<div style="position:relative;width:${Math.ceil(box.w)}px;height:${Math.ceil(box.h) + TRAVEL}px">
      <img src="/assets/north-star-face/cap-${name}.png" style="position:absolute;left:0;top:${down}px;width:${box.w}px;height:${box.h}px">
      <div style="position:absolute;left:0;top:${down}px;width:${box.w}px;height:${box.h}px;${labelStyle(name === 'p' ? 16 : 11)}">${name === 'play' ? playGlyph(false) : text}</div>
    </div>`;
    return `<div style="display:flex;gap:6px;align-items:flex-end">${cell(0)}${cell(TRAVEL)}</div>`;
  }).join('');
  await shot(`<!doctype html><body style="margin:0;display:flex;gap:14px;padding:12px;background:#100e0c;align-items:flex-end">${buttonCells}</body>`, 1500, 180, path.join(out, 'LIVE_BUTTON_PROOF_V4.png'));

  const dialProof = [60, 120, 240, 400].map((bpm) => {
    const html = compose(home, { bpm, playing: false });
    const inner = html.replace('<!doctype html><body style="margin:0;width:390px;height:844px;overflow:hidden;background:#14110e">', '').replace('</body>', '');
    return `<div style="position:relative;width:${Math.ceil(dial.w)}px;height:${Math.ceil(dial.h)}px;overflow:hidden"><div style="position:absolute;left:${-dial.x}px;top:${-dial.y}px">${inner}</div></div>`;
  }).join('');
  await shot(`<!doctype html><body style="margin:0;display:flex;gap:8px;background:#100e0c">${dialProof}</body>`, Math.ceil(dial.w) * 4 + 32, Math.ceil(dial.h), path.join(out, 'LIVE_DIAL_PROOF_V4.png'));

  const levels = [0, 1, 2, 3, 4].map((level) => `<div style="position:relative;width:120px;height:120px;background:#100e0c">
    <img src="/assets/north-star-face/lamp-fixture.png" style="position:absolute;left:10px;top:10px;width:100px;height:100px">
    <div style="position:absolute;left:28px;top:28px;width:64px;height:64px">${lampEmission(level)}</div>
  </div>`).join('');
  await shot(`<!doctype html><body style="margin:0;display:flex;gap:16px;padding:16px;background:#100e0c">${levels}</body>`, 700, 152, path.join(out, 'BEAT_LIGHT_LEVELS_V4.png'));

  const seam = new PNG({ width: 390, height: 280 });
  PNG.bitblt(face, seam, 0, 70, 390, 140, 0, 0);
  PNG.bitblt(face, seam, 0, 400, 390, 140, 0, 140);
  write(path.join(out, 'SEAM_INSPECTION_V4.png'), seam);

  await browser.close();
  server.close();
  const corner = [face.data[0], face.data[1], face.data[2]];
  console.log('corner', corner.join(','), 'travel', TRAVEL, 'frames', FRAME_COUNT);
  if (corner[1] > corner[0] + 8) throw new Error('green fringe on the production face');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
