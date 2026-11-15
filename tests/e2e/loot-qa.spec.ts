import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import {
  createInventory,
  emptyEquipment,
  itemInstance,
  type Container,
} from '../../src/game/inventory';
import { readSaveFiles } from '../../src/game/save';
import type { GameState, Position, RngState, Unit } from '../../src/game/types';
import type { SnapshotContainer } from '../../src/host/debug';
import { readSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchAccepted,
  dispatchFrozen,
  openBspState,
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  settle,
  snapshot,
} from './support';

/**
 * TASK-0142: QA de punta a punta de REQ-034. Reutiliza los unitarios y los
 * specs de TASK-0135/0136/0141 para las reglas ya cubiertas; este spec añade la
 * muerte real en navegador, el cadáver oculto en el beat, el saqueo desde el
 * mismo tile y el round-trip guardar/cargar con `lootable` y contenedores.
 */
test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;
/** Semilla de combate que garantiza impacto; no altera la tirada de botín. */
const HIT_RNG: RngState = { seed: 1, state: 0 };
/** Sentinel sin saqueables en `SEED`: espada y escudo fallan su tirada. */
const NO_LOOT_ENEMY = 'enemy-1';
/** Cobarde con daga no saqueable y escudo saqueable en `SEED`. */
const LOOT_ENEMY = 'enemy-4';

interface DeathScenario {
  readonly base: GameState;
  readonly target: Unit;
  readonly other: Unit;
  readonly weak: Unit;
  readonly adjacent: Position;
}

function floorNeighbor(
  state: GameState,
  center: Position,
  exclude: ReadonlySet<string>,
): Position {
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
    if (exclude.has(`${x},${y}`)) continue;
    return { x, y };
  }
  throw new Error(`Sin suelo libre junto a (${center.x},${center.y})`);
}

function deathScenario(enemyId: string): DeathScenario {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const target = base.enemies.find((enemy) => enemy.id === enemyId);
  const other = base.enemies.find((enemy) => enemy.id !== enemyId);
  if (!target || !other) throw new Error(`Falta ${enemyId} o su acompañante en ${SEED}`);
  const occupied = new Set<string>([
    ...base.players.map((unit) => `${unit.x},${unit.y}`),
    ...base.enemies.map((unit) => `${unit.x},${unit.y}`),
    ...(base.groundItems ?? []).map((item) => `${item.x},${item.y}`),
  ]);
  return {
    base,
    target,
    other,
    weak: { ...target, hp: 1 },
    adjacent: floorNeighbor(base, target, occupied),
  };
}

async function killTarget(page: Page, scenario: DeathScenario): Promise<void> {
  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: scenario.target.id,
  });
  expect(
    result.events.some((event) => event.type === 'UnitDied'),
    `El ataque real debe matar a ${scenario.target.id}`,
  ).toBe(true);
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
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

function corpseOf(
  state: { readonly containers: readonly SnapshotContainer[] },
  unitId: string,
): SnapshotContainer | undefined {
  return state.containers.find((container) => container.corpseOf === unitId);
}

/** Píxeles de un tile del canvas en la cámara actual, sin escalar por CSS. */
async function tilePixels(page: Page, tile: Position): Promise<number[]> {
  return page.evaluate(({ x, y }) => {
    const game = window.__game!;
    const snap = game.snapshot();
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('Falta #game-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falta el contexto 2D');
    const scale = canvas.height / snap.viewport.height;
    const offsetX = (canvas.width - snap.viewport.width * scale) / 2;
    const left = Math.round(offsetX + (x * snap.tileSize - snap.camera.x) * scale);
    const top = Math.round((y * snap.tileSize - snap.camera.y) * scale);
    const size = Math.round(snap.tileSize * scale);
    return Array.from(ctx.getImageData(left, top, size, size).data);
  }, tile);
}

/**
 * Último frame en el que el cue `death` sigue activo. Avanza 1 ms y conserva
 * los píxeles del frame previo: si el cadáver se dibujara antes de terminar el
 * beat, este tile diferiría del mismo tile sin contenedor.
 */
