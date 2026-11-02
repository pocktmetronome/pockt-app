'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { angleFromNorthStarBpm, NORTH_STAR_MARKS } = require('../lib/native-interaction-math.ts');
const { fits, navFont, loopFont } = require('./visual-fit');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = path.join(__dirname, '..', 'artifacts', 'visual-gate-2', 'proofs');

const ICONS = {
  tuner: '<svg viewBox="0 0 100 100"><path d="M35 18v31c0 10 7 18 15 18s15-8 15-18V18M50 67v17" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
  sound: '<svg viewBox="0 0 100 100"><path d="M20 58h16l18 15V27L36 42H20z" fill="currentColor"/><path d="M66 39c6 6 6 16 0 22M76 30c12 12 12 28 0 40" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
  minus: '<svg viewBox="0 0 100 100"><path d="M28 50h44" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 100 100"><path d="M50 28v44M28 50h44" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 100 100"><path d="M34 24L78 50 34 76Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 100 100"><path d="M34 26h12v48H34zM54 26h12v48H54z" fill="currentColor"/></svg>',
  loop: '<svg viewBox="0 0 100 100"><path d="M26 35c7-9 16-13 27-13 14 0 25 7 31 18M79 25l5 15-15 2M74 65c-7 9-16 13-27 13-14 0-25-7-31-18M21 75l-5-15 15-2" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  options: '<svg viewBox="0 0 100 100"><path d="M22 32h56M22 50h56M22 68h56" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
  dial: '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="26" fill="none" stroke="currentColor" stroke-width="7"/><path d="M50 26v26h24" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
  rhythm: '<svg viewBox="0 0 100 100"><path d="M18 28l22 22-22 22M49 28l22 22-22 22" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pulse: '<svg viewBox="0 0 100 100"><path d="M10 52h18l8-22 15 46 12-32 8 8h19" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pendulum: '<svg viewBox="0 0 100 100"><path d="M50 18v42" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="73" r="12" fill="none" stroke="currentColor" stroke-width="7"/></svg>',
  pro: '<svg viewBox="0 0 100 100"><path d="M25 25v50M50 25v50M75 25v50" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',
  beatline: '<svg viewBox="0 0 100 100"><path d="M15 70l25-42 18 29 27-42" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function deg(bpm) {
  return (angleFromNorthStarBpm(bpm) * 180) / Math.PI;
}

function dialHtml(bpm, size) {
  const ticks = [];
  for (let turn = -135; turn <= 135.01; turn += 3) {
    const major = NORTH_STAR_MARKS.some((mark) => Math.abs(deg(mark) - turn) < 0.8);
    const mid = !major && Math.abs((turn + 135) % 9) < 0.8;
    ticks.push(`<div class="arm" style="transform:rotate(${turn}deg)"><i class="tk ${major ? 'maj' : mid ? 'mid' : ''}"></i></div>`);
  }
  const nums = NORTH_STAR_MARKS.map((mark) => {
    const turn = deg(mark);
    const rad = (turn * Math.PI) / 180;
    return `<b class="num" style="left:${50 + Math.sin(rad) * 31}%;top:${50 - Math.cos(rad) * 31}%">${mark}</b>`;
  }).join('');
  return `<div class="dial" style="width:${size}px;height:${size}px">
    <div class="dial-shadow"></div>
    <div class="knurl"></div>
    <div class="bezel"><div class="face">
      <div class="grooves"></div>
      ${ticks.join('')}
      ${nums}
      <div class="needle" style="transform:rotate(${deg(bpm)}deg)"><i></i></div>
      <div class="boss"><i></i><em></em></div>
      <div class="sheen"></div>
      <div class="rim"></div>
    </div></div>
  </div>`;
}

function key(className, inner, box, flags) {
  const down = flags && flags.down ? ' is-down' : '';
  const on = flags && flags.on ? ' is-on' : '';
  return `<div class="hw ${className}${down}${on}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><div class="cap">${inner}</div></div>`;
}

