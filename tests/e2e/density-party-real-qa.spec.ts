import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readSaveFiles } from '../../src/game/save';
import type { Command } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { readSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';

/**
 * QA E2E de REQ-012 R-006/T-014 y ADR-034: una partida nueva desde el menú usa
 * el tamaño real de la party, y guardar/cargar conserva el reparto. Deriva las
 * aserciones de los criterios de TASK-0176, no de la implementación del
 * generador: la pantalla de inicio y el ciclo de guardado son la ruta real del
 * jugador.
 */

const SEED = 279837264;
const PARTY_SIZES = [1, 6] as const;
type PartySize = (typeof PARTY_SIZES)[number];

const EXPECTED_TOTALS: Record<PartySize, { min: number; max: number }> = {
  1: { min: 4, max: 6 },
  6: { min: 10, max: 12 },
};

const VIEWPORTS = [
  { width: 1280, height: 720, label: '1280x720' },
  { width: 900, height: 700, label: '900x700' },
] as const;

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
}

/** Completa la presentación pendiente sin alterar el estado del motor. */
async function settle(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.advance(1_000_000));
}

/** Recorre el menú real de REQ-016 hasta la partida, con la party pedida. */
async function startGame(
  page: Page,
  players: PartySize,
  seed: number = SEED,
): Promise<GameSnapshot> {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeVisible();

  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await page.getByTestId('step1-players').selectOption(String(players));
  await page.getByTestId('step1-seed').fill(String(seed));
  await page.getByTestId('step1-continue').click();

  await expect(page.getByTestId('player-screen')).toBeVisible();
  for (let index = 0; index < players; index += 1) {
    await page.getByTestId('player-next').click();
  }
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.getByTestId('summary-start').click();

  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await waitForGame(page);
  return settle(page);
}

function enemySummary(snap: GameSnapshot): Array<{
  id: string;
  type: string | null;
  x: number;
  y: number;
  roomId: number | null;
  home: { x: number; y: number };
  hidden: boolean | null;
  interior: boolean | null;
}> {
  return snap.enemies.map((enemy) => {
    const declared = snap.mapEnemies.find((candidate) => candidate.id === enemy.id);
    return {
      id: enemy.id,
      type: enemy.enemyType,
      x: enemy.x,
      y: enemy.y,
      roomId: declared?.roomId ?? null,
      home: { x: enemy.home.x, y: enemy.home.y },
      hidden: declared?.hidden ?? null,
      interior: declared?.interior ?? null,
    };
  });
}

function assertPartyDensity(snap: GameSnapshot, players: PartySize): void {
  const expected = EXPECTED_TOTALS[players];
  const living = snap.enemies.filter((enemy) => enemy.hp > 0);

  expect(snap.seed, 'semilla de la partida').toBe(SEED);
  expect(snap.players, 'party real en el motor').toHaveLength(players);
  expect(snap.config?.players, 'party real en la configuración').toHaveLength(players);
  expect(snap.enemyBudget, 'presupuesto del generador denso').not.toBeNull();

  const budget = snap.enemyBudget!;
  expect(budget.playersP, 'P es el tamaño real de la party').toBe(players);
  expect(
    living.length,
    `${players} jugador(es) debe(n) producir ${expected.min}-${expected.max} enemigos`,
  ).toBeGreaterThanOrEqual(expected.min);
  expect(living.length).toBeLessThanOrEqual(expected.max);
  expect(living.length, 'no se supera el total del presupuesto').toBeLessThanOrEqual(
    budget.total,
  );
  expect(snap.mapEnemies, 'fichas declaradas por el generador').toHaveLength(
    living.length,
  );

  for (const enemy of living) {
    const declared = snap.mapEnemies.find((candidate) => candidate.id === enemy.id);
    expect(declared, `ficha ${enemy.id} declarada por el generador`).toBeDefined();
    if (!declared) continue;
    expect(enemy.faction).toBe('enemy');
    expect(declared.type).toBe(enemy.enemyType);
    expect({ x: declared.x, y: declared.y }).toEqual({ x: enemy.x, y: enemy.y });
    expect(declared.home).toEqual(enemy.home);
    expect(
      snap.grid.tiles[enemy.y * snap.grid.width + enemy.x],
      `enemigo ${enemy.id} sobre suelo`,
    ).toBe('floor');
    expect(declared.roomId).not.toBe(snap.spawns?.roomId);
  }
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  data: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

async function saveScreenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/**
 * Abre `F1` y desplaza el overlay hasta el bloque de enemigos del generador:
 * cada ficha aparece con tipo, posición, `home`, sala y si es emboscada/interior.
 * No modifica el texto ni el estado; solo lleva la vista a la evidencia.
 */
async function captureDistribution(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  await page.keyboard.press('F1');
  const overlay = page.getByTestId('debug-overlay');
  await expect(overlay).toBeVisible();
  const text = (await page.getByTestId('debug-content').textContent()) ?? '';
  expect(text).toContain('Enemigos del generador:');
  expect(text).toContain(`Semilla: ${SEED}`);

  await overlay.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await saveScreenshot(page, name, testInfo);
  await page.keyboard.press('F1');
  await expect(overlay).toBeHidden();
}

function freeAdjacentMove(snap: GameSnapshot): { dx: number; dy: number } | null {
  const player = snap.players[0];
  const occupied = new Set(
    [...snap.players, ...snap.enemies]
      .filter((unit) => unit.hp > 0)
      .map((unit) => `${unit.x},${unit.y}`),
  );
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    const x = player.x + dx;
    const y = player.y + dy;
    if (x < 0 || y < 0 || x >= snap.grid.width || y >= snap.grid.height) continue;
    if (snap.grid.tiles[y * snap.grid.width + x] !== 'floor') continue;
    if (occupied.has(`${x},${y}`)) continue;
    return { dx, dy };
  }
  return null;
}