async function lastDeathBeatTile(page: Page, tile: Position): Promise<number[]> {
  return page.evaluate(({ x, y }) => {
    const game = window.__game!;
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('Falta #game-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falta el contexto 2D');
    const read = (): number[] => {
      const snap = game.snapshot();
      const scale = canvas.height / snap.viewport.height;
      const offsetX = (canvas.width - snap.viewport.width * scale) / 2;
      const left = Math.round(offsetX + (x * snap.tileSize - snap.camera.x) * scale);
      const top = Math.round((y * snap.tileSize - snap.camera.y) * scale);
      const size = Math.round(snap.tileSize * scale);
      return Array.from(ctx.getImageData(left, top, size, size).data);
    };
    const active = (): boolean =>
      game.snapshot().animation.cues.some((cue) => cue.kind === 'death');
    if (!active()) throw new Error('El cue death no está activo');
    let last = read();
    for (let step = 0; step < 2000; step += 1) {
      game.advance(1);
      if (!active()) return last;
      last = read();
    }
    throw new Error('El cue death no terminó en 2 s de presentación');
  }, tile);
}

/** Gemelo del enemigo con todas sus instancias no saqueables. */
function withoutLoot(unit: Unit): Unit {
  const equipment = { ...unit.equipment };
  for (const slot of Object.keys(equipment) as (keyof Unit['equipment'])[]) {
    const item = equipment[slot];
    equipment[slot] = item === null ? null : { ...item, lootable: false };
  }
  return { ...unit, equipment };
}

interface LootSnapshot {
  readonly enemies: readonly {
    readonly id: string;
    readonly equipment: Readonly<
      Record<string, { readonly lootable: boolean } | null>
    >;
  }[];
}

function lootMarks(snap: LootSnapshot) {
  return snap.enemies.map((enemy) => ({
    id: enemy.id,
    equipment: Object.fromEntries(
      Object.entries(enemy.equipment).map(([slot, item]) => [
        slot,
        item === null ? null : item.lootable,
      ]),
    ),
  }));
}

test('TASK-0142: un enemigo real sin saqueables no deja cadáver', async ({
  page,
}, testInfo) => {
  const scenario = deathScenario(NO_LOOT_ENEMY);
  const opened = await openBspState(page, SEED, undefined, {
    player: scenario.adjacent,
    enemies: [scenario.weak, scenario.other],
    rng: HIT_RNG,
  });
  const targetBefore = opened.enemies.find((enemy) => enemy.id === NO_LOOT_ENEMY);
  expect(targetBefore?.equipment.weapon?.lootable).toBe(false);
  expect(targetBefore?.equipment.shield?.lootable).toBe(false);

  await killTarget(page, scenario);
  const finished = await settle(page);

  expect(corpseOf(finished, NO_LOOT_ENEMY)).toBeUndefined();
  const dead = finished.enemies.find((enemy) => enemy.id === NO_LOOT_ENEMY);
  expect(dead).toMatchObject({ hp: 0, x: scenario.target.x, y: scenario.target.y });
  expect(dead?.equipment).toEqual(emptyEquipment());
  expect(dead?.inventory.items.every((item) => item === null)).toBe(true);
  await screenshot(page, 'sin-cadaver-ataque', testInfo);

  // Desde el tile del enemigo, el panel no lista ningún cadáver.
  await dispatchAccepted(page, {
    type: 'Move',
    unitId: 'player-1',
    dx: scenario.target.x - scenario.adjacent.x,
    dy: scenario.target.y - scenario.adjacent.y,
  });
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await expect(page.locator('.inventory-corpse')).toHaveCount(0);
  await screenshot(page, 'sin-cadaver-panel', testInfo);
  await writeLog(testInfo, 'muerte-sin-botin.json', {
    target: NO_LOOT_ENEMY,
    lootableBefore: {
      weapon: targetBefore?.equipment.weapon?.lootable ?? null,
      shield: targetBefore?.equipment.shield?.lootable ?? null,
    },
    containers: finished.containers.map((container) => container.id),
    deadEquipment: dead?.equipment,
  });
});

