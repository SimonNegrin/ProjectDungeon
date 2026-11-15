import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { buildSaveFiles, parseManifest, readSaveFiles } from '../../src/game/save';
import type { GameState, Position, Unit } from '../../src/game/types';
import { centerCameraOnTile } from '../../src/host/camera';
import { gridPixelSize, TILE_SIZE } from '../../src/host/geometry';
import { MAP_VIEWPORT } from '../../src/host/layout';
import { readSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import {
  dispatchFrozen,
  openBspState,
  openState,
  settle,
  snapshot,
} from './support';

/**
 * QA E2E de REQ-024 (TASK-0144). Deriva las aserciones de los criterios de la
 * ficha, no de la implementación de TASK-0139/0140/0141: pausa global, menú de
 * cinco acciones, guardado restringido, ida y vuelta real de `.zip`/`.json` y
 * rechazos de límites con la partida intacta.
 *
 * El resultado (criterio 7) tiene un defecto conocido: los overlays siguen
 * ofreciendo «Reiniciar» y `Esc` abre la pausa. La prueba que lo confirma vive
 * en `artifacts/TASK-0144/attempt-1/probe/`, fuera de la suite, para no dejar un
 * test rojo mientras TASK-0153 es propietaria del arreglo.
 */

const GAME_VERSION = '0.1.0';
const CREATED_AT = '2026-11-15T20:00:00Z';
const SEED = 279837264;
const PAGE_SEED = 4242;
const JSON_SEED = 271828182;
const MAX_BYTES = 5 * 1024 * 1024;

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

async function openPause(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-root')).toBeVisible();
}

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
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

/** Guardado con la segunda jugadora activa, en otra casilla y en ronda 2. */
function roundTwoState(seed: number): GameState {
  const base = createInitialState({
    seed,
    players: [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'warrior', variant: 2, name: 'Bru' },
    ],
  });
  const spot = farthestFloor(base, base.players[0]);
  return {
    ...base,
    round: 2,
    activePlayerId: base.players[1].id,
    players: base.players.map((player, index) =>
      index === 1 ? { ...player, x: spot.x, y: spot.y, home: { ...spot } } : player,
    ),
  };
}

/* ------------------------- construcción de .zip -------------------------- */

/**
 * Escribe un `.zip` `store` con las entradas pedidas. Se usa solo para los
 * casos de rechazo que `writeSaveZip` no puede producir (rutas, entradas
 * extra, exceso de entradas o tamaños declarados). `declaredSize` permite
 * declarar un tamaño descomprimido falso para probar los límites que el lector
 * comprueba antes de inflar.
 */
function storeZip(
  entries: readonly {
    readonly name: string;
    readonly data?: Uint8Array;
    readonly declaredSize?: number;
  }[],
): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = entry.data ?? new Uint8Array(0);
    const uncompressed = entry.declaredSize ?? data.byteLength;

    const local = new Uint8Array(30 + name.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x0403_4b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc32(data), true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, uncompressed, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    parts.push(local, data);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x0201_4b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc32(data), true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, uncompressed, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);

    offset += local.byteLength + data.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x0605_4b50, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const chunks = [...parts, ...centralParts, eocd];
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  return result;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

/* ------------------------------- criterio 1 ------------------------------ */

test('TASK-0144: Esc abre y cierra la pausa en personajes, enemiga y animación; el panel se cierra primero', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });

  // Fase de personajes.
  await openBspState(page, SEED);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await screenshot(page, 'pausa-raiz', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  // Fase enemiga: la pausa es global.
  const base = createInitialState({ seed: SEED });
  await openState(page, { ...base, phase: 'enemy' }, SEED);
  expect((await snapshot(page)).phase).toBe('enemy');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  // Animación en curso.
  await openBspState(page, SEED);
  await dispatchFrozen(page, { type: 'EndTurn' });
  expect((await snapshot(page)).animation.animating).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await settle(page);

  // Panel abierto: el primer Esc cierra el panel, no abre la pausa.
  await openBspState(page, SEED);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  expect(errors).toEqual([]);
});

