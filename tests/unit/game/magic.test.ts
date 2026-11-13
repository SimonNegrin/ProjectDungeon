import { describe, expect, it, vi } from 'vitest';
import {
  MAX_SPELLS_PER_TURN,
  SPELLS,
  bandFor,
  createRng,
  findSpell,
  manaMaxFor,
  reduce,
  resolveHit,
  resolvePacket,
  shieldValue,
  type Command,
  type GameState,
  type RejectionReason,
  type SpellDefinition,
  type SpellId,
  type Unit,
} from '../../../src/game/index';
import {
  advanceRng,
  makeGridWithWalls,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

type UnitOptions = Partial<Parameters<typeof makeUnit>[0]>;

const FIRE = findSpell('fire-2')!;
const ELECTRIC = findSpell('electric-3')!;
const HEAL = findSpell('healing-3')!;
const RESURRECT = findSpell('resurrection-4')!;

function mage(overrides: UnitOptions = {}): Unit {
  return makeUnit({
    id: 'player-1',
    faction: 'player',
    x: 5,
    y: 5,
    magicLevel: 4,
    mana: { current: 16, max: 16 },
    actionsMax: 3,
    actions: 3,
    equipment: { weaponId: null, armorId: null, shieldId: null },
    ...overrides,
  });
}

function dummy(overrides: UnitOptions = {}): Unit {
  return makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    x: 8,
    y: 5,
    maxHp: 40,
    hp: 40,
    stats: { defensa: 1, resistencia: {} },
    equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
    ...overrides,
  });
}

function ally(overrides: UnitOptions = {}): Unit {
  return makeUnit({
    id: 'player-2',
    faction: 'player',
    x: 7,
    y: 5,
    maxHp: 20,
    hp: 10,
    ...overrides,
  });
}

function cast(
  state: GameState,
  spell: SpellDefinition,
  target: { x: number; y: number },
  unitId = 'player-1',
): ReturnType<typeof reduce> {
  return reduce(state, {
    type: 'CastSpell',
    unitId,
    spellId: spell.id,
    target,
  });
}

function reasonOf(result: ReturnType<typeof reduce>): RejectionReason | undefined {
  const event = result.events[0];
  return event?.type === 'CommandRejected' ? event.reason : undefined;
}

function expectRejected(
  before: GameState,
  result: ReturnType<typeof reduce>,
  reason: RejectionReason,
): void {
  expect(result.state).toBe(before);
  expect(result.events).toEqual([
    { type: 'CommandRejected', commandType: 'CastSpell', reason },
  ]);
  expect(result.state.rng).toBe(before.rng);
}

function healAmount(spell: SpellDefinition): number {
  return spell.effect.kind === 'heal' ? spell.effect.amount : 0;
}

function attackDamage(
  spell: SpellDefinition,
  victim: Unit,
  damageDie: number,
  resistanceDie: number,
): number {
  const packet = spell.damagePacket;
  if (packet === null) throw new Error('hechizo sin paquete de daño');
  const band = bandFor(victim.stats.resistencia, packet.type);
  return Math.max(1, resolvePacket(packet, 0, 0, band, damageDie, resistanceDie));
}

function hits(
  spell: SpellDefinition,
  caster: Unit,
  victim: Unit,
  attackDie: number,
  shieldDie: number,
): boolean {
  return resolveHit(
    caster.stats.magicLevel + spell.accuracy,
    victim.stats.defensa + shieldValue(victim.equipment.shieldId),
    attackDie,
    shieldDie,
  );
}

