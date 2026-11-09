import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.EXP004_URL ?? 'http://127.0.0.1:4173/experiments/EXP-004-salas-irregulares/';
const SHOTS = resolve('artifacts/TASK-0040/attempt-2/screenshots');
const SEED = 5;
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function pageFor(dpr) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}?test=1&seed=${SEED}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
  await page.evaluate(() => {
    window.__experiment.setParams({ variant: 'growth', showDebug: true, showDoors: true, showSpawn: true, showEnemies: true });
    window.__experiment.setSeed(5);
  });
  await page.waitForFunction(() => document.querySelectorAll('canvas[data-rendered="true"]').length >= 3);
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('[data-testid="stage-growth"]')?.scrollIntoView({ block: 'center' }));
  return { page, context };
}

const normal = await pageFor(1);
await normal.page.screenshot({ path: resolve(SHOTS, 'growth-seed-5-cavern-debug-page.png') });
await normal.context.close();

const zoom = await pageFor(2);
const canvas = zoom.page.locator('[data-testid="canvas-growth"]');
const box = await canvas.boundingBox();
if (!box) {
  errors.push('sin caja para growth seed 5');
} else {
  const split = box.height * 0.68;
  await zoom.page.screenshot({
    path: resolve(SHOTS, 'growth-seed-5-cavern-fullmap-zoom.png'),
    clip: { x: box.x, y: box.y, width: box.width, height: split },
  });
  await zoom.page.screenshot({
    path: resolve(SHOTS, 'growth-seed-5-cavern-13x13-zoom.png'),
    clip: { x: box.x, y: box.y + split, width: box.width, height: box.height - split },
  });
}
await zoom.context.close();
await browser.close();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Capturas de la semilla 5 guardadas');
}