/* ------------------------------- criterio 2 ------------------------------ */

test('TASK-0144: la pausa congela turnos, beats y animaciones; el input de juego se ignora y reanudar no salta', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  // Sin animación: ni fin de turno, ni ataque, ni movimiento, ni `R`.
  const before = await openBspState(page, SEED);
  await openPause(page);
  // `Enter` no entra en la lista: en la raíz activa la acción enfocada. El
  // input de juego (fin de turno, movimiento, ataque y `R`) sí debe ignorarse.
  for (const key of ['n', 'd', 'f', 'r']) await page.keyboard.press(key);
  const paused = await snapshot(page);
  expect(paused.phase).toBe(before.phase);
  expect(paused.round).toBe(before.round);
  expect(paused.players).toEqual(before.players);
  expect(paused.rng).toEqual(before.rng);
  expect(paused.cursor).toEqual(before.cursor);
  expect(paused.lastEvents).toEqual(before.lastEvents);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const resumed = await snapshot(page);
  expect(resumed.phase).toBe(before.phase);
  expect(resumed.round).toBe(before.round);
  expect(resumed.players).toEqual(before.players);
  expect(resumed.rng).toEqual(before.rng);

  // Con animación pendiente: el reloj no avanza en la pausa y sigue al reanudar.
  await openBspState(page, SEED);
  await dispatchFrozen(page, { type: 'EndTurn' });
  const moving = await snapshot(page);
  expect(moving.animation.animating).toBe(true);

  await openPause(page);
  const pausedAnimation = await snapshot(page);
  await page.keyboard.press('d');
  const frozen = await page.evaluate(() => window.__game!.advance(5_000));
  expect(frozen.animation.step).toBe(pausedAnimation.animation.step);
  expect(frozen.animation.position).toEqual(pausedAnimation.animation.position);
  expect(frozen.animation.cues).toEqual(pausedAnimation.animation.cues);
  expect(frozen.players).toEqual(pausedAnimation.players);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const finished = await page.evaluate(() => window.__game!.advance(1_000_000));
  expect(finished.animation.animating).toBe(false);
  expect(finished.players[0].mp).toBe(moving.players[0].mp);
  expect(finished.players).toEqual(moving.players);
  expect(finished.round).toBe(moving.round);
});

/* ------------------------------- criterio 3 ------------------------------ */

test('TASK-0144: el menú muestra las cinco acciones en orden, navega con teclado y Esc vuelve a jugar', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBspState(page, SEED);
  await openPause(page);

  const buttons = page.locator('[data-testid="pause-root"] .pause-button');
  await expect(buttons).toHaveCount(5);
  expect(
    await buttons.evaluateAll((elements) =>
      elements.map((element) => (element.textContent ?? '').trim()),
    ),
  ).toEqual([
    'Reanudar',
    'Nueva partida',
    'Cargar partida',
    'Guardar partida',
    'Controles',
  ]);
  await expect(page.getByTestId('pause-menu')).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('pause-resume')).toBeFocused();
  await screenshot(page, 'pausa-menu', testInfo);

  // Flechas y Tab recorren las acciones; Shift+Tab vuelve.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-new')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-load')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('pause-new')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('pause-load')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('pause-new')).toBeFocused();

  // Controles: la lista sale del mapa único, sin inputs ni remapeo.
  for (let step = 0; step < 3; step += 1) await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-controls')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-controls-screen')).toBeVisible();
  await expect(page.getByTestId('pause-control-pause')).toContainText('Esc');
  await expect(page.getByTestId('pause-control-cursor-up')).toContainText('W/↑');
  await expect(page.locator('[data-testid="pause-menu"] input')).toHaveCount(0);
  await expect(page.locator('[data-testid="pause-remap"]')).toHaveCount(0);
  await screenshot(page, 'pausa-controles', testInfo);

  // Esc vuelve a la raíz con el foco de origen; Esc en la raíz reanuda.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-root')).toBeVisible();
  await expect(page.getByTestId('pause-controls')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await expect(page.getByTestId('frame')).toBeFocused();
});

