import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE =
  process.env.EXP004_URL ??
  'http://127.0.0.1:4173/experiments/EXP-004-salas-irregulares/';
const OUT = resolve('artifacts/TASK-0042/attempt-1');
const SHOTS = resolve(OUT, 'screenshots');
const SEEDS = [2, 5, 8, 17, 23, 40, 56, 279837264];
const VARIANTS = ['growth', 'bsp', 'templates'];
const EXIT_MODES = ['door', 'stairs-down', 'stairs-up', 'random'];
const EXIT_SEEDS = { growth: 11, bsp: 12, templates: 3 };

await mkdir(SHOTS, { recursive: true });

const health = await fetch(BASE, { redirect: 'follow' });
if (!health.ok) {
  throw new Error(`El servidor de Vite no responde en ${BASE} (${health.status}).`);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const datasets = [];

async function openPage() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`${BASE}?test=1&seed=${SEEDS[0]}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
  return { page, context };
}

async function select(page, variant, seed, options = {}) {
  const payload = {
    variant,
    showDebug: options.debug ?? false,
    showDoors: true,
    showSpawn: true,
    showEnemies: true,
    hiddenEnemyChance: 0.5,
    exitMode: options.exitMode ?? 'random',
  };
  await page.evaluate(
    ({ payload, seed }) => {
      window.__experiment.setParams(payload);
      window.__experiment.setSeed(seed);
    },
    { payload, seed },
  );
  await page.waitForFunction(
    ({ variant, seed, debug }) => {
      const canvas = document.querySelector(`[data-testid="canvas-${variant}"]`);
      return (
        canvas?.dataset.rendered === 'true' &&
        canvas?.dataset.variant === variant &&
        canvas?.dataset.seed === String(seed) &&
        canvas?.dataset.debug === String(debug)
      );
    },
    { variant, seed, debug: payload.showDebug },
  );
  await page.waitForTimeout(160);
  await page.evaluate((variant) => {
    document
      .querySelector(`[data-testid="stage-${variant}"]`)
      ?.scrollIntoView({ block: 'center', inline: 'center' });
  }, variant);
  await page.waitForTimeout(80);
}

async function datasetFor(page, variant) {
  return page.evaluate((variant) => {
    const canvas = document.querySelector(`[data-testid="canvas-${variant}"]`);
    return canvas ? { ...canvas.dataset } : null;
  }, variant);
}

/**
 * Copia la región del canvas (mapa completo o vista 13×13) a un PNG 1280×720.
 * Así la captura es exactamente la resolución pedida y no depende del layout.
 */
async function captureRegion(page, variant, mode, path) {
  const dataUrl = await page.evaluate(
    ({ variant, mode }) => {
      const source = document.querySelector(`[data-testid="canvas-${variant}"]`);
      if (!source) return null;
      const split = Math.floor(source.height * 0.68);
      const region =
        mode === 'play'
          ? { x: 0, y: split + 4, width: source.width, height: source.height - split - 4 }
          : { x: 0, y: 0, width: source.width, height: split };
      const out = document.createElement('canvas');
      out.width = 1280;
      out.height = 720;
      const ctx = out.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#080b10';
      ctx.fillRect(0, 0, 1280, 720);
      const scale = Math.min(1280 / region.width, 720 / region.height);
      const width = region.width * scale;
      const height = region.height * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        source,
        region.x,
        region.y,
        region.width,
        region.height,
        (1280 - width) / 2,
        (720 - height) / 2,
        width,
        height,
      );
      return out.toDataURL('image/png');
    },
    { variant, mode },
  );
  if (!dataUrl) return false;
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return true;
}

const main = await openPage();
for (const seed of SEEDS) {
  for (const variant of VARIANTS) {
    await select(main.page, variant, seed, { debug: false });
    datasets.push({
      seed,
      variant,
      phase: 'normal',
      dataset: await datasetFor(main.page, variant),
    });
    await main.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${seed}-normal.png`),
    });

    await select(main.page, variant, seed, { debug: true });
    datasets.push({
      seed,
      variant,
      phase: 'debug',
      dataset: await datasetFor(main.page, variant),
    });
    await main.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${seed}-debug.png`),
    });
  }
}

const decision = await main.page.evaluate(() => window.__experiment.getExportData());
await writeFile(resolve(OUT, 'decision-example.json'), `${JSON.stringify(decision, null, 2)}\n`);
await main.context.close();

const zoom = await openPage();
for (const seed of SEEDS) {
  for (const variant of VARIANTS) {
    await select(zoom.page, variant, seed, { debug: true });
    const rendered = await captureRegion(
      zoom.page,
      variant,
      'map',
      resolve(SHOTS, `${variant}-seed-${seed}-debug-zoom.png`),
    );
    if (!rendered) errors.push(`no se pudo capturar el mapa de ${variant} · ${seed}`);
  }
}

for (const variant of VARIANTS) {
  const seed = EXIT_SEEDS[variant];
  for (const exitMode of EXIT_MODES) {
    await select(zoom.page, variant, seed, { debug: true, exitMode });
    datasets.push({
      seed,
      variant,
      phase: `exitMode-${exitMode}`,
      dataset: await datasetFor(zoom.page, variant),
    });
    const rendered = await captureRegion(
      zoom.page,
      variant,
      'map',
      resolve(SHOTS, `${variant}-seed-${seed}-exitMode-${exitMode}.png`),
    );
    if (!rendered) errors.push(`no se pudo capturar ${variant} · ${exitMode}`);
  }
}

for (const seed of SEEDS) {
  for (const variant of VARIANTS) {
    await select(zoom.page, variant, seed, { debug: true });
    const rendered = await captureRegion(
      zoom.page,
      variant,
      'play',
      resolve(SHOTS, `${variant}-seed-${seed}-13x13.png`),
    );
    if (!rendered) errors.push(`no se pudo capturar la vista 13×13 de ${variant} · ${seed}`);
  }
}
await zoom.context.close();
await browser.close();

await writeFile(
  resolve(OUT, 'capture-log.txt'),
  `${JSON.stringify(
    {
      base: BASE,
      seeds: SEEDS,
      variants: VARIANTS,
      exitModes: EXIT_MODES,
      errors,
      datasets,
    },
    null,
    2,
  )}\n`,
);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Capturas A/B/C normal/debug/zoom/13×13 y exitMode en ${SHOTS}`);
}
