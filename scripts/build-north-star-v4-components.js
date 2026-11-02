'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'assets/north-star-v4/screen-reference.png');
const outDir = path.join(root, 'assets/north-star-v4/parts');
fs.mkdirSync(outDir, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(srcPath));
const W = src.width;
const H = src.height;
const CX = 249;
const CY = 390;
const R = 228;
const BOSS_R = 46;

const PLATE = { x: 150, y: 84, w: 192, h: 80 };
const BEATS = { x: 14, y: 608, w: 464, h: 128 };
const BEAT_CENTERS = [131, 205, 279, 353];
const BEAT_CY = 666;
const BEAT_R = 34;
const NUMERAL = { dy: 28, w: 28, h: 28 };
const NAV = { x: 6, y: 820, w: 480, h: 88 };
const HEADER = {
  tuner: { x: 24, y: 6, w: 92, h: 92 },
  wordmark: { x: 138, y: 16, w: 214, h: 64 },
  sound: { x: 376, y: 6, w: 96, h: 92 },
};
const TEMPO = {
  plus: { x: 34, y: 86, w: 104, h: 104 },
  minus: { x: 356, y: 86, w: 108, h: 104 },
};
const TRANSPORT = {
  tap: { x: 16, y: 726, w: 104, h: 96 },
  play: { x: 118, y: 726, w: 112, h: 98 },
  meter: { x: 228, y: 732, w: 152, h: 88 },
  pockt: { x: 380, y: 726, w: 100, h: 96 },
};
const LAMP = { x: 36, y: 640, w: 52, h: 56 };
const LOOP = { x: 392, y: 628, w: 78, h: 96 };

function lum(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function get(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function set(img, x, y, r, g, b, a = 255) {
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
function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
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
function blit(dst, png, x0, y0) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const [r, g, b, a] = get(png, x, y);
      if (a < 8) continue;
      if (x0 + x < 0 || y0 + y < 0 || x0 + x >= dst.width || y0 + y >= dst.height) continue;
      if (a > 250) set(dst, x0 + x, y0 + y, r, g, b, 255);
      else {
        const [dr, dg, db] = get(dst, x0 + x, y0 + y);
        const t = a / 255;
        set(dst, x0 + x, y0 + y, Math.round(dr * (1 - t) + r * t), Math.round(dg * (1 - t) + g * t), Math.round(db * (1 - t) + b * t), 255);
      }
    }
  }
}
function sample(img, x, y) {
  const xx = Math.max(0, Math.min(img.width - 1, x));
  const yy = Math.max(0, Math.min(img.height - 1, y));
  return get(img, xx, yy);
}

function inpaintRect(img, rect, pick) {
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (!pick(x, y)) continue;
      const left = sample(src, x - 14, y);
      const right = sample(src, x + 14, y);
      const up = sample(src, x, y - 10);
      const down = sample(src, x, y + 10);
      const pool = [left, right, up, down].sort((a, b) => lum(...a) - lum(...b));
      const [r, g, b] = pool[1];
      set(img, x, y, r, g, b, 255);
    }
  }
}

// --- dial body: full square, needle shaft removed outside the boss ---
const dialRect = { x: CX - R, y: CY - R, w: R * 2, h: R * 2 };
const dialBody = cropOf(src, dialRect);
const needle = blank(dialRect.w, dialRect.h);
let needleCount = 0;
function faceFill(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const radius = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dx, -dy) - 0.22;
  const sx = Math.round(CX + Math.sin(angle) * radius);
  const sy = Math.round(CY - Math.cos(angle) * radius);
  return sample(src, sx, sy).slice(0, 3);
}
for (let y = CY - Math.round(R * 0.84); y < CY - BOSS_R + 2; y += 1) {
  for (let x = CX - 8; x <= CX + 8; x += 1) {
    const [r, g, b] = get(src, x, y);
    const L = lum(r, g, b);
    const sideL = lum(...sample(src, x - 18, y));
    const sideR = lum(...sample(src, x + 18, y));
    const side = (sideL + sideR) / 2;
    if (Math.abs(x - CX) > 5) continue;
    if (L < 55 || L < side + 18) continue;
    const lx = x - dialRect.x;
    const ly = y - dialRect.y;
    set(needle, lx, ly, r, g, b, 255);
    const fill = faceFill(x, y);
    set(dialBody, lx, ly, fill[0], fill[1], fill[2], 255);
    needleCount += 1;
  }
}

