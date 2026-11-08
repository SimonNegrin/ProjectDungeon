import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  approachEnemy,
  dispatchCommand,
  ensureMp,
  moveCursorTo,
  settle,
  snapshot,
  walkTo,
} from './support';

const REFERENCE_SEED = 279837264;
/**
 * La semilla de referencia decide la partida antes de que aparezca un fallo:
 * el primer ataque impacta para 1 y el segundo mata. Esta semilla suplementaria
 * produce un fallo y un impacto con los primeros comandos, sin tocar el motor.
 */
const FEEDBACK_SEED = 13;
/**
 * Partida con el jugador a la derecha del enemigo en una sala abierta. Es el
 * caso "normal" que contrasta con el pasillo de una casilla de la semilla de
 * referencia; la dirección y el impacto se comprueban en el propio test.
 */
const NORMAL_FEEDBACK_SEED = 40;

const WEAPON_LABELS = {
  sword: 'Espada +3/+4',
  axe: 'Hacha +2/+6',
  dagger: 'Daga +4/+3',
} as const;

async function openGame(page: Page, seed: number = REFERENCE_SEED): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/?seed=${seed}`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

interface ScreenBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: ScreenBox, b: ScreenBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Caja en pantalla de un tile del mapa. El mapa ocupa el 56,25 % central del
 * marco, sus 13×13 tiles cubren toda la altura y la cámara desplaza la ventana
 * visible. `camera` va en píxeles lógicos de tile.
 */
async function mapTileBox(
  page: Page,
  snap: GameSnapshot,
  x: number,
  y: number,
): Promise<ScreenBox> {
  const frame = await page.getByTestId('frame').boundingBox();
  if (!frame) throw new Error('El marco del mapa debe tener caja');
  const tile = frame.height / 13;
  const visibleX = x - snap.camera.x / snap.tileSize;
  const visibleY = y - snap.camera.y / snap.tileSize;
  return {
    x: frame.x + frame.width * 0.21875 + visibleX * tile,
    y: frame.y + visibleY * tile,
    width: tile,
    height: tile,
  };
}

/** Caja visible del feedback; falla si la animación lo dejó sin tamaño. */
async function feedbackBox(page: Page): Promise<ScreenBox> {
  const box = await page.getByTestId('damage-feedback').boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    throw new Error('El feedback de daño no está visible para la comprobación');
  }
  return box;
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function roomAt(snap: GameSnapshot, x: number, y: number) {
  return snap.rooms.find(
    (room) =>
      x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height,
  );
}

function floorNeighbor(snap: GameSnapshot, x: number, y: number) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= snap.grid.width || cell.y >= snap.grid.height) return false;
    return snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor';
  });
}

async function expectHudEquipment(page: Page, snap: GameSnapshot): Promise<void> {
  const player = snap.players[0];
  await expect(page.getByTestId('hud-weapon')).toHaveText(
    WEAPON_LABELS[player.equipment.weaponId],
  );
  await expect(page.getByTestId('hud-shield')).toHaveText(
    player.equipment.shieldId === null ? 'Sin escudo' : 'Escudo +1',
  );
  await expect(page.getByTestId('hud-armor')).toHaveText(
    player.equipment.armorId === null ? 'Sin armadura' : 'Armadura +1',
  );
  const { accuracy, damage, defense } = player.modifiers;
  await expect(page.getByTestId('hud-modifiers')).toHaveText(
    `${signed(accuracy)} acierto · ${signed(damage)} daño · ${signed(defense)} defensa`,
  );
}

async function expectHudOutsideMap(page: Page): Promise<void> {
  const hud = await page.getByTestId('hud').boundingBox();
  const frame = await page.getByTestId('frame').boundingBox();
  expect(hud, 'El HUD debe tener caja').not.toBeNull();
  expect(frame, 'El marco del mapa debe tener caja').not.toBeNull();
  expect(hud!.y + hud!.height).toBeLessThanOrEqual(frame!.y + 1);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function attackEvent(events: readonly GameEvent[]) {
  return events.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
}

test('HUD con espada, armas en el mapa, recogida con G y cambio 1-3', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);

  const initial = await snapshot(page);
  const player = initial.players[0];
  expect(initial.seed).toBe(REFERENCE_SEED);
  expect(initial.status).toBe('playing');
  expect(player.equipment).toEqual({
    weaponId: 'sword',
    armorId: 'armor',
    shieldId: 'shield',
  });
  expect(player.weapons).toEqual(['sword']);
  expect(player.modifiers).toEqual({ accuracy: 1, damage: 1, defense: 1 });
  expect(initial.weapons).toHaveLength(2);

  const axe = initial.weapons.find((weapon) => weapon.weaponId === 'axe');
  const dagger = initial.weapons.find((weapon) => weapon.weaponId === 'dagger');
  expect(axe, 'La semilla debe colocar el hacha').toBeDefined();
  expect(dagger, 'La semilla debe colocar la daga').toBeDefined();
  expect(new Set([axe!.id, dagger!.id]).size).toBe(2);

  const spawnRoom = roomAt(initial, player.x, player.y);
  expect(spawnRoom).toBeDefined();
  for (const weapon of [axe!, dagger!]) {
    expect(initial.grid.tiles[weapon.y * initial.grid.width + weapon.x]).toBe('floor');
    const room = roomAt(initial, weapon.x, weapon.y);
    expect(room, 'El arma debe estar en una sala').toBeDefined();
    expect(room!.id).not.toBe(spawnRoom!.id);
  }
  expect(roomAt(initial, axe!.x, axe!.y)!.id).not.toBe(
    roomAt(initial, dagger!.x, dagger!.y)!.id,
  );

  await expectHudEquipment(page, initial);
  await expect(page.getByTestId('hud-cursor-enemy-hp')).toHaveText('—/—');
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText('9/9');
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expectHudOutsideMap(page);
  await screenshot(page, 'hud-sword', testInfo);

  const neighbor = floorNeighbor(initial, axe!.x, axe!.y);
  expect(neighbor, 'El hacha debe tener una casilla libre al lado').toBeDefined();
  await walkTo(page, neighbor!.x, neighbor!.y);
  const nearAxe = await snapshot(page);
  expect(nearAxe.weapons).toHaveLength(2);
  expect(nearAxe.players[0].equipment.weaponId).toBe('sword');
  await screenshot(page, 'weapon-in-map', testInfo);

  await walkTo(page, axe!.x, axe!.y);
  const beforePickup = await ensureMp(page, 1);
  expect(beforePickup.players[0]).toMatchObject({ x: axe!.x, y: axe!.y });
  await expect(page.getByTestId('weapon-hint')).toBeVisible();
  await expect(page.getByTestId('weapon-hint')).toContainText('G recoger Hacha');
  await screenshot(page, 'weapon-map-hint', testInfo);

  await page.keyboard.press('g');
  await settle(page);
  const afterPickup = await snapshot(page);
  expect(afterPickup.players[0].mp).toBe(beforePickup.players[0].mp - 1);
  expect(afterPickup.players[0].actionAvailable).toBe(
    beforePickup.players[0].actionAvailable,
  );
  expect(afterPickup.players[0].equipment.weaponId).toBe('axe');
  expect(afterPickup.players[0].weapons).toEqual(['sword', 'axe']);
  expect(afterPickup.weapons).toHaveLength(1);
  expect(afterPickup.weapons.some((weapon) => weapon.id === axe!.id)).toBe(false);
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expectHudEquipment(page, afterPickup);
  await screenshot(page, 'weapon-picked', testInfo);

  // La misma arma no se puede recoger dos veces ni duplicar en el inventario.
  const repeated = await dispatchCommand(page, { type: 'PickUp', unitId: 'player-1' });
  await settle(page);
  expect(repeated.events).toEqual([
    { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-weapon' },
  ]);
  const afterRepeated = await snapshot(page);
  expect(afterRepeated.players[0]).toMatchObject({
    mp: afterPickup.players[0].mp,
    weapons: ['sword', 'axe'],
    equipment: { weaponId: 'axe' },
  });
  expect(afterRepeated.weapons).toHaveLength(1);
  await expect(page.getByTestId('hud-message')).toBeHidden();

  await walkTo(page, dagger!.x, dagger!.y);
  const beforeDagger = await ensureMp(page, 1);
  await expect(page.getByTestId('weapon-hint')).toContainText('G recoger Daga');
  await page.keyboard.press('g');
  await settle(page);
  const afterDagger = await snapshot(page);
  expect(afterDagger.players[0].mp).toBe(beforeDagger.players[0].mp - 1);
  expect(afterDagger.players[0].actionAvailable).toBe(
    beforeDagger.players[0].actionAvailable,
  );
  expect(afterDagger.players[0].equipment.weaponId).toBe('dagger');
  expect(afterDagger.players[0].weapons).toEqual(['sword', 'axe', 'dagger']);
  expect(afterDagger.weapons).toEqual([]);
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expectHudEquipment(page, afterDagger);

  const beforeSwitch = await snapshot(page);
  for (const [slot, weaponId] of [
    [1, 'sword'],
    [2, 'axe'],
    [3, 'dagger'],
  ] as const) {
    await page.keyboard.press(String(slot));
    await settle(page);
    const afterSwitch = await snapshot(page);
    expect(afterSwitch.players[0].equipment.weaponId).toBe(weaponId);
    expect(afterSwitch.players[0]).toMatchObject({
      mp: beforeSwitch.players[0].mp,
      actionAvailable: beforeSwitch.players[0].actionAvailable,
      x: beforeSwitch.players[0].x,
      y: beforeSwitch.players[0].y,
    });
    expect(afterSwitch.turn).toBe(beforeSwitch.turn);
    expect(afterSwitch.players[0].weapons).toEqual(['sword', 'axe', 'dagger']);
    expect(
      afterSwitch.lastEvents.filter((event) => event.type === 'CommandRejected'),
    ).toEqual([]);
    await expectHudEquipment(page, afterSwitch);
    if (slot === 2) await screenshot(page, 'weapon-switch', testInfo);
  }

  expect(consoleErrors).toEqual([]);
});

test('impacto, vida bajo cursor, F1, economía de turno y victoria', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  await approachEnemy(page);

  const adjacent = await snapshot(page);
  const enemy = adjacent.enemies[0];
  expect(distance(adjacent.players[0], enemy)).toBe(1);
  // La semilla de referencia llega desde arriba: es el pasillo de una casilla
  // que provocaba el solape del `-1` con el jugador.
  expect(adjacent.players[0]).toMatchObject({ x: enemy.x, y: enemy.y - 1 });
  await moveCursorTo(page, enemy.x, enemy.y);
  const selected = await snapshot(page);
  expect(selected.cursor).toMatchObject({
    x: enemy.x,
    y: enemy.y,
    kind: 'enemy',
    state: 'enemy',
  });
  await expect(page.getByTestId('hud-cursor-enemy-hp')).toHaveText(
    `${enemy.hp}/${enemy.maxHp}`,
  );
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(`${enemy.hp}/${enemy.maxHp}`);

  const beforeAttack = await snapshot(page);
  const attackResult = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  // El ataque no tiene desplazamiento: el feedback ya está activo al volver
  // `dispatch`. Se deja entrar el pico de la animación (900 ms) y se captura.
  await expect(page.getByTestId('attack-flash')).toHaveClass(/is-active/);
  await page.waitForTimeout(150);
  const hitBox = await feedbackBox(page);
  const playerTile = await mapTileBox(
    page,
    adjacent,
    adjacent.players[0].x,
    adjacent.players[0].y,
  );
  const targetTile = await mapTileBox(page, adjacent, enemy.x, enemy.y);
  expect(overlaps(hitBox, playerTile), 'El daño no debe tapar al jugador').toBe(false);
  expect(hitBox.y + hitBox.height / 2).toBeGreaterThan(
    targetTile.y + targetTile.height / 2,
  );
  await screenshot(page, 'attack-hit', testInfo);
  await screenshot(page, 'attack-corridor', testInfo);
  await settle(page);
  const attack = attackEvent(attackResult.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${attack!.damage}`);
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();

  expect(attack!.attackerId).toBe('player-1');
  expect(attack!.targetId).toBe(enemy.id);
  expect(attack!.damage).toBeGreaterThan(0);
  expect(attack!.targetHp).toBe(Math.max(0, enemy.hp - attack!.damage));
  expect(attack!.rolls.damage).not.toBeNull();
  expect(attack!.rolls.armor).not.toBeNull();
  expect(4 + attack!.rolls.attack).toBeGreaterThan(1 + attack!.rolls.shield);
  expect(attack!.damage).toBe(
    Math.max(1, 5 + attack!.rolls.damage! - (1 + attack!.rolls.armor!)),
  );

  const afterAttack = await snapshot(page);
  expect(afterAttack.players[0].actionAvailable).toBe(false);
  expect(afterAttack.players[0].mp).toBe(beforeAttack.players[0].mp);
  expect(afterAttack.turn).toBe(beforeAttack.turn);
  expect(afterAttack.enemies[0].hp).toBe(attack!.targetHp);
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${attack!.targetHp}/${enemy.maxHp}`,
  );

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText = (await page.getByTestId('debug-content').textContent()) ?? '';
  expect(debugText).toContain(
    'Equipo: Espada +3/+4 · Escudo +1 · Armadura +1 · Modificadores +1 acierto · +1 daño · +1 defensa',
  );
  expect(debugText).toContain(
    'Equipo enemigo enemy-1: Espada +3/+4 · Escudo +1 · Armadura +1',
  );
  expect(debugText).toContain('Vida: player-1');
  expect(debugText).toContain(`Último ataque: player-1→enemy-1 impacto ${attack!.damage}`);
  expect(debugText).toContain(
    `tiradas ataque ${attack!.rolls.attack} escudo ${attack!.rolls.shield} daño ${attack!.rolls.damage} armadura ${attack!.rolls.armor}`,
  );
  expect(debugText).toContain(
    `Enemigo bajo cursor: enemy-1 ${attack!.targetHp}/${enemy.maxHp}`,
  );
  await screenshot(page, 'debug-f1', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  const beforeEndTurn = await snapshot(page);
  const endTurn = await dispatchCommand(page, { type: 'EndTurn' });
  const enemyAttack = endTurn.events.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'enemy-1',
  );
  expect(enemyAttack, 'La fase enemiga debe atacar').toBeDefined();
  expect(enemyAttack!.hit).toBe(true);
  await page.waitForTimeout(150);
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${enemyAttack!.damage}`,
  );
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');
  await screenshot(page, 'enemy-hit', testInfo);
  await settle(page);
  const afterEndTurn = await snapshot(page);
  expect(
    endTurn.events.filter(
      (event) => event.type === 'TurnEnded' || event.type === 'PlayerTurnStarted',
    ),
  ).toEqual([
    { type: 'TurnEnded', turn: beforeEndTurn.turn },
    { type: 'PlayerTurnStarted', turn: beforeEndTurn.turn + 1 },
  ]);
  expect(afterEndTurn.turn).toBe(beforeEndTurn.turn + 1);
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.players[0]).toMatchObject({
    hp: beforeEndTurn.players[0].hp - enemyAttack!.damage,
    mp: afterEndTurn.players[0].maxMp,
    actionAvailable: true,
  });
  await expect(page.getByTestId('hud-player-hp')).toHaveText(
    `${afterEndTurn.players[0].hp}/20`,
  );

  let victoryEvents: GameEvent[] = [];
  for (let round = 0; round < 6; round += 1) {
    let current = await snapshot(page);
    if (current.status !== 'playing') break;
    if (distance(current.players[0], current.enemies[0]) > 1) {
      await approachEnemy(page);
      current = await snapshot(page);
    }
    await moveCursorTo(page, current.enemies[0].x, current.enemies[0].y);
    const beforeKill = await snapshot(page);
    const result = await dispatchCommand(page, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: current.enemies[0].id,
    });
    await settle(page);
    victoryEvents = [...victoryEvents, ...result.events];
    if (result.snapshot.status !== 'playing') {
      expect(result.snapshot.turn).toBe(beforeKill.turn);
      expect(result.snapshot.players[0].mp).toBe(beforeKill.players[0].mp);
      expect(result.snapshot.players[0].actionAvailable).toBe(false);
      break;
    }
    const end = await dispatchCommand(page, { type: 'EndTurn' });
    await settle(page);
    victoryEvents = [...victoryEvents, ...end.events];
  }

  const victory = await snapshot(page);
  expect(victory.status).toBe('victory');
  expect(victory.enemies[0].hp).toBe(0);
  expect(
    victoryEvents.some(
      (event) => event.type === 'GameEnded' && event.status === 'victory',
    ),
  ).toBe(true);
  expect(victoryEvents.some((event) => event.type === 'UnitDied')).toBe(true);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.getByTestId('hud-status')).toHaveText('Victoria');
  await screenshot(page, 'victory', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('feedback de daño en un ataque normal desde el lado', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, NORMAL_FEEDBACK_SEED);
  await approachEnemy(page);

  const adjacent = await snapshot(page);
  const player = adjacent.players[0];
  const enemy = adjacent.enemies[0];
  expect(adjacent.status).toBe('playing');
  // El jugador ataca desde la derecha en una sala abierta: el texto debe quedar
  // a la izquierda del objetivo.
  expect(player).toMatchObject({ x: enemy.x + 1, y: enemy.y });

  await moveCursorTo(page, enemy.x, enemy.y);
  const beforeAttack = await snapshot(page);
  const result = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = attackEvent(result.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  await expect(page.getByTestId('attack-flash')).toHaveClass(/is-active/);

  await page.waitForTimeout(150);
  const box = await feedbackBox(page);
  const targetTile = await mapTileBox(page, adjacent, enemy.x, enemy.y);
  const attackerTile = await mapTileBox(page, adjacent, player.x, player.y);
  expect(overlaps(box, targetTile), 'El daño debe quedar sobre el objetivo').toBe(true);
  expect(overlaps(box, attackerTile), 'El daño no debe tapar al atacante').toBe(false);
  expect(box.x + box.width / 2).toBeLessThan(targetTile.x + targetTile.width / 2);
  await screenshot(page, 'attack-normal', testInfo);
  await settle(page);

  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${attack!.damage}`);
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();

  const afterAttack = await snapshot(page);
  expect(afterAttack.turn).toBe(beforeAttack.turn);
  expect(afterAttack.players[0].actionAvailable).toBe(false);
  expect(afterAttack.enemies[0].hp).toBe(attack!.targetHp);
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${attack!.targetHp}/${enemy.maxHp}`,
  );

  expect(consoleErrors).toEqual([]);
});