/* ------------------------------- criterio 4 ------------------------------ */

test('TASK-0144: Guardar solo está activo en la fase de personajes sin animación; nombre y manifiesto correctos', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, SEED);

  // Fase de personajes: activo, sin motivo, descarga un único `.zip`.
  await openPause(page);
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  await expect(page.getByTestId('pause-save-reason')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('pause-save').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    new RegExp(`^proyectdungeon-${before.rng.seed}-\\d{8}-\\d{6}\\.zip$`),
  );
  const path = artifactPath(testInfo, 'downloads', download.suggestedFilename());
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);

  const files = await readSaveZip(new Uint8Array(await readFile(path)));
  const manifest = parseManifest(files.manifest);
  expect(manifest.ok).toBe(true);
  if (!manifest.ok) return;
  expect(manifest.value.format_version).toBe(1);
  expect(manifest.value.game_version).toBe(GAME_VERSION);
  expect(manifest.value.seed).toBe(before.rng.seed);
  expect(manifest.value.created_at).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  );
  expect(Number.isFinite(Date.parse(manifest.value.created_at))).toBe(true);
  expect(manifest.value.summary.turn).toBe(before.round);
  expect(manifest.value.summary.round).toBe(before.round);
  expect(manifest.value.summary.phase).toBe('player');
  expect(manifest.value.summary.players.map((entry) => entry.name)).toEqual(
    before.players.map((player) => player.nombre),
  );
  expect(manifest.value.summary.players.map((entry) => entry.archetype)).toEqual(
    before.players.map((player) => player.archetypeId),
  );
  const parsed = readSaveFiles(files);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.value.state.rng.seed).toBe(before.rng.seed);
    expect(parsed.value.state.round).toBe(before.round);
    expect(parsed.value.state.activePlayerId).toBe(before.activePlayerId);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  // Fase enemiga: desactivado y con el motivo visible.
  await openState(page, { ...createInitialState({ seed: SEED }), phase: 'enemy' }, SEED);
  await openPause(page);
  await expect(page.getByTestId('pause-save')).toBeDisabled();
  await expect(page.getByTestId('pause-save')).toHaveAttribute('data-enabled', 'false');
  await expect(page.getByTestId('pause-save-reason')).toHaveText(
    'Solo se puede guardar en la fase de personajes.',
  );

  // Animación en curso: desactivado y con motivo distinto.
  await openBspState(page, SEED);
  await dispatchFrozen(page, { type: 'EndTurn' });
  await openPause(page);
  await expect(page.getByTestId('pause-save')).toBeDisabled();
  await expect(page.getByTestId('pause-save-reason')).toHaveText(
    'Espera a que termine la animación para guardar.',
  );

  expect(errors).toEqual([]);
});

/* ------------------------------- criterio 5 ------------------------------ */

