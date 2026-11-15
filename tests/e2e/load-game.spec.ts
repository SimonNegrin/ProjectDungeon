import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { buildSaveFiles } from '../../src/game/save';
import type { GameState, Position, Unit } from '../../src/game/types';
import { centerCameraOnTile } from '../../src/host/camera';
import { gridPixelSize, TILE_SIZE } from '../../src/host/geometry';
import { MAP_VIEWPORT } from '../../src/host/layout';
import { writeSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import { openBspState, snapshot } from './support';

const GAME_VERSION = '0.1.0';
const CREATED_AT = '2026-11-15T20:00:00Z';
/** Semilla de la página en modo normal; el guardado debe reemplazarla. */
const PAGE_SEED = 4242;
const MENU_SEED = 314159265;
const JSON_SEED = 271828182;
const PAUSE_SEED = 279837264;

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

async function writeArtifact(
  testInfo: TestInfo,
  name: string,
  bytes: Uint8Array,
): Promise<string> {
  const path = artifactPath(testInfo, 'saves', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return path;
}

/** Partida de dos guerreros con nombres propios: HUD y manifiesto con texto. */
function twoPlayerState(seed: number): GameState {
  return createInitialState({
    seed,
    players: [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'warrior', variant: 2, name: 'Bru' },
    ],
  });
}

function activeUnit(state: GameState): Unit {
  return (
    state.players.find((player) => player.id === state.activePlayerId) ??
    state.players[0]
  );
}

function expectedCamera(state: GameState): { x: number; y: number } {
  return centerCameraOnTile(
    activeUnit(state),
    MAP_VIEWPORT,
    gridPixelSize(state.grid, TILE_SIZE),
    TILE_SIZE,
  );
}

/** Casilla de suelo libre más lejana al jugador dado (activo distinto). */
function farthestFloor(state: GameState, from: Position): Position {
  const occupied = new Set(state.players.map((player) => `${player.x},${player.y}`));
  let best: Position | null = null;
  let bestDistance = -1;
  for (let y = 0; y < state.grid.height; y += 1) {
    for (let x = 0; x < state.grid.width; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
      if (occupied.has(`${x},${y}`)) continue;
      const distance = Math.max(Math.abs(x - from.x), Math.abs(y - from.y));
      if (distance > bestDistance) {
        best = { x, y };
        bestDistance = distance;
      }
    }
  }
  if (best === null) throw new Error('No hay ninguna casilla de suelo libre.');
  return best;
}

/** Guardado con el segundo jugador activo, en otra casilla y en ronda 2. */
function pauseFixture(): GameState {
  const base = twoPlayerState(PAUSE_SEED);
  const spot = farthestFloor(base, base.players[0]);
  return {
    ...base,
    round: 2,
    activePlayerId: base.players[1].id,
    players: base.players.map((player, index) =>
      index === 1
        ? { ...player, x: spot.x, y: spot.y, home: { ...spot } }
        : player,
    ),
  };
}

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function openPause(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
}

test('TASK-0141: el menú principal carga un .zip real sin confirmación', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });

  const state = twoPlayerState(MENU_SEED);
  const files = buildSaveFiles(state, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const zipPath = await writeArtifact(
    testInfo,
    'guardado-menu.zip',
    await writeSaveZip(files),
  );

  await page.goto(`/?seed=${PAGE_SEED}`);
  await waitForGame(page);
  await expect(page.getByTestId('start-screen')).toBeVisible();
  expect((await snapshot(page)).rng.seed).toBe(PAGE_SEED);

  // El único selector del host se abre desde el menú y carga directo.
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('start-load').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(zipPath);

  await expect(page.getByTestId('start-screen')).toBeHidden();
  const loaded = await snapshot(page);
  expect(loaded.rng.seed).toBe(MENU_SEED);
  expect(loaded.round).toBe(state.round);
  expect(loaded.phase).toBe(state.phase);
  expect(loaded.activePlayerId).toBe(state.players[0].id);
  expect(loaded.players.map((player) => player.nombre)).toEqual(['Ana', 'Bru']);
  expect(loaded.camera).toMatchObject(expectedCamera(state));
  expect(loaded.lastEvents).toEqual([]);

  // HUD reconstruido desde el estado y sin presentación pendiente.
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toBeHidden();
  await screenshot(page, 'menu-zip-cargado', testInfo);
  expect(errors).toEqual([]);
});

