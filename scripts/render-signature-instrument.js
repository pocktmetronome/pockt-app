'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { computeFoundationLayout, faceplateApertures, FACEPLATE_FRAMES } = require('../lib/compute-foundation-layout.ts');
const { dialAngleDeg } = require('../lib/dial-scale-geometry.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'signature-instrument');
const blend = path.join(out, 'blender');
const assets = path.join(root, 'assets', 'signature-instrument');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const classic = path.join(root, 'THIRD_PARTY_UI', 'Classic Audio - Standard', '01 Standard');

function fit(file, w, h) {
  const source = PNG.sync.read(fs.readFileSync(file));
  const png = new PNG({ width: w, height: h });
  const sx = source.width / w;
  const sy = source.height / h;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
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
          a += source.data[so + 3];
          n += 1;
        }
      }
      const o = (y * w + x) * 4;
      png.data[o] = Math.round(r / n);
      png.data[o + 1] = Math.round(g / n);
      png.data[o + 2] = Math.round(b / n);
      png.data[o + 3] = Math.round(a / n);
    }
  }
  return png;
}

function crop(png, rect, scale) {
  const x = Math.max(0, Math.round(rect.x * scale));
  const y = Math.max(0, Math.round(rect.y * scale));
  const w = Math.min(png.width - x, Math.round(rect.w * scale));
  const h = Math.min(png.height - y, Math.round(rect.h * scale));
  const next = new PNG({ width: w, height: h });
  PNG.bitblt(png, next, x, y, w, h, 0, 0);
  return next;
}

