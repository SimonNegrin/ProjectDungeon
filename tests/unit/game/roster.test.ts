import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  ROSTER,
  WEAPONS,
  createInitialState,
  createPlayerFromArchetype,
  reduce,
  resolveAttack,
  rosterEntry,
  type ArchetypeId,
  type UnitStats,
} from '../../../src/game/index';
import { BspMapGenerator } from '../../../src/game/bsp';
import { makeState, makeUnit, rngForDice } from './helpers';

interface ExpectedArchetype {
  readonly name: string;
  readonly maxHp: number;
  readonly maxMp: number;
  /** Nivel de magia único de REQ-025; 0 = sin magia. */
  readonly magicLevel: number;
  readonly stats: readonly [
    habilidad: number,
    fuerza: number,
    defensa: number,
    resistencia: number,
    punteria: number,
    acciones: number,
  ];
}

const EXPECTED: Readonly<Record<ArchetypeId, ExpectedArchetype>> = {
  warrior: {
    name: 'Guerrero',
    maxHp: 20,
    maxMp: 6,
    magicLevel: 0,
    stats: [1, 1, 1, 1, 0, 2],
  },
  barbarian: {
    name: 'Bárbaro',
    maxHp: 24,
    maxMp: 5,
    magicLevel: 0,
    stats: [0, 3, -1, 0, 0, 2],
  },
  rogue: {
    name: 'Pícaro',
    maxHp: 14,
    maxMp: 8,
    magicLevel: 0,
    stats: [3, 0, 1, 0, 0, 3],
  },
  archer: {
    name: 'Arquero',
    maxHp: 14,
    maxMp: 6,
    magicLevel: 0,
    stats: [1, 0, 0, 0, 3, 2],
  },
  mage: {
    name: 'Mago',
    maxHp: 12,
    maxMp: 5,
    magicLevel: 4,
    stats: [0, -1, 0, 0, 0, 2],
  },
  cleric: {
    name: 'Clérigo',
    maxHp: 18,
    maxMp: 5,
    magicLevel: 3,
    stats: [0, -1, 3, 2, 0, 2],
  },
  spellblade: {
    name: 'Guerrero mágico',
    maxHp: 18,
    maxMp: 6,
    magicLevel: 2,
    stats: [1, 0, 1, 0, 0, 2],
  },
  cook: {
    name: 'Cocinero',
    maxHp: 14,
    maxMp: 6,
    magicLevel: 1,
    stats: [3, -1, 0, 0, 0, 2],
  },
  farmer: {
    name: 'Agricultor',
    maxHp: 22,
    maxMp: 4,
    magicLevel: 0,
    stats: [-1, 3, 0, 1, 0, 2],
  },
};

function statsOf(entry: (typeof ROSTER)[ArchetypeId]): readonly number[] {
  const stats: UnitStats = entry.stats;
  return [
    stats.habilidad,
    stats.fuerza,
    stats.defensa,
    stats.resistencia,
    stats.punteria,
    stats.acciones,
  ];
}