function saveSummary(snap: GameSnapshot): unknown {
  return {
    seed: snap.seed,
    round: snap.round,
    activePlayerId: snap.activePlayerId,
    players: snap.players.map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      nombre: player.nombre,
    })),
    enemies: snap.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.enemyType,
      x: enemy.x,
      y: enemy.y,
      home: enemy.home,
      hp: enemy.hp,
      awareness: enemy.awareness,
    })),
    mapEnemies: snap.mapEnemies,
    enemyBudget: snap.enemyBudget,
    tiles: snap.grid.tiles,
    rooms: snap.rooms,
    doors: snap.doors,
    spawns: snap.spawns,
  };
}

test('TASK-0176: 1 frente a 6 jugadores con la misma semilla, a 1280×720 y 900×700', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const observed = new Map<PartySize, GameSnapshot[]>();
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const players of PARTY_SIZES) {
      const snap = await startGame(page, players);
      assertPartyDensity(snap, players);
      observed.set(players, [...(observed.get(players) ?? []), snap]);

      await captureDistribution(
        page,
        `reparto-${players}-jugador${players === 1 ? '' : 'es'}-${viewport.label}`,
        testInfo,
      );
      await writeLog(
        testInfo,
        `reparto-${players}-jugador${players === 1 ? '' : 'es'}-${viewport.label}.json`,
        {
          seed: SEED,
          viewport,
          players,
          total: snap.enemies.length,
          enemyBudget: snap.enemyBudget,
          composition: {
            sentinels: snap.enemies.filter((enemy) => enemy.enemyType === 'sentinel')
              .length,
            brutes: snap.enemies.filter((enemy) => enemy.enemyType === 'brute').length,
            cowards: snap.enemies.filter((enemy) => enemy.enemyType === 'coward')
              .length,
          },
          enemies: enemySummary(snap),
        },
      );
    }
  }

  const solo = observed.get(1)!;
  const group = observed.get(6)!;
  expect(solo).toHaveLength(VIEWPORTS.length);
  expect(group).toHaveLength(VIEWPORTS.length);
  for (const snap of solo) assertPartyDensity(snap, 1);
  for (const snap of group) assertPartyDensity(snap, 6);

  // La misma semilla y party produce el mismo total sin depender del viewport.
  expect(new Set(solo.map((snap) => snap.enemies.length)).size).toBe(1);
  expect(new Set(group.map((snap) => snap.enemies.length)).size).toBe(1);
  expect(solo[0].enemies.length).not.toBe(group[0].enemies.length);
  expect(solo[0].enemyBudget?.nonSpawnRooms).toBe(
    group[0].enemyBudget?.nonSpawnRooms,
  );

  await writeLog(testInfo, 'totales-por-party.json', {
    seed: SEED,
    viewports: VIEWPORTS.map((viewport) => viewport.label),
    observed: PARTY_SIZES.map((players) => ({
      players,
      expected: EXPECTED_TOTALS[players],
      totals: observed.get(players)!.map((snap) => snap.enemies.length),
      budgetTotals: observed
        .get(players)!
        .map((snap) => snap.enemyBudget?.total ?? null),
      nonSpawnRooms: observed.get(players)![0].enemyBudget?.nonSpawnRooms ?? null,
    })),
  });

  expect(errors).toEqual([]);
});

