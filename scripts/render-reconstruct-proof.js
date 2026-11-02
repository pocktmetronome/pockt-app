'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'reconstruct-proof');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;

const SHOTS = [
  ['pulse-stopped', 'shot=pulse-stopped&playing=0', 400],
  ['pulse-early', 'shot=pulse-active&playing=1', 220],
  ['pulse-mid', 'shot=pulse-active&playing=1', 480],
  ['pulse-outer', 'shot=pulse-active&playing=1', 860],
  ['pendulum-stopped', 'shot=pendulum&playing=0', 500],
  ['pro-44', 'shot=pro&meter=4/4&playing=1', 600],
  ['pro-78', 'shot=pro&meter=7/8&playing=1', 600],
  ['pro-128', 'shot=pro&meter=12/8&playing=1', 600],
  ['beatline-44', 'shot=beatline&meter=4/4&playing=1', 600],
  ['beatline-78', 'shot=beatline&meter=7/8&playing=1', 600],
  ['beatline-128', 'shot=beatline&meter=12/8&playing=1', 600],
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
    await page.setViewport({ width: 480, height: 560, deviceScaleFactor: 2 });
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    for (const [name, query, wait] of SHOTS) {
      await page.goto(`${base}/face-pass-proof?${query}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="face-proof-ready"]', { timeout: 90000 });
      await sleep(wait);
      const target = path.join(outDir, `${name}.png`);
      const clip = await page.evaluate(() => {
        const node = document.querySelector('[data-testid="face-proof-ready"]');
        const rect = node.getBoundingClientRect();
        return { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height };
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
