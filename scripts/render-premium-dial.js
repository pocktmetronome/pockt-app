'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout, faceplateApertures, FACEPLATE_FRAMES } = require('../lib/compute-foundation-layout.ts');
const { dialAngleDeg } = require('../lib/dial-scale-geometry.js');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'premium-dial');
const blend = path.join(out, 'blender');
const assets = path.join(root, 'assets', 'premium-dial');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ART = {
  plate: (w, h) => `assets/premium-dial/faceplate-${w}x${h}.png`,
  wordmark: 'assets/north-star-v3/pockt_wordmark_northstar.png',
  center: 'assets/premium-dial/dial-center.png',
  ring: 'assets/premium-dial/dial-ring.png',
  primary: 'assets/premium-dial/cap-primary.png',
  secondary: 'assets/premium-dial/cap-secondary.png',
  utility: 'assets/premium-dial/cap-utility.png',
  nav: 'assets/premium-dial/cap-nav.png',
  lamp: 'assets/premium-dial/lamp-fixture.png',
  mark: 'assets/north-star-v3/pockt_p_mark_transparent.png',
};

function src(rel) {
  return '/' + rel.replace(/\\/g, '/');
}

function arcPath(endDeg, size) {
  const r = size * (162 / 456);
  const c = size / 2;
  const start = -135;
  const sweep = endDeg - start;
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [c + Math.sin(rad) * r, c - Math.cos(rad) * r];
  };
  const a = point(start);
  const b = point(endDeg);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} A ${r} ${r} 0 ${large} ${sweep >= 0 ? 1 : 0} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

function navSize(slot, width) {
  const pad = width < 360 ? 8 : 4;
  let size = width < 360 ? 8 : 9;
  while (size > 6.5 && textWidth('PENDULUM', size) > slot - pad) size -= 0.25;
  return size;
}

