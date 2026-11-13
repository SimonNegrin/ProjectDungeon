import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BspMapGenerator,
  createInitialState,
  createPlayerFromArchetype,
  createRoomGrid,
  type GameState,
  type MagicLevel,
  type ResistanceProfile,
  type ShieldId,
  type Tile,
  type Unit,
} from '../../src/game/index';
import { bandFor } from '../../src/game/damage';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import {
  BAND_ICONS,
  BAND_LABELS,
  DAMAGE_TYPES,
  DAMAGE_TYPE_LABELS,
  formatProfile,
} from '../../src/host/damage-labels';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchFrozen,
  moveCursorTo,
  openBspState,
  openState,
  settle,
  snapshot,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;
const NORMAL_PROFILE: ResistanceProfile = {
  slash: 'normal',
  blunt: 'normal',
  pierce: 'normal',
  magic: 'normal',
  electric: 'normal',
};

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function attackEvent(events: readonly GameEvent[]) {
  const event = events.find(
    (candidate): candidate is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      candidate.type === 'AttackPerformed',
  );
  if (!event) throw new Error('Falta AttackPerformed');
  return event;
}

function spellEvent(events: readonly GameEvent[]) {
  const event = events.find(
    (candidate): candidate is Extract<GameEvent, { type: 'SpellCast' }> =>
      candidate.type === 'SpellCast',
  );
  if (!event) throw new Error('Falta SpellCast');
  return event;
}

function enemyOf(snap: GameSnapshot, type: 'sentinel' | 'brute'): Unit {
  const enemy = snap.enemies.find((candidate) => candidate.enemyType === type);
  if (!enemy) throw new Error(`La semilla debe colocar un ${type}`);
  return enemy;
}

function floorNeighbors(
  snap: GameSnapshot,
  cell: { readonly x: number; readonly y: number },
): Array<{ x: number; y: number }> {
  return [
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x - 1, y: cell.y },
  ].filter(
    (point) =>
      point.x >= 0 &&
      point.y >= 0 &&
      point.x < snap.grid.width &&
      point.y < snap.grid.height &&
      snap.grid.tiles[point.y * snap.grid.width + point.x] === 'floor',
  );
}

/** Posición del martillo de la semilla y dos casillas libres a su lado. */
async function hammerFixture(page: Page): Promise<{
  readonly cell: { x: number; y: number };
  readonly neighbors: Array<{ x: number; y: number }>;
  readonly sentinel: Unit;
  readonly brute: Unit;
}> {
  const base = await openBspState(page, SEED);
  const hammer = base.weapons.find((weapon) => weapon.weaponId === 'hammer');
  if (!hammer) throw new Error('La semilla de referencia debe colocar el martillo');
  const neighbors = floorNeighbors(base, hammer);
  if (neighbors.length < 2) {
    throw new Error('El martillo necesita dos casillas libres adyacentes');
  }
  return {
    cell: { x: hammer.x, y: hammer.y },
    neighbors,
    sentinel: enemyOf(base, 'sentinel'),
    brute: enemyOf(base, 'brute'),
  };
}

function positioned(
  template: Unit,
  id: string,
  position: { readonly x: number; readonly y: number },
  patch: Partial<Unit> = {},
): Unit {
  return {
    ...template,
    id,
    x: position.x,
    y: position.y,
    home: { ...position },
    hp: 40,
    maxHp: 40,
    ...patch,
  };
}

/**
 * Escenario de presentación con un enemigo a la vista y otro tras un muro. El
 * muro es la única geometría añadida: las bandas dependen de `hasLineOfSight`
 * del motor, no de una fórmula del test.
 */
function bandScenario(): GameState {
  const grid = createRoomGrid(24, 24);
  const tiles = [...grid.tiles] as Tile[];
  for (let y = 4; y <= 6; y += 1) tiles[y * grid.width + 10] = 'wall';

  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.enemies.find((enemy) => enemy.enemyType === 'sentinel');
  if (!template) throw new Error('El bestiario debe aportar un centinela');
  const warrior = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  const player: Unit = {
    ...warrior,
    equipment: { ...warrior.equipment, weaponId: 'hammer' },
    weapons: ['hammer'],
  };
  const visible = positioned(template, 'enemy-1', { x: 6, y: 5 }, {
    equipment: { ...template.equipment, shieldId: null },
    stats: { ...template.stats, resistencia: NORMAL_PROFILE },
  });
  const hidden = positioned(template, 'enemy-2', { x: 12, y: 5 }, {
    equipment: { ...template.equipment, shieldId: null },
    stats: {
      ...template.stats,
      resistencia: {
        slash: 'vulnerable',
        blunt: 'resistant',
        pierce: 'very-resistant',
        magic: 'resistant',
        electric: 'vulnerable',
      },
    },
  });

  return {
    grid: { ...grid, tiles },
    players: [player],
    enemies: [visible, hidden],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: { seed: SEED, state: 1 },
  };
}