describe('catálogo de hechizos', () => {
  it('es dato serializable con seis hechizos y todos los campos', () => {
    const spells = Object.values(SPELLS);

    expect(spells).toHaveLength(6);
    for (const spell of spells) {
      expect(SPELLS[spell.id]).toBe(spell);
      expect(JSON.parse(JSON.stringify(spell))).toEqual(spell);
      expect(spell.name.length).toBeGreaterThan(0);
      expect(spell.range.min).toBeGreaterThanOrEqual(1);
      expect(spell.range.max).toBeGreaterThanOrEqual(spell.range.min);
      expect(Number.isInteger(spell.cost)).toBe(true);
      expect(spell.cost).toBeGreaterThan(0);
      expect(spell.minLevel).toBeGreaterThanOrEqual(1);
      expect(spell.minLevel).toBeLessThanOrEqual(4);
      expect(spell.presentation.cue.length).toBeGreaterThan(0);
      expect(spell.presentation.label.length).toBeGreaterThan(0);
    }
  });

  it('cubre un ataque por nivel 1–4 con fuego y eléctrico', () => {
    const attacks = Object.values(SPELLS).filter(
      (spell) => spell.target === 'enemy',
    );

    for (let level = 1; level <= 4; level += 1) {
      expect(
        attacks.some((spell) => spell.minLevel === level),
        `nivel ${level}`,
      ).toBe(true);
    }
    expect(new Set(attacks.map((spell) => spell.family))).toEqual(
      new Set(['fire', 'electric']),
    );
  });

  it('la curación es aliado a 2–3 y la resurrección exige nivel 4 y coste 8', () => {
    const heals = Object.values(SPELLS).filter(
      (spell) => spell.effect.kind === 'heal',
    );
    const resurrections = Object.values(SPELLS).filter(
      (spell) => spell.effect.kind === 'resurrect',
    );

    expect(heals).toHaveLength(1);
    expect(heals[0].target).toBe('ally');
    expect(heals[0].range).toEqual({ min: 2, max: 3 });

    expect(resurrections).toHaveLength(1);
    expect(resurrections[0].target).toBe('corpse');
    expect(resurrections[0].minLevel).toBe(4);
    expect(resurrections[0].cost).toBe(8);
    expect(resurrections[0].effect).toMatchObject({
      kind: 'resurrect',
      hpRatio: 0.6,
      minHp: 1,
    });
  });

  it('findSpell no inventa hechizos', () => {
    expect(findSpell('fire-2')).toBe(SPELLS['fire-2']);
    expect(findSpell('missing')).toBeUndefined();
  });

  it('los hechizos de daño declaran tipo y la curación/resurrección no declaran paquete', () => {
    expect(FIRE.damagePacket).toEqual({ type: 'magic', amount: 5 });
    expect(ELECTRIC.damagePacket?.type).toBe('electric');
    expect(HEAL.damagePacket).toBeNull();
    expect(RESURRECT.damagePacket).toBeNull();
  });
});

