'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout, faceplateApertures, FACEPLATE_FRAMES } = require('../lib/compute-foundation-layout.ts');
const { BOSS_SCALE, dialAngleDeg } = require('../lib/dial-scale-geometry.js');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'visual-gate-11');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ART = {
  wordmark: 'assets/north-star-v3/pockt_wordmark_northstar.png',
  pmark: 'assets/north-star-v3/pockt_p_mark_transparent.png',
  utility: 'assets/dial-clean/shell-utility.png',
  utilityDown: 'assets/dial-clean/shell-utility-down.png',
  secondary: 'assets/dial-clean/shell-secondary.png',
  secondaryDown: 'assets/dial-clean/shell-secondary-down.png',
  primary: 'assets/dial-clean/shell-primary.png',
  primaryDown: 'assets/dial-clean/shell-primary-down.png',
  lens: 'assets/dial-clean/lens.png',
  bezel: 'assets/dial-clean/dial-bezel-clean.png',
  face: 'assets/dial-clean/dial-face-neutral.png',
  scale: 'assets/dial-clean/dial-scale-generated.png',
  needle: 'assets/dial-clean/dial-needle.png',
  boss: 'assets/dial-clean/dial-boss.png',
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

function arcPath(endDeg) {
  const r = 162;
  const start = -135;
  const sweep = endDeg - start;
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [228 + Math.sin(rad) * r, 228 - Math.cos(rad) * r];
  };
  const a = point(start);
  const b = point(endDeg);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} A ${r} ${r} 0 ${large} ${sweep >= 0 ? 1 : 0} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

function navSize(slot, width) {
  const pad = width < 360 ? 10 : 6;
  let size = width < 360 ? 9 : 11;
  while (size > 7.5 && textWidth('PENDULUM', size) > slot - pad) size -= 0.25;
  return size;
}

function restOpacity(level) {
  if (level === 'mute') return 0.08;
  if (level === 'soft') return 0.22;
  if (level === 'strong') return 0.62;
  return 0.38;
}

