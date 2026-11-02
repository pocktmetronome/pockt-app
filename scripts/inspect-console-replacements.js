'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets-src/pockt-3-console/replacements');

function load(name) {
  const buf = fs.readFileSync(path.join(dir, name));
  return { name, buf, png: PNG.sync.read(buf) };
}

function at(png, x, y) {
  const i = (png.width * Math.round(y) + Math.round(x)) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function analyzePlate(png) {
  const { width: w, height: h } = png;
  const n = w * h;
  let transparent = 0;
  let opaque = 0;
  let semi = 0;
  let blackOpaque = 0;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = at(png, x, y);
      if (a === 0) {
        transparent += 1;
        continue;
      }
      if (a < 255) semi += 1;
      else opaque += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (a > 200 && r < 8 && g < 8 && b < 8) blackOpaque += 1;
    }
  }
  return {
    w,
    h,
    aspect: +(w / h).toFixed(4),
    colorType: png.colorType,
    alpha: png.colorType === 4 || png.colorType === 6,
    transparent,
    opaque,
    semi,
    transparentPct: +((transparent / n) * 100).toFixed(2),
    opaquePct: +((opaque / n) * 100).toFixed(2),
    semiPct: +((semi / n) * 100).toFixed(2),
    blackOpaque,
    content: { minX, minY, maxX, maxY, w: maxX >= 0 ? maxX - minX + 1 : 0, h: maxY >= 0 ? maxY - minY + 1 : 0 },
    corners: { tl: at(png, 0, 0), tr: at(png, w - 1, 0), bl: at(png, 0, h - 1), br: at(png, w - 1, h - 1) },
    center: at(png, w / 2, h / 2),
  };
}

function ringFromBrightness(png, cx, cy) {
  const rays = 180;
  const inner = [];
  const outer = [];
  const limit = Math.hypot(png.width, png.height) / 2;
  for (let i = 0; i < rays; i += 1) {
    const ang = (i / rays) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let sawHi = false;
    let firstHi = 0;
    let lastHi = 0;
    for (let r = 0; r < limit; r += 1) {
      const x = Math.round(cx + dx * r);
      const y = Math.round(cy + dy * r);
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) break;
      const [cr, cg, cb, a] = at(png, x, y);
      const L = lum(cr, cg, cb);
      const bronze = a > 180 && L > 70 && cr > cg + 6;
      if (bronze) {
        if (!sawHi) {
          firstHi = r;
          sawHi = true;
        }
        lastHi = r;
      }
    }
    if (sawHi) {
      inner.push(firstHi);
      outer.push(lastHi);
    }
  }
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  return { rays: inner.length, innerR: +mean(inner).toFixed(1), outerR: +mean(outer).toFixed(1) };
}

function holeFromAlpha(png, cx, cy) {
  const rays = 180;
  const hole = [];
  const outer = [];
  const limit = Math.hypot(png.width, png.height) / 2;
  for (let i = 0; i < rays; i += 1) {
    const ang = (i / rays) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let firstSolid = 0;
    let lastSolid = 0;
    let saw = false;
    for (let r = 0; r < limit; r += 1) {
      const x = Math.round(cx + dx * r);
      const y = Math.round(cy + dy * r);
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) break;
      const a = at(png, x, y)[3];
      if (a >= 16) {
        if (!saw) {
          firstSolid = r;
          saw = true;
        }
        lastSolid = r;
      }
    }
    if (saw) {
      hole.push(firstSolid);
      outer.push(lastSolid);
    }
  }
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const std = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  const holeR = mean(hole);
  const outerR = mean(outer);
  return {
    holeR: +holeR.toFixed(1),
    holeStd: +std(hole, holeR).toFixed(2),
    outerR: +outerR.toFixed(1),
    outerStd: +std(outer, outerR).toFixed(2),
  };
}

function tickHint(png, cx, cy, probeR) {
  const n = 360;
  const lums = [];
  for (let i = 0; i < n; i += 1) {
    const ang = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(ang) * probeR);
    const y = Math.round(cy + Math.sin(ang) * probeR);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
    const [r, g, b, a] = at(png, x, y);
    if (a < 80) continue;
    lums.push(lum(r, g, b));
  }
  if (lums.length < 80) return { crossings: 0, hint: false };
  const mean = lums.reduce((s, v) => s + v, 0) / lums.length;
  let crossings = 0;
  for (let i = 1; i < lums.length; i += 1) {
    if (lums[i] >= mean + 18 && lums[i - 1] < mean + 18) crossings += 1;
  }
  return { crossings, hint: crossings >= 12 };
}

function pointerHint(png, cx, cy, outerR) {
  const topX = Math.round(cx);
  const y0 = Math.max(0, Math.round(cy - outerR - 8));
  const y1 = Math.max(y0, Math.round(cy - outerR * 0.78));
  let bright = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = topX - 16; x <= topX + 16; x += 1) {
      if (x < 0 || x >= png.width || y < 0 || y >= png.height) continue;
      const [r, g, b, a] = at(png, x, y);
      if (a > 180 && lum(r, g, b) > 90) bright += 1;
    }
  }
  return { bright, hint: bright > 40 };
}

