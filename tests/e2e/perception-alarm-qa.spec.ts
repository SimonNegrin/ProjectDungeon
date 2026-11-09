import { expect, test, type Page } from '@playwright/test';
import { BESTIARY } from '../../src/game/bestiary';
import { canSee, hasLineOfSight } from '../../src/game/perception';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import {
  NORMAL_SEED_URL,
  REFERENCE_SEED,
  TEST_SEED_URL,
  damageAlarmState,
  detectionState,
  loadState,
  openGame,
  referenceState,
  screenshot,
  watchConsole,
} from './perception-fixtures';
import { moveCursorTo, settle, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

function eventTypes(events: readonly GameEvent[]): string[] {
  return events.map((event) => event.type);
}

function enemyOf(snap: GameSnapshot, id: string) {
  const enemy = snap.enemies.find((candidate) => candidate.id === id);
  if (!enemy) throw new Error(`Falta ${id} en el snapshot`);
  return enemy;
}

function roomAt(snap: GameSnapshot, x: number, y: number) {
  return snap.rooms.find(
    (room) =>
      x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height,
  );
}

async function box(page: Page, testId: string) {
  const value = await page.getByTestId(testId).boundingBox();
  if (!value) throw new Error(`Falta caja para ${testId}`);
  return value;
}

test('TASK-0039: detección por paso, "!", aviso, F1 y enfriamiento', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, detectionState());

  expect(initial.seed).toBe(REFERENCE_SEED);
  expect(initial.enemies.every((enemy) => enemy.awareness === 'dormant')).toBe(true);
  await expect(page.getByTestId('perception-overlay')).toBeHidden();
  expect(
    await page.locator('[data-testid="debug-perception-radius"]').count(),
  ).toBe(0);
  await screenshot(page, testInfo, 'normal');

  // R-003: sin visión, un turno completo no mueve ni despierta a nadie.
  await page.keyboard.press('e');
  await settle(page);
  const idle = await snapshot(page);
  expect(idle.turn).toBe(2);
  expect(
    idle.enemies.map((enemy) => ({
      id: enemy.id,
      x: enemy.x,
      y: enemy.y,
      awareness: enemy.awareness,
    })),
  ).toEqual(
    initial.enemies.map((enemy) => ({
      id: enemy.id,
      x: enemy.x,
      y: enemy.y,
      awareness: enemy.awareness,
    })),
  );
  expect(
    idle.lastEvents.filter((event) => event.type === 'EnemyWaited'),
  ).toHaveLength(4);
  expect(idle.lastEvents.some((event) => event.type === 'UnitMoved')).toBe(false);

  // R-004/R-011: el `MoveTo` cruza la vista en (3,2) y termina en (4,2), fuera
  // de la línea de visión del bruto (Bresenham desde el observador).
  await moveCursorTo(page, 4, 2);
  await page.keyboard.press('Enter');
  const immediate = await page.evaluate(() => {
    const message = document.querySelector<HTMLElement>(
      '[data-testid="hud-message"]',
    );
    return {
      events: window.__game!.snapshot().lastEvents.map((event) => event.type),
      markers: document.querySelectorAll('[data-testid="spot-marker"]').length,
      message: message?.textContent ?? '',
      messageHidden: message?.hidden ?? true,
    };
  });
  expect(immediate.events).toEqual([
    'UnitMoved',
    'UnitMoved',
    'EnemySpotted',
    'AlarmRaised',
    'UnitMoved',
  ]);
  expect(immediate.markers).toBe(0);
  expect(immediate.message).toBe('¡Alarma! Te han visto');
  expect(immediate.messageHidden).toBe(false);

  // R-011/R-012: el aviso vive dentro del HUD y no tapa el marco del mapa.
  const hudBox = await box(page, 'hud');
  const messageBox = await box(page, 'hud-message');
  const frameBox = await box(page, 'frame');
  expect(messageBox.y + messageBox.height).toBeLessThanOrEqual(
    hudBox.y + hudBox.height + 1,
  );
  expect(messageBox.y + messageBox.height).toBeLessThanOrEqual(frameBox.y + 1);
  expect(hudBox.y + hudBox.height).toBeLessThanOrEqual(frameBox.y + 1);
  await screenshot(page, testInfo, 'deteccion-paso');

  await settle(page);
  const detected = await snapshot(page);
  expect(detected.players[0]).toMatchObject({ x: 4, y: 2, mp: 3 });
  // El paso que detecta es (3,2); el destino (4,2) ya no tiene LOS desde el
  // bruto (la línea desde el observador cruza el muro de (5,3)).
  expect(
    hasLineOfSight(
      detected.grid,
      { x: 5, y: 4 },
      { x: detected.players[0].x, y: detected.players[0].y },
    ),
  ).toBe(false);
  expect(enemyOf(detected, 'enemy-3')).toMatchObject({
    awareness: 'alert',
    lastKnown: { x: 3, y: 2 },
    hasShouted: true,
  });
  const marker = page.locator(
    '[data-testid="spot-marker"][data-unit-id="enemy-3"]',
  );
  await expect(marker).toBeVisible();
  await expect(marker).toHaveText('!');
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(1);
  expect(
    await page.locator('[data-testid="debug-perception-radius"]').count(),
  ).toBe(0);
  await screenshot(page, testInfo, 'deteccion-alerta');

  // R-011: radios solo con F1; sin F1 no hay overlay ni círculos.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await expect(page.getByTestId('perception-overlay')).toBeVisible();
  const radii = await page
    .locator('[data-testid="debug-perception-radius"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        unitId: (node as HTMLElement).dataset.unitId,
        kind: (node as HTMLElement).dataset.kind,
        radius: Number((node as HTMLElement).dataset.radius),
      })),
    );
  expect(radii).toHaveLength(initial.enemies.length * 2);
  expect(radii.filter((entry) => entry.kind === 'vision')).toEqual(
    initial.enemies.map((enemy) => ({
      unitId: enemy.id,
      kind: 'vision',
      radius: BESTIARY[enemy.enemyType!].vision,
    })),
  );
  expect(radii.filter((entry) => entry.kind === 'alarm')).toEqual(
    initial.enemies.map((enemy) => ({
      unitId: enemy.id,
      kind: 'alarm',
      radius: BESTIARY[enemy.enemyType!].alarm,
    })),
  );
  await screenshot(page, testInfo, 'debug-f1');
  await page.keyboard.press('F1');
  await expect(page.getByTestId('perception-overlay')).toBeHidden();
  expect(
    await page.locator('[data-testid="debug-perception-radius"]').count(),
  ).toBe(0);

  // T-003: snapshot de solo lectura y hook de setup únicamente con test=1.
  const readonly = await page.evaluate(() => {
    const api = window.__game!;
    const fresh = api.snapshot();
    const enemy = fresh.enemies.find((candidate) => candidate.id === 'enemy-3')!;
    const home = { ...enemy.home };
    const lastKnown = enemy.lastKnown ? { ...enemy.lastKnown } : null;
    (enemy.home as { x: number }).x = 9999;
    if (enemy.lastKnown) (enemy.lastKnown as { x: number }).x = 9999;
    const after = api
      .snapshot()
      .enemies.find((candidate) => candidate.id === 'enemy-3')!;
    return {
      keys: Object.keys(api).sort(),
      home,
      lastKnown,
      afterHome: after.home,
      afterLastKnown: after.lastKnown,
    };
  });
  expect(readonly.keys).toEqual(['advance', 'dispatch', 'setup', 'snapshot']);
  expect(readonly.afterHome).toEqual(readonly.home);
  expect(readonly.afterLastKnown).toEqual(readonly.lastKnown);

  // R-005/R-007: dos fases investigando, la tercera vuelve y la cuarta duerme.
  const phases: string[] = [];
  for (let phase = 1; phase <= 4; phase += 1) {
    await page.keyboard.press('e');
    await settle(page);
    const snap = await snapshot(page);
    const brute = enemyOf(snap, 'enemy-3');
    phases.push(brute.awareness);
    if (phase <= 2) {
      expect(brute).toMatchObject({ awareness: 'alert', alertTurns: phase });
    } else if (phase === 3) {
      expect(brute.awareness).toBe('returning');
      await expect(page.locator('[data-testid="spot-marker"]')).toHaveCount(0);
    } else {
      expect(brute).toMatchObject({
        awareness: 'dormant',
        alertTurns: 0,
        lastKnown: null,
        hasShouted: false,
        x: 5,
        y: 4,
      });
      expect(eventTypes(snap.lastEvents)).toContain('EnemyReturned');
    }
    expect(snap.players[0]).toMatchObject({ x: 4, y: 2, hp: 20 });
  }
  expect(phases).toEqual(['alert', 'alert', 'returning', 'dormant']);
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(0);
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });
  expect(consoleErrors).toEqual([]);
});

