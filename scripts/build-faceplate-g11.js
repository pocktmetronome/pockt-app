'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { FACEPLATE_FRAMES, canonicalFaceplateLayout } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'faceplate');

const STYLES = {
  A: { id: 'A', depth: 9, bevel: 14, lip: 1.1, bore: 16, spec: 22, champagne: 0.25, socket: 8 },
  B: { id: 'B', depth: 15, bevel: 18, lip: 2.2, bore: 24, spec: 38, champagne: 0.85, socket: 13 },
  C: { id: 'C', depth: 7, bevel: 22, lip: 0.4, bore: 12, spec: 14, champagne: 0.08, socket: 6 },
};

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function sdRoundBox(px, py, rect, radius) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const hw = rect.w / 2;
  const hh = rect.h / 2;
  const r = Math.min(radius, hw, hh);
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
}

function sdCircle(px, py, rect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return Math.hypot(px - cx, py - cy) - Math.min(rect.w, rect.h) / 2;
}

function carve(height, sd, depth, bevel, lip) {
  if (sd > bevel * 0.85) return height;
  let profile = 0;
  if (sd > 0) {
    const t = 1 - sd / (bevel * 0.85);
    profile = Math.sin(Math.max(0, t) * Math.PI) * lip;
  } else {
    const t = Math.min(1, -sd / bevel);
    const s = t * t * (3 - 2 * t);
    profile = lip * (1 - s) - depth * s;
  }
  return Math.min(height, profile);
}

function renderPlate(frame, style, scale = 2) {
  const { layout, apertures } = canonicalFaceplateLayout(frame);
  const w = frame.w * scale;
  const h = frame.h * scale;
  const height = new Float32Array(w * h);
  const champagne = new Uint8Array(w * h);
  const s = (rect) => ({ x: rect.x * scale, y: rect.y * scale, w: rect.w * scale, h: rect.h * scale });
  const jobs = [
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.tempoPocket), 28 * scale), depth: style.depth * 0.45, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdCircle(px, py, s(apertures.dialSeat)), depth: style.bore, bevel: style.bevel * 1.15 * scale, lip: style.lip * 1.4 },
    { sd: (px, py) => sdCircle(px, py, s(apertures.tuner)), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdCircle(px, py, s(apertures.sound)), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdCircle(px, py, s(apertures.minus)), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdCircle(px, py, s(apertures.plus)), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.beatChannel), 18 * scale), depth: style.depth * 0.7, bevel: style.bevel * scale, lip: style.lip * 0.8 },
    ...apertures.sockets.flatMap((socket) => {
      const outer = s(socket);
      const inner = { x: outer.x + outer.w * 0.22, y: outer.y + outer.h * 0.22, w: outer.w * 0.56, h: outer.h * 0.56 };
      return [
        { sd: (px, py) => sdCircle(px, py, outer), depth: style.socket * 0.45, bevel: 7 * scale, lip: style.lip * 1.6 },
        { sd: (px, py) => sdCircle(px, py, inner), depth: style.socket, bevel: 5 * scale, lip: 0.2 },
      ];
    }),
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.loop), s(apertures.loop).h / 2), depth: style.depth * 0.8, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.tap), s(apertures.tap).h / 2), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.play), s(apertures.play).h / 2), depth: style.bore * 0.55, bevel: style.bevel * 1.2 * scale, lip: style.lip * 1.6, metal: true },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.meter), s(apertures.meter).h / 2), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.options), s(apertures.options).h / 2), depth: style.depth, bevel: style.bevel * scale, lip: style.lip },
    { sd: (px, py) => sdRoundBox(px, py, s(apertures.navChannel), 16 * scale), depth: style.depth * 0.55, bevel: style.bevel * scale, lip: style.lip * 0.5 },
  ];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      let v = (hash(i * 0.17) - 0.5) * 0.08;
      let metal = 0;
      for (const job of jobs) {
        const next = carve(v, job.sd(x + 0.5, y + 0.5), job.depth, job.bevel, job.lip);
        if (next < v && job.metal && job.sd(x + 0.5, y + 0.5) < 2) metal = 1;
        v = next;
      }
      height[i] = v;
      champagne[i] = metal;
    }
  }

  const png = new PNG({ width: frame.w, height: frame.h });
  const lx = -0.42;
  const ly = -0.78;
  const lz = 0.48;
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let oy = 0; oy < scale; oy += 1) {
        for (let ox = 0; ox < scale; ox += 1) {
          const sx = x * scale + ox;
          const sy = y * scale + oy;
          const i = sy * w + sx;
          const hL = height[i - 1] || height[i];
          const hR = height[i + 1] || height[i];
          const hU = height[i - w] || height[i];
          const hD = height[i + w] || height[i];
          let nx = (hL - hR) * 1.8;
          let ny = (hU - hD) * 1.8;
          const nz = 1;
          const len = Math.hypot(nx, ny, nz);
          nx /= len;
          ny /= len;
          const nzN = nz / len;
          const ndotl = Math.max(0, nx * lx + ny * ly + nzN * lz);
          const hx = lx;
          const hy = ly;
          const hz = lz + 1;
          const hlen = Math.hypot(hx, hy, hz);
          const ndoth = Math.max(0, nx * (hx / hlen) + ny * (hy / hlen) + nzN * (hz / hlen));
          const spec = Math.pow(ndoth, style.spec) * (champagne[i] ? 90 : 46);
          const fall = 1 - Math.min(0.28, (y / frame.h) * 0.22);
          const ao = Math.max(0.42, Math.min(1, 0.78 + height[i] * 0.045));
          const grain = (hash(sx * 13.1 + sy * 7.7) - 0.5) * 2.2;
          const softbox = Math.exp(-((y / frame.h - 0.12) ** 2) / 0.02) * (height[i] > -1.2 ? 16 : 4);
          const metalMix = champagne[i] ? style.champagne : 0;
          const baseR = 22 + grain + metalMix * 120;
          const baseG = 21 + grain * 0.9 + metalMix * 86;
          const baseB = 19 + grain * 0.75 + metalMix * 36;
          const light = (0.42 + ndotl * 0.85) * fall * ao;
          r += baseR * light + spec * (0.7 + metalMix) + softbox;
          g += baseG * light + spec * (0.62 + metalMix * 0.5) + softbox * 0.96;
          b += baseB * light + spec * 0.42 + softbox * 0.9;
          n += 1;
        }
      }
      const o = (y * frame.w + x) * 4;
      png.data[o] = clamp(r / n);
      png.data[o + 1] = clamp(g / n);
      png.data[o + 2] = clamp(b / n);
      png.data[o + 3] = 255;
    }
  }
  return { png, layout, apertures };
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

