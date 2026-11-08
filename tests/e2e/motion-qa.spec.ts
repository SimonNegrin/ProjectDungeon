import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { MOTION_CONFIG } from '../../src/host/motion';
import {
  approachEnemy,
  defeatAllEnemies,
  ensureAdjacentWithMp,
  moveAwayFromEnemy,
  moveCursorTo,
  settle,
  snapshot,
  visibleRange,
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
  await page.goto(SEED_URL);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
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
  expect(start.players[0]).toMatchObject({ x: 6, y: 8, mp: 6 });
  expect(start.camera).toMatchObject({ x: 0, y: 64 });
  const tileSize = start.tileSize;

  await moveCursorTo(page, 8, 8);
  const planned = await snapshot(page);
  expect(planned.cursor.path).toEqual([
    { x: 7, y: 8 },
    { x: 8, y: 8 },
  ]);

  // La tecla arranca la animación y el listener de test la congela en 0 ms.
  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({ animating: true, step: 0, totalSteps: 2 });
  expect(positionOf(frozen)).toMatchObject(tileCenter({ x: 6, y: 8 }, tileSize));
  expect(frozen.cursor).toMatchObject({ x: 8, y: 8, visible: false });
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(2);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  expectCameraFollows(frozen, 'inicio');

  // Mitad del primer paso: el sprite está entre los centros (6,8) y (7,8).
  const midFirst = await advance(page, PAUSE + HALF_STEP);
  expect(midFirst.animation).toMatchObject({ animating: true, step: 0, totalSteps: 2 });
  expectBetween(
    positionOf(midFirst),
    tileCenter({ x: 6, y: 8 }, tileSize),
    tileCenter({ x: 7, y: 8 }, tileSize),
    'primer paso',
  );
  expect(positionOf(midFirst).x).toBe(224);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(2);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  expectCameraFollows(midFirst, 'mitad del primer paso');
  await screenshot(page, 'step-intermediate', testInfo);

  // Siguiente muestreo: el sprite ha avanzado y ya está en el segundo tile.
  const endFirst = await advance(page, HALF_STEP);
  expect(endFirst.animation).toMatchObject({ animating: true, step: 1, totalSteps: 2 });
  expect(positionOf(endFirst)).toMatchObject(tileCenter({ x: 7, y: 8 }, tileSize));
  expect(positionOf(endFirst).x).toBeGreaterThan(positionOf(midFirst).x);
  expect(positionOf(endFirst)).not.toMatchObject(
    tileCenter({ x: 8, y: 8 }, tileSize),
  );
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(1);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('5/6');
  expectCameraFollows(endFirst, 'fin del primer paso');

  // Mitad del segundo paso: avanza de nuevo entre centros contiguos.
  const midSecond = await advance(page, PAUSE + HALF_STEP);
  expectBetween(
    positionOf(midSecond),
    tileCenter({ x: 7, y: 8 }, tileSize),
    tileCenter({ x: 8, y: 8 }, tileSize),
    'segundo paso',
  );
  expect(positionOf(midSecond).x).toBe(256);
  expectCameraFollows(midSecond, 'mitad del segundo paso');

  // Pausa final y entrega del control.
  const finished = await advance(page, HALF_STEP + PAUSE);
  expect(finished.animation).toMatchObject({
    animating: false,
    totalSteps: 0,
    position: null,
  });
  expect(finished.players[0]).toMatchObject({ x: 8, y: 8, mp: 4 });
  expect(finished.cursor).toMatchObject({
    x: 8,
    y: 8,
    visible: true,
    state: 'player',
    path: [],
  });
  expect(finished.camera).toMatchObject({ x: 64, y: 64 });
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

  await moveCursorTo(page, 4, 2);
  const planned = await snapshot(page);
  expect(planned.cursor.path).toEqual([
    { x: 6, y: 7 },
    { x: 6, y: 6 },
    { x: 5, y: 5 },
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 4, y: 2 },
  ]);
  const path = planned.cursor.path;
  const steps = path.length;
  expect(steps).toBe(6);
  const finalCenter = tileCenter(path[steps - 1], tileSize);

  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({
    animating: true,
    step: 0,
    totalSteps: steps,
    unitId: 'player-1',
  });
  expect(positionOf(frozen)).toMatchObject(tileCenter({ x: 6, y: 8 }, tileSize));
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(steps);
  await expect(page.getByTestId('hud-player-mp')).toHaveText(`${startMp}/6`);

  let previousCenter = tileCenter({ x: 6, y: 8 }, tileSize);
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
  expect(finished.players[0]).toMatchObject({ x: 4, y: 2, mp: 0 });
  expect(finished.cursor).toMatchObject({
    x: 4,
    y: 2,
    visible: true,
    path: [],
  });
  expect(finished.camera).toMatchObject({ x: 0, y: 0 });
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
  expect(start.camera).toMatchObject({ x: 0, y: 64 });

  // El cursor nunca desplaza la cámara, ni siquiera hasta el borde del viewport.
  await moveCursorTo(page, 11, 7);
  expect((await snapshot(page)).camera).toMatchObject({ x: 0, y: 64 });
  await moveCursorTo(page, 12, 14);
  const edgeCursor = await snapshot(page);
  expect(edgeCursor.camera).toMatchObject({ x: 0, y: 64 });
  expect(edgeCursor.cursor).toMatchObject({ x: 12, y: 14 });

  // Clamp oeste: (5,8) queda pegado al borde y el sprite no puede centrarse.
  await moveCursorTo(page, 5, 8);
  await page.keyboard.press('Space');
  const frozen = await snapshot(page);
  expect(frozen.animation).toMatchObject({ animating: true, totalSteps: 1 });
  expectCameraFollows(frozen, 'clamp inicio');

  const midClamp = await advance(page, PAUSE + HALF_STEP);
  expectBetween(
    positionOf(midClamp),
    tileCenter({ x: 6, y: 8 }, tileSize),
    tileCenter({ x: 5, y: 8 }, tileSize),
    'paso al clamp oeste',
  );
  expect(midClamp.animation.camera.x).toBe(0);
  expect(positionOf(midClamp).x - midClamp.animation.camera.x).toBe(192);
  expectCameraFollows(midClamp, 'clamp mitad');

  const atClamp = await advance(page, HALF_STEP + PAUSE);
  expect(atClamp.animation.animating).toBe(false);
  expect(atClamp.players[0]).toMatchObject({ x: 5, y: 8 });
  // Centro del tile (5,8) en píxeles de mundo; con cámara 0 queda a 176 px.
  expect(tileCenter({ x: 5, y: 8 }, tileSize).x).toBe(176);
  expect(atClamp.camera).toMatchObject({ x: 0, y: 64 });

  // Fuera del clamp la cámara queda exactamente centrada en el sprite.
  await moveCursorTo(page, 7, 8);
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
  expect(secondEnd.animation.camera.x).toBe(32);
  expect(positionOf(secondEnd).x - secondEnd.animation.camera.x).toBe(
    secondEnd.viewport.width / 2,
  );
  expectCameraFollows(secondEnd, 'centrado fin 2');

  const finished = await advance(page, PAUSE);
  expect(finished.animation.animating).toBe(false);
  expect(finished.players[0]).toMatchObject({ x: 7, y: 8, mp: 3 });
  expect(finished.camera).toMatchObject({ x: 32, y: 64 });
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

  await moveCursorTo(page, 8, 8);
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
      x: 8,
      y: 8,
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
  expect(restarted.players[0]).toMatchObject({ x: 6, y: 8, mp: 6 });
  expect(restarted).toMatchObject({ turn: 1, phase: 'player', status: 'playing' });
  expect(restarted.cursor).toMatchObject({
    x: 6,
    y: 8,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();

  // Terminada la animación, el input vuelve a funcionar.
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).cursor).toMatchObject({ x: 7, y: 8 });
  await page.keyboard.press('Space');
  const secondMove = await snapshot(page);
  expect(secondMove.animation).toMatchObject({ animating: true, totalSteps: 1 });
  const afterSecond = await settle(page);
  expect(afterSecond.animation.animating).toBe(false);
  expect(afterSecond.players[0]).toMatchObject({ x: 7, y: 8, mp: 5 });
  await expect(page.getByTestId('hud-player-mp')).toHaveText('5/6');
  expect(afterSecond.cursor).toMatchObject({ x: 7, y: 8, visible: true });

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
  expect(afterEndTurn).toMatchObject({ turn: 2, phase: 'player', status: 'playing' });
  expect(afterEndTurn.players[0].actionAvailable).toBe(true);
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
  await approachEnemy(page);
  await ensureAdjacentWithMp(page, 2);

  const adjacent = await snapshot(page);
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  await page.keyboard.press('f');
  const afterAttack = await snapshot(page);
  expect(afterAttack.enemies[0].hp).toBe(8);
  expect(afterAttack.players[0].actionAvailable).toBe(false);

  await page.keyboard.press('e');
  const nextTurn = await settle(page);
  expect(nextTurn.turn).toBe(adjacent.turn + 1);
  expect(nextTurn.players[0].actionAvailable).toBe(true);
  // Espera semántica a que el feedback real del turno anterior se apague para
  // que la captura del recorrido no muestre daño ajeno a la animación.
  await expect(page.getByTestId('damage-feedback')).not.toHaveClass(/is-active/, {
    timeout: 3000,
  });
  await expect(page.getByTestId('attack-flash')).not.toHaveClass(/is-active/, {
    timeout: 3000,
  });

  expect(await moveAwayFromEnemy(page)).toBe(true);
  const retreated = await snapshot(page);
  const distance = Math.max(
    Math.abs(retreated.players[0].x - retreated.enemies[0].x),
    Math.abs(retreated.players[0].y - retreated.enemies[0].y),
  );
  expect(distance).toBe(2);
  expect(retreated.enemies[0].hp).toBe(8);

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
  // El enemigo muere, pero quedan más enemigos: la partida sigue en juego y el
  // overlay de victoria no aparece todavía.
  expect(frozen.status).toBe('playing');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText('9/9');

  const mid = await advance(page, PAUSE + HALF_STEP);
  expect(mid.animation).toMatchObject({ animating: true, step: 0 });
  expectCameraFollows(mid, 'acercarse al enemigo');
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText('9/9');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await screenshot(page, 'attack-approach', testInfo);

  // Pausa de destino: la animación sigue activa y aún no hay daño ni overlay.
  const finalPause = await advance(page, HALF_STEP);
  expect(finalPause.animation).toMatchObject({ animating: true, step: steps });
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText('9/9');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('cursor')).toBeHidden();

  // El último tramo dispara flash y daño en el mismo instante del reloj.
  const finished = await page.evaluate((delta) => {
    const snap = window.__game!.advance(delta);
    const flash = document.querySelector('[data-testid="attack-flash"]');
    const damage = document.querySelector('[data-testid="damage-feedback"]');
    return {
      animating: snap.animation.animating,
      status: snap.status,
      enemyHp: snap.enemies[0].hp,
      flashActive: flash?.classList.contains('is-active') ?? false,
      damage: damage?.textContent ?? '',
    };
  }, PAUSE);
  const attackDamage = frozen.lastEvents.find(
    (event) => event.type === 'AttackPerformed',
  );
  expect(attackDamage).toBeDefined();
  const expectedDamage = `-${attackDamage!.damage}`;

  expect(finished).toMatchObject({
    animating: false,
    status: 'playing',
    enemyHp: 0,
    flashActive: true,
    damage: expectedDamage,
  });
  // El daño se dibuja mientras la partida sigue y su animación CSS lo desvanece
  // en 900 ms. Se espera al pico de opacidad y se pausan las animaciones.
  await page.waitForFunction(
    () => {
      const damage = document.querySelector('[data-testid="damage-feedback"]');
      return damage !== null && Number(getComputedStyle(damage).opacity) > 0.9;
    },
    undefined,
    { timeout: 1000 },
  );
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.pause();
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

  const sequenceEvents = [...frozen.lastEvents];
  const cleared = await defeatAllEnemies(page);
  sequenceEvents.push(...cleared.events);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText('0/9');
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
  // Despierta a los enemigos cercanos con comandos reales: un centinela
  // dormido no se mueve y la fase enemiga no tendría animación que probar.
  await approachEnemy(page, 'north');
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

  const mid = await advance(page, PAUSE + HALF_STEP);
  expectBetween(
    positionOf(mid),
    tileCenter(moves[0].from, mid.tileSize),
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

  // Referencia animada: mismo comando y misma semilla.
  await openGame(page);
  await moveCursorTo(page, 8, 8);
  await page.keyboard.press('Space');
  const animated = await settle(page);
  expect(animated.animation.animating).toBe(false);
  const animatedHud = {
    mp: await page.getByTestId('hud-player-mp').textContent(),
    cursorVisible: await page.getByTestId('cursor').isVisible(),
  };

  // Misma ejecución con la preferencia de movimiento reducido activa.
  await openGame(page, { reducedMotion: true });
  await moveCursorTo(page, 8, 8);
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

  const run = async () => {
    await openGame(page);
    await moveCursorTo(page, 8, 8);
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
  expect(first.samples.map((sample) => sample.position)).toEqual([
    { x: 208, y: 272, tileX: 6, tileY: 8 },
    { x: 224, y: 272, tileX: 7, tileY: 8 },
    { x: 240, y: 272, tileX: 7, tileY: 8 },
    { x: 256, y: 272, tileX: 8, tileY: 8 },
    null,
  ]);
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