function screen(spec) {
  const frame = FACEPLATE_FRAMES[`${spec.w}x${spec.h}`];
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const apertures = faceplateApertures(layout, 4);
  const turn = dialAngleDeg(spec.bpm);
  const bossPct = (BOSS_SCALE * 100).toFixed(2);
  const bossOrigin = ((1 - BOSS_SCALE) * 50).toFixed(2);
  const slot = layout.faceRail.w / 6;
  const font = navSize(slot, spec.w);
  if (textWidth('PENDULUM', font) > slot - 2) throw new Error(`PENDULUM overflow ${spec.w}`);
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const playing = Boolean(spec.playing);
  const down = spec.down || '';
  const plate = `assets/faceplate/faceplate-${spec.w}x${spec.h}.png`;
  const cells = apertures.sockets.map((socket, index) => {
    const level = accents[index] || 'normal';
    const hot = spec.peak === index || (playing && spec.beat === index);
    const lens = { x: socket.x + socket.w * 0.2, y: socket.y + socket.h * 0.2, w: socket.w * 0.6, h: socket.h * 0.6 };
    const opacity = hot && level !== 'mute' ? 1 : restOpacity(level);
    return `<div class="lens" style="left:${lens.x}px;top:${lens.y}px;width:${lens.w}px;height:${lens.h}px">
      <img src="${src(ART.lens)}" alt="">
      <i style="opacity:${opacity}"></i>
      <b>${index + 1}</b>
    </div>`;
  }).join('');
  const nav = [
    ['dial', 'DIAL'], ['rhythm', 'RHYTHM'], ['pulse', 'PULSE'], ['pendulum', 'PENDULUM'], ['pro', 'PRO'], ['beatline', 'BEATLINE'],
  ].map(([id, label], index) => {
    const on = (spec.nav || 'dial') === id;
    return `<div class="nav-item${on ? ' is-on' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px">${ICONS[id]}<span style="font-size:${font}px">${label}</span>${on ? '<u></u>' : ''}</div>`;
  }).join('');
  const round = (name, box, icon) => {
    const pressed = down === name;
    return `<div class="key ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img src="${src(pressed ? ART.utilityDown : ART.utility)}" alt=""><em>${icon}</em></div>`;
  };
  const key = (name, box, inner, kind) => {
    const pressed = down === name;
    const art = kind === 'play' ? (pressed ? ART.primaryDown : ART.primary) : (pressed ? ART.secondaryDown : ART.secondary);
    return `<div class="key ${kind} ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img src="${src(art)}" alt=""><em>${inner}</em></div>`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;position:relative;color:#f4f0e8;font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;
      background:#0c0b0a url('${src(plate)}') 0 0 / ${spec.w}px ${spec.h}px no-repeat}
    img{display:block}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y + 8}px;width:${layout.identity.w}px;height:${Math.max(16, layout.identity.h * 0.34)}px;display:flex;align-items:center;justify-content:center}
    .brand img{height:100%;width:auto;max-width:88%;object-fit:contain}
    .key{position:absolute}
    .key img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .key em{position:absolute;inset:16%;display:flex;align-items:center;justify-content:center;font-style:normal;color:#f3eee6}
    .key em svg{width:54%;height:54%}
    .key.is-down{transform:translateY(5px);filter:brightness(.58)}
    .play em{color:#1c140c;inset:8%}
    .play em svg{width:42%;height:42%}
    .tap em{font-weight:740;letter-spacing:.18em;font-size:${Math.max(13, Math.round(layout.play.h * 0.2))}px}
    .meter em{flex-direction:column;gap:2px;font-weight:700;font-size:${Math.max(13, Math.round(layout.play.h * 0.18))}px;line-height:1}
    .meter small{color:#c4a574;font-size:9px;letter-spacing:.18em}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h + 16}px}
    .readout b{position:absolute;left:0;right:0;top:34%;transform:translateY(-50%);text-align:center;font-weight:620;font-variant-numeric:tabular-nums;letter-spacing:-0.045em;font-size:${Math.round(layout.bpmHit.h * 0.72)}px;color:#f6f3ee}
    .readout span{position:absolute;left:0;right:0;top:62%;text-align:center;font-size:10px;letter-spacing:.42em;font-weight:640;color:#8a8176}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px}
    .dial .fill{position:absolute;inset:0;width:100%;height:100%}
    .dial .bezel,.dial .needle{transform-origin:50% 50%}
    .dial .bezel{transform:rotate(${turn}deg)}
    .dial .needle{transform:rotate(${turn}deg)}
    .dial .boss{position:absolute;left:${bossOrigin}%;top:${bossOrigin}%;width:${bossPct}%;height:${bossPct}%}
    .dial .arc{position:absolute;inset:0;width:100%;height:100%}
    .lens{position:absolute}
    .lens img{width:100%;height:100%;opacity:.55}
    .lens i{position:absolute;left:22%;top:22%;width:56%;height:56%;border-radius:50%;background:radial-gradient(circle at 40% 34%, #fff4dc, #e4b15a 42%, #7a4a18 72%, transparent 76%)}
    .lens b{position:absolute;left:0;right:0;bottom:-2px;text-align:center;font-size:10px;font-weight:650;color:#b7aea3}
    .timebase{position:absolute;left:${apertures.timebase.x}px;top:${apertures.timebase.y}px;width:${apertures.timebase.w}px;height:${apertures.timebase.h}px;border-radius:50%;background:radial-gradient(circle at 40% 35%, #e7ffe4, #3dce55 55%, #0c5a24 80%)}
    .nav-item{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#6f6860}
    .nav-item svg{width:${spec.w < 360 ? 14 : 16}px;height:${spec.w < 360 ? 14 : 16}px}
    .nav-item span{font-weight:650;letter-spacing:.08em;line-height:1}
    .nav-item u{position:absolute;left:50%;bottom:7px;width:14px;height:2px;margin-left:-7px;border-radius:1px;background:#e4c48a;text-decoration:none}
    .nav-item.is-on{color:#f4efe6}
    ${frame ? '' : 'body{outline:4px solid red}'}
  </style></head><body>
    <div class="brand"><img src="${src(ART.wordmark)}" alt="POCKT"></div>
    ${round('tuner', layout.tuner, ICONS.tuner)}
    ${round('sound', layout.sound, ICONS.sound)}
    ${round('minus', layout.bpmMinus, ICONS.minus)}
    <div class="readout"><b>${spec.bpm}</b><span>BPM</span></div>
    ${round('plus', layout.bpmPlus, ICONS.plus)}
    <div class="dial" data-surface="SIMULATED NATIVE SURFACE">
      <img class="fill" src="${src(ART.face)}" alt="">
      <img class="fill bezel" src="${src(ART.bezel)}" alt="">
      <img class="fill" src="${src(ART.scale)}" alt="">
      <svg class="arc" viewBox="0 0 456 456"><path d="${arcPath(turn)}" fill="none" stroke="#e4c48a" stroke-width="3" stroke-linecap="round"/></svg>
      <img class="fill needle" src="${src(ART.needle)}" alt="">
      <img class="boss" src="${src(ART.boss)}" alt="">
    </div>
    <div class="timebase"></div>
    ${cells}
    <div class="key ${spec.loop ? 'is-on' : ''}" style="left:${apertures.loop.x}px;top:${apertures.loop.y}px;width:${apertures.loop.w}px;height:${apertures.loop.h}px"><img src="${src(spec.loop ? ART.secondaryDown : ART.secondary)}" alt=""><em>${ICONS.loop}</em></div>
    ${key('tap', layout.tap, 'TAP', 'tap')}
    ${key('play', layout.play, playing ? ICONS.pause : ICONS.play, 'play')}
    ${key('meter', layout.meter, `<b>${spec.meter || '4/4'}</b><small>METER</small>`, 'meter')}
    ${key('opt', layout.pockt, `<img src="${src(ART.pmark)}" alt="" style="width:46%;height:46%;object-fit:contain">`, 'opt')}
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

async function shot(page, spec, scale) {
  await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: scale });
  await page.setContent(screen(spec), { waitUntil: 'load' });
  return PNG.sync.read(await page.screenshot({ type: 'png' }));
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(path.join(root, 'assets', 'faceplate', 'faceplate-390x844.png'), path.join(out, 'FACEPLATE_ONLY_G11.png'));
  const server = await listen();
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}`;
  const original = page.setContent.bind(page);
  page.setContent = (html, options) => original(html.replaceAll('src="/', `src="${base}/`).replaceAll("url('/", `url('${base}/`), options);
  const phones = {
    390: { w: 390, h: 844, insets: FACEPLATE_FRAMES['390x844'].insets, bpm: 120 },
    320: { w: 320, h: 568, insets: FACEPLATE_FRAMES['320x568'].insets, bpm: 120 },
    375: { w: 375, h: 667, insets: FACEPLATE_FRAMES['375x667'].insets, bpm: 120 },
    393: { w: 393, h: 852, insets: FACEPLATE_FRAMES['393x852'].insets, bpm: 120 },
    430: { w: 430, h: 932, insets: FACEPLATE_FRAMES['430x932'].insets, bpm: 120 },
  };
  const face = await shot(page, phones[390], 1);
  const running = await shot(page, { ...phones[390], playing: true, beat: 0 }, 1);
  fs.writeFileSync(path.join(out, 'CURRENT_FACE_FOR_GREGG_G11.png'), PNG.sync.write(face));
  fs.writeFileSync(path.join(out, 'CURRENT_RUNNING_FOR_GREGG_G11.png'), PNG.sync.write(running));
  for (const [name, phone] of Object.entries(phones)) {
    if (name === '390') continue;
    fs.writeFileSync(path.join(out, `face-${name}.png`), PNG.sync.write(await shot(page, phone, 1)));
  }
  const rest = await shot(page, phones[390], 2);
  const run2 = await shot(page, { ...phones[390], playing: true, beat: 0 }, 2);
  const layout = computeFoundationLayout(390, 844, phones[390].insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const apertures = faceplateApertures(layout, 4);
  fs.mkdirSync(path.join(out, 'crops'), { recursive: true });
  const writeCrop = (name, png, rect, pad = 6) => fs.writeFileSync(path.join(out, 'crops', name), crop(png, rect, 2, pad));
  for (const bpm of [60, 120, 240]) {
    const frame = bpm === 120 ? rest : await shot(page, { ...phones[390], bpm }, 2);
    writeCrop(`dial-${bpm}.png`, frame, layout.dial, 16);
  }
  const playDown = await shot(page, { ...phones[390], down: 'play' }, 2);
  const tapDown = await shot(page, { ...phones[390], down: 'tap' }, 2);
  const tunerDown = await shot(page, { ...phones[390], down: 'tuner' }, 2);
  const soundDown = await shot(page, { ...phones[390], down: 'sound' }, 2);
  const minusDown = await shot(page, { ...phones[390], down: 'minus' }, 2);
  const plusDown = await shot(page, { ...phones[390], down: 'plus' }, 2);
  const loopOn = await shot(page, { ...phones[390], loop: true }, 2);
  const navPulse = await shot(page, { ...phones[390], nav: 'pulse' }, 2);
  const levels = ['mute', 'soft', 'normal', 'strong'];
  for (const level of levels) {
    const frame = await shot(page, { ...phones[390], accents: [level, 'mute', 'mute', 'mute'] }, 2);
    writeCrop(`level-${level}.png`, frame, apertures.sockets[0], 8);
  }
  const peak = await shot(page, { ...phones[390], accents: ['strong', 'mute', 'mute', 'mute'], peak: 0 }, 2);
  writeCrop('level-peak.png', peak, apertures.sockets[0], 8);
  writeCrop('play-rest.png', rest, layout.play, 12);
  writeCrop('play-down.png', playDown, layout.play, 12);
  writeCrop('play-run.png', run2, layout.play, 12);
  writeCrop('tap-rest.png', rest, layout.tap, 8);
  writeCrop('tap-down.png', tapDown, layout.tap, 8);
  writeCrop('tuner-rest.png', rest, layout.tuner, 8);
  writeCrop('tuner-down.png', tunerDown, layout.tuner, 8);
  writeCrop('sound-rest.png', rest, layout.sound, 8);
  writeCrop('sound-down.png', soundDown, layout.sound, 8);
  writeCrop('minus-rest.png', rest, layout.bpmMinus, 8);
  writeCrop('minus-down.png', minusDown, layout.bpmMinus, 8);
  writeCrop('plus-rest.png', rest, layout.bpmPlus, 8);
  writeCrop('plus-down.png', plusDown, layout.bpmPlus, 8);
  writeCrop('meter.png', rest, layout.meter, 8);
  writeCrop('options.png', rest, layout.pockt, 8);
  writeCrop('loop-off.png', rest, apertures.loop, 6);
  writeCrop('loop-on.png', loopOn, apertures.loop, 6);
  writeCrop('nav-off.png', navPulse, { x: layout.faceRail.x + layout.faceRail.w / 6, y: layout.faceRail.y, w: layout.faceRail.w / 6, h: layout.faceRail.h }, 2);
  writeCrop('nav-on.png', rest, { x: layout.faceRail.x, y: layout.faceRail.y, w: layout.faceRail.w / 6, h: layout.faceRail.h }, 2);
  writeCrop('fit-dial.png', rest, { x: layout.dial.x - 18, y: layout.dial.y - 18, w: layout.dial.w + 36, h: layout.dial.h + 36 }, 0);
  writeCrop('fit-play.png', rest, apertures.play, 10);
  writeCrop('fit-lamp.png', rest, apertures.sockets[0], 14);
  writeCrop('fit-tuner.png', rest, apertures.tuner, 10);
  writeCrop('fit-nav.png', rest, apertures.navChannel, 8);
  const css = `*{box-sizing:border-box}body{margin:0;background:#12100e;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    .row{display:flex;gap:12px;padding:12px;align-items:flex-start}figure{margin:0;flex:1;min-width:0}
    img{width:100%;height:auto;display:block;background:#000}figcaption{padding:8px 2px 0;font-size:12px;letter-spacing:.12em;font-weight:700}`;
  const cell = (label, rel) => `<figure><img src="${src(rel)}"><figcaption>${label}</figcaption></figure>`;
  const board = async (file, html, w) => {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    fs.writeFileSync(file, await page.screenshot({ type: 'png', fullPage: true }));
  };
  await board(path.join(out, 'G11_FACEPLATE_DESIGNS.png'), `<!doctype html><html><head><style>${css}</style></head><body><div class="row">
    ${cell('A ULTRA-PRECISION', 'artifacts/visual-gate-11/concepts/faceplate-A.png')}
    ${cell('B LUXURY HARDWARE', 'artifacts/visual-gate-11/concepts/faceplate-B.png')}
    ${cell('C POCKT FUTURE', 'artifacts/visual-gate-11/concepts/faceplate-C.png')}
    ${cell('SELECTED', 'artifacts/visual-gate-11/FACEPLATE_ONLY_G11.png')}
  </div></body></html>`, 1680);
  await board(path.join(out, 'BEAT_LIGHT_LEVELS_G11.png'), `<!doctype html><html><head><style>${css}figure{background:#0c0b0a;padding:10px}</style></head><body><div class="row">
    ${cell('OFF', 'artifacts/visual-gate-11/crops/level-mute.png')}
    ${cell('LEVEL 1', 'artifacts/visual-gate-11/crops/level-soft.png')}
    ${cell('LEVEL 2', 'artifacts/visual-gate-11/crops/level-normal.png')}
    ${cell('LEVEL 3', 'artifacts/visual-gate-11/crops/level-strong.png')}
    ${cell('LEVEL 3 + PEAK', 'artifacts/visual-gate-11/crops/level-peak.png')}
  </div></body></html>`, 1400);
  await board(path.join(out, 'G11_INTERACTION_BOARD.png'), `<!doctype html><html><head><style>${css} .row{flex-wrap:wrap}figure{flex:1 1 12%;background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('DIAL 1', 'artifacts/visual-gate-11/crops/dial-60.png')}
    ${cell('DIAL 2', 'artifacts/visual-gate-11/crops/dial-120.png')}
    ${cell('DIAL 3', 'artifacts/visual-gate-11/crops/dial-240.png')}
    ${cell('TUNER REST', 'artifacts/visual-gate-11/crops/tuner-rest.png')}
    ${cell('TUNER DOWN', 'artifacts/visual-gate-11/crops/tuner-down.png')}
    ${cell('SOUND REST', 'artifacts/visual-gate-11/crops/sound-rest.png')}
    ${cell('SOUND DOWN', 'artifacts/visual-gate-11/crops/sound-down.png')}
    ${cell('MINUS REST', 'artifacts/visual-gate-11/crops/minus-rest.png')}
    ${cell('MINUS DOWN', 'artifacts/visual-gate-11/crops/minus-down.png')}
    ${cell('PLUS REST', 'artifacts/visual-gate-11/crops/plus-rest.png')}
    ${cell('PLUS DOWN', 'artifacts/visual-gate-11/crops/plus-down.png')}
    ${cell('TAP REST', 'artifacts/visual-gate-11/crops/tap-rest.png')}
    ${cell('TAP DOWN', 'artifacts/visual-gate-11/crops/tap-down.png')}
    ${cell('PLAY REST', 'artifacts/visual-gate-11/crops/play-rest.png')}
    ${cell('PLAY DOWN', 'artifacts/visual-gate-11/crops/play-down.png')}
    ${cell('PLAY RUNNING', 'artifacts/visual-gate-11/crops/play-run.png')}
    ${cell('METER', 'artifacts/visual-gate-11/crops/meter.png')}
    ${cell('OPTIONS', 'artifacts/visual-gate-11/crops/options.png')}
    ${cell('LOOP OFF', 'artifacts/visual-gate-11/crops/loop-off.png')}
    ${cell('LOOP ON', 'artifacts/visual-gate-11/crops/loop-on.png')}
    ${cell('NAV OFF', 'artifacts/visual-gate-11/crops/nav-off.png')}
    ${cell('NAV ON', 'artifacts/visual-gate-11/crops/nav-on.png')}
  </div></body></html>`, 1680);
  await board(path.join(out, 'G11_FACEPLATE_FIT_BOARD.png'), `<!doctype html><html><head><style>${css}figure{background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('DIAL IN WELL', 'artifacts/visual-gate-11/crops/fit-dial.png')}
    ${cell('PLAY IN WELL', 'artifacts/visual-gate-11/crops/fit-play.png')}
    ${cell('LAMP IN SOCKET', 'artifacts/visual-gate-11/crops/fit-lamp.png')}
    ${cell('TUNER IN WELL', 'artifacts/visual-gate-11/crops/fit-tuner.png')}
    ${cell('NAV ON TRAY', 'artifacts/visual-gate-11/crops/fit-nav.png')}
  </div></body></html>`, 1680);
  fs.writeFileSync(path.join(out, 'SURFACE.txt'), 'SIMULATED NATIVE SURFACE\nThe faceplate is the rendered plate. Controls use production layout frames and the dial-clean assets mounted in those wells.\n');
  await browser.close();
  server.close();
  console.log('visual gate 11', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
