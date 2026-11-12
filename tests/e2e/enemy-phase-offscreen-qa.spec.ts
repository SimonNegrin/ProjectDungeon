import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import type { GameState, Tile } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  TEST_SEED_URL,
  loadState,
  watchConsole,
} from './perception-fixtures';
import { dispatchFrozen, settle, snapshot } from './support';

const SEED = 279837264;

async function openTestGame(page: Page, reducedMotion = false): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  await page.goto(TEST_SEED_URL);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

/**
 * Estado controlado: mapa cuadrado de suelo, jugador en (1,2) y un único bruto
 * alerta en la columna indicada. El viewport 13×13 con la cámara en (0,0) deja
 * fuera todo tile con x >= 13, así que el recorrido se puede clasificar sin
 * depender de muros del BSP.
 */
function enemyAtColumn(enemyX: number): GameState {
  const base = createInitialState({
    seed: SEED,
    generator: new BspMapGenerator(),
  });
  const { width, height } = base.grid;
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push(border ? 'wall' : 'floor');
    }
  }

  const player = base.players[0];
  const template =
    base.enemies.find((enemy) => enemy.enemyType === 'brute') ?? base.enemies[0];
  return {
    ...base,
    grid: { width, height, tiles },
    players: [
      {
        ...player,
        x: 1,
        y: 2,
        home: { x: 1, y: 2 },
        mp: player.maxMp,
        actions: { ...player.actions, remaining: player.actions.max },
      },
    ],
    enemies: [
      {
        ...template,
        id: 'enemy-1',
        x: enemyX,
        y: 2,
        home: { x: enemyX, y: 2 },
        mp: template.maxMp,
        actions: { ...template.actions, remaining: template.actions.max },
        awareness: 'alert',
        fleeing: false,
        lastKnown: { x: 1, y: 2 },
        alertTurns: 0,
        hasShouted: true,
      },
    ],
  };
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('TASK-0060: enemigo fuera de pantalla usa un beat sin tween ni cámara', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openTestGame(page);
  await loadState(page, enemyAtColumn(18));
  const before = await snapshot(page);
  const camera = { x: before.camera.x, y: before.camera.y };
  expect(camera).toEqual({ x: 0, y: 0 });

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  const moves = result.events.filter((event) => event.type === 'UnitMoved');
  expect(moves).toHaveLength(4);
  expect(moves.every((event) => event.unitId === 'enemy-1')).toBe(true);

  // 400 ms del banner de fase enemiga: empieza el beat colapsado del recorrido.
  await page.evaluate(() => window.__game!.advance(400));
  const atBeat = await snapshot(page);
  expect(atBeat.animation).toMatchObject({
    animating: true,
    step: 0,
    totalSteps: 0,
    unitId: null,
    position: null,
  });
  expect(atBeat.animation.camera).toEqual(camera);
  // El estado final ya está aplicado al inicio del beat.
  expect(atBeat.enemies[0]).toMatchObject({ x: 14, y: 2 });
  await screenshot(page, 'enemigo-fuera-de-pantalla', testInfo);

  const during = await page.evaluate(() => window.__game!.advance(50));
  expect(during.animation.camera).toEqual(camera);
  const finished = await settle(page);
  expect(finished.animation.animating).toBe(false);
  expect({ x: finished.camera.x, y: finished.camera.y }).toEqual(camera);
  expect(consoleErrors).toEqual([]);
});

test('TASK-0060: cruzar el borde anima el recorrido sin mover la cámara', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openTestGame(page);
  await loadState(page, enemyAtColumn(13));
  const before = await snapshot(page);
  const camera = { x: before.camera.x, y: before.camera.y };

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  const moves = result.events.filter((event) => event.type === 'UnitMoved');
  expect(moves).toHaveLength(4);

  // 400 (fase) + 70 (pausa inicial) + 62 (media transición del primer paso):
  // el bruto cruza del tile 13 al 12 mientras la cámara sigue en el jugador.
  await page.evaluate(() => window.__game!.advance(532));
  const mid = await snapshot(page);
  expect(mid.animation).toMatchObject({
    animating: true,
    totalSteps: 4,
    unitId: null,
  });
  expect(mid.animation.camera).toEqual(camera);
  await screenshot(page, 'enemigo-cruce-de-borde', testInfo);

  const finished = await settle(page);
  expect(finished.animation.animating).toBe(false);
  expect({ x: finished.camera.x, y: finished.camera.y }).toEqual(camera);
  expect(finished.enemies[0]).toMatchObject({ x: 9, y: 2 });
  expect(consoleErrors).toEqual([]);
});

test('TASK-0060: el input se bloquea en normal y no en reducido; F1 y R siguen activos', async ({
  page,
}) => {
  // Normal: con la presentación congelada, el cursor y los comandos se
  // descartan, pero F1 abre el debug y R reinicia y cancela la animación.
  await openTestGame(page);
  await loadState(page, enemyAtColumn(18));
  await dispatchFrozen(page, { type: 'EndTurn' });
  const frozen = await snapshot(page);
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).cursor).toEqual(frozen.cursor);

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await page.keyboard.press('R');
  const restarted = await snapshot(page);
  expect(restarted.lastEvents.some((event) => event.type === 'GameRestarted')).toBe(true);
  expect(restarted.animation.animating).toBe(false);
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  // Reducido: el estado final se aplica en el evento y el cursor responde de
  // inmediato. F1 y R también siguen activos y el reinicio no funde.
  await openTestGame(page, true);
  await loadState(page, enemyAtColumn(18));
  await dispatchFrozen(page, { type: 'EndTurn' });
  const reduced = await snapshot(page);
  expect(reduced.animation.animating).toBe(false);
  expect(reduced.enemies[0]).toMatchObject({ x: 14, y: 2 });
  const cursorBefore = reduced.cursor;
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).cursor.x).toBe(cursorBefore.x + 1);

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await page.keyboard.press('R');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
  await expect(page.getByTestId('screen-fade')).toBeHidden();
});
