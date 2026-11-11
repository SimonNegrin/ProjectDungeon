import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import type {
  BenchExport,
  BenchOverrides,
  EnemyDiagnosis,
} from '../../experiments/EXP-003-mesa-combate/src/v2/bench';
import type {
  MatchupResult,
  MeasurementPayload,
} from '../../experiments/EXP-003-mesa-combate/src/v2/measure';
import type { Catalog } from '../../experiments/EXP-003-mesa-combate/src/v2/types';
import type { V2ExperimentApi } from '../../experiments/EXP-003-mesa-combate/src/ui';
import { artifactPath } from './artifacts';

/**
 * E2E de las tres tablas inline de EXP-003 (REQ-028, TASK-0071).
 *
 * Todo el estado se lee de `window.__experiment` y del DOM real. El recálculo
 * es diferido: se espera al texto de `bench-status` o al propio estado, nunca
 * con esperas de reloj real. Las aserciones salen de los criterios de
 * aceptación, no de los detalles internos de la implementación.
 */

const SEED = 1017;
const DUELS = 1000;
const MARGIN_PP = 5;
const HEROES = ['guerrero', 'picaro', 'mago', 'clerigo'] as const;
const ENEMIES = ['centinela', 'bruto', 'cobarde'] as const;
const GUIDE_TARGETS = { centinela: 75, cobarde: 85, bruto: 30 } as const;
const SHARED_FIELDS = [
  'maxHp',
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
  'maxActions',
  'armorId',
  'shieldId',
  'weaponId',
] as const;

const COMBAT_HEADERS = [
  'Héroe',
  'Enemigo',
  'Victorias héroe',
  'Victorias enemigo',
  '% objetivo',
  '% real',
  'PV',
  'Acierto',
  'Daño',
  'Defensa',
  'Resistencia',
  'Acciones',
  'Armadura',
  'Escudo',
  'Arma',
] as const;

const WEAPON_HEADERS = ['Arma', 'Acierto', 'Daño'] as const;

const HERO_HEADERS = [
  'Héroe',
  'Arma inicial',
  'PV',
  'Acierto',
  'Daño',
  'Defensa',
  'Resistencia',
  'Acciones',
  'Armadura',
  'Escudo',
  'Nivel de magia',
] as const;

const VIEWPORTS = [
  { label: '1280x720', width: 1280, height: 720 },
  { label: '900x700', width: 900, height: 700 },
] as const;

test.use({ viewport: { width: 1600, height: 1200 } });

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openExperiment(page: Page): Promise<void> {
  await page.goto(`/experiments/EXP-003-mesa-combate/?test=1&seed=${SEED}`);
  await page.waitForFunction(() => Boolean(window.__experiment));
}

async function readResults(page: Page): Promise<MeasurementPayload> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getResults();
  });
}

async function readDiagnosis(
  page: Page,
): Promise<ReadonlyArray<EnemyDiagnosis>> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDiagnosis();
  });
}

async function readTargets(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return { ...api.getTargets() };
  });
}

async function readOverrides(page: Page): Promise<BenchOverrides> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getOverrides();
  });
}

async function readOverridesId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getOverridesId();
  });
}

async function readWorkingCatalog(page: Page): Promise<Catalog> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getWorkingCatalog();
  });
}

async function readDecision(page: Page): Promise<BenchExport> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
}

function benchStatus(page: Page): Promise<string> {
  return page
    .getByTestId('bench-status')
    .textContent()
    .then((text) => text ?? '');
}

async function waitForBenchStatus(page: Page, expected: string): Promise<void> {
  await expect.poll(() => benchStatus(page), { timeout: 10_000 }).toContain(
    expected,
  );
}

function byKey(
  matchups: ReadonlyArray<MatchupResult>,
): Map<string, MatchupResult> {
  return new Map(
    matchups.map((matchup) => [
      `${matchup.heroId}:${matchup.enemyId}`,
      matchup,
    ]),
  );
}

/** Texto de cada fila de combates: victorias, % real, delta y estado. */
async function combatRowTexts(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const rows: Record<string, string> = {};
    for (const row of document.querySelectorAll<HTMLElement>(
      '[data-testid^="combats-row-"]',
    )) {
      const testId = row.dataset.testid ?? '';
      const key = testId
        .slice('combats-row-'.length)
        .replace('-', ':');
      rows[key] = row.textContent ?? '';
    }
    return rows;
  });
}