describe('validación atómica del lanzamiento', () => {
  it('rechaza un hechizo desconocido sin consumir nada', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
    });
    const result = reduce(state, {
      type: 'CastSpell',
      unitId: 'player-1',
      spellId: 'missing' as SpellId,
      target: { x: 8, y: 5 },
    });

    expectRejected(state, result, 'unknown-spell');
  });

  it('rechaza un lanzador inexistente o muerto', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
    });
    const unknown = cast(state, FIRE, { x: 8, y: 5 }, 'player-999');
    expectRejected(state, unknown, 'unknown-unit');

    const deadState = makeState({
      players: [mage({ hp: 0 })],
      enemies: [dummy()],
    });
    const dead = cast(deadState, FIRE, { x: 8, y: 5 });
    expectRejected(deadState, dead, 'dead-unit');
  });

  it('rechaza que un enemigo lance en fase de jugador sin consumir nada', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
    });
    const result = reduce(state, {
      type: 'CastSpell',
      unitId: 'enemy-1',
      spellId: FIRE.id,
      target: { x: 8, y: 5 },
    });

    expectRejected(state, result, 'unknown-unit');
    expect(result.state.enemies[0]).toBe(state.enemies[0]);
  });

  it('rechaza fuera de la fase del jugador', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
      phase: 'enemy',
    });
    const result = cast(state, FIRE, { x: 8, y: 5 });

    expectRejected(state, result, 'wrong-phase');
  });

  it('rechaza sin acción sin gastar maná, RNG ni cupo', () => {
    const state = makeState({
      players: [mage({ actions: 0 })],
      enemies: [dummy()],
    });
    const result = cast(state, FIRE, { x: 8, y: 5 });

    expectRejected(state, result, 'no-action');
    expect(result.state.players[0]).toMatchObject({
      mana: { current: 16, max: 16 },
      spellsCast: 0,
    });
  });

  it('rechaza sin maná suficiente sin gastar acción', () => {
    const state = makeState({
      players: [
        mage({ mana: { current: FIRE.cost - 1, max: 16 } }),
      ],
      enemies: [dummy()],
    });
    const result = cast(state, FIRE, { x: 8, y: 5 });

    expectRejected(state, result, 'no-mana');
    expect(result.state.players[0].actions.remaining).toBe(3);
  });

  it('rechaza por nivel de magia insuficiente', () => {
    const state = makeState({
      players: [
        mage({
          magicLevel: 1,
          mana: { current: 8, max: 8 },
        }),
      ],
      enemies: [dummy()],
    });
    const result = cast(state, FIRE, { x: 8, y: 5 });

    expectRejected(state, result, 'insufficient-level');
  });

  it('rechaza objetivo inexistente, muerto o de la misma facción', () => {
    const state = makeState({
      players: [mage(), ally()],
      enemies: [dummy()],
    });

    const empty = cast(state, FIRE, { x: 12, y: 12 });
    expectRejected(state, empty, 'target-not-found');

    const deadState = makeState({
      players: [mage()],
      enemies: [dummy({ hp: 0 })],
    });
    const dead = cast(deadState, FIRE, { x: 8, y: 5 });
    expectRejected(deadState, dead, 'target-dead');

    const friendly = cast(state, FIRE, { x: 7, y: 5 });
    expectRejected(state, friendly, 'same-faction');
  });

  it('rechaza fuera de alcance usando el alcance del catálogo', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy({ x: 5 + FIRE.range.max + 1, y: 5 })],
    });
    const result = cast(state, FIRE, { x: 5 + FIRE.range.max + 1, y: 5 });

    expectRejected(state, result, 'out-of-range');
  });

  it('rechaza sin línea de visión cuando un muro se interpone', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [mage()],
      enemies: [dummy({ x: 8, y: 5 })],
    });
    const result = cast(state, FIRE, { x: 8, y: 5 });

    expectRejected(state, result, 'no-line-of-sight');
  });

  it('rechaza el tercer hechizo por tope con acciones de sobra', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
    });

    const first = cast(state, FIRE, { x: 8, y: 5 });
    const second = cast(first.state, FIRE, { x: 8, y: 5 });
    const third = cast(second.state, FIRE, { x: 8, y: 5 });

    expect(reasonOf(first)).toBeUndefined();
    expect(reasonOf(second)).toBeUndefined();
    expect(second.state.players[0]).toMatchObject({
      mana: { current: 16 - FIRE.cost * 2, max: 16 },
      actions: { remaining: 1 },
      spellsCast: MAX_SPELLS_PER_TURN,
    });
    expectRejected(second.state, third, 'spell-limit');
  });
});

