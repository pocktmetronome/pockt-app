'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { angleFromDialBpm, dialScaleRotation, DIAL_MARKS } = require('../lib/pockt-dial-scale.ts');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'shell-v2');
const outDir = path.join(root, 'artifacts', 'shell-v2');
const kitDir = path.join(root, 'artifacts', 'shell-v2-assets');

const FONT = {
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 10000 11110 00001 00001 11110',
  '6': '01110 10000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00001 01110',
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01110',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

function load(name) {
  return PNG.sync.read(fs.readFileSync(path.join(assetDir, name)));
}

function blank(w, h) {
  return new PNG({ width: w, height: h });
}

function set(png, x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  const sa = a / 255;
  const da = png.data[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  png.data[i] = (r * sa + png.data[i] * da * (1 - sa)) / outA;
  png.data[i + 1] = (g * sa + png.data[i + 1] * da * (1 - sa)) / outA;
  png.data[i + 2] = (b * sa + png.data[i + 2] * da * (1 - sa)) / outA;
  png.data[i + 3] = outA * 255;
}

function blit(dst, src, dx, dy, dw, dh) {
  if (dw < 1 || dh < 1) return;
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor((x / dw) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / dh) * src.height));
      const i = (sy * src.width + sx) * 4;
      set(dst, dx + x, dy + y, src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

function blitRotated(dst, src, dx, dy, dw, dh, radians) {
  const cx = dw / 2;
  const cy = dh / 2;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const lx = x - cx;
      const ly = y - cy;
      const sx0 = lx * cos + ly * sin + src.width / 2;
      const sy0 = -lx * sin + ly * cos + src.height / 2;
      const sx = Math.round(sx0);
      const sy = Math.round(sy0);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = (sy * src.width + sx) * 4;
      set(dst, dx + x, dy + y, src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

function text(png, label, x, y, size, color) {
  const scale = Math.max(1, Math.round(size / 7));
  let cursor = x;
  const [r, g, b] = color;
  for (const ch of String(label).toUpperCase()) {
    const rows = (FONT[ch] || FONT[' ']).split(' ');
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx += 1) {
        if (row[rx] !== '1') continue;
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) set(png, cursor + rx * scale + px, y + ry * scale + py, r, g, b, 255);
        }
      }
    });
    cursor += 6 * scale;
  }
  return cursor - x;
}

function fillRect(png, box, color, alpha = 255) {
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) set(png, box.x + x, box.y + y, color[0], color[1], color[2], alpha);
  }
}

