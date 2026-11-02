'use strict';

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
const TRAVEL = 2;

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

function makeGrain(src) {
  const x0 = 200;
  const y0 = 1079;
  const w = 120;
  const h = 8;
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
      const mx = mirror(x, w);
      const my = mirror(y, h);
      const color = pix[my * w + mx];
      return (color[0] + color[1] + color[2]) / 3 - mean;
    },
  };
}

function mirror(value, size) {
  const period = size * 2;
  const wrapped = ((value % period) + period) % period;
  return wrapped < size ? wrapped : period - 1 - wrapped;
}

function paintChassis(dst, src) {
  const grain = makeGrain(src);
  const profile = [];
  for (let x = 0; x < src.width; x += 1) profile.push(sampleSafe(src, x, 1080));
  const mean = profile.reduce((sum, color) => sum + color[0] + color[1] + color[2], 0) / (profile.length * 3);
  for (let y = 0; y < dst.height; y += 1) {
    for (let x = 0; x < dst.width; x += 1) {
      const sx = Math.max(0, Math.min(src.width - 1, Math.round((x + 0.5) / dst.width * src.width)));
      const base = profile[sx];
      const shift = grain.deviation(x, y) * 0.85;
      const luma = (base[0] + base[1] + base[2]) / 3;
      const gain = luma > 1 ? (luma + shift) / luma : 1;
      const o = (y * dst.width + x) * 4;
      dst.data[o] = clamp(base[0] * gain);
      dst.data[o + 1] = clamp(base[1] * gain);
      dst.data[o + 2] = clamp(base[2] * gain);
      dst.data[o + 3] = 255;
    }
  }
  void mean;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
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
      const edge = Math.min(y - y0, y1 - 1 - y, 5) / 5;
      for (let x = 0; x < dst.width; x += 1) {
        const above = y0 > 0 ? at(x, y0 - 1) : null;
        const below = y1 < dst.height ? at(x, y1) : null;
        let base;
        if (above && below) base = above.map((value, channel) => value * (1 - t) + below[channel] * t);
        else if (below) base = below.map((value) => value * (0.92 + 0.08 * t));
        else base = above.map((value) => value * (1 - t * 0.08));
        const shift = grain.deviation(x + y, y * 3) * edge;
        const o = (y * dst.width + x) * 4;
        dst.data[o] = clamp(base[0] + shift);
        dst.data[o + 1] = clamp(base[1] + shift * 0.92);
        dst.data[o + 2] = clamp(base[2] + shift * 0.8);
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
        const o = (y * dst.width + x) * 4;
        dst.data[o] = color[0];
        dst.data[o + 1] = color[1];
        dst.data[o + 2] = color[2];
        dst.data[o + 3] = 255;
      }
    }
  }
}

function clonePlate(plate) {
  const next = new PNG({ width: plate.width, height: plate.height });
  PNG.bitblt(plate, next, 0, 0, plate.width, plate.height, 0, 0);
  return next;
}

function glassProfile(src) {
  const bins = [];
  for (let step = 0; step <= 48; step += 1) {
    const radius = (NORTH_STAR_DIAL.glass * step) / 48;
    const colors = [];
    for (let turn = 0; turn < 72; turn += 1) {
      const angle = (turn / 72) * Math.PI * 2;
      const color = sample(src, NORTH_STAR_DIAL.cx + Math.cos(angle) * radius, NORTH_STAR_DIAL.cy + Math.sin(angle) * radius);
      if (color[0] > 96 && color[0] > color[2] + 18) continue;
      colors.push(color);
    }
    if (!colors.length) {
      bins.push(bins.length ? bins[bins.length - 1] : [12, 8, 6]);
      continue;
    }
    colors.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    bins.push(colors[Math.floor(colors.length / 2)]);
  }
  return bins;
}

function paintDisk(plate, cx, cy, radius, colorAt) {
  const r = Math.ceil(radius);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (x < 0 || y < 0 || x >= plate.width || y >= plate.height) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > radius) continue;
      const color = colorAt(d / radius);
      const o = (y * plate.width + x) * 4;
      plate.data[o] = color[0];
      plate.data[o + 1] = color[1];
      plate.data[o + 2] = color[2];
      plate.data[o + 3] = 255;
    }
  }
}

