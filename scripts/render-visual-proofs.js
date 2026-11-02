'use strict';

/**
 * Development-only capture of the visual proof route.
 * Renders the production FoundationDialRoom and face components in Expo Web.
 * Uses the system Edge/Chrome binary. Does not download a browser.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'visual-proof');
const port = Number(process.env.POCKT_PROOF_PORT || 8091);
const base = `http://127.0.0.1:${port}`;

const SHOTS = [
  '01_DIAL_STOPPED',
  '02_DIAL_PLAYING',
  '03_RHYTHM_STOPPED_4-4',
  '04_RHYTHM_BEAT1_4-4',
  '05_RHYTHM_BEAT3_4-4',
  '06_RHYTHM_7-8',
  '07_RHYTHM_12-8',
  '08_PULSE_STOPPED',
  '09_PULSE_ORIGIN',
  '10_PULSE_25_PERCENT',
  '11_PULSE_50_PERCENT',
  '12_PULSE_75_PERCENT',
  '13_PULSE_MULTIPLE_WAVES',
  '14_PENDULUM_CENTER',
  '15_PENDULUM_LEFT',
  '16_PENDULUM_RIGHT',
  '17_PENDULUM_GRABBED',
  '18_PRO_STOPPED_4-4',
  '19_PRO_PLAYING_4-4',
  '20_PRO_7-8',
  '21_PRO_12-8',
  '22_BEATLINE_STOPPED_4-4',
  '23_BEATLINE_BEAT1_4-4',
  '24_BEATLINE_BEAT3_4-4',
  '25_BEATLINE_7-8',
  '26_BEATLINE_12-8',
  '27_TUNER_NO_PITCH',
  '28_TUNER_E3_MINUS25',
  '29_TUNER_E3_MINUS5',
  '30_TUNER_E3_IN_TUNE',
  '31_TUNER_E3_PLUS5',
  '32_TUNER_E3_PLUS25',
];

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
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    for (const id of SHOTS) {
      await page.goto(`${base}/visual-proof?shot=${id}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 60000 });
      await sleep(700);
      const file = path.join(outDir, `${id}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }

    await page.setViewport({ width: 1170, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${base}/visual-proof?sheet=faces`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 60000 });
    await sleep(1200);
    const faces = path.join(outDir, 'POCKT_FACE_REVIEW.png');
    await page.screenshot({ path: faces, fullPage: true });
    console.log(faces);

    await page.goto(`${base}/visual-proof?sheet=motion`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 60000 });
    await sleep(1200);
    const motion = path.join(outDir, 'POCKT_MOTION_STATES_REVIEW.png');
    await page.screenshot({ path: motion, fullPage: true });
    console.log(motion);
  } finally {
    const forceExit = setTimeout(() => process.exit(0), 8000);
    if (browser) await browser.close().catch(() => undefined);
    expo.kill();
    clearTimeout(forceExit);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