function screen(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const slot = layout.faceRail.w / 6;
  const font = navFont(slot);
  if (!fits('PENDULUM', font, slot)) throw new Error(`PENDULUM does not fit ${spec.w}`);
  const loopW = Math.min(64, Math.max(52, layout.beats.h * 0.7));
  const loopSize = loopFont(loopW);
  if (!fits('LOOP', loopSize, loopW - 14)) throw new Error(`LOOP does not fit ${spec.w}`);
  const lamp = 28;
  const innerX = layout.beats.x + lamp + 16;
  const innerW = layout.beats.w - lamp - loopW - 28;
  const col = innerW / accents.length;
  const disc = Math.min(col * 0.72, layout.beats.h * 0.52);
  const cells = accents.map((level, index) => {
    const hot = spec.peak === index || (spec.playing && spec.beat === index);
    const x = innerX + col * index + (col - disc) / 2;
    const y = layout.beats.y + layout.beats.h * 0.16;
    return `<div class="fixture ${level}${hot ? ' peak' : ''}" style="left:${x}px;top:${y}px;width:${disc}px;height:${disc}px"><i></i><b>${index + 1}</b></div>`;
  }).join('');
  const nav = [
    ['dial', 'DIAL'],
    ['rhythm', 'RHYTHM'],
    ['pulse', 'PULSE'],
    ['pendulum', 'PENDULUM'],
    ['pro', 'PRO'],
    ['beatline', 'BEATLINE'],
  ].map(([id, label], index) => {
    const on = (spec.nav || 'dial') === id;
    return `<div class="nav-item${on ? ' is-on' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px">
      <div class="nav-icon">${ICONS[id]}</div>
      <span style="font-size:${font}px">${label}</span>
    </div>`;
  }).join('');
  const down = spec.down || '';
  const playing = Boolean(spec.playing);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}
    html,body{margin:0;overflow:hidden;background:#070706}
    .stage{position:relative;width:${spec.w}px;height:${spec.h}px;color:#f4efe6;
      background:
        radial-gradient(ellipse at 50% 18%, rgba(90,74,48,.22), transparent 42%),
        radial-gradient(ellipse at 50% 80%, rgba(0,0,0,.45), transparent 50%),
        linear-gradient(180deg, #2a261f 0%, #141210 38%, #0c0b0a 100%);}
    .grain{position:absolute;inset:0;width:100%;height:100%;opacity:.045;pointer-events:none}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;
      display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px}
    .brand strong{font-family:Georgia,"Palatino Linotype",serif;font-weight:600;letter-spacing:.38em;font-size:${Math.max(15, Math.min(22, layout.identity.w / 9))}px;
      background:linear-gradient(180deg,#f8edd4 10%,#e7d3a4 40%,#a68450 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .brand i{display:block;width:42%;height:1px;background:linear-gradient(90deg,transparent,#c6a36a,transparent)}
    .hw{position:absolute}
    .hw .cap{position:absolute;inset:3px;border-radius:inherit;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px;
      background:linear-gradient(180deg,#3a342c 0%,#1a1714 46%,#100e0c 100%);
      box-shadow:inset 0 1px 0 rgba(255,244,220,.28), inset 0 -8px 10px rgba(0,0,0,.45);
      color:#f6efe2}
    .hw{border-radius:14px;background:linear-gradient(180deg,#1a1612,#070605);
      box-shadow:0 5px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 0 1px rgba(198,163,106,.55)}
    .round{border-radius:999px}
    .round .cap{border-radius:999px}
    .hw svg{width:46%;height:46%}
    .round svg{width:42%;height:42%}
    .hw.is-down .cap{transform:translateY(2px);filter:brightness(.78);box-shadow:inset 0 3px 6px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)}
    .hw.is-on .cap{filter:brightness(.9);box-shadow:inset 0 2px 5px rgba(0,0,0,.5)}
    .primary{box-shadow:0 6px 10px rgba(0,0,0,.5), inset 0 0 0 1px rgba(231,211,164,.8)}
    .primary .cap{background:linear-gradient(180deg,#4a4032,#1c1814 55%,#12100e)}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px;border-radius:10px;
      background:linear-gradient(180deg,#1a1814,#070605);
      box-shadow:inset 0 4px 10px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px rgba(198,163,106,.72);
      display:flex;flex-direction:column;align-items:center;justify-content:center}
    .readout b{font-family:Georgia,serif;font-size:${Math.round(layout.bpmHit.h * 0.46)}px;line-height:.85;font-variant-numeric:tabular-nums;letter-spacing:.04em;
      text-shadow:0 1px 0 rgba(0,0,0,.6)}
    .readout span{margin-top:3px;font-size:8px;letter-spacing:.42em;color:#c6a36a;font-weight:700}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px}
    .dial-shadow{position:absolute;inset:-3%;border-radius:50%;background:radial-gradient(circle, rgba(0,0,0,.55), transparent 70%);filter:blur(6px)}
    .knurl{position:absolute;inset:0;border-radius:50%;
      background:repeating-conic-gradient(from 0deg,#f0e2c4 0deg .35deg,#8a7044 .35deg 1.1deg,#241c12 1.1deg 1.85deg,#5c4830 1.85deg 3deg);
      -webkit-mask:radial-gradient(circle, transparent 0 86.5%, #000 88% 99.2%, transparent 100%);
      mask:radial-gradient(circle, transparent 0 86.5%, #000 88% 99.2%, transparent 100%)}
    .bezel{position:absolute;inset:4.6%;border-radius:50%;padding:7.4%;
      background:
        radial-gradient(circle at 50% 42%, rgba(255,255,255,.22), transparent 46%),
        conic-gradient(from 200deg,#6a5430 0%,#f6ead0 14%,#c4a46e 28%,#3a2e18 46%,#ead9b0 62%,#7a6238 78%,#f3e6c8 90%,#6a5430 100%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.7), inset 0 -12px 16px rgba(0,0,0,.4), 0 14px 20px rgba(0,0,0,.45)}
    .rim{position:absolute;inset:0;border-radius:50%;pointer-events:none;
      box-shadow:inset 0 0 0 1.5px rgba(255,244,220,.55), inset 0 0 0 4px rgba(40,28,12,.55)}
    .face{position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;
      background:
        radial-gradient(circle at 50% 38%, rgba(255,255,255,.07), transparent 36%),
        repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.025) 0 1px, transparent 1px 5px),
        radial-gradient(circle at 50% 46%, #2c2822, #12100e 58%, #070605);
      box-shadow:inset 0 0 0 2px rgba(0,0,0,.7), inset 0 0 0 3px rgba(231,211,164,.28), inset 0 14px 22px rgba(0,0,0,.4)}
    .grooves{position:absolute;inset:18%;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.04), inset 0 0 0 1px rgba(255,255,255,.03)}
    .arm{position:absolute;inset:0}
    .tk{position:absolute;left:50%;top:5%;width:1px;height:4.5%;margin-left:-0.5px;background:rgba(231,211,164,.4)}
    .tk.mid{height:6%;top:4%;background:rgba(231,211,164,.7)}
    .tk.maj{width:2px;height:8.5%;top:3%;margin-left:-1px;background:#f3e6c8}
    .num{position:absolute;transform:translate(-50%,-50%);color:#f0e2c4;font-family:Georgia,serif;font-size:${Math.max(9, Math.round(layout.dial.w * 0.038))}px;font-weight:560;text-shadow:0 1px 1px rgba(0,0,0,.8)}
    .needle{position:absolute;inset:0}
    .needle i{position:absolute;left:50%;top:20%;width:5px;height:30%;margin-left:-2.5px;transform-origin:50% 100%;
      background:linear-gradient(90deg,#6e5430,#f8edd4 42%,#c6a36a 62%,#5c4524);
      clip-path:polygon(50% 0, 82% 86%, 50% 100%, 18% 86%);
      filter:drop-shadow(1px 2px 1px rgba(0,0,0,.55))}
    .boss{position:absolute;left:50%;top:50%;width:18%;height:18%;margin:-9% 0 0 -9%;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #1a1612, #050403);
      box-shadow:0 0 0 3px rgba(198,163,106,.55), inset 0 0 0 2px rgba(0,0,0,.8)}
    .boss i{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 35% 30%, #f8edd4, #c6a36a 46%, #6e5430)}
    .boss em{position:absolute;left:28%;top:22%;width:28%;height:16%;border-radius:50%;background:rgba(255,255,255,.55)}
    .sheen{position:absolute;left:18%;top:8%;width:64%;height:28%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.14),transparent);pointer-events:none}
    .panel{position:absolute;border-radius:18px;background:linear-gradient(180deg,#1c1915,#0c0b0a);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.07), inset 0 0 0 1px rgba(198,163,106,.38), inset 0 -12px 16px rgba(0,0,0,.35), 0 8px 14px rgba(0,0,0,.28)}
    .fixture{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 40%, #2a241c, #0c0b0a);
      box-shadow:inset 0 2px 4px rgba(0,0,0,.65), 0 0 0 1.5px rgba(140,112,64,.75), 0 3px 4px rgba(0,0,0,.4)}
    .fixture.strong{box-shadow:inset 0 2px 4px rgba(0,0,0,.65), 0 0 0 1.5px #e7d3a4, 0 3px 4px rgba(0,0,0,.4)}
    .fixture.soft{box-shadow:inset 0 2px 4px rgba(0,0,0,.65), 0 0 0 1.5px rgba(120,96,58,.55), 0 3px 4px rgba(0,0,0,.4)}
    .fixture i{position:absolute;left:27%;top:27%;width:46%;height:46%;border-radius:50%;
      background:radial-gradient(circle at 40% 35%, #fff6e0, #ffb24a 42%, rgba(255,140,40,.15) 70%, transparent 72%);
      box-shadow:0 0 6px rgba(255,170,60,.25)}
    .fixture.soft i{opacity:.34;box-shadow:none}
    .fixture.normal i{opacity:.5}
    .fixture.strong i{opacity:.72}
    .fixture.peak i{opacity:1;box-shadow:0 0 10px 2px rgba(255,176,70,.7)}
    .fixture b{position:absolute;left:0;right:0;top:108%;text-align:center;font-size:10px;color:#e7d3a4;font-variant-numeric:tabular-nums;font-weight:650}
    .nav-item{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#9a9084}
    .nav-item svg{width:16px;height:16px}
    .nav-item span{letter-spacing:.04em;font-weight:650;line-height:1}
    .nav-item.is-on{color:#f4e7c8}
    .nav-item.is-on svg{filter:drop-shadow(0 0 3px rgba(231,211,164,.45))}
    .nav-item.is-on::after{content:"";position:absolute;left:18%;right:18%;bottom:6px;height:2px;border-radius:2px;background:#e7d3a4}
    .transport{display:flex}
  </style></head><body><div class="stage">
    <svg class="grain"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
    ${key('round', ICONS.tuner, shrink(layout.tuner, 0), {})}
    <div class="brand"><strong>POCKT</strong><i></i></div>
    ${key('round', ICONS.sound, shrink(layout.sound, 0), {})}
    ${key('round', ICONS.minus, layout.bpmMinus, { down: down === 'minus' })}
    <div class="readout"><b>${String(spec.bpm).padStart(3, '\u2007')}</b><span>BPM</span></div>
    ${key('round', ICONS.plus, layout.bpmPlus, { down: down === 'plus' })}
    ${dialHtml(spec.bpm, layout.dial.w)}
    <div class="panel" style="left:${layout.beats.x}px;top:${layout.beats.y}px;width:${layout.beats.w}px;height:${layout.beats.h}px"></div>
    ${key('round', '<i style="width:10px;height:10px;border-radius:50%;background:radial-gradient(circle,#d8ffd0,#3ecf6e);box-shadow:0 0 6px rgba(80,220,120,.8)"></i>', { x: layout.beats.x + 8, y: layout.beats.y + (layout.beats.h - lamp) / 2, w: lamp, h: lamp }, {})}
    ${cells}
    ${key('', `${ICONS.loop}<span style="font-size:${loopSize}px;letter-spacing:.12em;font-weight:700">LOOP</span>`, { x: layout.beats.x + layout.beats.w - loopW - 8, y: layout.beats.y + (layout.beats.h - 36) / 2, w: loopW, h: 36 }, {})}
    <div class="panel" style="left:${layout.transport.x - 4}px;top:${layout.transport.y - 4}px;width:${layout.transport.w + 8}px;height:${layout.transport.h + 8}px"></div>
    ${key('primary', 'TAP', layout.tap, { down: down === 'tap' })}
    ${key('primary', playing ? ICONS.pause : ICONS.play, layout.play, { down: down === 'play', on: playing })}
    ${key('', `<b style="font-size:15px;letter-spacing:.04em">${spec.meter || '4/4'}</b><span style="color:#e7d3a4;font-size:13px">♩</span>`, layout.meter, {})}
    ${key('', ICONS.options, layout.pockt, { down: down === 'opt' })}
    <div class="panel" style="left:${layout.faceRail.x}px;top:${layout.faceRail.y}px;width:${layout.faceRail.w}px;height:${layout.faceRail.h}px;border-radius:14px"></div>
    ${nav}
  </div></body></html>`;
}

function shrink(rect, _pad) {
  const side = Math.min(rect.w, rect.h, 48);
  return { x: rect.x + (rect.w - side) / 2, y: rect.y + (rect.h - side) / 2, w: side, h: side };
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

async function shot(page, spec) {
  await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: 2 });
  await page.setContent(screen(spec), { waitUntil: 'load' });
  return PNG.sync.read(await page.screenshot({ type: 'png' }));
}

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  ensure(out);
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  const standard = { w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
  const small = { w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 } };
  const mid = { w: 375, h: 812, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
  const pro = { w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 } };
  const dirs = ['FULL', 'DIAL', 'BUTTONS', 'BEATS', 'NAV', 'DETAIL', 'LAYOUT'];
  dirs.forEach((name) => ensure(path.join(out, name)));

  const rest = await shot(page, { ...standard, bpm: 120 });
  const running = await shot(page, { ...standard, bpm: 120, playing: true, beat: 0 });
  const smallFrame = await shot(page, { ...small, bpm: 120 });
  const midFrame = await shot(page, { ...mid, bpm: 120 });
  const proFrame = await shot(page, { ...pro, bpm: 120 });
  fs.writeFileSync(path.join(out, 'FULL', 'standard-rest.png'), PNG.sync.write(rest));
  fs.writeFileSync(path.join(out, 'FULL', 'standard-running.png'), PNG.sync.write(running));
  fs.writeFileSync(path.join(out, 'FULL', 'small-rest.png'), PNG.sync.write(smallFrame));
  fs.writeFileSync(path.join(out, 'FULL', 'pro-max-rest.png'), PNG.sync.write(proFrame));
  fs.writeFileSync(path.join(out, 'LAYOUT', '375-rest.png'), PNG.sync.write(midFrame));
  fs.writeFileSync(path.join(out, 'LAYOUT', '393-rest.png'), PNG.sync.write(await shot(page, { w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 }, bpm: 120 })));

  const L = computeFoundationLayout(standard.w, standard.h, standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  for (const bpm of [20, 60, 120, 160, 240, 320, 400]) {
    const frame = bpm === 120 ? rest : await shot(page, { ...standard, bpm });
    fs.writeFileSync(path.join(out, 'DIAL', `${bpm}.png`), crop(frame, L.dial, 2));
  }
  const playDown = await shot(page, { ...standard, bpm: 120, down: 'play' });
  const tapDown = await shot(page, { ...standard, bpm: 120, down: 'tap' });
  fs.writeFileSync(path.join(out, 'BUTTONS', 'play-rest.png'), crop(rest, L.play, 2, 6));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'play-down.png'), crop(playDown, L.play, 2, 6));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'play-latched.png'), crop(running, L.play, 2, 6));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'tap-rest.png'), crop(rest, L.tap, 2, 6));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'tap-down.png'), crop(tapDown, L.tap, 2, 6));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'minus-rest.png'), crop(rest, L.bpmMinus, 2, 4));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'minus-down.png'), crop(await shot(page, { ...standard, bpm: 120, down: 'minus' }), L.bpmMinus, 2, 4));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'plus-rest.png'), crop(rest, L.bpmPlus, 2, 4));
  fs.writeFileSync(path.join(out, 'BUTTONS', 'plus-down.png'), crop(await shot(page, { ...standard, bpm: 120, down: 'plus' }), L.bpmPlus, 2, 4));

  const beatL = L.beats;
  const accents = ['soft', 'normal', 'strong'];
  for (const [name, index] of accents.map((level, i) => [level, i])) {
    const quiet = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'] });
    const peaked = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'], peak: index });
    const rect = { x: beatL.x + (beatL.w / 4) * index, y: beatL.y, w: beatL.w / 4, h: beatL.h };
    fs.writeFileSync(path.join(out, 'BEATS', `beat-${name}-rest.png`), crop(quiet, rect, 2));
    fs.writeFileSync(path.join(out, 'BEATS', `beat-${name}-peak.png`), crop(peaked, rect, 2));
  }
  const navOn = await shot(page, { ...standard, bpm: 120, nav: 'dial' });
  const navOff = await shot(page, { ...standard, bpm: 120, nav: 'pulse' });
  fs.writeFileSync(path.join(out, 'NAV', 'selected.png'), crop(navOn, { x: L.faceRail.x, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  fs.writeFileSync(path.join(out, 'NAV', 'unselected.png'), crop(navOff, { x: L.faceRail.x, y: L.faceRail.y, w: L.faceRail.w / 6, h: L.faceRail.h }, 2, 2));
  fs.writeFileSync(path.join(out, 'DETAIL', 'header.png'), crop(rest, { x: 0, y: standard.insets.top, w: standard.w, h: L.tuner.h + 8 }, 2));
  fs.writeFileSync(path.join(out, 'DETAIL', 'tempo.png'), crop(rest, { x: 0, y: L.bpmMinus.y - 6, w: standard.w, h: Math.max(L.bpmMinus.h, L.bpmHit.h) + 12 }, 2));
  fs.writeFileSync(path.join(out, 'DETAIL', 'dial.png'), crop(rest, L.dial, 2));
  fs.writeFileSync(path.join(out, 'DETAIL', 'beat-panel.png'), crop(rest, L.beats, 2, 4));
  fs.writeFileSync(path.join(out, 'DETAIL', 'transport.png'), crop(rest, L.transport, 2, 8));
  fs.writeFileSync(path.join(out, 'DETAIL', 'nav.png'), crop(rest, L.faceRail, 2, 4));
  await browser.close();
  console.log('visual gate 2 proofs', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
