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
  panelRowTestId,
  pressPanelAction,
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

/**
 * Guerrero sobre la casilla de salida del BSP con equipo, mochila y suelo
 * controlados. Solo reúne estado serializable; las operaciones siguen pasando
 * por el motor y por el teclado real.
 */
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
  await page.screenshot({ path });
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

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openScenario(
  page: Page,
  options: ScenarioOptions,
  viewport: { width: number; height: number } = VIEWPORTS[0],
) {
  await page.setViewportSize(viewport);
  return openState(page, warriorScenario(options));
}

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

async function focusInsidePanel(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inventory-panel"]');
    return panel !== null && panel.contains(document.activeElement);
  });
}

function rowTestId(key: string): string {
  return `inventory-${panelRowTestId(key)}`;
}

function backpackName(index: number) {
  return `[data-testid="${rowTestId(`backpack:${index}`)}-name"]`;
}

function groundName(instanceId: string) {
  return `[data-testid="${rowTestId(`ground:${instanceId}`)}-name"]`;
}

interface BoxMetrics {
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
}

function panelMetrics(page: Page): Promise<{
  readonly width: number;
  readonly height: number;
  readonly panel: BoxMetrics;
  readonly body: BoxMetrics | null;
  readonly columns: Array<BoxMetrics | null>;
  readonly groundScroll: BoxMetrics | null;
}> {
  return page.getByTestId('inventory-panel').evaluate((element) => {
    const panel = element as HTMLElement;
    const body = panel.querySelector<HTMLElement>('.inventory-panel-body');
    const columns = [
      ...panel.querySelectorAll<HTMLElement>('.inventory-column'),
    ];
    const ground = panel.querySelector<HTMLElement>(
      '[data-testid="inventory-ground-scroll"]',
    );
    return {
      width: panel.getBoundingClientRect().width,
      height: panel.getBoundingClientRect().height,
      panel: {
        scrollWidth: panel.scrollWidth,
        scrollHeight: panel.scrollHeight,
        clientWidth: panel.clientWidth,
        clientHeight: panel.clientHeight,
      },
      body: body
        ? {
            scrollWidth: body.scrollWidth,
            scrollHeight: body.scrollHeight,
            clientWidth: body.clientWidth,
            clientHeight: body.clientHeight,
          }
        : null,
      columns: columns.map((column) => ({
        scrollWidth: column.scrollWidth,
        scrollHeight: column.scrollHeight,
        clientWidth: column.clientWidth,
        clientHeight: column.clientHeight,
      })),
      groundScroll: ground
        ? {
            scrollWidth: ground.scrollWidth,
            scrollHeight: ground.scrollHeight,
            clientWidth: ground.clientWidth,
            clientHeight: ground.clientHeight,
          }
        : null,
    };
  });
}

function expectNoScroll(
  metrics: BoxMetrics | null,
  label: string,
): void {
  expect(metrics, `${label} debe existir`).not.toBeNull();
  expect(metrics!.scrollWidth, `${label} recorta en horizontal`).toBeLessThanOrEqual(
    metrics!.clientWidth + 1,
  );
  expect(metrics!.scrollHeight, `${label} recorta en vertical`).toBeLessThanOrEqual(
    metrics!.clientHeight + 1,
  );
}

