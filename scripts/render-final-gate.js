'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { angleFromNorthStarBpm, NORTH_STAR_MARKS } = require('../lib/native-interaction-math.ts');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'final-rescue', 'proofs');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function deg(bpm) {
  return (angleFromNorthStarBpm(bpm) * 180) / Math.PI;
}

function dialHtml(bpm, size) {
  const ticks = [];
  for (let i = 0; i <= 30; i += 1) {
    const turn = -135 + i * 9;
    const major = i % 3 === 0;
    const rad = (turn * Math.PI) / 180;
    const label = major ? NORTH_STAR_MARKS[i / 3] : '';
    ticks.push(
      `<div class="arm" style="transform:rotate(${turn}deg)"><i class="${major ? 'major' : ''}"></i></div>` +
        (major ? `<div class="num" style="left:${50 + Math.sin(rad) * 33}%;top:${50 - Math.cos(rad) * 33}%">${label}</div>` : '')
    );
  }
  return `<div class="dial" style="width:${size}px;height:${size}px">
    <div class="bezel"><div class="face">
      ${ticks.join('')}
      <div class="needle" style="transform:rotate(${deg(bpm)}deg)"></div>
      <div class="boss"></div>
    </div></div>
  </div>`;
}

const ICONS = {
  fork: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 3v8a4 4 0 0 0 8 0V3M12 15v6" fill="none" stroke="#f4efe6" stroke-width="1.7" stroke-linecap="round"/></svg>',
  speaker: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 10h4l5-4v12l-5-4H4zM16 9a4 4 0 0 1 0 6" fill="none" stroke="#f4efe6" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>',
};

function button(label, opts) {
  const down = opts.down ? ' down' : '';
  const latched = opts.latched ? ' latched' : '';
  const round = opts.round ? ' round' : '';
  const nav = opts.nav ? ' nav' : '';
  const strong = opts.strong ? ' strong' : '';
  return `<div class="key${round}${nav}${down}${latched}${strong}" style="left:${opts.x}px;top:${opts.y}px;width:${opts.w}px;height:${opts.h}px">${label}</div>`;
}