interface MageOptions {
  readonly magicLevel?: MagicLevel;
  readonly manaMax?: number;
  readonly actions?: number;
  readonly enemyShield?: ShieldId | null;
  readonly enemyResistance?: ResistanceProfile;
  readonly allyHp?: number;
  readonly withCorpse?: boolean;
  readonly rngState?: number;
}

/**
 * Mago, aliado dañado, cadáver opcional y un enemigo a distancia 3. Solo reúne
 * unidades y una rejilla vacía: no cambia reglas ni valores del catálogo.
 */
function mageScenario(options: MageOptions = {}): GameState {
  const level = options.magicLevel ?? 4;
  const manaMax = options.manaMax ?? level * 4;
  const actions = options.actions ?? 3;
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.enemies.find((enemy) => enemy.enemyType === 'sentinel');
  if (!template) throw new Error('El bestiario debe aportar un centinela');

  const mage = createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  const mageUnit: Unit = {
    ...mage,
    hp: 20,
    maxHp: 20,
    mana: { current: manaMax, max: manaMax },
    stats: { ...mage.stats, magicLevel: level },
    actions: { max: actions, remaining: actions },
  };
  const ally = createPlayerFromArchetype('warrior', {
    id: 'player-2',
    position: { x: 7, y: 5 },
  });
  const allyUnit: Unit = { ...ally, hp: options.allyHp ?? 8 };
  const corpse = createPlayerFromArchetype('warrior', {
    id: 'player-3',
    position: { x: 4, y: 5 },
  });
  const corpseUnit: Unit = { ...corpse, hp: 0 };
  const enemy: Unit = {
    ...template,
    id: 'enemy-1',
    x: 8,
    y: 5,
    hp: 40,
    maxHp: 40,
    mana: { current: 5, max: 8 },
    stats: {
      ...template.stats,
      resistencia: options.enemyResistance ?? {
        electric: 'resistant',
        magic: 'vulnerable',
      },
    },
    equipment: {
      ...template.equipment,
      shieldId:
        options.enemyShield === undefined ? 'shield' : options.enemyShield,
    },
    awareness: 'dormant',
    fleeing: false,
    home: { x: 8, y: 5 },
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
    spellsCast: 0,
  };

  return {
    grid: createRoomGrid(24, 24),
    players: options.withCorpse ? [mageUnit, allyUnit, corpseUnit] : [mageUnit, allyUnit],
    enemies: [enemy],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: { seed: SEED, state: options.rngState ?? 0 },
  };
}

function expectedBandText(profile: ResistanceProfile, type: (typeof DAMAGE_TYPES)[number]): string {
  const band = bandFor(profile, type);
  return `${DAMAGE_TYPE_LABELS[type]} ${BAND_LABELS[band]} ${BAND_ICONS[band]}`;
}

