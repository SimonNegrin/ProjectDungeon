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
  BenchTargets,
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
 * E2E de las tres tablas inline de EXP-003 (REQ-028, TASK-0071/TASK-0074).
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
const GUIDE_BY_ENEMY = { centinela: 75, cobarde: 85, bruto: 30 } as const;
const GUIDE_TARGETS: Record<string, number> = Object.fromEntries(
  HEROES.flatMap((heroId) =>
    ENEMIES.map((enemyId) => [
      `${heroId}:${enemyId}`,
      GUIDE_BY_ENEMY[enemyId],
    ]),
  ),
);
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

async function readTargets(page: Page): Promise<BenchTargets> {
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

/** Texto del 4-de-4 de cada bloque visible. */
async function combatFourTexts(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const fours: Record<string, string> = {};
    for (const node of document.querySelectorAll<HTMLElement>(
      '[data-testid^="combats-four-"]',
    )) {
      const testId = node.dataset.testid ?? '';
      const enemyId = testId.slice('combats-four-'.length);
      fours[enemyId] = node.textContent ?? '';
    }
    return fours;
  });
}

async function realCellText(
  page: Page,
  heroId: string,
  enemyId: string,
): Promise<string> {
  return (
    (await page.getByTestId(`combats-real-${heroId}-${enemyId}`).textContent()) ??
    ''
  );
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

test('editar el objetivo de un par cambia su delta y el 4-de-4 del enemigo sin tocar a los otros héroes', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openExperiment(page);

  const before = await readResults(page);
  const beforeRows = await combatRowTexts(page);
  const beforeFour = await combatFourTexts(page);
  const beforeTargets = await readTargets(page);
  const beforeReal = await realCellText(page, 'guerrero', 'centinela');
  expect(Object.keys(beforeTargets)).toHaveLength(12);

  const target = page.getByTestId('combats-target-guerrero-centinela');
  const real = page.getByTestId('combats-real-guerrero-centinela');
  const four = page.getByTestId('combats-four-centinela');
  await expect(target).toHaveValue(String(GUIDE_BY_ENEMY.centinela));
  await expect(real).toContainText('fuera');
  await expect(four).toContainText('0/4');

  const otherTargets = new Map<string, string>();
  const otherReal = new Map<string, string>();
  for (const heroId of HEROES.filter((heroId) => heroId !== 'guerrero')) {
    const key = `${heroId}:centinela`;
    otherTargets.set(
      key,
      (await page.getByTestId(`combats-target-${heroId}-centinela`).inputValue()) ??
        '',
    );
    otherReal.set(key, await realCellText(page, heroId, 'centinela'));
  }

  await screenshotElement(
    page.getByTestId('combats-panel'),
    'objetivo-por-fila-antes',
    testInfo,
  );

  await target.fill('100');
  await waitForBenchStatus(page, 'diagnóstico actualizado');
  await expect(target).toBeFocused();

  // El objetivo es solo diagnóstico: no se lanzan duelos.
  expect(await readResults(page)).toEqual(before);
  expect(JSON.stringify(await readResults(page))).toBe(JSON.stringify(before));

  const afterTargets = await readTargets(page);
  expect(afterTargets).toEqual({
    ...beforeTargets,
    'guerrero:centinela': 100,
  });

  // La fila editada cambia de delta y estado; el bloque pasa a 1/4.
  expect(firstPercent(await realCellText(page, 'guerrero', 'centinela'))).toBe(
    firstPercent(beforeReal),
  );
  expect(await realCellText(page, 'guerrero', 'centinela')).not.toBe(beforeReal);
  await expect(real).toContainText('100,0 %');
  await expect(real).toContainText('±0,0 pp');
  await expect(real).toContainText('dentro');
  await expect(four).toContainText('1/4');
  await expect(four).not.toHaveText('4/4 dentro');

  // Los otros tres héroes del mismo enemigo conservan objetivo y % real.
  for (const [key, previousTarget] of otherTargets) {
    const [heroId] = key.split(':');
    await expect(
      page.getByTestId(`combats-target-${heroId}-centinela`),
      `objetivo de ${key}`,
    ).toHaveValue(previousTarget);
    expect(await realCellText(page, heroId, 'centinela'), `% real de ${key}`).toBe(
      otherReal.get(key),
    );
    expect(
      (await combatRowTexts(page))[key],
      `fila completa de ${key}`,
    ).toBe(beforeRows[key]);
  }

  // Los otros bloques no cambian ni su 4-de-4.
  expect(await combatFourTexts(page)).toMatchObject({
    bruto: beforeFour.bruto,
    cobarde: beforeFour.cobarde,
  });

  await screenshotElement(
    page.getByTestId('combats-panel'),
    'objetivo-por-fila-despues',
    testInfo,
  );
  expect(errors).toEqual([]);
});

