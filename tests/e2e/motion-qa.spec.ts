import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import { FEEDBACK_CONFIG } from '../../src/host/feedback-config';
import { MOTION_CONFIG } from '../../src/host/motion';
import {
  defeatAllEnemies,
  moveAwayFromEnemy,
  moveCursorTo,
  openBspState,
  reachableVisibleTiles,
  settle,
  snapshot,
  visibleRange,
  walkTo,
} from './support';
import { artifactPath } from './artifacts';

const SEED = 279837264;
const SEED_URL = `/?seed=${SEED}`;
const PAUSE = MOTION_CONFIG.pauseMs;
const STEP = MOTION_CONFIG.stepMs;
const HALF_STEP = STEP / 2;

type Snapshot = Awaited<ReturnType<typeof snapshot>>;
type Position = { readonly x: number; readonly y: number };

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/**
 * Carga la partida y registra, después del listener del juego, un listener de
 * test que congela el reloj de presentación en el mismo `keydown` que inicia la
 * animación. Así ningún frame real avanza entre la tecla y el primer muestreo.
 * Con `reducedMotion` el movimiento ya es instantáneo y el listener es inocuo.
 */
async function openGame(
  page: Page,
  options: { readonly reducedMotion?: boolean } = {},
): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
  });
  await openBspState(page, SEED, SEED_URL);
  await installFreeze(page);
}

/** Congela el reloj en el mismo `keydown` que inicia cada animación. */
async function installFreeze(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.addEventListener('keydown', () => {
      window.__game!.advance(0);
    });
  });
}

async function advance(page: Page, ms: number): Promise<Snapshot> {
  return page.evaluate((delta) => window.__game!.advance(delta), ms);
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
  clip?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, ...(clip ? { clip } : {}) });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function positionOf(snap: Snapshot): NonNullable<Snapshot['animation']['position']> {
  const position = snap.animation.position;
  if (!position) throw new Error('Se esperaba una posición visual durante la animación');
  return position;
}

function tileCenter(tile: Position, tileSize: number): Position {
  return {
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2,
  };
}

function floorNeighbor(snap: Snapshot, point: Position): Position | undefined {
  return [
    { x: point.x - 1, y: point.y },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y - 1 },
    { x: point.x, y: point.y + 1 },
  ].find(
    (cell) =>
      cell.x >= 0 &&
      cell.y >= 0 &&
      cell.x < snap.grid.width &&
      cell.y < snap.grid.height &&
      snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor',
  );
}

/**
 * La cámara de presentación es entera, sigue al sprite y se limita al mapa:
 * centrada salvo que el clamp la detenga en un borde.
 */
function expectCameraFollows(snap: Snapshot, label: string): void {
  const position = positionOf(snap);
  const display = snap.animation.camera;
  const { width, height } = snap.viewport;

  expect(Number.isInteger(display.x), `${label}: cámara x entera`).toBe(true);
  expect(Number.isInteger(display.y), `${label}: cámara y entera`).toBe(true);

  // Centrada mientras el sprite no toque un borde; si lo toca, pegada a él.
  if (position.x - width / 2 < 0) {
    expect(display.x, `${label}: clamp oeste`).toBe(0);
  } else if (position.x - width / 2 > snap.camera.maxX) {
    expect(display.x, `${label}: clamp este`).toBe(snap.camera.maxX);
  } else {
    expect(position.x - display.x, `${label}: centrado x`).toBe(width / 2);
  }
  if (position.y - height / 2 < 0) {
    expect(display.y, `${label}: clamp norte`).toBe(0);
  } else if (position.y - height / 2 > snap.camera.maxY) {
    expect(display.y, `${label}: clamp sur`).toBe(snap.camera.maxY);
  } else {
    expect(position.y - display.y, `${label}: centrado y`).toBe(height / 2);
  }

  expect(position.x - display.x).toBeGreaterThanOrEqual(0);
  expect(position.x - display.x).toBeLessThanOrEqual(width);
  expect(position.y - display.y).toBeGreaterThanOrEqual(0);
  expect(position.y - display.y).toBeLessThanOrEqual(height);
}

/** Cámara esperada si el sprite está centrado y después se limita al mapa. */
function expectedCamera(snap: Snapshot): { x: number; y: number } {
  const player = snap.players[0];
  const rawX = Math.round(
    (player.x + 0.5) * snap.tileSize - snap.viewport.width / 2,
  );
  const rawY = Math.round(
    (player.y + 0.5) * snap.tileSize - snap.viewport.height / 2,
  );
  return {
    x: Math.min(Math.max(rawX, 0), snap.camera.maxX),
    y: Math.min(Math.max(rawY, 0), snap.camera.maxY),
  };
}

/** Posición estrictamente entre dos centros contiguos, eje a eje. */
function expectBetween(
  position: Position,
  from: Position,
  to: Position,
  label: string,
): void {
  for (const axis of ['x', 'y'] as const) {
    const low = Math.min(from[axis], to[axis]);
    const high = Math.max(from[axis], to[axis]);
    if (low === high) {
      expect(position[axis], `${label}: ${axis} fijo`).toBe(low);
      continue;
    }
    expect(position[axis], `${label}: ${axis} por encima del origen`).toBeGreaterThan(
      low,
    );
    expect(position[axis], `${label}: ${axis} por debajo del destino`).toBeLessThan(
      high,
    );
  }
}

