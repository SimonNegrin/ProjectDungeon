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

const rows = page.locator('[data-testid="combats-rows"] tr');
check('12 filas iniciales', (await rows.count()) === 12, String(await rows.count()));

const firstRow = rows.first();
check(
  'rowspan inicial 4',
  (await firstRow.locator('td').nth(1).getAttribute('rowspan')) === '4',
  String(await firstRow.locator('td').nth(1).getAttribute('rowspan')),
);
const realBefore = await page
  .locator('[data-testid="combats-real-guerrero-centinela"]')
  .textContent();

const heroFilter = page.locator('[data-testid="combats-filter-hero"]');
await heroFilter.fill('clerigo');
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 3,
);
check('filtro héroe deja 3 filas', (await rows.count()) === 3, String(await rows.count()));
check(
  'filtro héroe conserva foco',
  (await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))) ===
    'combats-filter-hero',
);
const next = rows.first();
check(
  'rowspan ajustado a 1',
  (await next.locator('td').nth(1).getAttribute('rowspan')) === '1',
  String(await next.locator('td').nth(1).getAttribute('rowspan')),
);

const enemyFilter = page.locator('[data-testid="combats-filter-enemy"]');
await enemyFilter.fill('CENTINELA');
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 1,
);
check('intersección deja 1 fila', (await rows.count()) === 1, String(await rows.count()));

await page.locator('[data-testid="combats-filter-hero-clear"]').click();
check(
  'limpiar héroe deja 4 filas del Centinela',
  (await rows.count()) === 4,
  String(await rows.count()),
);
check(
  'limpiar devuelve foco al filtro de héroe',
  (await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))) ===
    'combats-filter-hero',
);

await page.locator('[data-testid="combats-filter-enemy-clear"]').click();
check('limpiar todo deja 12 filas', (await rows.count()) === 12, String(await rows.count()));
const realAfter = await page
  .locator('[data-testid="combats-real-guerrero-centinela"]')
  .textContent();
check('filtrar no cambia % real', realBefore === realAfter, `${realBefore} / ${realAfter}`);

const heroNoResult = page.locator('[data-testid="combats-filter-hero"]');
await heroNoResult.fill('zombi');
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 0,
);
check(
  'sin resultados muestra aviso',
  await page.locator('[data-testid="combats-filter-empty"]').isVisible(),
);
check(
  'sin resultados conserva foco',
  (await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))) ===
    'combats-filter-hero',
);

const weaponFilter = page.locator('[data-testid="weapons-filter"]');
await weaponFilter.fill('guerrero');
const visibleWeapons = page.locator('[data-testid="weapon-rows"] tr:visible');
check('armas por unidad deja 1', (await visibleWeapons.count()) === 1, String(await visibleWeapons.count()));
check(
  'arma filtrada es espada',
  (await visibleWeapons.first().getAttribute('data-testid')) === 'weapons-row-espada',
);

const heroNameFilter = page.locator('[data-testid="heroes-filter"]');
await heroNameFilter.fill('clerigo');
const visibleHeroes = page.locator('[data-testid="hero-rows"] tr:visible');
check('héroes por nombre deja 1', (await visibleHeroes.count()) === 1, String(await visibleHeroes.count()));
check(
  'héroe filtrado es clérigo',
  (await visibleHeroes.first().getAttribute('data-testid')) === 'heroes-row-clerigo',
);

await page.locator('[data-testid="combats-filter-hero-clear"]').click();
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 12,
);
await page.locator('[data-testid="combats-filter-hero"]').fill('guerrero');
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="combats-rows"] tr').length === 3,
);
const pv = page.locator('[data-testid="combats-field-centinela-maxHp"]');
await pv.fill('40');
await page.waitForTimeout(500);
check('editar stat con filtro conserva 3 filas', (await rows.count()) === 3, String(await rows.count()));
check(
  'editar stat conserva el filtro',
  (await page.locator('[data-testid="combats-filter-hero"]').inputValue()) === 'guerrero',
);

const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
check('sin overflow horizontal a 1280', docWidth <= clientWidth, `${docWidth}/${clientWidth}`);

await browser.close();
if (failures.length > 0) {
  console.error(`FAILURES: ${failures.length}`);
  process.exit(1);
}
console.log('DOM smoke OK');