describe('ataque mágico', () => {
  it('Fuego II impacta y daña con el paquete mágico del catálogo, ignorando la armadura', () => {
    const caster = mage();
    const victim = dummy();
    const dice = [6, 1, 3, 2] as const;
    const state = makeState({
      players: [caster],
      enemies: [victim],
      rng: rngForDice(dice),
    });
    const damage = attackDamage(FIRE, victim, dice[2], dice[3]);

    expect(hits(FIRE, caster, victim, dice[0], dice[1])).toBe(true);

    const result = cast(state, FIRE, { x: victim.x, y: victim.y });

    expect(result.state.enemies[0].hp).toBe(victim.hp - damage);
    expect(result.state.players[0]).toMatchObject({
      mana: { current: 16 - FIRE.cost, max: 16 },
      actions: { remaining: 2 },
      spellsCast: 1,
    });
    expect(result.state.rng).toEqual(advanceRng(state.rng, dice));
    expect(result.events).toEqual([
      {
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: FIRE.id,
        targetId: 'enemy-1',
        target: { x: victim.x, y: victim.y },
        effect: 'damage',
        hit: true,
        damage,
        targetHp: victim.hp - damage,
        rolls: { attack: dice[0], shield: dice[1], damage: dice[2], armor: dice[3] },
      },
    ]);
  });

  it('el empate falla y no tira daño', () => {
    const caster = mage();
    const victim = dummy();
    const attackDie = 3;
    const shieldDie = 5;
    expect(hits(FIRE, caster, victim, attackDie, shieldDie)).toBe(false);

    const state = makeState({
      players: [caster],
      enemies: [victim],
      rng: rngForDice([attackDie, shieldDie]),
    });
    const result = cast(state, FIRE, { x: victim.x, y: victim.y });

    expect(result.state.enemies[0].hp).toBe(victim.hp);
    expect(result.state.rng).toEqual(advanceRng(state.rng, [attackDie, shieldDie]));
    expect(result.events).toEqual([
      {
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: FIRE.id,
        targetId: 'enemy-1',
        target: { x: victim.x, y: victim.y },
        effect: 'damage',
        hit: false,
        damage: 0,
        targetHp: victim.hp,
        rolls: { attack: attackDie, shield: shieldDie, damage: null, armor: null },
      },
    ]);
  });

  it('el nivel de magia y el acierto del hechizo deciden el impacto', () => {
    const caster = mage();
    const victim = dummy();
    const dice = [1, 3] as const;

    expect(hits(FIRE, caster, victim, dice[0], dice[1])).toBe(false);
    expect(hits(ELECTRIC, caster, victim, dice[0], dice[1])).toBe(true);

    const state = makeState({
      players: [caster],
      enemies: [victim],
      rng: rngForDice([...dice, 3, 2, ...dice, 3, 2]),
    });
    const fire = cast(state, FIRE, { x: victim.x, y: victim.y });
    const electric = cast(fire.state, ELECTRIC, { x: victim.x, y: victim.y });

    expect(fire.events[0]).toMatchObject({ effect: 'damage', hit: false });
    expect(electric.events[0]).toMatchObject({ effect: 'damage', hit: true });
  });

  it('fuego y eléctrico declaran tipos distintos y usan acierto y cantidad del catálogo', () => {
    const caster = mage();
    const victim = dummy();
    const dice = [6, 1, 3, 2] as const;

    function damageWith(spell: SpellDefinition, rng: ReturnType<typeof rngForDice>) {
      const state = makeState({
        players: [caster],
        enemies: [victim],
        rng,
      });
      const result = cast(state, spell, { x: victim.x, y: victim.y });
      return result.events[0];
    }

    const fire = damageWith(FIRE, rngForDice(dice));
    const electric = damageWith(ELECTRIC, rngForDice(dice));
    const expectedFire = attackDamage(FIRE, victim, dice[2], dice[3]);
    const expectedElectric = attackDamage(ELECTRIC, victim, dice[2], dice[3]);

    expect(fire).toMatchObject({ effect: 'damage', hit: true, damage: expectedFire });
    expect(electric).toMatchObject({
      effect: 'damage',
      hit: true,
      damage: expectedElectric,
    });
    expect(FIRE.accuracy).not.toBe(ELECTRIC.accuracy);
    expect(FIRE.damagePacket?.type).toBe('magic');
    expect(ELECTRIC.damagePacket?.type).toBe('electric');
    expect(FIRE.damagePacket?.amount).not.toBe(ELECTRIC.damagePacket?.amount);
  });

  it('el daño mágico ignora la armadura y aplica la banda mágica del objetivo', () => {
    const caster = mage();
    const unarmored = dummy({
      equipment: { weaponId: 'sword', armorId: null, shieldId: null },
    });
    const armored = dummy({
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: null },
    });
    const magicResistant = dummy({
      stats: { defensa: 1, resistencia: { magic: 'resistant' } },
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: null },
    });
    const dice = [6, 1, 3, 2] as const;

    function damageAgainst(victim: Unit) {
      const state = makeState({
        players: [caster],
        enemies: [victim],
        rng: rngForDice(dice),
      });
      const result = cast(state, FIRE, { x: victim.x, y: victim.y });
      return result.events[0];
    }

    const unarmoredHit = damageAgainst(unarmored);
    const armoredHit = damageAgainst(armored);
    const resistantHit = damageAgainst(magicResistant);

    expect(unarmoredHit).toMatchObject({
      effect: 'damage',
      damage: attackDamage(FIRE, unarmored, dice[2], dice[3]),
    });
    expect(armoredHit).toMatchObject({
      effect: 'damage',
      damage: attackDamage(FIRE, armored, dice[2], dice[3]),
    });
    expect(resistantHit).toMatchObject({
      effect: 'damage',
      damage: attackDamage(FIRE, magicResistant, dice[2], dice[3]),
    });

    // La armadura no reduce el daño mágico: con y sin armadura es idéntico.
    expect(attackDamage(FIRE, unarmored, dice[2], dice[3])).toBe(
      attackDamage(FIRE, armored, dice[2], dice[3]),
    );
    // La banda resistente reduce el daño tras la absorción.
    expect(attackDamage(FIRE, magicResistant, dice[2], dice[3])).toBeLessThan(
      attackDamage(FIRE, armored, dice[2], dice[3]),
    );
  });

  it('un hechizo eléctrico aplica la banda eléctrica del objetivo', () => {
    const caster = mage();
    const normal = dummy({
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: null },
    });
    const electricResistant = dummy({
      stats: { defensa: 1, resistencia: { electric: 'resistant' } },
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: null },
    });
    const dice = [6, 1, 3, 2] as const;

    function damageAgainst(victim: Unit) {
      const state = makeState({
        players: [caster],
        enemies: [victim],
        rng: rngForDice(dice),
      });
      const result = cast(state, ELECTRIC, { x: victim.x, y: victim.y });
      return result.events[0];
    }

    const normalHit = damageAgainst(normal);
    const resistantHit = damageAgainst(electricResistant);

    expect(normalHit).toMatchObject({
      effect: 'damage',
      damage: attackDamage(ELECTRIC, normal, dice[2], dice[3]),
    });
    expect(resistantHit).toMatchObject({
      effect: 'damage',
      damage: attackDamage(ELECTRIC, electricResistant, dice[2], dice[3]),
    });
    expect(attackDamage(ELECTRIC, electricResistant, dice[2], dice[3])).toBeLessThan(
      attackDamage(ELECTRIC, normal, dice[2], dice[3]),
    );
  });

  it('los proyectiles no atraviesan muros pero sí ignoran unidades', () => {
    const walled = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [mage()],
      enemies: [dummy({ x: 7, y: 5 })],
    });
    expect(reasonOf(cast(walled, FIRE, { x: 7, y: 5 }))).toBe('no-line-of-sight');

    const throughAlly = makeState({
      players: [mage(), ally({ x: 6, y: 5 })],
      enemies: [dummy({ x: 7, y: 5 })],
      rng: rngForDice([6, 1, 3, 2]),
    });
    const result = cast(throughAlly, FIRE, { x: 7, y: 5 });

    expect(reasonOf(result)).toBeUndefined();
    expect(result.events[0]).toMatchObject({ effect: 'damage', hit: true });
  });

  it('la magia no abre réplica al fallar contra un enemigo armado', () => {
    const caster = mage();
    const victim = dummy({
      x: 6,
      y: 5,
      awareness: 'alert',
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
    });
    const state = makeState({
      players: [caster],
      enemies: [victim],
      rng: rngForDice([3, 5]),
    });

    const result = cast(state, FIRE, { x: 6, y: 5 });

    expect(result.events.map((event) => event.type)).toEqual(['SpellCast']);
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: 'ReplicaPerformed' }),
    );
  });

  it('un impacto mágico a un enemigo reutiliza su reacción de daño sin réplica', () => {
    const caster = mage();
    const victim = dummy({
      enemyType: 'sentinel',
      x: 6,
      y: 5,
      awareness: 'dormant',
    });
    const state = makeState({
      players: [caster],
      enemies: [victim],
      rng: rngForDice([6, 1, 3, 2]),
    });

    const result = cast(state, ELECTRIC, { x: 6, y: 5 });

    expect(result.events.map((event) => event.type)).toEqual([
      'SpellCast',
      'AlarmRaised',
    ]);
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 5, y: 5 },
    });
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ type: 'ReplicaPerformed' }),
    );
  });

  it('matar al último enemigo con magia cierra la partida', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy({ hp: 1 })],
      rng: rngForDice([6, 1, 3, 2]),
    });

    const result = cast(state, FIRE, { x: 8, y: 5 });

    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.status).toBe('victory');
    expect(result.events.map((event) => event.type)).toEqual([
      'SpellCast',
      'UnitDied',
      'GameEnded',
    ]);
  });
});

