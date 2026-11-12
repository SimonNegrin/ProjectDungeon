import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import {
  advanceToCue,
  approachEnemy,
  defeatAllEnemies,
  findVisibleTile,
  moveCursorTo,
  openBspState,
  settle,
} from './support';
import { artifactPath } from './artifacts';

async function snapshot(page: Page) {
  return page.evaluate(() => window.__game!.snapshot());
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
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
  await openBspState(page, 279837264);

  const start = await snapshot(page);
  expect(start.seed).toBe(279837264);
  const startEnemy = start.enemies[0];
  expect(start.players[0]).toMatchObject({
    x: start.spawns!.player.x,
    y: start.spawns!.player.y,
  });

  // HUD inicial y ayuda de teclas.
  await expect(page.getByTestId('hud')).toBeVisible();
  await expectHud(page, {
    playerHp: '20/20',
    playerMp: '6/6',
    action: '2/2',
    phase: 'Jugador',
    enemyHp: `${startEnemy.hp}/${startEnemy.maxHp}`,
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
  await settle(page);
  const afterMoveTo = await snapshot(page);
  expect(afterMoveTo.players[0]).toMatchObject({
    x: initial.players[0].x + 2,
    y: initial.players[0].y,
    mp: initial.players[0].mp - 2,
    actions: { remaining: 2 },
  });
  expect(afterMoveTo.cursor).toMatchObject({
    x: initial.players[0].x + 2,
    y: initial.players[0].y,
  });
  expect(afterMoveTo.camera).not.toEqual(initial.camera);
  expect(
    afterMoveTo.lastEvents.filter((event) => event.type === 'UnitMoved'),
  ).toHaveLength(2);
  await expectHud(page, { playerMp: '4/6', action: '2/2' });

  // R reinicia al estado inicial y recoloca el cursor sobre el jugador.
  await page.keyboard.press('r');
  const afterRestart = await snapshot(page);
  expect(afterRestart).toMatchObject({ status: 'playing', phase: 'player', turn: 1 });
  expect(afterRestart.players[0]).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    hp: 20,
    mp: 6,
    actions: { remaining: 2 },
  });
  expect(afterRestart.cursor).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    state: 'player',
  });
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: '2/2' });

  // Movimiento por destino de 3 pasos hacia el oeste.
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press('a');
  }
  await page.keyboard.press('Space');
  await settle(page);
  const afterLeft = await snapshot(page);
  expect(afterLeft.players[0]).toMatchObject({
    x: initial.players[0].x - 3,
    mp: initial.players[0].mp - 3,
  });
  expect(afterLeft.cursor).toMatchObject({ x: initial.players[0].x - 3 });

  // El cursor puede cruzar el muro, pero Moverse lo rechaza y avisa sin mover.
  const beforeWall = await snapshot(page);
  const wall = findVisibleTile(beforeWall, 'wall');
  await moveCursorTo(page, wall.x, wall.y);
  const cursorOnWall = await snapshot(page);
  expect(cursorOnWall.cursor).toMatchObject({
    x: wall.x,
    y: wall.y,
    state: 'invalid',
    path: [],
  });
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await page.keyboard.press('Space');
  await settle(page);
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
  await expectHud(page, {
    enemyHp: `${startEnemy.hp}/${startEnemy.maxHp}`,
    action: '2/2',
  });

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
  expect(rejected.snapshot.enemies[0].hp).toBe(startEnemy.hp);

  // Preparación determinista del combate con comandos reales. Solo enemy-1:
  // el resto de la guardia, con su MP por tipo, hace inviable la victoria
  // scriptada; las comprobaciones de este test no cambian. La vida ampliada
  // evita que el RNG desplazado por el encadenado mate al enemigo de un golpe
  // antes de la fase enemiga.
  const durableEnemy = { ...startEnemy, hp: 20, maxHp: 20 };
  await openBspState(page, 279837264, undefined, { enemies: [durableEnemy] });
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
  await advanceToCue(page, 'attack');
  expect(
    afterAttack.animation.cues.find((cue) => cue.kind === 'attack'),
  ).toMatchObject({ kind: 'attack', hit: true });
  const playerAttack = afterAttack.lastEvents.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'player-1',
  );
  expect(playerAttack).toBeDefined();
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${playerAttack!.damage}`,
  );
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  expect(afterAttack.enemies[0].hp).toBe(playerAttack!.targetHp);
  expect(afterAttack.players[0].actions.remaining).toBe(1);
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
        damage: playerAttack!.damage,
      }),
    ]),
  );
  // Durante el beat del ataque queda 1/2; el contador no cae a 0 hasta el
  // segundo ataque. Se comprueba en el cue, de forma determinista.
  await expect(page.getByTestId('hud-action')).toHaveText('1/2');
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${playerAttack!.targetHp}/${durableEnemy.maxHp}`,
  );
  await screenshot(page, 'attack', testInfo);

  // E termina el turno, ejecuta la fase enemiga y devuelve el control.
  // El beat del ataque descarta la intención siguiente: se completa antes de E.
  await settle(page);
  const beforeEndTurn = await snapshot(page);
  await page.keyboard.press('e');
  await settle(page);
  const afterEndTurn = await snapshot(page);
  const eventTypes = afterEndTurn.lastEvents.map((event) => event.type);
  expect(eventTypes).toContain('EnemyPhaseStarted');
  expect(eventTypes).toContain('PlayerTurnStarted');
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.turn).toBe(beforeEndTurn.turn + 1);
  const enemyAttacks = afterEndTurn.lastEvents.filter(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'enemy-1',
  );
  expect(enemyAttacks.length).toBeGreaterThan(0);
  // El encadenado gasta todas las acciones del tipo en la fase enemiga.
  expect(enemyAttacks).toHaveLength(beforeEndTurn.enemies[0].actions.max);
  const enemyDamage = enemyAttacks.reduce((total, attack) => total + attack.damage, 0);
  expect(afterEndTurn.players[0]).toMatchObject({
    hp: beforeEndTurn.players[0].hp - enemyDamage,
    mp: 6,
    actions: { remaining: 2 },
  });
  expect(afterEndTurn.enemies[0].actions.remaining).toBe(0);
  expect(afterEndTurn.cursor).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
    state: 'player',
  });
  await expectHud(page, {
    playerHp: `${afterEndTurn.players[0].hp}/20`,
    playerMp: '6/6',
    action: '2/2',
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
  await settle(page);
  const afterFirstKill = await snapshot(page);
  expect(afterFirstKill.enemies[0].hp).toBeLessThan(
    afterEndTurn.enemies[0].hp,
  );
  expect(afterFirstKill.players[0]).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
  });

  if (afterFirstKill.status === 'playing') await defeatAllEnemies(page);
  const victory = await snapshot(page);
  expect(victory.status).toBe('victory');
  expect(victory.enemies.every((enemy) => enemy.hp === 0)).toBe(true);
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
  expect(afterVictoryRestart.players[0]).toMatchObject({
    hp: 20,
    mp: 6,
    x: start.spawns!.player.x,
    y: start.spawns!.player.y,
  });
  expect(afterVictoryRestart.cursor).toMatchObject({
    x: start.spawns!.player.x,
    y: start.spawns!.player.y,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('damage-feedback')).toHaveText('');
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: '2/2' });

  // F1 abre y cierra el overlay de debug sin alterar la partida.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText = await page.getByTestId('debug-content').textContent();
  expect(debugText).toContain(
    `Jugador: (${start.spawns!.player.x}, ${start.spawns!.player.y})`,
  );
  expect(debugText).toContain('MP 6/6');
  expect(debugText).toContain('Fase: Jugador');
  expect(debugText).toContain(
    `Cursor: (${start.spawns!.player.x}, ${start.spawns!.player.y}) jugador`,
  );
  expect(debugText).toContain('Semilla: 279837264');
  expect(debugText).toContain('Salas:');
  expect(debugText).toContain('Huecos:');
  expect(debugText).toContain(
    `Spawns: jugador (${start.spawns!.player.x},${start.spawns!.player.y}) · enemigo (${start.spawns!.enemy.x},${start.spawns!.enemy.y})`,
  );
  expect(debugText).toContain('Pasillos anchos:');
  expect(debugText).toContain('F2 nueva semilla');
  await screenshot(page, 'debug', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
  expect((await snapshot(page)).status).toBe('playing');

  // Derrota determinista: acercarse para que los enemigos despierten y dejar
  // pasar turnos enemigos con dispatch(EndTurn).
  //
  // REQ-027: la réplica del jugador armado mata a los enemigos que fallan y la
  // derrota deja de alcanzarse. Se acota el escenario con el jugador desarmado
  // por el hook de setup (sin tocar reglas): no puede replicar y un centinela
  // alerta adyacente consume sus turnos. El resto del loop no cambia.
  const defeatBase = await snapshot(page);
  const defeatPlayer = defeatBase.players[0];
  const beside = [
    { x: defeatPlayer.x, y: defeatPlayer.y - 1 },
    { x: defeatPlayer.x + 1, y: defeatPlayer.y },
    { x: defeatPlayer.x, y: defeatPlayer.y + 1 },
    { x: defeatPlayer.x - 1, y: defeatPlayer.y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= defeatBase.grid.width || cell.y >= defeatBase.grid.height) {
      return false;
    }
    return (
      defeatBase.grid.tiles[cell.y * defeatBase.grid.width + cell.x] === 'floor'
    );
  });
  expect(beside, 'El jugador debe tener una casilla libre adyacente').toBeDefined();
  const sentinel = defeatBase.enemies[0];
  await openBspState(page, 279837264, undefined, {
    playerEquipment: { ...defeatPlayer.equipment, weaponId: null },
    playerWeapons: [],
    enemies: [
      {
        ...sentinel,
        x: beside!.x,
        y: beside!.y,
        home: { ...beside! },
        mp: sentinel.maxMp,
        actions: { ...sentinel.actions, remaining: sentinel.actions.max },
        awareness: 'alert',
        fleeing: false,
        lastKnown: { x: defeatPlayer.x, y: defeatPlayer.y },
        alertTurns: 0,
        hasShouted: true,
      },
    ],
  });
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
  await settle(page);

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
  expect(afterDefeatRestart.players[0]).toMatchObject({
    hp: 20,
    mp: 6,
    x: start.spawns!.player.x,
    y: start.spawns!.player.y,
  });
  expect(afterDefeatRestart.cursor).toMatchObject({
    x: start.spawns!.player.x,
    y: start.spawns!.player.y,
    visible: true,
    state: 'player',
  });
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();
  await expectHud(page, { playerHp: '20/20', playerMp: '6/6', action: '2/2' });

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