for (const viewport of VIEWPORTS) {
  test(`bandas del cursor con y sin LOS, F1 y desglose (${viewport.width}×${viewport.height})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openState(page, bandScenario());

    const initial = await snapshot(page);
    const visible = initial.enemies[0];
    const hidden = initial.enemies[1];

    await moveCursorTo(page, visible.x, visible.y);
    await expect(page.getByTestId('hud-cursor-bands')).toBeVisible();
    for (const type of DAMAGE_TYPES) {
      await expect(page.getByTestId(`hud-cursor-band-${type}`)).toHaveText(
        expectedBandText(visible.stats.resistencia, type),
      );
    }
    await screenshot(page, `bandas-cursor-${viewport.width}x${viewport.height}`, testInfo);

    await moveCursorTo(page, hidden.x, hidden.y);
    await expect(page.getByTestId('hud-cursor-bands')).toBeHidden();
    await screenshot(
      page,
      `bandas-sin-los-${viewport.width}x${viewport.height}`,
      testInfo,
    );

    await page.keyboard.press('F1');
    await expect(page.getByTestId('debug-overlay')).toBeVisible();
    const debugText = (await page.getByTestId('debug-content').textContent()) ?? '';
    expect(debugText).toContain(
      `Enemigo bajo cursor: ${hidden.id} ${hidden.hp}/${hidden.maxHp} · bandas ${formatProfile(hidden.stats.resistencia)}`,
    );
    await screenshot(page, `debug-bandas-${viewport.width}x${viewport.height}`, testInfo);
    await page.keyboard.press('F1');

    // El desglose del ataque sigue el tipo del arma y la banda del objetivo.
    await moveCursorTo(page, visible.x, visible.y);
    const result = await dispatchFrozen(page, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: visible.id,
    });
    await advanceToCue(page, 'attack');
    await page.evaluate(() => window.__game!.advance(40));
    const attack = attackEvent(result.events);
    expect(attack.hit).toBe(true);
    expect(attack.damageBreakdown).toHaveLength(1);
    expect(attack.damageBreakdown[0].type).toBe('blunt');
    expect(attack.damageBreakdown[0].band).toBe('normal');
    await expect(page.getByTestId('damage-feedback')).toHaveText(`-${attack.damage}`);
    await expect(page.getByTestId('damage-feedback-detail')).toHaveText(
      `contundente ${attack.damageBreakdown[0].damage}`,
    );
    await screenshot(
      page,
      `desglose-normal-${viewport.width}x${viewport.height}`,
      testInfo,
    );
    await settle(page);
  });
}

test('arma nueva, bandas distintas y desglose por tipo en el feedback', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const fixture = await hammerFixture(page);
  const [east, south] = fixture.neighbors;
  const witness = positioned(fixture.sentinel, 'enemy-1', east, {
    equipment: { ...fixture.sentinel.equipment, armorId: null, shieldId: null },
    stats: { ...fixture.sentinel.stats, resistencia: NORMAL_PROFILE },
  });
  // El bruto conserva su perfil del bestiario: contundente resistente.
  const resistant = positioned(fixture.brute, 'enemy-2', south);

  await openBspState(page, SEED, undefined, {
    player: fixture.cell,
    enemies: [witness, resistant],
    rng: { seed: SEED, state: 0 },
  });
  const initial = await snapshot(page);
  expect(initial.weapons.some((weapon) => weapon.weaponId === 'hammer')).toBe(true);
  await expect(page.getByTestId('weapon-hint')).toContainText('G recoger Martillo');

  await page.keyboard.press('g');
  await settle(page);
  const picked = await snapshot(page);
  expect(picked.players[0].equipment.weaponId).toBe('hammer');
  expect(picked.players[0].weapons).toContain('hammer');
  expect(picked.weapons.some((weapon) => weapon.weaponId === 'hammer')).toBe(false);
  await expect(page.getByTestId('hud-weapon')).toContainText('Martillo');
  await screenshot(page, 'arma-nueva-martillo', testInfo);

  await moveCursorTo(page, witness.x, witness.y);
  const normalResult = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: witness.id,
  });
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const normalAttack = attackEvent(normalResult.events);
  expect(normalAttack.hit).toBe(true);
  const normalPacket = normalAttack.damageBreakdown[0];
  expect(normalPacket.type).toBe('blunt');
  expect(normalPacket.band).toBe('normal');
  expect(normalPacket.damage).toBeGreaterThan(0);
  await expect(page.getByTestId('damage-feedback')).toHaveText(`-${normalAttack.damage}`);
  await expect(page.getByTestId('damage-feedback-detail')).toHaveText(
    `contundente ${normalPacket.damage}`,
  );
  await screenshot(page, 'desglose-banda-normal', testInfo);
  await settle(page);

  await moveCursorTo(page, resistant.x, resistant.y);
  const resistantResult = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: resistant.id,
  });
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const resistantAttack = attackEvent(resistantResult.events);
  expect(resistantAttack.hit).toBe(true);
  const resistantPacket = resistantAttack.damageBreakdown[0];
  expect(resistantPacket.type).toBe('blunt');
  expect(resistantPacket.band).toBe('resistant');
  expect(resistantPacket.damage).toBeGreaterThan(0);
  expect(resistantPacket.damage).not.toBe(normalPacket.damage);
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${resistantAttack.damage}`,
  );
  await expect(page.getByTestId('damage-feedback-detail')).toHaveText(
    `contundente ${resistantPacket.damage}`,
  );
  await screenshot(page, 'desglose-banda-resistente', testInfo);
  await settle(page);
});