describe('curación', () => {
  it('cura al aliado a 2–3 casillas sin tirar dados', () => {
    const manaMax = manaMaxFor(HEAL.minLevel);
    const caster = mage({
      magicLevel: HEAL.minLevel,
      mana: { current: manaMax, max: manaMax },
    });
    const target = ally({ x: 5 + HEAL.range.min, y: 5, hp: 10, maxHp: 20 });
    const state = makeState({
      players: [caster, target],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    const amount = healAmount(HEAL);

    const result = cast(state, HEAL, { x: target.x, y: target.y });

    expect(result.state.rng).toBe(state.rng);
    expect(result.state.players[0]).toMatchObject({
      mana: { current: manaMax - HEAL.cost, max: manaMax },
      actions: { remaining: caster.actions.max - 1 },
      spellsCast: 1,
    });
    expect(result.state.players[1].hp).toBe(10 + amount);
    expect(result.events).toEqual([
      {
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: HEAL.id,
        targetId: 'player-2',
        target: { x: target.x, y: target.y },
        effect: 'heal',
        healing: amount,
        targetHp: 10 + amount,
      },
    ]);
  });

  it('no supera el PV máximo y no cura a sí mismo ni a enemigos', () => {
    const manaMax = manaMaxFor(HEAL.minLevel);
    const caster = mage({
      magicLevel: HEAL.minLevel,
      mana: { current: manaMax, max: manaMax },
    });
    const nearMax = ally({ x: 7, y: 5, hp: 18, maxHp: 20 });
    const state = makeState({
      players: [caster, nearMax],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const capped = cast(state, HEAL, { x: 7, y: 5 });
    expect(capped.events[0]).toMatchObject({
      effect: 'heal',
      healing: Math.min(healAmount(HEAL), 20 - 18),
      targetHp: 20,
    });

    const self = cast(state, HEAL, { x: 5, y: 5 });
    expectRejected(state, self, 'invalid-target');

    const enemy = cast(state, HEAL, { x: 18, y: 18 });
    expectRejected(state, enemy, 'invalid-target');

    const deadAlly = makeState({
      players: [caster, ally({ x: 7, y: 5, hp: 0 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    const dead = cast(deadAlly, HEAL, { x: 7, y: 5 });
    expectRejected(deadAlly, dead, 'target-dead');
  });

  it('rechaza aliados a 1 o 4 casillas y sin línea de visión', () => {
    const manaMax = manaMaxFor(HEAL.minLevel);
    const caster = mage({
      magicLevel: HEAL.minLevel,
      mana: { current: manaMax, max: manaMax },
    });
    const tooClose = makeState({
      players: [caster, ally({ x: 6, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(tooClose, cast(tooClose, HEAL, { x: 6, y: 5 }), 'out-of-range');

    const tooFar = makeState({
      players: [caster, ally({ x: 9, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(tooFar, cast(tooFar, HEAL, { x: 9, y: 5 }), 'out-of-range');

    const walled = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [caster, ally({ x: 7, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(walled, cast(walled, HEAL, { x: 7, y: 5 }), 'no-line-of-sight');
  });
});

describe('resurrección', () => {
  function deadPlayer(overrides: UnitOptions = {}): Unit {
    return makeUnit({
      id: 'player-2',
      faction: 'player',
      x: 6,
      y: 5,
      hp: 0,
      maxHp: 14,
      ...overrides,
    });
  }

  it('devuelve al jugador con el 60 % del PV máximo, redondeado hacia arriba', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const corpse = deadPlayer();
    const state = makeState({
      players: [caster, corpse],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    const expectedHp = Math.max(
      (RESURRECT.effect as { minHp: number }).minHp,
      Math.ceil(
        (RESURRECT.effect as { hpRatio: number }).hpRatio * corpse.maxHp,
      ),
    );

    const result = cast(state, RESURRECT, { x: 6, y: 5 });

    expect(result.state.rng).toBe(state.rng);
    expect(result.state.players).toHaveLength(2);
    expect(result.state.players[1]).toMatchObject({
      id: 'player-2',
      x: 6,
      y: 5,
      hp: expectedHp,
    });
    expect(result.state.players[0]).toMatchObject({
      mana: { current: 0, max: 16 },
      actions: { remaining: 2 },
      spellsCast: 1,
    });
    expect(result.events).toEqual([
      {
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: RESURRECT.id,
        targetId: 'player-2',
        target: { x: 6, y: 5 },
        effect: 'resurrect',
        targetHp: expectedHp,
      },
    ]);
  });

  it('el PV de vuelta nunca baja de 1', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const state = makeState({
      players: [caster, deadPlayer({ maxHp: 1 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const result = cast(state, RESURRECT, { x: 6, y: 5 });

    expect(result.state.players[1].hp).toBe(1);
  });

  it('permite dos resurrecciones en el mismo turno (sin tope propio)', () => {
    const caster = mage({
      actionsMax: 2,
      actions: 2,
      mana: { current: 16, max: 16 },
    });
    const state = makeState({
      players: [
        caster,
        deadPlayer(),
        deadPlayer({ id: 'player-3', x: 6, y: 6 }),
      ],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const first = cast(state, RESURRECT, { x: 6, y: 5 });
    const second = cast(first.state, RESURRECT, { x: 6, y: 6 });

    expect(reasonOf(first)).toBeUndefined();
    expect(reasonOf(second)).toBeUndefined();
    expect(second.state.players[0]).toMatchObject({
      mana: { current: 0, max: 16 },
      actions: { remaining: 0 },
      spellsCast: 2,
    });
    expect(second.state.players.filter((unit) => unit.hp > 0)).toHaveLength(3);
  });

  it('rechaza sin nivel, sin maná, sin adyacencia y sin cadáver', () => {
    const lowLevel = mage({
      magicLevel: 3,
      mana: { current: 8, max: 12 },
    });
    const levelState = makeState({
      players: [lowLevel, deadPlayer()],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(levelState, cast(levelState, RESURRECT, { x: 6, y: 5 }), 'insufficient-level');

    const dry = mage({ mana: { current: RESURRECT.cost - 1, max: 16 } });
    const dryState = makeState({
      players: [dry, deadPlayer()],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(dryState, cast(dryState, RESURRECT, { x: 6, y: 5 }), 'no-mana');

    const far = makeState({
      players: [mage(), deadPlayer({ x: 7, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(far, cast(far, RESURRECT, { x: 7, y: 5 }), 'out-of-range');

    const empty = makeState({
      players: [mage(), deadPlayer()],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(empty, cast(empty, RESURRECT, { x: 9, y: 9 }), 'target-not-found');
  });

  it('rechaza la casilla con un vivo de cualquier facción y el cadáver enemigo', () => {
    const blockedByAlly = makeState({
      players: [mage(), deadPlayer(), ally({ x: 6, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(
      blockedByAlly,
      cast(blockedByAlly, RESURRECT, { x: 6, y: 5 }),
      'occupied',
    );

    const blockedByEnemy = makeState({
      players: [mage(), deadPlayer()],
      enemies: [dummy({ x: 6, y: 5 })],
    });
    expectRejected(
      blockedByEnemy,
      cast(blockedByEnemy, RESURRECT, { x: 6, y: 5 }),
      'occupied',
    );

    const enemyCorpse = makeState({
      players: [mage()],
      enemies: [dummy({ x: 6, y: 5, hp: 0 })],
    });
    expectRejected(
      enemyCorpse,
      cast(enemyCorpse, RESURRECT, { x: 6, y: 5 }),
      'invalid-target',
    );
  });
});

describe('determinismo y cupo por turno', () => {
  it('misma semilla y comandos dan el mismo estado y eventos', () => {
    const state = makeState({
      players: [mage(), ally({ hp: 8 })],
      enemies: [dummy()],
      rng: createRng(4242),
    });
    const commands: readonly Command[] = [
      { type: 'CastSpell', unitId: 'player-1', spellId: FIRE.id, target: { x: 8, y: 5 } },
      { type: 'CastSpell', unitId: 'player-1', spellId: HEAL.id, target: { x: 7, y: 5 } },
    ];

    function run() {
      let current = state;
      const events = [];
      for (const command of commands) {
        const result = reduce(current, command);
        current = result.state;
        events.push(...result.events);
      }
      return { state: current, events };
    }

    const first = run();
    const second = run();

    expect(JSON.stringify(first.state)).toBe(JSON.stringify(second.state));
    expect(first.events).toEqual(second.events);
  });

  it('no usa Math.random', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
    });
    const spy = vi.spyOn(Math, 'random');

    try {
      cast(state, FIRE, { x: 8, y: 5 });
    } finally {
      spy.mockRestore();
    }

    expect(spy).not.toHaveBeenCalled();
  });

  it('el estado y el cupo son serializables y sobreviven al snapshot', () => {
    const state = makeState({
      players: [mage()],
      enemies: [dummy()],
      rng: rngForDice([6, 1, 3, 2]),
    });

    const result = cast(state, FIRE, { x: 8, y: 5 });
    const serialized = JSON.parse(JSON.stringify(result.state)) as GameState;

    expect(serialized.players[0]).toMatchObject({
      spellsCast: 1,
      mana: { current: manaMaxFor(4) - FIRE.cost, max: manaMaxFor(4) },
    });
  });

  it('el turno siguiente recarga el cupo junto a maná y acciones', () => {
    const manaMax = manaMaxFor(HEAL.minLevel);
    const state = makeState({
      players: [
        mage({ magicLevel: HEAL.minLevel, mana: { current: manaMax, max: manaMax } }),
        ally({ hp: 8 }),
      ],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const first = cast(state, HEAL, { x: 7, y: 5 });
    expect(reasonOf(first)).toBeUndefined();

    const second = cast(first.state, HEAL, { x: 7, y: 5 });
    expect(reasonOf(second)).toBeUndefined();
    expect(second.state.players[0]).toMatchObject({
      mana: { current: manaMax - HEAL.cost * 2, max: manaMax },
      actions: { remaining: 1 },
      spellsCast: 2,
    });

    const afterTurn = reduce(second.state, { type: 'EndTurn' });
    expect(afterTurn.state.players[0]).toMatchObject({
      mana: { current: manaMax, max: manaMax },
      actions: { remaining: 3 },
      spellsCast: 0,
    });

    const nextTurn = cast(afterTurn.state, HEAL, { x: 7, y: 5 });
    expect(reasonOf(nextTurn)).toBeUndefined();
  });

  it('el resolvedor lee la cantidad del paquete y el coste del catálogo, no de constantes', () => {
    const mutable = SPELLS[FIRE.id] as unknown as {
      damagePacket: { type: 'magic'; amount: number };
      cost: number;
    };
    const originalAmount = mutable.damagePacket.amount;
    const originalCost = mutable.cost;
    const caster = mage();
    const victim = dummy();
    const dice = [6, 1, 3, 2] as const;

    try {
      mutable.damagePacket.amount = originalAmount + 7;
      mutable.cost = originalCost + 1;

      const state = makeState({
        players: [caster],
        enemies: [victim],
        rng: rngForDice(dice),
      });
      const result = cast(state, FIRE, {
        x: victim.x,
        y: victim.y,
      });
      const damage = attackDamage(FIRE, victim, dice[2], dice[3]);

      expect(result.events[0]).toMatchObject({ effect: 'damage', damage });
      expect(result.state.players[0].mana.current).toBe(16 - mutable.cost);
    } finally {
      mutable.damagePacket.amount = originalAmount;
      mutable.cost = originalCost;
    }
  });
});