function write(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function blank(w, h) {
  return new PNG({ width: w, height: h });
}

function listen(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^[/\\]+/, '');
      const file = rel.startsWith('classic/')
        ? path.normalize(path.join(classic, rel.slice('classic/'.length)))
        : path.normalize(path.join(dir, rel));
      const rootDir = rel.startsWith('classic/') ? classic : dir;
      if (!file.startsWith(rootDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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

function arc(turn, size) {
  const r = size * 0.4;
  const c = size / 2;
  const start = -135;
  const sweep = turn - start;
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [c + Math.sin(rad) * r, c - Math.cos(rad) * r];
  };
  const a = point(start);
  const b = point(turn);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} A ${r} ${r} 0 ${large} ${sweep >= 0 ? 1 : 0} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

function screen(spec) {
  const layout = computeFoundationLayout(spec.w, spec.h, spec.insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const apertures = faceplateApertures(layout, 4);
  const turn = dialAngleDeg(spec.bpm ?? 120);
  const slot = layout.faceRail.w / 6;
  const plate = `/assets/signature-instrument/faceplate-${spec.w}x${spec.h}.png`;
  const levels = { mute: 0, soft: 0.22, normal: 0.48, strong: 0.72 };
  const lamps = apertures.sockets.map((socket, index) => {
    const level = (spec.accents || ['strong', 'normal', 'normal', 'normal'])[index];
    const hot = spec.playing && spec.beat === index;
    const opacity = hot ? 1 : levels[level] ?? 0.48;
    return `<div class="lamp" style="left:${socket.x}px;top:${socket.y}px;width:${socket.w}px;height:${socket.h}px"><i style="opacity:${opacity}"></i></div>`;
  }).join('');
  const nav = ['DIAL', 'RHYTHM', 'PULSE', 'PENDULUM', 'PRO', 'BEATLINE'].map((label, index) => {
    const on = (spec.nav || 'DIAL') === label;
    return `<div class="nav${on ? ' on' : ''}" style="left:${layout.faceRail.x + slot * index}px;top:${layout.faceRail.y}px;width:${slot}px;height:${layout.faceRail.h}px"><span>${label}</span>${on ? '<u></u>' : ''}</div>`;
  }).join('');
  const glyph = {
    tuner: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M35 18v31c0 10 7 18 15 18s15-8 15-18V18"/><path d="M50 67v17"/></svg>',
    sound: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M22 58h14l16 14V28L36 42H22z"/><path d="M64 40c5 5 5 15 0 20"/></svg>',
    minus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M28 50h44"/></svg>',
    plus: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><path d="M50 28v44M28 50h44"/></svg>',
    play: '<svg viewBox="0 0 100 100"><path d="M38 26L74 50 38 74Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 100 100"><rect x="34" y="28" width="10" height="44" fill="currentColor"/><rect x="56" y="28" width="10" height="44" fill="currentColor"/></svg>',
  };
  const cap = (name, box, inner, art) => {
    const down = spec.down === name ? ' down' : '';
    return `<div class="key${down}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px"><img src="/assets/signature-instrument/${art}.png" alt=""><em>${inner}</em></div>`;
  };
  return `<!doctype html><html><head><style>
    *{box-sizing:border-box} html,body{margin:0}
    body{width:${spec.w}px;height:${spec.h}px;overflow:hidden;position:relative;background:#1a1816 url('${plate}') 0 0 / ${spec.w}px ${spec.h}px no-repeat;color:#f4efe6;font-family:"Segoe UI",sans-serif}
    img{width:100%;height:100%;object-fit:fill}
    .brand{position:absolute;left:${layout.identity.x}px;top:${layout.identity.y}px;width:${layout.identity.w}px;height:${layout.identity.h}px;display:flex;align-items:center;justify-content:center}
    .brand img{height:46%;width:auto;object-fit:contain}
    .key{position:absolute} .key em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:650;letter-spacing:.14em;font-size:13px}
    .key em svg{width:42%;height:42%}
    .key.down{transform:translateY(3px);filter:brightness(.72)}
    .dial{position:absolute;left:${layout.dial.x}px;top:${layout.dial.y}px;width:${layout.dial.w}px;height:${layout.dial.h}px}
    .dial img{position:absolute;inset:0;width:100%;height:100%;transform:rotate(${turn}deg);object-fit:contain}
    .dial svg{position:absolute;inset:0}
    .read{position:absolute;left:${layout.bpmHit.x}px;top:${layout.bpmHit.y}px;width:${layout.bpmHit.w}px;height:${layout.bpmHit.h}px;text-align:center}
    .read b{display:block;font-size:${Math.round(layout.readout.h * 0.92)}px;font-weight:640;letter-spacing:-.04em;line-height:.9}
    .read span{display:block;margin-top:2px;color:#c6a36a;letter-spacing:.42em;font-size:${Math.max(9, Math.round(layout.bpmLabel.h * 0.7))}px;font-weight:650}
    .lamp{position:absolute} .lamp i{position:absolute;left:22%;top:22%;width:56%;height:56%;border-radius:50%;background:radial-gradient(circle at 42% 38%, #fff1d2 0%, #e7a24a 42%, rgba(120,60,10,0) 74%)}
    .nav{position:absolute;display:flex;align-items:flex-end;justify-content:center;color:#8d867c;font-size:8px;font-weight:650;letter-spacing:.04em}
    .nav span{margin-bottom:18%} .nav u{position:absolute;left:50%;bottom:12%;width:14px;height:2px;margin-left:-7px;background:#c6a36a}
    .nav.on{color:#f4efe6}
    .loop{font-size:10px;letter-spacing:.16em}
  </style></head><body>
    <div class="brand"><img src="/assets/north-star-v3/pockt_wordmark_northstar.png" alt="POCKT"></div>
    ${cap('tuner', layout.tuner, glyph.tuner, 'cap-tuner')}
    ${cap('sound', layout.sound, glyph.sound, 'cap-sound')}
    ${cap('minus', layout.bpmMinus, glyph.minus, 'cap-minus')}
    ${cap('plus', layout.bpmPlus, glyph.plus, 'cap-plus')}
    <div class="dial"><img src="/assets/signature-instrument/dial-ring.png" alt=""><svg viewBox="0 0 ${layout.dial.w} ${layout.dial.h}"><path d="${arc(turn, layout.dial.w)}" fill="none" stroke="#c6a36a" stroke-width="2.5" stroke-linecap="round"/></svg></div>
    <div class="read"><b>${spec.bpm ?? 120}</b><span>BPM</span></div>
    ${lamps}
    ${cap('loop', apertures.loop, 'LOOP', 'cap-loop')}
    ${cap('tap', layout.tap, 'TAP', 'cap-tap')}
    ${cap('play', layout.play, spec.playing ? glyph.pause : glyph.play, 'cap-play')}
    ${cap('meter', layout.meter, `${spec.meter || '4/4'}<small style="display:block;color:#c6a36a;letter-spacing:.12em;font-size:9px">${spec.sub || '1/4'}</small>`, 'cap-meter')}
    ${cap('p', layout.pockt, '<img src="/assets/north-star-v3/pockt_p_mark_transparent.png" alt="P" style="width:42%;height:42%">', 'cap-p')}
    ${nav}
  </body></html>`;
}

async function main() {
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.join(out, 'proofs'), { recursive: true });
  const master = fit(path.join(blend, 'signature-master-3x.png'), 390, 844);
  write(path.join(out, 'SIGNATURE_MASTER_RENDER.png'), master);
  write(path.join(blend, 'signature-master-390.png'), master);

  const layout = computeFoundationLayout(390, 844, FACEPLATE_FRAMES['390x844'].insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const apertures = faceplateApertures(layout, 4);
  const ring = PNG.sync.read(fs.readFileSync(path.join(blend, 'dial-ring.png')));
  const ringScale = ring.width / 390;
  write(path.join(assets, 'dial-ring.png'), crop(ring, layout.dial, ringScale));
  const caps = PNG.sync.read(fs.readFileSync(path.join(blend, 'caps.png')));
  const capScale = caps.width / 390;
  const names = { tuner: 'cap-tuner', sound: 'cap-sound', bpmMinus: 'cap-minus', bpmPlus: 'cap-plus', tap: 'cap-tap', play: 'cap-play', meter: 'cap-meter', pockt: 'cap-p' };
  for (const [key, name] of Object.entries(names)) write(path.join(assets, `${name}.png`), crop(caps, layout[key], capScale));
  write(path.join(assets, 'cap-loop.png'), crop(caps, apertures.loop, capScale));
  write(path.join(assets, 'cap-nav.png'), blank(8, 8));
  write(path.join(assets, 'dial-center.png'), blank(8, 8));
  write(path.join(assets, 'dial-scale.png'), blank(8, 8));
  write(path.join(assets, 'dial-shadow.png'), blank(8, 8));
  write(path.join(assets, 'dial-boss.png'), blank(8, 8));
  write(path.join(assets, 'lamp-fixture.png'), crop(PNG.sync.read(fs.readFileSync(path.join(blend, 'faceplate-390x844.png'))), apertures.sockets[0], 3));

  for (const [key, frame] of Object.entries(FACEPLATE_FRAMES)) {
    const file = path.join(blend, `faceplate-${key}.png`);
    const png = fit(file, frame.w, frame.h);
    write(path.join(assets, `faceplate-${key}.png`), png);
    write(path.join(root, 'assets', 'faceplate', `faceplate-${key}.png`), png);
  }

  const server = await listen(root);
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${port}`;
  const original = page.setContent.bind(page);
  page.setContent = (html, options) => original(html.replaceAll("url('/", `url('${base}/`).replaceAll('src="/', `src="${base}/`), options);
  async function shot(spec, file) {
    await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: 1 });
    await page.setContent(screen(spec), { waitUntil: 'load', timeout: 120000 });
    const png = PNG.sync.read(await page.screenshot({ type: 'png' }));
    write(file, png);
    return png;
  }
  const faceSpec = { w: 390, h: 844, insets: FACEPLATE_FRAMES['390x844'].insets, bpm: 120 };
  const face = await shot(faceSpec, path.join(out, 'CURRENT_FACE_FOR_GREGG_SIGNATURE.png'));
  fs.copyFileSync(path.join(out, 'CURRENT_FACE_FOR_GREGG_SIGNATURE.png'), path.join(out, 'SIGNATURE_MASTER_RENDER.png'));
  await shot({ ...faceSpec, playing: true, beat: 0 }, path.join(out, 'CURRENT_RUNNING_FOR_GREGG_SIGNATURE.png'));
  const qa = {};
  for (const [key, frame] of Object.entries(FACEPLATE_FRAMES)) {
    const png = key === '390x844' ? face : await shot({ w: frame.w, h: frame.h, insets: frame.insets, bpm: 120 }, path.join(out, 'proofs', `${frame.w}.png`));
    qa[frame.w] = png.width === frame.w && png.height === frame.h ? 'PASS' : 'FAIL';
  }
  fs.mkdirSync(path.join(out, 'proofs'), { recursive: true });
  const pressed = await shot({ ...faceSpec, down: 'play' }, path.join(out, 'proofs', 'play-down.png'));
  write(path.join(out, 'BUTTON_PRESS_STATES.png'), (() => {
    const a = crop(face, layout.play, 1);
    const b = crop(pressed, layout.play, 1);
    const sheet = new PNG({ width: a.width * 2 + 24, height: a.height + 16 });
    PNG.bitblt(a, sheet, 0, 0, a.width, a.height, 8, 8);
    PNG.bitblt(b, sheet, 0, 0, b.width, b.height, a.width + 16, 8);
    return sheet;
  })());
  write(path.join(out, 'HERO_DIAL_SIGNATURE_DETAIL.png'), crop(face, { x: layout.dial.x - 8, y: layout.dial.y - 8, w: layout.dial.w + 16, h: layout.dial.h + 16 }, 1));
  write(path.join(out, 'TRANSPORT_DETAIL.png'), crop(face, { x: layout.transport.x - 8, y: layout.transport.y - 8, w: layout.transport.w + 16, h: layout.transport.h + 16 }, 1));
  write(path.join(out, 'BEAT_OPTICS_DETAIL.png'), crop(face, { x: layout.beats.x, y: layout.beats.y - 6, w: layout.beats.w, h: layout.beats.h + 12 }, 1));
  write(path.join(out, 'NAV_DETAIL.png'), crop(face, { x: 0, y: layout.navBar.y, w: 390, h: layout.navBar.h }, 1));
  write(path.join(out, 'SEAM_INSPECTION.png'), crop(face, { x: layout.dial.x, y: layout.dial.y + layout.dial.h - 30, w: layout.dial.w, h: layout.beats.y - (layout.dial.y + layout.dial.h) + 70 }, 1));
  write(path.join(out, 'PURCHASED_MESH_PROOF.png'), fit(path.join(blend, 'mesh-proof.png'), 1200, 675));
  fs.writeFileSync(path.join(out, 'width-qa.json'), JSON.stringify(qa, null, 2));

  const refs = [
    ['Kontakt/Assets/button_middle_off.png', 'Kontakt/Assets/button_middle_on.png'],
    ['Kontakt/Assets/button_small_off.png', 'Kontakt/Assets/button_small_on.png'],
    ['Kontakt/Assets/button_drum-pad_off.png', 'Kontakt/Assets/button_drum-pad_on.png'],
    ['Kontakt/Assets/led_off.png', 'Kontakt/Assets/led_on.png'],
    ['Preview_1.jpg', 'Preview_2.jpg'],
  ];
  const cells = refs.flat().map((rel) => `<img src="/classic/${rel}">`).join('');
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>body{margin:0;background:#111;display:flex;flex-wrap:wrap;gap:12px;padding:16px}img{height:180px;width:auto;background:#000}</style>${cells}`.replaceAll('src="/', `src="${base}/`), { waitUntil: 'load', timeout: 120000 });
  fs.writeFileSync(path.join(out, 'CLASSIC_AUDIO_REFERENCE_SHEET.png'), await page.screenshot({ type: 'png' }));
  const levels = ['off', 'l1', 'l2', 'l3', 'peak'];
  const opacities = [0, 0.22, 0.48, 0.72, 1];
  await page.setViewport({ width: 900, height: 180, deviceScaleFactor: 1 });
  const lamp = apertures.sockets[0];
  const fixture = crop(PNG.sync.read(fs.readFileSync(path.join(blend, 'faceplate-390x844.png'))), lamp, 3);
  write(path.join(out, 'proofs', 'lamp.png'), fixture);
  await page.setContent(`<!doctype html><style>body{margin:0;background:#111;display:flex;gap:18px;padding:24px}.f{width:120px;height:120px;position:relative;background:#111 url('${base}/artifacts/signature-instrument/proofs/lamp.png') center/contain no-repeat}i{position:absolute;left:22%;top:22%;width:56%;height:56%;border-radius:50%;background:radial-gradient(circle at 42% 38%, #fff1d2, #e7a24a 46%, transparent 76%)}</style>${opacities.map((opacity) => `<div class="f"><i style="opacity:${opacity}"></i></div>`).join('')}`, { waitUntil: 'load', timeout: 60000 });
  fs.writeFileSync(path.join(out, 'BEAT_LIGHT_LEVELS.png'), await page.screenshot({ type: 'png' }));
  void levels;
  await browser.close();
  server.close();
  console.log(JSON.stringify(qa));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