test('dos pares del mismo enemigo con objetivos distintos calculan delta y 4-de-4 propios sin aviso de dispersión', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  const assignments = {
    'guerrero:centinela': 100,
    'picaro:centinela': 95,
    'mago:centinela': 95,
    'clerigo:centinela': 100,
  } as const;
  await page.evaluate((entries) => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    for (const [key, value] of entries) {
      const [heroId, enemyId] = key.split(':');
      api.setTarget(heroId, enemyId, value);
    }
  }, Object.entries(assignments));

  const results = await readResults(page);
  const resultsByKey = byKey(results.matchups);
  const diagnosis = await readDiagnosis(page);
  const centinela = diagnosis.find((entry) => entry.enemyId === 'centinela');
  expect(centinela).toBeDefined();
  expect(centinela?.rows).toHaveLength(4);
  expect(centinela?.total).toBe(4);

  const targets = new Set<number>();
  for (const row of centinela?.rows ?? []) {
    const key = `${row.heroId}:centinela`;
    const expectedTarget = assignments[key as keyof typeof assignments];
    const matchup = resultsByKey.get(key);
    expect(row.target, `objetivo de ${key}`).toBe(expectedTarget);
    expect(row.heroWinRate, `tasa de ${key}`).toBe(matchup?.heroWinRate);
    expect(row.delta, `delta de ${key}`).toBeCloseTo(
      (matchup?.heroWinRate ?? 0) - expectedTarget,
      3,
    );
    expect(row.inside, `estado de ${key}`).toBe(true);
    targets.add(row.target);
  }

  // Dos objetivos distintos: el delta se calcula contra el de cada fila.
  expect(targets.size).toBe(2);
  expect(centinela?.insideCount).toBe(4);
  expect(centinela?.fourOfFour).toBe(true);
  expect(centinela?.outside).toEqual([]);

  await expect(page.getByTestId('combats-four-centinela')).toHaveText(
    '4/4 dentro',
  );
  for (const heroId of HEROES) {
    await expect(
      page.getByTestId(`combats-real-${heroId}-centinela`),
    ).toContainText('dentro');
  }
  const panelText = (await page.getByTestId('combats-panel').textContent()) ?? '';
  expect(panelText).not.toMatch(/dispersi/i);

  expect(errors).toEqual([]);
});