function firstPercent(text: string): string {
  return text.match(/\d+,\d+ %/)?.[0] ?? '';
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const node of document.querySelectorAll<HTMLElement>('.table-scroll')) {
      node.scrollLeft = 0;
    }
  });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function viewportScreenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function screenshotElement(
  locator: Locator,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await locator.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function saveDownload(
  download: Download,
  testInfo: TestInfo,
  name: string,
): Promise<string> {
  const path = artifactPath(testInfo, 'exports', name);
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);
  return path;
}

/** Tabula hasta que el foco caiga en el campo pedido, sin esperas de reloj. */
async function tabToTestId(
  page: Page,
  testId: string,
  maxTabs = 100,
): Promise<void> {
  await page.getByTestId('experiment-title').click();
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.dataset.testid ?? '',
    );
    if (active === testId) return;
  }
  throw new Error(`No se alcanzó «${testId}» tabulando ${maxTabs} veces.`);
}

async function selectCombatRow(
  page: Page,
  heroId: string,
  enemyId: string,
): Promise<void> {
  const row = page.getByTestId(`combats-row-${heroId}-${enemyId}`);
  await row.locator('td').first().click();
}

test('editar un stat del enemigo compartido recalcula sus cuatro filas y deja las demás intactas', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  // Estructura: 15 columnas, 12 filas en 3 bloques de 4.
  await expect(page.getByTestId('combats-table').locator('thead th')).toHaveText([
    ...COMBAT_HEADERS,
  ]);
  await expect(page.getByTestId('combats-rows').locator('tr')).toHaveCount(12);
  for (const enemyId of ENEMIES) {
    await expect(
      page.getByTestId(`combats-cell-${enemyId}-maxHp`),
      `bloque de ${enemyId}`,
    ).toHaveAttribute('rowspan', '4');
  }

  // Un solo input por stat compartido; el td ocupa las cuatro filas.
  for (const field of SHARED_FIELDS) {
    const cell = page.getByTestId(`combats-cell-centinela-${field}`);
    await expect(cell).toHaveAttribute('rowspan', '4');
    await expect(
      cell.locator('input, select'),
      `campo ${field}`,
    ).toHaveCount(1);
    await expect(page.getByTestId(`combats-field-centinela-${field}`)).toHaveCount(
      1,
    );
  }

  const before = await readResults(page);
  const beforeRows = await combatRowTexts(page);
  const beforeByKey = byKey(before.matchups);

  const hpInput = page.getByTestId('combats-field-centinela-maxHp');
  await expect(hpInput).toHaveValue('6');
  await hpInput.fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');

  // El foco no se pierde tras el recálculo y el bloque queda resaltado.
  await expect(hpInput).toBeFocused();
  for (const heroId of HEROES) {
    await expect(
      page.getByTestId(`combats-row-${heroId}-centinela`),
    ).toHaveClass(/is-block-active/);
  }

  const after = await readResults(page);
  const afterRows = await combatRowTexts(page);
  const afterByKey = byKey(after.matchups);
  const affected = HEROES.map((heroId) => `${heroId}:centinela`);
  const unaffected = HEROES.flatMap((heroId) =>
    ENEMIES.filter((enemyId) => enemyId !== 'centinela').map(
      (enemyId) => `${heroId}:${enemyId}`,
    ),
  );

  expect(after.matchups).toHaveLength(12);
  let changedRows = 0;
  for (const key of affected) {
    expect(afterByKey.get(key), `fila ${key}`).not.toEqual(beforeByKey.get(key));
    if (afterRows[key] !== beforeRows[key]) changedRows += 1;
  }
  // El recálculo se ve en la tabla cuando el resultado cambia; las filas no
  // afectadas conservan exactamente su texto.
  expect(changedRows).toBeGreaterThan(0);
  for (const key of unaffected) {
    expect(afterByKey.get(key), `fila ${key}`).toEqual(beforeByKey.get(key));
    expect(afterRows[key], `texto de ${key}`).toBe(beforeRows[key]);
  }

  // El valor compartido es uno solo y los otros enemigos no se tocan.
  const catalog = await readWorkingCatalog(page);
  expect(catalog.bestiary.find((enemy) => enemy.id === 'centinela')?.maxHp).toBe(
    30,
  );
  await expect(page.getByTestId('combats-field-bruto-maxHp')).toHaveValue('8');
  await expect(page.getByTestId('combats-field-cobarde-maxHp')).toHaveValue('5');

  await screenshotElement(
    page.getByTestId('combats-panel'),
    'enemigo-pv-compartido',
    testInfo,
  );
  expect(errors).toEqual([]);
});