function screen(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const apertures = faceplateApertures(layout, 4);
  const turn = dialAngleDeg(spec.bpm ?? 120);
  const slot = layout.faceRail.w / 6;
  const font = navSize(slot, spec.w);
  const accents = spec.accents || ['strong', 'normal', 'normal', 'normal'];
  const playing = Boolean(spec.playing);
  const down = spec.down || '';
  const plate = ART.plate(spec.w, spec.h);
  const lamps = apertures.sockets.map((socket, index) => {
    const level = accents[index] || 'normal';
    const hot = playing && spec.beat === index;
    const rest = level === 'mute' ? 0.02 : level === 'soft' ? 0.08 : level === 'strong' ? 0.22 : 0.12;
    const opacity = hot ? 0.95 : rest;
    const scale = hot ? 0.34 : level === 'strong' ? 0.2 : 0.14;
    return `<div class="lamp" style="left:${socket.x}px;top:${socket.y}px;width:${socket.w}px;height:${socket.h}px">
      <img src="${src(ART.lamp)}" alt="">
      <i style="opacity:${opacity};width:${scale * 100}%;height:${scale * 100}%"></i>
    </div>`;
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
    return `<div class="nav${on ? ' on' : ''}${down === id ? ' down' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px">
      <img src="${src(ART.nav)}" alt="">
      <span style="font-size:${font}px">${label}</span>
      ${on ? '<u></u>' : ''}
    </div>`;
  }).join('');
  const glyph = (name) => {
    const icons = {
      tuner: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M35 18v31c0 10 7 18 15 18s15-8 15-18V18"/><path d="M50 67v17"/></svg>',
      sound: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 58h14l16 14V28L36 42H22z"/><path d="M64 40c5 5 5 15 0 20"/><path d="M74 32c10 10 10 26 0 36"/></svg>',
      minus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M28 50h44"/></svg>',
      plus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 28v44M28 50h44"/></svg>',
      play: '<svg viewBox="0 0 100 100"><path d="M36 24L74 50 36 76Z" fill="currentColor"/></svg>',
      pause: '<svg viewBox="0 0 100 100"><rect x="34" y="28" width="10" height="44" fill="currentColor"/><rect x="56" y="28" width="10" height="44" fill="currentColor"/></svg>',
    };
    return icons[name] || '';
  };
  const round = (name, box) => {
    const pressed = down === name;
    return `<div class="key round ${pressed ? 'down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img src="${src(ART.utility)}" alt=""><em>${glyph(name)}</em></div>`;
  };
  const key = (name, box, inner, kind) => {
    const pressed = down === name;
    const art = kind === 'primary' ? ART.primary : ART.secondary;
    return `<div class="key ${kind} ${pressed ? 'down' : ''}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img src="${src(art)}" alt=""><em>${inner}</em></div>`;
  };
  const meter = spec.meter || '4/4';
  const sub = spec.sub || '1/4';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;position:relative;color:#f4efe6;font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;background:#090807 url('${src(plate)}') 0 0 / ${spec.w}px ${spec.h}px no-repeat}
    img{display:block;width:100%;height:100%;object-fit:fill}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;display:flex;align-items:center;justify-content:center}
    .brand img{height:42%;width:auto;object-fit:contain}
    .key{position:absolute}
    .key em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;color:#f6f1e8}
    .key em svg{width:46%;height:46%}
    .key.down{transform:translateY(3px);filter:brightness(.72) contrast(1.05)}
    .primary em{letter-spacing:.16em;font-weight:650;font-size:${Math.max(12, Math.round(layout.play.h * 0.22))}px}
    .secondary em{font-weight:650;font-size:${Math.max(11, Math.round(layout.meter.h * 0.2))}px;line-height:1.05;text-align:center;flex-direction:column}
    .secondary small{display:block;margin-top:3px;letter-spacing:.14em;font-size:.72em;color:#c6a36a}
    .readout{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px}
    .readout b{position:absolute;left:0;right:0;top:42%;transform:translateY(-54%);text-align:center;font-weight:640;font-variant-numeric:tabular-nums;letter-spacing:-0.04em;font-size:${Math.round(layout.bpmHit.h * 0.62)}px;color:#f7f3ea}
    .readout span{position:absolute;left:0;right:0;top:68%;text-align:center;font-size:${Math.max(9, Math.round(layout.bpmHit.h * 0.16))}px;letter-spacing:.42em;font-weight:650;color:#c6a36a}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px}
    .dial img{position:absolute;inset:0}
    .dial .ring{transform:rotate(${turn}deg);transform-origin:50% 50%}
    .dial svg{position:absolute;inset:0;width:100%;height:100%}
    .lamp{position:absolute}
    .lamp i{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 42% 38%, #fff6e4 0%, #ffb45a 28%, #c47a28 58%, rgba(80,32,8,0) 78%)}
    .nav{position:absolute;display:flex;align-items:flex-end;justify-content:center;color:#8d867c}
    .nav img{position:absolute;left:8%;top:8%;width:84%;height:70%;object-fit:fill;opacity:.9}
    .nav span{position:relative;z-index:1;margin-bottom:16%;font-weight:650;letter-spacing:.06em}
    .nav u{position:absolute;left:50%;bottom:10%;width:16px;height:2px;margin-left:-8px;background:#c6a36a}
    .nav.on{color:#f4efe6}
    .nav.down{transform:translateY(2px);filter:brightness(.8)}
  </style></head><body>
    <div class="brand"><img src="${src(ART.wordmark)}" alt="POCKT"></div>
    ${round('tuner', layout.tuner)}
    ${round('sound', layout.sound)}
    ${round('minus', layout.bpmMinus)}
    ${round('plus', layout.bpmPlus)}
    <div class="dial">
      <img class="center" src="${src(ART.center)}" alt="">
      <img class="ring" src="${src(ART.ring)}" alt="">
      <svg viewBox="0 0 ${layout.dial.w} ${layout.dial.h}"><path d="${arcPath(turn, layout.dial.w)}" fill="none" stroke="#c6a36a" stroke-width="${Math.max(2, layout.dial.w * 0.008)}" stroke-linecap="round" opacity="0.9"/></svg>
    </div>
    <div class="readout"><b>${spec.bpm ?? 120}</b><span>BPM</span></div>
    ${lamps}
    ${key('loop', apertures.loop, 'LOOP', 'secondary')}
    ${key('tap', layout.tap, 'TAP', 'primary')}
    ${key('play', layout.play, playing ? glyph('pause') : glyph('play'), 'primary')}
    ${key('meter', layout.meter, `${meter}<small>${sub}</small>`, 'secondary')}
    ${key('p', layout.pockt, `<img src="${src(ART.mark)}" alt="P" style="width:46%;height:46%;object-fit:contain">`, 'secondary')}
    ${nav}
  </body></html>`;
}

function listen(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^[/\\]+/, '');
      const file = path.normalize(path.join(dir, rel));
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200);
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function blank(w, h) {
  return PNG.sync.write(new PNG({ width: w, height: h }));
}

function copyAsset(fromName, toName) {
  const from = path.join(blend, fromName);
  if (!fs.existsSync(from)) throw new Error(`missing blender output ${fromName}`);
  fs.copyFileSync(from, path.join(assets, toName));
}

function fitPlate(name, w, h) {
  const source = PNG.sync.read(fs.readFileSync(path.join(blend, name)));
  const png = new PNG({ width: w, height: h });
  const sx = source.width / w;
  const sy = source.height / h;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      for (let yy = y0; yy < y1 && yy < source.height; yy += 1) {
        for (let xx = x0; xx < x1 && xx < source.width; xx += 1) {
          const so = (yy * source.width + xx) * 4;
          r += source.data[so];
          g += source.data[so + 1];
          b += source.data[so + 2];
          n += 1;
        }
      }
      const o = (y * w + x) * 4;
      png.data[o] = Math.round(r / n);
      png.data[o + 1] = Math.round(g / n);
      png.data[o + 2] = Math.round(b / n);
      png.data[o + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function stitchHorizontal(files, labels) {
  const images = files.map((file) => PNG.sync.read(fs.readFileSync(file)));
  const h = Math.max(...images.map((image) => image.height));
  const w = images.reduce((sum, image) => sum + image.width, 0);
  const png = new PNG({ width: w, height: h + 36 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 12;
    png.data[i + 1] = 11;
    png.data[i + 2] = 10;
    png.data[i + 3] = 255;
  }
  let x0 = 0;
  images.forEach((image) => {
    PNG.bitblt(image, png, 0, 0, image.width, image.height, x0, 28);
    x0 += image.width;
  });
  return PNG.sync.write(png);
}

function cropFile(file, rect) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const w = Math.min(png.width - x, rect.w);
  const h = Math.min(png.height - y, rect.h);
  const next = new PNG({ width: w, height: h });
  PNG.bitblt(png, next, x, y, w, h, 0, 0);
  return PNG.sync.write(next);
}

async function main() {
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  copyAsset('dial-ring.png', 'dial-ring.png');
  copyAsset('dial-center.png', 'dial-center.png');
  copyAsset('hero-dial.png', 'hero-dial.png');
  copyAsset('cap-primary.png', 'cap-primary.png');
  copyAsset('cap-secondary.png', 'cap-secondary.png');
  copyAsset('cap-utility.png', 'cap-utility.png');
  copyAsset('cap-nav.png', 'cap-nav.png');
  copyAsset('lamp-off.png', 'lamp-fixture.png');
  fs.writeFileSync(path.join(assets, 'dial-scale.png'), blank(64, 64));
  fs.writeFileSync(path.join(assets, 'dial-shadow.png'), blank(64, 64));
  fs.writeFileSync(path.join(assets, 'dial-boss.png'), blank(64, 64));

  const phones = {
    320: { w: 320, h: 568, insets: FACEPLATE_FRAMES['320x568'].insets, bpm: 120 },
    375: { w: 375, h: 667, insets: FACEPLATE_FRAMES['375x667'].insets, bpm: 120 },
    390: { w: 390, h: 844, insets: FACEPLATE_FRAMES['390x844'].insets, bpm: 120 },
    393: { w: 393, h: 852, insets: FACEPLATE_FRAMES['393x852'].insets, bpm: 120 },
    430: { w: 430, h: 932, insets: FACEPLATE_FRAMES['430x932'].insets, bpm: 120 },
  };
  for (const spec of Object.values(phones)) {
    const bytes = fitPlate(`faceplate-${spec.w}x${spec.h}.png`, spec.w, spec.h);
    const rel = `faceplate-${spec.w}x${spec.h}.png`;
    fs.writeFileSync(path.join(assets, rel), bytes);
    fs.writeFileSync(path.join(root, 'assets', 'faceplate', rel), bytes);
  }
  fs.copyFileSync(path.join(assets, 'faceplate-390x844.png'), path.join(out, 'FACEPLATE_ONLY.png'));

  const levels = ['off', 'l1', 'l2', 'l3', 'peak'].map((name) => path.join(blend, `lamp-${name}.png`));
  fs.writeFileSync(path.join(out, 'BEAT_LIGHT_LEVELS.png'), stitchHorizontal(levels));
  fs.copyFileSync(path.join(blend, 'hero-dial.png'), path.join(out, 'HERO_DIAL_DETAIL.png'));
  const caps = ['cap-utility.png', 'cap-primary.png', 'cap-secondary.png', 'cap-nav.png'].map((name) => path.join(blend, name));
  fs.writeFileSync(path.join(out, 'BUTTON_DETAIL.png'), stitchHorizontal(caps));

  const server = await listen(root);
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}`;
  const original = page.setContent.bind(page);
  page.setContent = (html, options) => original(html.replaceAll('src="/', `src="${base}/`).replaceAll("url('/", `url('${base}/`), options);
  async function shot(spec) {
    await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: 1 });
    await page.setContent(screen(spec), { waitUntil: 'load', timeout: 120000 });
    return PNG.sync.read(await page.screenshot({ type: 'png' }));
  }
  const face = await shot(phones[390]);
  const running = await shot({ ...phones[390], playing: true, beat: 0, down: '' });
  fs.writeFileSync(path.join(out, 'CURRENT_FACE_FOR_GREGG_PREMIUM.png'), PNG.sync.write(face));
  fs.writeFileSync(path.join(out, 'CURRENT_RUNNING_FOR_GREGG_PREMIUM.png'), PNG.sync.write(running));
  const qa = {};
  for (const [name, spec] of Object.entries(phones)) {
    const png = name === '390' ? face : await shot(spec);
    const file = path.join(out, 'proofs', `${name}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
    qa[name] = png.width === spec.w && png.height === spec.h ? 'PASS' : 'FAIL';
  }
  const pressed = await shot({ ...phones[390], down: 'play' });
  const looped = await shot({ ...phones[390], playing: true, beat: 2, nav: 'pulse', meter: '6/8', sub: '1/8' });
  fs.writeFileSync(path.join(out, 'LIVE_STATE_BOARD.png'), stitchHorizontal([
    path.join(out, 'CURRENT_FACE_FOR_GREGG_PREMIUM.png'),
    path.join(out, 'CURRENT_RUNNING_FOR_GREGG_PREMIUM.png'),
  ]));
  fs.writeFileSync(path.join(out, 'proofs', 'play-down.png'), PNG.sync.write(pressed));
  fs.writeFileSync(path.join(out, 'proofs', 'alt-state.png'), PNG.sync.write(looped));
  const L = computeFoundationLayout(390, 844, phones[390].insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const seam = new PNG({ width: 1170, height: 390 });
  const crops = [
    { x: L.dial.x + L.dial.w - 80, y: L.dial.y + 20, w: 120, h: 120 },
    { x: L.play.x - 8, y: L.play.y - 8, w: L.play.w + 16, h: L.play.h + 16 },
    { x: L.beats.x + 40, y: L.beats.y - 6, w: 140, h: L.beats.h + 12 },
    { x: L.faceRail.x, y: L.faceRail.y - 8, w: 140, h: L.faceRail.h + 16 },
  ];
  crops.forEach((rect, index) => {
    const piece = PNG.sync.read(cropFile(path.join(out, 'CURRENT_FACE_FOR_GREGG_PREMIUM.png'), rect));
    const scale = Math.min(280 / piece.width, 360 / piece.height);
    const dw = Math.round(piece.width * scale);
    const dh = Math.round(piece.height * scale);
    for (let y = 0; y < dh; y += 1) {
      for (let x = 0; x < dw; x += 1) {
        const sx = Math.min(piece.width - 1, Math.floor(x / scale));
        const sy = Math.min(piece.height - 1, Math.floor(y / scale));
        const so = (sy * piece.width + sx) * 4;
        const dx = index * 292 + 8 + x;
        const dy = 16 + y;
        if (dx >= seam.width || dy >= seam.height) continue;
        const o = (dy * seam.width + dx) * 4;
        seam.data[o] = piece.data[so];
        seam.data[o + 1] = piece.data[so + 1];
        seam.data[o + 2] = piece.data[so + 2];
        seam.data[o + 3] = 255;
      }
    }
  });
  fs.writeFileSync(path.join(out, 'SEAM_INSPECTION.png'), PNG.sync.write(seam));
  const directions = ['A', 'B', 'C'].map((key) => path.join(blend, `direction-${key}.png`));
  if (directions.every((file) => fs.existsSync(file))) {
    fs.writeFileSync(path.join(out, 'POCKT_DIAL_DIRECTIONS.png'), stitchHorizontal(directions));
  }
  const boards = fs.readdirSync(blend).filter((name) => name.startsWith('board-') && name.endsWith('.png')).sort();
  if (boards.length) {
    const images = boards.map((name) => PNG.sync.read(fs.readFileSync(path.join(blend, name))));
    const cols = 5;
    const cell = 280;
    const rows = Math.ceil(images.length / cols);
    const sheet = new PNG({ width: cols * cell, height: rows * cell });
    for (let i = 0; i < sheet.data.length; i += 4) {
      sheet.data[i] = 8;
      sheet.data[i + 1] = 8;
      sheet.data[i + 2] = 8;
      sheet.data[i + 3] = 255;
    }
    images.forEach((image, index) => {
      const scale = Math.min(cell / image.width, cell / image.height);
      const dw = Math.round(image.width * scale);
      const dh = Math.round(image.height * scale);
      const ox = (index % cols) * cell + Math.round((cell - dw) / 2);
      const oy = Math.floor(index / cols) * cell + Math.round((cell - dh) / 2);
      for (let y = 0; y < dh; y += 1) {
        for (let x = 0; x < dw; x += 1) {
          const sx = Math.min(image.width - 1, Math.floor(x / scale));
          const sy = Math.min(image.height - 1, Math.floor(y / scale));
          const so = (sy * image.width + sx) * 4;
          const dx = ox + x;
          const dy = oy + y;
          const o = (dy * sheet.width + dx) * 4;
          sheet.data[o] = image.data[so];
          sheet.data[o + 1] = image.data[so + 1];
          sheet.data[o + 2] = image.data[so + 2];
          sheet.data[o + 3] = 255;
        }
      }
    });
    fs.writeFileSync(path.join(out, 'KNOB_GEOMETRY_BOARD.png'), PNG.sync.write(sheet));
  }
  fs.writeFileSync(path.join(out, 'width-qa.json'), JSON.stringify(qa, null, 2));
  await browser.close();
  server.close();
  console.log(JSON.stringify(qa));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
