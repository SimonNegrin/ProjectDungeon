import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { createRoomGrid } from '../../src/game/grid';
import type { GameState } from '../../src/game/types';
import { centerCameraOnTile } from '../../src/host/camera';
import { gridPixelSize, TILE_SIZE } from '../../src/host/geometry';
import { MAP_VIEWPORT } from '../../src/host/layout';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchFrozen,
  openState,
  settle,
  snapshot,
} from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;

/**
 * Un jugador en (5,5), un enemigo alerta adyacente que ataca sin moverse y otro
 * dormido en la esquina que solo espera. Aísla aviso, HUD y salto de esperas.
 */
function enemyPhaseState(): GameState {
  const base = createInitialState({ seed: SEED });
  const { map, ...rest } = base;
  if (!map) throw new Error('El estado inicial debe traer mapa.');
  const player = base.players[0];
  const template = base.enemies[0];
  return {
    ...rest,
    grid: createRoomGrid(20, 20),
    players: [
      {
        ...player,
        x: 5,
        y: 5,
        home: { x: 5, y: 5 },
        hp: player.maxHp,
        mp: player.maxMp,
        actions: { ...player.actions, remaining: player.actions.max },
      },
    ],
    enemies: [
      {
        ...template,
        id: 'enemy-1',
        x: 6,
        y: 5,
        home: { x: 6, y: 5 },
        awareness: 'alert',
        fleeing: false,
        lastKnown: { x: 5, y: 5 },
        alertTurns: 0,
        hasShouted: true,
        mp: template.maxMp,
        actions: { ...template.actions, remaining: template.actions.max },
      },
      {
        ...template,
        id: 'enemy-2',
        x: 18,
        y: 18,
        home: { x: 18, y: 18 },
        awareness: 'dormant',
        fleeing: false,
        lastKnown: null,
        alertTurns: 0,
        hasShouted: false,
        mp: template.maxMp,
        actions: { ...template.actions, remaining: template.actions.max },
      },
    ],
    activePlayerId: player.id,
    phase: 'player',
    round: 1,
    status: 'playing',
  };
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

test('TASK-0152: «El master mueve» solo con acciones y HUD de actor/objetivo', async ({
  page,
}, testInfo) => {
  const state = enemyPhaseState();
  const actor = state.enemies[0];
  const target = state.players[0];

  await openState(page, state);
  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(result.events.some((event) => event.type === 'EnemyPhaseStarted')).toBe(
    true,
  );

  const banner = page.getByTestId('feedback-banner');
  await advanceToCue(page, 'enemy-phase');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('El master mueve');
  await expect(banner).toHaveAttribute('data-banner-kind', 'phase');
  // Antes de que actúe nadie, la ficha izquierda sigue siendo la del activo.
  await expect(page.getByTestId('hud-player-name')).toHaveText(target.nombre);
  await screenshot(page, 'master-mueve', testInfo);

  // Primer ataque: el aviso ya se apagó y el HUD cambia a actor/objetivo.
  await advanceToCue(page, 'attack');
  await expect(banner).toBeHidden();
  const atAttack = await snapshot(page);
  expect(atAttack.enemyActorId).toBe(actor.id);
  expect(atAttack.enemyTargetId).toBe(target.id);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'enemy',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText(actor.nombre);
  await expect(page.getByTestId('hud-player-name')).toHaveText(target.nombre);
  await expect(page.getByTestId('hud-player-position')).toHaveText('—');
  await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();
  await expect(page.getByTestId('hud-stats').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('hud-portrait')).toBeVisible();
  await expect(page.getByTestId('hud-live')).toContainText(actor.nombre);
  await expect(page.getByTestId('hud-live')).toContainText(target.nombre);
  await screenshot(page, 'hud-actor-objetivo', testInfo);

  // La vuelta muestra «Ronda N» y devuelve el HUD a la ficha del jugador.
  await advanceToCue(page, 'player-turn');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Ronda 2');
  await expect(banner).toHaveAttribute('data-banner-kind', 'round');
  await expect(page.getByTestId('hud-player-name')).toHaveText(target.nombre);

  const finished = await settle(page);
  expect(finished.phase).toBe('player');
  expect(finished.round).toBe(2);
  expect(finished.activePlayerId).toBe(target.id);
  const expectedCamera = centerCameraOnTile(
    target,
    MAP_VIEWPORT,
    gridPixelSize(state.grid, TILE_SIZE),
    TILE_SIZE,
  );
  expect({ x: finished.camera.x, y: finished.camera.y }).toEqual(
    expectedCamera,
  );
  await screenshot(page, 'vuelta-ronda-2', testInfo);
});