function computeFoundationLayout(width, height, safeInsets) {
  const safeHeight = height - safeInsets.top - safeInsets.bottom;
  const compact = safeHeight < 640;
  const g = width < 375 ? 14 : 20;
  const knob = compact ? 44 : 48;
  const headerTop = Math.max(safeInsets.top, 12) + (compact ? 2 : 4);
  const headerH = compact ? 34 : 40;
  const tempoNameH = compact ? 14 : 16;
  const bpmH = compact ? 52 : 66;
  const bpmLabelH = 12;
  const tempoTop = headerTop + headerH + (compact ? 2 : 4);
  const readoutY = tempoTop + tempoNameH;
  const bpmLabelY = readoutY + bpmH - 2;
  const railH = compact ? 50 : 56;
  const railBottom = height - Math.max(safeInsets.bottom, 8);
  const faceRailY = railBottom - railH;
  const transportH = compact ? 50 : 56;
  const transportY = faceRailY - (compact ? 8 : 10) - transportH;
  const pillH = compact ? 44 : 48;
  const pillY = transportY - (compact ? 8 : 10) - pillH;
  const beatsH = compact ? 48 : 54;
  const beatsY = pillY - (compact ? 6 : 8) - beatsH;
  const bandTop = bpmLabelY + bpmLabelH + (compact ? 4 : 6);
  const bandBottom = beatsY - (compact ? 4 : 6);
  const bandHeight = Math.max(0, bandBottom - bandTop);
  const D = Math.min(width - (compact ? 16 : 10), bandHeight);
  const dial = { x: (width - D) / 2, y: bandTop + (bandHeight - D) / 2, w: D, h: D, D };
  return { compact, D, dial, beats: { x: g, y: beatsY, w: width - 2 * g - (compact ? 44 : 52) - 6, h: beatsH }, play: { y: transportY, h: transportH } };
}

function coverRect(imgW, imgH, viewW, viewH) {
  const scale = Math.max(viewW / imgW, viewH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { scale, x: (viewW - w) / 2, y: (viewH - h) / 2, w, h };
}

const chassis = load('console_chassis_deck.png');
const well = load('console_well_annulus.png');
const play = load('console_play_plate.png');
const beats = load('console_beats_track.png');

const chassisA = analyzePlate(chassis.png);
const wellA = analyzePlate(well.png);
const playA = analyzePlate(play.png);
const beatsA = analyzePlate(beats.png);

const chassisRing = ringFromBrightness(chassis.png, chassis.png.width / 2, chassis.png.height / 2);
const wellHole = holeFromAlpha(well.png, well.png.width / 2, well.png.height / 2);
const wellTicks = tickHint(well.png, well.png.width / 2, well.png.height / 2, wellHole.holeR + (wellHole.outerR - wellHole.holeR) * 0.4);
const wellPointer = pointerHint(well.png, well.png.width / 2, well.png.height / 2, wellHole.outerR);

const DEVICES = [
  { name: 'iPhone 14', w: 390, h: 844, insets: { top: 47, bottom: 34 } },
  { name: 'iPhone 15', w: 393, h: 852, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 16 Pro', w: 402, h: 874, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 8', w: 375, h: 667, insets: { top: 20, bottom: 0 } },
];

const layoutMap = DEVICES.map((d) => {
  const L = computeFoundationLayout(d.w, d.h, d.insets);
  const cover = coverRect(chassis.png.width, chassis.png.height, d.w, d.h);
  const ringCx = cover.x + (chassis.png.width / 2) * cover.scale;
  const ringCy = cover.y + (chassis.png.height / 2) * cover.scale;
  const ringInner = chassisRing.innerR * cover.scale;
  const ringOuter = chassisRing.outerR * cover.scale;
  const dialCx = L.dial.x + L.D / 2;
  const dialCy = L.dial.y + L.D / 2;
  const metalR = 0.48 * L.D;
  const wellSize = 1.28 * L.D;
  const wellHoleR = wellSize * (wellHole.holeR / well.png.width);
  const wellOuterR = wellSize * (wellHole.outerR / well.png.width);
  return {
    device: d.name,
    D: +L.D.toFixed(1),
    dialC: [+dialCx.toFixed(1), +dialCy.toFixed(1)],
    metalR: +metalR.toFixed(1),
    chassisRingC: [+ringCx.toFixed(1), +ringCy.toFixed(1)],
    chassisInnerR: +ringInner.toFixed(1),
    chassisOuterR: +ringOuter.toFixed(1),
    ringVsDial: [+(ringCx - dialCx).toFixed(1), +(ringCy - dialCy).toFixed(1)],
    metalInsideChassisHole: metalR < ringInner,
    wellHoleR: +wellHoleR.toFixed(1),
    wellOuterR: +wellOuterR.toFixed(1),
    wellCoversBezel: wellHoleR < metalR - 1,
    wellGap: +(wellHoleR - metalR).toFixed(1),
  };
});

const out = {
  chassis: { ...chassisA, bytes: chassis.buf.length, ring: chassisRing },
  well: { ...wellA, bytes: well.buf.length, hole: wellHole, ticks: wellTicks, pointer: wellPointer },
  play: { ...playA, bytes: play.buf.length },
  beats: { ...beatsA, bytes: beats.buf.length },
  layoutMap,
};

console.log(JSON.stringify(out, null, 2));