test('muy resistente conserva el mínimo 1 y no existe texto de inmunidad', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const fixture = await hammerFixture(page);
  const enemy = positioned(fixture.sentinel, 'enemy-1', fixture.neighbors[0], {
    equipment: { ...fixture.sentinel.equipment, armorId: 'plate', shieldId: null },
    stats: {
      ...fixture.sentinel.stats,
      resistencia: { ...NORMAL_PROFILE, blunt: 'very-resistant' },
    },
  });

  await openBspState(page, SEED, undefined, {
    player: fixture.cell,
    enemies: [enemy],
    rng: { seed: SEED, state: 25 },
    playerEquipment: { weaponId: 'hammer', armorId: null, shieldId: null },
    playerWeapons: ['hammer'],
  });
  await moveCursorTo(page, enemy.x, enemy.y);
  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  await advanceToCue(page, 'attack');
  await page.evaluate(() => window.__game!.advance(40));
  const attack = attackEvent(result.events);
  expect(attack.hit).toBe(true);
  expect(attack.damageBreakdown).toHaveLength(1);
  expect(attack.damageBreakdown[0].type).toBe('blunt');
  expect(attack.damageBreakdown[0].band).toBe('very-resistant');
  expect(attack.damageBreakdown[0].damage).toBe(0);
  expect(attack.damage).toBe(1);
  await expect(page.getByTestId('damage-feedback')).toHaveText('-1');
  await expect(page.getByTestId('damage-feedback-detail')).toBeHidden();

  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  expect(bodyText).not.toMatch(/inmun/);
  expect(JSON.stringify(await snapshot(page)).toLowerCase()).not.toContain('inmun');
  await screenshot(page, 'muy-resistente-minimo-1', testInfo);
  await settle(page);
});

interface ElectricScenarioOptions {
  readonly armorId: 'armor' | 'plate' | null;
  readonly shieldId: ShieldId | null;
  readonly rngState: number;
}

async function openElectricSwordRun(
  page: Page,
  fixture: Awaited<ReturnType<typeof hammerFixture>>,
  options: ElectricScenarioOptions,
): Promise<GameSnapshot> {
  const enemy = positioned(fixture.sentinel, 'enemy-1', fixture.neighbors[0], {
    equipment: {
      ...fixture.sentinel.equipment,
      armorId: options.armorId,
      shieldId: options.shieldId,
    },
    stats: { ...fixture.sentinel.stats, resistencia: NORMAL_PROFILE },
  });
  return openBspState(page, SEED, undefined, {
    player: fixture.cell,
    enemies: [enemy],
    rng: { seed: SEED, state: options.rngState },
    playerEquipment: { weaponId: 'electric-sword', armorId: null, shieldId: null },
    playerWeapons: ['electric-sword'],
  });
}

function packetOf(
  event: Extract<GameEvent, { type: 'AttackPerformed' }>,
  type: 'slash' | 'electric',
) {
  const packet = event.damageBreakdown.find((candidate) => candidate.type === type);
  if (!packet) throw new Error(`Falta el paquete ${type}`);
  return packet;
}

test('armadura: reduce el paquete físico y no el eléctrico', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const fixture = await hammerFixture(page);

  await openElectricSwordRun(page, fixture, {
    armorId: 'plate',
    shieldId: null,
    rngState: 1,
  });
  const armored = attackEvent(
    (
      await dispatchFrozen(page, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      })
    ).events,
  );

  await openElectricSwordRun(page, fixture, {
    armorId: null,
    shieldId: null,
    rngState: 1,
  });
  const bare = attackEvent(
    (
      await dispatchFrozen(page, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      })
    ).events,
  );

  expect(armored.hit).toBe(true);
  expect(bare.hit).toBe(true);
  expect(packetOf(armored, 'electric').damage).toBe(
    packetOf(bare, 'electric').damage,
  );
  expect(packetOf(armored, 'slash').damage).toBeLessThan(
    packetOf(bare, 'slash').damage,
  );
});

