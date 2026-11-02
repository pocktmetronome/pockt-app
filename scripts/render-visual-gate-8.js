'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout, instrumentFurniture } = require('../lib/compute-foundation-layout.ts');
const { BOSS_SCALE, dialAngleDeg } = require('../lib/dial-scale-geometry.js');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'visual-gate-8');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ART = {
  wordmark: 'assets/north-star-v3/pockt_wordmark_northstar.png',
  pmark: 'assets/north-star-v3/pockt_p_mark_transparent.png',
  chassis: 'assets/north-star-v3/chassis_texture_512.png',
  roundRest: 'assets/north-star-v3/header_round_shell_rest.png',
  roundDown: 'assets/north-star-v3/header_round_shell_pressed.png',
  tempoRest: 'assets/north-star-v3/tempo_knob_shell_rest.png',
  tempoDown: 'assets/north-star-v3/tempo_knob_shell_pressed.png',
  bpm: 'assets/north-star-v3/bpm_well_blank.png',
  bezel: 'assets/dial-clean/dial-bezel-clean.png',
  face: 'assets/dial-clean/dial-face-neutral.png',
  scale: 'assets/dial-clean/dial-scale-generated.png',
  needle: 'assets/dial-clean/dial-needle.png',
  boss: 'assets/dial-clean/dial-boss.png',
  playRest: 'assets/north-star-v3/transport_primary_shell_rest.png',
  playDown: 'assets/north-star-v3/transport_primary_shell_pressed.png',
  tapRest: 'assets/north-star-v3/transport_dark_shell_rest.png',
  tapDown: 'assets/north-star-v3/transport_dark_shell_pressed.png',
  keyRest: 'assets/north-star-v3/transport_dark_shell_rest.png',
  keyDown: 'assets/north-star-v3/transport_dark_shell_pressed.png',
  beatPanel: 'assets/north-star-v3/beat_panel.png',
  nav: 'assets/north-star-v3/nav_tray.png',
  lamp: 'assets/north-star-v3/lamp_green.png',
};

const ICONS = {
  tuner: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M35 18v31c0 10 7 18 15 18s15-8 15-18V18"/><path d="M50 67v17"/></svg>',
  sound: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 58h16l18 15V27L36 42H20z"/><path d="M66 39c6 6 6 16 0 22"/><path d="M76 30c12 12 12 28 0 40"/></svg>',
  minus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M24 50h52"/></svg>',
  plus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 24v52M24 50h52"/></svg>',
  play: '<svg viewBox="0 0 100 100"><path d="M34 22L76 50 34 78Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 100 100"><rect x="34" y="27" width="11" height="46" rx="1.5" fill="currentColor"/><rect x="55" y="27" width="11" height="46" rx="1.5" fill="currentColor"/></svg>',
  loop: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M26 35c7-9 16-13 27-13 14 0 25 7 31 18"/><path d="M79 25l5 15-15 2"/><path d="M74 65c-7 9-16 13-27 13-14 0-25-7-31-18"/><path d="M21 75l-5-15 15-2"/></svg>',
  dial: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><circle cx="50" cy="52" r="26"/><path d="M50 26v26h24"/></svg>',
  rhythm: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 28l22 22-22 22M49 28l22 22-22 22"/></svg>',
  pulse: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 52h18l8-22 15 46 12-32 8 8h19"/></svg>',
  pendulum: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M50 18v42"/><circle cx="50" cy="73" r="12"/></svg>',
  pro: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M25 25v50M50 25v50M75 25v50"/></svg>',
  beatline: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 70l25-42 18 29 27-42"/></svg>',
};

function src(rel) {
  return '/' + rel.replace(/\\/g, '/');
}

function navSize(slot, width) {
  const pad = width < 360 ? 10 : 6;
  let size = width < 360 ? 9 : 11;
  while (size > 7.5 && textWidth('PENDULUM', size) > slot - pad) size -= 0.25;
  return size;
}

