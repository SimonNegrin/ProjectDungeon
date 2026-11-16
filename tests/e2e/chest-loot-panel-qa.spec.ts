import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { inventoryFromIds, type Container } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  moveCursorTo,
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  settle,
  snapshot,
} from './support';

/**
 * TASK-0170: apertura de cofre por teclado, columna «Cofre», depósito,
 * transferencias y vuelta a «Suelo». Las capturas van a
 * `<spec>/screenshots/` con `E2E_ARTIFACTS_DIR`.
 */
const SEED = 9270170;
const CHEST_ID = 'chest-1';

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

function chest(x: number, y: number): Container {
  return {
    id: CHEST_ID,
    x,
    y,
    capacity: 4,
    items: [
      { id: 'loot-axe', itemId: 'axe', lootable: true },
      { id: 'loot-ring', itemId: 'lifesteal-ring', lootable: true },
      null,
      null,
    ],
    kind: 'chest',
    opened: false,
  };
}

function scenario(options: { readonly actions?: number } = {}): {
  readonly state: GameState;
  readonly player: { readonly x: number; readonly y: number };
  readonly chest: { readonly x: number; readonly y: number };
} {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  const at = { x: template.x, y: template.y };
  const adjacent = floorNeighbor(base, at);
  const actions = options.actions ?? 2;

  const player = {
    ...template,
    inventory: inventoryFromIds(template.id, ['dagger']),
    actions: { max: 2, remaining: actions },
  };
  const enemyCorpse = {
    ...base.enemies[0],
    id: 'enemy-corpse',
    nombre: 'Centinela',
    hp: 0,
    x: at.x,
    y: at.y,
  };

  return {
    state: {
      ...base,
      players: [player],
      enemies: [enemyCorpse],
      containers: [
        chest(adjacent.x, adjacent.y),
        {
          id: 'corpse-tile',
          x: at.x,
          y: at.y,
          capacity: 1,
          items: [{ id: 'corpse-knife', itemId: 'knife', lootable: true }],
          kind: 'corpse',
          corpseOf: 'enemy-corpse',
        },
      ],
      groundItems: [
        {
          id: 'ground-hammer',
          itemId: 'hammer',
          lootable: true,
          x: at.x,
          y: at.y,
        },
      ],
      activePlayerId: template.id,
      phase: 'player',
      status: 'playing',
      round: 1,
    },
    player: at,
    chest: adjacent,
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

function chestOf(
  snapshot: GameSnapshot,
): GameSnapshot['containers'][number] | undefined {
  return snapshot.containers.find((container) => container.id === CHEST_ID);
}

test('cofre: abrir por teclado, Depósito, Cofre y vuelta a Suelo', async ({
  page,
}, testInfo) => {
  const { state, player, chest: chestTile } = scenario();
  await openState(page, state, SEED);
  await page.setViewportSize({ width: 1280, height: 720 });

  // Cursor sobre el cofre cerrado: el HUD derecho lo declara sin contenido.
  await moveCursorTo(page, chestTile.x, chestTile.y);
  const hud = page.getByTestId('hud-cursor-detail');
  await expect(hud).toBeVisible();
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Cofre');
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Cerrado');
  await expect(page.getByTestId('hud-cursor-rows')).not.toContainText('Hacha');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();

  const before = await snapshot(page);
  expect(before.players[0].actions.remaining).toBe(2);

  // Espacio abre: 1 acción, panel en «Cofre» con su contenido.
  await page.keyboard.press(' ');
  const panel = page.getByTestId('inventory-panel');
  await expect(panel).toBeVisible();
  await settle(page);
  await expect(page.getByTestId('inventory-right-title')).toHaveText('Cofre');
  await expect(page.getByTestId('inventory-chest-items')).toBeVisible();
  await expect(page.locator('.inventory-chest-item-row')).toHaveCount(2);
  await expect(page.getByTestId('inventory-cadavers')).toBeHidden();
  await expect(page.getByTestId('inventory-ground-section')).toBeHidden();

  const opened = await snapshot(page);
  expect(opened.players[0].actions.remaining).toBe(1);
  expect(chestOf(opened)?.opened).toBe(true);
  expect(opened.players[0].x).toBe(player.x);
  expect(opened.players[0].y).toBe(player.y);
  await writeLog(testInfo, 'apertura.json', {
    actions: opened.players[0].actions,
    chest: chestOf(opened),
  });

  await screenshot(page, 'panel-cofre-1280x720', testInfo);
  await page.setViewportSize({ width: 900, height: 700 });
  await screenshot(page, 'panel-cofre-900x700', testInfo);
  await page.setViewportSize({ width: 1280, height: 720 });

  // Depositar desde la mochila: coste «sin coste» y el objeto cambia de zona.
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('Enter');
  await expect(
    page.locator('[data-testid="inventory-submenu"] [data-kind="deposit"]'),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-testid="inventory-submenu"] [data-kind="deposit"] .inventory-submenu-cost',
    ),
  ).toHaveText('sin coste');
  await page.keyboard.press('Escape');
  await pressPanelAction(page, panelActionTestId('deposit', 'backpack:0'));
  await settle(page);

  const afterDeposit = await snapshot(page);
  expect(afterDeposit.players[0].inventory.items[0]).toBeNull();
  expect(
    chestOf(afterDeposit)?.items.some((item) => item?.itemId === 'dagger'),
  ).toBe(true);
  expect(afterDeposit.players[0].actions.remaining).toBe(1);
  await expect(page.locator('.inventory-chest-item-row')).toHaveCount(3);

  // Cerrado el panel, el HUD derecho del cofre abierto sí muestra contenido.
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Abierto');
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Hacha');
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Daga');

  // `I` abre «Suelo»: suelo y cadáveres del tile; nada del cofre.
  await page.keyboard.press('i');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('inventory-right-title')).toHaveText('Suelo');
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.getByTestId('inventory-cadavers')).toBeVisible();
  await expect(page.locator('.inventory-corpse')).toHaveCount(1);
  await expect(page.locator('.inventory-ground-row')).toHaveCount(1);
  await expect(page.getByTestId('inventory-chest-items')).toBeHidden();
  await screenshot(page, 'panel-suelo-1280x720', testInfo);
  await page.setViewportSize({ width: 900, height: 700 });
  await screenshot(page, 'panel-suelo-900x700', testInfo);
  await page.setViewportSize({ width: 1280, height: 720 });

  // Volver al cofre y vaciarlo con la navegación existente.
  await page.keyboard.press('Escape');
  await page.keyboard.press(' ');
  await settle(page);
  await expect(page.getByTestId('inventory-right-title')).toHaveText('Cofre');

  await pressPanelAction(
    page,
    panelActionTestId('take', 'chest:chest-1:loot-axe'),
  );
  await settle(page);
  await expect(page.locator('.inventory-chest-item-row')).toHaveCount(2);

  await pressPanelAction(
    page,
    panelActionTestId('take-all', 'chest:chest-1:loot-ring'),
  );
  await settle(page);
  await expect(page.locator('.inventory-chest-item-row')).toHaveCount(0);
  await expect(page.getByTestId('inventory-chest-empty')).toHaveText('Cofre vacío');

  const emptied = await snapshot(page);
  expect(chestOf(emptied)?.opened).toBe(true);
  expect(chestOf(emptied)?.items.every((item) => item === null)).toBe(true);
  expect(emptied.players[0].inventory.items.filter((item) => item !== null)).toHaveLength(3);
  await writeLog(testInfo, 'cofre-final.json', {
    chest: chestOf(emptied),
    inventory: emptied.players[0].inventory.items,
  });
});