test('TASK-0141: el menú principal carga un .json suelto real', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const state = twoPlayerState(JSON_SEED);
  const files = buildSaveFiles(state, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const jsonPath = await writeArtifact(
    testInfo,
    'partida-menu.json',
    new TextEncoder().encode(files.save),
  );

  await page.goto(`/?seed=${PAGE_SEED}`);
  await waitForGame(page);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('start-load').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(jsonPath);

  await expect(page.getByTestId('start-screen')).toBeHidden();
  const loaded = await snapshot(page);
  expect(loaded.rng.seed).toBe(JSON_SEED);
  expect(loaded.round).toBe(state.round);
  expect(loaded.activePlayerId).toBe(state.players[0].id);
  expect(loaded.camera).toMatchObject(expectedCamera(state));
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await screenshot(page, 'menu-json-cargado', testInfo);
});

test('TASK-0141: la pausa confirma, carga el .zip y deja cámara y HUD en el activo', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, PAUSE_SEED);
  expect(before.rng.seed).toBe(PAUSE_SEED);

  const loadedState = pauseFixture();
  const files = buildSaveFiles(loadedState, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const zipPath = await writeArtifact(
    testInfo,
    'guardado-pausa.zip',
    await writeSaveZip(files),
  );

  await openPause(page);
  await page.getByTestId('pause-load').click();
  await expect(page.getByTestId('pause-confirm-block')).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('pause-confirm').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(zipPath);

  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const loaded = await snapshot(page);
  expect(loaded.rng.seed).toBe(PAUSE_SEED);
  expect(loaded.round).toBe(2);
  expect(loaded.activePlayerId).toBe(loadedState.players[1].id);
  expect(loaded.players[1]?.x).toBe(loadedState.players[1]!.x);
  expect(loaded.players[1]?.y).toBe(loadedState.players[1]!.y);
  expect(loaded.camera).toMatchObject(expectedCamera(loadedState));
  expect(loaded.lastEvents).toEqual([]);

  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-hp')).toBeVisible();
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toBeHidden();
  await screenshot(page, 'pausa-zip-cargado', testInfo);
});

test('TASK-0141: cancelar el selector y un archivo inválido no tocan la partida', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, PAUSE_SEED);
  const invalidPath = await writeArtifact(
    testInfo,
    'partida-invalida.json',
    new TextEncoder().encode('{"format_version":1}'),
  );

  await openPause(page);
  await page.getByTestId('pause-load').click();
  const cancelledChooser = page.waitForEvent('filechooser');
  await page.getByTestId('pause-confirm').click();
  await (await cancelledChooser).setFiles([]);

  // Cancelar el selector no cierra la pausa ni cambia la partida.
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const afterCancel = await snapshot(page);
  expect(afterCancel.rng).toEqual(before.rng);
  expect(afterCancel.players).toEqual(before.players);
  expect(afterCancel.round).toBe(before.round);
  expect(afterCancel.turn).toBe(before.turn);
  expect(afterCancel.activePlayerId).toBe(before.activePlayerId);
  expect(afterCancel.camera).toEqual(before.camera);

  // Un .json con esquema roto se rechaza con mensaje visible, sin reemplazar.
  await page.getByTestId('pause-load').click();
  const invalidChooser = page.waitForEvent('filechooser');
  await page.getByTestId('pause-confirm').click();
  await (await invalidChooser).setFiles(invalidPath);

  const message = page.getByTestId('pause-load-message');
  await expect(message).toBeVisible();
  await expect(message).toContainText('La partida no es válida');
  await expect(page.getByTestId('pause-root')).toBeVisible();
  const afterInvalid = await snapshot(page);
  expect(afterInvalid.rng).toEqual(before.rng);
  expect(afterInvalid.players).toEqual(before.players);
  expect(afterInvalid.round).toBe(before.round);
  expect(afterInvalid.camera).toEqual(before.camera);
  await screenshot(page, 'pausa-json-invalido', testInfo);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
});
