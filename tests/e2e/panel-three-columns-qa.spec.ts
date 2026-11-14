import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { type ItemId } from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  panelActionTestId,
  panelRows,
  pressPanelAction,
  selectPanelRow,
  settle,
  snapshot,
} from './support';

const SEED = 279837264;
const FULL_BACKPACK: readonly ItemId[] = [
  'axe',
  'dagger',
  'knife',
  'hammer',
  'electric-sword',
  'arcane-dagger',
  'plate',
  'shield',
];
const FOUR_GROUND: readonly ItemId[] = ['axe', 'dagger', 'knife', 'hammer'];
const MANY_GROUND: readonly ItemId[] = [
  'axe',
  'dagger',
  'knife',
  'hammer',
  'electric-sword',
  'arcane-dagger',
  'plate',
  'shield',
  'axe',
  'dagger',
  'knife',
  'hammer',
];

interface ScenarioOptions {
  readonly inventory?: readonly ItemId[];
  readonly ground?: readonly ItemId[];
  readonly mp?: number;
  readonly weaponId?: ItemId | null;
  readonly armorId?: ItemId | null;
  readonly shieldId?: ItemId | null;
}

function warriorScenario(options: ScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  const at = { x: template.x, y: template.y };
  return {
    ...base,
    players: [
      {
        ...template,
        mp: options.mp ?? template.maxMp,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: options.weaponId === undefined ? 'sword' : options.weaponId,
          armorId: options.armorId === undefined ? 'armor' : options.armorId,
          shieldId: options.shieldId === undefined ? 'shield' : options.shieldId,
        }),
        inventory: inventoryFromIds(template.id, options.inventory ?? []),
      },
    ],
    groundItems: (options.ground ?? []).map((itemId, index) => ({
      id: `item-test-ground-${index}`,
      itemId,
      x: at.x,
      y: at.y,
    })),
  };
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function openScenario(
  page: Page,
  options: ScenarioOptions,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await openState(page, warriorScenario(options));
}

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

async function selectedKey(page: Page): Promise<string> {
  return page.getByTestId('inventory-panel').evaluate(
    (panel) => (panel as HTMLElement).dataset.selectedKey ?? '',
  );
}

async function activeKey(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    return active.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null;
  });
}

async function activeZone(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    return active.closest<HTMLElement>('[data-zone]')?.dataset.zone ?? null;
  });
}

/** Coherencia N-010: si el foco cae en un objeto, ese objeto es el seleccionado. */
async function expectFocusMatchesSelection(page: Page): Promise<void> {
  const focused = await activeKey(page);
  if (focused === null) return;
  expect(await selectedKey(page)).toBe(focused);
}

async function tabUntilZone(
  page: Page,
  zone: string,
  key: 'Tab' | 'Shift+Tab' = 'Tab',
): Promise<void> {
  for (let presses = 0; presses < 14; presses += 1) {
    await page.keyboard.press(key);
    if ((await activeZone(page)) === zone) return;
  }
  throw new Error(`No se alcanzó la parada ${zone} con ${key}`);
}

interface ScrollMetrics {
  readonly panel: { scrollHeight: number; clientHeight: number; scrollWidth: number; clientWidth: number };
  readonly body: { scrollHeight: number; clientHeight: number; scrollWidth: number; clientWidth: number } | null;
  readonly columns: Array<{ scrollHeight: number; clientHeight: number; scrollWidth: number; clientWidth: number }>;
  readonly ground: { scrollTop: number; scrollHeight: number; clientHeight: number } | null;
}

async function scrollMetrics(page: Page): Promise<ScrollMetrics> {
  return page.getByTestId('inventory-panel').evaluate((element) => {
    const panel = element as HTMLElement;
    const box = (node: HTMLElement) => ({
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    });
    const body = panel.querySelector<HTMLElement>('.inventory-panel-body');
    const ground = panel.querySelector<HTMLElement>(
      '[data-testid="inventory-ground-scroll"]',
    );
    return {
      panel: box(panel),
      body: body ? box(body) : null,
      columns: [...panel.querySelectorAll<HTMLElement>('.inventory-column')].map(box),
      ground: ground
        ? {
            scrollTop: ground.scrollTop,
            scrollHeight: ground.scrollHeight,
            clientHeight: ground.clientHeight,
          }
        : null,
    };
  });
}

