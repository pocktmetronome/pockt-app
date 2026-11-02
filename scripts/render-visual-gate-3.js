'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { angleFromNorthStarBpm } = require('../lib/native-interaction-math.ts');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'visual-gate-3');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ART = {
  wordmark: 'assets/north-star-v3/pockt_wordmark_northstar.png',
  pmark: 'assets/north-star-v3/pockt_p_mark_transparent.png',
  chassis: 'assets/north-star-v3/chassis_texture_512.png',
  roundRest: 'assets/north-star-v3/header_round_shell_rest.png',
  roundDown: 'assets/north-star-v3/header_round_shell_pressed.png',
  bpm: 'assets/north-star-v3/bpm_well_blank.png',
  body: 'assets/north-star-v4/parts/dial-body-empty.png',
  scale: 'assets/north-star-v4/parts/dial-scale-clean.png',
  needle: 'assets/north-star-v4/parts/needle.png',
  boss: 'assets/north-star-v4/parts/boss.png',
  playRest: 'assets/north-star-v3/transport_primary_shell_rest.png',
  playDown: 'assets/north-star-v3/transport_primary_shell_pressed.png',
  keyRest: 'assets/north-star-v3/transport_dark_shell_rest.png',
  keyDown: 'assets/north-star-v3/transport_dark_shell_pressed.png',
  beatPanel: 'assets/north-star-v3/beat_panel.png',
  beatShell: 'assets/north-star-v3/beat_button_shell.png',
  loopRest: 'assets/north-star-v3/loop_key_shell_rest.png',
  nav: 'assets/north-star-v3/nav_tray.png',
  lamp: 'assets/north-star-v3/lamp_green.png',
  plate: 'assets/dial-hardware/dial-plate.png',
  hub: 'assets/dial-hardware/hub.png',
  logo: 'assets/branding/pockt-logo.png',
};