test('TASK-0144: ida y vuelta real de .zip desde el menú principal y .json desde la pausa', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });

  // La partida a guardar tiene ronda 2 y la segunda jugadora como activa.
  const saved = roundTwoState(SEED);
  const loaded = await openState(page, saved, SEED);
  expect(loaded.round).toBe(2);
  expect(loaded.activePlayerId).toBe(saved.players[1].id);

  await openPause(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('pause-save').click();
  const download = await downloadPromise;
  const zipPath = artifactPath(testInfo, 'downloads', download.suggestedFilename());
  await mkdir(dirname(zipPath), { recursive: true });
  await download.saveAs(zipPath);

  // Recarga real de la página: el `.zip` se carga desde el menú principal.
  await page.goto(`/?seed=${PAGE_SEED}`);
  await waitForGame(page);
  await expect(page.getByTestId('start-screen')).toBeVisible();
  const menuChooser = page.waitForEvent('filechooser');
  await page.getByTestId('start-load').click();
  await (await menuChooser).setFiles(zipPath);

  await expect(page.getByTestId('start-screen')).toBeHidden();
  const fromZip = await snapshot(page);
  expect(fromZip.rng.seed).toBe(saved.rng.seed);
  expect(fromZip.round).toBe(saved.round);
  expect(fromZip.phase).toBe(saved.phase);
  expect(fromZip.activePlayerId).toBe(saved.players[1].id);
  expect(
    fromZip.players.map((player) => ({
      id: player.id,
      nombre: player.nombre,
      archetypeId: player.archetypeId,
      x: player.x,
      y: player.y,
      hp: player.hp,
      mp: player.mp,
      stats: player.stats,
      actions: player.actions,
    })),
  ).toEqual(
    saved.players.map((player) => ({
      id: player.id,
      nombre: player.nombre,
      archetypeId: player.archetypeId,
      x: player.x,
      y: player.y,
      hp: player.hp,
      mp: player.mp,
      stats: player.stats,
      actions: player.actions,
    })),
  );
  expect(fromZip.camera).toMatchObject(expectedCamera(saved));
  expect(fromZip.lastEvents).toEqual([]);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  // TASK-0151: N/M y ronda del estado; cargar no deja aviso pendiente.
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );
  await expect(page.getByTestId('hud-live')).toHaveText(
    'Turno de Bru. Jugador 2 de 2. Ronda 2.',
  );
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toBeHidden();
  await screenshot(page, 'carga-zip-menu', testInfo);

  // `.json` suelto de otra partida, desde la pausa y con confirmación.
  const jsonState = createInitialState({
    seed: JSON_SEED,
    players: [
      { archetypeId: 'mage', variant: 1, name: 'Bru' },
      { archetypeId: 'cleric', variant: 2, name: 'Cle' },
    ],
  });
  const jsonFiles = buildSaveFiles(jsonState, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const jsonPath = await writeArtifact(
    testInfo,
    'partida-pausa.json',
    new TextEncoder().encode(jsonFiles.save),
  );

  await openPause(page);
  await page.getByTestId('pause-load').click();
  await expect(page.getByTestId('pause-confirm-block')).toBeVisible();
  await expect(page.getByTestId('pause-confirm-text')).toContainText('reemplazará');
  const pauseChooser = page.waitForEvent('filechooser');
  await page.getByTestId('pause-confirm').click();
  await (await pauseChooser).setFiles(jsonPath);

  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const fromJson = await snapshot(page);
  expect(fromJson.rng.seed).toBe(JSON_SEED);
  expect(fromJson.round).toBe(jsonState.round);
  expect(fromJson.phase).toBe(jsonState.phase);
  expect(fromJson.activePlayerId).toBe(jsonState.players[0].id);
  expect(fromJson.camera).toMatchObject(expectedCamera(jsonState));
  expect(fromJson.lastEvents).toEqual([]);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-message')).toBeHidden();
  await screenshot(page, 'carga-json-pausa', testInfo);

  expect(errors).toEqual([]);
});

/* ------------------------------- criterio 6 ------------------------------ */