test('editar un stat o el arma inicial de un héroe recalcula sus tres filas y actualiza las unidades del arma', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const before = await readResults(page);
  const beforeRows = await combatRowTexts(page);
  const beforeByKey = byKey(before.matchups);

  const hpInput = page.getByTestId('hero-field-guerrero-maxHp');
  await expect(hpInput).toHaveValue('20');
  await hpInput.fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');
  await expect(hpInput).toBeFocused();

  const afterHp = await readResults(page);
  const afterHpRows = await combatRowTexts(page);
  const afterHpByKey = byKey(afterHp.matchups);
  for (const enemyId of ENEMIES) {
    const key = `guerrero:${enemyId}`;
    expect(afterHpByKey.get(key), `fila ${key}`).not.toEqual(
      beforeByKey.get(key),
    );
    expect(afterHpRows[key], `texto de ${key}`).not.toBe(beforeRows[key]);
  }
  for (const heroId of HEROES.filter((heroId) => heroId !== 'guerrero')) {
    for (const enemyId of ENEMIES) {
      const key = `${heroId}:${enemyId}`;
      expect(afterHpByKey.get(key), `fila ${key}`).toEqual(
        beforeByKey.get(key),
      );
    }
  }

  // Volver a la base antes de probar el arma inicial.
  await page.getByTestId('bench-reset-heroes').click();
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  const baseAgain = await readResults(page);
  expect(baseAgain).toEqual(before);

  const beforeWeapon = await readResults(page);
  const beforeWeaponByKey = byKey(beforeWeapon.matchups);
  const beforeWeaponRows = await combatRowTexts(page);

  const weaponSelect = page.getByTestId('hero-field-guerrero-weaponId');
  await expect(weaponSelect).toHaveValue('espada');
  await weaponSelect.selectOption('hacha');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');

  const afterWeapon = await readResults(page);
  const afterWeaponByKey = byKey(afterWeapon.matchups);
  const afterWeaponRows = await combatRowTexts(page);
  for (const enemyId of ENEMIES) {
    const key = `guerrero:${enemyId}`;
    expect(afterWeaponByKey.get(key), `fila ${key}`).not.toEqual(
      beforeWeaponByKey.get(key),
    );
    expect(afterWeaponRows[key], `texto de ${key}`).not.toBe(
      beforeWeaponRows[key],
    );
  }

  // La tabla de armas refleja el cambio de portadores y su bonus.
  await expect(page.getByTestId('weapon-users-espada')).toHaveText('Centinela');
  await expect(page.getByTestId('weapon-users-hacha')).toHaveText(
    'Guerrero, Bruto',
  );
  await expect(
    page.getByTestId('hero-weapon-hint-guerrero'),
  ).toHaveText('Acierto +2 · Daño +5');
  await expect(
    page.getByTestId('combats-weapon-hint-centinela'),
  ).toHaveText('Acierto +3 · Daño +3');
  await expect(page.getByTestId('heroes-table').locator('thead th')).toHaveText([
    ...HERO_HEADERS,
  ]);

  await screenshotElement(
    page.getByTestId('heroes-panel'),
    'heroe-arma-inicial',
    testInfo,
  );
  expect(errors).toEqual([]);
});