test('TASK-0176: guardar con una party y cargar desde el menú conserva el reparto', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });

  const initial = await startGame(page, 6);
  assertPartyDensity(initial, 6);
  const step = freeAdjacentMove(initial);
  expect(step, 'hay un tile libre adyacente para mover al jugador').not.toBeNull();
  if (!step) return;

  // Mover al jugador deja un estado que no se reproduce regenerando el mapa:
  // la carga debe devolver esa posición además del reparto original.
  const move: Command = {
    type: 'Move',
    unitId: initial.players[0].id,
    dx: step.dx,
    dy: step.dy,
  };
  const moveResult = await page.evaluate((command) => {
    const result = window.__game!.dispatch(command);
    window.__game!.advance(1_000_000);
    return result;
  }, move);
  expect(
    moveResult.events.filter((event) => event.type === 'CommandRejected'),
  ).toEqual([]);
  const before = await snapshot(page);
  expect({ x: before.players[0].x, y: before.players[0].y }).toEqual({
    x: initial.players[0].x + step.dx,
    y: initial.players[0].y + step.dy,
  });
  expect(before.enemies.map((enemy) => [enemy.id, enemy.x, enemy.y])).toEqual(
    initial.enemies.map((enemy) => [enemy.id, enemy.x, enemy.y]),
  );

  // Guardado real desde la pausa en fase de personajes.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('pause-save').click();
  const download = await downloadPromise;
  const zipPath = artifactPath(
    testInfo,
    'saves',
    download.suggestedFilename(),
  );
  await mkdir(dirname(zipPath), { recursive: true });
  await download.saveAs(zipPath);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  const files = await readSaveZip(new Uint8Array(await readFile(zipPath)));
  const parsed = readSaveFiles(files);
  expect(parsed.ok, 'el guardado real es válido').toBe(true);
  if (!parsed.ok) return;
  const saved = parsed.value.state;
  expect(saved.enemies.map((enemy) => [enemy.id, enemy.enemyType, enemy.x, enemy.y]))
    .toEqual(
      before.enemies.map((enemy) => [
        enemy.id,
        enemy.enemyType,
        enemy.x,
        enemy.y,
      ]),
    );
  expect(saved.map?.seed).toBe(SEED);
  expect(saved.map?.tiles).toEqual(before.grid.tiles);

  // Carga real desde el menú principal con el `.zip` descargado.
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await waitForGame(page);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('start-load').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(zipPath);
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await settle(page);
  const loaded = await snapshot(page);

  // Total, posiciones y tipos: igualdad exacta con el estado guardado.
  expect(loaded.seed, 'semilla cargada').toBe(SEED);
  expect(loaded.enemies.length, 'total conservado').toBe(before.enemies.length);
  expect(
    loaded.enemies.map((enemy) => [enemy.id, enemy.enemyType, enemy.x, enemy.y]),
  ).toEqual(
    before.enemies.map((enemy) => [enemy.id, enemy.enemyType, enemy.x, enemy.y]),
  );
  expect(loaded.enemies).toEqual(before.enemies);
  expect(loaded.mapEnemies).toEqual(before.mapEnemies);
  expect(loaded.enemyBudget).toEqual(before.enemyBudget);

  // El mapa no se regenera: rejilla, salas, puertas y spawn idénticos.
  expect(loaded.grid.tiles).toEqual(before.grid.tiles);
  expect(loaded.rooms).toEqual(before.rooms);
  expect(loaded.corridors).toEqual(before.corridors);
  expect(loaded.doors).toEqual(before.doors);
  expect(loaded.spawns).toEqual(before.spawns);
  expect(loaded.entrance).toEqual(before.entrance);
  expect(loaded.exit).toEqual(before.exit);
  expect(loaded.containers).toEqual(before.containers);
  expect(loaded.groundItems).toEqual(before.groundItems);
  expect(loaded.rng).toEqual(before.rng);
  expect(loaded.players).toEqual(before.players);
  expect(loaded.round).toBe(before.round);
  expect(loaded.config).toEqual(before.config);

  await page.keyboard.press('F1');
  const overlay = page.getByTestId('debug-overlay');
  await expect(overlay).toBeVisible();
  const text = (await page.getByTestId('debug-content').textContent()) ?? '';
  expect(text).toContain('Enemigos del generador:');
  await overlay.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await saveScreenshot(page, 'cargado-6-jugadores-1280x720', testInfo);
  await page.keyboard.press('F1');
  await expect(overlay).toBeHidden();

  await writeLog(testInfo, 'guardado-carga.json', {
    seed: SEED,
    players: 6,
    zip: download.suggestedFilename(),
    total: loaded.enemies.length,
    enemyBudget: loaded.enemyBudget,
    before: saveSummary(before),
    after: saveSummary(loaded),
    preserved: {
      total: loaded.enemies.length === before.enemies.length,
      enemies: loaded.enemies.every((enemy, index) => {
        const original = before.enemies[index];
        return (
          original !== undefined &&
          enemy.id === original.id &&
          enemy.enemyType === original.enemyType &&
          enemy.x === original.x &&
          enemy.y === original.y
        );
      }),
      map: loaded.grid.tiles.join('') === before.grid.tiles.join(''),
    },
  });

  expect(errors).toEqual([]);
});