const boss = blank(BOSS_R * 2, BOSS_R * 2);
for (let y = 0; y < BOSS_R * 2; y += 1) {
  for (let x = 0; x < BOSS_R * 2; x += 1) {
    const dx = x - BOSS_R + 0.5;
    const dy = y - BOSS_R + 0.5;
    if (dx * dx + dy * dy > BOSS_R * BOSS_R) continue;
    const [r, g, b] = get(src, CX - BOSS_R + x, CY - BOSS_R + y);
    set(boss, x, y, r, g, b, 255);
  }
}

// --- plate without numerals; ink layer restores 120 + BPM ---
const plate = cropOf(src, PLATE);
const plateInk = blank(PLATE.w, PLATE.h);
for (let y = 0; y < PLATE.h; y += 1) {
  for (let x = 0; x < PLATE.w; x += 1) {
    const [r, g, b] = get(plate, x, y);
    const nearWhite = r > 186 && g > 176 && b > 150 && lum(r, g, b) > 170;
    const inset = x > 18 && x < PLATE.w - 18 && y > 8 && y < PLATE.h - 8;
    if (!nearWhite || !inset) continue;
    set(plateInk, x, y, r, g, b, 255);
    const well = sample(src, 250, 140);
    set(plate, x, y, well[0], well[1], well[2], 255);
  }
}

function liftMarks(rect, predicate) {
  const shell = cropOf(src, rect);
  const mark = blank(rect.w, rect.h);
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const [r, g, b] = get(shell, x, y);
      if (!predicate(r, g, b, x, y)) continue;
      set(mark, x, y, r, g, b, 255);
      const donor = sample(src, rect.x + x + (x < rect.w / 2 ? 18 : -18), rect.y + y);
      set(shell, x, y, donor[0], donor[1], donor[2], 255);
    }
  }
  return { shell, mark };
}

const plus = liftMarks(TEMPO.plus, (r, g, b, x, y) => {
  const inset = x > 28 && x < TEMPO.plus.w - 28 && y > 28 && y < TEMPO.plus.h - 28;
  return inset && r > 210 && g > 210 && b > 200;
});
const minus = liftMarks(TEMPO.minus, (r, g, b, x, y) => {
  const inset = x > 28 && x < TEMPO.minus.w - 28 && y > 28 && y < TEMPO.minus.h - 36;
  return inset && r > 200 && g > 200 && b > 190;
});
const tuner = liftMarks(HEADER.tuner, (r, g, b, x, y) => {
  const inset = x > 26 && x < HEADER.tuner.w - 26 && y > 22 && y < HEADER.tuner.h - 26;
  return inset && lum(r, g, b) > 150 && b > 120;
});
const sound = liftMarks(HEADER.sound, (r, g, b, x, y) => {
  const inset = x > 26 && x < HEADER.sound.w - 22 && y > 22 && y < HEADER.sound.h - 26;
  return inset && lum(r, g, b) > 150 && b > 120;
});

const playRect = TRANSPORT.play;
const playShell = cropOf(src, playRect);
const playIcon = blank(playRect.w, playRect.h);
const bronze = sample(src, playRect.x + 22, playRect.y + Math.round(playRect.h / 2));
for (let y = 24; y < playRect.h - 28; y += 1) {
  for (let x = 36; x < playRect.w - 30; x += 1) {
    const [r, g, b] = get(src, playRect.x + x, playRect.y + y);
    if (lum(r, g, b) > 95) continue;
    set(playIcon, x, y, r, g, b, 255);
    set(playShell, x, y, bronze[0], bronze[1], bronze[2], 255);
  }
}
const playPause = blank(playRect.w, playRect.h);
const iconColor = [42, 28, 16];
for (const bx of [38, 62]) {
  for (let y = 30; y < playRect.h - 34; y += 1) {
    for (let x = bx; x < bx + 12; x += 1) set(playPause, x, y, iconColor[0], iconColor[1], iconColor[2], 255);
  }
}