test('panel: I abre, Escape cierra, el mapa queda bloqueado y el suelo vacío sigue visible', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openScenario(page, {});
  expect(initial.groundItems).toHaveLength(0);
  expect(initial.players[0].equipment.weapon?.itemId).toBe('sword');

  await openPanel(page);
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.getByTestId('inventory-ground-empty')).toBeVisible();
  await expect(page.getByTestId('inventory-player')).toHaveText(
    initial.players[0].nombre,
  );
  await expect(page.getByTestId('inventory-mp')).toHaveText(
    `${initial.players[0].mp}/${initial.players[0].maxMp}`,
  );
  expect(await focusInsidePanel(page)).toBe(true);

  // El foco queda atrapado dentro del diálogo al recorrerlo con Tab.
  for (let press = 0; press < 20; press += 1) {
    await page.keyboard.press('Tab');
    expect(await focusInsidePanel(page)).toBe(true);
  }

  // Ningún comando del mapa llega al motor mientras el panel está abierto.
  for (const key of ['w', 'ArrowUp', 'f', 'g']) {
    await page.keyboard.press(key);
  }
  await settle(page);
  const blocked = await snapshot(page);
  expect(blocked.players[0]).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    mp: initial.players[0].mp,
    actions: initial.players[0].actions,
  });
  expect(blocked.cursor).toMatchObject({ x: initial.cursor.x, y: initial.cursor.y });
  expect(blocked.enemies.map((enemy) => enemy.hp)).toEqual(
    initial.enemies.map((enemy) => enemy.hp),
  );
  expect(blocked.turn).toBe(initial.turn);
  expect(blocked.lastEvents).toEqual(initial.lastEvents);
  await screenshot(page, 'panel-abierto-suelo-vacio', testInfo);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test('panel: equipar y desequipar con teclado y 1 MP sin acción', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openScenario(page, { inventory: ['axe'] });
  expect(initial.players[0].equipment.weapon?.itemId).toBe('sword');
  const before = await snapshot(page);
  await openPanel(page);

  await expect(page.getByTestId('inventory-backpack-count')).toHaveText('1/8');
  await expect(page.locator(backpackName(0))).toHaveText('Hacha');
  // La rejilla no muestra stats, traits ni comparación (REQ-032 R-009); el
  // modelo conserva la comparación y el desglose para TASK-0102.
  await expect(page.getByTestId('inventory-stats')).toHaveCount(0);
  await expect(page.locator('.inventory-row-comparison')).toHaveCount(0);
  await expect(page.locator('.inventory-row-traits')).toHaveCount(0);
  await screenshot(page, 'panel-tres-columnas', testInfo);

  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const afterEquip = await snapshot(page);
  expect(afterEquip.players[0].equipment.weapon?.itemId).toBe('axe');
  expect(afterEquip.players[0].inventory.items[0]?.itemId).toBe('sword');
  expect(afterEquip.players[0].mp).toBe(before.players[0].mp - 1);
  expect(afterEquip.players[0].actions).toEqual(before.players[0].actions);
  await expect(page.getByTestId('inventory-slot-weapon-name')).toHaveText('Hacha');
  await expect(page.locator(backpackName(0))).toHaveText('Espada');
  await expect(page.locator(backpackName(0))).toHaveCount(1);

  await pressPanelAction(page, panelActionTestId('unequip', 'slot:weapon'));
  await settle(page);
  const afterUnequip = await snapshot(page);
  expect(afterUnequip.players[0].equipment.weapon).toBeNull();
  expect(afterUnequip.players[0].mp).toBe(before.players[0].mp - 2);
  expect(afterUnequip.players[0].actions).toEqual(before.players[0].actions);
  expect(
    afterUnequip.players[0].inventory.items.flatMap((item) =>
      item ? [item.itemId] : [],
    ),
  ).toEqual(['sword', 'axe']);
  await expect(page.getByTestId('inventory-slot-weapon-name')).toHaveText('Vacío');
  await screenshot(page, 'panel-desequipado', testInfo);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('hud-weapon')).toHaveText('Sin arma');
  expect(consoleErrors).toEqual([]);
});

test('panel: recoger, soltar y soltar un equipado cuestan 1 MP y no gastan acción', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openScenario(page, { ground: ['axe'] });
  expect(initial.groundItems).toHaveLength(1);
  const groundId = initial.groundItems[0].id;
  const before = await snapshot(page);
  await openPanel(page);

  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.locator(groundName(groundId))).toHaveText('Hacha');
  await expect(page.getByTestId('inventory-ground-hint')).toBeHidden();
  await pressPanelAction(page, panelActionTestId('pickup', `ground:${groundId}`));
  await settle(page);
  const afterPickup = await snapshot(page);
  expect(afterPickup.players[0].mp).toBe(before.players[0].mp - 1);
  expect(afterPickup.players[0].actions).toEqual(before.players[0].actions);
  expect(afterPickup.groundItems).toHaveLength(0);
  expect(afterPickup.players[0].inventory.items[0]?.itemId).toBe('axe');
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.getByTestId('inventory-ground-empty')).toBeVisible();
  await expect(page.locator(backpackName(0))).toHaveText('Hacha');

  await pressPanelAction(page, panelActionTestId('drop', 'backpack:0'));
  await settle(page);
  const afterDrop = await snapshot(page);
  expect(afterDrop.players[0].mp).toBe(before.players[0].mp - 2);
  expect(afterDrop.players[0].actions).toEqual(before.players[0].actions);
  expect(afterDrop.groundItems).toHaveLength(1);
  expect(afterDrop.groundItems[0].itemId).toBe('axe');
  expect(afterDrop.players[0].inventory.items.filter(Boolean)).toHaveLength(0);
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.getByTestId('inventory-ground-empty')).toBeHidden();

  const dropped = afterDrop.groundItems[0];
  await pressPanelAction(page, panelActionTestId('pickup', `ground:${dropped.id}`));
  await settle(page);
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const equipped = await snapshot(page);
  expect(equipped.players[0].equipment.weapon?.itemId).toBe('axe');
  expect(equipped.players[0].mp).toBe(before.players[0].mp - 4);
  expect(equipped.players[0].actions).toEqual(before.players[0].actions);
  expect(equipped.players[0].inventory.items[0]?.itemId).toBe('sword');

  await pressPanelAction(page, panelActionTestId('drop', 'slot:weapon'));
  await settle(page);
  const afterEquippedDrop = await snapshot(page);
  expect(afterEquippedDrop.players[0].equipment.weapon).toBeNull();
  expect(afterEquippedDrop.players[0].mp).toBe(before.players[0].mp - 5);
  expect(afterEquippedDrop.players[0].actions).toEqual(before.players[0].actions);
  expect(afterEquippedDrop.players[0].inventory.items[0]?.itemId).toBe('sword');
  expect(afterEquippedDrop.groundItems).toHaveLength(1);
  expect(afterEquippedDrop.groundItems[0].itemId).toBe('axe');
  await expect(page.locator(groundName(afterEquippedDrop.groundItems[0].id))).toHaveText(
    'Hacha',
  );
  await screenshot(page, 'panel-equipado-al-suelo', testInfo);
  expect(consoleErrors).toEqual([]);
});

