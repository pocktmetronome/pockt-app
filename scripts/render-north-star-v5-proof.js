'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'north-star-build');
const v5 = path.join(root, 'assets', 'north-star-v5');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const geo = require(path.join(root, 'north-star-v4-geometry.json'));
const { dialAngleDeg } = require(path.join(root, 'lib', 'dial-scale-geometry.js'));

const W = 390;
const H = 844;
const INK = '#F2C078';
const CAPTION = '#E6A34C';

function box(item) {
  const s = geo.objects[item].screen390;
  return s;
}

function trimPng(file) {
  if (!fs.existsSync(file)) return;
  const png = PNG.sync.read(fs.readFileSync(file));
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  let any = false;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] > 12) {
        any = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!any) return;
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(png.width - 1, maxX + pad);
  maxY = Math.min(png.height - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const next = new PNG({ width: w, height: h });
  PNG.bitblt(png, next, minX, minY, w, h, 0, 0);
  fs.writeFileSync(file, PNG.sync.write(next));
}

function frameIndex(bpm) {
  const index = Math.round((dialAngleDeg(bpm) / 360) * 256);
  return ((index % 256) + 256) % 256;
}

function faceHtml(state) {
  const dial = geo.objects.dialOuter.screen390;
  const frame = 290;
  const index = frameIndex(state.bpm);
  const caps = [
    ['tuner', 'utility-rest.png', 'TUNER'],
    ['sound', 'utility-rest.png', 'SOUND'],
    ['minus', 'round-rest.png', ''],
    ['plus', 'round-rest.png', ''],
    ['loop', state.loop ? 'loop-active.png' : 'loop-rest.png', 'LOOP'],
    ['tap', 'primary-rest.png', 'TAP'],
    ['play', state.playing ? 'primary-active.png' : 'primary-rest.png', ''],
    ['meter', 'secondary-rest.png', 'METER'],
    ['p', 'secondary-rest.png', 'P'],
  ];
  const capHtml = caps.map(([key, file]) => {
    const r = box(key);
    return `<img class="cap" src="/assets/north-star-v5/${file}" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px">`;
  }).join('');
  const labels = [
    ['tuner', 'TUNER', 9],
    ['sound', 'SOUND', 9],
    ['loop', 'LOOP', 10],
    ['tap', 'TAP', 13],
    ['meter', 'METER', 11],
    ['p', 'P', 13],
  ].map(([key, text, size]) => {
    const r = box(key);
    return `<div class="label" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;font-size:${size}px">${text}</div>`;
  }).join('');
  const beats = ['beat1', 'beat2', 'beat3', 'beat4'].map((key, indexBeat) => {
    const r = box(key);
    const level = state.levels[indexBeat];
    const glow = level === 'off' ? 0 : level === '1' ? 0.28 : level === '2' ? 0.5 : level === '3' ? 0.78 : 1;
    const size = level === 'peak' ? 18 : 12;
    return `<div class="lamp" style="left:${r.centerX - size}px;top:${r.centerY - size}px;width:${size * 2}px;height:${size * 2}px;opacity:${glow};box-shadow:0 0 ${8 + glow * 16}px ${2 + glow * 6}px rgba(255,170,60,${glow})"></div>`;
  }).join('');
  const nav = ['DIAL', 'RHYTHM', 'PULSE', 'PENDULUM', 'PRO', 'BEATLINE'].map((label, indexNav) => {
    const slot = geo.objects.navSlots[indexNav].screen390;
    const on = indexNav === 0;
    return `<div class="nav" style="left:${slot.centerX}px;top:${slot.centerY}px;color:${on ? INK : '#8A8174'}">
      <div class="nic">${navIcon(indexNav, on)}</div>
      <div class="nl">${label}</div>
      ${on ? '<div class="witness"></div>' : ''}
    </div>`;
  }).join('');
  const play = box('play');
  const glyph = state.playing
    ? `<div class="pause" style="left:${play.centerX - 8}px;top:${play.centerY - 9}px"></div><div class="pause" style="left:${play.centerX + 3}px;top:${play.centerY - 9}px"></div>`
    : `<div class="play" style="left:${play.centerX - 7}px;top:${play.centerY - 9}px"></div>`;
  const minus = box('minus');
  const plus = box('plus');
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#14110e;width:${W}px;height:${H}px;overflow:hidden}
    .plate{position:absolute;inset:0;width:${W}px;height:${H}px}
    .dial{position:absolute;width:${frame}px;height:${frame}px;left:${dial.centerX - frame / 2}px;top:${dial.centerY - frame / 2}px}
    .cap{position:absolute;object-fit:fill}
    .label{position:absolute;display:flex;align-items:center;justify-content:center;color:${INK};font-family:"Segoe UI",sans-serif;font-weight:650;letter-spacing:0.12em;pointer-events:none}
    .bpm{position:absolute;left:${dial.centerX}px;top:${dial.centerY}px;transform:translate(-50%,-50%);text-align:center;color:${INK};font-family:"Segoe UI",sans-serif;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";letter-spacing:0}
    .bpm b{display:block;font-size:42px;font-weight:560;line-height:1}
    .bpm span{display:block;margin-top:2px;font-size:11px;letter-spacing:0.22em;color:${CAPTION};font-weight:650}
    .lamp{position:absolute;border-radius:99px;background:radial-gradient(circle,#ffe1a6 0%,#e7a23a 55%,rgba(231,162,58,0) 72%)}
    .nav{position:absolute;transform:translate(-50%,-50%);text-align:center;font-family:"Segoe UI",sans-serif;width:58px}
    .nl{font-size:8px;letter-spacing:0.08em;font-weight:650;margin-top:2px}
    .witness{height:2px;width:28px;margin:3px auto 0;background:#E7A23A;box-shadow:0 0 8px #E7A23A}
    .play{position:absolute;width:0;height:0;border-left:16px solid ${INK};border-top:9px solid transparent;border-bottom:9px solid transparent}
    .pause{position:absolute;width:5px;height:18px;background:${INK};border-radius:1px}
    .glyph{position:absolute;color:${INK};font-family:"Segoe UI",sans-serif;font-weight:500;font-size:22px;line-height:1;transform:translate(-50%,-50%)}
  </style></head><body>
    <img class="plate" src="/assets/north-star-v5/faceplate-static.png">
    <img class="dial" src="/assets/north-star-v5/dial/frame-${String(index).padStart(3, '0')}.png">
    ${capHtml}
    ${beats}
    ${labels}
    <div class="bpm"><b>${state.bpm}</b><span>BPM</span></div>
    <div class="glyph" style="left:${minus.centerX}px;top:${minus.centerY}px">−</div>
    <div class="glyph" style="left:${plus.centerX}px;top:${plus.centerY}px">+</div>
    ${glyph}
    ${nav}
  </body></html>`;
}

function navIcon(index, on) {
  const c = on ? '#F2C078' : '#8A8174';
  const icons = [
    `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="8" cy="8" r="1.4" fill="${c}"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 8h2l2-4 3 8 2-4h5" fill="none" stroke="${c}" stroke-width="1.3"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2" fill="${c}"/><circle cx="8" cy="8" r="5.5" fill="none" stroke="${c}" stroke-width="1.2"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2 L10 8 H6 Z" fill="${c}"/><path d="M8 8 V14" stroke="${c}" stroke-width="1.2"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 12 V8 M6 12 V5 M9 12 V7 M12 12 V3" stroke="${c}" stroke-width="1.4"/></svg>`,
    `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3h3v3H3zM10 3h3v3h-3zM3 10h3v3H3zM10 10h3v3h-3z" fill="${c}"/></svg>`,
  ];
  return icons[index];
}

function board(title, inner, width, height) {
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#0e0c0a;color:#e7d7c0;font-family:"Segoe UI",sans-serif}
    h1{font-size:14px;letter-spacing:0.14em;font-weight:650;margin:16px 18px 8px}
    .row{display:flex;gap:18px;padding:8px 18px 24px;align-items:flex-end;flex-wrap:wrap}
    img{display:block}
    figcaption{font-size:11px;letter-spacing:0.08em;margin-top:6px;color:#b7a48a}
  </style></head><body><h1>${title}</h1><div class="row">${inner}</div></body></html>`;
}

async function main() {
  for (const name of ['utility-rest.png', 'utility-pressed.png', 'round-rest.png', 'round-pressed.png', 'primary-rest.png', 'primary-pressed.png', 'primary-active.png', 'secondary-rest.png', 'secondary-pressed.png', 'loop-rest.png', 'loop-pressed.png', 'loop-active.png']) {
    trimPng(path.join(v5, name));
  }
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
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  async function shot(html, w, h, file) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html.replaceAll('src="/', `src="${base}/`).replaceAll('src=\\"/', `src=\\"${base}/`), { waitUntil: 'load', timeout: 120000 });
    const buf = await page.screenshot({ type: 'png' });
    fs.writeFileSync(file, buf);
    return PNG.sync.read(buf);
  }

  const stopped = { bpm: 120, playing: false, loop: false, levels: ['3', '2', '2', '1'] };
  const running = { bpm: 120, playing: true, loop: true, levels: ['peak', '2', '1', 'off'] };
  await shot(faceHtml(stopped), W, H, path.join(out, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png'));
  await shot(faceHtml(running), W, H, path.join(out, 'CURRENT_RUNNING_FOR_GREGG_NORTH_STAR_V5.png'));

  const compare = `<!doctype html><html><head><style>
    html,body{margin:0;background:#090807;width:780px;height:844px}
    .col{position:absolute;top:0;width:390px;height:844px;overflow:hidden;background:#14110e}
    img.ref{position:absolute;left:0;top:0;width:390px;height:844px;object-fit:contain;object-position:center}
    img.prod{position:absolute;inset:0;width:390px;height:844px}
  </style></head><body>
    <div class="col" style="left:0"><img class="ref" src="/REFERENCE/POCKT_NORTH_STAR_MASTER.png"></div>
    <div class="col" style="left:390px"><img class="prod" src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png"></div>
  </body></html>`;
  await shot(compare, 780, 844, path.join(out, 'NORTH_STAR_VS_PRODUCTION_V5.png'));

  const values = [20, 60, 99, 100, 120, 240, 399, 400];
  const bpmCells = values.map((bpm) => `<figure><div class="glass" data-bpm="${bpm}"><div class="cross"></div><div class="stack"><b>${bpm}</b><span>BPM</span></div></div><figcaption>${bpm}</figcaption></figure>`).join('');
  const bpmHtml = `<!doctype html><html><head><style>
    html,body{margin:0;background:#0e0c0a;color:#e7d7c0;font-family:"Segoe UI",sans-serif}
    .row{display:flex;gap:16px;padding:24px;flex-wrap:wrap}
    .glass{width:150px;height:150px;border-radius:99px;background:#100e0c;border:2px solid #8a5a2a;position:relative}
    .stack{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;color:#F2C078;font-variant-numeric:tabular-nums;letter-spacing:0}
    .stack b{display:block;font-size:36px;font-weight:560;line-height:1}
    .stack span{display:block;margin-top:2px;font-size:10px;letter-spacing:0.2em;color:#E6A34C}
    .cross{position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.35)}
    .cross:after{content:"";position:absolute;top:50%;left:-75px;width:150px;height:1px;background:rgba(255,255,255,0.35)}
    figcaption{text-align:center;font-size:11px;margin-top:6px}
  </style></head><body><div class="row">${bpmCells}</div></body></html>`;
  const bpmPng = await shot(bpmHtml, 700, 420, path.join(out, 'BPM_CENTER_VALIDATION_V5.png'));
  const centers = [];
  for (const bpm of values) {
    const handle = await page.$(`.glass[data-bpm="${bpm}"] .stack`);
    const bounds = await handle.boundingBox();
    centers.push({ bpm, cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2, w: bounds.width });
  }
  const xs = centers.map((item) => item.cx);
  const spread = Math.max(...xs) - Math.min(...xs);
  fs.writeFileSync(path.join(out, 'bpm-centers-v5.json'), JSON.stringify({ spread, centers }, null, 2));
  void bpmPng;

  const families = [
    ['UTILITY', 'utility-rest.png', 'utility-pressed.png'],
    ['ROUND', 'round-rest.png', 'round-pressed.png'],
    ['PRIMARY', 'primary-rest.png', 'primary-pressed.png', 'primary-active.png'],
    ['SECONDARY', 'secondary-rest.png', 'secondary-pressed.png'],
    ['LOOP', 'loop-rest.png', 'loop-pressed.png', 'loop-active.png'],
  ];
  const buttonInner = families.map(([name, ...files]) => files.map((file) => `<figure><img src="/assets/north-star-v5/${file}" style="height:72px"><figcaption>${name} ${file.replace('.png', '').split('-').pop()}</figcaption></figure>`).join('')).join('');
  await shot(board('BUTTON STATES', buttonInner), 980, 280, path.join(out, 'BUTTON_STATES_V5.png'));

  const dialFrames = [0, 32, 64, 128, 192];
  const dialInner = dialFrames.map((index) => `<figure><img src="/assets/north-star-v5/dial/frame-${String(index).padStart(3, '0')}.png" style="width:160px;height:160px"><figcaption>FRAME ${index}</figcaption></figure>`).join('');
  await shot(board('DIAL FIXED LIGHT', dialInner), 980, 280, path.join(out, 'DIAL_STATES_V5.png'));

  const levels = [
    ['OFF', 0],
    ['LEVEL 1', 0.28],
    ['LEVEL 2', 0.5],
    ['LEVEL 3', 0.78],
    ['BEAT PEAK', 1],
  ];
  const lightInner = levels.map(([name, opacity]) => `<figure><div style="width:88px;height:88px;position:relative"><img src="/assets/north-star-v5/lamp-fixture.png" style="width:88px;height:88px"><div style="position:absolute;left:22px;top:22px;width:44px;height:44px;border-radius:99px;opacity:${opacity};background:radial-gradient(circle,#ffe1a6,#e7a23a 60%,transparent 75%)"></div></div><figcaption>${name}</figcaption></figure>`).join('');
  await shot(board('BEAT LIGHTS', lightInner), 720, 220, path.join(out, 'BEAT_LIGHT_LEVELS_V5.png'));

  const navInner = `<figure><img src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png" style="width:390px;height:844px;object-fit:none;object-position:0 -700px;width:390px;height:144px"></figure>`;
  await shot(board('NAV', navInner), 460, 220, path.join(out, 'NAV_VALIDATION_V5.png'));

  const seam = `<!doctype html><html><head><style>
    html,body{margin:0;background:#0e0c0a}
    .grid{display:grid;grid-template-columns:390px 390px;gap:8px;padding:8px}
    img{width:390px;height:180px;object-fit:none}
  </style></head><body><div class="grid">
    <img src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png" style="object-position:0 0">
    <img src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png" style="object-position:0 -200px">
    <img src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png" style="object-position:0 -430px">
    <img src="/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V5.png" style="object-position:0 -660px">
  </div></body></html>`;
  await shot(seam, 800, 380, path.join(out, 'SEAM_INSPECTION_V5.png'));

  await browser.close();
  server.close();
  console.log('proofs written', spread);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
