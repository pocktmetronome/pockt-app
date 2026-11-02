'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const file = path.join(root, 'assets-src/pockt-3-console/replacements/console_chassis_deck.png');
const buf = fs.readFileSync(file);
const png = PNG.sync.read(buf);

function at(x, y) {
  const i = (png.width * Math.round(y) + Math.round(x)) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function lum(c) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const { width: w, height: h } = png;
let transparent = 0;
let opaque = 0;
let semi = 0;
let blackOpaque = 0;
let bronzeHi = 0;
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const c = at(x, y);
    if (c[3] === 0) transparent += 1;
    else if (c[3] < 255) semi += 1;
    else opaque += 1;
    if (c[3] > 200 && c[0] < 8 && c[1] < 8 && c[2] < 8) blackOpaque += 1;
    if (c[3] > 200 && c[0] > c[1] + 20 && lum(c) > 90) bronzeHi += 1;
  }
}

function inwardEdge(y) {
  let left = 0;
  let right = w - 1;
  while (left < w && lum(at(left, y)) < 40) left += 1;
  while (right > 0 && lum(at(right, y)) < 40) right -= 1;
  return { y, left, right, innerW: right - left + 1 };
}

const midY = Math.floor(h / 2);
const samples = {
  tl: at(0, 0),
  tr: at(w - 1, 0),
  bl: at(0, h - 1),
  br: at(w - 1, h - 1),
  center: at(w / 2, h / 2),
  topMid: at(w / 2, 8),
  waist: at(w / 2, midY),
};

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
  return {
    compact,
    D,
    dial: { x: (width - D) / 2, y: bandTop + (bandHeight - D) / 2, w: D },
    sound: { x: g, w: knob },
    tuner: { x: width - g - knob, w: knob },
    readout: { x: g + knob + 8, y: readoutY, w: width - 2 * g - 2 * knob - 16, h: bpmH },
    faceRail: { y: faceRailY, h: railH },
    tap: { x: g, y: transportY, w: transportH },
    play: { y: transportY, h: transportH },
  };
}

function coverRect(imgW, imgH, viewW, viewH) {
  const scale = Math.max(viewW / imgW, viewH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { scale, x: (viewW - dw) / 2, y: (viewH - dh) / 2, w: dw, h: dh };
}

const DEVICES = [
  { name: 'iPhone 14', w: 390, h: 844, insets: { top: 47, bottom: 34 } },
  { name: 'iPhone 15', w: 393, h: 852, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 16 Pro', w: 402, h: 874, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932, insets: { top: 59, bottom: 34 } },
  { name: 'iPhone 8', w: 375, h: 667, insets: { top: 20, bottom: 0 } },
];

const waists = [0.08, 0.22, 0.35, 0.5, 0.65, 0.78, 0.92].map((t) => inwardEdge(Math.floor(h * t)));

const map = DEVICES.map((d) => {
  const L = computeFoundationLayout(d.w, d.h, d.insets);
  const cover = coverRect(w, h, d.w, d.h);
  const imgY = (ptY) => (ptY - cover.y) / cover.scale;
  const waistAtDial = inwardEdge(Math.max(0, Math.min(h - 1, Math.round(imgY(L.dial.y + L.D / 2)))));
  const leftInset = cover.x + waistAtDial.left * cover.scale;
  const rightInset = cover.x + waistAtDial.right * cover.scale;
  return {
    device: d.name,
    D: +L.D.toFixed(1),
    dial: [+L.dial.x.toFixed(1), +(L.dial.x + L.D).toFixed(1)],
    metal: [+(L.dial.x + L.D * 0.02).toFixed(1), +(L.dial.x + L.D * 0.98).toFixed(1)],
    deckInner: [+leftInset.toFixed(1), +rightInset.toFixed(1)],
    soundX: L.sound.x,
    tunerX: L.tuner.x,
    railY: +L.faceRail.y.toFixed(1),
    dialClearsDeck: L.dial.x >= leftInset - 2 && L.dial.x + L.D <= rightInset + 2,
  };
});

console.log(
  JSON.stringify(
    {
      bytes: buf.length,
      w,
      h,
      aspect: +(w / h).toFixed(4),
      colorType: png.colorType,
      transparent,
      opaque,
      semi,
      blackOpaque,
      bronzeHi,
      samples,
      waists,
      map,
    },
    null,
    2
  )
);