test('fallo con texto y sin destello (semilla suplementaria)', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, FEEDBACK_SEED);
  const start = await snapshot(page);
  expect(start.seed).toBe(FEEDBACK_SEED);
  await approachEnemy(page);

  const adjacent = await snapshot(page);
  const enemy = adjacent.enemies[0];
  await moveCursorTo(page, enemy.x, enemy.y);
  const beforeMiss = await snapshot(page);
  const missResult = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  // Igual que el impacto: capturar antes de que decaiga el feedback de 900 ms.
  await page.waitForTimeout(150);
  await screenshot(page, 'attack-miss', testInfo);
  await settle(page);
  const miss = attackEvent(missResult.events);
  expect(miss).toBeDefined();
  expect(miss!.hit).toBe(false);
  await expect(page.getByTestId('damage-feedback')).toHaveText('Fallo');
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'miss',
  );
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  await expect(page.getByTestId('attack-flash')).not.toHaveClass(/is-active/);

  expect(miss!.damage).toBe(0);
  expect(miss!.targetHp).toBe(enemy.hp);
  expect(miss!.rolls.damage).toBeNull();
  expect(miss!.rolls.armor).toBeNull();
  expect(4 + miss!.rolls.attack).toBeLessThanOrEqual(1 + miss!.rolls.shield);
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${enemy.hp}/${enemy.maxHp}`,
  );
  const afterMiss = await snapshot(page);
  expect(afterMiss.players[0].actionAvailable).toBe(false);
  expect(afterMiss.players[0].mp).toBe(beforeMiss.players[0].mp);
  expect(afterMiss.turn).toBe(beforeMiss.turn);
  expect(afterMiss.enemies[0].hp).toBe(enemy.hp);

  const end = await dispatchCommand(page, { type: 'EndTurn' });
  await settle(page);
  expect(end.events.filter((event) => event.type === 'CommandRejected')).toEqual([]);
  const afterTurn = await snapshot(page);
  await moveCursorTo(page, afterTurn.enemies[0].x, afterTurn.enemies[0].y);
  const hitResult = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: afterTurn.enemies[0].id,
  });
  await settle(page);
  const hit = attackEvent(hitResult.events);
  expect(hit).toBeDefined();
  expect(hit!.hit).toBe(true);
  expect(hitResult.snapshot.enemies[0].hp).toBe(
    Math.max(0, afterTurn.enemies[0].hp - hit!.damage),
  );
  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${hit!.damage}`);
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');

  expect(consoleErrors).toEqual([]);
});

