'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const parts = path.join(root, 'assets', 'north-star-v4', 'parts');
const outDir = path.join(root, 'artifacts', 'native-interaction-migration');
const geometry = JSON.parse(fs.readFileSync(path.join(parts, 'geometry.json'), 'utf8'));

const WIDTH = 390;
const HEIGHT = 844;
const SAFE_TOP = 47;
const SAFE_BOTTOM = 34;
const scale = WIDTH / geometry.source.width;
const drawW = geometry.source.width * scale;
const drawH = geometry.source.height * scale;
const left = (WIDTH - drawW) / 2;
let artTop = HEIGHT - SAFE_BOTTOM - drawH;
if (artTop < SAFE_TOP) artTop = Math.max(0, Math.min(SAFE_TOP, Math.max(0, HEIGHT - drawH)));

const marks = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
function angleFor(bpm) {
  const safe = Math.min(400, Math.max(20, bpm));
  for (let index = 0; index < marks.length - 1; index += 1) {
    const a = marks[index];
    const b = marks[index + 1];
    if (safe <= b || index === marks.length - 2) {
      const t = (Math.min(safe, b) - a) / (b - a);
      return ((-135 + (index + t) * 27) * Math.PI) / 180;
    }
  }
  return 0;
}

const cache = new Map();
function load(name) {
  if (!cache.has(name)) cache.set(name, PNG.sync.read(fs.readFileSync(path.join(parts, name))));
  return cache.get(name);
}

function blank() {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  png.data.fill(0);
  return png;
}

function blend(dst, sx, sy, sr, sg, sb, sa) {
  if (sx < 0 || sy < 0 || sx >= dst.width || sy >= dst.height || sa <= 0) return;
  const i = (dst.width * sy + sx) << 2;
  const da = dst.data[i + 3] / 255;
  const a = sa / 255;
  const out = a + da * (1 - a);
  if (out <= 0) return;
  dst.data[i] = Math.round((sr * a + dst.data[i] * da * (1 - a)) / out);
  dst.data[i + 1] = Math.round((sg * a + dst.data[i + 1] * da * (1 - a)) / out);
  dst.data[i + 2] = Math.round((sb * a + dst.data[i + 2] * da * (1 - a)) / out);
  dst.data[i + 3] = Math.round(out * 255);
}

function blit(dst, src, x, y, w, h, opts = {}) {
  const sink = opts.sink || 0;
  const dim = opts.dim == null ? 1 : opts.dim;
  for (let py = 0; py < h; py += 1) {
    const sy = Math.min(src.height - 1, Math.floor((py / h) * src.height));
    for (let px = 0; px < w; px += 1) {
      const sx = Math.min(src.width - 1, Math.floor((px / w) * src.width));
      const i = (src.width * sy + sx) << 2;
      blend(dst, Math.round(x + px), Math.round(y + py + sink), src.data[i] * dim, src.data[i + 1] * dim, src.data[i + 2] * dim, src.data[i + 3]);
    }
  }
}

function blitRect(dst, file, rect, opts) {
  blit(dst, load(file), left + rect.x * scale, artTop + rect.y * scale, rect.w * scale, rect.h * scale, opts);
}

function rotateBlit(dst, src, cx, cy, side, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const half = side / 2;
  for (let py = 0; py < side; py += 1) {
    for (let px = 0; px < side; px += 1) {
      const dx = px - half;
      const dy = py - half;
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const sx = Math.floor(((rx + half) / side) * src.width);
      const sy = Math.floor(((ry + half) / side) * src.height);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = (src.width * sy + sx) << 2;
      blend(dst, Math.round(cx - half + px), Math.round(cy - half + py), src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

const GLYPH = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

function drawBpm(dst, value) {
  const plate = geometry.plate;
  const text = String(value);
  const size = Math.round(plate.h * scale * 0.46 / 5);
  const gap = Math.round(size * 0.35);
  const width = text.length * (3 * size + gap) - gap;
  let x = left + (plate.x + plate.w / 2) * scale - width / 2;
  const y = artTop + (plate.y + plate.h * 0.22) * scale;
  for (const ch of text) {
    const rows = GLYPH[ch];
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx += 1) {
        if (row[rx] !== '1') continue;
        for (let py = 0; py < size; py += 1) {
          for (let px = 0; px < size; px += 1) {
            blend(dst, Math.round(x + rx * size + px), Math.round(y + ry * size + py), 247, 243, 234, 255);
          }
        }
      }
    });
    x += 3 * size + gap;
  }
}

function glow(dst, cx, cy, radius, color, alpha) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d > r2) continue;
      const fall = 1 - d / r2;
      blend(dst, x, y, color[0], color[1], color[2], Math.round(alpha * fall * 255));
    }
  }
}

