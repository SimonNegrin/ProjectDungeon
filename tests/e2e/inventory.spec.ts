import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  emptyEquipment,
  inventoryFromIds,
  itemInstance,
  synchronizeUnitResources,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import { formatProfile } from '../../src/host/damage-labels';
import {
  advanceToCue,
  debugText,
  dispatchFrozen,
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  settle,
  snapshot,
} from './support';
import { makeState, makeUnit } from '../unit/game/helpers';

const SEED = 279837264;

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/**
 * Portador con escudo y traits secundarios; la maza espera en la mochila. Los
 * E2E leen los traits del catálogo, no fixtures inyectados.
 */
function carrierState() {
  const player = synchronizeUnitResources(
    makeUnit({
      id: 'player-1',
      nombre: 'Ada',
      faction: 'player',
      x: 5,
      y: 5,
      equipmentSlots: {
        ...emptyEquipment(),
        shield: itemInstance('shield', 'shield'),
        neck: itemInstance('neck', 'mana-necklace'),
        hands: itemInstance('hands', 'action-gloves'),
        ring: itemInstance('ring', 'lifesteal-ring'),
      },
      inventory: inventoryFromIds('player-1', ['circular-mace']),
    }),
  );
  return makeState({ players: [player], enemies: [] });
}

/** Guerrero con maza y anillo rodeado por tres hostiles en el anillo 3×3. */
function circularState() {
  const player = synchronizeUnitResources(
    makeUnit({
      id: 'player-1',
      nombre: 'Ada',
      faction: 'player',
      x: 5,
      y: 5,
      hp: 5,
      stats: { habilidad: 99 },
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('mace', 'circular-mace'),
        ring: itemInstance('ring', 'lifesteal-ring'),
      },
    }),
  );
  const enemy = (id: string, nombre: string, x: number, y: number) =>
    makeUnit({
      id,
      nombre,
      faction: 'enemy',
      x,
      y,
      hp: 100,
      maxHp: 100,
      equipmentSlots: emptyEquipment(),
    });
  return makeState({
    players: [player],
    enemies: [
      enemy('enemy-1', 'Goblin derecho', 6, 5),
      enemy('enemy-2', 'Goblin diagonal', 4, 4),
      enemy('enemy-3', 'Goblin inferior', 6, 6),
    ],
  });
}

/** Espacios colapsados para comparar celdas que envuelven en varias líneas. */
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Valor de una celda del desglose de la ficha derecha. */
async function breakdownValue(
  page: Page,
  stat: string,
  source: string,
): Promise<string> {
  return normalizeText(
    (await page
      .getByTestId('hud-panel-breakdown')
      .locator(`li[data-stat="${stat}"] [data-source="${source}"]`)
      .textContent()) ?? '',
  );
}