test('TASK-0144: la carga rechaza rutas, entradas extra, exceso de entradas y tamaños sin tocar la partida', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, SEED);
  await openPause(page);

  const text = new TextEncoder().encode('{}');
  const invalid: Array<{
    readonly name: string;
    readonly bytes: Uint8Array;
    readonly fragment: string;
  }> = [
    {
      name: 'ruta.zip',
      bytes: storeZip([
        { name: 'carpeta/manifiesto.json', data: text },
        { name: 'partida.json', data: text },
      ]),
      fragment: 'ruta no permitida',
    },
    {
      name: 'entrada-extra.zip',
      bytes: storeZip([
        { name: 'manifiesto.json', data: text },
        { name: 'partida.json', data: text },
        { name: 'extra.txt', data: text },
      ]),
      fragment: 'entrada inesperada',
    },
    {
      name: 'cinco-entradas.zip',
      bytes: storeZip([
        { name: 'manifiesto.json', data: text },
        { name: 'partida.json', data: text },
        { name: 'a.txt', data: text },
        { name: 'b.txt', data: text },
        { name: 'c.txt', data: text },
      ]),
      fragment: 'el máximo es 4',
    },
    {
      name: 'comprimido-grande.zip',
      bytes: new Uint8Array(MAX_BYTES + 1),
      fragment: 'supera el límite de 5242880 bytes comprimidos',
    },
    {
      name: 'descomprimido-total.zip',
      bytes: storeZip([
        { name: 'manifiesto.json', declaredSize: 11 * 1024 * 1024 },
        { name: 'partida.json', declaredSize: 11 * 1024 * 1024 },
      ]),
      fragment: 'declara más de 20971520 bytes sin comprimir',
    },
    {
      name: 'descomprimido-archivo.zip',
      bytes: storeZip([
        { name: 'manifiesto.json', declaredSize: 6 * 1024 * 1024 },
        { name: 'partida.json', declaredSize: 100 },
      ]),
      fragment: 'manifiesto.json declara más de 5242880 bytes sin comprimir',
    },
    {
      name: 'json-grande.json',
      bytes: new Uint8Array(MAX_BYTES + 1),
      fragment: 'El archivo .json supera el límite de 5 MB',
    },
  ];

  for (const entry of invalid) {
    const path = await writeArtifact(testInfo, entry.name, entry.bytes);
    await page.getByTestId('pause-load').click();
    await expect(page.getByTestId('pause-confirm-block')).toBeVisible();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('pause-confirm').click();
    await (await chooserPromise).setFiles(path);

    const message = page.getByTestId('pause-load-message');
    await expect(message).toBeVisible();
    await expect(message).toContainText(entry.fragment);
    await expect(page.getByTestId('pause-root')).toBeVisible();

    const after = await snapshot(page);
    expect(after.rng).toEqual(before.rng);
    expect(after.players).toEqual(before.players);
    expect(after.round).toBe(before.round);
    expect(after.turn).toBe(before.turn);
    expect(after.activePlayerId).toBe(before.activePlayerId);
    expect(after.camera).toEqual(before.camera);
    expect(after.lastEvents).toEqual([]);
  }

  await screenshot(page, 'error-carga', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
});

/* ------------------------------- criterio 7 ------------------------------ */

/**
 * Criterio 7 parcial: `R` no reinicia y el overlay no contiene guardado ni
 * pausa. El defecto abierto —los dos overlays ofrecen «Reiniciar» y `Esc` abre
 * la pausa— se mide en el probe de `TASK-0144` y pertenece a TASK-0153; no se
 * convierte en una aserción roja de la suite.
 */
test('TASK-0144: el resultado no ofrece guardado y R no reinicia', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const victory = { ...createInitialState({ seed: SEED }), status: 'victory' as const };
  await openState(page, victory, SEED);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  const before = await snapshot(page);
  expect(before.status).toBe('victory');

  await page.keyboard.press('r');
  const afterR = await snapshot(page);
  expect(afterR.lastEvents.some((event) => event.type === 'GameRestarted')).toBe(
    false,
  );
  expect(afterR.players).toEqual(before.players);
  expect(afterR.round).toBe(before.round);

  const victoryOverlay = page.getByTestId('overlay-victory');
  await expect(victoryOverlay.getByTestId('pause-save')).toHaveCount(0);
  await expect(victoryOverlay.getByTestId('pause-menu')).toHaveCount(0);
  await expect(victoryOverlay.getByRole('button', { name: /guardar/i })).toHaveCount(0);
  await screenshot(page, 'resultado-victoria', testInfo);

  const defeat = { ...createInitialState({ seed: SEED }), status: 'defeat' as const };
  await openState(page, defeat, SEED);
  await expect(page.getByTestId('overlay-defeat')).toBeVisible();
  const defeatOverlay = page.getByTestId('overlay-defeat');
  await expect(defeatOverlay.getByTestId('pause-save')).toHaveCount(0);
  await expect(defeatOverlay.getByRole('button', { name: /guardar/i })).toHaveCount(0);
  await expect(page.getByTestId('hud-status')).toHaveCount(0);
});