test('TASK-0142: muerte real con botín, cadáver oculto en el beat y saqueo sin coste', async ({
  page,
}, testInfo) => {
  const scenario = deathScenario(LOOT_ENEMY);
  const opened = await openBspState(page, SEED, undefined, {
    player: scenario.adjacent,
    enemies: [scenario.weak, scenario.other],
    rng: HIT_RNG,
  });
  const targetBefore = opened.enemies.find((enemy) => enemy.id === LOOT_ENEMY);
  expect(targetBefore?.equipment.weapon?.lootable).toBe(false);
  expect(targetBefore?.equipment.shield?.lootable).toBe(true);

  await killTarget(page, scenario);

  // El motor crea el contenedor al morir; solo con la instancia saqueable.
  const afterAttack = await snapshot(page);
  const corpse = corpseOf(afterAttack, LOOT_ENEMY);
  expect(corpse).toBeDefined();
  expect(corpse?.items.map((item) => item?.itemId)).toEqual(['shield']);
  expect(corpse?.items.every((item) => item?.lootable === true)).toBe(true);
  expect(corpseOf(afterAttack, LOOT_ENEMY)?.x).toBe(scenario.target.x);
  expect(corpseOf(afterAttack, LOOT_ENEMY)?.y).toBe(scenario.target.y);

  // Captura del beat de muerte y último frame con el cue activo.
  await advanceToCue(page, 'death');
  await page.evaluate(() => window.__game!.advance(40));
  await screenshot(page, 'cadaver-oculto-beat', testInfo);
  const beatPixels = await lastDeathBeatTile(page, {
    x: scenario.target.x,
    y: scenario.target.y,
  });

  const finished = await settle(page);
  await screenshot(page, 'cadaver-visible', testInfo);
  const settledPixels = await tilePixels(page, {
    x: scenario.target.x,
    y: scenario.target.y,
  });

  const dead = finished.enemies.find((enemy) => enemy.id === LOOT_ENEMY);
  expect(dead?.equipment).toEqual(emptyEquipment());

  // Desde adyacente el cadáver no se lista; desde su tile sí, sin coste.
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await expect(page.locator('.inventory-corpse')).toHaveCount(0);
  await page.keyboard.press('i');

  await dispatchAccepted(page, {
    type: 'Move',
    unitId: 'player-1',
    dx: scenario.target.x - scenario.adjacent.x,
    dy: scenario.target.y - scenario.adjacent.y,
  });
  await page.keyboard.press('i');
  await expect(page.locator('.inventory-corpse')).toHaveCount(1);
  await expect(page.locator('.inventory-corpse-name')).toHaveText(['Cobarde']);
  await expect(page.locator('.inventory-corpse-cost')).toHaveText(['sin coste']);

  const rows = page.locator('.inventory-corpse-item-row');
  await expect(rows).toHaveCount(1);
  const key = await rows.first().evaluate((row) => (row as HTMLElement).dataset.rowKey ?? '');
  await selectPanelRow(page, key);
  await page.keyboard.press('Enter');
  const submenu = page.getByTestId('inventory-submenu');
  await expect(submenu).toBeVisible();
  await expect(submenu.locator('[data-kind="take"] .inventory-submenu-cost')).toHaveText(
    'sin coste',
  );
  await expect(
    submenu.locator('[data-kind="take-all"] .inventory-submenu-cost'),
  ).toHaveText('sin coste');
  await screenshot(page, 'panel-cadaver-coste', testInfo);
  await page.keyboard.press('Escape');

  const before = await snapshot(page);
  await pressPanelAction(page, panelActionTestId('take-all', key));
  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(before.players[0].mp);
  expect(after.players[0].actions).toEqual(before.players[0].actions);
  expect(after.players[0].inventory.items[0]?.itemId).toBe('shield');
  expect(corpseOf(after, LOOT_ENEMY)).toBeUndefined();
  await expect(page.locator('.inventory-corpse')).toHaveCount(0);
  await screenshot(page, 'panel-tras-saquear', testInfo);

  // Gemelo con las mismas instancias no saqueables: mismo beat, sin cadáver.
  const twin = withoutLoot(scenario.weak);
  await openBspState(page, SEED, undefined, {
    player: scenario.adjacent,
    enemies: [twin, scenario.other],
    rng: HIT_RNG,
  });
  await killTarget(page, scenario);
  await advanceToCue(page, 'death');
  await page.evaluate(() => window.__game!.advance(40));
  const twinBeatPixels = await lastDeathBeatTile(page, {
    x: scenario.target.x,
    y: scenario.target.y,
  });
  const twinFinished = await settle(page);
  const twinSettledPixels = await tilePixels(page, {
    x: scenario.target.x,
    y: scenario.target.y,
  });
  expect(corpseOf(twinFinished, LOOT_ENEMY)).toBeUndefined();
  expect(twinBeatPixels).toEqual(beatPixels);
  expect(twinSettledPixels).not.toEqual(settledPixels);

  await writeLog(testInfo, 'muerte-con-botin.json', {
    target: LOOT_ENEMY,
    lootableBefore: {
      weapon: targetBefore?.equipment.weapon?.lootable ?? null,
      shield: targetBefore?.equipment.shield?.lootable ?? null,
    },
    corpseItems: corpse?.items.map((item) => ({
      itemId: item?.itemId,
      lootable: item?.lootable,
    })),
    beatMatchesNoLootTwin: twinBeatPixels.every(
      (value, index) => value === beatPixels[index],
    ),
    settledDiffersFromNoLootTwin: twinSettledPixels.some(
      (value, index) => value !== settledPixels[index],
    ),
    mp: { before: before.players[0].mp, after: after.players[0].mp },
    actions: { before: before.players[0].actions, after: after.players[0].actions },
    containersAfter: after.containers.map((container) => container.id),
  });
});