test('TASK-0039: el daño despierta, guarda al atacante y alarma 5 sin cadena', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, damageAlarmState());
  const bruteBefore = enemyOf(initial, 'enemy-3');

  // R-008: atacar a un dormido desde fuera de su visión lo despierta.
  await moveCursorTo(page, 1, 2);
  await page.keyboard.press('f');
  await settle(page);
  const attacked = await snapshot(page);
  const attack = attacked.lastEvents.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  expect(attack!.targetHp).toBeLessThan(bruteBefore.hp);
  expect(eventTypes(attacked.lastEvents)).not.toContain('EnemySpotted');
  expect(
    attacked.lastEvents.filter((event) => event.type === 'AlarmRaised'),
  ).toHaveLength(1);

  expect(enemyOf(attacked, 'enemy-3')).toMatchObject({
    awareness: 'alert',
    lastKnown: { x: 2, y: 2 },
    hasShouted: true,
  });
  // R-006: a 5 tiles tras un muro sí; a 6 no; el receptor no encadena la onda.
  expect(enemyOf(attacked, 'enemy-1')).toMatchObject({
    awareness: 'alert',
    lastKnown: { x: 2, y: 2 },
    hasShouted: true,
  });
  expect(enemyOf(attacked, 'enemy-2')).toMatchObject({
    awareness: 'dormant',
    lastKnown: null,
  });
  expect(enemyOf(attacked, 'enemy-4').awareness).toBe('dormant');
  // El receptor a 5 está tras un muro (la onda no necesita LOS) y el de 6 queda
  // fuera. Un daño sin `EnemySpotted` no muestra "!" (R-012).
  const emitter = enemyOf(attacked, 'enemy-3');
  const atFive = enemyOf(attacked, 'enemy-1');
  const atSix = enemyOf(attacked, 'enemy-2');
  expect(
    Math.max(
      Math.abs(emitter.x - atFive.x),
      Math.abs(emitter.y - atFive.y),
    ),
  ).toBe(BESTIARY.brute.alarm);
  expect(hasLineOfSight(attacked.grid, emitter, atFive)).toBe(false);
  expect(
    Math.max(
      Math.abs(emitter.x - atSix.x),
      Math.abs(emitter.y - atSix.y),
    ),
  ).toBe(BESTIARY.brute.alarm + 1);
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(0);
  await screenshot(page, testInfo, 'alarma-aviso');

  await page.keyboard.press('e');
  await settle(page);
  const afterTurn = await snapshot(page);
  const dormantBefore = enemyOf(initial, 'enemy-2');
  expect(enemyOf(afterTurn, 'enemy-2')).toMatchObject({
    awareness: 'dormant',
    x: dormantBefore.x,
    y: dormantBefore.y,
  });
  expect(enemyOf(afterTurn, 'enemy-1').awareness).toBe('alert');
  expect(
    afterTurn.lastEvents.filter((event) => event.type === 'AlarmRaised'),
  ).toHaveLength(0);
  expect(consoleErrors).toEqual([]);
});