test('editar el daño de un arma recalcula todas las filas donde se usa sin duplicar la compartida', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const before = await readResults(page);
  const beforeRows = await combatRowTexts(page);
  const beforeByKey = byKey(before.matchups);

  await expect(page.getByTestId('weapons-table').locator('thead th')).toHaveText([
    ...WEAPON_HEADERS,
  ]);
  await expect(page.getByTestId('weapon-rows').locator('tr')).toHaveCount(4);
  await expect(page.getByTestId('weapon-users-espada')).toHaveText(
    'Guerrero, Centinela',
  );
  await expect(page.getByTestId('weapon-users-daga')).toHaveText(
    'Pícaro, Cobarde',
  );
  await expect(page.getByTestId('weapon-users-hacha')).toHaveText('Bruto');
  await expect(page.getByTestId('weapon-users-cuchillo')).toHaveText(
    'sin unidades',
  );

  const damage = page.getByTestId('weapon-espada-damage');
  await expect(damage).toHaveValue('3');
  await damage.fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');

  const after = await readResults(page);
  const afterRows = await combatRowTexts(page);
  const afterByKey = byKey(after.matchups);
  const affected = [
    'guerrero:centinela',
    'guerrero:bruto',
    'guerrero:cobarde',
    'picaro:centinela',
    'mago:centinela',
    'clerigo:centinela',
  ];
  const unaffected = [
    'picaro:bruto',
    'picaro:cobarde',
    'mago:bruto',
    'mago:cobarde',
    'clerigo:bruto',
    'clerigo:cobarde',
  ];

  let changedRows = 0;
  for (const key of affected) {
    expect(afterByKey.get(key), `fila ${key}`).not.toEqual(beforeByKey.get(key));
    if (afterRows[key] !== beforeRows[key]) changedRows += 1;
  }
  expect(changedRows).toBeGreaterThan(0);
  for (const key of unaffected) {
    expect(afterByKey.get(key), `fila ${key}`).toEqual(beforeByKey.get(key));
    expect(afterRows[key], `texto de ${key}`).toBe(beforeRows[key]);
  }
  await expect(page.getByTestId('weapon-users-espada')).toHaveText(
    'Guerrero, Centinela',
  );
  const catalog = await readWorkingCatalog(page);
  expect(catalog.weapons.espada?.damage).toBe(8);

  await screenshotElement(
    page.getByTestId('weapons-panel'),
    'arma-espada-editada',
    testInfo,
  );

  // El cuchillo no lo usa nadie: recalcula cero filas.
  const knifeResults = await readResults(page);
  const knifeDamage = page.getByTestId('weapon-cuchillo-damage');
  await expect(knifeDamage).toHaveValue('1');
  await knifeDamage.fill('3');
  await waitForBenchStatus(page, 'Recalculado: 0 filas afectadas.');
  expect(await readResults(page)).toEqual(knifeResults);
  await expect(page.getByTestId('weapon-users-cuchillo')).toHaveText(
    'sin unidades',
  );

  // El reset de armas vuelve a la base sin tocar enemigos ni héroes.
  await page.getByTestId('bench-reset-weapons').click();
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(await readResults(page)).toEqual(before);
  await expect(damage).toHaveValue('3');
  await expect(page.getByTestId('weapon-users-espada')).toHaveText(
    'Guerrero, Centinela',
  );

  expect(errors).toEqual([]);
});