function expectNoVerticalScroll(
  box: { scrollHeight: number; clientHeight: number } | null,
  label: string,
): void {
  expect(box, `${label} debe existir`).not.toBeNull();
  expect(box!.scrollHeight, `${label} recorta en vertical`).toBeLessThanOrEqual(
    box!.clientHeight + 1,
  );
}

test('tres columnas, ocho huecos y ocho casillas; los huecos vacíos no son paradas', async ({
  page,
}, testInfo) => {
  await openScenario(page, { inventory: FULL_BACKPACK, ground: FOUR_GROUND }, {
    width: 1280,
    height: 720,
  });
  await openPanel(page);

  const columns = page.locator('.inventory-column');
  await expect(columns).toHaveCount(3);
  const widths = await columns.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  );
  for (const width of widths) {
    expect(Math.abs(width - widths[0])).toBeLessThanOrEqual(2);
  }
  await expect(page.locator('.inventory-slot')).toHaveCount(8);
  await expect(page.locator('.inventory-backpack-cell')).toHaveCount(8);
  await expect(page.getByTestId('inventory-cadavers')).toBeVisible();
  await expect(page.getByTestId('inventory-cadavers-empty')).toContainText(
    'No hay cadáveres',
  );
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.locator('.inventory-ground-row')).toHaveCount(4);
  await expect(page.getByTestId('inventory-stats')).toHaveCount(0);

  // Solo los huecos ocupados son tabulables en la rejilla.
  for (const slot of ['head', 'neck', 'ring', 'feet', 'hands']) {
    const row = page.getByTestId(`inventory-slot-${slot}`);
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(await row.getAttribute('tabindex')).toBeNull();
  }

  const visited: string[] = [];
  for (let press = 0; press < 16; press += 1) {
    await page.keyboard.press('Tab');
    visited.push((await activeKey(page)) ?? '');
  }
  expect(visited).not.toContain('slot:head');
  expect(visited).not.toContain('slot:feet');

  // La figura coloca cabeza, torso, manos y pies en orden vertical.
  const box = async (testId: string) =>
    (await page.getByTestId(testId).boundingBox())!;
  const head = await box('inventory-slot-head');
  const armor = await box('inventory-slot-armor');
  const weapon = await box('inventory-slot-weapon');
  const feet = await box('inventory-slot-feet');
  expect(head.y).toBeLessThan(armor.y);
  expect(armor.y).toBeLessThan(feet.y);
  expect(weapon.y).toBeLessThan(feet.y);
  expect(head.x + head.width / 2).toBeGreaterThan(armor.x);

  await screenshot(page, 'tres-columnas-1280x720', testInfo);
  await page.keyboard.press('Escape');

  await openScenario(page, { inventory: FULL_BACKPACK, ground: FOUR_GROUND }, {
    width: 900,
    height: 700,
  });
  await openPanel(page);
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.locator('.inventory-ground-row')).toHaveCount(4);
  await screenshot(page, 'tres-columnas-900x700', testInfo);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await screenshot(page, 'foco-zonas-900x700', testInfo);
  const beforeReopen = await selectedKey(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  expect(await selectedKey(page)).toBe(beforeReopen);
  await screenshot(page, 'reapertura-900x700', testInfo);
});