function screen(spec) {
  const insets = spec.insets;
  const layout = computeFoundationLayout(spec.w, spec.h, insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const peak = spec.peak;
  const down = spec.down || '';
  const playing = Boolean(spec.playing);
  const edge = 36;
  const cells = accents.map((level, index) => {
    const inner = layout.beats.w - edge * 2 - 8;
    const colW = inner / accents.length;
    const disc = Math.min(colW * 0.72, layout.beats.h * 0.62);
    const x = layout.beats.x + edge + 4 + colW * index + (colW - disc) / 2;
    const y = layout.beats.y + (layout.beats.h - disc) * 0.32;
    const hot = peak === index || (playing && spec.beat === index);
    return `<div class="beat ${level}${hot ? ' peak' : ''}" style="left:${x}px;top:${y}px;width:${disc}px;height:${disc}px"><i></i><b>${index + 1}</b></div>`;
  });
  const nav = ['DIAL', 'RHYTHM', 'PULSE', 'PENDULUM', 'PRO', 'BEATLINE'];
  const slot = layout.faceRail.w / nav.length;
  const navHtml = nav
    .map((name, index) => {
      const on = index === 0;
      return `<div class="key nav${on ? ' latched strong' : ''}" style="left:${layout.faceRail.x + slot * index + 3}px;top:${layout.faceRail.y + 6}px;width:${slot - 6}px;height:${layout.faceRail.h - 12}px">${name}</div>`;
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#0e0d0c;font-family:"Segoe UI",sans-serif;overflow:hidden}
    .stage{position:relative;width:${spec.w}px;height:${spec.h}px;background:linear-gradient(#1c1b18,#100e0c 55%,#0c0b0a);color:#f3eee4}
    .word{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;display:flex;align-items:center;justify-content:center;color:#e7d3a4;letter-spacing:7px;font-weight:600;font-size:22px}
    .key{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;border-radius:14px;background:linear-gradient(#2a261f,#12100e);border:1px solid rgba(198,163,106,.85);color:#f4efe6;font-weight:650;letter-spacing:1px;box-shadow:0 3px 5px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.18);font-size:15px}
    .key.round{border-radius:999px}
    .key.nav{border-radius:8px;font-size:9px;letter-spacing:.4px;background:#161411;border-color:rgba(198,163,106,.35);box-shadow:none;color:#b7aa96}
    .key.latched{transform:translateY(1px);box-shadow:0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)}
    .key.strong{border-color:#e7d3a4;color:#f6efe2;background:linear-gradient(#3a3124,#1a1612)}
    .key.down{transform:translateY(2px);filter:brightness(.82);box-shadow:0 1px 1px rgba(0,0,0,.3), inset 0 2px 3px rgba(0,0,0,.35)}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px;border-radius:12px;background:#0c0b0a;border:1px solid rgba(158,128,77,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 2px 6px rgba(0,0,0,.55)}
    .readout b{font-size:${Math.round(layout.bpmHit.h * 0.42)}px;font-variant-numeric:tabular-nums;font-weight:800;letter-spacing:0;line-height:.9}
    .readout span{font-size:10px;letter-spacing:3px;color:#c6a36a;font-weight:700}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px}
    .bezel{width:100%;height:100%;border-radius:50%;background:linear-gradient(160deg,#e7d3a4,#c6a36a 42%,#7c6238);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.45)}
    .face{position:relative;width:91%;height:91%;border-radius:50%;background:radial-gradient(circle at 50% 42%,#2a261f,#141210 62%,#0c0b0a);box-shadow:inset 0 0 0 2px rgba(0,0,0,.45)}
    .arm{position:absolute;inset:0}
    .arm i{position:absolute;left:50%;top:6%;width:1px;height:5%;margin-left:-0.5px;background:rgba(231,211,164,.5)}
    .arm i.major{top:4%;height:8%;width:2px;margin-left:-1px;background:#e7d3a4}
    .num{position:absolute;transform:translate(-50%,-50%);color:#e7d3a4;font-size:${Math.max(10, Math.round(layout.dial.w * 0.038))}px;font-variant-numeric:tabular-nums;font-weight:560}
    .needle{position:absolute;left:50%;top:24%;width:3px;height:26%;margin-left:-1.5px;background:linear-gradient(#f3e6c8,#c6a36a);border-radius:2px;transform-origin:50% 100%;box-shadow:1px 2px 2px rgba(0,0,0,.45)}
    .boss{position:absolute;left:50%;top:50%;width:14%;height:14%;margin:-7% 0 0 -7%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f0e2c4,#c6a36a 45%,#7c6238);box-shadow:0 0 0 4px rgba(0,0,0,.45)}
    .beat{position:absolute;border-radius:50%;background:linear-gradient(#241f1a,#100e0c);border:1.5px solid rgba(114,92,58,.8);box-shadow:inset 0 2px 3px rgba(0,0,0,.45), 0 2px 3px rgba(0,0,0,.35)}
    .beat.strong{border-color:#e0c48a}
    .beat.soft{border-color:rgba(90,74,48,.7)}
    .beat i{position:absolute;left:30%;top:30%;width:40%;height:40%;border-radius:50%;background:radial-gradient(circle,#fff6e0,#ffb24a 45%,rgba(255,140,40,0) 72%)}
    .beat.soft i{opacity:.28}
    .beat.normal i{opacity:.42}
    .beat.strong i{opacity:.62}
    .beat.peak i{opacity:1;box-shadow:0 0 8px 2px rgba(255,176,70,.55)}
    .beat b{position:absolute;left:0;right:0;bottom:-14px;text-align:center;color:#e7d3a4;font-size:10px}
  </style></head><body><div class="stage">
    ${button(ICONS.fork, { x: layout.tuner.x + 8, y: layout.tuner.y + 8, w: layout.tuner.w - 16, h: layout.tuner.h - 16, round: true })}
    <div class="word">POCKT</div>
    ${button(ICONS.speaker, { x: layout.sound.x + 8, y: layout.sound.y + 8, w: layout.sound.w - 16, h: layout.sound.h - 16, round: true })}
    ${button('−', { x: layout.bpmMinus.x, y: layout.bpmMinus.y, w: layout.bpmMinus.w, h: layout.bpmMinus.h, round: true, down: down === 'minus' })}
    <div class="readout"><b>${String(spec.bpm).padStart(3, '\u2007')}</b><span>BPM</span></div>
    ${button('+', { x: layout.bpmPlus.x, y: layout.bpmPlus.y, w: layout.bpmPlus.w, h: layout.bpmPlus.h, round: true, down: down === 'plus' })}
    ${dialHtml(spec.bpm, layout.dial.w)}
    ${button('LED', { x: layout.beats.x, y: layout.beats.y + (layout.beats.h - 36) / 2, w: 34, h: 34, round: true })}
    ${cells.join('')}
    ${button('LOOP', { x: layout.beats.x + layout.beats.w - 40, y: layout.beats.y + (layout.beats.h - 36) / 2, w: 40, h: 34, round: true })}
    ${button('TAP', { x: layout.tap.x, y: layout.tap.y, w: layout.tap.w, h: layout.tap.h, down: down === 'tap' })}
    ${button(playing ? '❚❚' : '▶', { x: layout.play.x, y: layout.play.y, w: layout.play.w, h: layout.play.h, down: down === 'play', latched: playing })}
    ${button(`${spec.meter || '4/4'}\n♩`, { x: layout.meter.x, y: layout.meter.y, w: layout.meter.w, h: layout.meter.h })}
    ${button('OPT', { x: layout.pockt.x, y: layout.pockt.y, w: layout.pockt.w, h: layout.pockt.h })}
    ${navHtml}
  </div></body></html>`;
}

function crop(png, rect, scale) {
  const x = Math.max(0, Math.round(rect.x * scale));
  const y = Math.max(0, Math.round(rect.y * scale));
  const w = Math.min(png.width - x, Math.round(rect.w * scale));
  const h = Math.min(png.height - y, Math.round(rect.h * scale));
  const next = new PNG({ width: Math.max(1, w), height: Math.max(1, h) });
  PNG.bitblt(png, next, x, y, next.width, next.height, 0, 0);
  return PNG.sync.write(next);
}

async function shot(page, spec) {
  await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: 2 });
  await page.setContent(screen(spec), { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png' });
  return PNG.sync.read(buf);
}

async function main() {
  ensure(out);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--hide-scrollbars', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const standard = { w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
  const fullDir = path.join(out, 'FULL SCREEN');
  const dialDir = path.join(out, 'DIAL');
  const buttonDir = path.join(out, 'BUTTONS');
  const beatDir = path.join(out, 'BEATS');
  const layoutDir = path.join(out, 'LAYOUT');
  [fullDir, dialDir, buttonDir, beatDir, layoutDir].forEach(ensure);

  const rest = await shot(page, { ...standard, bpm: 120, playing: false });
  fs.writeFileSync(path.join(fullDir, '120-rest.png'), PNG.sync.write(rest));
  const running = await shot(page, { ...standard, bpm: 120, playing: true, beat: 0 });
  fs.writeFileSync(path.join(fullDir, '120-running.png'), PNG.sync.write(running));

  const layout = computeFoundationLayout(standard.w, standard.h, standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  for (const bpm of [20, 60, 120, 160, 240, 320, 400]) {
    const frame = await shot(page, { ...standard, bpm, playing: false });
    fs.writeFileSync(path.join(dialDir, `${bpm}.png`), crop(frame, layout.dial, 2));
  }

  const playRest = await shot(page, { ...standard, bpm: 120 });
  fs.writeFileSync(path.join(buttonDir, 'play-rest.png'), crop(playRest, layout.play, 2));
  fs.writeFileSync(path.join(buttonDir, 'tap-rest.png'), crop(playRest, layout.tap, 2));
  fs.writeFileSync(path.join(buttonDir, 'plus-rest.png'), crop(playRest, layout.bpmPlus, 2));
  fs.writeFileSync(path.join(buttonDir, 'minus-rest.png'), crop(playRest, layout.bpmMinus, 2));
  const playDown = await shot(page, { ...standard, bpm: 120, down: 'play' });
  fs.writeFileSync(path.join(buttonDir, 'play-down.png'), crop(playDown, layout.play, 2));
  const tapDown = await shot(page, { ...standard, bpm: 120, down: 'tap' });
  fs.writeFileSync(path.join(buttonDir, 'tap-down.png'), crop(tapDown, layout.tap, 2));
  const plusDown = await shot(page, { ...standard, bpm: 120, down: 'plus' });
  fs.writeFileSync(path.join(buttonDir, 'plus-down.png'), crop(plusDown, layout.bpmPlus, 2));
  const minusDown = await shot(page, { ...standard, bpm: 120, down: 'minus' });
  fs.writeFileSync(path.join(buttonDir, 'minus-down.png'), crop(minusDown, layout.bpmMinus, 2));
  fs.writeFileSync(path.join(buttonDir, 'play-running.png'), crop(running, layout.play, 2));

  const beats = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'], peak: 2 });
  const beatLayout = computeFoundationLayout(standard.w, standard.h, standard.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const col = (beatLayout.beats.w - 80) / 4;
  const beatX = beatLayout.beats.x + 40;
  const levels = ['soft', 'normal', 'strong'];
  levels.forEach((level, index) => {
    const rect = {
      x: beatX + col * index,
      y: beatLayout.beats.y,
      w: col,
      h: beatLayout.beats.h,
    };
    fs.writeFileSync(path.join(beatDir, `beat-${level}-rest.png`), crop(beats, rect, 2));
  });
  const peaked = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'], peak: 0 });
  fs.writeFileSync(path.join(beatDir, 'beat-soft-peak.png'), crop(peaked, { x: beatX, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));
  const peakN = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'], peak: 1 });
  fs.writeFileSync(path.join(beatDir, 'beat-normal-peak.png'), crop(peakN, { x: beatX + col, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));
  const peakS = await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'], peak: 2 });
  fs.writeFileSync(path.join(beatDir, 'beat-strong-peak.png'), crop(peakS, { x: beatX + col * 2, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));
  fs.writeFileSync(path.join(beatDir, 'beat-strong-rest.png'), crop(await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'] }), { x: beatX + col * 2, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));
  fs.writeFileSync(path.join(beatDir, 'beat-normal-rest.png'), crop(await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'] }), { x: beatX + col, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));
  fs.writeFileSync(path.join(beatDir, 'beat-soft-rest.png'), crop(await shot(page, { ...standard, bpm: 120, accents: ['soft', 'normal', 'strong', 'mute'] }), { x: beatX, y: beatLayout.beats.y, w: col, h: beatLayout.beats.h }, 2));

  const phones = [
    ['small-iphone.png', { w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 } }],
    ['standard-iphone.png', standard],
    ['pro-max.png', { w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 } }],
  ];
  for (const [name, spec] of phones) {
    const frame = await shot(page, { ...spec, bpm: 120, playing: false });
    fs.writeFileSync(path.join(layoutDir, name), PNG.sync.write(frame));
  }
  await browser.close();
  console.log('final gate proofs written', out);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