function scene(opts) {
  const png = blank();
  png.data.fill(255);
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 16;
    png.data[i + 1] = 14;
    png.data[i + 2] = 12;
    png.data[i + 3] = 255;
  }
  blit(png, load('chassis.png'), left, artTop, drawW, drawH);
  blitRect(png, 'tuner-shell.png', geometry.header.tuner);
  blitRect(png, 'tuner-glyph.png', geometry.header.tuner);
  blitRect(png, 'wordmark.png', geometry.header.wordmark);
  blitRect(png, 'sound-shell.png', geometry.header.sound);
  blitRect(png, 'sound-glyph.png', geometry.header.sound);
  blitRect(png, 'minus-shell.png', geometry.tempo.minus, { sink: opts.minusDown ? 2 : 0, dim: opts.minusDown ? 0.82 : 1 });
  blitRect(png, 'minus-mark.png', geometry.tempo.minus, { sink: opts.minusDown ? 2 : 0 });
  blitRect(png, 'plus-shell.png', geometry.tempo.plus, { sink: opts.plusDown ? 2 : 0, dim: opts.plusDown ? 0.82 : 1 });
  blitRect(png, 'plus-mark.png', geometry.tempo.plus, { sink: opts.plusDown ? 2 : 0 });
  blitRect(png, 'bpm-plate.png', geometry.plate);
  blitRect(png, 'bpm-label.png', geometry.plate);
  drawBpm(png, opts.bpm ?? 120);
  const dial = geometry.dialRect;
  blitRect(png, 'dial-body-empty.png', dial);
  blitRect(png, 'dial-scale-clean.png', dial);
  const side = dial.w * scale;
  const cx = left + (dial.x + dial.w / 2) * scale;
  const cy = artTop + (dial.y + dial.h / 2) * scale;
  rotateBlit(png, load('needle-shadow.png'), cx, cy, side, angleFor(opts.bpm ?? 120));
  rotateBlit(png, load('needle-shaft.png'), cx, cy, side, angleFor(opts.bpm ?? 120));
  const boss = geometry.boss.r * 2;
  blit(png, load('boss.png'), cx - (boss * scale) / 2, cy - (boss * scale) / 2, boss * scale, boss * scale);
  blitRect(png, 'beats-housing.png', geometry.beats);
  blitRect(png, opts.playing ? 'lamp-on.png' : 'lamp-off.png', geometry.lamp);
  const accents = opts.accents || ['strong', 'normal', 'normal', 'normal'];
  const files = { strong: 'beat-disc-strong.png', normal: 'beat-disc-normal.png', soft: 'beat-disc-soft.png', mute: 'beat-disc-mute.png' };
  const rest = { strong: 0.62, normal: 0.72, soft: 0.55, mute: 0.08 };
  accents.forEach((level, index) => {
    const baked = ['strong', 'normal', 'normal', 'normal'][index] === level;
    const file = baked ? `beat-disc-${index}.png` : files[level];
    const cxb = left + geometry.beatCenters[index] * scale;
    const cyb = artTop + geometry.beatCy * scale;
    const d = geometry.discR * 2 * scale;
    const src = load(file);
    blit(png, src, cxb - d / 2, cyb - d / 2, d, d);
    blit(png, load(`beat-numeral-${index}.png`), cxb - 14 * scale, artTop + (geometry.beatCy + geometry.numeral.dy) * scale, 28 * scale, 28 * scale);
    if (opts.peak === level || opts.peak === index) {
      const peak = level === 'strong' ? 1 : level === 'soft' ? 0.55 : 0.8;
      glow(png, cxb, cyb, geometry.discR * scale * (level === 'strong' ? 2 : level === 'soft' ? 1.3 : 1.6), [255, 214, 140], peak);
    }
  });
  if (opts.playing) glow(png, left + (geometry.lamp.x + geometry.lamp.w / 2) * scale, artTop + (geometry.lamp.y + geometry.lamp.h / 2) * scale, 18 * scale, [80, 255, 140], 0.7);
  blitRect(png, 'loop.png', geometry.loop);
  blitRect(png, 'tap.png', geometry.transport.tap, { sink: opts.tapDown ? 3 : 0, dim: opts.tapDown ? 0.8 : 1 });
  blitRect(png, 'play-shell.png', geometry.transport.play, { sink: opts.playDown ? 3 : opts.playing ? 1 : 0, dim: opts.playDown ? 0.8 : 1 });
  blitRect(png, opts.playing ? 'play-pause.png' : 'play-icon.png', geometry.transport.play, { sink: opts.playDown ? 3 : opts.playing ? 1 : 0 });
  blitRect(png, 'meter-shell.png', geometry.transport.meter);
  blitRect(png, 'meter-ink.png', geometry.transport.meter);
  blitRect(png, 'pockt.png', geometry.transport.pockt);
  blitRect(png, 'nav-tray-empty.png', geometry.nav);
  blitRect(png, 'nav-slot-0-on.png', { x: geometry.nav.x, y: geometry.nav.y, w: geometry.slotW, h: geometry.nav.h });
  for (let index = 1; index < 6; index += 1) {
    blitRect(png, `nav-slot-${index}.png`, {
      x: geometry.nav.x + index * geometry.slotW,
      y: geometry.nav.y,
      w: geometry.slotW,
      h: geometry.nav.h,
    });
  }
  return png;
}