test('escudo: cambia el impacto de un ataque mixto y de un hechizo', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const fixture = await hammerFixture(page);

  await openElectricSwordRun(page, fixture, {
    armorId: null,
    shieldId: 'shield',
    rngState: 13,
  });
  const shielded = attackEvent(
    (
      await dispatchFrozen(page, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      })
    ).events,
  );
  await openElectricSwordRun(page, fixture, {
    armorId: null,
    shieldId: null,
    rngState: 13,
  });
  const unshielded = attackEvent(
    (
      await dispatchFrozen(page, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      })
    ).events,
  );
  expect(shielded.hit).toBe(false);
  expect(shielded.damageBreakdown).toEqual([]);
  expect(unshielded.hit).toBe(true);
  expect(unshielded.damageBreakdown.length).toBeGreaterThan(0);
  await screenshot(page, 'escudo-impacto-arma', testInfo);

  // El hechizo usa la misma tirada de impacto: con la misma secuencia, el
  // escudo convierte el impacto en fallo.
  await openState(
    page,
    mageScenario({
      magicLevel: 1,
      manaMax: 4,
      enemyShield: 'shield',
      rngState: 7,
    }),
  );
  const magicShielded = spellEvent(
    (
      await dispatchFrozen(page, {
        type: 'CastSpell',
        unitId: 'player-1',
        spellId: 'electric-1',
        target: { x: 8, y: 5 },
      })
    ).events,
  );
  await openState(
    page,
    mageScenario({
      magicLevel: 1,
      manaMax: 4,
      enemyShield: null,
      rngState: 7,
    }),
  );
  const magicUnshielded = spellEvent(
    (
      await dispatchFrozen(page, {
        type: 'CastSpell',
        unitId: 'player-1',
        spellId: 'electric-1',
        target: { x: 8, y: 5 },
      })
    ).events,
  );
  expect(magicShielded.effect).toBe('damage');
  expect('hit' in magicShielded && magicShielded.hit).toBe(false);
  expect(magicUnshielded.effect).toBe('damage');
  expect('hit' in magicUnshielded && magicUnshielded.hit).toBe(true);
  await screenshot(page, 'escudo-impacto-hechizo', testInfo);
});

test('hechizo eléctrico, hechizo de fuego, curación y resurrección sin desglose', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(
    page,
    mageScenario({ magicLevel: 4, manaMax: 16, actions: 3, rngState: 1 }),
  );

  const electricResult = await dispatchFrozen(page, {
    type: 'CastSpell',
    unitId: 'player-1',
    spellId: 'electric-1',
    target: { x: 8, y: 5 },
  });
  await advanceToCue(page, 'spell');
  await page.evaluate(() => window.__game!.advance(40));
  const electric = spellEvent(electricResult.events);
  expect(electric.effect).toBe('damage');
  if (electric.effect !== 'damage') throw new Error('Se esperaba daño eléctrico');
  expect(electric.hit).toBe(true);
  expect(electric.damageBreakdown[0].type).toBe('electric');
  expect(electric.damageBreakdown[0].band).toBe('resistant');
  await expect(page.getByTestId('damage-feedback-detail')).toHaveText(
    `eléctrico ${electric.damageBreakdown[0].damage}`,
  );
  await screenshot(page, 'hechizo-electrico-banda', testInfo);
  await settle(page);

  const fireResult = await dispatchFrozen(page, {
    type: 'CastSpell',
    unitId: 'player-1',
    spellId: 'fire-2',
    target: { x: 8, y: 5 },
  });
  await advanceToCue(page, 'spell');
  await page.evaluate(() => window.__game!.advance(40));
  const fire = spellEvent(fireResult.events);
  expect(fire.effect).toBe('damage');
  if (fire.effect !== 'damage') throw new Error('Se esperaba daño mágico');
  expect(fire.hit).toBe(true);
  expect(fire.damageBreakdown[0].type).toBe('magic');
  expect(fire.damageBreakdown[0].band).toBe('vulnerable');
  await expect(page.getByTestId('damage-feedback-detail')).toHaveText(
    `mágico ${fire.damageBreakdown[0].damage}`,
  );
  await screenshot(page, 'hechizo-fuego-banda', testInfo);
  await settle(page);

  await openState(
    page,
    mageScenario({
      magicLevel: 4,
      manaMax: 16,
      actions: 3,
      allyHp: 8,
      withCorpse: true,
    }),
  );
  const healResult = await dispatchFrozen(page, {
    type: 'CastSpell',
    unitId: 'player-1',
    spellId: 'healing-3',
    target: { x: 7, y: 5 },
  });
  await advanceToCue(page, 'spell');
  await page.evaluate(() => window.__game!.advance(40));
  const heal = spellEvent(healResult.events);
  expect(heal.effect).toBe('heal');
  expect('damageBreakdown' in heal).toBe(false);
  await expect(page.getByTestId('damage-feedback-detail')).toBeHidden();
  await settle(page);

  const resurrectResult = await dispatchFrozen(page, {
    type: 'CastSpell',
    unitId: 'player-1',
    spellId: 'resurrection-4',
    target: { x: 4, y: 5 },
  });
  await advanceToCue(page, 'spell');
  await page.evaluate(() => window.__game!.advance(40));
  const resurrect = spellEvent(resurrectResult.events);
  expect(resurrect.effect).toBe('resurrect');
  expect('damageBreakdown' in resurrect).toBe(false);
  await expect(page.getByTestId('damage-feedback-detail')).toBeHidden();
  await screenshot(page, 'curacion-resurreccion-sin-desglose', testInfo);
  await settle(page);
});
