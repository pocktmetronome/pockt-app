'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'beat-deck-proof');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;

const SHOTS = [
  ['01-beats', 'beats'],
  ['02-flip', 'flip'],
  ['03-deck', 'deck'],
  ['04-recording', 'recording'],
  ['05-ready', 'ready'],
  ['06-playing', 'playing'],
  ['07-paused', 'paused'],
  ['08-loop', 'loop'],
  ['09-beats-kept', 'beats'],
];

function browserPath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 220, deviceScaleFactor: 2 });
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    for (const [file, state] of SHOTS) {
      await page.goto(`${base}/beat-deck-proof?state=${state}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="beat-deck-ready"]', { timeout: 90000 });
      await sleep(400);
      const target = path.join(outDir, `${file}.png`);
      const clip = await page.evaluate(() => {
        const node = document.querySelector('[data-testid="beat-deck-ready"]');
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      await page.screenshot({ path: target, clip });
      console.log(target);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