test('determinismo: dos cargas con la misma semilla y comandos', async ({ page }) => {
  const runScript = async () => {
    await openGame(page);
    await approachEnemy(page);
    const attacks: Array<{
      attackerId: string;
      targetId: string;
      hit: boolean;
      damage: number;
      targetHp: number;
      rolls: { attack: number; shield: number; damage: number | null; armor: number | null };
    }> = [];
    const turns: number[] = [];

    for (let round = 0; round < 4; round += 1) {
      const before = await snapshot(page);
      if (before.status !== 'playing') break;
      const attackResult = await dispatchCommand(page, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: before.enemies[0].id,
      });
      await settle(page);
      for (const event of attackResult.events) {
        if (event.type === 'AttackPerformed') {
          attacks.push({
            attackerId: event.attackerId,
            targetId: event.targetId,
            hit: event.hit,
            damage: event.damage,
            targetHp: event.targetHp,
            rolls: { ...event.rolls },
          });
        }
      }
      if (attackResult.snapshot.status !== 'playing') break;

      const endTurn = await dispatchCommand(page, { type: 'EndTurn' });
      await settle(page);
      for (const event of endTurn.events) {
        if (event.type === 'AttackPerformed') {
          attacks.push({
            attackerId: event.attackerId,
            targetId: event.targetId,
            hit: event.hit,
            damage: event.damage,
            targetHp: event.targetHp,
            rolls: { ...event.rolls },
          });
        }
        if (
          event.type === 'TurnEnded' ||
          event.type === 'EnemyPhaseStarted' ||
          event.type === 'PlayerTurnStarted'
        ) {
          turns.push(event.turn);
        }
      }
    }

    const final = await snapshot(page);
    return {
      seed: final.seed,
      attacks,
      turns,
      status: final.status,
      finalTurn: final.turn,
      playerHp: final.players[0].hp,
      enemyHp: final.enemies[0].hp,
    };
  };

  const first = await runScript();
  const second = await runScript();

  expect(second).toEqual(first);
  expect(first.seed).toBe(REFERENCE_SEED);
  expect(first.attacks.length).toBeGreaterThanOrEqual(2);
  expect(first.attacks.some((event) => event.attackerId === 'player-1')).toBe(true);
  expect(first.attacks.some((event) => event.attackerId === 'enemy-1')).toBe(true);
  expect(first.status).toBe('victory');
});