test('cambiar el objetivo actualiza delta y 4-de-4 sin relanzar duelos', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const before = await readResults(page);
  const beforeResultsJson = JSON.stringify(before);

  const targetInput = page.getByTestId('combats-target-centinela');
  const four = page.getByTestId('combats-four-centinela');
  const real = page.getByTestId('combats-real-guerrero-centinela');
  const wins = page.getByTestId('combats-wins-hero-guerrero-centinela');
  const brutoFour = page.getByTestId('combats-four-bruto');

  await expect(targetInput).toHaveValue(String(GUIDE_TARGETS.centinela));
  await expect(four).not.toHaveText('4/4 dentro');
  const beforeReal = (await real.textContent()) ?? '';
  const beforeRate = firstPercent(beforeReal);
  const beforeWins = (await wins.textContent()) ?? '';
  expect(beforeRate).toMatch(/^\d+,\d+ %$/);

  await targetInput.fill('100');
  await waitForBenchStatus(page, '0 filas medidas de nuevo');
  await expect(page.getByTestId('bench-status')).toContainText(
    'diagnóstico actualizado',
  );

  // Ni el win % ni los recuentos cambian: no se ejecutan duelos.
  expect(await readResults(page)).toEqual(before);
  expect(JSON.stringify(await readResults(page))).toBe(beforeResultsJson);
  await expect(wins).toHaveText(beforeWins);
  expect(firstPercent((await real.textContent()) ?? '')).toBe(beforeRate);

  await expect(real).toContainText('dentro');
  await expect(four).toHaveText('4/4 dentro');
  await expect(
    page.getByTestId('combats-real-guerrero-bruto'),
  ).toContainText('fuera');
  await expect(brutoFour).toContainText('fuera');
  await expect(brutoFour).not.toHaveText('4/4 dentro');
  expect(await readTargets(page)).toEqual({ ...GUIDE_TARGETS, centinela: 100 });

  const diagnosis = await readDiagnosis(page);
  const centinela = diagnosis.find((entry) => entry.enemyId === 'centinela');
  expect(centinela?.target).toBe(100);
  expect(centinela?.fourOfFour).toBe(true);
  expect(centinela?.rows).toHaveLength(4);
  expect(
    centinela?.rows.every((row) => Math.abs(row.delta) <= MARGIN_PP),
  ).toBe(true);

  await screenshotElement(
    page.getByTestId('combats-panel'),
    'objetivo-4-de-4',
    testInfo,
  );

  // El reset de enemigos restaura la guía y el estado base.
  await page.getByTestId('bench-reset-enemies').click();
  await expect.poll(() => readTargets(page), { timeout: 10_000 }).toEqual(
    GUIDE_TARGETS,
  );
  await expect(targetInput).toHaveValue(String(GUIDE_TARGETS.centinela));
  await expect(four).not.toHaveText('4/4 dentro');
  await expect(real).toHaveText(beforeReal);
  expect(await readResults(page)).toEqual(before);

  expect(errors).toEqual([]);
});

test('los resets por tabla y global restauran solo su parte y devuelven la base', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const base = await readResults(page);
  const emptyId = await readOverridesId(page);

  // Sin resets por campo dentro de las tablas.
  await expect(
    page.locator('.combats-table button, .weapon-table button, .heroes-table button'),
  ).toHaveCount(0);

  // Ensuciar enemigo, arma, héroe y objetivo.
  await page.getByTestId('combats-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('hero-field-guerrero-maxHp').fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');
  await page.getByTestId('combats-target-cobarde').fill('60');
  await waitForBenchStatus(page, '0 filas medidas de nuevo');

  const dirty = await readOverrides(page);
  expect(Object.keys(dirty.enemies)).toEqual(['centinela']);
  expect(Object.keys(dirty.weapons)).toEqual(['espada']);
  expect(Object.keys(dirty.heroes)).toEqual(['guerrero']);
  expect(await readTargets(page)).toEqual({ ...GUIDE_TARGETS, cobarde: 60 });

  // Reset de enemigos: limpia enemigos y objetivos, deja armas y héroes.
  await page.getByTestId('bench-reset-enemies').click();
  await expect.poll(() => readTargets(page), { timeout: 10_000 }).toEqual(
    GUIDE_TARGETS,
  );
  const afterEnemies = await readOverrides(page);
  expect(afterEnemies).toEqual({
    enemies: {},
    weapons: { espada: { damage: 8 } },
    heroes: { guerrero: { maxHp: 1 } },
  });
  expect(await readResults(page)).not.toEqual(base);

  // Reset de armas: limpia armas, deja héroes.
  await page.getByTestId('bench-reset-weapons').click();
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: { guerrero: { maxHp: 1 } },
  });
  expect(await readResults(page)).not.toEqual(base);

  // Reset de héroes: vuelve al catálogo base y a la medición base.
  await page.getByTestId('bench-reset-heroes').click();
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(await readResults(page)).toEqual(base);
  expect(await readTargets(page)).toEqual(GUIDE_TARGETS);
  expect(await readOverridesId(page)).toBe(emptyId);

  // Ensuciar los tres y usar el reset global.
  await page.getByTestId('combats-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('hero-field-guerrero-maxHp').fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');

  await page.getByTestId('bench-reset-all').click();
  await waitForBenchStatus(page, 'Todo restablecido');
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(await readResults(page)).toEqual(base);
  expect(await readTargets(page)).toEqual(GUIDE_TARGETS);
  expect(await readOverridesId(page)).toBe(emptyId);
  await expect(page.getByTestId('combats-field-centinela-maxHp')).toHaveValue(
    '6',
  );
  await expect(page.getByTestId('weapon-espada-damage')).toHaveValue('3');
  await expect(page.getByTestId('hero-field-guerrero-maxHp')).toHaveValue('20');
  await expect(page.getByTestId('combats-target-cobarde')).toHaveValue('85');

  await expect(page.getByTestId('export-summary')).toContainText(
    `overridesId ${emptyId}`,
  );
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );

  await screenshot(page, 'resets-base', testInfo);
  expect(errors).toEqual([]);
});

