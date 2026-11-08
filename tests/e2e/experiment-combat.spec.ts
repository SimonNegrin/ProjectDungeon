import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type {
  AttackSummary,
  CombatExperimentApi,
  Combatant,
  DuelSummary,
  RosterMode,
} from '../../experiments/EXP-003-mesa-combate/src/combat';
import { artifactPath } from './artifacts';

const SEED = 1017;

test.use({ viewport: { width: 1600, height: 1200 } });

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openExperiment(page: Page, extra = ''): Promise<void> {
  await page.goto(
    `/experiments/EXP-003-mesa-combate/?test=1&seed=${SEED}${extra}`,
  );
  await page.waitForFunction(() => Boolean(window.__experiment));
}

type PageState = {
  preset: RosterMode;
  seed: number;
  duels: number;
  roster: Combatant[];
  selection: { attackerId: string; defenderId: string };
  attack: AttackSummary;
  duel: DuelSummary;
};

async function readState(page: Page): Promise<PageState> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    const metrics = api.getMetrics();
    return {
      preset: api.getPreset(),
      seed: api.getSeed(),
      duels: api.getDuels(),
      roster: api.getRoster(),
      selection: api.getSelection(),
      attack: metrics.attack,
      duel: metrics.duel,
    };
  });
}

async function setNumber(page: Page, testId: string, value: number): Promise<void> {
  await page.getByTestId(testId).fill(String(value));
  await page.getByTestId(testId).evaluate((element) => {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function combatant(state: PageState, id: string): Combatant {
  const found = state.roster.find((unit) => unit.id === id);
  if (!found) throw new Error(`No existe ${id} en el roster`);
  return found;
}

test('el índice lista EXP-003 y los presets A/B/C/D cambian roster y métricas', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/experiments/?test=1');
  await expect(
    page.locator('a[href="/experiments/EXP-003-mesa-combate/"]'),
  ).toBeVisible();
  await expect(
    page.locator('.experiment-card').filter({ hasText: 'Mesa de combate configurable' }),
  ).toBeVisible();

  await openExperiment(page);
  await expect(page.getByTestId('experiment-title')).toHaveText(
    'Mesa de combate configurable',
  );
  await expect(page.getByTestId('preset-notes')).toContainText('C · Tanque');
  await expect(page.getByTestId('preset-notes')).toContainText('D · Letal');
  expect(await page.getByTestId('decision-select').inputValue()).toBe('');

  const a = await readState(page);
  expect(a.preset).toBe('A');
  expect(a.seed).toBe(SEED);
  expect(a.roster).toHaveLength(4);
  expect(combatant(a, 'jugador')).toMatchObject({
    hp: 20,
    acc: 1,
    dmg: 1,
    def: 1,
    weaponAcc: 3,
    weaponDmg: 4,
  });
  expect(a.attack.impactHits).toBe(30);
  expect(a.attack.expectedAttacksToKill).toBeCloseTo(2.63, 2);
  await expect(page.getByTestId('attack-impact-chance')).toContainText('30/36');
  await expect(page.getByTestId('attack-expected-attacks')).toHaveText('2,63');
  await screenshot(page, 'preset-a', testInfo);

  await page.getByTestId('param-preset').selectOption('B');
  const b = await readState(page);
  expect(b.preset).toBe('B');
  expect(combatant(b, 'jugador')).toMatchObject({ hp: 20, acc: 0, dmg: 0, def: 0 });
  expect(b.attack.impactHits).toBe(26);
  expect(b.attack.impactHits).toBeLessThan(a.attack.impactHits);
  expect(b.attack.expectedAttacksToKill).toBeGreaterThan(
    a.attack.expectedAttacksToKill,
  );
  await expect(page.getByTestId('preset-description')).toContainText('base a +0');
  await screenshot(page, 'preset-b', testInfo);

  await page.getByTestId('param-preset').selectOption('C');
  const c = await readState(page);
  expect(c.preset).toBe('C');
  expect(combatant(c, 'jugador')).toMatchObject({ hp: 26, armor: 2, dmg: 0 });
  expect(combatant(c, 'centinela')).toMatchObject({ hp: 15, armor: 2 });
  expect(c.attack.expectedAttacksToKill).toBeGreaterThan(
    a.attack.expectedAttacksToKill,
  );
  await expect(page.getByTestId('preset-description')).toContainText('+6 PV');
  await screenshot(page, 'preset-c', testInfo);

  await page.getByTestId('param-preset').selectOption('D');
  const d = await readState(page);
  expect(d.preset).toBe('D');
  expect(combatant(d, 'jugador')).toMatchObject({ hp: 13, dmg: 3 });
  expect(combatant(d, 'centinela')).toMatchObject({ hp: 6, dmg: 2 });
  expect(d.attack.expectedAttacksToKill).toBeLessThan(
    a.attack.expectedAttacksToKill,
  );
  await expect(page.getByTestId('preset-description')).toContainText('0,65');
  await screenshot(page, 'preset-d', testInfo);

  expect(errors).toEqual([]);
});

test('el roster permite añadir, duplicar, editar y eliminar sin recargar', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page.getByTestId('roster-add').click();
  await expect(page.getByTestId('roster-row-custom-1')).toBeVisible();
  expect(await page.getByTestId('param-preset').inputValue()).toBe('personalizada');
  expect((await readState(page)).roster).toHaveLength(5);

  await page.getByTestId('roster-custom-1-name').fill('Explorador');
  await page.getByTestId('roster-custom-1-side').selectOption('jugador');
  await setNumber(page, 'roster-custom-1-hp', 14);
  await setNumber(page, 'roster-custom-1-acc', 2);
  await page.getByTestId('roster-custom-1-weapon').selectOption('hacha');
  await expect(page.getByTestId('roster-custom-1-weaponAcc')).toHaveValue('2');
  await expect(page.getByTestId('roster-custom-1-weaponDmg')).toHaveValue('6');

  const edited = await readState(page);
  expect(edited.preset).toBe('personalizada');
  expect(combatant(edited, 'custom-1')).toMatchObject({
    name: 'Explorador',
    side: 'jugador',
    hp: 14,
    acc: 2,
    weapon: 'hacha',
    weaponAcc: 2,
    weaponDmg: 6,
  });
  expect(edited.attack.impactHits).toBeGreaterThanOrEqual(0);
  await expect(page.getByTestId('attack-impact-chance')).not.toHaveText('—');

  await page.getByTestId('roster-custom-1-duplicate').click();
  await expect(page.getByTestId('roster-row-custom-2')).toBeVisible();
  expect(combatant(await readState(page), 'custom-2')).toMatchObject({
    name: 'Explorador (copia)',
    hp: 14,
    weapon: 'hacha',
  });

  await setNumber(page, 'roster-custom-2-hp', 11);
  expect(combatant(await readState(page), 'custom-2').hp).toBe(11);

  await page.getByTestId('roster-custom-2-remove').click();
  await expect(page.getByTestId('roster-row-custom-2')).toHaveCount(0);
  expect(await page.getByTestId('roster-row-custom-1').count()).toBe(1);
  expect((await readState(page)).roster).toHaveLength(5);

  await screenshot(page, 'roster-personalizado', testInfo);
  expect(errors).toEqual([]);
});

test('calcula un ataque y simula el duelo de forma determinista', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page.getByTestId('param-attacker').selectOption('jugador');
  await page.getByTestId('param-defender').selectOption('centinela');

  const state = await readState(page);
  expect(state.selection).toEqual({
    attackerId: 'jugador',
    defenderId: 'centinela',
  });
  expect(state.attack).toMatchObject({
    impactDifference: 3,
    impactHits: 30,
    damageMin: 1,
    damageMax: 9,
  });
  expect(state.attack.damageMean).toBeCloseTo(4.11, 2);
  expect(state.attack.expectedDamagePerAttack).toBeCloseTo(3.43, 2);
  await expect(page.getByTestId('attack-damage-min')).toHaveText('1');
  await expect(page.getByTestId('attack-damage-max')).toHaveText('9');
  await expect(page.getByTestId('attack-damage-mean')).toHaveText('4,11');
  await expect(page.getByTestId('duel-count-value')).toHaveText('1000');

  const first = await page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    return api.simulateDuel({ seed: 1017, duels: 200 });
  });
  const second = await page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    return api.simulateDuel({ seed: 1017, duels: 200 });
  });
  expect(first).toEqual(second);
  expect(first).toMatchObject({
    seed: 1017,
    count: 200,
    attackerId: 'jugador',
    defenderId: 'centinela',
  });
  expect(first.attackerWins + first.defenderWins + first.draws).toBe(200);

  const otherSeed = await page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    return api.simulateDuel({ seed: 1, duels: 200 });
  });
  expect(otherSeed).not.toEqual(first);

  await page.getByTestId('seed-input').fill('1');
  await page.getByTestId('seed-input').dispatchEvent('change');
  await expect.poll(async () => (await readState(page)).seed).toBe(1);
  expect((await readState(page)).duel.seed).toBe(1);

  await page.getByTestId('seed-input').fill(String(SEED));
  await page.getByTestId('seed-input').dispatchEvent('change');
  await expect.poll(async () => (await readState(page)).seed).toBe(SEED);
  await page.getByTestId('duel-simulate').click();
  await expect(page.getByTestId('decision-status')).toContainText(
    `semilla ${SEED}`,
  );

  expect(errors).toEqual([]);
});

