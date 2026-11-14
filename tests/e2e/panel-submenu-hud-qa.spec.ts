import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { ITEMS, type ItemId } from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  settle,
  snapshot,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;
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
          armorId: options.armorId === undefined ? null : options.armorId,
          shieldId: options.shieldId === undefined ? null : options.shieldId,
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
  viewport: { width: number; height: number } = VIEWPORTS[0],
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

async function activeMenuKind(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.querySelector<HTMLElement>(
      '[data-testid="inventory-submenu"] [data-active="true"]',
    );
    return active?.dataset.kind ?? null;
  });
}

function option(kind: 'equip' | 'unequip' | 'pickup' | 'drop') {
  return `[data-testid="inventory-submenu-option-${kind}"]`;
}

test('submenú y ficha: equipar, desequipar, recoger y soltar sin gastar al abrir', async ({
  page,
}, testInfo) => {
  await openScenario(page, { inventory: ['axe', 'dagger'], ground: ['hammer'] });
  const before = await snapshot(page);
  await openPanel(page);

  // Ficha de dos bloques: seleccionado y equipado en el hueco.
  await selectPanelRow(page, 'backpack:0');
  await expect(page.getByTestId('hud-panel-detail')).toBeVisible();
  await expect(page.getByTestId('hud-cursor-detail')).toBeHidden();
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    ITEMS.axe.name,
  );
  await expect(page.getByTestId('hud-panel-selected-label')).toBeHidden();
  await expect(page.getByTestId('hud-panel-selected-sprite')).toBeVisible();
  await expect(page.getByTestId('hud-panel-selected-stats')).toContainText(
    '+2 Acierto',
  );
  await expect(page.getByTestId('hud-panel-selected-stats')).toContainText(
    '+5 Daño',
  );
  await expect(page.getByTestId('hud-panel-selected-traits')).toBeHidden();
  await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText(
    ITEMS.sword.name,
  );
  await expect(page.getByTestId('hud-panel-equipped-label')).toHaveText(
    'Equipado',
  );
  await expect(page.getByTestId('hud-panel-equipped-sprite')).toBeVisible();
  await expect(page.getByTestId('hud-panel-equipped-stats')).toContainText(
    '+3 Acierto',
  );
  await expect(page.getByTestId('hud-panel-detail')).not.toContainText(
    'Seleccionado',
  );
  await expect(page.getByTestId('hud-panel-detail')).not.toContainText('Stats');

  // Abrir y cerrar el submenú no gasta MP ni despacha.
  const beforeMenu = await snapshot(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();
  await expect(page.locator(option('equip'))).toHaveAttribute(
    'data-active',
    'true',
  );
  await expect(page.locator(option('equip'))).toContainText('1 MP');
  await screenshot(page, 'submenu-1280x720', testInfo);
  const openedMenu = await snapshot(page);
  expect(openedMenu.players[0].mp).toBe(beforeMenu.players[0].mp);
  expect(openedMenu.lastEvents).toEqual(beforeMenu.lastEvents);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-submenu')).toBeHidden();
  expect(await activeKey(page)).toBe('backpack:0');
  const closedMenu = await snapshot(page);
  expect(closedMenu.players[0].mp).toBe(beforeMenu.players[0].mp);
  expect(closedMenu.lastEvents).toEqual(beforeMenu.lastEvents);

  // Equipar: una sola operación, 1 MP y el foco sigue al objeto de zona.
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const equipped = await snapshot(page);
  expect(equipped.players[0].equipment.weapon?.itemId).toBe('axe');
  expect(equipped.players[0].mp).toBe(before.players[0].mp - 1);
  expect(equipped.players[0].actions).toEqual(before.players[0].actions);
  expect(await selectedKey(page)).toBe('slot:weapon');
  expect(await activeKey(page)).toBe('slot:weapon');
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    ITEMS.axe.name,
  );
  await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText(
    ITEMS.axe.name,
  );
  await screenshot(page, 'ficha-dos-bloques-1280x720', testInfo);

  // Desequipar: el hueco queda vacío y el bloque equipado lo dice.
  await pressPanelAction(page, panelActionTestId('unequip', 'slot:weapon'));
  await settle(page);
  const unequipped = await snapshot(page);
  expect(unequipped.players[0].equipment.weapon).toBeNull();
  expect(unequipped.players[0].mp).toBe(before.players[0].mp - 2);
  const unequippedKey = await selectedKey(page);
  expect(unequippedKey.startsWith('backpack:')).toBe(true);
  expect(await activeKey(page)).toBe(unequippedKey);
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    ITEMS.axe.name,
  );
  await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText('Vacío');
  await expect(page.getByTestId('hud-panel-equipped-label')).toHaveText(
    'Equipado',
  );
  await expect(page.getByTestId('hud-panel-equipped-sprite')).toBeHidden();
  await expect(page.getByTestId('hud-panel-equipped-stats')).toBeHidden();
  await expect(page.getByTestId('hud-panel-equipped-traits')).toBeHidden();
  await screenshot(page, 'ficha-hueco-vacio-1280x720', testInfo);

  // Recoger: el foco sigue a la instancia hasta su nueva fila.
  await pressPanelAction(
    page,
    panelActionTestId('pickup', 'ground:item-test-ground-0'),
  );
  await settle(page);
  const picked = await snapshot(page);
  expect(picked.groundItems).toHaveLength(0);
  expect(
    picked.players[0].inventory.items.some(
      (item) => item?.id === 'item-test-ground-0',
    ),
  ).toBe(true);
  expect(picked.players[0].mp).toBe(before.players[0].mp - 3);
  const pickedKey = await selectedKey(page);
  expect(pickedKey.startsWith('backpack:')).toBe(true);
  expect(await activeKey(page)).toBe(pickedKey);
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    ITEMS.hammer.name,
  );

  // Soltar: la instancia vuelve al suelo y la ficha muestra su zona.
  await pressPanelAction(page, panelActionTestId('drop', pickedKey));
  await settle(page);
  const dropped = await snapshot(page);
  expect(dropped.groundItems.map((item) => item.id)).toEqual([
    'item-test-ground-0',
  ]);
  expect(dropped.players[0].mp).toBe(before.players[0].mp - 4);
  expect(await selectedKey(page)).toBe('ground:item-test-ground-0');
  expect(await activeKey(page)).toBe('ground:item-test-ground-0');
  await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
    ITEMS.hammer.name,
  );
  await expect(page.getByTestId('hud-panel-selected-sprite')).toBeVisible();
  await screenshot(page, 'ficha-objeto-suelo-1280x720', testInfo);

  // Al cerrar, el HUD derecho vuelve al detalle del cursor.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('hud-panel-detail')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-detail')).toBeVisible();
});

