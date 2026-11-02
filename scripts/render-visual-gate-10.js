'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { BOSS_SCALE, dialAngleDeg } = require('../lib/dial-scale-geometry.js');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'visual-gate-10');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ART = {
  wordmark: 'assets/north-star-v3/pockt_wordmark_northstar.png',
  pmark: 'assets/north-star-v3/pockt_p_mark_transparent.png',
  chassis: 'assets/north-star-v3/chassis_texture_512.png',
  utility: 'assets/dial-clean/shell-utility.png',
  utilityDown: 'assets/dial-clean/shell-utility-down.png',
  secondary: 'assets/dial-clean/shell-secondary.png',
  secondaryDown: 'assets/dial-clean/shell-secondary-down.png',
  primary: 'assets/dial-clean/shell-primary.png',
  primaryDown: 'assets/dial-clean/shell-primary-down.png',
  bezel: 'assets/dial-clean/dial-bezel-clean.png',
  face: 'assets/dial-clean/dial-face-neutral.png',
  scale: 'assets/dial-clean/dial-scale-generated.png',
  needle: 'assets/dial-clean/dial-needle.png',
  boss: 'assets/dial-clean/dial-boss.png',
  roundRest: 'assets/north-star-v3/header_round_shell_rest.png',
  roundDown: 'assets/north-star-v3/header_round_shell_pressed.png',
  playRest: 'assets/north-star-v3/transport_primary_shell_rest.png',
  playDown: 'assets/north-star-v3/transport_primary_shell_pressed.png',
  tapRest: 'assets/north-star-v3/transport_dark_shell_rest.png',
  tapDown: 'assets/north-star-v3/transport_dark_shell_pressed.png',
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
  const look = spec.look || 'signature';
  const composition = look === 'studio' ? 'precision' : look === 'future' ? 'evolved' : 'heritage';
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, {
    dialChrome: true,
    presentation: 'beats',
    beatRows: 1,
    composition,
  });
  const turn = dialAngleDeg(spec.bpm);
  const bossPct = (BOSS_SCALE * 100).toFixed(2);
  const bossOrigin = ((1 - BOSS_SCALE) * 50).toFixed(2);
  const slot = layout.faceRail.w / 6;
  const font = navSize(slot, spec.w);
  if (textWidth('PENDULUM', font) > slot - 2) throw new Error(`PENDULUM overflow ${spec.w}`);
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const loopW = Math.min(72, Math.max(52, layout.beats.h * 0.58));
  const lamp = Math.min(22, layout.beats.h * 0.28);
  const innerX = layout.beats.x + lamp + 18;
  const innerW = layout.beats.w - lamp - loopW - 36;
  const col = innerW / 4;
  const disc = Math.min(col * 0.78, layout.beats.h * 0.62);
  const playing = Boolean(spec.playing);
  const down = spec.down || '';
  const photo = look === 'mechanical';
  const utility = photo ? ART.roundRest : ART.utility;
  const utilityDown = photo ? ART.roundDown : ART.utilityDown;
  const secondary = photo ? ART.tapRest : ART.secondary;
  const secondaryDown = photo ? ART.tapDown : ART.secondaryDown;
  const primary = photo ? ART.playRest : ART.primary;
  const primaryDown = photo ? ART.playDown : ART.primaryDown;
  const accent = look === 'future' ? '#8fd0c8' : '#e4c48a';
  const cells = accents.map((level, index) => {
    const hot = spec.peak === index || (playing && spec.beat === index);
    const x = innerX + col * index + (col - disc) / 2;
    const y = layout.beats.y + (layout.beats.h - disc) * 0.42;
    const glow = level === 'mute' ? 0.05 : level === 'soft' ? 0.28 : level === 'strong' ? 0.55 : 0.38;
    return `<div class="socket" style="left:${x}px;top:${y}px;width:${disc}px;height:${disc}px">
      <img src="${src(utility)}" alt="">
      <i class="${hot ? 'peak' : ''}" style="opacity:${hot ? 1 : glow};background:${look === 'future' ? 'radial-gradient(circle at 40% 35%, #f4fffd, #8fd0c8 46%, #1d6d66 74%, transparent 76%)' : ''}"></i>
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
  const round = (name, box, icon) => {
    const pressed = down === name;
    return `<div class="key ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(pressed ? utilityDown : utility)}" alt=""><em>${icon}</em></div>`;
  };
  const key = (name, box, inner, kind) => {
    const pressed = down === name;
    const art = kind === 'play' ? (pressed ? primaryDown : primary) : (pressed ? secondaryDown : secondary);
    return `<div class="key ${kind} ${pressed ? 'is-down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">
      <img src="${src(art)}" alt=""><em>${inner}</em></div>`;
  };
  const chassis = photo
    ? `background:#100e0c url('${src(ART.chassis)}') center/420px`
    : 'background:linear-gradient(#161411,#0c0b0a 42%,#070706)';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}
    html,body{margin:0}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;color:#f4f0e8;position:relative;
      font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;${chassis};
      box-shadow:inset 0 80px 80px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,236,210,.06)}
    img{display:block}
    .channel{position:absolute;left:${layout.faceRail.x}px;top:${layout.faceRail.y}px;width:${layout.faceRail.w}px;height:${layout.faceRail.h}px;
      background:#100e0c;border-radius:16px}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y + 6}px;width:${layout.identity.w}px;height:${Math.max(16, layout.identity.h * 0.36)}px;
      display:flex;align-items:center;justify-content:center}
    .brand img{height:100%;width:auto;max-width:92%;object-fit:contain;opacity:.92}
    .key{position:absolute;filter:drop-shadow(0 8px 6px rgba(0,0,0,.45))}
    .key img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}
    .key em{position:absolute;inset:18%;display:flex;align-items:center;justify-content:center;font-style:normal;color:#f4f0e8}
    .key em svg{width:58%;height:58%}
    .key.is-down{transform:translateY(5px);filter:brightness(.62) drop-shadow(0 1px 0 rgba(0,0,0,.3))}
    .play em{color:#1c140c;inset:8%}
    .play em svg{width:46%;height:46%}
    .tap em{font-weight:760;letter-spacing:.16em;font-size:${Math.max(13, Math.round(layout.play.h * 0.22))}px}
    .meter em{flex-direction:column;gap:2px;font-weight:720;letter-spacing:.04em;font-size:${Math.max(13, Math.round(layout.play.h * 0.2))}px;line-height:1}
    .meter small{color:${accent};font-size:10px;letter-spacing:.18em}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px}
    .readout b{position:absolute;left:0;right:0;top:46%;transform:translateY(-58%);text-align:center;
      font-weight:640;font-variant-numeric:tabular-nums;letter-spacing:-0.04em;
      font-size:${Math.round(layout.bpmHit.h * (look === 'future' ? 0.78 : 0.7))}px;color:#f7f4ee}
    .readout span{position:absolute;left:0;right:0;bottom:8%;text-align:center;font-size:10px;letter-spacing:.42em;font-weight:650;color:#8d8478}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px;filter:drop-shadow(0 16px 10px rgba(0,0,0,.55))}
    .dial .fill{position:absolute;inset:0;width:100%;height:100%}
    .dial .bezel{transform:rotate(${turn}deg);transform-origin:50% 50%}
    .dial .needle{transform:rotate(${turn}deg);transform-origin:50% 50%;${look === 'future' ? 'filter:hue-rotate(140deg) saturate(1.3) brightness(1.15)' : ''}}
    .dial .boss{position:absolute;left:${bossOrigin}%;top:${bossOrigin}%;width:${bossPct}%;height:${bossPct}%;opacity:.9}
    .dial .arc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .bed{position:absolute;background:#110f0d;border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,236,210,.07), inset 0 -18px 24px rgba(0,0,0,.35)}
    .socket{position:absolute}
    .socket img{width:100%;height:100%}
    .socket i{position:absolute;left:34%;top:30%;width:32%;height:32%;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #fff6df, #e7b15a 48%, #8a5a22 78%, transparent 80%)}
    .socket i.peak{box-shadow:0 0 6px 1px rgba(228,196,138,.85)}
    .socket b{position:absolute;left:0;right:0;bottom:12%;text-align:center;font-size:${Math.max(10, Math.round(disc * 0.2))}px;font-weight:650;color:#cfc6ba;font-variant-numeric:tabular-nums}
    .lamp{position:absolute;left:${layout.beats.x + 14}px;top:${layout.beats.y + (layout.beats.h - lamp) / 2}px;width:${lamp}px;height:${lamp}px}
    .lamp i{position:absolute;inset:22%;border-radius:50%;background:radial-gradient(circle at 38% 32%, #e7ffe4, #3dce55 50%, #0c5a24 80%);box-shadow:0 0 4px rgba(40,180,70,.4)}
    .loop{position:absolute;left:${layout.beats.x + layout.beats.w - loopW - 10}px;top:${layout.beats.y + (layout.beats.h - Math.min(44, layout.beats.h * 0.55)) / 2}px;width:${loopW}px;height:${Math.min(44, layout.beats.h * 0.55)}px;color:#f4f0e8}
    .loop.is-on em{color:${accent}}
    .loop img{position:absolute;inset:0;width:100%;height:100%}
    .loop em{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-style:normal}
    .loop svg{width:15px;height:15px}
    .loop span{font-size:8px;font-weight:700;letter-spacing:.16em}
    .nav-item{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#7d756c}
    .nav-item svg{width:${spec.w < 360 ? 14 : 16}px;height:${spec.w < 360 ? 14 : 16}px}
    .nav-item span{font-weight:650;letter-spacing:.08em;line-height:1}
    .nav-item u{position:absolute;left:50%;bottom:8px;width:16px;height:2px;margin-left:-8px;border-radius:1px;background:${accent};text-decoration:none}
    .nav-item.is-on{color:#f6f1e8}
    ${photo ? `.channel{background:transparent}.nav-item u{left:8%;right:8%;top:6px;bottom:6px;width:auto;height:auto;margin:0;border-radius:14px;background:#2c261e;border:1px solid rgba(198,163,106,.7)}` : ''}
  </style></head><body>
    <div class="bed" style="left:${layout.bpmMinus.x - 8}px;top:${layout.bpmHit.y - 6}px;width:${layout.bpmPlus.x + layout.bpmPlus.w - layout.bpmMinus.x + 16}px;height:${layout.dial.y + layout.dial.h - layout.bpmHit.y + 14}px"></div>
    <div class="bed" style="left:${layout.beats.x}px;top:${layout.beats.y - 6}px;width:${layout.beats.w}px;height:${layout.transport.y + layout.transport.h - layout.beats.y + 12}px;border-radius:18px"></div>
    <div class="channel"></div>
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
      <svg class="arc" viewBox="0 0 456 456"><path d="${arcPath(turn)}" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linecap="round"/></svg>
      <img class="fill needle" src="${src(ART.needle)}" alt="">
      <img class="boss" src="${src(ART.boss)}" alt="">
    </div>
    <div class="lamp"><i></i></div>
    ${cells}
    <div class="loop ${spec.loop ? 'is-on' : ''}"><img src="${src(spec.loop ? secondaryDown : secondary)}" alt=""><em>${ICONS.loop}<span>LOOP</span></em></div>
    ${key('tap', layout.tap, 'TAP', 'tap')}
    ${key('play', layout.play, playing ? ICONS.pause : ICONS.play, 'play')}
    ${key('meter', layout.meter, `<b>${spec.meter || '4/4'}</b><small>METER</small>`, 'meter')}
    ${key('opt', layout.pockt, `<img src="${src(ART.pmark)}" alt="" style="width:54%;height:54%;object-fit:contain">`, 'opt')}
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
  page.setContent = (html, options) => original(html.replaceAll('src="/', `src="${base}/`).replaceAll("url('/", `url('${base}/`), options);
  const standard = { w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 }, bpm: 120, look: 'signature' };
  const looks = ['studio', 'mechanical', 'future', 'signature'];
  fs.mkdirSync(path.join(out, 'directions'), { recursive: true });
  for (const look of looks) {
    const frame = await shot(page, { ...standard, look }, 1);
    fs.writeFileSync(path.join(out, 'directions', `${look}.png`), PNG.sync.write(frame));
  }
  if (process.argv.includes('--directions-only')) {
    await browser.close();
    server.close();
    console.log('directions', out);
    return;
  }
  const phones = {
    standard,
    tall: { ...standard, w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
    small: { ...standard, w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
    regular: { ...standard, w: 375, h: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
    pro: { ...standard, w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  };
  const face = await shot(page, phones.standard, 1);
  const running = await shot(page, { ...phones.standard, playing: true, beat: 0 }, 1);
  fs.writeFileSync(path.join(out, 'CURRENT_FACE_FOR_GREGG_G10.png'), PNG.sync.write(face));
  fs.writeFileSync(path.join(out, 'CURRENT_RUNNING_FOR_GREGG_G10.png'), PNG.sync.write(running));
  for (const [name, phone] of Object.entries(phones)) {
    fs.writeFileSync(path.join(out, `face-${name === 'standard' ? '390' : name === 'tall' ? '393' : name === 'small' ? '320' : name === 'regular' ? '375' : '430'}.png`), PNG.sync.write(name === 'standard' ? face : await shot(page, phone, 1)));
  }
  const rest = await shot(page, phones.standard, 2);
  const run2 = await shot(page, { ...phones.standard, playing: true, beat: 0 }, 2);
  const L = computeFoundationLayout(390, 844, phones.standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
  fs.mkdirSync(path.join(out, 'crops'), { recursive: true });
  const writeCrop = (name, png, rect, pad = 4) => fs.writeFileSync(path.join(out, 'crops', name), crop(png, rect, 2, pad));
  for (const bpm of [60, 120, 240]) {
    const frame = bpm === 120 ? rest : await shot(page, { ...phones.standard, bpm }, 2);
    writeCrop(`dial-${bpm}.png`, frame, L.dial, 0);
  }
  const playDown = await shot(page, { ...phones.standard, down: 'play' }, 2);
  const tapDown = await shot(page, { ...phones.standard, down: 'tap' }, 2);
  const loopOn = await shot(page, { ...phones.standard, loop: true }, 2);
  const peaked = await shot(page, { ...phones.standard, peak: 0 }, 2);
  const navPulse = await shot(page, { ...phones.standard, nav: 'pulse' }, 2);
  writeCrop('play-rest.png', rest, L.play, 10);
  writeCrop('play-down.png', playDown, L.play, 10);
  writeCrop('play-run.png', run2, L.play, 10);
  writeCrop('tap-rest.png', rest, L.tap, 8);
  writeCrop('tap-down.png', tapDown, L.tap, 8);
  writeCrop('beat-rest.png', rest, { x: L.beats.x + 36, y: L.beats.y, w: 80, h: L.beats.h }, 0);
  writeCrop('beat-peak.png', peaked, { x: L.beats.x + 36, y: L.beats.y, w: 80, h: L.beats.h }, 0);
  writeCrop('loop-off.png', rest, { x: L.beats.x + L.beats.w - 90, y: L.beats.y, w: 90, h: L.beats.h }, 0);
  writeCrop('loop-on.png', loopOn, { x: L.beats.x + L.beats.w - 90, y: L.beats.y, w: 90, h: L.beats.h }, 0);
  writeCrop('nav-off.png', navPulse, { x: L.faceRail.x + L.faceRail.w / 6, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2);
  writeCrop('nav-on.png', rest, { x: L.faceRail.x, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2);
  writeCrop('tempo.png', rest, { x: 0, y: L.bpmHit.y - 8, w: 390, h: L.dial.y + L.dial.h - L.bpmHit.y + 16 }, 0);
  writeCrop('brand.png', rest, { x: 0, y: phones.standard.insets.top, w: 390, h: L.tuner.h + 8 }, 0);
  writeCrop('actions.png', rest, L.transport, 8);
  writeCrop('beats.png', rest, L.beats, 4);
  writeCrop('nav.png', rest, L.faceRail, 4);
  const css = `*{box-sizing:border-box}body{margin:0;background:#141210;color:#f4efe6;font-family:"Segoe UI",Arial,sans-serif}
    .row{display:flex;gap:12px;padding:12px;align-items:flex-start}figure{margin:0;flex:1;min-width:0}
    img{width:100%;height:auto;display:block;background:#000}figcaption{padding:8px 2px 0;font-size:12px;letter-spacing:.12em;font-weight:700}`;
  const cell = (label, rel) => `<figure><img src="${src(rel)}"><figcaption>${label}</figcaption></figure>`;
  const board = async (file, html, w) => {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    fs.writeFileSync(file, await page.screenshot({ type: 'png', fullPage: true }));
  };
  await board(path.join(out, 'G8_TO_G10.png'), `<!doctype html><html><head><style>${css}</style></head><body><div class="row">
    ${cell('GATE 8', 'artifacts/visual-gate-8/CURRENT_FACE_FOR_GREGG_G8.png')}
    ${cell('GATE 10', 'artifacts/visual-gate-10/CURRENT_FACE_FOR_GREGG_G10.png')}
  </div></body></html>`, 860);
  await board(path.join(out, 'G10_DESIGN_DIRECTIONS.png'), `<!doctype html><html><head><style>${css}</style></head><body><div class="row">
    ${cell('PRECISION STUDIO', 'artifacts/visual-gate-10/directions/studio.png')}
    ${cell('LUXURY MECHANICAL', 'artifacts/visual-gate-10/directions/mechanical.png')}
    ${cell('FUTURE MUSICAL', 'artifacts/visual-gate-10/directions/future.png')}
    ${cell('POCKT SIGNATURE', 'artifacts/visual-gate-10/directions/signature.png')}
    ${cell('SELECTED', 'artifacts/visual-gate-10/CURRENT_FACE_FOR_GREGG_G10.png')}
  </div></body></html>`, 2100);
  await board(path.join(out, 'G10_DETAIL_BOARD.png'), `<!doctype html><html><head><style>${css}figure{background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('TEMPO', 'artifacts/visual-gate-10/crops/tempo.png')}
    ${cell('PRIMARY ACTIONS', 'artifacts/visual-gate-10/crops/actions.png')}
    ${cell('BEAT SYSTEM', 'artifacts/visual-gate-10/crops/beats.png')}
    ${cell('NAVIGATION', 'artifacts/visual-gate-10/crops/nav.png')}
    ${cell('BRAND', 'artifacts/visual-gate-10/crops/brand.png')}
  </div></body></html>`, 1800);
  await board(path.join(out, 'G10_INTERACTION_BOARD.png'), `<!doctype html><html><head><style>${css} .row{flex-wrap:wrap}figure{flex:1 1 14%;background:#0c0b0a;padding:8px}</style></head><body><div class="row">
    ${cell('ROTARY 1', 'artifacts/visual-gate-10/crops/dial-60.png')}
    ${cell('ROTARY 2', 'artifacts/visual-gate-10/crops/dial-120.png')}
    ${cell('ROTARY 3', 'artifacts/visual-gate-10/crops/dial-240.png')}
    ${cell('BUTTON REST', 'artifacts/visual-gate-10/crops/tap-rest.png')}
    ${cell('BUTTON DOWN', 'artifacts/visual-gate-10/crops/tap-down.png')}
    ${cell('PLAY STOPPED', 'artifacts/visual-gate-10/crops/play-rest.png')}
    ${cell('PLAY RUNNING', 'artifacts/visual-gate-10/crops/play-run.png')}
    ${cell('BEAT REST', 'artifacts/visual-gate-10/crops/beat-rest.png')}
    ${cell('BEAT PEAK', 'artifacts/visual-gate-10/crops/beat-peak.png')}
    ${cell('LOOP OFF', 'artifacts/visual-gate-10/crops/loop-off.png')}
    ${cell('LOOP ON', 'artifacts/visual-gate-10/crops/loop-on.png')}
    ${cell('NAV OFF', 'artifacts/visual-gate-10/crops/nav-off.png')}
    ${cell('NAV ON', 'artifacts/visual-gate-10/crops/nav-on.png')}
  </div></body></html>`, 1680);
  fs.writeFileSync(path.join(out, 'SURFACE.txt'), 'SIMULATED NATIVE SURFACE\nWindows cannot render UIKit. Frames use production layout and the dial-clean assets bundled by the native module.\n');
  await browser.close();
  server.close();
  console.log('visual gate 10', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