test('exporta el JSON descargado y una tabla personalizada', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page.getByTestId('decision-select').selectOption('A');
  await page
    .getByTestId('decision-notes')
    .fill('La tabla A se siente equilibrada; falta el playtest.');

  const decision = await page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    return api.getDecision();
  });
  expect(decision).toMatchObject({
    experiment: 'EXP-003',
    seed: SEED,
    preset: 'A',
    decision: 'A',
    attackerId: 'jugador',
    defenderId: 'centinela',
  });
  expect(decision.roster).toHaveLength(4);
  expect(decision.attack.impactHits).toBe(30);
  expect(decision.duel.count).toBe(1000);
  expect(decision.notes).toContain('playtest');
  expect(decision.presetDefinitions.C.detail).toContain('+6 PV');
  expect(decision.presetDefinitions.D.detail).toContain('+2 al daño');
  expect(Number.isNaN(Date.parse(decision.decidedAt))).toBe(false);
  const snapshot = await page.evaluate(() => {
    const api = window.__experiment as unknown as CombatExperimentApi;
    return api.snapshot();
  });
  expect(snapshot).toMatchObject({
    seed: SEED,
    params: { preset: 'A', seed: SEED, attacker: 'jugador', defender: 'centinela' },
  });
  expect(snapshot.roster).toHaveLength(4);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('decision-download').click();
  const download = await downloadPromise;
  const decisionPath = artifactPath(testInfo, 'decision-exp-003.json');
  await mkdir(dirname(decisionPath), { recursive: true });
  await download.saveAs(decisionPath);
  const written = JSON.parse(await readFile(decisionPath, 'utf8')) as {
    experiment: string;
    seed: number;
    preset: string;
    decision: string;
    notes: string;
    roster: Combatant[];
    attack: AttackSummary;
    duel: DuelSummary;
    decidedAt: string;
  };
  expect(written).toMatchObject({
    experiment: 'EXP-003',
    seed: SEED,
    preset: 'A',
    decision: 'A',
  });
  expect(written.notes).toContain('playtest');
  expect(written.roster).toHaveLength(4);
  expect(written.attack.impactHits).toBe(30);
  expect(written.duel.count).toBe(1000);
  expect(Number.isNaN(Date.parse(written.decidedAt))).toBe(false);

  await setNumber(page, 'roster-jugador-hp', 24);
  await page.getByTestId('decision-select').selectOption('personalizada');
  expect((await readState(page)).preset).toBe('personalizada');
  expect(combatant(await readState(page), 'jugador').hp).toBe(24);
  await screenshot(page, 'tabla-personalizada', testInfo);

  const customDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('decision-download').click();
  const customDownload = await customDownloadPromise;
  const customPath = artifactPath(testInfo, 'decision-personalizada.json');
  await mkdir(dirname(customPath), { recursive: true });
  await customDownload.saveAs(customPath);
  const custom = JSON.parse(await readFile(customPath, 'utf8')) as {
    preset: string;
    decision: string;
    roster: Combatant[];
  };
  expect(custom.preset).toBe('personalizada');
  expect(custom.decision).toBe('personalizada');
  expect(custom.roster.find((unit) => unit.id === 'jugador')?.hp).toBe(24);

  expect(errors).toEqual([]);
});