test('panel: traits de la maza antes de equipar y rechazo de escudo sin cambios parciales', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, carrierState(), SEED);

  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await selectPanelRow(page, 'backpack:0');
  await settle(page);

  // Antes de equipar: nombre, descripción y efecto del trait visible.
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    'Maza circular',
  );
  const selectedTraits = await page
    .getByTestId('hud-panel-selected-traits')
    .locator('li')
    .allTextContents();
  expect(selectedTraits).toHaveLength(1);
  expect(selectedTraits[0]).toContain('Ataque circular:');
  expect(selectedTraits[0]).toContain('Golpea las 8 casillas adyacentes');
  expect(selectedTraits[0]).toContain('radio 1');
  expect(selectedTraits[0]).toContain('1 acción');
  await screenshot(page, 'panel-maza-trait-antes-de-equipar', testInfo);

  const beforeEquip = await snapshot(page);
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const equipped = await snapshot(page);
  expect(equipped.players[0].equipment.weapon?.itemId).toBe('circular-mace');
  expect(equipped.players[0].equipment.shield).toBeNull();
  expect(equipped.players[0].inventory.items[0]?.itemId).toBe('shield');
  expect(equipped.players[0].mp).toBe(beforeEquip.players[0].mp - 1);

  // El escudo vuelve a la mochila; intentar equiparlo con la maza se rechaza.
  const beforeRejection = await snapshot(page);
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toHaveText(
    'El arma a dos manos no admite escudo',
  );
  const afterRejection = await snapshot(page);
  expect(afterRejection.players[0].equipment).toEqual(
    beforeRejection.players[0].equipment,
  );
  expect(afterRejection.players[0].inventory).toEqual(
    beforeRejection.players[0].inventory,
  );
  expect(afterRejection.players[0].mp).toBe(beforeRejection.players[0].mp);
  expect(afterRejection.players[0].actions).toEqual(
    beforeRejection.players[0].actions,
  );
  await screenshot(page, 'panel-maza-escudo-rechazo', testInfo);

  // La ficha del portador (F1) desglosa las tres fuentes y lista los traits.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debug = await debugText(page);
  expect(debug).toContain('Traits activos:');
  expect(debug).toContain('Ataque circular (Maza circular, Arma)');
  expect(debug).toContain('Robo de vida (Anillo de robo, Anillo)');
  expect(debug).toContain(
    'Desglose MP máximos: inherente 6 · equipo +0 · traits +2 = 8',
  );
  expect(debug).toContain(
    'Desglose Acciones: inherente 2 · equipo +0 · traits +1 = 3',
  );
  await screenshot(page, 'f1-desglose-y-traits', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test('ficha: el desglose del portador se lee sin F1, cabe a 900×700 y sigue al motor', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await page.setViewportSize({ width: 900, height: 700 });
  await openState(page, carrierState(), SEED);

  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  const breakdown = page.getByTestId('hud-panel-breakdown');
  await expect(breakdown).toBeVisible();
  // La ficha derecha es visible con el panel abierto y sin pulsar F1.
  await expect(page.getByTestId('hud-right')).toBeVisible();
  await expect(page.getByTestId('hud-panel-breakdown-title')).toHaveText(
    'inherente + equipo + traits',
  );

  // Nueve atributos, una entrada por línea y con las cuatro fuentes.
  const rows = breakdown.locator('li[data-stat]');
  await expect(rows).toHaveCount(9);
  expect(
    await rows.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.stat),
    ),
  ).toEqual([
    'habilidad',
    'fuerza',
    'defensa',
    'punteria',
    'resistencia',
    'magia',
    'pvMax',
    'mpMax',
    'acciones',
  ]);
  expect(
    await breakdown.locator('.hud-breakdown-stat').allTextContents(),
  ).toEqual([
    'Habilidad',
    'Fuerza',
    'Defensa',
    'Puntería',
    'Resistencia',
    'Magia',
    'PV máximos',
    'MP máximos',
    'Acciones',
  ]);

  // Cada total visible es el valor que publica el motor en el snapshot.
  const snap = await snapshot(page);
  const unit = snap.players[0];
  const profile = unit.effectiveStats;
  expect(await breakdownValue(page, 'mpMax', 'inherent')).toBe('6');
  expect(await breakdownValue(page, 'mpMax', 'equipment')).toBe('+0');
  expect(await breakdownValue(page, 'mpMax', 'traits')).toBe('+2');
  expect(await breakdownValue(page, 'mpMax', 'total')).toBe(
    `= ${profile.maxMp}`,
  );
  expect(await breakdownValue(page, 'acciones', 'traits')).toBe('+1');
  expect(await breakdownValue(page, 'acciones', 'total')).toBe(
    `= ${profile.actionsMax}`,
  );
  expect(await breakdownValue(page, 'pvMax', 'total')).toBe(
    `= ${profile.maxHp}`,
  );
  for (const stat of ['habilidad', 'fuerza', 'defensa', 'punteria'] as const) {
    expect(await breakdownValue(page, stat, 'total')).toBe(
      `= ${profile.stats[stat]}`,
    );
  }
  expect(await breakdownValue(page, 'magia', 'total')).toBe(
    `= ${profile.stats.magicLevel}`,
  );
  // Resistencia: niveles de las fuentes y perfil de bandas del motor.
  expect(await breakdownValue(page, 'resistencia', 'equipment')).toBe(
    'equipo +0',
  );
  expect(await breakdownValue(page, 'resistencia', 'traits')).toBe(
    'traits +0',
  );
  const resistanceRow = breakdown.locator('li[data-stat="resistencia"]');
  await expect(resistanceRow.locator('.hud-breakdown-profile-label')).toHaveText(
    'inherente = total',
  );
  expect(
    normalizeText(
      await resistanceRow
        .locator('.hud-breakdown-band')
        .evaluateAll((elements) =>
          elements.map((element) => element.textContent ?? '').join(' '),
        ),
    ),
  ).toBe(
    normalizeText(
      formatProfile(profile.stats.resistencia).replaceAll(' · ', ' '),
    ),
  );
  // Sin `·` entre stats (R-026) y sin abrir la capa de debug.
  expect(await breakdown.innerText()).not.toContain('·');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  // Cabe a 900×700: la ficha derecha no desplaza y la última fila queda dentro.
  const layout = await page.evaluate(() => {
    const right = document.querySelector<HTMLElement>('[data-testid="hud-right"]')!;
    const block = document.querySelector<HTMLElement>(
      '[data-testid="hud-panel-breakdown"]',
    )!;
    const last = block.querySelector<HTMLElement>('li[data-stat]:last-of-type')!;
    const rightRect = right.getBoundingClientRect();
    return {
      rightOverflow: right.scrollHeight - right.clientHeight,
      lastBottom: last.getBoundingClientRect().bottom,
      rightBottom: rightRect.bottom,
      rowTops: [
        ...block.querySelectorAll<HTMLElement>('li[data-stat]'),
      ].map((row) => Math.round(row.getBoundingClientRect().top)),
    };
  });
  expect(layout.rightOverflow).toBeLessThanOrEqual(1);
  expect(layout.lastBottom).toBeLessThanOrEqual(layout.rightBottom + 1);
  // Cada atributo ocupa su propia línea (las filas no comparten altura).
  expect(new Set(layout.rowTops).size).toBe(9);
  await screenshot(page, 'panel-desglose-portador-900x700', testInfo);

  // Con dos traits en la ficha la columna derecha se desplaza en vez de romper
  // el marco; el desglose sigue completo y su última fila se alcanza.
  await selectPanelRow(page, 'slot:ring');
  await settle(page);
  const tall = await page.evaluate(() => {
    const right = document.querySelector<HTMLElement>('[data-testid="hud-right"]')!;
    return { scrollable: right.scrollHeight > right.clientHeight };
  });
  expect(tall.scrollable).toBe(true);
  await page.getByTestId('hud-right').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const lastVisible = await page.evaluate(() => {
    const right = document.querySelector<HTMLElement>('[data-testid="hud-right"]')!;
    const last = document.querySelector<HTMLElement>(
      '[data-testid="hud-panel-breakdown"] li[data-stat]:last-of-type',
    )!;
    const rightRect = right.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    return (
      lastRect.bottom <= rightRect.bottom + 1 &&
      lastRect.top >= rightRect.top - 1
    );
  });
  expect(lastVisible).toBe(true);
  await screenshot(page, 'panel-desglose-ficha-scroll-900x700', testInfo);
  await page.getByTestId('hud-right').evaluate((element) => {
    element.scrollTop = 0;
  });
  // Vuelve al objeto de la mochila para la captura ancha y el desequipado.
  await selectPanelRow(page, 'backpack:0');
  await settle(page);

  // La misma ficha cabe a 1280×720 sin desplazar la columna derecha.
  await page.setViewportSize({ width: 1280, height: 720 });
  await settle(page);
  const wide = await page.evaluate(() => {
    const right = document.querySelector<HTMLElement>('[data-testid="hud-right"]')!;
    const block = document.querySelector<HTMLElement>(
      '[data-testid="hud-panel-breakdown"]',
    )!;
    const last = block.querySelector<HTMLElement>('li[data-stat]:last-of-type')!;
    return {
      rightOverflow: right.scrollHeight - right.clientHeight,
      lastBottom: last.getBoundingClientRect().bottom,
      rightBottom: right.getBoundingClientRect().bottom,
    };
  });
  expect(wide.rightOverflow).toBeLessThanOrEqual(1);
  expect(wide.lastBottom).toBeLessThanOrEqual(wide.rightBottom + 1);
  await screenshot(page, 'panel-desglose-portador-1280x720', testInfo);

  // El total sigue al motor al desequipar el collar sin cerrar el panel.
  await selectPanelRow(page, 'slot:neck');
  await pressPanelAction(page, panelActionTestId('unequip', 'slot:neck'));
  await settle(page);
  const after = await snapshot(page);
  expect(after.players[0].equipment.neck).toBeNull();
  expect(await breakdownValue(page, 'mpMax', 'traits')).toBe('+0');
  expect(await breakdownValue(page, 'mpMax', 'total')).toBe(
    `= ${after.players[0].effectiveStats.maxMp}`,
  );
  await screenshot(page, 'panel-desglose-portador-sin-collar', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('feedback: cada impacto del círculo y cada curación tienen texto y beat', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, circularState(), SEED);

  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-1',
  });
  const impacts = result.events.filter((event) => event.type === 'TraitImpact');
  const heals = result.events.filter((event) => event.type === 'TraitDamage');
  expect(impacts).toHaveLength(3);
  expect(heals).toHaveLength(3);
  expect(new Set(impacts.map((event) => event.targetId)).size).toBe(3);

  await advanceToCue(page, 'trait-impact');
  await expect(page.getByTestId('feedback-banner')).toContainText(
    'Ataque circular:',
  );
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'hit',
  );
  await expect(page.getByTestId('damage-feedback')).toContainText('-');
  await screenshot(page, 'feedback-ataque-circular', testInfo);

  await advanceToCue(page, 'trait-heal');
  await expect(page.getByTestId('feedback-banner')).toContainText(
    'Robo de vida:',
  );
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'heal',
  );
  await expect(page.getByTestId('damage-feedback')).toContainText('+');
  await screenshot(page, 'feedback-robo-de-vida', testInfo);

  await settle(page);
  expect(consoleErrors).toEqual([]);
});