function screen(spec) {
  const composition = spec.composition || 'heritage';
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, {
    dialChrome: true,
    presentation: 'beats',
    beatRows: 1,
    dialShare: spec.dialShare,
    composition,
  });
  const furniture = instrumentFurniture(layout);
  const turn = dialAngleDeg(spec.bpm);
  const bossPct = (BOSS_SCALE * 100).toFixed(2);
  const bossOrigin = ((1 - BOSS_SCALE) * 50).toFixed(2);
  const slot = layout.faceRail.w / 6;
  const font = navSize(slot, spec.w);
  if (textWidth('PENDULUM', font) > slot - 2) throw new Error(`PENDULUM overflow ${spec.w}`);
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const loopW = Math.min(72, Math.max(52, layout.beats.h * 0.58));
  const lamp = Math.min(28, layout.beats.h * 0.36);
  const innerX = layout.beats.x + lamp + 16;
  const innerW = layout.beats.w - lamp - loopW - 32;
  const col = innerW / 4;
  const disc = Math.min(col * 0.92, layout.beats.h * 0.72);
  const playing = Boolean(spec.playing);
  const down = spec.down || '';
  const stepRest = spec.stepShell === 'tempo' ? ART.tempoRest : ART.roundRest;
  const stepDown = spec.stepShell === 'tempo' ? ART.tempoDown : ART.roundDown;
  const spin = spec.bezelSpin === false ? 0 : turn;
  const bpmScale = spec.bpmScale || 0.58;
  const cells = accents.map((level, index) => {
    const hot = spec.peak === index || (playing && spec.beat === index);
    const x = innerX + col * index + (col - disc) / 2;
    const y = layout.beats.y + (layout.beats.h - disc) * 0.38;
    const glow = level === 'mute' ? 0.08 : level === 'soft' ? 0.34 : level === 'strong' ? 0.7 : 0.48;
    return `<div class="socket" style="left:${x}px;top:${y}px;width:${disc}px;height:${disc}px">
      <img src="${src(ART.roundRest)}" alt="">
      <i class="${hot ? 'peak' : ''}" style="opacity:${hot ? 1 : glow};transform:scale(${hot && level === 'strong' ? 1.16 : 1})"></i>
      <b>${index + 1}</b>
    </div>`;
  }).join('');
  const nav = [
    ['dial', 'DIAL'], ['rhythm', 'RHYTHM'], ['pulse', 'PULSE'], ['pendulum', 'PENDULUM'], ['pro', 'PRO'], ['beatline', 'BEATLINE'],
  ].map(([id, label], index) => {
    const on = (spec.nav || 'dial') === id;
    return `<div class="nav-item${on ? ' is-on' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px">
      ${ICONS[id]}<span style="font-size:${font}px">${label}</span>${on ? '<u></u>' : ''}</div>`;
  }).join('');
  const round = (name, box, icon, rest, pressedArt) => {
    const pressed = down === name;
    return `<div class="key ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(pressed ? pressedArt : rest)}" alt="">
      <em>${icon}</em></div>`;
  };
  const key = (name, box, inner, kind) => {
    const pressed = down === name;
    const bronze = kind === 'play' && spec.playBronze !== false;
    const art = bronze
      ? (pressed ? ART.playDown : ART.playRest)
      : kind === 'tap'
        ? (pressed ? ART.tapDown : ART.tapRest)
        : (pressed ? ART.keyDown : ART.keyRest);
    const ink = bronze ? 'play' : 'dark';
    return `<div class="key ${ink} ${kind} ${pressed ? 'is-down' : ''} ${spec.playing && name === 'play' ? 'is-on' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(art)}" alt=""><em>${inner}</em></div>`;
  };
  const recess = (box, extra = '') => `<div class="recess ${extra}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}
    html,body{margin:0;background:#100e0c}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;color:#f6f1e8;position:relative;
      font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;
      background:#100e0c url('${src(ART.chassis)}') center/420px;
      box-shadow:inset 0 0 90px rgba(0,0,0,.55), inset 0 28px 70px rgba(90,60,20,.06)}
    img{display:block}
    .recess{position:absolute;background:#221e1a;border-radius:28px;pointer-events:none;
      box-shadow:inset 0 1px 0 rgba(255,226,186,.16), inset 0 -16px 24px rgba(0,0,0,.35)}
    .navrail{border-radius:22px;background:rgba(0,0,0,.5)}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y + 4}px;width:${layout.identity.w}px;height:${Math.max(18, layout.identity.h * 0.42)}px;
      display:flex;align-items:center;justify-content:center}
    .brand img{height:100%;width:auto;max-width:100%;object-fit:contain}
    .key{position:absolute;filter:drop-shadow(0 5px 3px rgba(0,0,0,.55))}
    .key img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .key em{position:absolute;inset:20%;display:flex;align-items:center;justify-content:center;font-style:normal}
    .key em svg{width:64%;height:64%}
    .key.is-down{transform:translateY(6px);filter:brightness(.55) drop-shadow(0 1px 0 rgba(0,0,0,.25))}
    .play em{color:#1a120c;inset:10%}
    .play em svg{width:58%;height:58%;filter:drop-shadow(0 1px 0 rgba(255,220,170,.28))}
    .dark em{color:#f4ecdf}
    .tap em{color:#f6e3b0;font-weight:800;letter-spacing:.14em;font-size:${Math.max(15, Math.round(layout.play.h * 0.32))}px;text-shadow:0 1px 1px rgba(0,0,0,.85)}
    .meter em{flex-direction:column;gap:1px;font-weight:700;letter-spacing:.06em;font-size:${Math.max(13, Math.round(layout.play.h * 0.24))}px;line-height:.9;color:#f4ecdf}
    .meter small{color:#c6a36a;font-size:10px;letter-spacing:.16em}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px}
    .readout img{width:100%;height:100%;object-fit:fill;opacity:${spec.well === false ? 0 : 1}}
    .readout b{position:absolute;left:0;right:0;top:42%;transform:translateY(-52%);text-align:center;
      font-family:"Segoe UI",Arial,sans-serif;font-weight:720;font-variant-numeric:tabular-nums;letter-spacing:.02em;
      font-size:${Math.round(layout.bpmHit.h * bpmScale)}px;color:#f7f3ea;text-shadow:0 1px 0 rgba(0,0,0,.65)}
    .readout span{position:absolute;left:0;right:0;bottom:12%;text-align:center;font-size:${Math.max(9, Math.round(layout.bpmHit.h * 0.16))}px;letter-spacing:.28em;font-weight:700;color:#d7b56a}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px;filter:drop-shadow(0 10px 8px rgba(0,0,0,.5))}
    .dial .fill{position:absolute;inset:0;width:100%;height:100%}
    .dial .bezel,.dial .needle{transform-origin:50% 50%}
    .dial .bezel{transform:rotate(${spin}deg)}
    .dial .needle{transform:rotate(${turn}deg)}
    .dial .boss{position:absolute;left:${bossOrigin}%;top:${bossOrigin}%;width:${bossPct}%;height:${bossPct}%}
    .rail{position:absolute;left:${layout.beats.x}px;top:${layout.beats.y}px;width:${layout.beats.w}px;height:${layout.beats.h}px}
    .socket{position:absolute}
    .socket img{width:100%;height:100%;object-fit:contain}
    .socket i{position:absolute;left:31%;top:28%;width:38%;height:38%;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #fff6df, #ffb14a 42%, #c56a12 70%, transparent 72%)}
    .socket i.peak{box-shadow:0 0 8px 1px rgba(255,170,60,.8)}
    .socket b{position:absolute;left:0;right:0;bottom:10%;text-align:center;font-size:${Math.max(10, Math.round(disc * 0.22))}px;font-weight:720;color:#f3e6c8;font-variant-numeric:tabular-nums}
    .lamp{position:absolute;left:${layout.beats.x + 12}px;top:${layout.beats.y + (layout.beats.h - lamp) / 2}px;width:${lamp}px;height:${lamp}px}
    .lamp i.lens{position:absolute;inset:18%;border-radius:50%;
      background:radial-gradient(circle at 38% 32%, #d8ffd0, #3dce55 46%, #0c5a24 78%);
      box-shadow:0 0 5px rgba(40,180,70,.55)}
    .loop{position:absolute;left:${layout.beats.x + layout.beats.w - loopW - 8}px;top:${layout.beats.y + (layout.beats.h - 44) / 2}px;width:${loopW}px;height:44px;color:#f4ecdf;filter:drop-shadow(0 4px 3px rgba(0,0,0,.45))}
    .loop.is-on{filter:brightness(1.15) drop-shadow(0 0 4px rgba(198,163,106,.45))}
    .loop img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .loop em{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-style:normal}
    .loop svg{width:16px;height:16px}
    .loop span{font-size:8px;font-weight:750;letter-spacing:.14em}
    .nav-item{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#9a8d7c}
    .nav-item svg{width:${spec.w < 360 ? 15 : 18}px;height:${spec.w < 360 ? 15 : 18}px}
    .nav-item span{font-weight:700;letter-spacing:${spec.w < 360 ? '0.01em' : '0.05em'};line-height:1}
    .nav-item u{position:absolute;bottom:6px;width:42%;height:3px;border-radius:2px;background:#c6a36a;text-decoration:none}
    .nav-item.is-on{color:#f6ead2}
    ${spec.navTray ? `.nav-item.is-on{background:url('${src(ART.nav)}') center/100% 100% no-repeat}` : ''}
  </style></head><body>
    ${recess(furniture.upperDeck)}
    ${recess(furniture.machine)}
    ${recess(furniture.tray, 'navrail')}
    <div class="brand"><img src="${src(ART.wordmark)}" alt="POCKT"></div>
    ${round('tuner', layout.tuner, ICONS.tuner, ART.roundRest, ART.roundDown)}
    ${round('sound', layout.sound, ICONS.sound, ART.roundRest, ART.roundDown)}
    ${round('minus', layout.bpmMinus, ICONS.minus, stepRest, stepDown)}
    <div class="readout"><img src="${src(ART.bpm)}" alt=""><b>${String(spec.bpm).padStart(3, '\u2007')}</b><span>BPM</span></div>
    ${round('plus', layout.bpmPlus, ICONS.plus, stepRest, stepDown)}
    <div class="dial" data-surface="SIMULATED NATIVE SURFACE">
      <img class="fill" src="${src(ART.face)}" alt="">
      <img class="fill bezel" src="${src(ART.bezel)}" alt="">
      <img class="fill" src="${src(ART.scale)}" alt="">
      <img class="fill needle" src="${src(ART.needle)}" alt="">
      <img class="boss" src="${src(ART.boss)}" alt="">
    </div>
    ${spec.beatPanel ? `<div class="rail"><img src="${src(ART.beatPanel)}" alt="" style="width:100%;height:100%;object-fit:fill"></div>` : ''}
    <div class="lamp"><i class="lens"></i></div>
    ${cells}
    <div class="loop ${spec.loop ? 'is-on' : ''}"><img src="${src(spec.loop ? ART.keyDown : ART.keyRest)}" alt=""><em>${ICONS.loop}<span>LOOP</span></em></div>
    ${key('tap', layout.tap, 'TAP', 'tap')}
    ${key('play', layout.play, playing ? ICONS.pause : ICONS.play, 'play')}
    ${key('meter', layout.meter, `<b>${spec.meter || '4/4'}</b><small>♩</small>`, 'meter')}
    ${key('opt', layout.pockt, `<img src="${src(ART.pmark)}" alt="" style="width:62%;height:62%;object-fit:contain">`, 'opt')}
    ${spec.navTray ? `<img src="${src(ART.nav)}" alt="" style="position:absolute;left:${layout.faceRail.x}px;top:${layout.faceRail.y}px;width:${layout.faceRail.w}px;height:${layout.faceRail.h}px;object-fit:fill">` : ''}
    ${nav}
  </body></html>`;
}