const meterRect = TRANSPORT.meter;
const meterShell = cropOf(src, meterRect);
const meterInk = blank(meterRect.w, meterRect.h);
for (let y = 10; y < meterRect.h - 10; y += 1) {
  for (let x = 16; x < meterRect.w - 16; x += 1) {
    const [r, g, b] = get(meterShell, x, y);
    if (lum(r, g, b) < 150) continue;
    if (r < 170 || g < 160) continue;
    set(meterInk, x, y, r, g, b, 255);
    set(meterShell, x, y, 12, 10, 9, 255);
  }
}

// --- beats housing + per-beat discs and numerals ---
const housing = cropOf(src, BEATS);
const discs = [];
const numerals = [];
for (let i = 0; i < 4; i += 1) {
  const cx = BEAT_CENTERS[i];
  const disc = blank(BEAT_R * 2, BEAT_R * 2);
  for (let y = 0; y < BEAT_R * 2; y += 1) {
    for (let x = 0; x < BEAT_R * 2; x += 1) {
      const dx = x - BEAT_R + 0.5;
      const dy = y - BEAT_R + 0.5;
      if (dx * dx + dy * dy > BEAT_R * BEAT_R) continue;
      const sx = cx - BEAT_R + x;
      const sy = BEAT_CY - BEAT_R + y;
      const [r, g, b] = get(src, sx, sy);
      set(disc, x, y, r, g, b, 255);
      const hx = sx - BEATS.x;
      const hy = sy - BEATS.y;
      const donor = sample(src, cx, BEAT_CY - BEAT_R - 8);
      set(housing, hx, hy, donor[0], donor[1], donor[2], 255);
    }
  }
  discs.push(disc);
  const nw = NUMERAL.w;
  const nh = NUMERAL.h;
  const nx = cx - Math.round(nw / 2);
  const ny = BEAT_CY + NUMERAL.dy;
  const numeral = cropOf(src, { x: nx, y: ny, w: nw, h: nh });
  numerals.push(numeral);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      const [r, g, b] = get(numeral, x, y);
      if (lum(r, g, b) < 70) {
        set(numeral, x, y, 0, 0, 0, 0);
        continue;
      }
      const donor = sample(src, nx + x, ny + nh + 6);
      set(housing, nx - BEATS.x + x, ny - BEATS.y + y, donor[0], donor[1], donor[2], 255);
    }
  }
}

const lamp = cropOf(src, LAMP);
const lampOff = clone(lamp);
for (let y = 0; y < lamp.height; y += 1) {
  for (let x = 0; x < lamp.width; x += 1) {
    const [r, g, b] = get(lampOff, x, y);
    if (g > r + 20 && g > 80) set(lampOff, x, y, 18, 28, 16, 255);
  }
}
const loop = cropOf(src, LOOP);

// --- nav: exact dial-selected crop, plus a base with the tile lifted off ---
const navDial = cropOf(src, NAV);
const slotW = Math.round(NAV.w / 6);
const navBase = clone(navDial);
const navTile = blank(slotW, NAV.h);
const slot0 = cropOf(src, { x: NAV.x, y: NAV.y, w: slotW, h: NAV.h });
const slot1 = cropOf(src, { x: NAV.x + slotW, y: NAV.y, w: slotW, h: NAV.h });
for (let y = 0; y < NAV.h; y += 1) {
  for (let x = 0; x < slotW; x += 1) {
    const [r, g, b] = get(slot0, x, y);
    const [r1, g1, b1] = get(slot1, x, y);
    const L = lum(r, g, b);
    const L1 = lum(r1, g1, b1);
    const icon = L > 150;
    const tilePixel = !icon && L > L1 + 18 && r > b + 10;
    if (!tilePixel) continue;
    set(navTile, x, y, r, g, b, 255);
    set(navBase, x, y, r1, g1, b1, 255);
  }
}
// Recolor the dial glyph toward the unselected ivory so the base is not a selected face.
for (let y = 8; y < 62; y += 1) {
  for (let x = 8; x < slotW - 8; x += 1) {
    const [r, g, b, a] = get(navBase, x, y);
    if (a < 250 || lum(r, g, b) < 140) continue;
    set(navBase, x, y, 214, 206, 190, 255);
  }
}