async function presentationSample(page: Page, label: string) {
  const snap = await snapshot(page);
  return {
    label,
    animating: snap.animation.animating,
    step: snap.animation.step,
    totalSteps: snap.animation.totalSteps,
    position: snap.animation.position && { ...snap.animation.position },
    camera: { x: snap.animation.camera.x, y: snap.animation.camera.y },
    cursor: {
      x: snap.cursor.x,
      y: snap.cursor.y,
      visible: snap.cursor.visible,
      path: snap.cursor.path.length,
    },
    hudMp: await page.getByTestId('hud-player-mp').textContent(),
    hudPhase: await page.getByTestId('hud-phase').textContent(),
    hudTurn: await page.getByTestId('hud-turn').textContent(),
    dots: await page.locator('[data-testid="cursor-path-point"]').count(),
  };
}

test('paso intermedio, avance, cámara, cursor oculto, puntos y MP progresivo', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  expect(start.seed).toBe(SEED);
  const spawn = start.players[0];
  expect(spawn).toMatchObject({ mp: 6 });
  expect(start.camera).toMatchObject(expectedCamera(start));
  const tileSize = start.tileSize;

  const target =
    reachableVisibleTiles(start, { minDistance: 2, maxDistance: 2 }).find(
      (tile) => tile.y === spawn.y,
    ) ??
    reachableVisibleTiles(start, { minDistance: 2, maxDistance: 2 })[0];
  expect(target, 'Debe existir un destino visible a dos pasos').toBeDefined();
  await moveCursorTo(page, target.x, target.y);
  const planned = await snapshot(page);
  const path = planned.cursor.path;
  expect(path).toHaveLength(2);
  expect(path.at(-1)).toEqual({ x: target.x, y: target.y });

  // La tecla arranca la animación y el listener de test la congela en 0 ms.
  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({ animating: true, step: 0, totalSteps: 2 });
  expect(positionOf(frozen)).toMatchObject(tileCenter(spawn, tileSize));
  expect(frozen.cursor).toMatchObject({
    x: target.x,
    y: target.y,
    visible: false,
  });
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(2);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  expectCameraFollows(frozen, 'inicio');

  // Mitad del primer paso: el sprite está entre el spawn y el primer tile.
  const midFirst = await advance(page, PAUSE + HALF_STEP);
  expect(midFirst.animation).toMatchObject({ animating: true, step: 0, totalSteps: 2 });
  expectBetween(
    positionOf(midFirst),
    tileCenter(spawn, tileSize),
    tileCenter(path[0], tileSize),
    'primer paso',
  );
  expect(positionOf(midFirst).x).toBe(
    (tileCenter(spawn, tileSize).x + tileCenter(path[0], tileSize).x) / 2,
  );
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(2);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  expectCameraFollows(midFirst, 'mitad del primer paso');
  await screenshot(page, 'step-intermediate', testInfo);

  // Siguiente muestreo: el sprite ha avanzado y ya está en el segundo tile.
  const endFirst = await advance(page, HALF_STEP);
  expect(endFirst.animation).toMatchObject({ animating: true, step: 1, totalSteps: 2 });
  expect(positionOf(endFirst)).toMatchObject(tileCenter(path[0], tileSize));
  expect(positionOf(endFirst)).not.toMatchObject(
    tileCenter(path[1], tileSize),
  );
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(1);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('5/6');
  expectCameraFollows(endFirst, 'fin del primer paso');

  // Mitad del segundo paso: avanza de nuevo entre centros contiguos.
  const midSecond = await advance(page, PAUSE + HALF_STEP);
  expectBetween(
    positionOf(midSecond),
    tileCenter(path[0], tileSize),
    tileCenter(path[1], tileSize),
    'segundo paso',
  );
  expect(positionOf(midSecond).x).toBe(
    (tileCenter(path[0], tileSize).x + tileCenter(path[1], tileSize).x) / 2,
  );
  expectCameraFollows(midSecond, 'mitad del segundo paso');

  // Pausa final y entrega del control.
  const finished = await advance(page, HALF_STEP + PAUSE);
  expect(finished.animation).toMatchObject({
    animating: false,
    totalSteps: 0,
    position: null,
  });
  expect(finished.players[0]).toMatchObject({
    x: target.x,
    y: target.y,
    mp: spawn.mp - 2,
  });
  expect(finished.cursor).toMatchObject({
    x: target.x,
    y: target.y,
    visible: true,
    state: 'player',
    path: [],
  });
  expect(finished.camera).toMatchObject(expectedCamera(finished));
  const range = visibleRange(finished);
  expect(finished.cursor.x).toBeGreaterThanOrEqual(range.minX);
  expect(finished.cursor.x).toBeLessThanOrEqual(range.maxX);
  expect(finished.cursor.y).toBeGreaterThanOrEqual(range.minY);
  expect(finished.cursor.y).toBeLessThanOrEqual(range.maxY);
  await expect(page.getByTestId('cursor')).toBeVisible();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('4/6');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();
  await screenshot(page, 'arrival', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('camino largo: recorre todos los tiles, MP progresivo y cámara limitada', async ({
  page,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  const tileSize = start.tileSize;
  const startMp = start.players[0].mp;
  expect(startMp).toBe(6);
  const spawn = start.players[0];

  const target = reachableVisibleTiles(start, {
    minDistance: startMp,
    maxDistance: startMp,
  })[0];
  expect(target, 'Debe existir un destino visible de 6 pasos').toBeDefined();
  await moveCursorTo(page, target.x, target.y);
  const planned = await snapshot(page);
  const path = planned.cursor.path;
  const steps = path.length;
  expect(steps).toBe(6);
  expect(path.at(-1)).toEqual({ x: target.x, y: target.y });
  const finalCenter = tileCenter(path[steps - 1], tileSize);

  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({
    animating: true,
    step: 0,
    totalSteps: steps,
    unitId: 'player-1',
  });
  expect(positionOf(frozen)).toMatchObject(tileCenter(spawn, tileSize));
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(steps);
  await expect(page.getByTestId('hud-player-mp')).toHaveText(`${startMp}/6`);

  let previousCenter = tileCenter(spawn, tileSize);
  for (let index = 0; index < steps; index += 1) {
    const destination = tileCenter(path[index], tileSize);

    const mid = await advance(page, PAUSE + HALF_STEP);
    expect(mid.animation).toMatchObject({
      animating: true,
      step: index,
      totalSteps: steps,
    });
    expectBetween(positionOf(mid), previousCenter, destination, `paso ${index + 1}`);
    expectCameraFollows(mid, `mitad del paso ${index + 1}`);
    await expect(page.getByTestId('cursor')).toBeHidden();
    await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(
      steps - index,
    );
    await expect(page.getByTestId('hud-player-mp')).toHaveText(
      `${startMp - index}/6`,
    );

    const ended = await advance(page, HALF_STEP);
    expect(ended.animation).toMatchObject({
      animating: true,
      step: index + 1,
      totalSteps: steps,
    });
    expect(positionOf(ended)).toMatchObject(destination);
    if (index < steps - 1) {
      // Ningún muestreo intermedio ni de fin de paso cae en el destino final.
      expect(positionOf(ended)).not.toMatchObject(finalCenter);
    }
    expectCameraFollows(ended, `fin del paso ${index + 1}`);
    await expect(page.getByTestId('hud-player-mp')).toHaveText(
      `${startMp - index - 1}/6`,
    );
    previousCenter = destination;
  }

  // La pausa de destino antecede a la entrega del control.
  const finalPause = await snapshot(page);
  expect(finalPause.animation).toMatchObject({ animating: true, step: steps });
  expect(positionOf(finalPause)).toMatchObject(finalCenter);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.getByTestId('hud-player-mp')).toHaveText('0/6');

  const finished = await advance(page, PAUSE);
  expect(finished.animation.animating).toBe(false);
  expect(finished.players[0]).toMatchObject({
    x: target.x,
    y: target.y,
    mp: 0,
  });
  expect(finished.cursor).toMatchObject({
    x: target.x,
    y: target.y,
    visible: true,
    path: [],
  });
  expect(finished.camera).toMatchObject(expectedCamera(finished));
  await expect(page.getByTestId('hud-player-mp')).toHaveText('0/6');
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('cursor')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('la cámara sigue al personaje y no se mueve con el cursor', async ({
  page,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  const tileSize = start.tileSize;
  const spawn = start.players[0];
  expect(start.camera).toMatchObject(expectedCamera(start));

  // El cursor nunca desplaza la cámara, ni siquiera hasta el borde del viewport.
  const range = visibleRange(start);
  await moveCursorTo(page, range.minX, range.minY);
  expect((await snapshot(page)).camera).toMatchObject(start.camera);
  await moveCursorTo(page, range.maxX, range.maxY);
  const edgeCursor = await snapshot(page);
  expect(edgeCursor.camera).toMatchObject(start.camera);
  expect(edgeCursor.cursor).toMatchObject({ x: range.maxX, y: range.maxY });

  // Clamp oeste: se camina a un tile cuya cámara queda en 0 (sin centrar).
  const westTile = reachableVisibleTiles(start, {
    minDistance: 1,
    maxDistance: spawn.mp,
  })
    .filter(
      (tile) =>
        tile.y === spawn.y && tile.x * tileSize + tileSize / 2 <= 208,
    )
    .sort((a, b) => a.distance - b.distance)[0];
  expect(westTile, 'Debe existir un tile visible junto al borde oeste').toBeDefined();
  await walkTo(page, westTile.x, westTile.y);
  const nearWest = await snapshot(page);
  expect(nearWest.camera.x).toBe(0);
  expect(nearWest.camera).toMatchObject(expectedCamera(nearWest));

  const stepWest = reachableVisibleTiles(nearWest, {
    minDistance: 1,
    maxDistance: 1,
  }).find((tile) => tile.y === nearWest.players[0].y && tile.x < nearWest.players[0].x);
  expect(stepWest, 'Debe existir un paso al oeste').toBeDefined();
  await moveCursorTo(page, stepWest!.x, stepWest!.y);
  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({ animating: true, totalSteps: 1 });
  expectCameraFollows(frozen, 'clamp inicio');

  const midClamp = await advance(page, PAUSE + HALF_STEP);
  expectBetween(
    positionOf(midClamp),
    tileCenter(nearWest.players[0], tileSize),
    tileCenter(stepWest!, tileSize),
    'paso al clamp oeste',
  );
  expect(midClamp.animation.camera.x).toBe(0);
  expect(positionOf(midClamp).x).toBe(
    (tileCenter(nearWest.players[0], tileSize).x +
      tileCenter(stepWest!, tileSize).x) /
      2,
  );
  expectCameraFollows(midClamp, 'clamp mitad');

  const atClamp = await advance(page, HALF_STEP + PAUSE);
  expect(atClamp.animation.animating).toBe(false);
  expect(atClamp.players[0]).toMatchObject({ x: stepWest!.x, y: stepWest!.y });
  expect(atClamp.camera.x).toBe(0);
  expect(atClamp.camera).toMatchObject(expectedCamera(atClamp));

  // Fuera del clamp la cámara queda exactamente centrada en el sprite.
  const centeredTarget = reachableVisibleTiles(atClamp, {
    minDistance: 2,
    maxDistance: 2,
  }).find(
    (tile) => tile.y === atClamp.players[0].y && tile.x > atClamp.players[0].x,
  );
  expect(centeredTarget, 'Debe existir un destino centrado al este').toBeDefined();
  await moveCursorTo(page, centeredTarget!.x, centeredTarget!.y);
  await page.keyboard.press('Space');
  const centeredFrozen = await snapshot(page);
  expect(centeredFrozen.animation).toMatchObject({ animating: true, totalSteps: 2 });

  const firstHalf = await advance(page, PAUSE + HALF_STEP);
  expectCameraFollows(firstHalf, 'centrado mitad 1');
  const firstEnd = await advance(page, HALF_STEP);
  expectCameraFollows(firstEnd, 'centrado fin 1');
  const secondHalf = await advance(page, PAUSE + HALF_STEP);
  expectCameraFollows(secondHalf, 'centrado mitad 2');
  const secondEnd = await advance(page, HALF_STEP);
  const centeredCameraX = Math.round(
    (centeredTarget!.x + 0.5) * tileSize - secondEnd.viewport.width / 2,
  );
  expect(secondEnd.animation.camera.x).toBe(centeredCameraX);
  expect(positionOf(secondEnd).x - secondEnd.animation.camera.x).toBe(
    secondEnd.viewport.width / 2,
  );
  expectCameraFollows(secondEnd, 'centrado fin 2');

  const finished = await advance(page, PAUSE);
  expect(finished.animation.animating).toBe(false);
  expect(finished.players[0]).toMatchObject({
    x: centeredTarget!.x,
    y: centeredTarget!.y,
    mp: atClamp.players[0].mp - 2,
  });
  expect(finished.camera).toMatchObject(expectedCamera(finished));
  for (const camera of [start.camera, finished.camera]) {
    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
  }

  expect(consoleErrors).toEqual([]);
});

test('input de juego ignorado durante la animación; F1 y R responden; R cancela', async ({
  page,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  const spawn = start.players[0];
  const target = reachableVisibleTiles(start, {
    minDistance: 2,
    maxDistance: 2,
  })[0];
  expect(target, 'Debe existir un destino visible a dos pasos').toBeDefined();
  await moveCursorTo(page, target.x, target.y);
  await page.keyboard.press('Space');
  const baseline = await snapshot(page);
  expect(baseline.animation).toMatchObject({ animating: true, step: 0, totalSteps: 2 });
  const baselineEvents = JSON.stringify(baseline.lastEvents);
  const baselinePosition = JSON.stringify(baseline.animation.position);
  const baselineHud = {
    mp: await page.getByTestId('hud-player-mp').textContent(),
    action: await page.getByTestId('hud-action').textContent(),
    phase: await page.getByTestId('hud-phase').textContent(),
    turn: await page.getByTestId('hud-turn').textContent(),
  };

  for (const key of [
    'ArrowRight',
    'ArrowDown',
    'w',
    'a',
    's',
    'd',
    'Space',
    'Enter',
    'f',
    'e',
  ]) {
    await page.keyboard.press(key);
    const after = await snapshot(page);
    expect(after.animation, `${key} no arranca otra animación`).toMatchObject({
      animating: true,
      step: 0,
      totalSteps: 2,
    });
    expect(JSON.stringify(after.animation.position), `${key} no mueve el sprite`).toBe(
      baselinePosition,
    );
    expect(after.cursor, `${key} no mueve el cursor`).toMatchObject({
      x: target.x,
      y: target.y,
      visible: false,
    });
    expect(after.cursor.path, `${key} no recalcula el camino`).toHaveLength(2);
    expect(after.turn, `${key} no cambia el turno`).toBe(baseline.turn);
    expect(after.phase, `${key} no cambia la fase`).toBe(baseline.phase);
    expect(after.status, `${key} no cambia el estado`).toBe(baseline.status);
    expect(JSON.stringify(after.lastEvents), `${key} no genera eventos`).toBe(
      baselineEvents,
    );
    expect(await page.getByTestId('hud-player-mp').textContent()).toBe(baselineHud.mp);
    expect(await page.getByTestId('hud-action').textContent()).toBe(
      baselineHud.action,
    );
    expect(await page.getByTestId('hud-phase').textContent()).toBe(
      baselineHud.phase,
    );
    expect(await page.getByTestId('hud-turn').textContent()).toBe(baselineHud.turn);
  }

  // F1 sí responde durante la animación y no la altera.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  expect(JSON.stringify((await snapshot(page)).animation.position)).toBe(
    baselinePosition,
  );
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  // R responde y cancela la animación en curso.
  await page.keyboard.press('r');
  const restarted = await snapshot(page);
  expect(restarted.animation.animating).toBe(false);
  expect(restarted.players[0]).toMatchObject({
    x: spawn.x,
    y: spawn.y,
    mp: 6,
  });
  expect(restarted).toMatchObject({ turn: 1, phase: 'player', status: 'playing' });
  expect(restarted.cursor).toMatchObject({
    x: spawn.x,
    y: spawn.y,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();

  // Terminada la animación, el input vuelve a funcionar.
  const oneStep = reachableVisibleTiles(restarted, {
    minDistance: 1,
    maxDistance: 1,
  })[0];
  expect(oneStep, 'Debe existir un paso visible').toBeDefined();
  await moveCursorTo(page, oneStep.x, oneStep.y);
  await page.keyboard.press('Space');
  const secondMove = await snapshot(page);
  expect(secondMove.animation).toMatchObject({ animating: true, totalSteps: 1 });
  const afterSecond = await settle(page);
  expect(afterSecond.animation.animating).toBe(false);
  expect(afterSecond.players[0]).toMatchObject({
    x: oneStep.x,
    y: oneStep.y,
    mp: 5,
  });
  await expect(page.getByTestId('hud-player-mp')).toHaveText('5/6');
  expect(afterSecond.cursor).toMatchObject({
    x: oneStep.x,
    y: oneStep.y,
    visible: true,
  });

  // F vuelve a responder: sin enemigo bajo el cursor es un aviso, no un comando.
  const beforeF = await snapshot(page);
  await page.keyboard.press('f');
  const afterF = await snapshot(page);
  expect(afterF.players).toEqual(beforeF.players);
  expect(afterF.enemies).toEqual(beforeF.enemies);
  expect(afterF.turn).toBe(beforeF.turn);
  expect(afterF.phase).toBe(beforeF.phase);
  expect(afterF.lastEvents).toEqual(beforeF.lastEvents);
  await expect(page.getByTestId('hud-message')).toHaveText('Enemigo fuera de alcance');
  await expect(page.getByTestId('hud-message')).toBeVisible();

  // E vuelve a responder: termina el turno y la fase enemiga se completa.
  await page.keyboard.press('e');
  const afterEndTurn = await settle(page);
  expect(afterEndTurn).toMatchObject({
    turn: afterSecond.turn + 1,
    phase: 'player',
    status: 'playing',
  });
  expect(afterEndTurn.players[0].actions.remaining).toBe(2);
  expect(afterEndTurn.cursor).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('hud-phase')).toHaveText('Jugador');
  await expect(page.getByTestId('hud-turn')).toHaveText('Turno 2');

  expect(consoleErrors).toEqual([]);
});

test('moverse sobre un enemigo: recorrido, pausa, daño y overlay al terminar', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  // Se conservan el bruto (objetivo, con los PV del bestiario) y enemy-2 (para
  // que la muerte del primero no cierre la partida) con el jugador ya adyacente;
  // así la IA de 4 MP no mata al jugador durante el trayecto y el objetivo
  // aguanta los dos golpes que ensaya el test sin tocar valores del bestiario.
  const base = await snapshot(page);
  const targetEnemy = base.enemies.find((enemy) => enemy.enemyType === 'brute');
  if (!targetEnemy) throw new Error('La partida BSP debe incluir un bruto');
  const beside = floorNeighbor(base, targetEnemy);
  expect(beside, 'El bruto debe tener una casilla libre adyacente').toBeDefined();
  const adjacent = await openBspState(page, SEED, SEED_URL, {
    player: beside!,
    enemies: [targetEnemy, base.enemies[1]],
  });
  await installFreeze(page);
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  await page.keyboard.press('f');
  const afterAttack = await snapshot(page);
  const firstAttack = afterAttack.lastEvents.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'player-1',
  );
  expect(firstAttack).toBeDefined();
  expect(afterAttack.enemies[0].hp).toBe(
    adjacent.enemies[0].hp - firstAttack!.damage,
  );
  expect(afterAttack.players[0].actions.remaining).toBe(1);

  // El beat del ataque descarta la intención siguiente: se completa antes de E.
  await settle(page);
  await page.keyboard.press('e');
  const nextTurn = await settle(page);
  expect(nextTurn.turn).toBe(adjacent.turn + 1);
  expect(nextTurn.players[0].actions.remaining).toBe(2);
  // La presentación del turno anterior ya está completa: no queda cue de
  // ataque ni destello activo que pueda contaminar la captura del recorrido.
  expect((await snapshot(page)).animation.cues).toEqual([]);

  expect(await moveAwayFromEnemy(page)).toBe(true);
  let retreated = await snapshot(page);
  for (let step = 0; step < 3 && Math.max(
    Math.abs(retreated.players[0].x - retreated.enemies[0].x),
    Math.abs(retreated.players[0].y - retreated.enemies[0].y),
  ) < 2; step += 1) {
    expect(await moveAwayFromEnemy(page)).toBe(true);
    retreated = await snapshot(page);
  }
  const distance = Math.max(
    Math.abs(retreated.players[0].x - retreated.enemies[0].x),
    Math.abs(retreated.players[0].y - retreated.enemies[0].y),
  );
  expect(distance).toBeGreaterThanOrEqual(2);
  expect(retreated.enemies[0].hp).toBe(afterAttack.enemies[0].hp);

  await moveCursorTo(page, retreated.enemies[0].x, retreated.enemies[0].y);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({ kind: 'enemy', state: 'enemy' });
  expect(planned.cursor.path.length).toBeGreaterThan(0);
  expect(planned.cursor.path.length).toBeLessThanOrEqual(planned.players[0].mp);
  const steps = planned.cursor.path.length;

  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({
    animating: true,
    step: 0,
    totalSteps: steps,
    unitId: 'player-1',
  });
  // El golpe puede no rematar con las nuevas tiradas, pero quedan más enemigos:
  // la partida sigue en juego y el overlay de victoria no aparece todavía.
  expect(frozen.status).toBe('playing');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${retreated.enemies[0].hp}/${retreated.enemies[0].maxHp}`,
  );

  // Con un solo paso, la mitad del paso cae antes de la pausa de destino.
  const midDelta = steps > 1 ? PAUSE + HALF_STEP : HALF_STEP;
  const mid = await advance(page, midDelta);
  expect(mid.animation).toMatchObject({ animating: true, step: 0 });
  expectCameraFollows(mid, 'acercarse al enemigo');
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${retreated.enemies[0].hp}/${retreated.enemies[0].maxHp}`,
  );
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await screenshot(page, 'attack-approach', testInfo);

  // Pausa de destino: la animación sigue activa y aún no hay daño ni overlay.
  const finalPause = await advance(page, steps > 1 ? HALF_STEP : PAUSE + HALF_STEP);
  expect(finalPause.animation).toMatchObject({ animating: true, step: steps });
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${retreated.enemies[0].hp}/${retreated.enemies[0].maxHp}`,
  );
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();

  // El último tramo dispara embestida, destello y daño en el mismo cue. Se
  // muestrea de forma determinista su pico (60 ms) antes de completar el beat.
  const impact = await page.evaluate(() => {
    const game = window.__game!;
    let snap = game.snapshot();
    for (let guard = 0; guard < 200; guard += 1) {
      if (snap.animation.cues.some((cue) => cue.kind === 'attack')) {
        return game.advance(60);
      }
      if (!snap.animation.animating) {
        throw new Error('La animación terminó antes del cue de ataque');
      }
      snap = game.advance(25);
    }
    throw new Error('No se alcanzó el cue de ataque');
  });
  const attackDamage = frozen.lastEvents.find(
    (event) => event.type === 'AttackPerformed',
  );
  expect(attackDamage).toBeDefined();
  const expectedDamage = `-${attackDamage!.damage}`;
  expect(impact.animation.cues.find((cue) => cue.kind === 'attack')).toMatchObject({
    kind: 'attack',
    hit: true,
  });
  const damageBox = await page.getByTestId('damage-feedback').boundingBox();
  if (!damageBox || damageBox.width === 0 || damageBox.height === 0) {
    throw new Error('El feedback de daño no está visible para la captura');
  }
  await screenshot(page, 'attack-after-walk', testInfo);
  await screenshot(page, 'attack-damage-detail', testInfo, {
    x: Math.max(0, Math.round(damageBox.x) - 70),
    y: Math.max(0, Math.round(damageBox.y) - 50),
    width: 180,
    height: 150,
  });
  await expect(page.getByTestId('damage-feedback')).toHaveText(expectedDamage);
  await expect(page.getByTestId('damage-feedback')).toBeVisible();

  const finished = await advance(page, 1_000_000);
  expect(finished.animation.animating).toBe(false);
  expect(finished.status).toBe('playing');
  expect(finished.enemies[0].hp).toBe(
    Math.max(0, retreated.enemies[0].hp - attackDamage!.damage),
  );
  await expect(page.getByTestId('damage-feedback')).toHaveText(expectedDamage);
  await expect(page.getByTestId('damage-feedback')).toBeVisible();

  const sequenceEvents = [...frozen.lastEvents];
  const cleared = await defeatAllEnemies(page);
  sequenceEvents.push(...cleared.events);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `0/${cleared.snapshot.enemies[0].maxHp}`,
  );
  await expect(page.getByTestId('hud-status')).toHaveText('Victoria');
  await expect(page.getByTestId('cursor')).toBeHidden();
  expect(sequenceEvents.map((event) => event.type)).toEqual(
    expect.arrayContaining(['UnitMoved', 'AttackPerformed', 'UnitDied', 'GameEnded']),
  );

  expect(consoleErrors).toEqual([]);
});

test('fase enemiga: cada enemigo anima y después vuelve el turno del jugador', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  // Dos enemigos alertados: enemy-1 junto al jugador y enemy-2 con la última
  // posición conocida. La fase enemiga tendrá al menos un `UnitMoved` que
  // animar sin depender de un trayecto previo con la IA de 4 MP.
  const base = await snapshot(page);
  const beside = floorNeighbor(base, base.enemies[0]);
  expect(beside, 'Enemy-1 debe tener una casilla libre adyacente').toBeDefined();
  const alerted = (enemy: Snapshot['enemies'][number]): Snapshot['enemies'][number] => ({
    ...enemy,
    awareness: 'alert',
    lastKnown: { x: beside!.x, y: beside!.y },
    hasShouted: true,
  });
  await openBspState(page, SEED, SEED_URL, {
    player: beside!,
    enemies: [alerted(base.enemies[0]), alerted(base.enemies[1])],
  });
  await installFreeze(page);
  expect(await moveAwayFromEnemy(page)).toBe(true);
  const afterRetreat = await snapshot(page);
  await moveCursorTo(
    page,
    afterRetreat.players[0].x,
    afterRetreat.players[0].y,
  );

  const beforeEndTurn = await snapshot(page);
  await page.keyboard.press('e');
  const frozen = await snapshot(page);
  const moves = frozen.lastEvents.flatMap((event) =>
    event.type === 'UnitMoved' ? [event] : [],
  );
  expect(moves.length).toBeGreaterThan(0);
  expect(frozen.animation).toMatchObject({
    animating: true,
    step: 0,
    totalSteps: moves.length,
    unitId: moves[0].unitId,
  });
  expect(positionOf(frozen)).toMatchObject(tileCenter(moves[0].from, frozen.tileSize));
  // El motor ya terminó la fase; la presentación todavía está en Enemigo.
  await expect(page.getByTestId('hud-phase')).toHaveText('Enemigo');
  await expect(page.getByTestId('hud-turn')).toHaveText(`Turno ${beforeEndTurn.turn}`);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);

  const mid = await advance(page, FEEDBACK_CONFIG.beats.enemyPhase + PAUSE + HALF_STEP);
  // El grupo empieza tras el pre-beat de fase; el sprite ya está en tránsito.
  const originCenter = tileCenter(moves[0].from, mid.tileSize);
  expect(positionOf(mid)).not.toEqual(originCenter);
  expectBetween(
    positionOf(mid),
    originCenter,
    tileCenter(moves[0].to, mid.tileSize),
    'paso del enemigo',
  );
  expectCameraFollows(mid, 'fase enemiga');
  await expect(page.getByTestId('hud-phase')).toHaveText('Enemigo');
  await expect(page.getByTestId('hud-turn')).toHaveText(`Turno ${beforeEndTurn.turn}`);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await screenshot(page, 'enemy-phase', testInfo);

  // Pausa de destino: el cursor y el turno del jugador todavía no aparecen.
  const finalPause = await advance(page, HALF_STEP);
  expect(finalPause.animation).toMatchObject({ animating: true, step: 1 });
  await expect(page.getByTestId('hud-phase')).toHaveText('Enemigo');
  await expect(page.getByTestId('hud-turn')).toHaveText(`Turno ${beforeEndTurn.turn}`);
  await expect(page.getByTestId('cursor')).toBeHidden();

  const finished = await advance(page, 1_000_000);
  expect(finished.animation.animating).toBe(false);
  await expect(page.getByTestId('hud-phase')).toHaveText('Jugador');
  await expect(page.getByTestId('hud-turn')).toHaveText(`Turno ${beforeEndTurn.turn + 1}`);
  await expect(page.getByTestId('cursor')).toBeVisible();
  expect(finished.cursor).toMatchObject({
    x: finished.players[0].x,
    y: finished.players[0].y,
    visible: true,
    state: 'player',
  });
  expect(finished.players[0].mp).toBe(finished.players[0].maxMp);

  const eventTypes = finished.lastEvents.map((event) => event.type);
  expect(eventTypes.indexOf('EnemyPhaseStarted')).toBeGreaterThanOrEqual(0);
  expect(eventTypes.indexOf('UnitMoved')).toBeGreaterThan(
    eventTypes.indexOf('EnemyPhaseStarted'),
  );
  expect(eventTypes.indexOf('PlayerTurnStarted')).toBeGreaterThan(
    eventTypes.indexOf('UnitMoved'),
  );

  expect(consoleErrors).toEqual([]);
});

test('reduced motion: movimiento instantáneo con el mismo estado y eventos', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);

  // El destino se deriva del jugador actual: el cursor debe caber en el
  // viewport 13×13 del BSP vigente, sin fijar la geometría histórica.
  const targetOf = (snap: Awaited<ReturnType<typeof snapshot>>) => ({
    x: snap.players[0].x + 1,
    y: snap.players[0].y,
  });

  // Referencia animada: mismo comando y misma semilla.
  await openGame(page);
  const animatedStart = await snapshot(page);
  const animatedTarget = targetOf(animatedStart);
  await moveCursorTo(page, animatedTarget.x, animatedTarget.y);
  await page.keyboard.press('Space');
  const animated = await settle(page);
  expect(animated.animation.animating).toBe(false);
  const animatedHud = {
    mp: await page.getByTestId('hud-player-mp').textContent(),
    cursorVisible: await page.getByTestId('cursor').isVisible(),
  };

  // Misma ejecución con la preferencia de movimiento reducido activa.
  await openGame(page, { reducedMotion: true });
  const instantStart = await snapshot(page);
  const instantTarget = targetOf(instantStart);
  expect(instantTarget).toEqual(animatedTarget);
  await moveCursorTo(page, instantTarget.x, instantTarget.y);
  await page.keyboard.press('Space');
  const instant = await snapshot(page);

  expect(instant.animation).toMatchObject({
    animating: false,
    step: 0,
    totalSteps: 0,
    position: null,
  });
  expect(instant.players).toEqual(animated.players);
  expect(instant.enemies).toEqual(animated.enemies);
  expect(instant.turn).toBe(animated.turn);
  expect(instant.phase).toBe(animated.phase);
  expect(instant.status).toBe(animated.status);
  expect(instant.lastEvents).toEqual(animated.lastEvents);
  expect(instant.cursor).toEqual(animated.cursor);
  await expect(page.getByTestId('hud-player-mp')).toHaveText(animatedHud.mp ?? '');
  await expect(page.getByTestId('cursor')).toBeVisible();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();
  await screenshot(page, 'reduced-motion', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('dos ejecuciones producen el mismo resultado con reloj determinista', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);

  let spawnTile: Position | undefined;
  let pathTiles: readonly Position[] | undefined;
  let tileSize = 32;

  const run = async () => {
    await openGame(page);
    const start = await snapshot(page);
    tileSize = start.tileSize;
    const target = reachableVisibleTiles(start, {
      minDistance: 2,
      maxDistance: 2,
    })[0];
    expect(target, 'Debe existir un destino visible a dos pasos').toBeDefined();
    await moveCursorTo(page, target.x, target.y);
    const planned = await snapshot(page);
    if (!spawnTile) {
      spawnTile = start.players[0];
      pathTiles = planned.cursor.path;
    } else {
      expect(start.players[0]).toMatchObject(spawnTile);
      expect(planned.cursor.path).toEqual(pathTiles);
    }
    await page.keyboard.press('Space');

    const samples = [await presentationSample(page, 'frozen')];
    for (const [label, delta] of [
      ['mitad-1', PAUSE + HALF_STEP],
      ['fin-1', HALF_STEP],
      ['mitad-2', PAUSE + HALF_STEP],
      ['fin-2', HALF_STEP + PAUSE],
    ] as const) {
      await advance(page, delta);
      samples.push(await presentationSample(page, label));
    }

    const final = await snapshot(page);
    return {
      samples,
      final: {
        players: final.players,
        enemies: final.enemies,
        turn: final.turn,
        phase: final.phase,
        status: final.status,
        cursor: final.cursor,
        camera: final.camera,
        lastEvents: final.lastEvents,
      },
    };
  };

  const first = await run();
  const second = await run();

  expect(second).toEqual(first);
  const origin = tileCenter(spawnTile!, tileSize);
  const firstTile = tileCenter(pathTiles![0], tileSize);
  const secondTile = tileCenter(pathTiles![1], tileSize);
  const midpoint = (from: Position, to: Position): Position => ({
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  });
  const sampled = (position: Position) => ({
    ...position,
    tileX: Math.floor(position.x / tileSize),
    tileY: Math.floor(position.y / tileSize),
  });
  expect(first.samples[0].position).toEqual(sampled(origin));
  expect(first.samples[1].position).toEqual(sampled(midpoint(origin, firstTile)));
  expect(first.samples[2].position).toEqual(sampled(firstTile));
  expect(first.samples[3].position).toEqual(sampled(midpoint(firstTile, secondTile)));
  expect(first.samples[4].position).toBeNull();
  expect(first.samples.map((sample) => sample.hudMp)).toEqual([
    '6/6',
    '6/6',
    '5/6',
    '5/6',
    '4/6',
  ]);
  expect(first.samples.map((sample) => sample.dots)).toEqual([2, 2, 1, 1, 0]);

  if (testInfo.repeatEachIndex === 0) {
    const logPath = artifactPath(testInfo, 'logs', 'motion-trace.log');
    await mkdir(dirname(logPath), { recursive: true });
    await writeFile(
      logPath,
      `${JSON.stringify(
        { seed: SEED, config: MOTION_CONFIG, first, second },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await testInfo.attach('motion-trace', {
      path: logPath,
      contentType: 'application/json',
    });
  }

  expect(consoleErrors).toEqual([]);
});