function listen() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = path.normalize(path.join(root, url));
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.statusCode = 404;
        res.end('missing');
        return;
      }
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function crop(png, rect, scale, pad = 0) {
  const x = Math.max(0, Math.round((rect.x - pad) * scale));
  const y = Math.max(0, Math.round((rect.y - pad) * scale));
  const w = Math.min(png.width - x, Math.round((rect.w + pad * 2) * scale));
  const h = Math.min(png.height - y, Math.round((rect.h + pad * 2) * scale));
  const next = new PNG({ width: Math.max(1, w), height: Math.max(1, h) });
  PNG.bitblt(png, next, x, y, next.width, next.height, 0, 0);
  return PNG.sync.write(next);
}

async function shot(page, spec, scale, html) {
  await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: 'load' });
  return PNG.sync.read(await page.screenshot({ type: 'png' }));
}

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  ensure(out);
  const server = await listen();
  const port = server.address().port;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--hide-scrollbars', '--disable-gpu', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}`;
  const original = page.setContent.bind(page);
  page.setContent = (html, options) => original(html.replaceAll('src="/', `src="${base}/`).replaceAll("url('/", `url('${base}/`).replaceAll('url("/', `url("${base}/`), options);

  const standard = { w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 }, bpm: 120 };
  const phones = {
    standard,
    tall: { w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 }, bpm: 120 },
    small: { w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 }, bpm: 120 },
    regular: { w: 375, h: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 }, bpm: 120 },
    pro: { w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 }, bpm: 120 },
  };
  const winner = { composition: 'heritage', bezelSpin: true, bpmScale: 0.62, playBronze: true, beatPanel: false, stepShell: 'round', well: false };
  const directions = {
    A1: { ...standard, composition: 'heritage', bezelSpin: false, bpmScale: 0.46, playBronze: true, beatPanel: true, stepShell: 'round' },
    A2: { ...standard, ...winner },
    B1: { ...standard, composition: 'precision', bezelSpin: true, bpmScale: 0.5, playBronze: true, beatPanel: false, stepShell: 'round' },
    B2: { ...standard, composition: 'precision', bezelSpin: true, bpmScale: 0.5, playBronze: false, beatPanel: false, stepShell: 'round' },
    C1: { ...standard, composition: 'evolved', bezelSpin: true, bpmScale: 0.5, playBronze: true, beatPanel: true, stepShell: 'tempo', navTray: true },
    C2: { ...standard, composition: 'evolved', bezelSpin: true, bpmScale: 0.58, playBronze: true, beatPanel: false, stepShell: 'round' },
    V1: { ...standard, composition: 'heritage', bezelSpin: false, bpmScale: 0.58, playBronze: true, beatPanel: false, stepShell: 'round' },
    V2: { ...standard, ...winner, bpmScale: 0.52 },
    V3: { ...standard, ...winner },
  };

  ensure(path.join(out, 'directions'));
  for (const name of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'V1', 'V2', 'V3']) {
    const frame = await shot(page, standard, 1, screen(directions[name]));
    fs.writeFileSync(path.join(out, 'directions', `${name}.png`), PNG.sync.write(frame));
  }

  const boardCss = `*{box-sizing:border-box}body{margin:0;background:#141210;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    .row{display:flex;gap:10px;padding:10px;align-items:flex-start}figure{margin:0;flex:1;min-width:0}
    img{width:100%;height:auto;display:block;background:#000}figcaption{padding:6px 2px 0;font-size:11px;letter-spacing:.08em;font-weight:700}`;
  const cell = (label, rel) => `<figure><img src="${src(rel)}"><figcaption>${label}</figcaption></figure>`;
  const board = async (file, html, w, h) => {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    fs.writeFileSync(file, await page.screenshot({ type: 'png', fullPage: true }));
  };

  await board(path.join(out, 'HISTORICAL_VISUAL_BOARD.png'), `<!doctype html><html><head><style>${boardCss}</style></head><body><div class="row">
    ${cell('535f7d1 BEST OLD LIVE DIAL', 'artifacts/visual-gate-8/02-dial-390.png')}
    ${cell('60ab35d SECOND LIVE DIAL', 'artifacts/device-universal-controls/19-dial-room.png')}
    ${cell('GATE 7', 'artifacts/visual-gate-7/CURRENT_FACE_FOR_GREGG_G7.png')}
    ${cell('NORTH STAR', 'assets/north-star-v4/screen-reference.png')}
  </div></body></html>`, 1400, 920);

  await board(path.join(out, 'G8_DIRECTION_BOARD.png'), `<!doctype html><html><head><style>${boardCss}</style></head><body><div class="row">
    ${cell('A', 'artifacts/visual-gate-8/directions/A2.png')}
    ${cell('B', 'artifacts/visual-gate-8/directions/B2.png')}
    ${cell('C', 'artifacts/visual-gate-8/directions/C2.png')}
  </div></body></html>`, 1200, 900);

  if (process.argv.includes('--directions-only')) {
    await browser.close();
    server.close();
    console.log('directions', out);
    return;
  }

  const dirs = ['FULL', 'LOGICAL', 'DIAL', 'BUTTONS', 'BEATS', 'NAV', 'DETAIL'];
  dirs.forEach((name) => ensure(path.join(out, 'proofs', name)));
  const save = (folder, name, png) => fs.writeFileSync(path.join(out, 'proofs', folder, name), PNG.sync.write(png));
  const face = (phone, extra = {}) => screen({ ...phone, ...winner, ...extra });

  const logical = await shot(page, phones.standard, 1, face(phones.standard));
  const logicalRunning = await shot(page, phones.standard, 1, face(phones.standard, { playing: true, beat: 0 }));
  save('LOGICAL', '390-logical.png', logical);
  save('LOGICAL', '393-logical.png', await shot(page, phones.tall, 1, face(phones.tall)));
  save('LOGICAL', '375-logical.png', await shot(page, phones.regular, 1, face(phones.regular)));
  save('LOGICAL', '320-logical.png', await shot(page, phones.small, 1, face(phones.small)));
  save('LOGICAL', '430-logical.png', await shot(page, phones.pro, 1, face(phones.pro)));
  fs.writeFileSync(path.join(out, 'CURRENT_FACE_FOR_GREGG_G8.png'), PNG.sync.write(logical));
  fs.writeFileSync(path.join(out, 'CURRENT_RUNNING_FOR_GREGG_G8.png'), PNG.sync.write(logicalRunning));

  const rest = await shot(page, phones.standard, 2, face(phones.standard));
  const running = await shot(page, phones.standard, 2, face(phones.standard, { playing: true, beat: 0 }));
  save('FULL', '390-rest.png', rest);
  save('FULL', '390-running.png', running);
  save('FULL', '320-rest.png', await shot(page, phones.small, 2, face(phones.small)));
  save('FULL', '375-rest.png', await shot(page, phones.regular, 2, face(phones.regular)));
  save('FULL', '393-rest.png', await shot(page, phones.tall, 2, face(phones.tall)));
  save('FULL', '430-rest.png', await shot(page, phones.pro, 2, face(phones.pro)));

  const L = computeFoundationLayout(390, 844, phones.standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
  for (const bpm of [60, 120, 240, 400]) {
    const frame = bpm === 120 ? rest : await shot(page, phones.standard, 2, face(phones.standard, { bpm }));
    fs.writeFileSync(path.join(out, 'proofs', 'DIAL', `${bpm}.png`), crop(frame, L.dial, 2));
  }
  const playDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'play' }));
  const tapDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'tap' }));
  const minusDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'minus' }));
  const plusDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'plus' }));
  const tunerDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'tuner' }));
  const soundDown = await shot(page, phones.standard, 2, face(phones.standard, { down: 'sound' }));
  const loopOn = await shot(page, phones.standard, 2, face(phones.standard, { loop: true }));
  const peaked = await shot(page, phones.standard, 2, face(phones.standard, { peak: 0 }));
  const navPulse = await shot(page, phones.standard, 2, face(phones.standard, { nav: 'pulse' }));
  const buttons = [
    ['play-rest', rest, L.play],
    ['play-down', playDown, L.play],
    ['play-running', running, L.play],
    ['tap-rest', rest, L.tap],
    ['tap-down', tapDown, L.tap],
    ['minus-rest', rest, L.bpmMinus],
    ['minus-down', minusDown, L.bpmMinus],
    ['plus-rest', rest, L.bpmPlus],
    ['plus-down', plusDown, L.bpmPlus],
    ['tuner-rest', rest, L.tuner],
    ['tuner-down', tunerDown, L.tuner],
    ['sound-rest', rest, L.sound],
    ['sound-down', soundDown, L.sound],
  ];
  for (const [name, frame, rect] of buttons) {
    fs.writeFileSync(path.join(out, 'proofs', 'BUTTONS', `${name}.png`), crop(frame, rect, 2, 8));
  }
  fs.writeFileSync(path.join(out, 'proofs', 'BEATS', 'beat-strong-rest.png'), crop(rest, { x: L.beats.x + 40, y: L.beats.y, w: 70, h: L.beats.h }, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'BEATS', 'beat-strong-peak.png'), crop(peaked, { x: L.beats.x + 40, y: L.beats.y, w: 70, h: L.beats.h }, 2));
  const loopRect = { x: L.beats.x + L.beats.w - 90, y: L.beats.y, w: 90, h: L.beats.h };
  fs.writeFileSync(path.join(out, 'proofs', 'BUTTONS', 'loop-off.png'), crop(rest, loopRect, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'BUTTONS', 'loop-on.png'), crop(loopOn, loopRect, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'NAV', 'nav-rest.png'), crop(navPulse, { x: L.faceRail.x + L.faceRail.w / 6, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'NAV', 'nav-selected.png'), crop(rest, { x: L.faceRail.x, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  const headerH = Math.max(L.tuner.y + L.tuner.h, L.identity.y + L.identity.h) - phones.standard.insets.top + 6;
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'header-detail.png'), crop(rest, { x: 0, y: phones.standard.insets.top, w: 390, h: headerH }, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'tempo-detail.png'), crop(rest, { x: 0, y: Math.min(L.bpmMinus.y, L.bpmHit.y) - 8, w: 390, h: Math.max(L.bpmMinus.h, L.bpmHit.h) + 20 }, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'dial-detail.png'), crop(rest, L.dial, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'beat-detail.png'), crop(rest, L.beats, 2, 4));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'transport-detail.png'), crop(rest, L.transport, 2, 8));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'nav-detail.png'), crop(rest, L.faceRail, 2, 6));

  await board(path.join(out, 'G7_TO_G8.png'), `<!doctype html><html><head><style>${boardCss}</style></head><body><div class="row">
    ${cell('GATE 7', 'artifacts/visual-gate-7/CURRENT_FACE_FOR_GREGG_G7.png')}
    ${cell('GATE 8', 'artifacts/visual-gate-8/CURRENT_FACE_FOR_GREGG_G8.png')}
  </div></body></html>`, 860, 980);
  const detail = 'artifacts/visual-gate-8/proofs/DETAIL';
  await board(path.join(out, 'G8_DETAIL_BOARD.png'), `<!doctype html><html><head><style>${boardCss} .row{flex-wrap:wrap}figure{flex:1 1 30%;background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('HEADER', detail + '/header-detail.png')}
    ${cell('TEMPO', detail + '/tempo-detail.png')}
    ${cell('DIAL', detail + '/dial-detail.png')}
    ${cell('BEATS', detail + '/beat-detail.png')}
    ${cell('TRANSPORT', detail + '/transport-detail.png')}
    ${cell('NAV', detail + '/nav-detail.png')}
  </div></body></html>`, 1400, 1100);
  const states = 'artifacts/visual-gate-8/proofs';
  await board(path.join(out, 'G8_INTERACTION_BOARD.png'), `<!doctype html><html><head><style>${boardCss} .row{flex-wrap:wrap}figure{flex:1 1 18%;background:#0c0b0a;padding:6px}</style></head><body><div class="row">
    ${cell('DIAL 60', states + '/DIAL/60.png')}
    ${cell('DIAL 120', states + '/DIAL/120.png')}
    ${cell('DIAL 240', states + '/DIAL/240.png')}
    ${cell('DIAL 400', states + '/DIAL/400.png')}
    ${cell('TUNER REST', states + '/BUTTONS/tuner-rest.png')}
    ${cell('TUNER DOWN', states + '/BUTTONS/tuner-down.png')}
    ${cell('SOUND REST', states + '/BUTTONS/sound-rest.png')}
    ${cell('SOUND DOWN', states + '/BUTTONS/sound-down.png')}
    ${cell('MINUS REST', states + '/BUTTONS/minus-rest.png')}
    ${cell('MINUS DOWN', states + '/BUTTONS/minus-down.png')}
    ${cell('PLUS REST', states + '/BUTTONS/plus-rest.png')}
    ${cell('PLUS DOWN', states + '/BUTTONS/plus-down.png')}
    ${cell('TAP REST', states + '/BUTTONS/tap-rest.png')}
    ${cell('TAP DOWN', states + '/BUTTONS/tap-down.png')}
    ${cell('PLAY REST', states + '/BUTTONS/play-rest.png')}
    ${cell('PLAY DOWN', states + '/BUTTONS/play-down.png')}
    ${cell('PLAY RUNNING', states + '/BUTTONS/play-running.png')}
    ${cell('BEAT REST', states + '/BEATS/beat-strong-rest.png')}
    ${cell('BEAT PEAK', states + '/BEATS/beat-strong-peak.png')}
    ${cell('LOOP OFF', states + '/BUTTONS/loop-off.png')}
    ${cell('LOOP ON', states + '/BUTTONS/loop-on.png')}
    ${cell('NAV OFF', states + '/NAV/nav-rest.png')}
    ${cell('NAV ON', states + '/NAV/nav-selected.png')}
  </div></body></html>`, 1680, 1500);

  fs.writeFileSync(path.join(out, 'proofs', 'SURFACE.txt'), 'SIMULATED NATIVE SURFACE\nWindows cannot render UIKit. These frames use production layout (computeFoundationLayout, composition heritage), production angle map (dialAngleDeg), and the dial-clean assets the native module bundles. Bezel rotation matches PocktDialControl.applyNeedle.\n');
  await browser.close();
  server.close();
  console.log('visual gate 8', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
