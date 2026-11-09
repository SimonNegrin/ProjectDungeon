import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.EXP004_URL ?? 'http://127.0.0.1:4173/experiments/EXP-004-salas-irregulares/';
const OUT = resolve('artifacts/TASK-0040/attempt-1');
const SHOTS = resolve(OUT, 'screenshots');
const VARIANTS = ['growth', 'bsp', 'templates'];

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(`${BASE}?test=1&seed=279837264`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
await page.waitForFunction(
  () => document.querySelectorAll('canvas[data-rendered="true"]').length >= 3,
);

const seedsByVariant = await page.evaluate(() => {
  const api = window.__experiment;
  const variants = ['growth', 'bsp', 'templates'];
  const result = {};
  for (const variant of variants) result[variant] = { cavern: null, wide: null, normal: [] };

  for (let seed = 1; seed <= 90; seed += 1) {
    api.setSeed(seed);
    const maps = api.getMaps();
    for (const variant of variants) {
      const map = maps.find((entry) => entry.variant === variant);
      if (!map?.stats) continue;
      if (!result[variant].cavern && map.stats.cavernRooms > 0) result[variant].cavern = seed;
      if (!result[variant].wide && map.stats.wideCount > 0) result[variant].wide = seed;
      if (result[variant].normal.length < 4) result[variant].normal.push(seed);
    }
  }

  for (const variant of variants) {
    const used = new Set(
      [result[variant].cavern, result[variant].wide, ...result[variant].normal].filter(Boolean),
    );
    const seeds = [];
    if (result[variant].cavern) seeds.push(result[variant].cavern);
    if (result[variant].wide && !seeds.includes(result[variant].wide)) {
      seeds.push(result[variant].wide);
    }
    for (let seed = 1; seeds.length < 4 && seed <= 90; seed += 1) {
      if (used.has(seed)) continue;
      seeds.push(seed);
    }
    result[variant].seeds = seeds;
  }
  return result;
});

const chosen = {};
for (const variant of VARIANTS) {
  const info = seedsByVariant[variant];
  chosen[variant] = info.seeds;
  console.log(
    `${variant}: cavern=${info.cavern} wide=${info.wide} seeds=${info.seeds.join(',')}`,
  );
}

async function apply(variant, seed, debug) {
  await page.evaluate(
    ({ variant, seed, debug }) => {
      window.__experiment.setParams({
        variant,
        showDebug: debug,
        showDoors: true,
        showSpawn: true,
        showEnemies: true,
      });
      window.__experiment.setSeed(seed);
    },
    { variant, seed, debug },
  );
  await page.waitForFunction(
    () => document.querySelectorAll('canvas[data-rendered="true"]').length >= 3,
  );
  await page.waitForTimeout(120);
  await page.evaluate((variant) => {
    document
      .querySelector(`[data-testid="stage-${variant}"]`)
      ?.scrollIntoView({ block: 'center' });
  }, variant);
  await page.waitForTimeout(80);
}

async function shot(name) {
  const path = resolve(SHOTS, name);
  await page.screenshot({ path });
  return path;
}

// Vista general de la comparación A/B/C.
await page.evaluate(() => window.scrollTo(0, 0));
await apply('growth', chosen.growth[0], false);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('overview-comparison.png');

for (const variant of VARIANTS) {
  const info = seedsByVariant[variant];
  for (const seed of chosen[variant]) {
    const labels = [];
    if (seed === info.cavern) labels.push('cavern');
    if (seed === info.wide) labels.push('wide');
    const tag = labels.length > 0 ? `${labels.join('-')}-` : '';

    await apply(variant, seed, false);
    await shot(`${variant}-seed-${seed}-${tag}normal.png`);

    await apply(variant, seed, true);
    await shot(`${variant}-seed-${seed}-${tag}debug.png`);
  }
}

// JSON de decisión/export del ejemplo.
await apply('growth', chosen.growth[0], false);
const decision = await page.evaluate(() => window.__experiment.getExportData());
await writeFile(resolve(OUT, 'decision-example.json'), `${JSON.stringify(decision, null, 2)}\n`);

let exportOk = false;
try {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.click('[data-testid="export-data"]'),
  ]);
  exportOk = download.suggestedFilename() === 'EXP-004-data.json';
} catch (error) {
  errors.push(`export: ${error instanceof Error ? error.message : String(error)}`);
}

await writeFile(
  resolve(OUT, 'capture-log.txt'),
  `${JSON.stringify({ base: BASE, chosen, exportOk, errors }, null, 2)}\n`,
);

await browser.close();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Capturas y JSON en ${OUT}`);
}
