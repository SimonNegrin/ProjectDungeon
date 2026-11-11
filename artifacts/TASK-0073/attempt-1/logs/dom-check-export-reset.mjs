import { chromium } from '@playwright/test';

const url = 'http://127.0.0.1:5179/experiments/EXP-003-mesa-combate/?test=1&seed=1017';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
  console.log(`${condition ? 'OK' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

await page.goto(url, { waitUntil: 'networkidle' });
await page.locator('[data-testid="combats-rows"] tr').first().waitFor();

const read = async () =>
  page.evaluate(() => ({
    decision: JSON.stringify(window.__experiment.getDecision()),
    results: JSON.stringify(window.__experiment.getResults()),
    four: document.querySelector('[data-testid="combats-four-centinela"]')?.textContent,
  }));
const before = await read();

await page.locator('[data-testid="combats-filter-hero"]').fill('guerrero');
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 3,
);
const during = await read();
check('filtrar no cambia el export', before.decision === during.decision);
check('filtrar no cambia los resultados', before.results === during.results);
check('filtrar no cambia el 4-de-4', before.four === during.four, `${before.four} / ${during.four}`);

await page.locator('[data-testid="bench-reset-enemies"]').click();
await page.waitForTimeout(500);
check(
  'reset de enemigos conserva el filtro',
  (await page.locator('[data-testid="combats-filter-hero"]').inputValue()) === 'guerrero',
);
check(
  'reset con filtro deja 3 filas',
  (await page.locator('[data-testid="combats-rows"] tr').count()) === 3,
);

await page.locator('[data-testid="bench-reset-all"]').click();
await page.waitForTimeout(500);
check(
  'reset global conserva el filtro',
  (await page.locator('[data-testid="combats-filter-hero"]').inputValue()) === 'guerrero',
);
check(
  'reset global con filtro deja 3 filas',
  (await page.locator('[data-testid="combats-rows"] tr').count()) === 3,
);

await browser.close();
if (failures.length > 0) {
  console.error(`FAILURES: ${failures.length}`);
  process.exit(1);
}
console.log('DOM export/reset OK');