// --- chassis: reference with every component interior replaced by neighboring metal ---
const chassis = clone(src);
function punch(rect) {
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      const k = ((y * 17 + x * 13) % 11) - 5;
      const donor = sample(src, 6 + ((x + y) % 10), 430 + ((x * 3) % 40));
      set(chassis, x, y, Math.max(0, donor[0] + k), Math.max(0, donor[1] + k), Math.max(0, donor[2] + k), 255);
    }
  }
}
punch(HEADER.tuner);
punch(HEADER.wordmark);
punch(HEADER.sound);
punch(TEMPO.plus);
punch(PLATE);
punch(TEMPO.minus);
for (let y = dialRect.y; y < dialRect.y + dialRect.h; y += 1) {
  for (let x = dialRect.x; x < dialRect.x + dialRect.w; x += 1) {
    const dx = x - CX;
    const dy = y - CY;
    if (dx * dx + dy * dy > (R - 1) * (R - 1)) continue;
    set(chassis, x, y, 0, 0, 0, 0);
  }
}
punch(BEATS);
punch(TRANSPORT.tap);
punch(TRANSPORT.play);
punch(TRANSPORT.meter);
punch(TRANSPORT.pockt);
punch(NAV);

// Reference composite uses the original crops (ink/needle/icons restored).
const composite = clone(chassis);
blit(composite, dialBody, dialRect.x, dialRect.y);
blit(composite, needle, dialRect.x, dialRect.y);
blit(composite, boss, CX - BOSS_R, CY - BOSS_R);
blit(composite, tuner.shell, HEADER.tuner.x, HEADER.tuner.y);
blit(composite, tuner.mark, HEADER.tuner.x, HEADER.tuner.y);
blit(composite, cropOf(src, HEADER.wordmark), HEADER.wordmark.x, HEADER.wordmark.y);
blit(composite, sound.shell, HEADER.sound.x, HEADER.sound.y);
blit(composite, sound.mark, HEADER.sound.x, HEADER.sound.y);
blit(composite, plus.shell, TEMPO.plus.x, TEMPO.plus.y);
blit(composite, plus.mark, TEMPO.plus.x, TEMPO.plus.y);
blit(composite, plate, PLATE.x, PLATE.y);
blit(composite, plateInk, PLATE.x, PLATE.y);
blit(composite, minus.shell, TEMPO.minus.x, TEMPO.minus.y);
blit(composite, minus.mark, TEMPO.minus.x, TEMPO.minus.y);
blit(composite, housing, BEATS.x, BEATS.y);
blit(composite, lamp, LAMP.x, LAMP.y);
for (let i = 0; i < 4; i += 1) {
  blit(composite, discs[i], BEAT_CENTERS[i] - BEAT_R, BEAT_CY - BEAT_R);
  blit(composite, numerals[i], BEAT_CENTERS[i] - Math.round(NUMERAL.w / 2), BEAT_CY + NUMERAL.dy);
}
blit(composite, loop, LOOP.x, LOOP.y);
blit(composite, cropOf(src, TRANSPORT.tap), TRANSPORT.tap.x, TRANSPORT.tap.y);
blit(composite, playShell, playRect.x, playRect.y);
blit(composite, playIcon, playRect.x, playRect.y);
blit(composite, meterShell, meterRect.x, meterRect.y);
blit(composite, meterInk, meterRect.x, meterRect.y);
blit(composite, cropOf(src, TRANSPORT.pockt), TRANSPORT.pockt.x, TRANSPORT.pockt.y);
blit(composite, navBase, NAV.x, NAV.y);
blit(composite, navTile, NAV.x, NAV.y);
// Restore the original dial glyph color on top of the recolored base by blitting slot 0's bright pixels from the original.
const dialGlyph = blank(slotW, NAV.h);
for (let y = 0; y < NAV.h; y += 1) {
  for (let x = 0; x < slotW; x += 1) {
    const [r, g, b] = get(slot0, x, y);
    if (lum(r, g, b) < 150) continue;
    set(dialGlyph, x, y, r, g, b, 255);
  }
}
blit(composite, dialGlyph, NAV.x, NAV.y);