test('TASK-0039: semilla de referencia, R-010 y determinismo', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, NORMAL_SEED_URL);

  // Juego normal conserva exactamente las claves históricas de `__game`.
  const normalKeys = await page.evaluate(() => Object.keys(window.__game!).sort());
  expect(normalKeys).toEqual(['advance', 'dispatch', 'snapshot']);

  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, referenceState());

  expect(initial.seed).toBe(REFERENCE_SEED);
  expect(
    initial.enemies.map((enemy) => ({ id: enemy.id, type: enemy.enemyType })),
  ).toEqual([
    { id: 'enemy-1', type: 'sentinel' },
    { id: 'enemy-2', type: 'sentinel' },
    { id: 'enemy-3', type: 'brute' },
    { id: 'enemy-4', type: 'coward' },
  ]);
  expect(initial.enemies.every((enemy) => enemy.awareness === 'dormant')).toBe(
    true,
  );
  // R-010: ningún enemigo ve al jugador al inicio. `canSee` usa el radio de
  // BESTIARY y la línea de visión del mapa; los cuatro deben dar false.
  for (const enemy of initial.enemies) {
    expect(enemy.enemyType).not.toBeNull();
    expect(BESTIARY[enemy.enemyType!].vision).toBeGreaterThan(0);
    expect(
      canSee(initial.grid, enemy, initial.players[0]),
      `${enemy.id} no debe ver al jugador al inicio`,
    ).toBe(false);
  }
  const rooms = initial.enemies.map((enemy) => roomAt(initial, enemy.x, enemy.y));
  expect(rooms.every((room) => room !== undefined)).toBe(true);
  expect(new Set(rooms.map((room) => room!.id)).size).toBe(4);

  const distance = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const pairs = initial.enemies.flatMap((first, index) =>
    initial.enemies.slice(index + 1).map((second) => ({
      pair: `${first.id}/${second.id}`,
      distance: distance(first, second),
    })),
  );
  const alarmRadius = Math.min(
    ...initial.enemies.map((enemy) => BESTIARY[enemy.enemyType!].alarm),
  );
  const openPairs = pairs.filter((entry) => entry.distance <= alarmRadius);
  expect(openPairs.length).toBeGreaterThan(0);
  expect(openPairs.map((entry) => entry.pair)).toContain('enemy-3/enemy-4');
  expect(openPairs.every((entry) => entry.distance <= alarmRadius)).toBe(true);
  const isolated = initial.enemies.filter((enemy) =>
    initial.enemies
      .filter((other) => other.id !== enemy.id)
      .every((other) => distance(enemy, other) > alarmRadius),
  );
  expect(isolated.map((enemy) => enemy.id)).toContain('enemy-1');

  await screenshot(page, testInfo, 'colocacion-semilla');

  // Misma semilla y misma secuencia => mismo estado y mismos eventos, incluida
  // la detección por paso y la alarma.
  const run = async () => {
    await openGame(page, TEST_SEED_URL);
    const state = await loadState(page, detectionState());
    const start = {
      seed: state.seed,
      player: { x: state.players[0].x, y: state.players[0].y },
      enemies: state.enemies.map((enemy) => ({
        id: enemy.id,
        type: enemy.enemyType,
        x: enemy.x,
        y: enemy.y,
        home: enemy.home,
        awareness: enemy.awareness,
      })),
    };
    await moveCursorTo(page, 4, 2);
    await page.keyboard.press('Enter');
    await settle(page);
    const detected = await snapshot(page);
    const detectionEvents = eventTypes(detected.lastEvents);
    const detection = {
      player: { x: detected.players[0].x, y: detected.players[0].y, mp: detected.players[0].mp },
      enemies: detected.enemies.map((enemy) => ({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        awareness: enemy.awareness,
        lastKnown: enemy.lastKnown,
        hasShouted: enemy.hasShouted,
      })),
    };
    await page.keyboard.press('e');
    await settle(page);
    const afterTurn = await snapshot(page);
    return {
      start,
      detectionEvents,
      detection,
      afterTurn: {
        turn: afterTurn.turn,
        enemies: afterTurn.enemies.map((enemy) => ({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          awareness: enemy.awareness,
          lastKnown: enemy.lastKnown,
        })),
      },
    };
  };

  const first = await run();
  const second = await run();
  expect(second).toEqual(first);
  expect(first.detectionEvents).toEqual([
    'UnitMoved',
    'UnitMoved',
    'EnemySpotted',
    'AlarmRaised',
    'UnitMoved',
  ]);
  expect(consoleErrors).toEqual([]);
});
