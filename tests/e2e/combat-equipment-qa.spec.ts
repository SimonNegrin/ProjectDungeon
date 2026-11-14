import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  ARMORS,
  SHIELDS,
  WEAPONS,
  weaponDamage,
} from '../../src/game/equipment';
import { effectiveStats } from '../../src/game/stats';
import { bandFor, resolvePacket } from '../../src/game/damage';
import { ROSTER } from '../../src/game/roster';
import type { GameEvent, Unit } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { damageFeedbackAnchor } from '../../src/host/feedback';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  approachEnemy,
  defeatAllEnemies,
  dispatchCommand,
  dispatchFrozen,
  ensureMp,
  moveCursorTo,
  openBspState,
  panelActionTestId,
  pressPanelAction,
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
/**
 * Semillas elegidas con el MP por tipo del bestiario: la ruta segura llega
 * viva y la primera tirada produce el fallo/impacto que el test necesita.
 */
const FEEDBACK_SEED = 13;
/**
 * Semilla con una sala abierta y el jugador colocado a un lado del enemigo. El
 * primer ataque de esta semilla impacta con el RNG de combate en estado 0.
 */
const NORMAL_FEEDBACK_SEED = 1;

async function openGame(page: Page, seed: number = REFERENCE_SEED): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBspState(page, seed);
}

/**
 * Prepara el mapa con un solo centinela para los recorridos de equipo. Las
 * armas pueden caer junto al bruto o al cobarde; el resto de la guardia no
 * forma parte de este criterio y no debe convertir el trayecto en un combate.
 */