test('derrota determinista sin cambiar la economía de turno', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const initial = await snapshot(page);
  expect(initial.status).toBe('playing');

  let defeatReached = false;
  for (let turn = 0; turn < 80; turn += 1) {
    const before = await snapshot(page);
    if (before.status !== 'playing') {
      defeatReached = true;
      break;
    }

    const result = await dispatchCommand(page, { type: 'EndTurn' });
    await settle(page);
    const after = result.snapshot;
    const turnEnded = result.events.filter((event) => event.type === 'TurnEnded');
    expect(turnEnded).toEqual([{ type: 'TurnEnded', turn: before.turn }]);
    expect(
      result.events.filter((event) => event.type === 'EnemyPhaseStarted'),
    ).toHaveLength(1);

    if (after.status === 'playing') {
      expect(after.turn).toBe(before.turn + 1);
      expect(after.phase).toBe('player');
      expect(after.players[0]).toMatchObject({
        mp: after.players[0].maxMp,
        actionAvailable: true,
      });
      expect(
        result.events.filter((event) => event.type === 'PlayerTurnStarted'),
      ).toEqual([{ type: 'PlayerTurnStarted', turn: before.turn + 1 }]);
      continue;
    }

    expect(after.status).toBe('defeat');
    expect(after.turn).toBe(before.turn);
    expect(after.players[0].hp).toBe(0);
    expect(
      result.events.filter((event) => event.type === 'PlayerTurnStarted'),
    ).toHaveLength(0);
    expect(
      result.events.some(
        (event) => event.type === 'GameEnded' && event.status === 'defeat',
      ),
    ).toBe(true);
    defeatReached = true;
    break;
  }

  expect(defeatReached, 'La derrota debe alcanzarse en 80 turnos enemigos').toBe(true);
  const defeat = await snapshot(page);
  expect(defeat.status).toBe('defeat');
  expect(defeat.players[0].hp).toBe(0);
  await expect(page.getByTestId('overlay-defeat')).toBeVisible();
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.getByTestId('hud-status')).toHaveText('Derrota');
  await screenshot(page, 'defeat', testInfo);

  await page.keyboard.press('r');
  const restarted = await snapshot(page);
  expect(restarted).toMatchObject({ status: 'playing', phase: 'player', turn: 1 });
  expect(restarted.players[0]).toMatchObject({
    hp: 20,
    mp: 6,
    actionAvailable: true,
  });
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
