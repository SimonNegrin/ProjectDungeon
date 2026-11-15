import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import type { ItemId } from '../../src/game/equipment';
import {
  equipmentFromLegacy,
  inventoryFromIds,
  type Container,
} from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  snapshot,
} from './support';

/**
 * TASK-0136: evidencia acotada del saqueo de cadáver desde el panel. La suite
 * completa de REQ-034 queda para TASK-0142.
 */
const SEED = 279837264;

function floorNeighbor(
  state: GameState,
  center: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const x = center.x + dx;
    const y = center.y + dy;
    if (x < 0 || y < 0 || x >= state.grid.width || y >= state.grid.height) continue;
    if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
    return { x, y };
  }
  throw new Error(`Sin suelo junto a (${center.x},${center.y})`);
}

function corpse(
  id: string,
  x: number,
  y: number,
  corpseOf: string,
  itemIds: readonly string[],
): Container {
  return {
    id,
    x,
    y,
    capacity: itemIds.length,
    items: itemIds.map((itemId) => ({
      id: `item-${id}-${itemId}`,
      itemId: itemId as ItemId,
      lootable: true,
    })),
    kind: 'corpse',
    corpseOf,
  };
}

function scenario(): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  const at = { x: template.x, y: template.y };
  const adjacent = floorNeighbor(base, at);

  const player = {
    ...template,
    inventory: inventoryFromIds(template.id, []),
  };
  const playerCorpse = {
    ...template,
    id: 'player-corpse',
    nombre: 'Bruja',
    hp: 0,
    x: at.x,
    y: at.y,
    equipment: equipmentFromLegacy('player-corpse', {
      weaponId: null,
      armorId: null,
      shieldId: null,
    }),
    inventory: inventoryFromIds('player-corpse', []),
  };
  const enemyTemplate = base.enemies[0];
  const enemyCorpse = {
    ...enemyTemplate,
    id: 'enemy-corpse',
    nombre: 'Centinela',
    enemyType: 'sentinel' as const,
    hp: 0,
    x: at.x,
    y: at.y,
  };
  const adjacentCorpse = {
    ...enemyTemplate,
    id: 'enemy-adjacent',
    nombre: 'Bruto',
    enemyType: 'brute' as const,
    hp: 0,
    x: adjacent.x,
    y: adjacent.y,
  };

  return {
    ...base,
    players: [player, playerCorpse],
    enemies: [enemyCorpse, adjacentCorpse],
    containers: [
      corpse('corpse-enemy-tile', at.x, at.y, 'enemy-corpse', ['dagger', 'axe']),
      corpse('corpse-player-tile', at.x, at.y, 'player-corpse', []),
      corpse('corpse-adjacent', adjacent.x, adjacent.y, 'enemy-adjacent', ['knife']),
    ],
    groundItems: [],
    activePlayerId: template.id,
    phase: 'player',
    status: 'playing',
    round: 1,
  };
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
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

test('cadáver del mismo tile: sin coste, coger todo y retirada del enemigo', async ({
  page,
}, testInfo) => {
  const state = scenario();
  await openState(page, state, SEED);

  await page.keyboard.press('i');
  const panel = page.getByTestId('inventory-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('inventory-cadavers')).toBeVisible();

  // Solo los contenedores del mismo tile; el cadáver adyacente no se lista.
  await expect(page.locator('.inventory-corpse')).toHaveCount(2);
  await expect(page.locator('.inventory-corpse-name')).toHaveText([
    'Centinela',
    'Bruja',
  ]);
  await expect(page.locator('.inventory-corpse-cost')).toHaveText([
    'sin coste',
    'sin coste',
  ]);

  const rows = page.locator('.inventory-corpse-item-row');
  await expect(rows).toHaveCount(2);
  const keys = await rows.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).dataset.rowKey ?? ''),
  );
  expect(keys).toEqual([
    'corpse:corpse-enemy-tile:item-corpse-enemy-tile-dagger',
    'corpse:corpse-enemy-tile:item-corpse-enemy-tile-axe',
  ]);

  // El submenú anuncia «sin coste» para coger y coger todo, y 1 MP para equipar.
  await selectPanelRow(page, keys[0]);
  await page.keyboard.press('Enter');
  const submenu = page.getByTestId('inventory-submenu');
  await expect(submenu).toBeVisible();
  await expect(
    submenu.locator('[data-kind="take"] .inventory-submenu-cost'),
  ).toHaveText('sin coste');
  await expect(
    submenu.locator('[data-kind="take-all"] .inventory-submenu-cost'),
  ).toHaveText('sin coste');
  await expect(
    submenu.locator('[data-kind="equip"] .inventory-submenu-cost'),
  ).toHaveText('1 MP');
  await screenshot(page, 'panel-cadaver-coste', testInfo);
  await writeLog(testInfo, 'panel-cadaver-coste.json', {
    keys,
    costs: await submenu.locator('.inventory-submenu-cost').allTextContents(),
  });
  await page.keyboard.press('Escape');

  const before = await snapshot(page);
  await pressPanelAction(page, panelActionTestId('take', keys[0]));
  const afterOne = await snapshot(page);
  expect(afterOne.players[0].mp).toBe(before.players[0].mp);
  expect(afterOne.players[0].actions).toEqual(before.players[0].actions);
  await expect(page.locator('.inventory-corpse-item-row')).toHaveCount(1);

  await pressPanelAction(page, panelActionTestId('take-all', keys[1]));
  const afterAll = await snapshot(page);

  // El cadáver de enemigo vaciado desaparece; el de jugador permanece.
  await expect(page.locator('.inventory-corpse')).toHaveCount(1);
  await expect(page.locator('.inventory-corpse-name')).toHaveText(['Bruja']);
  await expect(page.locator('.inventory-corpse-item-row')).toHaveCount(0);
  expect(afterAll.players[0].mp).toBe(before.players[0].mp);
  expect(afterAll.players[0].actions).toEqual(before.players[0].actions);
  const containerIds = afterAll.containers.map((container) => container.id);
  expect(containerIds).not.toContain('corpse-enemy-tile');
  expect(containerIds).toEqual(
    expect.arrayContaining(['corpse-player-tile', 'corpse-adjacent']),
  );
  await writeLog(testInfo, 'saqueo-final.json', {
    containerIds,
    mp: afterAll.players[0].mp,
    actions: afterAll.players[0].actions,
  });
  await screenshot(page, 'panel-tras-coger-todo', testInfo);
});