test('submenú: flechas, izquierda/derecha inertes y Enter una sola vez', async ({
  page,
}) => {
  await openScenario(page, { inventory: ['axe', 'dagger'], ground: ['hammer'] });
  const before = await snapshot(page);
  await openPanel(page);
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();

  expect(await activeMenuKind(page)).toBe('equip');
  await page.keyboard.press('ArrowDown');
  expect(await activeMenuKind(page)).toBe('drop');
  await page.keyboard.press('ArrowLeft');
  expect(await activeMenuKind(page)).toBe('drop');
  await page.keyboard.press('ArrowRight');
  expect(await activeMenuKind(page)).toBe('drop');
  await page.keyboard.press('ArrowUp');
  expect(await activeMenuKind(page)).toBe('equip');
  // Sin rebote: arriba en la primera opción se queda en ella.
  await page.keyboard.press('ArrowUp');
  expect(await activeMenuKind(page)).toBe('equip');

  await page.keyboard.press('Enter');
  await settle(page);
  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(before.players[0].mp - 1);
  expect(
    after.lastEvents.filter((event) => event.type === 'CommandRejected'),
  ).toEqual([]);
  await expect(page.getByTestId('inventory-submenu')).toBeHidden();
});

test('0 MP: opciones no disponibles con motivo y sin despacho', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openScenario(page, { inventory: ['axe'], mp: 0 }, { width: 900, height: 700 });
  const before = await snapshot(page);
  await openPanel(page);
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();
  for (const kind of ['equip', 'drop'] as const) {
    const element = page.locator(option(kind));
    await expect(element).toHaveAttribute('aria-disabled', 'true');
    await expect(element).toContainText('Sin MP para esta operación');
  }
  await screenshot(page, 'submenu-sin-mp-900x700', testInfo);

  const geometry = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-row-key="backpack:0"]');
    const menu = document.querySelector<HTMLElement>(
      '[data-testid="inventory-submenu"]',
    );
    const column = row?.closest<HTMLElement>('.inventory-column');
    if (!row || !menu || !column) return null;
    const menuRect = menu.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    return {
      menuLeft: menuRect.left,
      menuRight: menuRect.right,
      columnLeft: columnRect.left,
      columnRight: columnRect.right,
    };
  });
  expect(geometry).not.toBeNull();
  expect(
    geometry!.menuRight <= geometry!.columnLeft + 1 ||
      geometry!.menuLeft >= geometry!.columnRight - 1,
    'El submenú con motivo no tapa la columna seleccionada',
  ).toBe(true);

  await page.keyboard.press('Enter');
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toBeHidden();
  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(0);
  expect(after.players[0].equipment).toEqual(before.players[0].equipment);
  expect(after.players[0].inventory).toEqual(before.players[0].inventory);
  expect(after.lastEvents).toEqual(before.lastEvents);
});