const ICONS = {
  tuner: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M35 18v31c0 10 7 18 15 18s15-8 15-18V18"/><path d="M50 67v17"/></svg>',
  sound: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 58h16l18 15V27L36 42H20z"/><path d="M66 39c6 6 6 16 0 22"/><path d="M76 30c12 12 12 28 0 40"/></svg>',
  minus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M24 50h52"/></svg>',
  plus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 24v52M24 50h52"/></svg>',
  play: '<svg viewBox="0 0 100 100"><path d="M34 24L78 50 34 76Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 100 100"><rect x="30" y="24" width="14" height="52" rx="2" fill="currentColor"/><rect x="56" y="24" width="14" height="52" rx="2" fill="currentColor"/></svg>',
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

function navSize(slot) {
  let size = 10.5;
  while (size > 7 && textWidth('PENDULUM', size) > slot - 6) size -= 0.25;
  return size;
}

function screenA(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const turn = (angleFromNorthStarBpm(spec.bpm) * 180) / Math.PI;
  const slot = layout.faceRail.w / 6;
  const font = navSize(slot);
  if (textWidth('PENDULUM', font) > slot - 4) throw new Error(`PENDULUM overflow ${spec.w}`);
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const loopW = Math.min(78, Math.max(58, layout.beats.h * 0.62));
  const lamp = Math.min(34, layout.beats.h * 0.42);
  const innerX = layout.beats.x + lamp + 18;
  const innerW = layout.beats.w - lamp - loopW - 36;
  const col = innerW / 4;
  const disc = Math.min(col * 0.94, layout.beats.h * 0.78);
  const playing = Boolean(spec.playing);
  const down = spec.down || '';
  const cells = accents.map((level, index) => {
    const hot = spec.peak === index || (playing && spec.beat === index);
    const x = innerX + col * index + (col - disc) / 2;
    const y = layout.beats.y + (layout.beats.h - disc) * 0.42;
    const glow = level === 'mute' ? 0.08 : level === 'soft' ? 0.28 : level === 'strong' ? 0.62 : 0.42;
    return `<div class="socket" style="left:${x}px;top:${y}px;width:${disc}px;height:${disc}px">
      <img src="${src(ART.beatShell)}" alt="">
      <i class="${hot ? 'peak' : ''}" style="opacity:${hot ? 1 : glow}"></i>
      <b>${index + 1}</b>
    </div>`;
  }).join('');
  const nav = [
    ['dial', 'DIAL'], ['rhythm', 'RHYTHM'], ['pulse', 'PULSE'], ['pendulum', 'PENDULUM'], ['pro', 'PRO'], ['beatline', 'BEATLINE'],
  ].map(([id, label], index) => {
    const on = (spec.nav || 'dial') === id;
    return `<div class="nav-item${on ? ' is-on' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px">
      ${ICONS[id]}<span style="font-size:${font}px">${label}</span></div>`;
  }).join('');
  const round = (name, box, icon, opts = {}) => {
    const pressed = down === name;
    return `<div class="key ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(pressed ? ART.roundDown : ART.roundRest)}" alt="">
      <em>${icon}</em></div>`;
  };
  const key = (name, box, inner, kind) => {
    const pressed = down === name;
    const art = kind === 'play' ? (pressed ? ART.playDown : ART.playRest) : (pressed ? ART.keyDown : ART.keyRest);
    return `<div class="key ${kind} ${pressed ? 'is-down' : ''} ${spec.playing && name === 'play' ? 'is-on' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(art)}" alt=""><em>${inner}</em></div>`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}
    html,body{margin:0;background:#100e0c}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;color:#f6f1e8;
      font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;
      background:#100e0c url('${src(ART.chassis)}') center/420px;
      box-shadow:inset 0 0 80px rgba(0,0,0,.45), inset 0 40px 80px rgba(90,60,20,.08)}
    img{display:block}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y + 6}px;width:${layout.identity.w}px;height:${layout.identity.h - 8}px;
      display:flex;align-items:center;justify-content:center}
    .brand img{height:78%;width:auto;max-width:92%;object-fit:contain}
    .key{position:absolute}
    .key img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .key em{position:absolute;inset:22%;display:flex;align-items:center;justify-content:center;font-style:normal}
    .key em svg{width:62%;height:62%}
    .key.is-down{transform:translateY(2px)}
    .key.is-down em{filter:brightness(.8)}
    .play em{color:#2a1c0c}
    .play em svg{width:46%;height:46%}
    .dark em,.key:not(.play) em{color:#f4ecdf}
    .tap em{font-weight:750;letter-spacing:.14em;font-size:${Math.max(13, Math.round(layout.play.h * 0.28))}px}
    .meter em{flex-direction:column;gap:0;font-weight:720;letter-spacing:.04em;font-size:${Math.max(13, Math.round(layout.play.h * 0.26))}px;line-height:1}
    .meter small{color:#e7c27a;font-size:12px}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px}
    .readout img{width:100%;height:100%;object-fit:fill}
    .readout b{position:absolute;left:0;right:0;top:46%;transform:translateY(-58%);text-align:center;
      font-family:"Segoe UI",Arial,sans-serif;font-weight:760;font-variant-numeric:tabular-nums;letter-spacing:.04em;
      font-size:${Math.round(layout.bpmHit.h * 0.5)}px;color:#f7f3ea;text-shadow:0 1px 0 rgba(0,0,0,.65)}
    .readout span{position:absolute;left:0;right:0;bottom:16%;text-align:center;font-size:8px;letter-spacing:.42em;font-weight:700;color:#d7b57a}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px;filter:drop-shadow(0 16px 14px rgba(0,0,0,.55))}
    .dial .fill{position:absolute;inset:0;width:100%;height:100%}
    .dial .needle{transform-origin:50% 50%;transform:rotate(${turn}deg)}
    .dial .boss{position:absolute;left:39%;top:39%;width:22%;height:22%}
    .rail{position:absolute;left:${layout.beats.x}px;top:${layout.beats.y}px;width:${layout.beats.w}px;height:${layout.beats.h}px}
    .rail > img{width:100%;height:100%;object-fit:fill}
    .socket{position:absolute}
    .socket img{width:100%;height:100%;object-fit:contain}
    .socket i{position:absolute;left:30%;top:30%;width:40%;height:40%;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #fff6df, #ffb14a 42%, #c56a12 70%, transparent 72%);
      box-shadow:0 0 6px rgba(255,160,40,.35)}
    .socket i.peak{box-shadow:0 0 10px 2px rgba(255,170,60,.85)}
    .socket b{position:absolute;left:0;right:0;bottom:8%;text-align:center;font-size:${Math.max(10, Math.round(disc * 0.22))}px;font-weight:720;color:#f3e6c8;font-variant-numeric:tabular-nums}
    .lamp{position:absolute;left:${layout.beats.x + 10}px;top:${layout.beats.y + (layout.beats.h - lamp) / 2}px;width:${lamp}px;height:${lamp}px}
    .lamp img{width:100%;height:100%;object-fit:contain}
    .loop{position:absolute;left:${layout.beats.x + layout.beats.w - loopW - 8}px;top:${layout.beats.y + (layout.beats.h - 46) / 2}px;width:${loopW}px;height:46px;color:#f4ecdf}
    .loop img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .loop em{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-style:normal}
    .loop svg{width:16px;height:16px}
    .loop span{font-size:8px;font-weight:750;letter-spacing:.14em}
    .navtray{position:absolute;left:${layout.faceRail.x}px;top:${layout.faceRail.y}px;width:${layout.faceRail.w}px;height:${layout.faceRail.h}px}
    .navtray img{width:100%;height:100%;object-fit:fill}
    .nav-item{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#c8bba8}
    .nav-item svg{width:18px;height:18px}
    .nav-item span{font-weight:720;letter-spacing:.06em;line-height:1}
    .nav-item.is-on{color:#f8edd4}
    .nav-item.is-on svg{filter:drop-shadow(0 0 3px rgba(231,198,130,.7))}
    .nav-item.is-on::after{content:"";position:absolute;left:22%;right:22%;bottom:5px;height:2px;border-radius:2px;background:#e2b56a}
  </style></head><body>
    <div class="brand"><img src="${src(ART.wordmark)}" alt="POCKT"></div>
    ${round('tuner', layout.tuner, ICONS.tuner)}
    ${round('sound', layout.sound, ICONS.sound)}
    ${round('minus', layout.bpmMinus, ICONS.minus)}
    <div class="readout"><img src="${src(ART.bpm)}" alt=""><b>${String(spec.bpm).padStart(3, '\u2007')}</b><span>BPM</span></div>
    ${round('plus', layout.bpmPlus, ICONS.plus)}
    <div class="dial">
      <img class="fill" src="${src(ART.body)}" alt="">
      <img class="fill" src="${src(ART.scale)}" alt="">
      <img class="fill needle" src="${src(ART.needle)}" alt="">
      <img class="boss" src="${src(ART.boss)}" alt="">
    </div>
    <div class="rail"><img src="${src(ART.beatPanel)}" alt=""></div>
    <div class="lamp"><img src="${src(ART.lamp)}" alt=""></div>
    ${cells}
    <div class="loop"><img src="${src(ART.loopRest)}" alt=""><em>${ICONS.loop}<span>LOOP</span></em></div>
    ${key('tap', layout.tap, 'TAP', 'tap')}
    ${key('play', layout.play, playing ? ICONS.pause : ICONS.play, 'play')}
    ${key('meter', layout.meter, `<b>${spec.meter || '4/4'}</b><small>♩</small>`, 'meter')}
    ${key('opt', layout.pockt, `<img src="${src(ART.pmark)}" alt="" style="width:70%;height:70%;object-fit:contain">`, 'opt')}
    <div class="navtray"><img src="${src(ART.nav)}" alt=""></div>
    ${nav}
  </body></html>`;
}

function screenB(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const turn = (angleFromNorthStarBpm(spec.bpm) * 180) / Math.PI;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0;background:#12100e;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    body{width:${spec.w}px;height:${spec.h}px;position:relative}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;
      display:flex;align-items:center;justify-content:center;font-weight:760;letter-spacing:.42em;font-size:18px;
      background:linear-gradient(#f6edd8,#b8894a);-webkit-background-clip:text;background-clip:text;color:transparent}
    .dot{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a342c,#100e0c);box-shadow:0 0 0 2px #8a6840, inset 0 1px 0 rgba(255,255,255,.3), 0 4px 6px rgba(0,0,0,.5);color:#f6efe2;display:flex;align-items:center;justify-content:center;font-weight:700}
    .well{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px;border-radius:8px;
      background:linear-gradient(#1a1814,#070605);box-shadow:inset 0 4px 10px #000, 0 0 0 1px #a68450;display:flex;flex-direction:column;align-items:center;justify-content:center}
    .well b{font-size:${Math.round(layout.bpmHit.h * 0.48)}px;font-variant-numeric:tabular-nums;font-weight:760}
    .well span{font-size:8px;letter-spacing:.4em;color:#d7b57a}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px;border-radius:50%;
      background:repeating-conic-gradient(from 0deg,#e7c98a 0 .4deg,#5c4320 .4deg 1.2deg,#1a140c 1.2deg 2.2deg);
      box-shadow:0 12px 16px rgba(0,0,0,.5)}
    .face{position:absolute;inset:11%;border-radius:50%;background:radial-gradient(circle at 50% 42%,#2a261f,#0c0b0a 70%);
      box-shadow:inset 0 0 0 3px #c6a36a, inset 0 0 0 6px #2a2116}
    .needle{position:absolute;left:50%;top:16%;width:10px;height:34%;margin-left:-5px;transform-origin:50% 100%;transform:rotate(${turn}deg);
      background:linear-gradient(90deg,#5c4018,#fff1cf 46%,#c4924a 70%,#3d2a10);clip-path:polygon(42% 0,58% 0,80% 88%,50% 100%,20% 88%)}
    .boss{position:absolute;left:40%;top:40%;width:20%;height:20%;border-radius:50%;background:#1a140c;box-shadow:0 0 0 4px #c6a36a, inset 0 0 0 6px #3a2c18}
    .boss i{position:absolute;inset:28%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f0d7a4,#8a6230)}
  </style></head><body>
    <div class="brand">POCKT</div>
    <div class="dot" style="left:${layout.tuner.x}px;top:${layout.tuner.y}px;width:${layout.tuner.w}px;height:${layout.tuner.h}px">${ICONS.tuner}</div>
    <div class="dot" style="left:${layout.sound.x}px;top:${layout.sound.y}px;width:${layout.sound.w}px;height:${layout.sound.h}px">${ICONS.sound}</div>
    <div class="dot" style="left:${layout.bpmMinus.x}px;top:${layout.bpmMinus.y}px;width:${layout.bpmMinus.w}px;height:${layout.bpmMinus.h}px">${ICONS.minus}</div>
    <div class="well"><b>${spec.bpm}</b><span>BPM</span></div>
    <div class="dot" style="left:${layout.bpmPlus.x}px;top:${layout.bpmPlus.y}px;width:${layout.bpmPlus.w}px;height:${layout.bpmPlus.h}px">${ICONS.plus}</div>
    <div class="dial"><div class="face"><div class="needle"></div><div class="boss"><i></i></div></div></div>
  </body></html>`;
}

function screenC(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const turn = (angleFromNorthStarBpm(spec.bpm) * 180) / Math.PI;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0;background:#0c0b0a;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    body{width:${spec.w}px;height:${spec.h}px;position:relative}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;display:flex;align-items:center;justify-content:center}
    .brand img{height:86%;object-fit:contain}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px}
    .dial img.fill{position:absolute;inset:0;width:100%;height:100%}
    .needle{position:absolute;left:50%;top:18%;width:8px;height:32%;margin-left:-4px;transform-origin:50% 100%;transform:rotate(${turn}deg);
      background:linear-gradient(90deg,#6a4a1c,#ffe7b0,#a87838);clip-path:polygon(40% 0,60% 0,78% 90%,50% 100%,22% 90%)}
    .hub{position:absolute;left:42%;top:42%;width:16%;height:16%;object-fit:contain}
  </style></head><body>
    <div class="brand"><img src="${src(ART.logo)}" alt=""></div>
    <div class="dial"><img class="fill" src="${src(ART.plate)}" alt=""><div class="needle"></div><img class="hub" src="${src(ART.hub)}" alt=""></div>
  </body></html>`;
}

function listen() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/health') {
        res.end('ok');
        return;
      }
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
  ensure(path.join(out, 'directions'));
  for (const [name, html] of [
    ['A', screenA(standard)],
    ['B', screenB(standard)],
    ['C', screenC(standard)],
  ]) {
    const frame = await shot(page, standard, 1, html);
    fs.writeFileSync(path.join(out, 'directions', `${name}.png`), PNG.sync.write(frame));
  }
  if (process.argv.includes('--directions-only')) {
    await browser.close();
    server.close();
    console.log('directions', path.join(out, 'directions'));
    return;
  }

  const phones = {
    standard,
    tall: { w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 }, bpm: 120 },
    small: { w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 }, bpm: 120 },
    pro: { w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 }, bpm: 120 },
  };
  const dirs = ['FULL', 'LOGICAL', 'DIAL', 'BUTTONS', 'BEATS', 'NAV', 'DETAIL'];
  dirs.forEach((name) => ensure(path.join(out, 'proofs', name)));
  const save = (folder, name, png) => fs.writeFileSync(path.join(out, 'proofs', folder, name), PNG.sync.write(png));

  const logical = await shot(page, phones.standard, 1, screenA(phones.standard));
  save('LOGICAL', '390-logical.png', logical);
  save('LOGICAL', '393-logical.png', await shot(page, phones.tall, 1, screenA(phones.tall)));
  save('LOGICAL', 'small-logical.png', await shot(page, phones.small, 1, screenA(phones.small)));

  const rest = await shot(page, phones.standard, 2, screenA(phones.standard));
  const running = await shot(page, phones.standard, 2, screenA({ ...phones.standard, playing: true, beat: 0 }));
  save('FULL', '390-rest.png', rest);
  save('FULL', '390-running.png', running);
  save('FULL', '393-rest.png', await shot(page, phones.tall, 2, screenA(phones.tall)));
  save('FULL', '393-running.png', await shot(page, phones.tall, 2, screenA({ ...phones.tall, playing: true, beat: 0 })));
  save('FULL', 'small-rest.png', await shot(page, phones.small, 2, screenA(phones.small)));
  save('FULL', 'pro-max-rest.png', await shot(page, phones.pro, 2, screenA(phones.pro)));

  const L = computeFoundationLayout(390, 844, phones.standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  for (const bpm of [20, 60, 120, 160, 240, 320, 400]) {
    const frame = bpm === 120 ? rest : await shot(page, phones.standard, 2, screenA({ ...phones.standard, bpm }));
    fs.writeFileSync(path.join(out, 'proofs', 'DIAL', `${bpm}.png`), crop(frame, L.dial, 2));
  }
  fs.writeFileSync(path.join(out, 'proofs', 'DIAL', 'dial-detail-390.png'), crop(rest, L.dial, 2));
  const playDown = await shot(page, phones.standard, 2, screenA({ ...phones.standard, down: 'play' }));
  const tapDown = await shot(page, phones.standard, 2, screenA({ ...phones.standard, down: 'tap' }));
  const minusDown = await shot(page, phones.standard, 2, screenA({ ...phones.standard, down: 'minus' }));
  const plusDown = await shot(page, phones.standard, 2, screenA({ ...phones.standard, down: 'plus' }));
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
  ];
  for (const [name, frame, rect] of buttons) {
    fs.writeFileSync(path.join(out, 'proofs', 'BUTTONS', `${name}.png`), crop(frame, rect, 2, 6));
  }
  fs.writeFileSync(path.join(out, 'proofs', 'BEATS', 'beat-rail-rest.png'), crop(rest, L.beats, 2, 4));
  for (const [level, index] of [['soft', 0], ['normal', 1], ['strong', 2]]) {
    const peaked = await shot(page, phones.standard, 2, screenA({ ...phones.standard, accents: ['soft', 'normal', 'strong', 'normal'], peak: index }));
    const rect = { x: L.beats.x + (L.beats.w / 4) * index, y: L.beats.y, w: L.beats.w / 4, h: L.beats.h };
    fs.writeFileSync(path.join(out, 'proofs', 'BEATS', `beat-${level}-peak.png`), crop(peaked, rect, 2));
  }
  const navPulse = await shot(page, phones.standard, 2, screenA({ ...phones.standard, nav: 'pulse' }));
  fs.writeFileSync(path.join(out, 'proofs', 'NAV', 'nav-rest.png'), crop(navPulse, { x: L.faceRail.x + L.faceRail.w / 6, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'NAV', 'nav-selected.png'), crop(rest, { x: L.faceRail.x, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'header-detail.png'), crop(rest, { x: 0, y: phones.standard.insets.top, w: 390, h: Math.max(L.tuner.h, L.identity.h) + 8 }, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'tempo-detail.png'), crop(rest, { x: 0, y: L.bpmMinus.y - 8, w: 390, h: Math.max(L.bpmMinus.h, L.bpmHit.h) + 16 }, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'dial-detail.png'), crop(rest, L.dial, 2));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'beat-detail.png'), crop(rest, L.beats, 2, 4));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'transport-detail.png'), crop(rest, L.transport, 2, 8));
  fs.writeFileSync(path.join(out, 'proofs', 'DETAIL', 'nav-detail.png'), crop(rest, L.faceRail, 2, 4));

  const board = async (file, html, w, h) => {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    fs.writeFileSync(file, await page.screenshot({ type: 'png', fullPage: true }));
  };
  const cell = (label, rel) => `<figure><img src="${src(rel)}"><figcaption>${label}</figcaption></figure>`;
  const boardCss = `*{box-sizing:border-box}body{margin:0;background:#1a1814;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    .row{display:flex;gap:12px;padding:12px}figure{margin:0;flex:1}img{width:100%;height:auto;display:block;background:#000}
    figcaption{padding:8px 0;font-size:13px;letter-spacing:.08em;font-weight:700}`;
  await board(path.join(out, 'FINAL_REVIEW_BOARD.png'), `<!doctype html><html><head><style>${boardCss}</style></head><body><div class="row">
    ${cell('NORTH STAR', 'assets/north-star-v4/screen-reference.png')}
    ${cell('HISTORICAL DIAL HARDWARE', 'assets/dial-hardware/dial-plate.png')}
    ${cell('VISUAL GATE 2', 'artifacts/visual-gate-2/proofs/FULL/standard-rest.png')}
    ${cell('VISUAL GATE 3', 'artifacts/visual-gate-3/proofs/LOGICAL/390-logical.png')}
  </div></body></html>`, 1680, 980);
  await board(path.join(out, 'FINAL_DETAIL_BOARD.png'), `<!doctype html><html><head><style>${boardCss} .row{flex-wrap:wrap}figure{flex:1 1 30%;background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('HEADER', 'artifacts/visual-gate-3/proofs/DETAIL/header-detail.png')}
    ${cell('TEMPO', 'artifacts/visual-gate-3/proofs/DETAIL/tempo-detail.png')}
    ${cell('DIAL', 'artifacts/visual-gate-3/proofs/DETAIL/dial-detail.png')}
    ${cell('BEATS', 'artifacts/visual-gate-3/proofs/DETAIL/beat-detail.png')}
    ${cell('TRANSPORT', 'artifacts/visual-gate-3/proofs/DETAIL/transport-detail.png')}
    ${cell('NAV', 'artifacts/visual-gate-3/proofs/DETAIL/nav-detail.png')}
  </div></body></html>`, 1400, 1100);
  await board(path.join(out, 'history-contact-sheet.png'), `<!doctype html><html><head><style>${boardCss}</style></head><body><div class="row">
    ${cell('NORTH STAR REFERENCE', 'assets/north-star-v4/screen-reference.png')}
    ${cell('DIAL BODY ASSET', 'assets/north-star-v4/parts/dial-body-empty.png')}
    ${cell('HERITAGE PLATE', 'assets/dial-hardware/dial-plate.png')}
    ${cell('GATE 2', 'artifacts/visual-gate-2/proofs/FULL/standard-rest.png')}
  </div></body></html>`, 1600, 920);

  await browser.close();
  server.close();
  console.log('visual gate 3', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