test('el export incluye catálogo ajustado, objetivos, diagnóstico y overridesId deterministas', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  await expect(page.locator('.test-badge')).toHaveText('modo test determinista');
  const base = await readResults(page);

  // Enemigo, arma y héroe ajustados en el mismo estado.
  await page.getByTestId('combats-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('hero-field-guerrero-maxHp').fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');

  const first = await readDecision(page);
  const second = await readDecision(page);
  expect(JSON.stringify(second)).toBe(JSON.stringify(first));

  // Re-ejecutar la medición con el mismo estado reproduce el mismo export.
  const rerun = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.runAll();
  });
  expect(rerun.matchups).toEqual(first.matchups);
  expect(JSON.stringify(await readDecision(page))).toBe(
    JSON.stringify(first),
  );

  const id = await readOverridesId(page);
  expect(first.overridesId).toBe(id);
  expect(id).toMatch(/^[0-9a-f]{8}$/);
  expect(first.overrides).toEqual({
    enemies: { centinela: { maxHp: 30 } },
    weapons: { espada: { damage: 8 } },
    heroes: { guerrero: { maxHp: 1 } },
  });
  expect(first.targets).toEqual(GUIDE_TARGETS);
  expect(first.seed).toBe(SEED);
  expect(first.duels).toBe(DUELS);
  expect(first.engine).toBe('v2.0');
  expect(first).not.toHaveProperty('decidedAt');

  // Catálogo de trabajo: enemigos, armas y héroes ajustados.
  expect(first.catalog.version).toBe('EXP-003-v2.0.0');
  expect(
    first.catalog.bestiary.find((enemy) => enemy.id === 'centinela')?.maxHp,
  ).toBe(30);
  expect(first.catalog.weapons.espada?.damage).toBe(8);
  expect(
    first.catalog.roster.find((hero) => hero.id === 'guerrero')?.maxHp,
  ).toBe(1);

  // Diagnóstico completo: 3 enemigos × 4 filas.
  expect(first.diagnosis).toHaveLength(3);
  for (const entry of first.diagnosis) {
    expect(entry.rows).toHaveLength(4);
    expect(entry.total).toBe(4);
    expect(entry.margin).toBe(MARGIN_PP);
    expect(entry.target).toBe(
      GUIDE_TARGETS[entry.enemyId as keyof typeof GUIDE_TARGETS],
    );
  }
  expect(first.matchups).toHaveLength(12);

  const snapshot = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(snapshot.overridesId).toBe(id);
  expect(snapshot.targets).toEqual(first.targets);
  expect(snapshot.diagnosis).toEqual(first.diagnosis);

  // Descarga ajustada: nombre con overridesId y JSON idéntico al de la API.
  const fileName = `EXP-003-v2.0-seed-1017-duels-1000-bench-overrides-${id}.json`;
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
  const path = await saveDownload(
    download,
    testInfo,
    `bench-overrides-${id}.json`,
  );
  const written = JSON.parse(await readFile(path, 'utf8')) as Record<
    string,
    unknown
  >;
  expect(written).toEqual(first);
  await expect(page.getByTestId('export-status')).toContainText(fileName);
  await expect(page.getByTestId('export-summary')).toContainText(
    `overridesId ${id}`,
  );
  await expect(page.getByTestId('export-summary')).toContainText(
    'objetivos: Centinela 75 % · Bruto 30 % · Cobarde 85 %',
  );

  await screenshot(page, 'export-ajustado', testInfo);

  // Reset global: el export vuelve al nombre y contenido base.
  await page.getByTestId('bench-reset-all').click();
  await waitForBenchStatus(page, 'Todo restablecido');
  expect(await readDecision(page)).toMatchObject({
    overrides: { enemies: {}, weapons: {}, heroes: {} },
    targets: GUIDE_TARGETS,
    overridesId: await readOverridesId(page),
  });
  expect((await readResults(page)).matchups).toEqual(base.matchups);

  const baseDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const baseDownload = await baseDownloadPromise;
  expect(baseDownload.suggestedFilename()).toBe(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );
  const basePath = await saveDownload(baseDownload, testInfo, 'bench-base.json');
  const baseWritten = JSON.parse(await readFile(basePath, 'utf8')) as {
    overrides: unknown;
    targets: unknown;
    matchups: unknown;
    catalog: { bestiary: ReadonlyArray<{ id: string; maxHp: number }> };
  };
  expect(baseWritten.overrides).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(baseWritten.targets).toEqual(GUIDE_TARGETS);
  expect(baseWritten.matchups).toEqual(base.matchups);

  expect(errors).toEqual([]);
});