function layoutFor(width, height) {
  const insets = height < 700 ? { top: 20, bottom: 0, left: 0, right: 0 } : { top: 47, bottom: 34, left: 0, right: 0 };
  return computeFoundationLayout(width, height, insets);
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function assertClean(width, height) {
  const L = layoutFor(width, height);
  const items = {
    dial: L.dial,
    beats: L.beats,
    tap: L.tap,
    play: L.play,
    meter: L.meter,
    pockt: L.pockt,
    nav: L.navBar,
    sound: L.sound,
    tuner: L.tuner,
    plus: L.bpmPlus,
    minus: L.bpmMinus,
    bpm: { x: L.bpmHit.x, y: L.tempoName.y, w: L.bpmHit.w, h: L.bpmLabel.y + L.bpmLabel.h - L.tempoName.y },
    wordmark: L.header,
  };
  const names = Object.keys(items);
  for (let i = 0; i < names.length; i += 1) {
    const a = items[names[i]];
    if (a.w < 8 || a.h < 8) throw new Error(`${width} tiny ${names[i]}`);
    if (a.x < -0.5 || a.y < -0.5 || a.x + a.w > width + 0.5 || a.y + a.h > height + 0.5) {
      throw new Error(`${width} clip ${names[i]} ${JSON.stringify(a)}`);
    }
    for (let j = i + 1; j < names.length; j += 1) {
      if (overlaps(a, items[names[j]])) throw new Error(`${width} overlap ${names[i]}/${names[j]}`);
    }
  }
  if (L.dial.y + L.dial.h > L.beats.y + 0.5) throw new Error(`${width} dial overlaps beats`);
  if (L.beats.y + L.beats.h > L.transport.y + 0.5) throw new Error(`${width} beats overlap transport`);
  if (L.transport.y + L.transport.h > L.navBar.y + 0.5) throw new Error(`${width} transport overlaps nav`);
  if (L.dial.w < width * 0.7) throw new Error(`${width} dial ${L.dial.w} is not dominant`);
  if (L.pockt.x + L.pockt.w > width - L.g + 0.5) throw new Error(`${width} P escapes`);
  return L;
}

function paintDial(png, L, bpm, art) {
  const box = L.dial;
  blit(png, art.shadow, box.x, box.y, box.w, box.h);
  blit(png, art.bezel, box.x, box.y, box.w, box.h);
  blit(png, art.face, box.x, box.y, box.w, box.h);
  const rot = dialScaleRotation(angleFromDialBpm(bpm));
  blitRotated(png, art.scale, box.x, box.y, box.w, box.h, rot);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radius = box.w * 0.346;
  for (const mark of DIAL_MARKS) {
    const theta = angleFromDialBpm(mark);
    const lx = Math.sin(theta) * radius;
    const ly = -Math.cos(theta) * radius;
    const x = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
    const y = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
    const label = String(mark);
    const size = label.length > 2 ? Math.max(8, box.w * 0.045) : Math.max(9, box.w * 0.055);
    const width = label.length * 6 * Math.max(1, Math.round(size / 7));
    text(png, label, x - width / 2, y - size / 2, size, [186, 168, 132]);
  }
  blit(png, art.bearing, box.x, box.y, box.w, box.h);
  blit(png, art.pointer, box.x, box.y, box.w, box.h);
}

function paintShell(png, L, art, mode, bpm) {
  blit(png, art.chassis, 0, 0, png.width, png.height);
  text(png, 'POCKT', L.identity.x + L.identity.w / 2 - 28, L.identity.y, 12, [198, 180, 150]);
  blit(png, art.step, L.bpmPlus.x, L.bpmPlus.y, L.bpmPlus.w, L.bpmPlus.h);
  blit(png, art.step, L.bpmMinus.x, L.bpmMinus.y, L.bpmMinus.w, L.bpmMinus.h);
  text(png, '+', L.bpmPlus.x + L.bpmPlus.w / 2 - 4, L.bpmPlus.y + L.bpmPlus.h / 2 - 6, 12, [236, 228, 210]);
  text(png, '-', L.bpmMinus.x + L.bpmMinus.w / 2 - 4, L.bpmMinus.y + L.bpmMinus.h / 2 - 6, 12, [236, 228, 210]);
  blit(png, art.sound, L.sound.x, L.sound.y, L.sound.w, L.sound.h);
  blit(png, art.tuner, L.tuner.x, L.tuner.y, L.tuner.w, L.tuner.h);
  text(png, 'SOUND', L.sound.x + 4, L.sound.y + L.sound.h - 12, 8, [230, 220, 200]);
  text(png, 'TUNER', L.tuner.x + 4, L.tuner.y + L.tuner.h - 12, 8, [230, 220, 200]);
  text(png, 'MODERATO', L.tempoName.x, L.tempoName.y, 10, [231, 215, 184]);
  text(png, String(bpm), L.readout.x + 8, L.readout.y, Math.min(28, L.bpmFontSize), [220, 214, 204]);
  text(png, 'BPM', L.bpmLabel.x + L.bpmLabel.w / 2 - 12, L.bpmLabel.y, 9, [210, 204, 194]);
  paintDial(png, L, bpm, art);
  if (mode === 'phrase') {
    blit(png, art.phrase, L.beats.x + (L.beats.w - Math.min(L.beats.w, (L.beats.h * art.phrase.width) / art.phrase.height)) / 2, L.beats.y, Math.min(L.beats.w, (L.beats.h * art.phrase.width) / art.phrase.height), L.beats.h);
  } else if (mode !== 'wire') {
    blit(png, art.well, L.beats.x, L.beats.y, L.beats.w, L.beats.h);
    const cells = 4;
    const cell = Math.min(L.beats.h - 16, (L.beats.w - 24) / cells - 6);
    for (let i = 0; i < cells; i += 1) {
      const x = L.beats.x + 12 + i * (cell + 6);
      const y = L.beats.y + (L.beats.h - cell) / 2;
      blit(png, art.cell, x, y, cell, cell);
    }
  }
  blit(png, art.tap, L.tap.x, L.tap.y, L.tap.w, L.tap.h);
  blit(png, art.play, L.play.x, L.play.y, L.play.w, L.play.h);
  blit(png, art.meter, L.meter.x, L.meter.y, L.meter.w, L.meter.h);
  blit(png, art.p, L.pockt.x, L.pockt.y, L.pockt.w, L.pockt.h);
  text(png, 'TAP', L.tap.x + 8, L.tap.y + L.tap.h / 2 - 4, 10, [230, 214, 180]);
  text(png, '>', L.play.x + L.play.w / 2 - 4, L.play.y + L.play.h / 2 - 6, 16, [28, 20, 12]);
  text(png, '4/4', L.meter.x + 8, L.meter.y + 8, 12, [236, 228, 214]);
  text(png, 'P', L.pockt.x + L.pockt.w / 2 - 6, L.pockt.y + L.pockt.h / 2 - 6, 14, [230, 214, 180]);
  blit(png, art.nav, L.navBar.x + 6, L.navBar.y, L.navBar.w - 12, L.faceRail.h);
  const labels = ['DIAL', 'RHYTHM', 'PULSE', 'PENDULUM', 'PRO', 'BEATLINE'];
  labels.forEach((label, index) => {
    const slot = L.faceRail.w / labels.length;
    text(png, label, L.faceRail.x + index * slot + 2, L.faceRail.y + L.faceRail.h - 12, 7, index === 0 ? [232, 196, 120] : [180, 174, 164]);
  });
}

function zones(png, L) {
  const bands = [
    ['HEADER', { x: 0, y: L.header.y, w: png.width, h: L.stage.y - L.header.y }, [90, 70, 40]],
    ['INSTRUMENT', L.stage, [40, 70, 90]],
    ['BEAT', L.beats, [90, 50, 40]],
    ['PRIMARY', L.transport, [40, 80, 60]],
    ['NAV', L.navBar, [50, 50, 80]],
  ];
  bands.forEach(([name, box, color]) => {
    fillRect(png, box, color, 90);
    text(png, name, box.x + 8, box.y + 6, 11, [240, 236, 228]);
  });
}

function crop(src, x, y, w, h) {
  const png = blank(w, h);
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const sx = Math.round(x + xx);
      const sy = Math.round(y + yy);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = (sy * src.width + sx) * 4;
      const j = (yy * w + xx) * 4;
      png.data[j] = src.data[i];
      png.data[j + 1] = src.data[i + 1];
      png.data[j + 2] = src.data[i + 2];
      png.data[j + 3] = 255;
    }
  }
  return png;
}

