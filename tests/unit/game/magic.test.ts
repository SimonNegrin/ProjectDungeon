import { describe, expect, it, vi } from 'vitest';
import {
  BAND_MULTIPLIERS,
  MANA_RECOVERY_PER_TURN,
  MAX_SPELLS_PER_TURN,
  SPELLS,
  allInstances,
  bandFor,
  corpseId,
  createInventory,
  createRng,
  effectiveStats,
  emptyEquipment,
  findSpell,
  isGhost,
  itemInstance,
  lifeState,
  locateInstance,
  manaMaxFor,
  reduce,
  resolveHit,
  resolvePacket,
  withBackpackItem,
  type Command,
  type Container,
  type GameState,
  type ItemInstance,
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

/** Desglose esperado del paquete mágico o eléctrico del hechizo. */
function attackBreakdown(
  spell: SpellDefinition,
  victim: Unit,
  damageDie: number,
  resistanceDie: number,
) {
  const packet = spell.damagePacket;
  if (packet === null) throw new Error('hechizo sin paquete de daño');
  const band = bandFor(victim.stats.resistencia, packet.type);
  return [
    {
      type: packet.type,
      amount: packet.amount,
      damageRoll: damageDie,
      resistanceRoll: resistanceDie,
      raw: packet.amount + damageDie - resistanceDie,
      band,
      multiplier: BAND_MULTIPLIERS[band],
      damage: resolvePacket(packet, 0, 0, band, damageDie, resistanceDie),
    },
  ];
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
    victim.stats.defensa + effectiveStats(victim).evasion,
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

  it('la curación es aliado a 1 casilla con 8/6 y la resurrección exige nivel 4 y coste 12', () => {
    const heals = Object.values(SPELLS).filter(
      (spell) => spell.effect.kind === 'heal',
    );
    const resurrections = Object.values(SPELLS).filter(
      (spell) => spell.effect.kind === 'resurrect',
    );

    expect(heals).toHaveLength(1);
    expect(heals[0].target).toBe('ally');
    expect(heals[0].cost).toBe(8);
    expect(heals[0].range).toEqual({ min: 1, max: 1 });
    expect(heals[0].effect).toMatchObject({ kind: 'heal', amount: 6 });

    expect(resurrections).toHaveLength(1);
    expect(resurrections[0].target).toBe('corpse');
    expect(resurrections[0].minLevel).toBe(4);
    expect(resurrections[0].cost).toBe(12);
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
        damageBreakdown: attackBreakdown(FIRE, victim, dice[2], dice[3]),
      },
    ]);
  });

  it('el desglose del hechizo refleja tipo, banda y total como suma', () => {
    const dice = [6, 1, 3, 2] as const;

    for (const spell of [FIRE, ELECTRIC]) {
      const victim = dummy();
      const state = makeState({
        players: [mage()],
        enemies: [victim],
        rng: rngForDice(dice),
      });

      const result = cast(state, spell, { x: victim.x, y: victim.y });
      const event = result.events[0];
      if (event.type !== 'SpellCast' || event.effect !== 'damage') {
        throw new Error('se esperaba SpellCast de daño');
      }

      expect(event.damageBreakdown).toEqual(
        attackBreakdown(spell, victim, dice[2], dice[3]),
      );
      expect(event.damageBreakdown[0].type).toBe(spell.damagePacket!.type);
      const sum = event.damageBreakdown.reduce(
        (total, packet) => total + packet.damage,
        0,
      );
      expect(event.damage).toBe(Math.max(1, sum));
    }
  });

  it('el desglose eléctrico aplica la banda del objetivo', () => {
    const dice = [6, 1, 3, 2] as const;
    const resistant = dummy({
      stats: { defensa: 1, resistencia: { electric: 'resistant' } },
    });
    const state = makeState({
      players: [mage()],
      enemies: [resistant],
      rng: rngForDice(dice),
    });

    const result = cast(state, ELECTRIC, { x: resistant.x, y: resistant.y });
    const event = result.events[0];
    if (event.type !== 'SpellCast' || event.effect !== 'damage') {
      throw new Error('se esperaba SpellCast de daño');
    }

    expect(event.damageBreakdown).toEqual(
      attackBreakdown(ELECTRIC, resistant, dice[2], dice[3]),
    );
    expect(event.damageBreakdown[0]).toMatchObject({
      type: 'electric',
      band: 'resistant',
      multiplier: 0.5,
    });
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
        damageBreakdown: [],
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
  function healer(overrides: UnitOptions = {}): Unit {
    return mage({
      magicLevel: HEAL.minLevel,
      mana: { current: 16, max: 16 },
      ...overrides,
    });
  }

  it('cura al aliado adyacente sin tirar dados y consume 8, 1 acción y 1 hueco', () => {
    const caster = healer();
    const target = ally({ x: 6, y: 5, hp: 10, maxHp: 20 });
    const state = makeState({
      players: [caster, target],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    const amount = healAmount(HEAL);

    const result = cast(state, HEAL, { x: target.x, y: target.y });

    expect(reasonOf(result)).toBeUndefined();
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.players[0]).toMatchObject({
      mana: { current: 16 - HEAL.cost, max: 16 },
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

  it('cura en diagonal y a sí mismo con las mismas reglas y coste', () => {
    const caster = healer({ hp: 10, maxHp: 20 });
    const target = ally({ x: 6, y: 6, hp: 8, maxHp: 20 });
    const state = makeState({
      players: [caster, target],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    const amount = healAmount(HEAL);

    const diagonal = cast(state, HEAL, { x: target.x, y: target.y });
    expect(reasonOf(diagonal)).toBeUndefined();
    expect(diagonal.state.players[1].hp).toBe(8 + amount);

    const self = cast(diagonal.state, HEAL, { x: caster.x, y: caster.y });
    expect(reasonOf(self)).toBeUndefined();
    expect(self.state.players[0]).toMatchObject({
      hp: 10 + amount,
      mana: { current: 16 - HEAL.cost * 2, max: 16 },
      actions: { remaining: caster.actions.max - 2 },
      spellsCast: 2,
    });
    expect(self.events[0]).toMatchObject({
      effect: 'heal',
      targetId: caster.id,
      healing: amount,
      targetHp: 10 + amount,
    });
  });

  it('no supera el PV máximo', () => {
    const caster = healer();
    const nearMax = ally({ x: 6, y: 5, hp: 18, maxHp: 20 });
    const state = makeState({
      players: [caster, nearMax],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const capped = cast(state, HEAL, { x: nearMax.x, y: nearMax.y });
    expect(capped.events[0]).toMatchObject({
      effect: 'heal',
      healing: Math.min(healAmount(HEAL), 20 - 18),
      targetHp: 20,
    });
  });

  it('rechaza a PV completo con motivo propio y estado intacto', () => {
    const caster = healer();
    const full = ally({ x: 6, y: 5, hp: 20, maxHp: 20 });
    const state = makeState({
      players: [caster, full],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const result = cast(state, HEAL, { x: full.x, y: full.y });
    expectRejected(state, result, 'target-full-hp');
    expect(result.state.players[0]).toMatchObject({
      mana: { current: 16, max: 16 },
      actions: { remaining: caster.actions.max },
      spellsCast: 0,
    });

    const selfState = makeState({
      players: [healer()],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(selfState, cast(selfState, HEAL, { x: 5, y: 5 }), 'target-full-hp');
  });

  it('rechaza enemigos, cadáveres y objetivos a 2 casillas', () => {
    const caster = healer();

    const enemyState = makeState({
      players: [caster],
      enemies: [dummy({ x: 6, y: 5 })],
    });
    expectRejected(
      enemyState,
      cast(enemyState, HEAL, { x: 6, y: 5 }),
      'invalid-target',
    );

    const deadState = makeState({
      players: [caster, ally({ x: 6, y: 5, hp: 0 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(deadState, cast(deadState, HEAL, { x: 6, y: 5 }), 'target-dead');

    const farState = makeState({
      players: [caster, ally({ x: 7, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(farState, cast(farState, HEAL, { x: 7, y: 5 }), 'out-of-range');
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

  /** Cadáver contenedor tal como lo deja `settleUnitDeath`. */
  function corpseOf(
    unit: Unit,
    position: { readonly x: number; readonly y: number } = unit,
    items: readonly (ItemInstance | null)[] = [],
  ): Container {
    return {
      id: corpseId(unit.id),
      x: position.x,
      y: position.y,
      capacity: items.length,
      items,
      kind: 'corpse',
      corpseOf: unit.id,
    };
  }

  function castResurrect(
    state: GameState,
    target: { readonly x: number; readonly y: number },
    targetId?: string,
  ): ReturnType<typeof reduce> {
    return reduce(state, {
      type: 'CastSpell',
      unitId: 'player-1',
      spellId: RESURRECT.id,
      target,
      ...(targetId === undefined ? {} : { targetId }),
    });
  }

  it('el PV de retorno sigue la tabla de R-013: 60 % del máximo hacia arriba', () => {
    // Mago 12, Pícaro/Cocinero/Arquero 14, Clérigo 18, Guerrero 20, Bárbaro 24.
    const expected: readonly (readonly [number, number])[] = [
      [12, 8],
      [14, 9],
      [18, 11],
      [20, 12],
      [24, 15],
    ];

    for (const [maxHp, hp] of expected) {
      const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
      const corpse = deadPlayer({ maxHp, ghost: true });
      const state = makeState({
        players: [caster, corpse],
        enemies: [dummy({ x: 18, y: 18 })],
        containers: [corpseOf(corpse)],
      });

      const result = castResurrect(state, { x: corpse.x, y: corpse.y });

      expect(reasonOf(result), `PV máximo ${maxHp}`).toBeUndefined();
      expect(result.state.players[1].hp, `PV máximo ${maxHp}`).toBe(hp);
    }
  });

  it('el targetId elige el cadáver cuando varios comparten casilla', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const first = deadPlayer({ id: 'player-2', maxHp: 20 });
    const second = deadPlayer({ id: 'player-3', maxHp: 24, ghost: true });
    const state = makeState({
      players: [caster, first, second],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(first), corpseOf(second)],
    });

    const result = castResurrect(state, { x: 6, y: 5 }, 'player-3');

    expect(reasonOf(result)).toBeUndefined();
    // El elegido vuelve vivo en la casilla con su 60 % de PV.
    expect(result.state.players[2]).toMatchObject({ id: 'player-3', x: 6, y: 5, hp: 15 });
    expect(isGhost(result.state.players[2])).toBe(false);
    // El otro cadáver queda intacto, sin marca ni cambio de PV.
    expect(result.state.players[1]).toMatchObject({ id: 'player-2', hp: 0 });
    expect(result.state.players[1]).toBe(state.players[1]);
    expect(result.state.players[0].mana.current).toBe(0);
    expect(result.events[0]).toMatchObject({
      effect: 'resurrect',
      targetId: 'player-3',
      target: { x: 6, y: 5 },
      targetHp: 15,
    });
  });

  it('vuelve a la casilla del cadáver aunque el fantasma se haya movido', () => {
    const caster = mage();
    const wanderer = deadPlayer({ x: 9, y: 9, ghost: true, maxHp: 20 });
    const state = makeState({
      players: [caster, wanderer],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(wanderer, { x: 6, y: 5 })],
    });

    const result = castResurrect(state, { x: 9, y: 9 }, 'player-2');

    expect(reasonOf(result)).toBeUndefined();
    expect(result.state.players[1]).toMatchObject({ x: 6, y: 5, hp: 12 });
    expect(result.events[0]).toMatchObject({
      effect: 'resurrect',
      target: { x: 6, y: 5 },
    });
  });

  it('con targetId, la adyacencia se mide a la casilla del cadáver', () => {
    const caster = mage();
    const wanderer = deadPlayer({ x: 6, y: 5, ghost: true });
    const state = makeState({
      players: [caster, wanderer],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(wanderer, { x: 8, y: 5 })],
    });

    expectRejected(
      state,
      castResurrect(state, { x: 6, y: 5 }, 'player-2'),
      'out-of-range',
    );
  });

  it('el fantasma sobre la casilla no bloquea y pierde la marca al resucitar', () => {
    const caster = mage();
    const ghost = deadPlayer({ x: 6, y: 5, ghost: true });
    const state = makeState({
      players: [caster, ghost],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(ghost)],
    });

    const result = castResurrect(state, { x: 6, y: 5 });

    expect(reasonOf(result)).toBeUndefined();
    const revived = result.state.players[1];
    expect(lifeState(revived)).toBe('alive');
    expect(isGhost(revived)).toBe(false);
    expect('ghost' in revived).toBe(false);
    expect(revived.actions).toEqual({ max: 2, remaining: 0 });
  });

  it('consume el cadáver y devuelve a sus huecos y mochila lo que aún guardaba', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const fallen = deadPlayer({
      ghost: true,
      maxHp: 20,
      equipmentSlots: emptyEquipment(),
      inventory: createInventory(8),
    });
    const sword = itemInstance('item-corpse-weapon', 'sword');
    const armor = itemInstance('item-corpse-armor', 'armor');
    const shield = itemInstance('item-corpse-shield', 'shield');
    const dagger = itemInstance('item-corpse-dagger', 'dagger');
    const hammer = itemInstance('item-corpse-hammer', 'hammer');
    const state = makeState({
      players: [caster, fallen],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [
        corpseOf(fallen, fallen, [sword, armor, shield, null, dagger, hammer]),
      ],
    });
    const beforeIds = allInstances(state).map((item) => item.id);

    const result = castResurrect(state, { x: 6, y: 5 });

    expect(reasonOf(result)).toBeUndefined();
    const revived = result.state.players[1];
    expect(
      result.state.containers?.some((container) => container.corpseOf === 'player-2'),
    ).toBe(false);
    expect(revived.equipment.weapon).toBe(sword);
    expect(revived.equipment.armor).toBe(armor);
    expect(revived.equipment.shield).toBe(shield);
    expect(
      revived.inventory.items
        .filter((item) => item !== null)
        .map((item) => item?.id),
    ).toEqual([dagger.id, hammer.id]);
    expect(isGhost(revived)).toBe(false);

    // No se pierde ni se duplica ninguna instancia al vaciar el contenedor.
    const afterIds = allInstances(result.state).map((item) => item.id);
    expect([...afterIds].sort()).toEqual([...beforeIds].sort());
    expect(new Set(afterIds).size).toBe(afterIds.length);
  });

  it('no duplica lo saqueado y conserva lo que el fantasma lleva encima', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const looted = itemInstance('item-looted', 'dagger');
    const carried = withBackpackItem(createInventory(8), looted);
    if (!carried) throw new Error('la mochila del fantasma debería tener hueco');
    const fallen = deadPlayer({
      ghost: true,
      equipmentSlots: emptyEquipment(),
      inventory: carried,
    });
    const kept = itemInstance('item-kept', 'armor');
    const state = makeState({
      players: [caster, fallen],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(fallen, fallen, [null, kept])],
    });

    const result = castResurrect(state, { x: 6, y: 5 });

    expect(reasonOf(result)).toBeUndefined();
    const revived = result.state.players[1];
    expect(revived.equipment.armor).toBe(kept);
    expect(
      revived.inventory.items
        .filter((item) => item !== null)
        .map((item) => item?.id),
    ).toEqual([looted.id]);
    expect(locateInstance(result.state, looted.id)).toEqual({
      kind: 'backpack',
      unitId: 'player-2',
      index: 0,
    });
    expect(locateInstance(result.state, kept.id)).toEqual({
      kind: 'slot',
      unitId: 'player-2',
      slot: 'armor',
    });

    // El hueco `null` era el objeto saqueado: no reaparece duplicado.
    const ids = allInstances(result.state).map((item) => item.id);
    expect(ids.filter((id) => id === looted.id)).toHaveLength(1);
    expect(ids.filter((id) => id === kept.id)).toHaveLength(1);
    expect(result.state.containers).toEqual([]);
  });

  it('los huecos vacíos del cadáver no borran el equipo ni la mochila del fantasma', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const ghostSword = itemInstance('item-ghost-sword', 'sword');
    const ghostDagger = itemInstance('item-ghost-dagger', 'dagger');
    const inventory = withBackpackItem(createInventory(8), ghostDagger);
    if (!inventory) throw new Error('la mochila del fantasma debería tener hueco');
    const fallen = deadPlayer({
      ghost: true,
      equipmentSlots: { ...emptyEquipment(), weapon: ghostSword },
      inventory,
    });
    const state = makeState({
      players: [caster, fallen],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(fallen, fallen, [null, null])],
    });

    const result = castResurrect(state, { x: 6, y: 5 });

    expect(reasonOf(result)).toBeUndefined();
    expect(result.state.players[1].equipment.weapon).toBe(ghostSword);
    expect(result.state.players[1].inventory.items[0]).toBe(ghostDagger);
    expect(result.state.containers).toEqual([]);
  });

  it('un intento inválido no retira el cadáver ni mueve sus objetos', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const fallen = deadPlayer({
      ghost: true,
      equipmentSlots: emptyEquipment(),
    });
    const sword = itemInstance('item-corpse-weapon', 'sword');
    const state = makeState({
      players: [caster, fallen, ally({ id: 'player-3', x: 6, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(fallen, fallen, [sword])],
    });

    expectRejected(state, castResurrect(state, { x: 6, y: 5 }), 'occupied');
    expect(state.containers?.[0].items[0]).toBe(sword);
  });

  it('un vivo aliado o enemigo sobre el cadáver bloquea la resurrección', () => {
    const allyOnCorpse = deadPlayer();
    const blockedByAlly = makeState({
      players: [mage(), allyOnCorpse, ally({ id: 'player-3', x: 6, y: 5 })],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(allyOnCorpse)],
    });
    expectRejected(
      blockedByAlly,
      castResurrect(blockedByAlly, { x: 6, y: 5 }, 'player-2'),
      'occupied',
    );

    const enemyOnCorpse = deadPlayer();
    const blockedByEnemy = makeState({
      players: [mage(), enemyOnCorpse],
      enemies: [dummy({ x: 6, y: 5 })],
      containers: [corpseOf(enemyOnCorpse)],
    });
    expectRejected(
      blockedByEnemy,
      castResurrect(blockedByEnemy, { x: 6, y: 5 }, 'player-2'),
      'occupied',
    );
  });

  it('rechaza un targetId desconocido, de un vivo o de un enemigo sin consumir', () => {
    const caster = mage({ mana: { current: RESURRECT.cost, max: 16 } });
    const corpse = deadPlayer();
    const withCorpse = makeState({
      players: [caster, corpse],
      enemies: [dummy({ x: 18, y: 18 })],
      containers: [corpseOf(corpse)],
    });

    expectRejected(
      withCorpse,
      castResurrect(withCorpse, { x: 6, y: 5 }, 'player-9'),
      'target-not-found',
    );

    const livingAlly = ally({ id: 'player-3', x: 7, y: 5 });
    const withLiving = makeState({
      players: [mage(), livingAlly],
      enemies: [dummy({ x: 18, y: 18 })],
    });
    expectRejected(
      withLiving,
      castResurrect(withLiving, { x: 7, y: 5 }, 'player-3'),
      'invalid-target',
    );

    const withDeadEnemy = makeState({
      players: [mage()],
      enemies: [dummy({ x: 6, y: 5, hp: 0 })],
    });
    expectRejected(
      withDeadEnemy,
      castResurrect(withDeadEnemy, { x: 6, y: 5 }, 'enemy-1'),
      'invalid-target',
    );
  });

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
    // Maná sintético suficiente para aislar el cupo de hechizos del coste real.
    const manaMax = RESURRECT.cost * 2;
    const caster = mage({
      actionsMax: 2,
      actions: 2,
      mana: { current: manaMax, max: manaMax },
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
      mana: { current: 0, max: manaMax },
      actions: { remaining: 0 },
      spellsCast: 2,
    });
    expect(second.state.players.filter((unit) => unit.hp > 0)).toHaveLength(3);
  });

  it('rechaza sin nivel, sin maná, sin adyacencia y sin cadáver', () => {
    const lowLevel = mage({
      magicLevel: 3,
      mana: { current: manaMaxFor(3), max: manaMaxFor(3) },
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

  it('el turno siguiente recupera +4 junto a acciones y cupo de hechizos', () => {
    const manaMax = manaMaxFor(4);
    const state = makeState({
      players: [
        mage({ magicLevel: 4, mana: { current: manaMax, max: manaMax } }),
        ally({ x: 6, y: 5, hp: 8 }),
      ],
      enemies: [dummy({ x: 18, y: 18 })],
    });

    const first = cast(state, HEAL, { x: 6, y: 5 });
    expect(reasonOf(first)).toBeUndefined();
    expect(first.state.players[0]).toMatchObject({
      mana: { current: manaMax - HEAL.cost, max: manaMax },
      actions: { remaining: 2 },
      spellsCast: 1,
    });

    // La lanzadora cede el turno al aliado: la recuperación llega al empezar la ronda.
    const afterTurn = reduce(
      { ...first.state, activePlayerId: 'player-2' },
      { type: 'EndTurn' },
    );
    const recovered = Math.min(
      manaMax - HEAL.cost + MANA_RECOVERY_PER_TURN,
      manaMax,
    );
    expect(afterTurn.state.players[0]).toMatchObject({
      mana: { current: recovered, max: manaMax },
      actions: { remaining: 3 },
      spellsCast: 0,
    });

    const nextTurn = cast(afterTurn.state, HEAL, { x: 6, y: 5 });
    expect(reasonOf(nextTurn)).toBeUndefined();
    expect(nextTurn.state.players[0].mana.current).toBe(recovered - HEAL.cost);
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