function crop(src, x, y, w, h) {
  const png = new PNG({ width: w, height: h });
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const si = (src.width * (y + py) + (x + px)) << 2;
      const di = (w * py + px) << 2;
      png.data[di] = src.data[si];
      png.data[di + 1] = src.data[si + 1];
      png.data[di + 2] = src.data[si + 2];
      png.data[di + 3] = src.data[si + 3];
    }
  }
  return png;
}

function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

const rest = scene({ bpm: 120 });
write('rest-390.png', rest);
write('playing-390.png', scene({ bpm: 120, playing: true, peak: 0 }));
write('minus-plus.png', crop(rest, 0, Math.round(artTop + 70 * scale), WIDTH, Math.round(130 * scale)));
write('edge-to-edge-top.png', crop(rest, 0, 0, WIDTH, 140));
write('edge-to-edge-bottom.png', crop(rest, 0, HEIGHT - 140, WIDTH, 140));
for (const bpm of [20, 60, 120, 160, 240, 400]) write(`dial-${bpm}.png`, scene({ bpm }));
write('play-rest.png', crop(rest, Math.round(left + 100 * scale), Math.round(artTop + 710 * scale), Math.round(140 * scale), Math.round(120 * scale)));
const playDown = scene({ bpm: 120, playDown: true });
write('play-down.png', crop(playDown, Math.round(left + 100 * scale), Math.round(artTop + 710 * scale), Math.round(140 * scale), Math.round(120 * scale)));
const running = scene({ bpm: 120, playing: true });
write('play-running.png', crop(running, Math.round(left + 100 * scale), Math.round(artTop + 710 * scale), Math.round(140 * scale), Math.round(120 * scale)));
write('tap-rest.png', crop(rest, 0, Math.round(artTop + 710 * scale), Math.round(140 * scale), Math.round(120 * scale)));
const tapDown = scene({ bpm: 120, tapDown: true });
write('tap-down.png', crop(tapDown, 0, Math.round(artTop + 710 * scale), Math.round(140 * scale), Math.round(120 * scale)));
for (const level of ['soft', 'normal', 'strong']) {
  const quiet = scene({ bpm: 120, accents: [level, level, level, level] });
  const hot = scene({ bpm: 120, accents: [level, level, level, level], peak: level, playing: true });
  const x = Math.round(left + (geometry.beatCenters[0] - 50) * scale);
  const y = Math.round(artTop + (geometry.beatCy - 50) * scale);
  write(`beat-${level}-rest.png`, crop(quiet, x, y, Math.round(100 * scale), Math.round(100 * scale)));
  write(`beat-${level}-peak.png`, crop(hot, x, y, Math.round(100 * scale), Math.round(100 * scale)));
}

console.log('native interaction proofs written', { artTop, drawH, scale });