test('los resets por tabla y global restauran objetivos por par sin tocar armas ni héroes', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const base = await readResults(page);
  const guide = await readTargets(page);
  const emptyId = await readOverridesId(page);
  expect(Object.keys(guide)).toHaveLength(12);
  expect(guide).toEqual(GUIDE_TARGETS);

  // Sin resets por campo dentro de las tablas.
  await expect(
    page.locator('.combats-table button, .weapon-table button, .heroes-table button'),
  ).toHaveCount(0);

  // Ensuciar enemigo, arma, héroe y un objetivo por par.
  await page.getByTestId('combats-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('hero-field-guerrero-maxHp').fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');
  await page.getByTestId('combats-target-clerigo-cobarde').fill('60');
  await waitForBenchStatus(page, 'diagnóstico actualizado');

  const dirty = await readOverrides(page);
  expect(Object.keys(dirty.enemies)).toEqual(['centinela']);
  expect(Object.keys(dirty.weapons)).toEqual(['espada']);
  expect(Object.keys(dirty.heroes)).toEqual(['guerrero']);
  expect(await readTargets(page)).toEqual({
    ...guide,
    'clerigo:cobarde': 60,
  });

  // Reset de enemigos: limpia enemigos y los 12 objetivos, deja armas y héroes.
  await page.getByTestId('bench-reset-enemies').click();
  await expect.poll(() => readTargets(page), { timeout: 10_000 }).toEqual(guide);
  const afterEnemies = await readOverrides(page);
  expect(afterEnemies).toEqual({
    enemies: {},
    weapons: { espada: { damage: 8 } },
    heroes: { guerrero: { maxHp: 1 } },
  });
  expect(await readResults(page)).not.toEqual(base);
  for (const enemyId of ENEMIES) {
    for (const heroId of HEROES) {
      await expect(
        page.getByTestId(`combats-target-${heroId}-${enemyId}`),
        `objetivo de ${heroId}:${enemyId}`,
      ).toHaveValue(String(GUIDE_BY_ENEMY[enemyId]));
    }
  }
  await expect(page.getByTestId('weapon-espada-damage')).toHaveValue('8');
  await expect(page.getByTestId('hero-field-guerrero-maxHp')).toHaveValue('1');

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
  expect(await readTargets(page)).toEqual(guide);
  expect(await readOverridesId(page)).toBe(emptyId);

  // Ensuciar los tres y usar el reset global.
  await page.getByTestId('combats-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('hero-field-guerrero-maxHp').fill('1');
  await waitForBenchStatus(page, 'Recalculado: 3 filas afectadas.');
  await page.getByTestId('combats-target-mago-bruto').fill('70');
  await waitForBenchStatus(page, 'diagnóstico actualizado');

  await page.getByTestId('bench-reset-all').click();
  await waitForBenchStatus(page, 'Todo restablecido');
  await expect.poll(() => readOverrides(page), { timeout: 10_000 }).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(await readResults(page)).toEqual(base);
  expect(await readTargets(page)).toEqual(guide);
  expect(await readOverridesId(page)).toBe(emptyId);
  await expect(page.getByTestId('combats-field-centinela-maxHp')).toHaveValue(
    '6',
  );
  await expect(page.getByTestId('weapon-espada-damage')).toHaveValue('3');
  await expect(page.getByTestId('hero-field-guerrero-maxHp')).toHaveValue('20');
  for (const enemyId of ENEMIES) {
    for (const heroId of HEROES) {
      await expect(
        page.getByTestId(`combats-target-${heroId}-${enemyId}`),
      ).toHaveValue(String(GUIDE_BY_ENEMY[enemyId]));
    }
  }

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

test('los filtros de Combates ajustan filas y rowspan, combinan y explican el vacío sin perder el foco', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openExperiment(page);

  const heroFilter = page.getByTestId('combats-filter-hero');
  const enemyFilter = page.getByTestId('combats-filter-enemy');
  const empty = page.getByTestId('combats-filter-empty');
  const rows = page.getByTestId('combats-rows').locator('tr');

  await expect(heroFilter).toBeVisible();
  await expect(enemyFilter).toBeVisible();
  await expect(empty).toBeHidden();
  await expect(rows).toHaveCount(12);

  // Filtro por héroe: una fila por bloque y el enemigo ocupa una sola fila.
  await heroFilter.fill('guerrero');
  await expect(heroFilter).toBeFocused();
  await expect(rows).toHaveCount(3);
  for (const enemyId of ENEMIES) {
    await expect(
      page.getByTestId(`combats-row-guerrero-${enemyId}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`combats-cell-${enemyId}-maxHp`),
      `rowspan de ${enemyId}`,
    ).toHaveAttribute('rowspan', '1');
    for (const field of SHARED_FIELDS) {
      await expect(
        page.getByTestId(`combats-cell-${enemyId}-${field}`),
      ).toHaveAttribute('rowspan', '1');
    }
  }
  await screenshotElement(
    page.getByTestId('combats-panel'),
    'combates-filtro-heroe',
    testInfo,
  );

  // Combinar héroe y enemigo da la intersección: una fila.
  await enemyFilter.fill('centinela');
  await expect(enemyFilter).toBeFocused();
  await expect(rows).toHaveCount(1);
  await expect(
    page.getByTestId('combats-row-guerrero-centinela'),
  ).toBeVisible();
  await expect(page.getByTestId('combats-cell-centinela-maxHp')).toHaveAttribute(
    'rowspan',
    '1',
  );
  await expect(page.getByTestId('combats-cell-bruto-maxHp')).toHaveCount(0);

  // Limpiar el héroe deja las cuatro filas del enemigo, con rowspan 4.
  await page.getByTestId('combats-filter-hero-clear').click();
  await expect(heroFilter).toHaveValue('');
  await expect(heroFilter).toBeFocused();
  await expect(rows).toHaveCount(4);
  for (const sharedField of [
    'combats-cell-centinela-maxHp',
    'combats-cell-centinela-habilidad',
  ]) {
    await expect(page.getByTestId(sharedField)).toHaveAttribute(
      'rowspan',
      '4',
    );
  }
  await screenshotElement(
    page.getByTestId('combats-panel'),
    'combates-filtro-enemigo',
    testInfo,
  );

  // Un filtro sin coincidencias muestra el aviso y no deja la tabla vacía.
  await heroFilter.fill('zombi');
  await expect(rows).toHaveCount(0);
  await expect(empty).toBeVisible();
  await expect(empty).toHaveText(/Sin resultados/);
  await expect(heroFilter).toBeFocused();
  await screenshotElement(
    page.getByTestId('combats-panel'),
    'combates-sin-resultados',
    testInfo,
  );

  // Limpiar enemigo y héroe restaura las 12 filas y oculta el aviso.
  await page.getByTestId('combats-filter-enemy-clear').click();
  await expect(enemyFilter).toHaveValue('');
  await page.getByTestId('combats-filter-hero-clear').click();
  await expect(heroFilter).toHaveValue('');
  await expect(heroFilter).toBeFocused();
  await expect(rows).toHaveCount(12);
  await expect(empty).toBeHidden();
  for (const enemyId of ENEMIES) {
    await expect(
      page.getByTestId(`combats-cell-${enemyId}-maxHp`),
    ).toHaveAttribute('rowspan', '4');
  }

  expect(errors).toEqual([]);
});

test('los filtros de Armas y Héroes buscan por unidad sin mayúsculas ni tildes y conservan el foco', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openExperiment(page);

  const weaponsFilter = page.getByTestId('weapons-filter');
  const heroesFilter = page.getByTestId('heroes-filter');
  await expect(weaponsFilter).toBeVisible();
  await expect(heroesFilter).toBeVisible();

  // Armas: «guerrero» muestra el arma que usa el Guerrero, no las demás.
  await weaponsFilter.fill('guerrero');
  await expect(weaponsFilter).toBeFocused();
  await expect(page.getByTestId('weapons-row-espada')).toBeVisible();
  await expect(page.getByTestId('weapon-users-espada')).toContainText(
    'Guerrero',
  );
  for (const weaponId of ['hacha', 'daga', 'cuchillo']) {
    await expect(page.getByTestId(`weapons-row-${weaponId}`)).toBeHidden();
  }
  await expect(page.getByTestId('weapons-filter-empty')).toBeHidden();
  await screenshotElement(
    page.getByTestId('weapons-panel'),
    'armas-filtro-unidad',
    testInfo,
  );

  // Mayúsculas: la misma consulta en mayúsculas conserva el resultado.
  await page.getByTestId('weapons-filter-clear').click();
  await expect(weaponsFilter).toHaveValue('');
  await expect(weaponsFilter).toBeFocused();
  await expect(page.getByTestId('weapon-rows').locator('tr')).toHaveCount(4);
  await weaponsFilter.fill('GUERRERO');
  await expect(page.getByTestId('weapons-row-espada')).toBeVisible();
  await expect(page.getByTestId('weapons-row-daga')).toBeHidden();

  // Sin coincidencias: aviso visible y ninguna fila.
  await weaponsFilter.fill('zombi');
  await expect(page.getByTestId('weapon-rows').locator('tr[hidden]')).toHaveCount(
    4,
  );
  await expect(page.getByTestId('weapons-filter-empty')).toBeVisible();
  await page.getByTestId('weapons-filter-clear').click();
  await expect(page.getByTestId('weapons-filter-empty')).toBeHidden();

  // Héroes: «clerigo» y «CLÉRIGO» encuentran a Clérigo.
  await heroesFilter.fill('clerigo');
  await expect(heroesFilter).toBeFocused();
  await expect(page.getByTestId('heroes-row-clerigo')).toBeVisible();
  for (const heroId of ['guerrero', 'picaro', 'mago']) {
    await expect(page.getByTestId(`heroes-row-${heroId}`)).toBeHidden();
  }
  await expect(page.getByTestId('heroes-filter-empty')).toBeHidden();
  await screenshotElement(
    page.getByTestId('heroes-panel'),
    'heroes-filtro',
    testInfo,
  );

  await page.getByTestId('heroes-filter-clear').click();
  await expect(heroesFilter).toHaveValue('');
  await expect(heroesFilter).toBeFocused();
  await expect(page.getByTestId('hero-rows').locator('tr')).toHaveCount(4);
  await heroesFilter.fill('CLÉRIGO');
  await expect(page.getByTestId('heroes-row-clerigo')).toBeVisible();
  await expect(page.getByTestId('heroes-row-guerrero')).toBeHidden();

  // Sin coincidencias: aviso visible.
  await heroesFilter.fill('zombi');
  await expect(page.getByTestId('heroes-filter-empty')).toBeVisible();
  await expect(page.getByTestId('heroes-filter-empty')).toHaveText(
    /Sin resultados/,
  );
  await page.getByTestId('heroes-filter-clear').click();
  await expect(page.getByTestId('heroes-filter-empty')).toBeHidden();
  await expect(page.getByTestId('hero-rows').locator('tr')).toHaveCount(4);

  expect(errors).toEqual([]);
});

test('el export v2 incluye objetivos por par y es determinista aunque haya filtros activos', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  await expect(page.locator('.test-badge')).toHaveText('modo test determinista');
  const base = await readResults(page);

  // Export base: 12 objetivos de guía, versión 2 e id determinista.
  const guideDecision = await readDecision(page);
  expect(Object.keys(guideDecision.targets)).toHaveLength(12);
  expect(guideDecision.targets).toEqual(GUIDE_TARGETS);
  expect(guideDecision.targetsVersion).toBe(2);
  expect(guideDecision.targetsId).toMatch(/^[0-9a-f]{8}$/);

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
  expect(first.targetsVersion).toBe(2);
  expect(first.targetsId).toBe(guideDecision.targetsId);
  expect(Object.keys(first.targets)).toHaveLength(12);
  expect(first.targets).toEqual(GUIDE_TARGETS);

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

  // Diagnóstico completo: 3 enemigos × 4 filas con su propio objetivo.
  expect(first.diagnosis).toHaveLength(3);
  for (const entry of first.diagnosis) {
    expect(entry.rows).toHaveLength(4);
    expect(entry.total).toBe(4);
    expect(entry.margin).toBe(MARGIN_PP);
    expect(
      entry.rows.every(
        (row) => row.target === GUIDE_TARGETS[`${row.heroId}:${entry.enemyId}`],
      ),
    ).toBe(true);
  }
  expect(first.matchups).toHaveLength(12);

  const snapshot = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(snapshot.overridesId).toBe(id);
  expect(snapshot.targets).toEqual(first.targets);
  expect(snapshot.diagnosis).toEqual(first.diagnosis);

  // Los filtros no alteran medición, diagnóstico, 4-de-4 ni export.
  const rowsBefore = await combatRowTexts(page);
  const foursBefore = await combatFourTexts(page);
  const resultsBeforeFilters = await readResults(page);
  const realBeforeFilters = await realCellText(page, 'guerrero', 'centinela');
  await page.getByTestId('combats-filter-hero').fill('guerrero');
  await page.getByTestId('combats-filter-enemy').fill('centinela');
  await page.getByTestId('weapons-filter').fill('guerrero');
  await page.getByTestId('heroes-filter').fill('clerigo');
  expect(JSON.stringify(await readDecision(page))).toBe(
    JSON.stringify(first),
  );
  expect(await readResults(page)).toEqual(resultsBeforeFilters);
  await expect(
    page.getByTestId('combats-real-guerrero-centinela'),
  ).toHaveText(realBeforeFilters);
  await expect(page.getByTestId('combats-four-centinela')).toHaveText(
    foursBefore.centinela ?? '',
  );
  await page.getByTestId('combats-filter-hero-clear').click();
  await page.getByTestId('combats-filter-enemy-clear').click();
  await page.getByTestId('weapons-filter-clear').click();
  await page.getByTestId('heroes-filter-clear').click();
  expect(await combatRowTexts(page)).toEqual(rowsBefore);
  expect(await combatFourTexts(page)).toEqual(foursBefore);
  expect(JSON.stringify(await readDecision(page))).toBe(
    JSON.stringify(first),
  );

  // Descarga ajustada por overrides y guía: nombre con overridesId y JSON de la API.
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
    'objetivos: Centinela 75/75/75/75 % · Bruto 30/30/30/30 % · Cobarde 85/85/85/85 %',
  );

  // Cambiar un objetivo cambia targetsId y el nombre, pero no overridesId.
  await page.getByTestId('combats-target-guerrero-centinela').fill('60');
  await waitForBenchStatus(page, 'diagnóstico actualizado');
  const changed = await readDecision(page);
  expect(changed.targets['guerrero:centinela']).toBe(60);
  expect(changed.targetsId).not.toBe(first.targetsId);
  expect(changed.overridesId).toBe(id);
  expect(changed.matchups).toEqual(first.matchups);
  const changedName = `EXP-003-v2.0-seed-1017-duels-1000-bench-overrides-${id}-targets-${changed.targetsId}.json`;
  const changedDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const changedDownload = await changedDownloadPromise;
  expect(changedDownload.suggestedFilename()).toBe(changedName);
  const changedPath = await saveDownload(
    changedDownload,
    testInfo,
    `bench-overrides-${id}-targets-${changed.targetsId}.json`,
  );
  const changedWritten = JSON.parse(
    await readFile(changedPath, 'utf8'),
  ) as Record<string, unknown>;
  expect(changedWritten).toEqual(changed);
  await expect(page.getByTestId('export-summary')).toContainText(
    'objetivos: Centinela 60/75/75/75 % · Bruto 30/30/30/30 % · Cobarde 85/85/85/85 %',
  );

  await screenshot(page, 'export-ajustado', testInfo);

  // Reset global: el export vuelve al nombre y contenido base.
  await page.getByTestId('bench-reset-all').click();
  await waitForBenchStatus(page, 'Todo restablecido');
  const baseDecision = await readDecision(page);
  expect(baseDecision).toMatchObject({
    overrides: { enemies: {}, weapons: {}, heroes: {} },
    targets: GUIDE_TARGETS,
    targetsVersion: 2,
    overridesId: await readOverridesId(page),
  });
  expect(baseDecision.targetsId).toBe(guideDecision.targetsId);
  expect((await readResults(page)).matchups).toEqual(base.matchups);

  const baseDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const baseDownload = await baseDownloadPromise;
  expect(baseDownload.suggestedFilename()).toBe(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );
  const basePath = await saveDownload(baseDownload, testInfo, 'bench-base.json');
  const baseWritten = JSON.parse(await readFile(basePath, 'utf8')) as {
    targets: unknown;
    targetsVersion: number;
    targetsId: string;
    overrides: unknown;
    matchups: unknown;
    catalog: { bestiary: ReadonlyArray<{ id: string; maxHp: number }> };
  };
  expect(baseWritten.targets).toEqual(GUIDE_TARGETS);
  expect(baseWritten.targetsVersion).toBe(2);
  expect(baseWritten.targetsId).toBe(guideDecision.targetsId);
  expect(baseWritten.overrides).toEqual({
    enemies: {},
    weapons: {},
    heroes: {},
  });
  expect(baseWritten.matchups).toEqual(base.matchups);

  expect(errors).toEqual([]);
});

for (const viewport of VIEWPORTS) {
  test(`QA visual ${viewport.label}: tres tablas, filtros y objetivo por fila sin overflow de documento`, async ({
    page,
  }, testInfo) => {
    const errors = trackConsoleErrors(page);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await openExperiment(page);

    // Los cuatro pares del Centinela dentro dejan el bloque en 4/4; Bruto fuera.
    for (const heroId of HEROES) {
      await page.getByTestId(`combats-target-${heroId}-centinela`).fill('100');
    }
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
          testId: (input as HTMLElement).dataset.testid ?? '',
          fontSize: Number.parseFloat(style.fontSize),
          height: rect.height,
          width: rect.width,
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
      const filterLabels = [
        ...document.querySelectorAll<HTMLElement>('.filter-field'),
      ].map((label) => ({
        text: label.textContent ?? '',
        visible: label.offsetParent !== null,
        rect: label.getBoundingClientRect().toJSON(),
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
        filterLabels,
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
      for (const selector of ['.combats-panel', '.heroes-panel']) {
        const panelScroll = await page.locator(`${selector} .table-scroll`).evaluate(
          (node) => ({
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
          }),
        );
        expect(panelScroll.scrollWidth).toBeGreaterThan(panelScroll.clientWidth);
      }
    } else {
      expect(layout.combatsScroll?.scrollWidth).toBeLessThanOrEqual(
        (layout.combatsScroll?.clientWidth ?? 0) + 1,
      );
      expect(layout.heroesScroll?.scrollWidth).toBeLessThanOrEqual(
        (layout.heroesScroll?.clientWidth ?? 0) + 1,
      );
    }

    // Los cuatro campos de filtro existen, se ven y conservan su etiqueta.
    expect(layout.filterLabels).toHaveLength(4);
    for (const label of layout.filterLabels) {
      expect(label.visible).toBe(true);
      expect(label.text.trim().length).toBeGreaterThan(0);
    }
    for (const testId of [
      'combats-filter-hero',
      'combats-filter-enemy',
      'weapons-filter',
      'heroes-filter',
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByTestId(testId)).toHaveValue('');
    }

    // Inputs legibles y presentes, con los 12 objetivos por fila.
    expect(layout.inputs.length).toBeGreaterThan(0);
    for (const input of layout.inputs) {
      expect(input.visible).toBe(true);
      expect(input.fontSize).toBeGreaterThanOrEqual(11);
      expect(input.height).toBeGreaterThanOrEqual(18);
    }
    const targetInputs = layout.inputs.filter((input) =>
      input.testId.startsWith('combats-target-'),
    );
    expect(targetInputs).toHaveLength(12);
    for (const target of targetInputs) {
      expect(target.width).toBeGreaterThan(0);
      expect(target.fontSize).toBeGreaterThanOrEqual(11);
      expect(target.height).toBeGreaterThanOrEqual(18);
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