describe('roster de arquetipos', () => {
  it('declara los nueve arquetipos con los valores de REQ-015', () => {
    expect(Object.keys(ROSTER).sort()).toEqual(Object.keys(EXPECTED).sort());

    for (const [id, expected] of Object.entries(EXPECTED) as [
      ArchetypeId,
      ExpectedArchetype,
    ][]) {
      const entry = rosterEntry(id);

      expect(entry.id, id).toBe(id);
      expect(entry.name, id).toBe(expected.name);
      expect(entry.maxHp, id).toBe(expected.maxHp);
      expect(entry.maxMp, id).toBe(expected.maxMp);
      expect(statsOf(entry), id).toEqual(expected.stats);
      expect(entry.stats.magicLevel, id).toBe(expected.magicLevel);
    }
  });

  it('declara el equipo inicial y las dos variantes de cada arquetipo', () => {
    const equipment: Readonly<Record<ArchetypeId, readonly [string | null, string | null, string | null]>> = {
      warrior: ['sword', 'armor', 'shield'],
      barbarian: ['axe', null, null],
      rogue: ['dagger', null, null],
      archer: [null, null, null],
      mage: [null, null, null],
      cleric: [null, 'armor', 'shield'],
      spellblade: [null, 'armor', null],
      cook: ['knife', null, null],
      farmer: [null, null, 'shield'],
    };
    const futureWeapons: readonly ArchetypeId[] = [
      'archer',
      'mage',
      'cleric',
      'spellblade',
      'farmer',
    ];

    for (const [id, expected] of Object.entries(equipment) as [
      ArchetypeId,
      readonly [string | null, string | null, string | null],
    ][]) {
      const entry = rosterEntry(id);
      expect(
        [entry.equipment.weaponId, entry.equipment.armorId, entry.equipment.shieldId],
        id,
      ).toEqual(expected);
      expect(entry.variants, id).toHaveLength(2);
      expect(new Set(entry.variants).size, id).toBe(2);
      for (const variant of entry.variants) {
        expect(typeof variant, id).toBe('string');
        expect(variant.length, id).toBeGreaterThan(0);
      }
      expect(entry.futureWeapon !== null, id).toBe(futureWeapons.includes(id));
    }
  });

  it('registra rol e identidad mágica sin efecto en los stats', () => {
    expect(rosterEntry('warrior').role).toBe('Equilibrado; referencia');
    expect(rosterEntry('cleric').role).toBe('Tanque de apoyo');
    expect(rosterEntry('mage').magic).toContain('varias familias');
    expect(rosterEntry('spellblade').magic).toContain('magia baja');
    expect(rosterEntry('cook').magic).toBe('curación');
    expect(rosterEntry('cleric').magic).toContain('sin curación');
    for (const entry of Object.values(ROSTER)) {
      expect(entry.magic.length).toBeGreaterThan(0);
      expect(Number.isInteger(entry.stats.magicLevel)).toBe(true);
      expect(entry.stats.magicLevel).toBeGreaterThanOrEqual(0);
      expect(entry.stats.magicLevel).toBeLessThanOrEqual(4);
    }
  });

  it('el Cuchillo es +4/1 y la daga sigue +4/2', () => {
    expect(WEAPONS.knife).toEqual({
      id: 'knife',
      name: 'Cuchillo',
      accuracy: 4,
      damage: 1,
    });
    expect(WEAPONS.dagger).toMatchObject({ accuracy: 4, damage: 2 });
  });
});

describe('personaje desde arquetipo', () => {
  it('parte con PV/MP completos, acción, arma equipada y nombre por defecto', () => {
    const cook = createPlayerFromArchetype('cook', {
      id: 'player-2',
      position: { x: 3, y: 4 },
    });

    expect(cook).toMatchObject({
      id: 'player-2',
      nombre: ROSTER.cook.name,
      faction: 'player',
      enemyType: null,
      x: 3,
      y: 4,
      hp: ROSTER.cook.maxHp,
      maxHp: ROSTER.cook.maxHp,
      mp: ROSTER.cook.maxMp,
      maxMp: ROSTER.cook.maxMp,
      mana: { current: 4, max: 4 },
      actions: { max: 2, remaining: 2 },
      stats: ROSTER.cook.stats,
      equipment: ROSTER.cook.equipment,
      weapons: ['knife'],
      home: { x: 3, y: 4 },
    });
  });

  it('los arquetipos sin arma parten sin armas equipadas', () => {
    const archer = createPlayerFromArchetype('archer');

    expect(archer.equipment.weaponId).toBeNull();
    expect(archer.weapons).toEqual([]);
    expect(archer.nombre).toBe('Arquero');
  });

  it('el nombre es editable y serializable sin cambiar stats ni PV', () => {
    const warrior = createPlayerFromArchetype('warrior', { name: 'Ada' });
    const roundTrip = JSON.parse(JSON.stringify(warrior)) as typeof warrior;

    expect(warrior.nombre).toBe('Ada');
    expect(roundTrip.nombre).toBe('Ada');
    expect(roundTrip).toEqual(warrior);
    expect(warrior.stats).toBe(ROSTER.warrior.stats);
    expect(warrior.hp).toBe(ROSTER.warrior.maxHp);
    expect(warrior.maxHp).toBe(ROSTER.warrior.maxHp);
  });

  it('enemigos y jugador por defecto llevan nombres estables', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const enemyType = state.enemies[0].enemyType;
    if (enemyType === null) throw new Error('El enemigo inicial debe tener tipo');

    expect(state.players[0].nombre).toBe(ROSTER.warrior.name);
    expect(state.players[0].archetypeId).toBe('warrior');
    expect(state.enemies[0].nombre).toBe(BESTIARY[enemyType].name);
    expect(state.enemies[0].archetypeId).toBeNull();
  });
});