test('mochila llena: recoger y equipar desde el suelo se rechazan sin mover nada; el intercambio de mochila sí cabe', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openScenario(page, {
    inventory: FULL_BACKPACK,
    ground: ['axe'],
  });
  const groundId = initial.groundItems[0].id;
  const before = await snapshot(page);
  await openPanel(page);
  await expect(page.getByTestId('inventory-backpack-count')).toHaveText('8/8');

  await pressPanelAction(page, panelActionTestId('pickup', `ground:${groundId}`));
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toHaveText(
    'La mochila está llena',
  );
  const afterPickupRejection = await snapshot(page);
  expect(afterPickupRejection.players[0].mp).toBe(before.players[0].mp);
  expect(afterPickupRejection.players[0].actions).toEqual(before.players[0].actions);
  expect(afterPickupRejection.groundItems).toEqual(before.groundItems);
  expect(afterPickupRejection.players[0].inventory).toEqual(
    before.players[0].inventory,
  );

  await pressPanelAction(page, panelActionTestId('equip', `ground:${groundId}`));
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toHaveText(
    'La mochila está llena',
  );
  const afterEquipRejection = await snapshot(page);
  expect(afterEquipRejection.players[0].mp).toBe(before.players[0].mp);
  expect(afterEquipRejection.players[0].equipment).toEqual(
    before.players[0].equipment,
  );
  expect(afterEquipRejection.groundItems).toEqual(before.groundItems);
  expect(afterEquipRejection.players[0].inventory).toEqual(
    before.players[0].inventory,
  );

  // El hueco que libera el objeto entrante sí permite el intercambio.
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const afterSwap = await snapshot(page);
  expect(afterSwap.players[0].equipment.weapon?.itemId).toBe('axe');
  expect(afterSwap.players[0].inventory.items[0]?.itemId).toBe('sword');
  expect(afterSwap.players[0].mp).toBe(before.players[0].mp - 1);
  expect(afterSwap.players[0].actions).toEqual(before.players[0].actions);
  await expect(page.getByTestId('inventory-message')).toBeHidden();
  await screenshot(page, 'panel-mochila-llena', testInfo);
  expect(consoleErrors).toEqual([]);
});

test('sin MP: equipar se rechaza y no altera el estado ni gasta acción', async ({
  page,
}) => {
  const initial = await openScenario(page, { inventory: ['axe'], mp: 0 });
  const before = await snapshot(page);
  await openPanel(page);
  await expect(page.getByTestId('inventory-mp')).toHaveText(
    `0/${initial.players[0].maxMp}`,
  );
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  await expect(page.getByTestId('inventory-message')).toHaveText(
    'Sin MP para esta operación',
  );
  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(0);
  expect(after.players[0].actions).toEqual(before.players[0].actions);
  expect(after.players[0].equipment).toEqual(before.players[0].equipment);
  expect(after.players[0].inventory).toEqual(before.players[0].inventory);
});