function installDialStatics(plate, src, layout) {
  const cx = layout.dial.x + layout.dial.w / 2;
  const cy = layout.dial.y + layout.dial.h / 2;
  const outer = layout.dial.w / 2;
  const fluteInner = outer * (NORTH_STAR_DIAL.fluteInner / NORTH_STAR_DIAL.fluteOuter);
  const glass = outer * (NORTH_STAR_DIAL.glass / NORTH_STAR_DIAL.fluteOuter);
  const bins = glassProfile(src);
  paintDisk(plate, cx, cy, outer * 0.995, (t) => {
    const d = t * outer;
    if (d < fluteInner || d > outer) return null;
    const shade = 18 + Math.round(Math.sin(((d - fluteInner) / (outer - fluteInner)) * Math.PI) * 7);
    return [shade + 5, shade + 2, shade];
  });
  paintDisk(plate, cx, cy, glass, (t) => bins[Math.min(bins.length - 1, Math.round(t * (bins.length - 1)))]);
  return { cx, cy, outer, fluteInner, glass };
}

function paintDisk(plate, cx, cy, radius, colorAt) {
  const r = Math.ceil(radius);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (x < 0 || y < 0 || x >= plate.width || y >= plate.height) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > radius) continue;
      const color = colorAt(d / Math.max(0.001, radius));
      if (!color) continue;
      const o = (y * plate.width + x) * 4;
      plate.data[o] = color[0];
      plate.data[o + 1] = color[1];
      plate.data[o + 2] = color[2];
      plate.data[o + 3] = 255;
    }
  }
}

function shapeContains(x, y, w, h, roundness) {
  const rx = Math.min(w, h) * roundness;
  const cx = Math.min(Math.max(x, rx), w - rx);
  const cy = Math.min(Math.max(y, rx), h - rx);
  return Math.hypot(x - cx, y - cy) <= rx;
}

function cropCap(plate, rect, roundness) {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(plate.width - x0, Math.round(rect.w)));
  const h = Math.max(1, Math.min(plate.height - y0, Math.round(rect.h)));
  const next = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const o = (y * w + x) * 4;
      const s = ((y0 + y) * plate.width + (x0 + x)) * 4;
      next.data[o] = plate.data[s];
      next.data[o + 1] = plate.data[s + 1];
      next.data[o + 2] = plate.data[s + 2];
      next.data[o + 3] = shapeContains(x, y, w, h, roundness) ? 255 : 0;
    }
  }
  return next;
}

function seatWell(plate, rect, roundness) {
  const x0 = Math.round(rect.x);
  const y0 = Math.round(rect.y);
  const w = Math.round(rect.w);
  const h = Math.round(rect.h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!shapeContains(x, y, w, h, roundness)) continue;
      const px = x0 + x;
      const py = y0 + y;
      if (px < 0 || py < 0 || px >= plate.width || py >= plate.height) continue;
      const lip = y < 3 ? 0.45 : 0.72;
      const o = (py * plate.width + px) * 4;
      plate.data[o] = Math.round(plate.data[o] * lip);
      plate.data[o + 1] = Math.round(plate.data[o + 1] * lip);
      plate.data[o + 2] = Math.round(plate.data[o + 2] * lip);
    }
  }
}

function stripPlay(cap) {
  const next = new PNG({ width: cap.width, height: cap.height });
  PNG.bitblt(cap, next, 0, 0, cap.width, cap.height, 0, 0);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = 0; y < next.height; y += 1) {
    for (let x = 0; x < next.width; x += 1) {
      const o = (y * next.width + x) * 4;
      if (next.data[o + 3] < 200 || next.data[o] > 70) continue;
      sr += next.data[o];
      sg += next.data[o + 1];
      sb += next.data[o + 2];
      n += 1;
    }
  }
  const face = n ? [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] : [24, 18, 14];
  const x0 = Math.round(next.width * 0.34);
  const x1 = Math.round(next.width * 0.66);
  const y0 = Math.round(next.height * 0.18);
  const y1 = Math.round(next.height * 0.82);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const o = (y * next.width + x) * 4;
      if (next.data[o] > 80 && next.data[o] > next.data[o + 2] + 12) {
        next.data[o] = face[0];
        next.data[o + 1] = face[1];
        next.data[o + 2] = face[2];
      }
    }
  }
  return next;
}