function floorAtDistance(
  state: GameState,
  center: { readonly x: number; readonly y: number },
  distance: number,
): { readonly x: number; readonly y: number } {
  for (let dy = -distance; dy <= distance; dy += 1) {
    for (let dx = -distance; dx <= distance; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== distance) continue;
      const x = center.x + dx;
      const y = center.y + dy;
      if (x < 0 || y < 0 || x >= state.grid.width || y >= state.grid.height) continue;
      if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
      return { x, y };
    }
  }
  throw new Error(
    `Sin suelo a distancia ${distance} de (${center.x},${center.y})`,
  );
}

test('cofre sin adyacencia o sin acción: aviso y sin mover al jugador', async ({
  page,
}) => {
  const { state, player, chest: chestTile } = scenario({ actions: 0 });
  await openState(page, state, SEED);

  await moveCursorTo(page, chestTile.x, chestTile.y);
  await page.keyboard.press(' ');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toHaveText('Sin acción');
  const rejected = await snapshot(page);
  expect(rejected.players[0].x).toBe(player.x);
  expect(rejected.players[0].y).toBe(player.y);
  expect(chestOf(rejected)?.opened).toBe(false);

  // Un cofre fuera de alcance tampoco mueve al jugador: el motor rechaza.
  const farTile = floorAtDistance(state, player, 2);
  const farState: GameState = {
    ...state,
    players: [
      {
        ...state.players[0],
        actions: { max: 2, remaining: 2 },
      },
    ],
    containers: [
      {
        ...chest(farTile.x, farTile.y),
        id: CHEST_ID,
        x: farTile.x,
        y: farTile.y,
      },
    ],
  };
  await openState(page, farState, SEED);
  await moveCursorTo(page, farTile.x, farTile.y);
  await page.keyboard.press(' ');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toHaveText('Destino no válido');
  const farSnapshot = await snapshot(page);
  expect(farSnapshot.players[0].x).toBe(player.x);
  expect(farSnapshot.players[0].y).toBe(player.y);
  expect(chestOf(farSnapshot)?.opened).toBe(false);
});