test('flechas y WASD recorren el plano, sin rebote y con empate determinista', async ({
  page,
}) => {
  const options = {
    inventory: ['axe', 'dagger', 'knife', 'hammer'] as const,
    ground: ['axe', 'dagger'] as const,
  };

  const run = async (keys: readonly string[]): Promise<string[]> => {
    await openScenario(page, options, { width: 1280, height: 720 });
    await openPanel(page);
    const route = [await selectedKey(page)];
    for (const key of keys) {
      await page.keyboard.press(key);
      route.push(await selectedKey(page));
    }
    return route;
  };

  const arrows = ['ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  const wasd = ['s', 'd', 's', 'a'];
  const arrowRoute = await run(arrows);
  const wasdRoute = await run(wasd);
  expect(wasdRoute).toEqual(arrowRoute);

  // Repetir el mismo recorrido da el mismo resultado (empates deterministas).
  expect(await run(arrows)).toEqual(arrowRoute);

  // En el borde superior, una pulsación más no rebota al extremo opuesto.
  await openScenario(page, options, { width: 1280, height: 720 });
  await openPanel(page);
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  for (let press = 0; press < 8; press += 1) {
    const before = await selectedKey(page);
    await page.keyboard.press('ArrowUp');
    const after = await selectedKey(page);
    if (before === after) {
      await page.keyboard.press('ArrowUp');
      expect(await selectedKey(page)).toBe(after);
      break;
    }
    if (press === 7) throw new Error('No se alcanzó el borde superior');
  }
  expect(await activeKey(page)).toBe(await selectedKey(page));
});

test('Tab recorre zonas, conserva el foco al reabrir y lo reubica tras operar', async ({
  page,
}, testInfo) => {
  await openScenario(page, {
    inventory: ['axe', 'dagger'],
    ground: ['axe', 'dagger'],
  }, { width: 1280, height: 720 });
  await openPanel(page);

  const zones: string[] = [(await activeZone(page)) ?? ''];
  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press('Tab');
    await expectFocusMatchesSelection(page);
    const zone = (await activeZone(page)) ?? '';
    if (zone !== zones[zones.length - 1]) zones.push(zone);
  }
  expect(zones.slice(0, 5)).toEqual([
    'backpack',
    'right',
    'close',
    'equipment',
    'backpack',
  ]);

  // Equipo: Enter abre el submenú del objeto seleccionado sin mover la
  // selección; Escape lo cierra y devuelve el foco a la fila.
  await selectPanelRow(page, 'slot:armor');
  const equipmentKey = await selectedKey(page);
  expect(equipmentKey).toBe('slot:armor');
  await screenshot(page, 'foco-fila-equipo-1280x720', testInfo);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();
  await expect(
    page.locator(
      '[data-testid="inventory-submenu"] [data-kind="unequip"][data-active="true"]',
    ),
  ).toHaveCount(1);
  expect(await selectedKey(page)).toBe(equipmentKey);
  await screenshot(page, 'submenu-equipo-1280x720', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-submenu')).toBeHidden();
  expect(await activeZone(page)).toBe('equipment');
  expect(await activeKey(page)).toBe(equipmentKey);
  expect(await selectedKey(page)).toBe(equipmentKey);

  // Mochila: mismo camino; el submenú ofrece equipar y soltar.
  await selectPanelRow(page, 'backpack:1');
  expect(await selectedKey(page)).toBe('backpack:1');
  await screenshot(page, 'foco-fila-mochila-1280x720', testInfo);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();
  await expect(
    page.locator(
      '[data-testid="inventory-submenu"] [data-kind="equip"][data-active="true"]',
    ),
  ).toHaveCount(1);
  expect(await selectedKey(page)).toBe('backpack:1');
  await screenshot(page, 'submenu-mochila-1280x720', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-submenu')).toBeHidden();
  expect(await activeZone(page)).toBe('backpack');
  expect(await activeKey(page)).toBe('backpack:1');
  expect(await selectedKey(page)).toBe('backpack:1');
  await expectFocusMatchesSelection(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  expect(await selectedKey(page)).toBe('backpack:1');
  await screenshot(page, 'foco-conservado-1280x720', testInfo);

  // Recoger el objeto del suelo: la clave desaparece y el foco cae en la
  // mochila más próxima a su centro anterior, no al principio del panel.
  await selectPanelRow(page, 'ground:item-test-ground-0');
  const beforePickup = await snapshot(page);
  await pressPanelAction(
    page,
    panelActionTestId('pickup', 'ground:item-test-ground-0'),
  );
  await settle(page);
  const afterPickup = await snapshot(page);
  expect(afterPickup.players[0].mp).toBe(beforePickup.players[0].mp - 1);
  const key = await selectedKey(page);
  expect(key).not.toBe('ground:item-test-ground-0');
  const rowsAfterPickup = await panelRows(page);
  expect(rowsAfterPickup.some((row) => row.key === key)).toBe(true);
  expect(await activeKey(page)).toBe(key);

  // Memoria por zona no vacua: cambia de objeto en mochila, salta a la derecha,
  // cambia de objeto allí y vuelve con Shift+Tab/Tab. Foco y selección deben
  // regresar al recordado de cada zona, no al primero ni al último global.
  await selectPanelRow(page, 'backpack:1');
  expect(await selectedKey(page)).toBe('backpack:1');
  await tabUntilZone(page, 'right');
  await expectFocusMatchesSelection(page);

  await selectPanelRow(page, 'ground:item-test-ground-1');
  expect(await selectedKey(page)).toBe('ground:item-test-ground-1');
  await expectFocusMatchesSelection(page);

  await tabUntilZone(page, 'backpack', 'Shift+Tab');
  expect(await selectedKey(page)).toBe('backpack:1');
  expect(await activeKey(page)).toBe('backpack:1');

  await tabUntilZone(page, 'right');
  expect(await selectedKey(page)).toBe('ground:item-test-ground-1');
  expect(await activeKey(page)).toBe('ground:item-test-ground-1');
});

test('scroll: a 1280×720 solo el suelo puede desplazarse; a 900×700 también', async ({
  page,
}, testInfo) => {
  const log: Array<Record<string, unknown>> = [];

  await openScenario(page, { inventory: FULL_BACKPACK, ground: FOUR_GROUND }, {
    width: 1280,
    height: 720,
  });
  await openPanel(page);
  const desktop = await scrollMetrics(page);
  expectNoVerticalScroll(desktop.panel, 'panel 1280');
  expectNoVerticalScroll(desktop.body, 'cuerpo 1280');
  for (const [index, column] of desktop.columns.entries()) {
    expectNoVerticalScroll(column, `columna ${index + 1} 1280`);
  }
  // REQ-033 R-013: con la escala nueva el suelo puede no caber; el panel, el
  // cuerpo y las columnas siguen sin desplazarse.
  expect(desktop.ground, 'suelo 1280 debe existir').not.toBeNull();
  expect(desktop.ground!.scrollTop).toBe(0);
  log.push({ viewport: '1280x720', ...desktop });
  await screenshot(page, 'scroll-sin-desborde-1280x720', testInfo);

  await openScenario(page, { inventory: FULL_BACKPACK, ground: MANY_GROUND }, {
    width: 900,
    height: 700,
  });
  await openPanel(page);
  const compact = await scrollMetrics(page);
  expectNoVerticalScroll(compact.panel, 'panel 900');
  expectNoVerticalScroll(compact.body, 'cuerpo 900');
  for (const [index, column] of compact.columns.entries()) {
    expectNoVerticalScroll(column, `columna ${index + 1} 900`);
  }
  expect(compact.ground).not.toBeNull();
  expect(compact.ground!.scrollHeight).toBeGreaterThan(
    compact.ground!.clientHeight,
  );
  expect(compact.ground!.scrollTop).toBe(0);

  // El foco del suelo desplaza solo su contenedor y deja la fila visible.
  await selectPanelRow(page, 'ground:item-test-ground-11');
  const focused = await scrollMetrics(page);
  expect(focused.ground!.scrollTop).toBeGreaterThan(0);
  const visibility = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const row = active.closest<HTMLElement>('[data-row-key]');
    const scroll = document.querySelector<HTMLElement>(
      '[data-testid="inventory-ground-scroll"]',
    );
    if (!row || !scroll) return null;
    const rowRect = row.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    return {
      rowTop: rowRect.top - scrollRect.top,
      rowBottom: rowRect.bottom - scrollRect.top,
      height: scrollRect.height,
    };
  });
  expect(visibility).not.toBeNull();
  expect(visibility!.rowTop).toBeGreaterThanOrEqual(-1);
  expect(visibility!.rowBottom).toBeLessThanOrEqual(visibility!.height + 1);
  log.push({ viewport: '900x700', ...focused });

  const panelRowsNow = await panelRows(page);
  expect(panelRowsNow.some((row) => row.key === 'ground:item-test-ground-11')).toBe(
    true,
  );
  await screenshot(page, 'scroll-solo-suelo-900x700', testInfo);
  await writeLog(testInfo, 'panel-scroll-metrics.json', log);
});