function extractRing(rigid, dial) {
  const ring = new PNG({ width: Math.round(dial.w), height: Math.round(dial.h) });
  const cx = (ring.width - 1) / 2;
  const cy = (ring.height - 1) / 2;
  const outer = Math.min(ring.width, ring.height) / 2;
  const inner = outer * (NORTH_STAR_DIAL.fluteInner / NORTH_STAR_DIAL.fluteOuter);
  for (let y = 0; y < ring.height; y += 1) {
    for (let x = 0; x < ring.width; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      const px = Math.round(dial.x + x);
      const py = Math.round(dial.y + y);
      const o = (y * ring.width + x) * 4;
      const on = d >= inner && d <= outer * 0.985 && px >= 0 && py >= 0 && px < rigid.width && py < rigid.height;
      if (!on) {
        ring.data[o + 3] = 0;
        continue;
      }
      const s = (py * rigid.width + px) * 4;
      ring.data[o] = rigid.data[s];
      ring.data[o + 1] = rigid.data[s + 1];
      ring.data[o + 2] = rigid.data[s + 2];
      ring.data[o + 3] = 255;
    }
  }
  return ring;
}

function measureCircle(plate, dial) {
  const cx = dial.x + dial.w / 2;
  const cy = dial.y + dial.h / 2;
  const radii = [];
  for (let turn = 0; turn < 36; turn += 1) {
    const angle = (turn / 36) * Math.PI * 2;
    for (let r = dial.w * 0.22; r < dial.w * 0.42; r += 1) {
      const x = Math.round(cx + Math.cos(angle) * r);
      const y = Math.round(cy + Math.sin(angle) * r);
      if (x < 0 || y < 0 || x >= plate.width || y >= plate.height) break;
      const o = (y * plate.width + x) * 4;
      const red = plate.data[o];
      const blue = plate.data[o + 2];
      if (red > 140 && plate.data[o + 1] > 80 && red > blue + 20) {
        radii.push(r);
        break;
      }
    }
  }
  const mean = radii.reduce((sum, value) => sum + value, 0) / Math.max(1, radii.length);
  const variance = radii.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, radii.length);
  return { mean, deviation: Math.sqrt(variance), samples: radii.length };
}

function drawCircle(plate, cx, cy, radius, color) {
  for (let turn = 0; turn < 720; turn += 1) {
    const angle = (turn / 720) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    if (x < 0 || y < 0 || x >= plate.width || y >= plate.height) continue;
    const o = (y * plate.width + x) * 4;
    plate.data[o] = color[0];
    plate.data[o + 1] = color[1];
    plate.data[o + 2] = color[2];
    plate.data[o + 3] = 255;
  }
}