for (const viewport of VIEWPORTS) {
  test(`QA visual ${viewport.label}: tres tablas a ancho completo, foco, detalle y dentro/fuera`, async ({
    page,
  }, testInfo) => {
    const errors = trackConsoleErrors(page);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await openExperiment(page);

    // Objetivo 100 deja las filas del Centinela dentro y las de Bruto fuera.
    await page.getByTestId('combats-target-centinela').fill('100');
    await waitForBenchStatus(page, '0 filas medidas de nuevo');
    await expect(page.getByTestId('combats-four-centinela')).toHaveText(
      '4/4 dentro',
    );
    await expect(
      page.getByTestId('combats-real-guerrero-centinela'),
    ).toContainText('dentro');
    await expect(
      page.getByTestId('combats-real-guerrero-bruto'),
    ).toContainText('fuera');
    await expect(page.getByTestId('combats-four-bruto')).toContainText('fuera');
    await expect(page.getByTestId('combats-four-bruto')).not.toHaveText(
      '4/4 dentro',
    );

    const layout = await page.evaluate(() => {
      const innerWidth = window.innerWidth;
      const panels = [...document.querySelectorAll<HTMLElement>('section.panel')].map(
        (panel) => {
          const rect = panel.getBoundingClientRect();
          return {
            id: panel.dataset.testid ?? panel.className,
            left: rect.left,
            right: rect.right,
          };
        },
      );
      const tables = [
        ['combats', '.combats-table'],
        ['weapons', '.weapon-table'],
        ['heroes', '.heroes-table'],
      ].map(([id, selector]) => {
        const node = document.querySelector<HTMLElement>(selector);
        return {
          id,
          width: node?.getBoundingClientRect().width ?? 0,
        };
      });
      const scroll = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector);
        return node
          ? { scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
          : null;
      };
      const inputs = [
        ...document.querySelectorAll<HTMLElement>(
          '.combats-table .cell-input, .weapon-table .cell-input, .heroes-table .cell-input',
        ),
      ].map((input) => {
        const style = window.getComputedStyle(input);
        const rect = input.getBoundingClientRect();
        return {
          fontSize: Number.parseFloat(style.fontSize),
          height: rect.height,
          visible: input.offsetParent !== null && rect.width > 0,
        };
      });
      const essential = [
        ...document.querySelectorAll<HTMLElement>(
          '.combats-table th, .combats-table td.real-cell, .combats-table td.numeric-cell',
        ),
      ].map((cell) => ({
        text: cell.textContent ?? '',
        scrollWidth: cell.scrollWidth,
        clientWidth: cell.clientWidth,
      }));
      return {
        innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        panels,
        tables,
        combatsScroll: scroll('.combats-panel .table-scroll'),
        heroesScroll: scroll('.heroes-panel .table-scroll'),
        inputs,
        essential,
      };
    });

    // Sin overflow de documento y paneles dentro del viewport.
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    for (const panel of layout.panels) {
      expect(panel.left, `panel ${panel.id}`).toBeGreaterThanOrEqual(-1);
      expect(panel.right, `panel ${panel.id}`).toBeLessThanOrEqual(
        layout.innerWidth + 1,
      );
    }

    // A 1280 las tres tablas ocupan al menos el 80 % del ancho.
    expect(layout.tables).toHaveLength(3);
    for (const table of layout.tables) {
      expect(
        table.width,
        `tabla ${table.id}`,
      ).toBeGreaterThanOrEqual(layout.innerWidth * 0.8);
    }

    // A 900 el scroll de combates y héroes queda dentro de la tabla.
    const atNarrow = viewport.width < 1180;
    expect(layout.combatsScroll).not.toBeNull();
    expect(layout.heroesScroll).not.toBeNull();
    if (atNarrow) {
      expect(layout.combatsScroll?.scrollWidth).toBeGreaterThan(
        layout.combatsScroll?.clientWidth ?? 0,
      );
      expect(layout.heroesScroll?.scrollWidth).toBeGreaterThan(
        layout.heroesScroll?.clientWidth ?? 0,
      );
    } else {
      expect(layout.combatsScroll?.scrollWidth).toBeLessThanOrEqual(
        (layout.combatsScroll?.clientWidth ?? 0) + 1,
      );
      expect(layout.heroesScroll?.scrollWidth).toBeLessThanOrEqual(
        (layout.heroesScroll?.clientWidth ?? 0) + 1,
      );
    }

    // Inputs legibles y presentes.
    expect(layout.inputs.length).toBeGreaterThan(0);
    for (const input of layout.inputs) {
      expect(input.visible).toBe(true);
      expect(input.fontSize).toBeGreaterThanOrEqual(11);
      expect(input.height).toBeGreaterThanOrEqual(18);
    }

    // Victorias, % real y cabeceras se leen completos: sin recorte.
    expect(layout.essential.length).toBeGreaterThan(12);
    for (const cell of layout.essential) {
      expect(
        cell.scrollWidth,
        `celda recortada: «${cell.text.trim()}»`,
      ).toBeLessThanOrEqual(cell.clientWidth + 1);
    }
    const realCells = layout.essential.filter((cell) =>
      /·\s(dentro|fuera)$/.test(cell.text.trim()),
    );
    expect(realCells).toHaveLength(12);

    await screenshotElement(
      page.getByTestId('combats-panel'),
      `qa-${viewport.label}-combates`,
      testInfo,
    );
    await screenshotElement(
      page.getByTestId('weapons-panel'),
      `qa-${viewport.label}-armas`,
      testInfo,
    );
    await screenshotElement(
      page.getByTestId('heroes-panel'),
      `qa-${viewport.label}-heroes`,
      testInfo,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await viewportScreenshot(
      page,
      `qa-${viewport.label}-viewport`,
      testInfo,
    );

    // Foco visible al llegar con teclado a un stat compartido.
    await tabToTestId(page, 'combats-field-centinela-maxHp');
    await expect(
      page.getByTestId('combats-field-centinela-maxHp'),
    ).toBeFocused();
    const focusStyle = await page
      .getByTestId('combats-field-centinela-maxHp')
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
        };
      });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);
    for (const heroId of HEROES) {
      await expect(
        page.getByTestId(`combats-row-${heroId}-centinela`),
      ).toHaveClass(/is-block-active/);
    }
    await viewportScreenshot(page, `qa-${viewport.label}-foco`, testInfo);
    await screenshotElement(
      page.getByTestId('combats-panel'),
      `qa-${viewport.label}-bloque`,
      testInfo,
    );

    // Detalle: seleccionar otra fila y editar un stat del Bruto.
    await selectCombatRow(page, 'picaro', 'bruto');
    await expect(page.getByTestId('detail-title')).toHaveText('Pícaro vs Bruto');
    const beforeDetail = (await page
      .getByTestId('detail-result')
      .textContent()) ?? '';
    expect(beforeDetail).toContain('Banda 40–60 %');

    const bruteForce = page.getByTestId('combats-field-bruto-fuerza');
    await expect(bruteForce).toHaveValue('1');
    await bruteForce.fill('10');
    await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');

    const afterDetail = (await page
      .getByTestId('detail-result')
      .textContent()) ?? '';
    expect(afterDetail).not.toBe(beforeDetail);
    expect(afterDetail).toContain('Banda 40–60 %');
    expect(afterDetail).toContain('TTK (rondas)');
    expect(afterDetail).toContain('Turnos / rondas medios');
    expect(afterDetail).toContain('Daño héroe / enemigo');
    await expect(page.getByTestId('detail-title')).toHaveText('Pícaro vs Bruto');

    await screenshot(
      page,
      `qa-${viewport.label}-detalle`,
      testInfo,
    );

    expect(errors).toEqual([]);
  });
}