function paintDisc(size, pressed) {
  const png = new PNG({ width: size, height: size });
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      const o = (y * size + x) * 4;
      if (r > c - 0.6) continue;
      const light = pressed ? 0.55 : 1.05 - (dy / c) * 0.35;
      const v = 34 * light;
      png.data[o] = clamp(v * 1.05);
      png.data[o + 1] = clamp(v);
      png.data[o + 2] = clamp(v * 0.9);
      png.data[o + 3] = 255;
      if (dy < -c * 0.45 && r < c - 4) {
        png.data[o] = clamp(png.data[o] + 18);
        png.data[o + 1] = clamp(png.data[o + 1] + 16);
        png.data[o + 2] = clamp(png.data[o + 2] + 10);
      }
    }
  }
  return png;
}

function paintPill(w, h, champagne, pressed) {
  const png = new PNG({ width: w, height: h });
  const rad = h / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cx = x < rad ? rad - x : x > w - rad ? x - (w - rad) : 0;
      const cy = y < rad ? rad - y : y > h - rad ? y - (h - rad) : 0;
      if ((cx || cy) && Math.hypot(cx, cy) > rad - 0.4) continue;
      const ny = y / h;
      const light = pressed ? 0.5 : 1.15 - ny * 0.45;
      const base = champagne ? [176, 136, 74] : [40, 37, 34];
      const o = (y * w + x) * 4;
      png.data[o] = clamp(base[0] * light);
      png.data[o + 1] = clamp(base[1] * light);
      png.data[o + 2] = clamp(base[2] * light);
      png.data[o + 3] = 255;
      if (!pressed) {
        const sheen = Math.max(0, 0.42 - ny) * 36;
        png.data[o] = clamp(png.data[o] + sheen);
        png.data[o + 1] = clamp(png.data[o + 1] + sheen * 0.85);
        png.data[o + 2] = clamp(png.data[o + 2] + sheen * 0.4);
      }
    }
  }
  return png;
}

function writeCaps() {
  const dir = path.join(root, 'assets', 'dial-clean');
  writePng(path.join(dir, 'shell-utility.png'), paintDisc(180, false));
  writePng(path.join(dir, 'shell-utility-down.png'), paintDisc(180, true));
  writePng(path.join(dir, 'shell-secondary.png'), paintPill(320, 160, false, false));
  writePng(path.join(dir, 'shell-secondary-down.png'), paintPill(320, 160, false, true));
  writePng(path.join(dir, 'shell-primary.png'), paintPill(420, 180, true, false));
  writePng(path.join(dir, 'shell-primary-down.png'), paintPill(420, 180, true, true));
  writePng(path.join(dir, 'lens.png'), paintDisc(160, false));
}

function main() {
  const concepts = path.join(root, 'artifacts', 'visual-gate-11', 'concepts');
  fs.mkdirSync(concepts, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const frame = FACEPLATE_FRAMES['390x844'];
  for (const style of Object.values(STYLES)) {
    const { png } = renderPlate(frame, style, 2);
    writePng(path.join(concepts, `faceplate-${style.id}.png`), png);
    console.log('concept', style.id);
  }
  if (process.argv.includes('--concepts-only')) return;
  const selected = STYLES.B;
  for (const [name, phone] of Object.entries(FACEPLATE_FRAMES)) {
    const { png } = renderPlate(phone, selected, 2);
    writePng(path.join(outDir, `faceplate-${name}.png`), png);
    console.log('plate', name);
  }
  writePng(path.join(outDir, 'faceplate-390.png'), PNG.sync.read(fs.readFileSync(path.join(outDir, 'faceplate-390x844.png'))));
  writeCaps();
}

main();