describe('jugador por defecto (REQ-015 T-003)', () => {
  it('usa stats y equipo del Guerrero con +1 de resistencia y el spawn real', () => {
    const state = createInitialState({ seed: 279837264 });
    const player = state.players[0];
    const spawn = state.map!.spawns.party?.[0] ?? state.map!.spawns.player;

    expect(player.id).toBe('player-1');
    expect(player.nombre).toBe(ROSTER.warrior.name);
    expect(player.archetypeId).toBe('warrior');
    expect(player.stats).toEqual(ROSTER.warrior.stats);
    expect(player.stats.resistencia).toBe(1);
    expect(player.equipment).toEqual(ROSTER.warrior.equipment);
    expect(player.weapons).toEqual(['sword']);
    expect(player.hp).toBe(ROSTER.warrior.maxHp);
    expect(player.maxHp).toBe(ROSTER.warrior.maxHp);
    expect(player.mp).toBe(ROSTER.warrior.maxMp);
    expect(player.maxMp).toBe(ROSTER.warrior.maxMp);
    expect(player.stats.magicLevel).toBe(0);
    expect(player.mana).toEqual({ current: 0, max: 0 });
    expect({ x: player.x, y: player.y }).toEqual(spawn);
    expect(player.x === 0 && player.y === 0).toBe(false);
    expect(player.home).toEqual(spawn);
  });

  it('la identidad de arquetipo es serializable y null en enemigos', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;

    expect(roundTrip.players[0].archetypeId).toBe('warrior');
    expect(roundTrip).toEqual(state);
    for (const enemy of state.enemies) {
      expect(enemy.archetypeId).toBeNull();
    }
  });

  it('el Guerrero por defecto ataca y consume RNG cuando lleva arma', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const player = state.players[0];
    const adjacent = makeState({
      players: [{ ...player, x: 5, y: 5, home: { x: 5, y: 5 } }],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });

    const result = reduce(adjacent, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events[0]).toMatchObject({
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
    });
    expect(result.state.rng).not.toBe(adjacent.rng);
    expect(result.state.players[0].actions.remaining).toBe(1);
  });
});

describe('ataque sin arma', () => {
  it('rechaza el ataque con motivo unarmed sin consumir RNG ni acción', () => {
    const archer = createPlayerFromArchetype('archer', {
      id: 'player-1',
      position: { x: 5, y: 5 },
    });
    const state = makeState({
      players: [archer],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const before = JSON.stringify(state);

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state).toBe(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.players[0].actions.remaining).toBe(2);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'unarmed' },
    ]);
    expect(resolveAttack(state, 'player-1', 'enemy-1')).toEqual({
      ok: false,
      reason: 'unarmed',
    });
  });

  it('mantiene la precedencia de las validaciones anteriores', () => {
    const archer = createPlayerFromArchetype('archer', {
      id: 'player-1',
      position: { x: 5, y: 5 },
    });
    const far = makeState({
      players: [archer],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 8, y: 5 })],
    });
    const withoutAction = makeState({
      players: [
        createPlayerFromArchetype('archer', {
          id: 'player-1',
          position: { x: 5, y: 5 },
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });
    const unarmedWithoutAction = {
      ...withoutAction,
      players: [{ ...withoutAction.players[0], actions: { ...withoutAction.players[0].actions, remaining: 0 } }],
    };

    expect(resolveAttack(far, 'player-1', 'enemy-1')).toEqual({
      ok: false,
      reason: 'target-not-adjacent',
    });
    expect(resolveAttack(unarmedWithoutAction, 'player-1', 'enemy-1')).toEqual({
      ok: false,
      reason: 'no-action',
    });
  });
});