async function openEquipmentRun(page: Page): Promise<GameSnapshot> {
  await page.setViewportSize({ width: 1280, height: 720 });
  const base = await openBspState(page, REFERENCE_SEED);
  const sentinel = base.enemies.find((enemy) => enemy.enemyType === 'sentinel');
  if (!sentinel) throw new Error('La semilla debe colocar un centinela');
  return openBspState(page, REFERENCE_SEED, undefined, { enemies: [sentinel] });
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

function weaponLabel(unit: Unit): string {
  const weaponId = unit.equipment.weapon?.itemId;
  if (weaponId === undefined) return 'Sin arma';
  const weapon = WEAPONS[weaponId as keyof typeof WEAPONS];
  return `${weapon.name} ${signed(weapon.accuracy)}/${signed(weaponDamage(weapon))}`;
}

function shieldLabel(unit: Unit): string {
  const shieldId = unit.equipment.shield?.itemId;
  if (shieldId === undefined) return 'Sin escudo';
  const shield = SHIELDS[shieldId as keyof typeof SHIELDS];
  return `${shield.name} ${signed(shield.defense)}`;
}

function armorLabel(unit: Unit): string {
  const armorId = unit.equipment.armor?.itemId;
  if (armorId === undefined) return 'Sin armadura';
  const armor = ARMORS[armorId as keyof typeof ARMORS];
  return `${armor.name} ${signed(armor.armor)}`;
}

function statsLabel(unit: Unit): string {
  const { habilidad, fuerza, defensa } = unit.stats;
  return `${signed(habilidad)} habilidad · ${signed(fuerza)} fuerza · ${signed(defensa)} defensa`;
}

function equipmentBody(unit: Unit): string {
  return `${weaponLabel(unit)} · ${shieldLabel(unit)} · ${armorLabel(unit)}`;
}

function debugEquipmentLine(unit: Unit): string {
  return `Equipo: ${equipmentBody(unit)} · Atributos ${statsLabel(unit)}`;
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
  await moveCursorTo(page, player.x, player.y);
  await expect(page.getByTestId('hud-weapon')).toHaveText(weaponLabel(player));
  await expect(page.getByTestId('hud-stats')).toHaveText(statsLabel(player));
  // El resumen de equipo dejó la ficha izquierda (REQ-022 R-004): arma,
  // escudo y armadura se consultan en el detalle del aliado bajo el cursor.
  const detail = page.getByTestId('hud-cursor-detail');
  await expect(detail).toContainText(weaponLabel(player));
  await expect(detail).toContainText(shieldLabel(player));
  await expect(detail).toContainText(armorLabel(player));
}

async function expectHudInsideFrame(page: Page): Promise<void> {
  const hud = await page.getByTestId('hud').boundingBox();
  const frame = await page.getByTestId('frame').boundingBox();
  expect(hud, 'El HUD debe tener caja').not.toBeNull();
  expect(frame, 'El marco del mapa debe tener caja').not.toBeNull();
  expect(hud!.x).toBeGreaterThanOrEqual(frame!.x - 1);
  expect(hud!.y).toBeGreaterThanOrEqual(frame!.y - 1);
  expect(hud!.x + hud!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
  expect(hud!.y + hud!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1);
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

test('HUD con espada, armas en el mapa, recogida en el panel y sin cambio 1-3', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const initial = await openEquipmentRun(page);
  const player = initial.players[0];
  expect(initial.seed).toBe(REFERENCE_SEED);
  expect(initial.status).toBe('playing');
  expect(player.nombre).toBe(ROSTER.warrior.name);
  expect(player.archetypeId).toBe('warrior');
  expect(player.equipment.weapon?.itemId).toBe('sword');
  expect(player.equipment.armor?.itemId).toBe('armor');
  expect(player.equipment.shield?.itemId).toBe('shield');
  expect(player.weapons).toEqual(['sword']);
  expect(player.stats).toEqual(ROSTER.warrior.stats);
  expect(player.stats.resistencia).toEqual(ROSTER.warrior.stats.resistencia);
  expect(initial.weapons).toHaveLength(3);

  const axe = initial.weapons.find((weapon) => weapon.weaponId === 'axe');
  const dagger = initial.weapons.find((weapon) => weapon.weaponId === 'dagger');
  const hammer = initial.weapons.find((weapon) => weapon.weaponId === 'hammer');
  expect(axe, 'La semilla debe colocar el hacha').toBeDefined();
  expect(dagger, 'La semilla debe colocar la daga').toBeDefined();
  expect(hammer, 'La semilla debe colocar el martillo').toBeDefined();
  expect(new Set([axe!.id, dagger!.id, hammer!.id]).size).toBe(3);

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
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${initial.enemies[0].hp}/${initial.enemies[0].maxHp}`,
  );
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expectHudInsideFrame(page);
  await screenshot(page, 'hud-sword', testInfo);

  const neighbor = floorNeighbor(initial, axe!.x, axe!.y);
  expect(neighbor, 'El hacha debe tener una casilla libre al lado').toBeDefined();
  await walkTo(page, neighbor!.x, neighbor!.y);
  const nearAxe = await snapshot(page);
  expect(nearAxe.weapons).toHaveLength(3);
  expect(nearAxe.players[0].equipment.weapon?.itemId).toBe('sword');
  await screenshot(page, 'weapon-in-map', testInfo);

  const pickupFromPanel = async (itemId: string): Promise<void> => {
    await page.keyboard.press('i');
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
    await pressPanelAction(page, panelActionTestId('pickup', `ground:${itemId}`));
    await settle(page);
  };

  await walkTo(page, axe!.x, axe!.y);
  const beforePickup = await ensureMp(page, 1);
  expect(beforePickup.players[0]).toMatchObject({ x: axe!.x, y: axe!.y });
  await expect(page.getByTestId('weapon-hint')).toBeVisible();
  await expect(page.getByTestId('weapon-hint')).toContainText('I panel');
  await expect(page.getByTestId('weapon-hint')).toContainText('Hacha en el suelo');
  await screenshot(page, 'weapon-map-hint', testInfo);

  const axeInstance = initial.groundItems.find((item) => item.id === axe!.id);
  expect(axeInstance, 'El hacha debe existir como instancia del suelo').toBeDefined();
  await pickupFromPanel(axeInstance!.id);
  await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
  await expect(page.getByTestId('inventory-ground-empty')).toBeVisible();
  await screenshot(page, 'panel-recogida', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  const afterPickup = await snapshot(page);
  expect(afterPickup.players[0].mp).toBe(beforePickup.players[0].mp - 1);
  expect(afterPickup.players[0].actions).toEqual(beforePickup.players[0].actions);
  expect(afterPickup.players[0].equipment.weapon?.itemId).toBe('sword');
  expect(afterPickup.players[0].weapons).toEqual(['sword', 'axe']);
  expect(afterPickup.weapons).toHaveLength(2);
  expect(afterPickup.weapons.some((weapon) => weapon.id === axe!.id)).toBe(false);
  await expectHudEquipment(page, afterPickup);
  await screenshot(page, 'weapon-picked', testInfo);

  // La misma arma no se puede recoger dos veces ni duplicar en el inventario.
  const repeated = await dispatchCommand(page, { type: 'PickUp', unitId: 'player-1' });
  await settle(page);
  expect(repeated.events).toEqual([
    { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-item' },
  ]);
  const afterRepeated = await snapshot(page);
  expect(afterRepeated.players[0]).toMatchObject({
    mp: afterPickup.players[0].mp,
    weapons: ['sword', 'axe'],
  });
  expect(afterRepeated.players[0].equipment.weapon?.itemId).toBe('sword');
  expect(afterRepeated.weapons).toHaveLength(2);
  await expect(page.getByTestId('hud-message')).toBeHidden();

  await walkTo(page, dagger!.x, dagger!.y);
  const beforeDagger = await ensureMp(page, 1);
  await expect(page.getByTestId('weapon-hint')).toContainText('Daga en el suelo');
  const daggerInstance = initial.groundItems.find((item) => item.id === dagger!.id);
  expect(daggerInstance, 'La daga debe existir como instancia del suelo').toBeDefined();
  await pickupFromPanel(daggerInstance!.id);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  const afterDagger = await snapshot(page);
  expect(afterDagger.players[0].mp).toBe(beforeDagger.players[0].mp - 1);
  expect(afterDagger.players[0].actions).toEqual(beforeDagger.players[0].actions);
  expect(afterDagger.players[0].equipment.weapon?.itemId).toBe('sword');
  expect(afterDagger.players[0].weapons).toEqual(['sword', 'axe', 'dagger']);
  expect(afterDagger.weapons).toHaveLength(1);
  expect(afterDagger.weapons[0].weaponId).toBe('hammer');
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expectHudEquipment(page, afterDagger);

  // El cambio de arma se hace solo desde el panel: `EquipItem` desde la
  // mochila; `1`-`3` son no-op y no mueven MP ni acciones.
  const beforeSwitch = await snapshot(page);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  await page.keyboard.press('Escape');
  const afterSwitch = await snapshot(page);
  expect(afterSwitch.players[0].equipment.weapon?.itemId).toBe('axe');
  expect(afterSwitch.players[0]).toMatchObject({
    mp: beforeSwitch.players[0].mp - 1,
    actions: beforeSwitch.players[0].actions,
    x: beforeSwitch.players[0].x,
    y: beforeSwitch.players[0].y,
  });
  expect([...afterSwitch.players[0].weapons].sort()).toEqual([
    'axe',
    'dagger',
    'sword',
  ]);
  await expectHudEquipment(page, afterSwitch);
  await screenshot(page, 'weapon-switch', testInfo);

  for (const slot of ['1', '2', '3'] as const) {
    await page.keyboard.press(slot);
    await settle(page);
    const afterKey = await snapshot(page);
    expect(afterKey.players[0].equipment.weapon?.itemId).toBe('axe');
    expect(afterKey.players[0]).toMatchObject({
      mp: afterSwitch.players[0].mp,
      actions: afterSwitch.players[0].actions,
      x: afterSwitch.players[0].x,
      y: afterSwitch.players[0].y,
    });
    expect(afterKey.turn).toBe(afterSwitch.turn);
    expect([...afterKey.players[0].weapons].sort()).toEqual([
      'axe',
      'dagger',
      'sword',
    ]);
    expect(
      afterKey.lastEvents.filter((event) => event.type === 'CommandRejected'),
    ).toEqual([]);
    await expectHudEquipment(page, afterKey);
  }

  expect(consoleErrors).toEqual([]);
});

test('impacto, vida bajo cursor, F1, economía de turno y victoria', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  const base = await openBspState(page, REFERENCE_SEED);
  const baseEnemy = base.enemies[0];
  const beside = floorNeighbor(base, baseEnemy.x, baseEnemy.y);
  expect(beside, 'Enemy-1 debe tener una casilla libre adyacente').toBeDefined();
  // RNG fijado: el primer ataque del jugador impacta y el de la fase enemiga
  // también, sin depender de cuántas tiradas consuma la aproximación.
  const adjacent = await openBspState(page, REFERENCE_SEED, undefined, {
    player: beside!,
    enemies: [baseEnemy],
    rng: { seed: 2, state: 0 },
  });
  const enemy = adjacent.enemies[0];
  expect(distance(adjacent.players[0], enemy)).toBe(1);
  expect(
    Math.abs(adjacent.players[0].x - enemy.x) +
      Math.abs(adjacent.players[0].y - enemy.y),
  ).toBe(1);
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
  const attackResult = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  // El ataque no tiene desplazamiento: el cue de impacto ya está activo al
  // volver `dispatch`. Se muestrea el pico de su beat determinista.
  expect(
    attackResult.snapshot.animation.cues.find((cue) => cue.kind === 'attack'),
  ).toMatchObject({ kind: 'attack', hit: true });
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const hitBox = await feedbackBox(page);
  const playerTile = await mapTileBox(
    page,
    adjacent,
    adjacent.players[0].x,
    adjacent.players[0].y,
  );
  const targetTile = await mapTileBox(page, adjacent, enemy.x, enemy.y);
  expect(overlaps(hitBox, playerTile), 'El daño no debe tapar al jugador').toBe(false);
  const anchor = damageFeedbackAnchor(enemy, adjacent.players[0], {
    width: adjacent.grid.width,
    height: adjacent.grid.height,
  });
  const feedbackCenterX = hitBox.x + hitBox.width / 2;
  const feedbackCenterY = hitBox.y + hitBox.height / 2;
  const targetCenterX = targetTile.x + targetTile.width / 2;
  const targetCenterY = targetTile.y + targetTile.height / 2;
  if (anchor.side === 'below') {
    expect(feedbackCenterY).toBeGreaterThan(targetCenterY);
  } else if (anchor.side === 'above') {
    expect(feedbackCenterY).toBeLessThan(targetCenterY);
  } else if (anchor.side === 'right') {
    expect(feedbackCenterX).toBeGreaterThan(targetCenterX);
  } else {
    expect(feedbackCenterX).toBeLessThan(targetCenterX);
  }
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
  const playerUnit = adjacent.players[0];
  const playerWeapon = WEAPONS[playerUnit.equipment.weapon!.itemId as keyof typeof WEAPONS];
  expect(
    playerUnit.stats.habilidad +
      playerWeapon.accuracy +
      attack!.rolls.attack,
  ).toBeGreaterThan(
    enemy.stats.defensa +
      effectiveStats(enemy).evasion +
      attack!.rolls.shield,
  );
  const packet = playerWeapon.damagePackets[0];
  const band = bandFor(enemy.stats.resistencia, packet.type);
  expect(attack!.damage).toBe(
    Math.max(
      1,
      resolvePacket(
        packet,
        playerUnit.stats.fuerza,
        effectiveStats(enemy).absorption,
        band,
        attack!.rolls.damage!,
        attack!.rolls.armor!,
      ),
    ),
  );

  const afterAttack = await snapshot(page);
  expect(afterAttack.players[0].actions.remaining).toBe(1);
  expect(afterAttack.players[0].mp).toBe(beforeAttack.players[0].mp);
  expect(afterAttack.turn).toBe(beforeAttack.turn);
  expect(afterAttack.enemies[0].hp).toBe(attack!.targetHp);
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${attack!.targetHp}/${enemy.maxHp}`,
  );

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText = (await page.getByTestId('debug-content').textContent()) ?? '';
  expect(debugText).toContain(debugEquipmentLine(adjacent.players[0]));
  expect(debugText).toContain(
    `Equipo enemigo ${enemy.id}: ${equipmentBody(enemy)}`,
  );
  expect(debugText).toContain('Vida: player-1');
  expect(debugText).toContain(`Último ataque: player-1→enemy-1 impacto ${attack!.damage}`);
  expect(debugText).toContain(
    `tiradas ataque ${attack!.rolls.attack} escudo ${attack!.rolls.shield} golpe ${attack!.rolls.damage} absorción ${attack!.rolls.armor}`,
  );
  expect(debugText).toContain(
    `Enemigo bajo cursor: enemy-1 ${attack!.targetHp}/${enemy.maxHp}`,
  );
  await screenshot(page, 'debug-f1', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();

  const beforeEndTurn = await snapshot(page);
  const endTurn = await dispatchFrozen(page, { type: 'EndTurn' });
  const enemyAttacks = endTurn.events.filter(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'enemy-1',
  );
  const enemyAttack = enemyAttacks[0];
  expect(enemyAttack, 'La fase enemiga debe atacar').toBeDefined();
  expect(enemyAttack!.hit).toBe(true);
  // El encadenado gasta todas las acciones del tipo: un ataque por acción.
  expect(enemyAttacks).toHaveLength(beforeEndTurn.enemies[0].actions.max);
  const enemyDamage = enemyAttacks.reduce((total, attack) => total + attack.damage, 0);
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
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
    hp: beforeEndTurn.players[0].hp - enemyDamage,
    mp: afterEndTurn.players[0].maxMp,
    actions: { remaining: 2 },
  });
  expect(afterEndTurn.enemies[0].actions.remaining).toBe(0);
  await expect(page.getByTestId('hud-player-hp')).toHaveText(
    `${afterEndTurn.players[0].hp}/20`,
  );

  let victoryEvents: GameEvent[] = [];
  for (let round = 0; round < 6; round += 1) {
    let current = await snapshot(page);
    if (current.status !== 'playing') break;
    if (current.enemies[0].hp === 0) break;
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
      expect(result.snapshot.players[0].actions.remaining).toBe(1);
      break;
    }
    const end = await dispatchCommand(page, { type: 'EndTurn' });
    await settle(page);
    victoryEvents = [...victoryEvents, ...end.events];
  }

  if ((await snapshot(page)).status === 'playing') {
    const cleared = await defeatAllEnemies(page);
    victoryEvents = [...victoryEvents, ...cleared.events];
  }

  const victory = await snapshot(page);
  expect(victory.status).toBe('victory');
  expect(victory.enemies.every((enemy) => enemy.hp === 0)).toBe(true);
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
  const base = await openBspState(page, NORMAL_FEEDBACK_SEED);
  const baseEnemy = base.enemies[0];
  const west = { x: baseEnemy.x - 1, y: baseEnemy.y };
  expect(base.grid.tiles[west.y * base.grid.width + west.x]).toBe('floor');
  const adjacent = await openBspState(page, NORMAL_FEEDBACK_SEED, undefined, {
    player: west,
    enemies: [baseEnemy],
  });
  const player = adjacent.players[0];
  const enemy = adjacent.enemies[0];
  expect(adjacent.status).toBe('playing');
  // El jugador ataca desde el oeste en una sala abierta: el texto debe quedar a
  // la derecha del objetivo y no tapar al atacante.
  expect(player).toMatchObject({ x: enemy.x - 1, y: enemy.y });

  await moveCursorTo(page, enemy.x, enemy.y);
  const beforeAttack = await snapshot(page);
  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = attackEvent(result.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  expect(
    result.snapshot.animation.cues.find((cue) => cue.kind === 'attack'),
  ).toMatchObject({ kind: 'attack', hit: true });

  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const box = await feedbackBox(page);
  const targetTile = await mapTileBox(page, adjacent, enemy.x, enemy.y);
  const attackerTile = await mapTileBox(page, adjacent, player.x, player.y);
  expect(overlaps(box, targetTile), 'El daño debe quedar sobre el objetivo').toBe(true);
  expect(overlaps(box, attackerTile), 'El daño no debe tapar al atacante').toBe(false);
  expect(box.x + box.width / 2).toBeGreaterThan(targetTile.x + targetTile.width / 2);
  await screenshot(page, 'attack-normal', testInfo);
  await settle(page);

  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${attack!.damage}`);
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();

  const afterAttack = await snapshot(page);
  expect(afterAttack.turn).toBe(beforeAttack.turn);
  expect(afterAttack.players[0].actions.remaining).toBe(1);
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
  const base = await openBspState(page, FEEDBACK_SEED);
  expect(base.seed).toBe(FEEDBACK_SEED);
  const baseEnemy = base.enemies[0];
  const beside = floorNeighbor(base, baseEnemy.x, baseEnemy.y);
  expect(beside, 'El enemigo debe tener una casilla libre al lado').toBeDefined();
  const adjacent = await openBspState(page, FEEDBACK_SEED, undefined, {
    player: beside!,
    enemies: [baseEnemy],
    rng: { seed: FEEDBACK_SEED, state: 0 },
  });
  const enemy = adjacent.enemies[0];
  await moveCursorTo(page, enemy.x, enemy.y);
  const beforeMiss = await snapshot(page);
  const missResult = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  // Igual que el impacto: muestrear el pico con el reloj de presentación, sin
  // esperas de reloj real que puedan agotar la persistencia antes del settle.
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  await screenshot(page, 'attack-miss', testInfo);
  // REQ-027: el fallo no añade texto de réplica; el segundo nodo de daño sigue
  // oculto. La réplica del jugador llega en la fase enemiga y se comprueba en su
  // cue con la misma condición.
  await expect(page.getByTestId('damage-feedback-2')).toBeHidden();
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
  expect(
    missResult.snapshot.animation.cues.find((cue) => cue.kind === 'attack'),
  ).toMatchObject({ kind: 'attack', hit: false });

  expect(miss!.damage).toBe(0);
  expect(miss!.targetHp).toBe(enemy.hp);
  expect(miss!.rolls.damage).toBeNull();
  expect(miss!.rolls.armor).toBeNull();
  const missAttacker = adjacent.players[0];
  expect(
    missAttacker.stats.habilidad +
      WEAPONS[missAttacker.equipment.weapon!.itemId as keyof typeof WEAPONS].accuracy +
      miss!.rolls.attack,
  ).toBeLessThanOrEqual(
    enemy.stats.defensa +
      effectiveStats(enemy).evasion +
      miss!.rolls.shield,
  );
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${enemy.hp}/${enemy.maxHp}`,
  );
  const afterMiss = await snapshot(page);
  expect(afterMiss.players[0].actions.remaining).toBe(1);
  expect(afterMiss.players[0].mp).toBe(beforeMiss.players[0].mp);
  expect(afterMiss.turn).toBe(beforeMiss.turn);
  expect(afterMiss.enemies[0].hp).toBe(enemy.hp);

  // REQ-027: en la fase enemiga el enemigo falla y el jugador replica. Se
  // muestrea el cue de réplica con el reloj de presentación: no añade texto
  // propio; cualquier texto visible sigue siendo el `Fallo` del ataque original.
  const end = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    end.events.filter((event) => event.type === 'ReplicaPerformed'),
  ).toHaveLength(1);
  await advanceToCue(page, 'replica');
  await page.evaluate(() => window.__game!.advance(40));
  const replicaTexts = await page
    .locator('[data-damage-text]:visible')
    .allTextContents();
  expect(replicaTexts.every((text) => text === 'Fallo')).toBe(true);
  await expect(page.getByTestId('damage-feedback-2')).toBeHidden();
  await screenshot(page, 'attack-miss-replica', testInfo);
  await settle(page);
  expect(end.events.filter((event) => event.type === 'CommandRejected')).toEqual([]);
  const afterTurn = await snapshot(page);
  await moveCursorTo(page, afterTurn.enemies[0].x, afterTurn.enemies[0].y);
  // REQ-027: el segundo ataque puede encadenar muerte y fin de partida; se
  // muestrea su cue con el reloj de presentación para no depender del rAF real.
  // Un impacto normal sigue mostrando `-N`; la réplica no añade texto.
  const hitResult = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: afterTurn.enemies[0].id,
  });
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const hit = attackEvent(hitResult.events);
  expect(hit).toBeDefined();
  expect(hit!.hit).toBe(true);
  expect(hitResult.snapshot.enemies[0].hp).toBe(
    Math.max(0, afterTurn.enemies[0].hp - hit!.damage),
  );
  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${hit!.damage}`);
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute('data-result', 'hit');
  await settle(page);

  expect(consoleErrors).toEqual([]);
});

test('determinismo: dos cargas con la misma semilla y comandos', async ({ page }) => {
  const base = await openBspState(page, REFERENCE_SEED);
  const baseEnemy = base.enemies[0];
  const beside = floorNeighbor(base, baseEnemy.x, baseEnemy.y);
  expect(beside, 'El enemigo debe tener una casilla libre al lado').toBeDefined();

  const runScript = async () => {
    await openBspState(page, REFERENCE_SEED, undefined, {
      player: beside!,
      enemies: [baseEnemy],
    });
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

    if ((await snapshot(page)).status === 'playing') {
      await defeatAllEnemies(page);
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

  // REQ-027: la réplica del jugador armado mata a los enemigos que fallan y la
  // derrota deja de alcanzarse. Se acota el escenario con el jugador desarmado
  // por el hook de setup (sin tocar reglas): no puede replicar y un centinela
  // alerta adyacente consume sus turnos. Se conservan las aserciones del loop.
  const player = initial.players[0];
  const beside = floorNeighbor(initial, player.x, player.y);
  expect(beside, 'El jugador debe tener una casilla libre adyacente').toBeDefined();
  const sentinel = initial.enemies[0];
  const scopedEnemy = {
    ...sentinel,
    x: beside!.x,
    y: beside!.y,
    home: { ...beside! },
    mp: sentinel.maxMp,
    actions: { ...sentinel.actions, remaining: sentinel.actions.max },
    awareness: 'alert' as const,
    fleeing: false,
    lastKnown: { x: player.x, y: player.y },
    alertTurns: 0,
    hasShouted: true,
  };
  await openBspState(page, REFERENCE_SEED, undefined, {
    playerEquipment: { ...player.equipment, weaponId: null },
    playerWeapons: [],
    enemies: [scopedEnemy],
  });
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
        actions: { remaining: 2 },
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
    actions: { remaining: 2 },
  });
  await expect(page.getByTestId('overlay-defeat')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
