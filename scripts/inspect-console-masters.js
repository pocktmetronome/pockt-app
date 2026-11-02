'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const masters = path.join(root, 'assets-src/pockt-3-console/masters');

const FILES = [
  'console_chassis_deck.png',
  'console_well_annulus.png',
  'console_knob_housing.png',
  'console_tap_housing.png',
  'console_play_plate.png',
  'console_pockt_housing.png',
  'console_pill_plate.png',
  'console_beats_track.png',
];

function loadPng(file) {
  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);
  return { buf, png, hash: crypto.createHash('sha256').update(buf).digest('hex') };
}

function at(png, x, y) {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function analyze(name, { buf, png, hash }) {
  const { width: w, height: h } = png;
  const n = w * h;
  let transparent = 0;
  let opaque = 0;
  let semi = 0;
  let blackOpaque = 0;
  let nearBlackOpaque = 0;
  let whiteOpaque = 0;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let holeMinX = w;
  let holeMinY = h;
  let holeMaxX = -1;
  let holeMaxY = -1;
  let lumSum = 0;
  let lumN = 0;
  let bronze = 0;
  let warmHi = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = at(png, x, y);
      if (a === 0) {
        transparent += 1;
        holeMinX = Math.min(holeMinX, x);
        holeMinY = Math.min(holeMinY, y);
        holeMaxX = Math.max(holeMaxX, x);
        holeMaxY = Math.max(holeMaxY, y);
        continue;
      }
      if (a < 255) semi += 1;
      else opaque += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumSum += lum;
      lumN += 1;
      if (a > 200 && r < 8 && g < 8 && b < 8) blackOpaque += 1;
      if (a > 200 && r < 28 && g < 28 && b < 28) nearBlackOpaque += 1;
      if (a > 200 && r > 240 && g > 240 && b > 240) whiteOpaque += 1;
      if (a > 180 && r > g + 8 && g > b + 4 && r > 80) bronze += 1;
      if (a > 180 && lum > 160 && r > g && g > b) warmHi += 1;
    }
  }

  const contentW = maxX >= minX ? maxX - minX + 1 : 0;
  const contentH = maxY >= minY ? maxY - minY + 1 : 0;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Radial occupancy from content center (opaque samples).
  const bins = 64;
  const binCount = new Array(bins).fill(0);
  const binMaxR = new Array(bins).fill(0);
  const binInner = new Array(bins).fill(1e9);
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      const [r, g, b, a] = at(png, x, y);
      if (a < 16) continue;
      const dx = x - cx;
      const dy = y - cy;
      const rad = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
      const bin = Math.min(bins - 1, Math.floor(ang * bins));
      binCount[bin] += 1;
      binMaxR[bin] = Math.max(binMaxR[bin], rad);
      if (a > 200) binInner[bin] = Math.min(binInner[bin], rad);
    }
  }
  const outerR = binMaxR.reduce((s, v) => s + v, 0) / bins;
  const innerCandidates = binInner.filter((v) => v < 1e8);
  const innerR = innerCandidates.length ? innerCandidates.reduce((s, v) => s + v, 0) / innerCandidates.length : 0;

  // Sample the geometric center and corners.
  const samples = {
    center: at(png, Math.round(w / 2), Math.round(h / 2)),
    tl: at(png, 0, 0),
    tr: at(png, w - 1, 0),
    bl: at(png, 0, h - 1),
    br: at(png, w - 1, h - 1),
  };

  // Center-hole: is the middle actually transparent?
  const midA = samples.center[3];
  const hasCenterHole = midA < 16;

  // Detect a 12-o'clock pointer: extra occupancy above the ring, near top-center.
  let pointerHint = false;
  if (name.includes('annulus') || name.includes('well')) {
    const topX = Math.round(cx);
    const scanTop = Math.max(0, minY);
    const scanBot = Math.max(scanTop, Math.round(cy - outerR * 0.72));
    let bright = 0;
    for (let y = scanTop; y < scanBot; y += 1) {
      for (let x = topX - 18; x <= topX + 18; x += 1) {
        const [r, g, b, a] = at(png, x, y);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (a > 180 && lum > 90) bright += 1;
      }
    }
    pointerHint = bright > 40;
  }

  // Tick hint: high-frequency brightness along a mid-ring.
  let tickHint = false;
  if (name.includes('annulus') || name.includes('well')) {
    const probeR = innerR > 20 ? innerR + (outerR - innerR) * 0.35 : outerR * 0.62;
    const samplesN = 360;
    const lums = [];
    for (let i = 0; i < samplesN; i += 1) {
      const ang = (i / samplesN) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(ang) * probeR);
      const y = Math.round(cy + Math.sin(ang) * probeR);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const [r, g, b, a] = at(png, x, y);
      if (a < 80) continue;
      lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    if (lums.length > 100) {
      let crossings = 0;
      const mean = lums.reduce((s, v) => s + v, 0) / lums.length;
      const thresh = mean + 18;
      for (let i = 1; i < lums.length; i += 1) {
        if (lums[i] >= thresh && lums[i - 1] < thresh) crossings += 1;
      }
      tickHint = crossings >= 12;
    }
  }

  // Play-triangle hint: bright compact cluster near plate center.
  let iconHint = false;
  if (name.includes('play') || name.includes('beats')) {
    const box = 80;
    const x0 = Math.max(0, Math.round(cx - box));
    const x1 = Math.min(w - 1, Math.round(cx + box));
    const y0 = Math.max(0, Math.round(cy - box * 0.6));
    const y1 = Math.min(h - 1, Math.round(cy + box * 0.6));
    let hi = 0;
    for (let y = y0; y <= y1; y += 2) {
      for (let x = x0; x <= x1; x += 2) {
        const [r, g, b, a] = at(png, x, y);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (a > 180 && lum > 140) hi += 1;
      }
    }
    iconHint = hi > 30;
  }

  return {
    file: name,
    bytes: buf.length,
    sha256: hash,
    width: w,
    height: h,
    aspect: +(w / h).toFixed(4),
    colorType: png.colorType,
    bpp: png.bpp,
    alpha: png.alpha === true || png.colorType === 4 || png.colorType === 6,
    pixels: n,
    transparent,
    opaque,
    semi,
    transparentPct: +((transparent / n) * 100).toFixed(2),
    opaquePct: +((opaque / n) * 100).toFixed(2),
    semiPct: +((semi / n) * 100).toFixed(2),
    blackOpaque,
    nearBlackOpaque,
    whiteOpaque,
    bronze,
    warmHi,
    meanLum: lumN ? +(lumSum / lumN).toFixed(1) : 0,
    content: { minX, minY, maxX, maxY, w: contentW, h: contentH },
    contentAspect: contentH ? +(contentW / contentH).toFixed(4) : 0,
    center: { cx: +cx.toFixed(1), cy: +cy.toFixed(1) },
    outerR: +outerR.toFixed(1),
    innerR: +innerR.toFixed(1),
    hasCenterHole,
    samples,
    pointerHint,
    tickHint,
    iconHint,
  };
}

const reports = {};
const hashes = {};
for (const name of FILES) {
  const file = path.join(masters, name);
  if (!fs.existsSync(file)) {
    reports[name] = { missing: true };
    continue;
  }
  const loaded = loadPng(file);
  hashes[name] = loaded.hash;
  reports[name] = analyze(name, loaded);
}

const out = {
  generatedAt: new Date().toISOString(),
  identicalGroups: [],
  reports,
};

const byHash = {};
for (const [name, hash] of Object.entries(hashes)) {
  byHash[hash] = byHash[hash] || [];
  byHash[hash].push(name);
}
out.identicalGroups = Object.values(byHash).filter((g) => g.length > 1);

const dest = path.join(root, 'assets-src/pockt-3-console/ASSET_INSPECT.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