test('mochila llena: no se ofrece recoger y equipar desde el suelo se rechaza', async ({
  page,
}, testInfo) => {
  await openScenario(page, { inventory: FULL_BACKPACK, ground: ['axe'] });
  const before = await snapshot(page);
  await openPanel(page);
  await selectPanelRow(page, 'ground:item-test-ground-0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('inventory-submenu')).toBeVisible();
  await expect(page.locator(option('pickup'))).toHaveCount(0);
  await expect(page.locator(option('equip'))).toHaveCount(1);
  await screenshot(page, 'submenu-mochila-llena-1280x720', testInfo);
  await page.keyboard.press('Escape');

  await pressPanelAction(
    page,
    panelActionTestId('equip', 'ground:item-test-ground-0'),
  );
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toHaveText(
    'La mochila está llena',
  );
  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(before.players[0].mp);
  expect(after.players[0].equipment).toEqual(before.players[0].equipment);
  expect(after.players[0].inventory).toEqual(before.players[0].inventory);
  expect(after.groundItems).toEqual(before.groundItems);
});

test('posiciones y capturas 1280×720 y 900×700 sin tapar la columna', async ({
  page,
}, testInfo) => {
  const log: Array<Record<string, unknown>> = [];

  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await openScenario(
      page,
      { inventory: ['axe'], ground: ['dagger'] },
      viewport,
    );
    await openPanel(page);
    await selectPanelRow(page, 'backpack:0');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('inventory-submenu')).toBeVisible();
    await screenshot(page, `submenu-posiciones-${suffix}`, testInfo);

    const geometry = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>('[data-row-key="backpack:0"]');
      const menu = document.querySelector<HTMLElement>(
        '[data-testid="inventory-submenu"]',
      );
      const panel = document.querySelector<HTMLElement>(
        '[data-testid="inventory-panel"]',
      );
      const column = row?.closest<HTMLElement>('.inventory-column');
      if (!row || !menu || !panel || !column) return null;
      const rect = (element: HTMLElement) => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      };
      return {
        row: rect(row),
        menu: rect(menu),
        panel: rect(panel),
        column: rect(column),
      };
    });
    expect(geometry).not.toBeNull();
    const g = geometry!;
    // El submenú queda fuera de la columna del objeto seleccionado.
    const disjoint =
      g.menu.right <= g.column.left + 1 || g.menu.left >= g.column.right - 1;
    expect(disjoint, `El submenú tapa la columna a ${suffix}`).toBe(true);
    // Y dentro del panel, sin salirse por ningún borde.
    expect(g.menu.left).toBeGreaterThanOrEqual(g.panel.left - 1);
    expect(g.menu.right).toBeLessThanOrEqual(g.panel.right + 1);
    expect(g.menu.top).toBeGreaterThanOrEqual(g.panel.top - 1);
    expect(g.menu.bottom).toBeLessThanOrEqual(g.panel.bottom + 1);

    log.push({ viewport: suffix, ...g });

    // Cerrar el submenú deja el panel abierto: la ficha se captura limpia.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-submenu')).toBeHidden();
    expect(await activeKey(page)).toBe('backpack:0');
    await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
      ITEMS.axe.name,
    );
    await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText(
      ITEMS.sword.name,
    );
    await screenshot(page, `ficha-posiciones-${suffix}`, testInfo);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();
  }

  await writeLog(testInfo, 'submenu-geometry.json', log);
});