function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

function checker() {
  const names = [
    'chassis.png',
    'sound-cap.png',
    'tuner-cap.png',
    'step-cap.png',
    'dial-bezel.png',
    'dial-face-blank.png',
    'dial-scale-ring-blank.png',
    'dial-bearing.png',
    'dial-pointer.png',
    'dial-shadow.png',
    'beat-well.png',
    'beat-cell.png',
    'tap-key-blank.png',
    'play-key-rest-blank.png',
    'play-key-pressed-blank.png',
    'meter-key-blank.png',
    'p-key-blank.png',
    'nav-rail.png',
  ];
  const cell = 280;
  const cols = 4;
  const rows = Math.ceil(names.length / cols);
  const sheet = blank(cols * cell, rows * cell);
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const c = (Math.floor(x / 14) + Math.floor(y / 14)) % 2 ? 42 : 196;
      const i = (y * sheet.width + x) * 4;
      sheet.data[i] = c;
      sheet.data[i + 1] = c;
      sheet.data[i + 2] = c;
      sheet.data[i + 3] = 255;
    }
  }
  names.forEach((name, index) => {
    const src = load(name);
    let minX = src.width;
    let minY = src.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < src.height; y += 1) {
      for (let x = 0; x < src.width; x += 1) {
        if (src.data[(y * src.width + x) * 4 + 3] < 12) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const cut = blank(Math.max(1, maxX - minX + 1), Math.max(1, maxY - minY + 1));
    for (let y = 0; y < cut.height; y += 1) {
      for (let x = 0; x < cut.width; x += 1) {
        const si = ((y + minY) * src.width + (x + minX)) * 4;
        const di = (y * cut.width + x) * 4;
        cut.data[di] = src.data[si];
        cut.data[di + 1] = src.data[si + 1];
        cut.data[di + 2] = src.data[si + 2];
        cut.data[di + 3] = src.data[si + 3];
      }
    }
    const col = index % cols;
    const row = Math.floor(index / cols);
    const scale = Math.min((cell - 28) / cut.width, (cell - 28) / cut.height);
    blit(sheet, cut, col * cell + 8, row * cell + 8, Math.max(1, Math.round(cut.width * scale)), Math.max(1, Math.round(cut.height * scale)));
  });
  fs.mkdirSync(kitDir, { recursive: true });
  fs.writeFileSync(path.join(kitDir, 'hardware-kit-checkerboard.png'), PNG.sync.write(sheet));
  fs.writeFileSync(path.join(kitDir, 'hardware-kit.png'), PNG.sync.write(sheet));
  fs.writeFileSync(path.join(outDir, 'hardware-kit-checkerboard.png'), PNG.sync.write(sheet));
  fs.writeFileSync(path.join(outDir, 'hardware-kit.png'), PNG.sync.write(sheet));
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const L320 = assertClean(320, 568);
  const L390 = assertClean(390, 844);
  console.log('320 dial', L320.dial, 'beats', L320.beats, 'play', L320.play, 'p', L320.pockt);
  console.log('390 dial', L390.dial.w);
  const art = {
    chassis: load('chassis.png'),
    sound: load('sound-cap.png'),
    tuner: load('tuner-cap.png'),
    step: load('step-cap.png'),
    bezel: load('dial-bezel.png'),
    face: load('dial-face-blank.png'),
    scale: load('dial-scale-ring-blank.png'),
    bearing: load('dial-bearing.png'),
    pointer: load('dial-pointer.png'),
    shadow: load('dial-shadow.png'),
    well: load('beat-well.png'),
    cell: load('beat-cell.png'),
    tap: load('tap-key-blank.png'),
    play: load('play-key-rest-blank.png'),
    meter: load('meter-key-blank.png'),
    p: load('p-key-blank.png'),
    nav: load('nav-rail.png'),
    phrase: PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'phrase-transport', 'plate.png'))),
  };
  checker();
  const wire = blank(320, 568);
  for (let i = 0; i < wire.data.length; i += 4) {
    wire.data[i] = 8;
    wire.data[i + 1] = 8;
    wire.data[i + 2] = 8;
    wire.data[i + 3] = 255;
  }
  zones(wire, L320);
  blit(wire, art.bezel, L320.dial.x, L320.dial.y, L320.dial.w, L320.dial.h);
  blit(wire, art.tap, L320.tap.x, L320.tap.y, L320.tap.w, L320.tap.h);
  blit(wire, art.play, L320.play.x, L320.play.y, L320.play.w, L320.play.h);
  blit(wire, art.meter, L320.meter.x, L320.meter.y, L320.meter.w, L320.meter.h);
  blit(wire, art.p, L320.pockt.x, L320.pockt.y, L320.pockt.w, L320.pockt.h);
  blit(wire, art.nav, 4, L320.navBar.y, 312, L320.faceRail.h);
  write('layout-zones-320.png', wire);

  const shell320 = blank(320, 568);
  paintShell(shell320, L320, art, 'beats', 120);
  write('shell-320.png', shell320);
  write('dial-320.png', shell320);
  write('beats-shell-320.png', shell320);

  const phrase = blank(320, 568);
  paintShell(phrase, L320, art, 'phrase', 120);
  write('phrase-shell-320.png', phrase);

  const shell390 = blank(390, 844);
  paintShell(shell390, L390, art, 'beats', 120);
  write('shell-390.png', shell390);
  write('dial-390.png', shell390);

  for (const bpm of [20, 120, 260, 400]) {
    const frame = blank(320, 568);
    paintShell(frame, L320, art, 'beats', bpm);
    write(`dial-at-${bpm}.png`, crop(frame, L320.dial.x, L320.dial.y, L320.dial.w, L320.dial.h));
  }
  const upright = blank(320 * 4, L320.dial.h);
  for (const [index, bpm] of [20, 120, 260, 400].entries()) {
    const frame = blank(320, 568);
    paintShell(frame, L320, art, 'beats', bpm);
    const dial = crop(frame, L320.dial.x, L320.dial.y, L320.dial.w, L320.dial.h);
    blit(upright, dial, index * 320 + (320 - dial.width) / 2, 0, dial.width, dial.height);
  }
  write('numerals-upright-proof.png', upright);
  write('header-detail.png', crop(shell320, 0, 0, 320, Math.ceil(L320.stage.y)));
  write('lower-controls-detail.png', crop(shell320, 0, L320.transport.y - 4, 320, 568 - (L320.transport.y - 4)));
  write('nav-detail.png', crop(shell320, 0, L320.navBar.y, 320, L320.navBar.h));
  write('dial-detail.png', crop(shell320, L320.dial.x, L320.dial.y, L320.dial.w, L320.dial.h));

  const refPath = path.join(root, 'artifacts', '_shell-inspect', 'phone-wide.png');
  const ref = PNG.sync.read(fs.readFileSync(refPath));
  const compare = blank(320 * 2 + 12, 568);
  const refScale = 568 / ref.height;
  blit(compare, ref, 0, 0, Math.round(ref.width * refScale), 568);
  blit(compare, shell320, 332, 0, 320, 568);
  write('reference-vs-shell-320.png', compare);
  console.log('proofs', outDir);
}

main();
