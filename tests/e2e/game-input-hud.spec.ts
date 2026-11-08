import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { approachEnemy, moveCursorTo } from './support';

const SCREENSHOTS = 'artifacts/TASK-0010/attempt-1/screenshots';

async function snapshot(page: Page) {
  return page.evaluate(() => window.__game!.snapshot());
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = `${SCREENSHOTS}/${name}.png`;
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function expectHud(
  page: Page,
  values: {
    playerHp?: string;
    playerMp?: string;
    action?: string;
    phase?: string;
    enemyHp?: string;
  },
): Promise<void> {
  if (values.playerHp !== undefined) {
    await expect(page.getByTestId('hud-player-hp')).toHaveText(values.playerHp);
  }
  if (values.playerMp !== undefined) {
    await expect(page.getByTestId('hud-player-mp')).toHaveText(values.playerMp);
  }
  if (values.action !== undefined) {
    await expect(page.getByTestId('hud-action')).toHaveText(values.action);
  }
  if (values.phase !== undefined) {
    await expect(page.getByTestId('hud-phase')).toHaveText(values.phase);
  }
  if (values.enemyHp !== undefined) {
    await expect(page.getByTestId('hud-enemy-hp')).toHaveText(values.enemyHp);
  }
}

test('loop completo: teclado, HUD, overlays, feedback, debug y reinicio', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?seed=279837264');
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );

  const start = await snapshot(page);
  expect(start.seed).toBe(279837264);
  expect(start.players[0]).toMatchObject({ x: 6, y: 8 });

  // HUD inicial y ayuda de teclas.
  await expect(page.getByTestId('hud')).toBeVisible();
  await expectHud(page, {
    playerHp: '20/20',
    playerMp: '6/6',
    action: 'Sí',
    phase: 'Jugador',
    enemyHp: '10/10',
  });
  await expect(page.getByTestId('hud-turn')).toHaveText('Turno 1');
  await expect(page.getByTestId('hud-keys')).toContainText('cursor');
  await expect(page.getByTestId('hud-keys')).toContainText('Espacio/Enter moverse');
  await expect(page.getByTestId('hud-keys')).toContainText('F atacar');
  await screenshot(page, 'hud', testInfo);

  // El cursor aparece sobre el jugador en blanco neutro.
  const initial = await snapshot(page);
  expect(initial.cursor).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    visible: true,
    kind: 'player',
    state: 'player',
    path: [],
  });
  await expect(page.getByTestId('cursor')).toBeVisible();
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'player');

  // Flechas/WASD mueven el cursor: no gastan MP, no mueven al jugador ni la cámara.
  await page.keyboard.press('ArrowRight');
  const afterRight = await snapshot(page);
  expect(afterRight.cursor).toMatchObject({
    x: initial.players[0].x + 1,
    y: initial.players[0].y,
    state: 'reachable',
  });
  expect(afterRight.players[0]).toEqual(initial.players[0]);
  expect(afterRight.camera).toEqual(initial.camera);
  await expectHud(page, { playerMp: '6/6' });

  await page.keyboard.press('d');
  const afterD = await snapshot(page);
  expect(afterD.cursor).toMatchObject({
    x: initial.players[0].x + 2,
    y: initial.players[0].y,
  });
  expect(afterD.players[0]).toEqual(initial.players[0]);
  await expectHud(page, { playerMp: '6/6' });

  // Espacio ejecuta Moverse: recorre el camino hasta el cursor y gasta MP.
  await page.keyboard.press('Space');
  const afterMoveTo = await snapshot(page);
  expect(afterMoveTo.players[0]).toMatchObject({
    x: initial.players[0].x + 2,
    y: initial.players[0].y,
    mp: initial.players[0].mp - 2,
    actionAvailable: true,
  });
  expect(afterMoveTo.cursor).toMatchObject({
    x: initial.players[0].x + 2,
    y: initial.players[0].y,
  });
  expect(afterMoveTo.camera).not.toEqual(initial.camera);
  expect(
    afterMoveTo.lastEvents.filter((event) => event.type === 'UnitMoved'),
  ).toHaveLength(2);
  await expectHud(page, { playerMp: '4/6', action: 'Sí' });

  // R reinicia al estado inicial y recoloca el cursor sobre el jugador.
  await page.keyboard.press('r');
  const afterRestart = await snapshot(page);
  expect(afterRestart).toMatchObject({ status: 'playing', phase: 'player', turn: 1 });
  expect(afterRestart.players[0]).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    hp: 20,
    mp: 6,
    actionAvailable: true,
  });
  expect(afterRestart.cursor).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    state: 'player',
  });
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: 'Sí' });

  // Movimiento por destino de 3 pasos hacia el oeste.
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press('a');
  }
  await page.keyboard.press('Space');
  const afterLeft = await snapshot(page);
  expect(afterLeft.players[0]).toMatchObject({
    x: initial.players[0].x - 3,
    mp: initial.players[0].mp - 3,
  });
  expect(afterLeft.cursor).toMatchObject({ x: initial.players[0].x - 3 });

  // El cursor puede cruzar el muro, pero Moverse lo rechaza y avisa sin mover.
  await page.keyboard.press('a');
  const cursorOnWall = await snapshot(page);
  expect(cursorOnWall.cursor).toMatchObject({
    x: initial.players[0].x - 4,
    state: 'invalid',
    path: [],
  });
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await page.keyboard.press('Space');
  const afterWall = await snapshot(page);
  expect(afterWall.players[0]).toMatchObject({
    x: initial.players[0].x - 3,
    mp: initial.players[0].mp - 3,
  });
  expect(afterWall.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'MoveTo', reason: 'wall' },
  ]);
  await expect(page.getByTestId('hud-message')).toHaveText('Destino no válido');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await expectHud(page, { playerMp: '3/6' });
  await page.keyboard.press('r');

  // F sin enemigo bajo el cursor avisa y no rompe el estado ni el HUD.
  const beforeMiss = await snapshot(page);
  await page.keyboard.press('f');
  const afterMiss = await snapshot(page);
  expect(afterMiss.players).toEqual(beforeMiss.players);
  expect(afterMiss.enemies).toEqual(beforeMiss.enemies);
  expect(afterMiss.phase).toBe(beforeMiss.phase);
  expect(afterMiss.turn).toBe(beforeMiss.turn);
  expect(afterMiss.status).toBe(beforeMiss.status);
  await expect(page.getByTestId('hud-message')).toHaveText('Enemigo fuera de alcance');
  await expectHud(page, { enemyHp: '10/10', action: 'Sí' });

  const rejected = await page.evaluate(() =>
    window.__game!.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    }),
  );
  expect(rejected.events).toEqual([
    { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
  ]);
  expect(rejected.snapshot.enemies[0].hp).toBe(10);

  // Preparación determinista del combate con comandos reales.
  await approachEnemy(page);
  const adjacent = await snapshot(page);
  expect(
    Math.max(
      Math.abs(adjacent.players[0].x - adjacent.enemies[0].x),
      Math.abs(adjacent.players[0].y - adjacent.enemies[0].y),
    ),
  ).toBe(1);

  // El cursor selecciona al enemigo y muestra la marca de objetivo.
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  const selectedEnemy = await snapshot(page);
  expect(selectedEnemy.cursor).toMatchObject({
    x: adjacent.enemies[0].x,
    y: adjacent.enemies[0].y,
    kind: 'enemy',
    state: 'enemy',
    path: [],
  });
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'enemy');
  await expect(page.locator('[data-testid="cursor"] .cursor-mark')).toBeVisible();

  // Ataque directo con F: daño, acción usada, feedback y cursor estable.
  await page.keyboard.press('f');
  const afterAttack = await snapshot(page);
  expect(afterAttack.enemies[0].hp).toBe(5);
  expect(afterAttack.players[0].actionAvailable).toBe(false);
  expect(afterAttack.cursor).toMatchObject({
    x: adjacent.enemies[0].x,
    y: adjacent.enemies[0].y,
  });
  expect(afterAttack.lastEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 5,
      }),
    ]),
  );
  await expectHud(page, { enemyHp: '5/10', action: 'No' });
  await expect(page.getByTestId('damage-feedback')).toHaveText('-5');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  await expect(page.getByTestId('attack-flash')).toHaveClass(/is-active/);
  await screenshot(page, 'attack', testInfo);

  // E termina el turno, ejecuta la fase enemiga y devuelve el control.
  const beforeEndTurn = await snapshot(page);
  await page.keyboard.press('e');
  const afterEndTurn = await snapshot(page);
  const eventTypes = afterEndTurn.lastEvents.map((event) => event.type);
  expect(eventTypes).toContain('EnemyPhaseStarted');
  expect(eventTypes).toContain('PlayerTurnStarted');
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.turn).toBe(beforeEndTurn.turn + 1);
  expect(afterEndTurn.lastEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: 'AttackPerformed', attackerId: 'enemy-1', damage: 3 }),
    ]),
  );
  expect(afterEndTurn.players[0]).toMatchObject({
    hp: beforeEndTurn.players[0].hp - 3,
    mp: 6,
    actionAvailable: true,
  });
  expect(afterEndTurn.cursor).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
    state: 'player',
  });
  await expectHud(page, {
    playerHp: `${afterEndTurn.players[0].hp}/20`,
    playerMp: '6/6',
    action: 'Sí',
    phase: 'Jugador',
  });

  // Moverse sobre el enemigo adyacente ataca sin moverse: victoria.
  await moveCursorTo(page, afterEndTurn.enemies[0].x, afterEndTurn.enemies[0].y);
  const beforeVictory = await snapshot(page);
  expect(beforeVictory.players[0]).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
  });
  await page.keyboard.press('Space');
  const victory = await snapshot(page);
  expect(victory.status).toBe('victory');
  expect(victory.enemies[0].hp).toBe(0);
  expect(victory.players[0]).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
  });
  expect(victory.cursor).toMatchObject({
    x: afterEndTurn.enemies[0].x,
    y: afterEndTurn.enemies[0].y,
    visible: false,
  });
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  await expect(
    page.getByTestId('overlay-victory').getByRole('button', { name: 'Reiniciar' }),
  ).toBeVisible();
  await screenshot(page, 'victory', testInfo);

  // R también reinicia desde la victoria y limpia overlay y feedback.
  await page.keyboard.press('r');
  const afterVictoryRestart = await snapshot(page);
  expect(afterVictoryRestart).toMatchObject({ status: 'playing', phase: 'player', turn: 1 });
  expect(afterVictoryRestart.players[0]).toMatchObject({ hp: 20, mp: 6, x: 6, y: 8 });
  expect(afterVictoryRestart.cursor).toMatchObject({ x: 6, y: 8, visible: true, state: 'player' });
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('damage-feedback')).toHaveText('');
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: 'Sí' });

  // F1 abre y cierra el overlay de debug sin alterar la partida.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText = await page.getByTestId('debug-content').textContent();
  expect(debugText).toContain('Jugador: (6, 8)');
  expect(debugText).toContain('MP 6/6');
  expect(debugText).toContain('Fase: Jugador');
  expect(debugText).toContain('Cursor: (6, 8) jugador');
  expect(debugText).toContain('Semilla: 279837264');
  expect(debugText).toContain('Salas:');
  expect(debugText).toContain('Huecos:');
  expect(debugText).toContain('Spawns: jugador (6,8) · enemigo (23,28)');
  expect(debugText).toContain('Pasillos anchos:');
  expect(debugText).toContain('F2 nueva semilla');
  await screenshot(page, 'debug', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
  expect((await snapshot(page)).status).toBe('playing');

  // Derrota determinista: dejar pasar turnos enemigos con dispatch(EndTurn).
  let defeatReached = false;
  for (let turn = 0; turn < 80; turn += 1) {
    const status = await page.evaluate(() => {
      const game = window.__game!;
      if (game.snapshot().status !== 'playing') return game.snapshot().status;
      game.dispatch({ type: 'EndTurn' });
      return game.snapshot().status;
    });

    if (status !== 'playing') {
      defeatReached = true;
      break;
    }
  }
  expect(defeatReached, 'La derrota debe alcanzarse en 80 turnos enemigos').toBe(true);

  const defeat = await snapshot(page);
  expect(defeat.status).toBe('defeat');
  expect(defeat.players[0].hp).toBe(0);
  expect(defeat.cursor.visible).toBe(false);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('overlay-defeat')).toBeVisible();
  await expectHud(page, { playerHp: '0/20' });
  await screenshot(page, 'defeat', testInfo);

  // El botón del overlay de derrota también reinicia.
  await page
    .getByTestId('overlay-defeat')
    .getByRole('button', { name: 'Reiniciar' })
    .click();
  const afterDefeatRestart = await snapshot(page);
  expect(afterDefeatRestart).toMatchObject({ status: 'playing', phase: 'player', turn: 1 });
  expect(afterDefeatRestart.players[0]).toMatchObject({ hp: 20, mp: 6, x: 6, y: 8 });
  expect(afterDefeatRestart.cursor).toMatchObject({ x: 6, y: 8, visible: true, state: 'player' });
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: 'Sí' });

  // F2 genera una semilla nueva y regenera el mapa sin cerrar el debug.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const beforeSeed = (await snapshot(page)).seed;
  await page.keyboard.press('F2');
  const afterF2 = await snapshot(page);
  expect(afterF2.seed).not.toBe(beforeSeed);
  expect(afterF2.turn).toBe(1);
  expect(afterF2.status).toBe('playing');
  expect(afterF2.cursor).toMatchObject({
    x: afterF2.spawns!.player.x,
    y: afterF2.spawns!.player.y,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const afterF2Debug = await page.getByTestId('debug-content').textContent();
  expect(afterF2Debug).toContain(`Semilla: ${afterF2.seed}`);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
