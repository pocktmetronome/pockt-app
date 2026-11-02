'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const parts = path.join(root, 'assets/north-star-v4/parts');
const proofDir = path.join(root, 'artifacts', process.env.POCKT_PROOF_OUT || 'v4-gate-final');
const outDir = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(outDir, { recursive: true });

const CX = 249;
const CY = 390;
const BOSS_R = 46;
const dialRect = { x: 21, y: 162, w: 456, h: 456 };

function lum(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function read(file) {
  return PNG.sync.read(fs.readFileSync(file));
}
function get(img, x, y) {
  const xx = Math.max(0, Math.min(img.width - 1, Math.round(x)));
  const yy = Math.max(0, Math.min(img.height - 1, Math.round(y)));
  const i = (yy * img.width + xx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function set(img, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = a;
}

const PROFILE = [
  [208, -3, 5],
  [218, -8, 10],
  [230, -5, 8],
  [243, -4, 6],
  [266, -4, 6],
  [278, -5, 4],
  [296, -6, 5],
  [318, -8, 7],
  [336, -10, 8],
  [352, -12, 10],
  [364, -13, 11],
];

function profileBounds(y) {
  if (y <= PROFILE[0][0] || y >= PROFILE[PROFILE.length - 1][0]) return null;
  let i = 0;
  while (i < PROFILE.length - 1 && PROFILE[i + 1][0] < y) i += 1;
  const a = PROFILE[i];
  const b = PROFILE[i + 1];
  const t = (y - a[0]) / (b[0] - a[0]);
  return { left: a[1] + (b[1] - a[1]) * t - 2, right: a[2] + (b[2] - a[2]) * t + 2 };
}

function inUprightShaft(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  if (dx * dx + dy * dy < (BOSS_R - 2) * (BOSS_R - 2)) return false;
  const bounds = profileBounds(y);
  if (!bounds) return false;
  return dx >= bounds.left && dx <= bounds.right;
}

function angleFromBpm(bpm) {
  if (bpm <= 120) return (-130 * Math.PI) / 180 + ((bpm - 20) / 100) * ((130 * Math.PI) / 180);
  return ((bpm - 120) / 280) * ((140 * Math.PI) / 180);
}

const body = read(path.join(parts, 'dial-body-empty.png'));
const needle = read(path.join(parts, 'needle-shaft.png'));

let bodyShaft = 0;
let bodyChecked = 0;
const heat = new PNG({ width: body.width, height: body.height });
heat.data.set(body.data);
for (let y = 212; y <= 360; y += 1) {
  if (y >= 244 && y <= 265) continue;
  const radius = Math.hypot(0, y - CY);
  if (radius < 54 || (radius >= 164 && radius <= 178)) continue;
  for (let x = CX - 16; x <= CX + 16; x += 1) {
    if (!inUprightShaft(x, y)) continue;
    const px = get(body, x - dialRect.x, y - dialRect.y);
    if (px[3] < 8) continue;
    const L = lum(px[0], px[1], px[2]);
    const left = get(body, x - dialRect.x - 22, y - dialRect.y);
    const right = get(body, x - dialRect.x + 22, y - dialRect.y);
    const side = (lum(left[0], left[1], left[2]) + lum(right[0], right[1], right[2])) / 2;
    bodyChecked += 1;
    if (L > side + 22 && L > 40) {
      bodyShaft += 1;
      set(heat, x - dialRect.x, y - dialRect.y, 255, 40, 40, 255);
    }
  }
}

let needleOpaque = 0;
let needleOutside = 0;
for (let y = 0; y < needle.height; y += 1) {
  for (let x = 0; x < needle.width; x += 1) {
    const px = get(needle, x, y);
    if (px[3] < 8) continue;
    needleOpaque += 1;
    const sx = x + dialRect.x;
    const sy = y + dialRect.y;
    if (!inUprightShaft(sx, sy)) needleOutside += 1;
  }
}

const lines = [];
lines.push('# Dial state audit');
lines.push('');
lines.push('## Static assets');
lines.push('');
lines.push(`- Body corridor pixels checked: ${bodyChecked}`);
lines.push(`- Body pixels still brighter than the face by 22: ${bodyShaft}`);
lines.push(`- Needle opaque pixels: ${needleOpaque}`);
lines.push(`- Needle pixels outside the mechanical shaft: ${needleOutside}`);
lines.push(`- Body shaft clear: ${bodyShaft === 0 ? 'yes' : 'no'}`);
lines.push(`- Needle confined to the shaft: ${needleOutside === 0 ? 'yes' : 'no'}`);
lines.push('');

function cropDial(file, width, height) {
  const img = read(file);
  const layout = computeFoundationLayout(width, height, height < 700 ? { top: 20, bottom: 0, left: 0, right: 0 } : { top: 47, bottom: 34, left: 0, right: 0 }, {
    dialChrome: true,
    presentation: 'beats',
    beatRows: 1,
  });
  const x0 = Math.round(layout.dial.x);
  const y0 = Math.round(layout.dial.y);
  const w = Math.round(layout.dial.w);
  const h = Math.round(layout.dial.h);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = get(img, x0 + x, y0 + y);
      set(out, x, y, px[0], px[1], px[2], 255);
    }
  }
  return out;
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

const proofs = [
  ['20', 'dial-20-bpm.png', 390, 844],
  ['60', 'state-60-bpm.png', 390, 844],
  ['120', 'dial-120-bpm.png', 390, 844],
  ['160', 'state-160-bpm.png', 390, 844],
  ['200', 'dial-200-bpm.png', 390, 844],
  ['240', 'state-240-bpm.png', 390, 844],
  ['260', 'dial-260-bpm.png', 390, 844],
  ['320', 'dial-320-bpm.png', 390, 844],
  ['400', 'state-400-bpm.png', 390, 844],
];

lines.push('## Rendered dials');
lines.push('');

let ghostFail = 0;
let clusterFail = 0;
const rendered = [];

for (const [bpm, file, width, height] of proofs) {
  const full = path.join(proofDir, file);
  if (!fs.existsSync(full)) {
    lines.push(`- ${bpm}: missing ${file}`);
    continue;
  }
  const dial = cropDial(full, width, height);
  writePng(path.join(outDir, `dial-${bpm}.png`), dial);
  const cx = dial.width / 2;
  const cy = dial.height / 2;
  const radius = dial.width * 0.34;
  let hot = 0;
  let checked = 0;
  const ghost = new PNG({ width: dial.width, height: dial.height });
  ghost.data.set(dial.data);
  for (let y = Math.round(cy - dial.height * 0.42); y < Math.round(cy - dial.height * 0.12); y += 1) {
    const frac = (y / dial.height);
    if (frac > 0.16 && frac < 0.25) continue;
    if (frac > 0.10 && frac < 0.15) continue;
    for (let dx = -3; dx <= 3; dx += 1) {
      const px = get(dial, cx + dx, y);
      const left = get(dial, cx + dx - 16, y);
      const right = get(dial, cx + dx + 16, y);
      const L = lum(px[0], px[1], px[2]);
      const side = (lum(left[0], left[1], left[2]) + lum(right[0], right[1], right[2])) / 2;
      checked += 1;
      if (bpm !== '120' && L > side + 28 && L > 70) {
        hot += 1;
        set(ghost, Math.round(cx + dx), y, 255, 32, 32, 255);
      }
    }
  }
  const angle = angleFromBpm(Number(bpm));
  let tipL = 0;
  for (let t = dial.width * 0.16; t <= dial.width * 0.4; t += 2) {
    const px = get(dial, cx + Math.sin(angle) * t, cy - Math.cos(angle) * t);
    tipL = Math.max(tipL, lum(px[0], px[1], px[2]));
  }
  const samples = [0.28, 0.34].map((frac) => {
    const y = cy - dial.height * (0.5 - frac);
    const center = lum(...get(dial, cx, y).slice(0, 3));
    const side = (lum(...get(dial, cx - 18, y).slice(0, 3)) + lum(...get(dial, cx + 18, y).slice(0, 3))) / 2;
    return center - side;
  });
  const ridge = Math.max(...samples);
  const ghosted = bpm !== '120' && (hot > 40 || ridge > 24);
  const missingNeedle = tipL < 80;
  if (ghosted) ghostFail += 1;
  if (missingNeedle) clusterFail += 1;
  lines.push(`- ${bpm} BPM: upright hot ${hot}/${checked}, corridor delta ${ridge.toFixed(1)}, needle L ${tipL.toFixed(0)}`);
  if (bpm === '60' || bpm === '160' || bpm === '240' || bpm === '400') {
    const zx = Math.max(0, Math.round(cx - 100));
    const zy = Math.max(0, Math.round(cy - dial.height * 0.48));
    const close = new PNG({ width: 200 * 3, height: 220 * 3 });
    for (let yy = 0; yy < close.height; yy += 1) {
      for (let xx = 0; xx < close.width; xx += 1) {
        const px = get(dial, zx + Math.floor(xx / 3), zy + Math.floor(yy / 3));
        set(close, xx, yy, px[0], px[1], px[2], 255);
      }
    }
    writePng(path.join(outDir, `dial-${bpm}-closeup.png`), close);
    writePng(path.join(proofDir, `dial-${bpm}-closeup.png`), close);
  }
  rendered.push(bpm);
  if (bpm === '60') writePng(path.join(outDir, 'dial-residue-heatmap.png'), ghost);
}

lines.push('');
lines.push(`Rendered proofs audited: ${rendered.join(', ') || 'none'}`);
lines.push(`Ghost failures: ${ghostFail}`);
lines.push(`Missing-needle failures: ${clusterFail}`);
lines.push('');
lines.push(bodyShaft === 0 && needleOutside === 0 && ghostFail === 0 && clusterFail === 0 ? 'RESULT: PASS' : 'RESULT: REVIEW');

writePng(path.join(outDir, 'dial-body-residue-heatmap.png'), heat);
fs.writeFileSync(path.join(root, 'DIAL_STATE_AUDIT.md'), lines.join('\n'));
fs.writeFileSync(path.join(outDir, 'DIAL_STATE_AUDIT.md'), lines.join('\n'));
console.log(lines.join('\n'));