let err = 0;
let n = 0;
let worst = 0;
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const a = get(src, x, y);
    const b = get(composite, x, y);
    if (b[3] < 250) continue;
    const d = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    err += d;
    n += 1;
    if (d > worst) worst = d;
  }
}
const mae = err / n;
console.log('needle pixels', needleCount);
console.log('composite MAE', mae.toFixed(3), 'worst', worst.toFixed(1), 'covered', n);

write('chassis.png', chassis);
write('dial-body.png', dialBody);
write('needle.png', needle);
write('boss.png', boss);
write('tuner-shell.png', tuner.shell);
write('tuner-glyph.png', tuner.mark);
write('wordmark.png', cropOf(src, HEADER.wordmark));
write('sound-shell.png', sound.shell);
write('sound-glyph.png', sound.mark);
write('plus-shell.png', plus.shell);
write('plus-mark.png', plus.mark);
write('minus-shell.png', minus.shell);
write('minus-mark.png', minus.mark);
const bpmValue = blank(PLATE.w, PLATE.h);
const bpmLabel = blank(PLATE.w, PLATE.h);
for (let y = 0; y < PLATE.h; y += 1) {
  for (let x = 0; x < PLATE.w; x += 1) {
    const [r, g, b, a] = get(plateInk, x, y);
    if (a < 8) continue;
    set(y < 50 ? bpmValue : bpmLabel, x, y, r, g, b, a);
  }
}
write('bpm-plate.png', plate);
write('bpm-ink.png', plateInk);
write('bpm-value.png', bpmValue);
write('bpm-label.png', bpmLabel);
write('beats-housing.png', housing);
write('lamp-on.png', lamp);
write('lamp-off.png', lampOff);
for (let i = 0; i < 4; i += 1) {
  write(`beat-disc-${i}.png`, discs[i]);
  write(`beat-numeral-${i}.png`, numerals[i]);
}
write('loop.png', loop);
write('tap.png', cropOf(src, TRANSPORT.tap));
write('play-shell.png', playShell);
write('play-icon.png', playIcon);
write('play-pause.png', playPause);
write('meter-shell.png', meterShell);
write('meter-ink.png', meterInk);
write('pockt.png', cropOf(src, TRANSPORT.pockt));
write('nav-base.png', navBase);
write('nav-tile.png', navTile);
write('nav-dial-glyph.png', dialGlyph);
for (let i = 0; i < 6; i += 1) {
  write(`nav-slot-${i}.png`, cropOf(src, { x: NAV.x + i * slotW, y: NAV.y, w: slotW, h: NAV.h }));
}

const previewDir = path.join(root, 'artifacts/v4-components-preview');
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, 'reference-composite.png'), PNG.sync.write(composite));

const geometry = {
  source: { width: W, height: H },
  dial: { cx: CX, cy: CY, r: R },
  boss: { r: BOSS_R },
  dialRect,
  plate: PLATE,
  beats: BEATS,
  beatCenters: BEAT_CENTERS,
  beatCy: BEAT_CY,
  beatR: BEAT_R,
  numeral: NUMERAL,
  lamp: LAMP,
  loop: LOOP,
  nav: NAV,
  slotW,
  header: HEADER,
  tempo: TEMPO,
  transport: TRANSPORT,
  mae,
  needlePixels: needleCount,
};
fs.writeFileSync(path.join(outDir, 'geometry.json'), JSON.stringify(geometry, null, 2));
console.log('wrote', outDir);
