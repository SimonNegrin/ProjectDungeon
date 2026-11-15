import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator, createInitialState } from '../../src/game/index';
import type { Container } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import { openState } from './support';

/**
 * TASK-0135: evidencia visual acotada del render de cadáveres desde
 * `state.containers`. No recorre la suite completa: TASK-0142 la cubre.
 */
const SEED = 279837264;
const ORPHAN_ENEMY_ID = 'enemy-sin-contenedor';

function floorNeighbor(
  state: GameState,
  center: { x: number; y: number },
  exclude: ReadonlySet<string> = new Set(),
): { x: number; y: number } {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const;
  for (const [dx, dy] of offsets) {
    const x = center.x + dx;
    const y = center.y + dy;
    if (x < 0 || y < 0 || x >= state.grid.width || y >= state.grid.height) continue;
    if (exclude.has(`${x},${y}`)) continue;
    if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
    return { x, y };
  }
  throw new Error(`Sin suelo visible junto a (${center.x},${center.y})`);
}

function corpse(
  id: string,
  x: number,
  y: number,
  corpseOf: string,
): Container {
  return { id, x, y, capacity: 1, items: [], kind: 'corpse', corpseOf };
}

/**
 * Estado BSP con dos cadáveres-contenedor en la misma casilla visible y una
 * unidad muerta sin contenedor en otra casilla visible.
 */
function scenario(): {
  readonly state: GameState;
  readonly corpseTile: { x: number; y: number };
  readonly orphanTile: { x: number; y: number };
} {
  const base = createInitialState({
    seed: SEED,
    generator: new BspMapGenerator(),
  });
  const player = base.players[0];
  const corpseTile = floorNeighbor(base, player);
  const orphanTile = floorNeighbor(
    base,
    player,
    new Set([`${corpseTile.x},${corpseTile.y}`]),
  );
  const orphan = base.enemies[0];
  if (!orphan) throw new Error('El BSP de referencia debe tener un enemigo');

  const state: GameState = {
    ...base,
    containers: [
      corpse('corpse-enemy-a', corpseTile.x, corpseTile.y, 'enemy-a'),
      corpse('corpse-enemy-b', corpseTile.x, corpseTile.y, 'enemy-b'),
    ],
    enemies: [
      {
        ...orphan,
        id: ORPHAN_ENEMY_ID,
        x: orphanTile.x,
        y: orphanTile.y,
        home: { ...orphanTile },
        hp: 0,
      },
    ],
  };

  return { state, corpseTile, orphanTile };
}

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      }),
  );
}

async function canvasData(page: Page): Promise<string> {
  return page
    .locator('#game-canvas')
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
}

async function save(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

test('mapa con dos cadáveres-contenedor y una unidad muerta sin contenedor', async ({
  page,
}, testInfo) => {
  const { state, corpseTile, orphanTile } = scenario();
  const snapshot = await openState(page, state, SEED);

  // Los contenedores llegan al host y la unidad muerta no tiene cadáver.
  expect(snapshot.containers).toHaveLength(2);
  expect(snapshot.containers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'corpse-enemy-a',
        kind: 'corpse',
        x: corpseTile.x,
        y: corpseTile.y,
      }),
      expect.objectContaining({
        id: 'corpse-enemy-b',
        kind: 'corpse',
        x: corpseTile.x,
        y: corpseTile.y,
      }),
    ]),
  );
  const orphan = snapshot.enemies.find((enemy) => enemy.id === ORPHAN_ENEMY_ID);
  expect(orphan).toMatchObject({ hp: 0, x: orphanTile.x, y: orphanTile.y });
  expect(
    snapshot.containers.some(
      (container) => container.corpseOf === ORPHAN_ENEMY_ID,
    ),
  ).toBe(false);

  await settleLayout(page);
  const withCorpses = await canvasData(page);
  await save(page, testInfo, 'mapa-dos-cadaveres');

  // Sin contenedores el mapa no tiene decal: el render los lee del estado.
  await openState(page, { ...state, containers: [] }, SEED);
  await settleLayout(page);
  const withoutCorpses = await canvasData(page);
  expect(withoutCorpses).not.toBe(withCorpses);
  await save(page, testInfo, 'sin-contenedor');

  // La unidad muerta sin contenedor no aporta píxeles: quitarle del estado deja
  // exactamente el mismo canvas con los dos cadáveres.
  await openState(
    page,
    { ...state, enemies: state.enemies.filter((enemy) => enemy.id !== ORPHAN_ENEMY_ID) },
    SEED,
  );
  await settleLayout(page);
  expect(await canvasData(page)).toBe(withCorpses);
});
