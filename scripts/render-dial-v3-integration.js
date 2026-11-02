'use strict';

/**
 * Captures the production Dial face after PhotoDialV3 integration.
 * Uses the system Edge/Chrome binary. Does not download a browser.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { dialInstrumentFrame } = require('../lib/dial-frame.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-v3-integration');
const approved = path.join(root, 'artifacts', 'dial-photo-v3-final3', 'proof-dial-320.png');
const port = Number(process.env.POCKT_PROOF_PORT || 8094);
const base = `http://127.0.0.1:${port}`;

function proofInsets(height) {
  if (height < 700) return { top: 20, bottom: 0, left: 0, right: 0 };
  return { top: 47, bottom: 34, left: 0, right: 0 };
}

function browserPath() {
  const candidates = [
    process.env.POCKT_PROOF_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base);
      if (response.ok || response.status < 500) return;
    } catch {
      /* metro still booting */
    }
    await sleep(1000);
  }
  throw new Error('Expo web did not become reachable');
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function crop(src, x, y, w, h) {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const width = Math.min(src.width - left, Math.round(w));
  const height = Math.min(src.height - top, Math.round(h));
  const out = new PNG({ width, height });
  for (let row = 0; row < height; row += 1) {
    const srcStart = ((top + row) * src.width + left) * 4;
    const dstStart = row * width * 4;
    src.data.copy(out.data, dstStart, srcStart, srcStart + width * 4);
  }
  return out;
}

function resize(src, size) {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    const sy = ((y + 0.5) * src.height) / size - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(src.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < size; x += 1) {
      const sx = ((x + 0.5) * src.width) / size - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(src.width - 1, x0 + 1);
      const fx = sx - x0;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 4; c += 1) {
        const a = src.data[(y0 * src.width + x0) * 4 + c];
        const b = src.data[(y0 * src.width + x1) * 4 + c];
        const d = src.data[(y1 * src.width + x0) * 4 + c];
        const e = src.data[(y1 * src.width + x1) * 4 + c];
        const top = a + (b - a) * fx;
        const bot = d + (e - d) * fx;
        out.data[i + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

function sideBySide(left, right) {
  const gap = 16;
  const out = new PNG({ width: left.width + gap + right.width, height: Math.max(left.height, right.height) });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 18;
    out.data[i + 1] = 16;
    out.data[i + 2] = 14;
    out.data[i + 3] = 255;
  }
  const blit = (src, ox) => {
    for (let y = 0; y < src.height; y += 1) {
      for (let x = 0; x < src.width; x += 1) {
        const s = (y * src.width + x) * 4;
        const d = (y * out.width + ox + x) * 4;
        const a = src.data[s + 3] / 255;
        for (let c = 0; c < 3; c += 1) out.data[d + c] = Math.round(src.data[s + c] * a + out.data[d + c] * (1 - a));
        out.data[d + 3] = 255;
      }
    }
  };
  blit(left, 0);
  blit(right, left.width + gap);
  return out;
}

async function shot(page, { file, width, height, bpm, hold }) {
  const url = `${base}/visual-proof?shot=01_DIAL_STOPPED&bpm=${bpm}&width=${width}&height=${height}&cb=${Date.now()}`;
  await page.setViewport({ width: Math.max(width, 390), height: height + 40, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  try {
    await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 60000 });
  } catch (error) {
    const body = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? '');
    console.error('PROOF PAGE TEXT', body);
    throw error;
  }
  await page.waitForSelector('[data-testid="pockt-3-foundation"]', { timeout: 60000 });
  await sleep(1600);
  if (hold) {
    const handle = await page.$(`[aria-label="${hold}"]`);
    if (!handle) throw new Error(`missing control ${hold}`);
    const box = await handle.boundingBox();
    if (!box) throw new Error(`no box for ${hold}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await sleep(250);
  }
  const foundation = await page.$('[data-testid="pockt-3-foundation"]');
  await foundation.screenshot({ path: file });
  if (hold) await page.mouse.up();
  console.log(file);
  return file;
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found for the proof capture');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const expo = spawn('npx', ['expo', 'start', '--web', '--port', String(port)], {
    cwd: root,
    shell: true,
    env: { ...process.env, CI: '1', BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  expo.stdout.on('data', (chunk) => process.stdout.write(chunk));
  expo.stderr.on('data', (chunk) => process.stderr.write(chunk));
  let browser;
  try {
    await waitForServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', (error) => console.error('PAGE', error));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error('BROWSER', message.text());
    });
    const screens = [
      ['dial-screen-320.png', 320, 568, 120],
      ['dial-screen-390.png', 390, 844, 120],
      ['dial-screen-40.png', 390, 844, 40],
      ['dial-screen-120.png', 390, 844, 120],
      ['dial-screen-300.png', 390, 844, 300],
      ['dial-screen-midturn.png', 390, 844, 150],
    ];
    for (const [name, width, height, bpm] of screens) {
      await shot(page, { file: path.join(outDir, name), width, height, bpm });
    }
    await shot(page, {
      file: path.join(outDir, 'dial-plus-down.png'),
      width: 390,
      height: 844,
      bpm: 120,
      hold: 'Increase tempo by one BPM',
    });
    await shot(page, {
      file: path.join(outDir, 'dial-minus-down.png'),
      width: 390,
      height: 844,
      bpm: 120,
      hold: 'Decrease tempo by one BPM',
    });

    const live = readPng(path.join(outDir, 'dial-screen-390.png'));
    const layout = computeFoundationLayout(390, 844, proofInsets(844));
    const frame = dialInstrumentFrame(390, layout);
    const dial = resize(crop(live, frame.x, frame.y, frame.w, frame.h), 320);
    const reference = readPng(approved);
    writePng(path.join(outDir, 'reference-vs-integrated-dial.png'), sideBySide(reference, dial));
    const corner = (png, x, y) => {
      const i = (y * png.width + x) * 4;
      return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
    };
    const raw = crop(live, frame.x, frame.y, frame.w, frame.h);
    console.log('dial frame', frame);
    console.log('crop corner', corner(raw, 2, 2));
    console.log('crop center', corner(raw, Math.round(raw.width / 2), Math.round(raw.height / 2)));
    console.log('wrote comparison');
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    expo.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