test('G y 1-3 no recogen ni cambian de arma; el panel es el único camino', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openScenario(page, { ground: ['axe'] });
  const before = await snapshot(page);
  const groundId = initial.groundItems[0].id;
  await expect(page.getByTestId('weapon-hint')).toContainText('I panel');
  await expect(page.getByTestId('weapon-hint')).toContainText('Hacha en el suelo');

  for (const key of ['g', '1', '2', '3']) {
    await page.keyboard.press(key);
    await settle(page);
    const after = await snapshot(page);
    expect(after.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(after.players[0].inventory.items.filter(Boolean)).toHaveLength(0);
    expect(after.players[0].mp).toBe(before.players[0].mp);
    expect(after.players[0].actions).toEqual(before.players[0].actions);
    expect(after.groundItems).toEqual(before.groundItems);
    expect(after.players[0].equipment).toEqual(before.players[0].equipment);
    expect(after.turn).toBe(before.turn);
    expect(after.lastEvents.filter((event) => event.type === 'CommandRejected')).toEqual(
      [],
    );
  }
  expect(initial.groundItems[0].id).toBe(groundId);
  await screenshot(page, 'sin-g-sin-1-3', testInfo);
  expect(consoleErrors).toEqual([]);
});

test('sprites del panel coinciden con el objeto y F1 expone mochila, equipo, capacidad y suelo', async ({
  page,
}, testInfo) => {
  const initial = await openScenario(page, { inventory: ['dagger'], ground: ['axe'] });
  const groundItem = initial.groundItems[0];
  await openPanel(page);
  await expect(page.getByTestId('inventory-backpack-count')).toHaveText('1/8');
  await expect(page.locator(groundName(groundItem.id))).toHaveText('Hacha');
  const groundIcon = page.getByTestId(`${rowTestId(`ground:${groundItem.id}`)}-icon`);
  await expect(groundIcon).toBeVisible();
  const background = await groundIcon.evaluate(
    (element) => (element as HTMLElement).style.backgroundPosition,
  );
  const rect = ITEMS.axe.sprite.rect;
  expect(background).toBe(`-${rect.x}px -${rect.y}px`);

  await page.keyboard.press('Escape');
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText =
    (await page.getByTestId('debug-content').textContent()) ?? '';
  expect(debugText).toContain('Mochila 1/8:');
  expect(debugText).toContain('Daga [item-player-1-backpack-0]');
  expect(debugText).toContain('Equipo por hueco:');
  expect(debugText).toContain('Suelo: Hacha [item-test-ground-0]');
  expect(debugText).toContain(`en (${groundItem.x},${groundItem.y})`);
  await screenshot(page, 'debug-inventario', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
});

test('capturas 1280×720 y 900×700: mochila llena con cuatro objetos y suelo vacío', async ({
  page,
}, testInfo) => {
  const metrics: Array<Record<string, unknown>> = [];
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;

    await openScenario(page, { inventory: ['dagger'], ground: ['axe'] }, viewport);
    await openPanel(page);
    await screenshot(page, `panel-abierto-${suffix}`, testInfo);
    const openMetrics = await panelMetrics(page);
    expectNoScroll(openMetrics.panel, 'panel abierto');
    expectNoScroll(openMetrics.body, 'cuerpo abierto');
    metrics.push({ viewport: suffix, state: 'panel-abierto', ...openMetrics });
    await page.keyboard.press('Escape');

    await openScenario(
      page,
      {
        inventory: FULL_BACKPACK,
        ground: ['axe', 'dagger', 'knife', 'hammer'],
      },
      viewport,
    );
    await openPanel(page);
    await expect(page.getByTestId('inventory-backpack-count')).toHaveText('8/8');
    await expect(page.locator('.inventory-ground-row')).toHaveCount(4);
    await screenshot(page, `mochila-llena-4-objetos-${suffix}`, testInfo);
    const fullMetrics = await panelMetrics(page);
    expectNoScroll(fullMetrics.panel, 'panel con mochila llena');
    expectNoScroll(fullMetrics.body, 'cuerpo con mochila llena');
    for (const [index, column] of fullMetrics.columns.entries()) {
      expectNoScroll(column, `columna ${index + 1}`);
    }
    if (viewport.width === 1280) {
      expectNoScroll(fullMetrics.groundScroll, 'suelo a 1280×720');
    }
    metrics.push({
      viewport: suffix,
      state: 'mochila-llena-4-objetos',
      ...fullMetrics,
    });
    await page.keyboard.press('Escape');

    await openScenario(page, { inventory: ['dagger'] }, viewport);
    await openPanel(page);
    await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
    await expect(page.getByTestId('inventory-ground-empty')).toBeVisible();
    await screenshot(page, `suelo-vacio-${suffix}`, testInfo);
    const emptyMetrics = await panelMetrics(page);
    expectNoScroll(emptyMetrics.panel, 'panel con suelo vacío');
    expectNoScroll(emptyMetrics.body, 'cuerpo con suelo vacío');
    metrics.push({ viewport: suffix, state: 'suelo-vacio', ...emptyMetrics });
    await page.keyboard.press('Escape');
  }
  await writeLog(testInfo, 'panel-metrics.json', metrics);
});