function persistenceState(): GameState {
  const base = createInitialState({
    seed: SEED,
    generator: new BspMapGenerator(),
    players: [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'rogue', variant: 2, name: 'Bru' },
    ],
  });
  const deadPlayer = base.players[1];
  const deadEnemy = base.enemies[0];
  const liveEnemy = base.enemies[1];
  if (!deadPlayer || !deadEnemy || !liveEnemy) {
    throw new Error('El escenario de persistencia necesita dos jugadores y dos enemigos');
  }

  const playerCorpse: Container = {
    id: 'corpse-player-2',
    x: deadPlayer.x,
    y: deadPlayer.y,
    capacity: 2,
    items: [
      itemInstance('item-corpse-player-sword', 'sword', true),
      itemInstance('item-corpse-player-armor', 'armor', true),
    ],
    kind: 'corpse',
    corpseOf: 'player-2',
  };
  const enemyCorpse: Container = {
    id: 'corpse-enemy-1',
    x: deadEnemy.x,
    y: deadEnemy.y,
    capacity: 2,
    items: [
      itemInstance('item-corpse-enemy-sword', 'sword', true),
      itemInstance('item-corpse-enemy-dagger', 'dagger', false),
    ],
    kind: 'corpse',
    corpseOf: 'enemy-1',
  };

  return {
    ...base,
    players: [
      base.players[0],
      {
        ...deadPlayer,
        hp: 0,
        ghost: true,
        equipment: emptyEquipment(),
        inventory: createInventory(deadPlayer.inventory.capacity),
      },
    ],
    enemies: [
      {
        ...deadEnemy,
        hp: 0,
        equipment: emptyEquipment(),
        inventory: createInventory(deadEnemy.inventory.capacity),
      },
      liveEnemy,
    ],
    containers: [playerCorpse, enemyCorpse],
  };
}

test('TASK-0142: guardar y cargar conserva lootable y contenedores sin retirar tirada', async ({
  page,
}, testInfo) => {
  const state = persistenceState();
  await openState(page, state, SEED);
  const before = await snapshot(page);
  expect(before.containers).toHaveLength(2);
  expect(
    before.containers.some((container) =>
      container.items.some((item) => item?.lootable === false),
    ),
  ).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('pause-save').click();
  const download = await downloadPromise;
  const path = artifactPath(testInfo, 'saves', download.suggestedFilename());
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);

  const files = await readSaveZip(new Uint8Array(await readFile(path)));
  const parsed = readSaveFiles(files);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.state.containers).toEqual(state.containers);
  expect(parsed.value.state.rng).toEqual(before.rng);
  expect(
    JSON.parse(files.save).containers.some(
      (container: { items: Array<{ lootable?: boolean } | null> }) =>
        container.items.some((item) => item?.lootable === false),
    ),
  ).toBe(true);
  expect(lootMarks(parsed.value.state)).toEqual(lootMarks(before));

  await page.getByTestId('pause-load').click();
  await expect(page.getByTestId('pause-confirm-block')).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('pause-confirm').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);

  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const after = await snapshot(page);
  expect(after.containers).toEqual(before.containers);
  expect(after.rng).toEqual(before.rng);
  expect(after.lastEvents).toEqual([]);
  expect(lootMarks(after)).toEqual(lootMarks(before));
  await screenshot(page, 'carga-con-contenedores', testInfo);

  await writeLog(testInfo, 'guardado-cargado.json', {
    containers: after.containers.map((container) => ({
      id: container.id,
      corpseOf: container.corpseOf,
      items: container.items.map((item) => ({
        itemId: item?.itemId,
        lootable: item?.lootable,
      })),
    })),
    rng: { before: before.rng, after: after.rng },
    lootMarks: lootMarks(after),
  });
});