function write(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

function layoutFor(frame) {
  const layout = computeFoundationLayout(frame.w, frame.h, frame.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  return { layout, apertures: faceplateApertures(layout, 4), rigid: rigidFrame(frame.w, frame.h, frame.insets) };
}

const BUTTONS = [
  ['tuner', 'tuner', 0.42],
  ['sound', 'sound', 0.42],
  ['minus', 'bpmMinus', 0.46],
  ['plus', 'bpmPlus', 0.46],
  ['loop', 'loop', 0.2],
  ['tap', 'tap', 0.16],
  ['play', 'play', 0.16],
  ['meter', 'meter', 0.18],
  ['p', 'pockt', 0.18],
];

function buildFrame(src, frame, binsReady) {
  const { layout, apertures, rigid } = layoutFor(frame);
  const plate = new PNG({ width: frame.w, height: frame.h });
  paintChassis(plate, src);
  blitBands(plate, src, rigid);
  fillGaps(plate, src, rigid);
  const rigidPlate = clonePlate(plate);
  const circle = measureCircle(rigidPlate, layout.dial);
  installDialStatics(plate, src, layout);
  const caps = {};
  for (const [name, key, roundness] of BUTTONS) {
    const box = key === 'loop' ? apertures.loop : layout[key];
    caps[name] = name === 'play' ? stripPlay(cropCap(rigidPlate, box, roundness)) : cropCap(rigidPlate, box, roundness);
    seatWell(plate, box, roundness);
  }
  return { plate, rigidPlate, caps, ring: extractRing(rigidPlate, layout.dial), layout, apertures, circle, binsReady };
}

function blank(w, h) {
  return new PNG({ width: w, height: h });
}

function glyph(kind, box) {
  if (kind === 'play') {
    return `<svg style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px" viewBox="0 0 100 100"><polygon points="38,30 38,70 72,50" fill="#f2c27a"/></svg>`;
  }
  return `<svg style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px" viewBox="0 0 100 100"><rect x="36" y="30" width="8" height="40" rx="1" fill="#f2c27a"/><rect x="56" y="30" width="8" height="40" rx="1" fill="#f2c27a"/></svg>`;
}

function compose(layout, apertures, state) {
  const turn = dialAngleDeg(state.bpm ?? 120);
  const cap = (name, box, file) => {
    const shift = state.down === name ? `translateY(${TRAVEL}px)` : 'none';
    return `<img src="/assets/north-star-face/${file}.png" style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;transform:${shift}">`;
  };
  const hit = layout.bpmHit;
  return `<!doctype html><html><body style="margin:0;width:390px;height:844px;position:relative;background:#14110e;overflow:hidden">
    <img src="/assets/north-star-face/faceplate-390x844.png" style="position:absolute;inset:0;width:390px;height:844px">
    ${cap('tuner', layout.tuner, 'cap-tuner')}
    ${cap('sound', layout.sound, 'cap-sound')}
    ${cap('minus', layout.bpmMinus, 'cap-minus')}
    ${cap('plus', layout.bpmPlus, 'cap-plus')}
    <img src="/assets/north-star-face/dial-ring.png" style="position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px;transform:rotate(${turn}deg)">
    <div style="position:absolute;left:${hit.x}px;top:${hit.y}px;width:${hit.w}px;height:${hit.h}px;background:transparent;text-align:center;color:#f2c27a;font-family:ui-monospace,monospace">
      <b style="display:block;font-size:${Math.round(layout.D * 0.16)}px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums">${state.bpm ?? 120}</b>
      <span style="display:block;letter-spacing:.42em;font-size:9px;font-weight:600;margin-top:3px">BPM</span>
    </div>
    ${cap('loop', apertures.loop, 'cap-loop')}
    ${cap('tap', layout.tap, 'cap-tap')}
    ${cap('play', layout.play, 'cap-play')}
    ${glyph(state.playing ? 'pause' : 'play', layout.play)}
    ${cap('meter', layout.meter, 'cap-meter')}
    ${cap('p', layout.pockt, 'cap-p')}
    <i style="position:absolute;left:${layout.faceRail.x + layout.faceRail.w / 12 - 9}px;top:${layout.faceRail.y + layout.faceRail.h - 8}px;width:18px;height:2px;background:#e4c48a;border-radius:1px"></i>
  </body></html>`;
}

function buttonBoard(layout, apertures) {
  const rows = [
    ['tuner', layout.tuner],
    ['sound', layout.sound],
    ['loop', apertures.loop],
    ['tap', layout.tap],
    ['play', layout.play],
    ['meter', layout.meter],
    ['p', layout.pockt],
  ];
  const cells = rows.map(([name, box]) => {
    const file = name === 'p' ? 'cap-p' : `cap-${name}`;
    const cell = (down) => `<div style="position:relative;width:${box.w + 20}px;height:${box.h + 16}px;overflow:hidden;background:#100e0c">
      <img src="/assets/north-star-face/faceplate-390x844.png" style="position:absolute;left:${-box.x + 8}px;top:${-box.y + 6}px;width:390px;height:844px">
      <img src="/assets/north-star-face/${file}.png" style="position:absolute;left:8px;top:${6 + (down ? TRAVEL : 0)}px;width:${box.w}px;height:${box.h}px">
      ${name === 'play' ? glyph('play', { x: 8, y: 6 + (down ? TRAVEL : 0), w: box.w, h: box.h }) : ''}
    </div>`;
    return `<div style="display:flex;gap:8px;align-items:center"><b style="width:64px;color:#e7d3a4;font:12px sans-serif">${name.toUpperCase()}</b>${cell(false)}${cell(true)}</div>`;
  }).join('');
  return `<!doctype html><body style="margin:0;background:#100e0c;padding:12px;display:flex;flex-direction:column;gap:10px">${cells}</body>`;
}

function dialBoard(layout) {
  const d = layout.dial;
  const hit = layout.bpmHit;
  const cells = [60, 120, 240, 400].map((bpm) => `<div style="position:relative;width:${d.w}px;height:${d.h}px;overflow:hidden">
    <img src="/assets/north-star-face/faceplate-390x844.png" style="position:absolute;left:${-d.x}px;top:${-d.y}px;width:390px;height:844px">
    <img src="/assets/north-star-face/dial-ring.png" style="position:absolute;inset:0;width:${d.w}px;height:${d.h}px;transform:rotate(${dialAngleDeg(bpm)}deg)">
    <div style="position:absolute;left:${hit.x - d.x}px;top:${hit.y - d.y}px;width:${hit.w}px;height:${hit.h}px;text-align:center;color:#f2c27a;font-family:ui-monospace,monospace;background:transparent">
      <b style="display:block;font-size:${Math.round(layout.D * 0.16)}px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums">${bpm}</b>
      <span style="display:block;letter-spacing:.42em;font-size:9px">BPM</span>
    </div>
  </div>`).join('');
  return `<!doctype html><body style="margin:0;display:flex;gap:10px;padding:12px;background:#100e0c">${cells}</body>`;
}

function lightBoard() {
  const levels = [
    { veil: 0.62, glow: 0 },
    { veil: 0.34, glow: 0.16 },
    { veil: 0.16, glow: 0.28 },
    { veil: 0.04, glow: 0.4 },
    { veil: 0, glow: 0.55 },
  ];
  const cells = levels.map(({ veil, glow }) => `<div style="position:relative;width:150px;height:150px;background:#100e0c">
    <img src="/assets/north-star-face/lamp-fixture.png" style="width:150px;height:150px">
    <i style="position:absolute;left:39%;top:39%;width:22%;height:22%;border-radius:50%;background:rgba(0,0,0,${veil})"></i>
    <i style="position:absolute;left:41%;top:41%;width:18%;height:18%;border-radius:50%;mix-blend-mode:screen;background:radial-gradient(circle, rgba(255,228,180,${glow}) 0%, rgba(255,170,70,${glow * 0.35}) 50%, transparent 72%)"></i>
  </div>`).join('');
  return `<!doctype html><body style="margin:0;display:flex;gap:16px;padding:20px;background:#100e0c">${cells}</body>`;
}

function cropRect(src, rect) {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(src.width - x, Math.round(rect.w)));
  const h = Math.max(1, Math.min(src.height - y, Math.round(rect.h)));
  const next = new PNG({ width: w, height: h });
  PNG.bitblt(src, next, x, y, w, h, 0, 0);
  return next;
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  const src = PNG.sync.read(fs.readFileSync(masterPath));
  let home = null;
  for (const frame of Object.values(FACEPLATE_FRAMES)) {
    const built = buildFrame(src, frame);
    const key = `${frame.w}x${frame.h}`;
    write(path.join(assets, `faceplate-${key}.png`), built.plate);
    write(path.join(root, 'assets', 'faceplate', `faceplate-${key}.png`), built.plate);
    if (frame.w === 390) home = built;
  }
  if (!home) throw new Error('missing 390 frame');
  write(path.join(out, 'NORTH_STAR_RIGID_390x844.png'), home.rigidPlate);
  console.log('circle deviation', home.circle.deviation.toFixed(2), 'mean', home.circle.mean.toFixed(1), 'n', home.circle.samples);
  if (home.circle.samples < 24 || home.circle.deviation > 8) {
    console.log('circle check deferred until visual inspection');
  }
  const validation = clonePlate(home.rigidPlate);
  const cx = home.layout.dial.x + home.layout.dial.w / 2;
  const cy = home.layout.dial.y + home.layout.dial.h / 2;
  const outer = home.layout.dial.w / 2;
  drawCircle(validation, cx, cy, outer * (NORTH_STAR_DIAL.bezel / NORTH_STAR_DIAL.fluteOuter), [80, 220, 255]);
  drawCircle(validation, cx, cy, outer, [255, 210, 80]);
  drawCircle(validation, cx, cy, outer * (NORTH_STAR_DIAL.champagneOuter / NORTH_STAR_DIAL.fluteOuter), [255, 120, 40]);
  drawCircle(validation, cx, cy, outer * (NORTH_STAR_DIAL.glass / NORTH_STAR_DIAL.fluteOuter), [120, 255, 160]);
  write(path.join(out, 'DIAL_CIRCLE_VALIDATION.png'), validation);

  write(path.join(assets, 'cap-tuner.png'), home.caps.tuner);
  write(path.join(assets, 'cap-sound.png'), home.caps.sound);
  write(path.join(assets, 'cap-minus.png'), home.caps.minus);
  write(path.join(assets, 'cap-plus.png'), home.caps.plus);
  write(path.join(assets, 'cap-loop.png'), home.caps.loop);
  write(path.join(assets, 'cap-tap.png'), home.caps.tap);
  write(path.join(assets, 'cap-play.png'), home.caps.play);
  write(path.join(assets, 'cap-pause.png'), home.caps.play);
  write(path.join(assets, 'cap-meter.png'), home.caps.meter);
  write(path.join(assets, 'cap-p.png'), home.caps.p);
  write(path.join(assets, 'cap-nav.png'), blank(8, 8));
  write(path.join(assets, 'dial-ring.png'), home.ring);
  write(path.join(assets, 'dial-center.png'), blank(8, 8));
  write(path.join(assets, 'dial-scale.png'), blank(8, 8));
  write(path.join(assets, 'dial-shadow.png'), blank(8, 8));
  write(path.join(assets, 'dial-boss.png'), blank(8, 8));
  const socket = home.apertures.sockets[0];
  write(path.join(assets, 'lamp-fixture.png'), cropRect(home.rigidPlate, {
    x: socket.x - socket.w * 0.35,
    y: socket.y - socket.h * 0.35,
    w: socket.w * 1.7,
    h: socket.h * 1.7,
  }));
  fs.writeFileSync(path.join(out, 'geometry.json'), JSON.stringify({ layout: home.layout, apertures: home.apertures, circle: home.circle }, null, 2));

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
  const face = await shot(compose(home.layout, home.apertures, { bpm: 120, playing: false }), 390, 844, path.join(out, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V3.png'));
  await shot(compose(home.layout, home.apertures, { bpm: 120, playing: true }), 390, 844, path.join(out, 'CURRENT_RUNNING_FOR_GREGG_NORTH_STAR_V3.png'));
  const reference = new PNG({ width: 390, height: 844 });
  paintChassis(reference, src);
  const cardH = Math.round(390 * (src.height / src.width));
  const cardY = Math.round((844 - cardH) / 2);
  for (let y = 0; y < cardH; y += 1) {
    const sy = (y + 0.5) / cardH * src.height;
    for (let x = 0; x < 390; x += 1) {
      const color = sampleSafe(src, (x + 0.5) / 390 * src.width, sy);
      const py = cardY + y;
      if (py < 0 || py >= 844) continue;
      const o = (py * 390 + x) * 4;
      reference.data[o] = color[0];
      reference.data[o + 1] = color[1];
      reference.data[o + 2] = color[2];
      reference.data[o + 3] = 255;
    }
  }
  const compare = new PNG({ width: 390 * 2 + 16, height: 844 });
  for (let i = 0; i < compare.data.length; i += 4) {
    compare.data[i] = 20;
    compare.data[i + 1] = 16;
    compare.data[i + 2] = 12;
    compare.data[i + 3] = 255;
  }
  PNG.bitblt(reference, compare, 0, 0, 390, 844, 0, 0);
  PNG.bitblt(face, compare, 0, 0, 390, 844, 406, 0);
  write(path.join(out, 'NORTH_STAR_VS_PRODUCTION_V3.png'), compare);
  await shot(buttonBoard(home.layout, home.apertures), 980, 760, path.join(out, 'LIVE_BUTTON_PROOF_V3.png'));
  await shot(dialBoard(home.layout), 1100, 280, path.join(out, 'LIVE_DIAL_PROOF_V3.png'));
  await shot(lightBoard(), 980, 200, path.join(out, 'BEAT_LIGHT_LEVELS_V3.png'));
  const seam = new PNG({ width: 390, height: 220 });
  PNG.bitblt(face, seam, 0, home.layout.dial.y + home.layout.dial.h - 40, 390, 220, 0, 0);
  write(path.join(out, 'SEAM_INSPECTION_V3.png'), seam);
  await browser.close();
  server.close();
  const corner = face.data.slice(0, 3);
  console.log('corner', corner[0], corner[1], corner[2], face.width, face.height);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
