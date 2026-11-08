import { describe, expect, it } from 'vitest';
import { mulberry32, seedForVariant } from '../../_shell/rng';
import {
  DEFAULT_DUELS,
  DUEL_LIMITS,
  PRESET_DEFINITIONS,
  addCombatant,
  attackSummary,
  buildCombatDecision,
  createPresetRoster,
  damageFor,
  damageStats,
  duplicateCombatant,
  findCombatant,
  impactDifference,
  impactHitsForDifference,
  impactProbability,
  normalizeCombatant,
  normalizeDuelCount,
  removeCombatant,
  resolveAttack,
  resolveImpact,
  rollDie,
  roundTo,
  simulateDuel,
  simulateSingleDuel,
  updateCombatant,
  type Combatant,
} from './combat';

const IMPACT_CURVE: Record<number, number> = {
  [-3]: 3,
  [-2]: 6,
  [-1]: 10,
  [0]: 15,
  [1]: 21,
  [2]: 26,
  [3]: 30,
  [4]: 33,
  [5]: 35,
};

function withArmor(combatant: Combatant, armor: number): Combatant {
  return { ...combatant, armor };
}

function withShield(combatant: Combatant, shield: number): Combatant {
  return { ...combatant, shield };
}

function sequenceRng(values: ReadonlyArray<number>): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

/** Valor que `rollDie` convierte en la cara indicada. */
function dieValue(face: number): number {
  return (face - 0.5) / 6;
}

describe('presets de la mesa', () => {
  it('A reproduce la tabla propuesta de REQ-010', () => {
    const roster = createPresetRoster('A');
    expect(findCombatant(roster, 'jugador')).toMatchObject({
      hp: 20,
      acc: 1,
      dmg: 1,
      def: 1,
      weapon: 'espada',
      weaponAcc: 3,
      weaponDmg: 4,
      shield: 1,
      armor: 1,
    });
    expect(findCombatant(roster, 'centinela')).toMatchObject({
      hp: 9,
      acc: 0,
      dmg: 0,
      def: 0,
      weaponAcc: 3,
      weaponDmg: 4,
      shield: 1,
      armor: 1,
    });
    expect(findCombatant(roster, 'bruto')).toMatchObject({
      hp: 12,
      acc: 0,
      dmg: 1,
      def: 0,
      weapon: 'hacha',
      weaponAcc: 2,
      weaponDmg: 6,
      shield: 0,
      armor: 2,
    });
    expect(findCombatant(roster, 'cobarde')).toMatchObject({
      hp: 8,
      acc: 1,
      dmg: 0,
      def: 1,
      weapon: 'daga',
      weaponAcc: 4,
      weaponDmg: 3,
      shield: 1,
      armor: 0,
    });
  });

  it('B deja los modificadores a +0 y conserva PV y equipo', () => {
    const a = createPresetRoster('A');
    const b = createPresetRoster('B');
    expect(b).toHaveLength(a.length);
    for (const [index, combatant] of b.entries()) {
      expect(combatant).toMatchObject({
        hp: a[index].hp,
        weapon: a[index].weapon,
        weaponAcc: a[index].weaponAcc,
        weaponDmg: a[index].weaponDmg,
        shield: a[index].shield,
        armor: a[index].armor,
        acc: 0,
        dmg: 0,
        def: 0,
      });
    }
  });

  it('C suma PV y armadura y resta daño base', () => {
    const c = createPresetRoster('C');
    expect(findCombatant(c, 'jugador')).toMatchObject({
      hp: 26,
      armor: 2,
      dmg: 0,
    });
    expect(findCombatant(c, 'centinela')).toMatchObject({
      hp: 15,
      armor: 2,
      dmg: 0,
    });
    expect(findCombatant(c, 'bruto')).toMatchObject({
      hp: 18,
      armor: 3,
      dmg: 0,
    });
    expect(findCombatant(c, 'cobarde')).toMatchObject({
      hp: 14,
      armor: 1,
      dmg: 0,
    });
  });

  it('D resta PV y suma daño base', () => {
    const d = createPresetRoster('D');
    expect(findCombatant(d, 'jugador')).toMatchObject({ hp: 13, dmg: 3 });
    expect(findCombatant(d, 'centinela')).toMatchObject({ hp: 6, dmg: 2 });
    expect(findCombatant(d, 'bruto')).toMatchObject({ hp: 8, dmg: 3 });
    expect(findCombatant(d, 'cobarde')).toMatchObject({ hp: 6, dmg: 2 });
  });

  it('documenta C y D como hipótesis de playtest', () => {
    expect(PRESET_DEFINITIONS.C.detail).toContain('+6 PV');
    expect(PRESET_DEFINITIONS.C.detail).toContain('+1 armadura');
    expect(PRESET_DEFINITIONS.C.detail).toContain('No está aprobado');
    expect(PRESET_DEFINITIONS.D.detail).toContain('0,65');
    expect(PRESET_DEFINITIONS.D.detail).toContain('+2 al daño');
    expect(PRESET_DEFINITIONS.D.detail).toContain('No está aprobado');
  });

  it('cada preset devuelve una copia independiente', () => {
    const first = createPresetRoster('A');
    first[0].hp = 99;
    expect(createPresetRoster('A')[0].hp).toBe(20);
  });
});

describe('operaciones del roster', () => {
  it('añade con un id estable y valores por defecto editables', () => {
    const roster = addCombatant(createPresetRoster('A'));
    const added = roster[roster.length - 1];
    expect(added).toMatchObject({
      id: 'custom-1',
      name: 'Nuevo combatiente',
      side: 'enemigo',
      hp: 8,
      acc: 0,
      dmg: 0,
      def: 0,
      weapon: 'espada',
      shield: 0,
      armor: 0,
    });
    expect(addCombatant(roster)[roster.length]).toMatchObject({ id: 'custom-2' });
  });

  it('duplica el combatiente y conserva el original', () => {
    const roster = duplicateCombatant(createPresetRoster('A'), 'bruto');
    const copy = roster[roster.length - 1];
    expect(roster).toHaveLength(5);
    expect(copy).toMatchObject({
      id: 'custom-1',
      name: 'Bruto (copia)',
      hp: 12,
      weapon: 'hacha',
      weaponDmg: 6,
    });
    expect(findCombatant(roster, 'bruto')?.name).toBe('Bruto');
  });

  it('edita en sitio sin cambiar el id y normaliza los límites', () => {
    const roster = updateCombatant(createPresetRoster('A'), 'jugador', {
      name: 'Explorador',
      hp: 999,
      acc: -99,
      shield: 99,
    });
    expect(findCombatant(roster, 'jugador')).toMatchObject({
      id: 'jugador',
      name: 'Explorador',
      hp: 99,
      acc: -5,
      shield: 10,
    });
  });

  it('elimina solo el combatiente pedido', () => {
    const roster = removeCombatant(createPresetRoster('A'), 'centinela');
    expect(roster.map((combatant) => combatant.id)).toEqual([
      'jugador',
      'bruto',
      'cobarde',
    ]);
  });

  it('normaliza entradas incompletas o inválidas', () => {
    expect(normalizeCombatant({ id: 'x', name: '  ' }, 'x')).toMatchObject({
      id: 'x',
      name: 'Sin nombre',
      side: 'enemigo',
      hp: 8,
      weapon: 'espada',
      weaponAcc: 3,
      weaponDmg: 4,
    });
  });
});

describe('impacto: 36 combinaciones y curva de REQ-010', () => {
  it('cuenta los 36 pares de dados para cada diferencia', () => {
    for (const [differenceText, expectedHits] of Object.entries(IMPACT_CURVE)) {
      const difference = Number(differenceText);
      let manualHits = 0;
      for (let attackRoll = 1; attackRoll <= 6; attackRoll += 1) {
        for (let defenseRoll = 1; defenseRoll <= 6; defenseRoll += 1) {
          if (difference + attackRoll > defenseRoll) manualHits += 1;
        }
      }
      expect(manualHits).toBe(expectedHits);
      expect(impactHitsForDifference(difference)).toBe(expectedHits);
    }
  });

  it('con modificadores iguales impacta 15/36 y un +1 lo sube a 21/36', () => {
    const attacker = normalizeCombatant({
      id: 'atacante',
      acc: 0,
      weapon: 'espada',
      weaponAcc: 3,
    });
    const equalDefender = normalizeCombatant({
      id: 'defensor',
      def: 3,
      shield: 0,
      armor: 1,
    });
    expect(impactDifference(attacker, equalDefender)).toBe(0);
    expect(impactProbability(attacker, equalDefender)).toBeCloseTo(15 / 36, 10);
    expect(impactProbability({ ...attacker, acc: 1 }, equalDefender)).toBeCloseTo(
      21 / 36,
      10,
    );
  });

  it('el empate falla y el escudo solo suma a la defensa', () => {
    const roster = createPresetRoster('A');
    const attacker = findCombatant(roster, 'jugador') as Combatant;
    const defender = findCombatant(roster, 'centinela') as Combatant;
    expect(impactDifference(attacker, defender)).toBe(3);
    expect(resolveImpact(attacker, defender, 3, 6)).toMatchObject({
      hit: false,
      attackTotal: 6,
      defenseTotal: 6,
    });
    expect(resolveImpact(attacker, defender, 4, 6).hit).toBe(true);
    expect(resolveImpact(attacker, defender, 2, 5).hit).toBe(false);
    expect(impactDifference(attacker, withShield(defender, 3))).toBe(1);
  });
});

describe('daño: máximo con 1 y escudo fuera de la resta', () => {
  it('la espada del jugador contra armadura 0 hace 1-10 y media 5,03', () => {
    const roster = createPresetRoster('A');
    const attacker = findCombatant(roster, 'jugador') as Combatant;
    const defender = withArmor(findCombatant(roster, 'centinela') as Combatant, 0);
    const stats = damageStats(attacker, defender);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
    expect(stats.mean).toBeCloseTo(5.03, 2);
  });

  it('contra armadura 2 el rango baja a 1-8 y la media a 3,28', () => {
    const roster = createPresetRoster('A');
    const attacker = findCombatant(roster, 'jugador') as Combatant;
    const defender = withArmor(findCombatant(roster, 'centinela') as Combatant, 2);
    const stats = damageStats(attacker, defender);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(8);
    expect(stats.mean).toBeCloseTo(3.28, 2);
  });

  it('el escudo no cambia la distribución de daño', () => {
    const roster = createPresetRoster('A');
    const attacker = findCombatant(roster, 'jugador') as Combatant;
    const defender = findCombatant(roster, 'centinela') as Combatant;
    expect(damageStats(attacker, withShield(defender, 0))).toEqual(
      damageStats(attacker, withShield(defender, 5)),
    );
  });

  it('un golpe siempre hace al menos 1 aunque la armadura supere la base', () => {
    const weak = normalizeCombatant({
      id: 'weak',
      dmg: 0,
      weapon: 'daga',
      weaponDmg: 1,
    });
    const armored = withArmor(
      normalizeCombatant({ id: 'armored', armor: 10 }),
      10,
    );
    expect(damageFor(weak, armored, 1, 6)).toBe(1);
    expect(damageStats(weak, armored)).toMatchObject({
      min: 1,
      max: 1,
      distribution: [{ damage: 1, count: 36, probability: 1 }],
    });
  });

  it('el daño esperado por ataque y los ataques para matar salen de la tabla', () => {
    const roster = createPresetRoster('A');
    const player = findCombatant(roster, 'jugador') as Combatant;
    const sentinel = findCombatant(roster, 'centinela') as Combatant;
    const summary = attackSummary(player, sentinel);
    expect(summary.impactHits).toBe(30);
    expect(summary.damageMin).toBe(1);
    expect(summary.damageMax).toBe(9);
    expect(summary.damageMean).toBeCloseTo(4.11, 2);
    expect(summary.expectedDamagePerAttack).toBeCloseTo(3.43, 2);
    expect(summary.expectedAttacksToKill).toBeCloseTo(2.63, 2);
  });
});

describe('RNG sembrado y orden de tiradas', () => {
  it('la semilla del duelo 0 deriva de la semilla base', () => {
    expect(seedForVariant(1017, 'duel:0')).toBe(4209801984);
    const rng = mulberry32(seedForVariant(1017, 'duel:0'));
    const rolls = Array.from({ length: 12 }, () => rollDie(rng));
    expect(rolls).toEqual([4, 6, 3, 5, 4, 2, 5, 1, 5, 1, 2, 3]);
  });

  it('un impacto consume ataque, escudo, daño y armadura en ese orden', () => {
    const roster = createPresetRoster('A');
    const player = findCombatant(roster, 'jugador') as Combatant;
    const sentinel = findCombatant(roster, 'centinela') as Combatant;
    let calls = 0;
    const rng = sequenceRng([
      dieValue(4),
      dieValue(6),
      dieValue(3),
      dieValue(5),
    ]);
    const countingRng = () => {
      calls += 1;
      return rng();
    };
    const result = resolveAttack(player, sentinel, countingRng);
    expect(result).toMatchObject({
      hit: true,
      attackRoll: 4,
      defenseRoll: 6,
      damageRoll: 3,
      armorRoll: 5,
      damage: damageFor(player, sentinel, 3, 5),
      rolls: 4,
    });
    expect(calls).toBe(4);
  });

  it('un fallo consume dos tiradas y no tira daño', () => {
    const player = normalizeCombatant({ id: 'player', acc: 1, weaponAcc: 3 });
    const wall = normalizeCombatant({
      id: 'wall',
      def: 10,
      shield: 10,
      hp: 99,
    });
    let calls = 0;
    const rng = sequenceRng([dieValue(1), dieValue(6)]);
    const countingRng = () => {
      calls += 1;
      return rng();
    };
    const result = resolveAttack(player, wall, countingRng);
    expect(result).toMatchObject({
      hit: false,
      damageRoll: null,
      armorRoll: null,
      damage: 0,
      rolls: 2,
    });
    expect(calls).toBe(2);
  });
});

describe('duelo determinista', () => {
  it('el atacante golpea primero y puede matar en el turno 1', () => {
    const attacker = normalizeCombatant({
      id: 'verdugo',
      hp: 10,
      acc: 10,
      dmg: 10,
      weapon: 'hacha',
      weaponAcc: 10,
      weaponDmg: 20,
    });
    const defender = normalizeCombatant({ id: 'saco', hp: 1 });
    expect(simulateSingleDuel(attacker, defender, 1017, 0)).toMatchObject({
      winner: 'attacker',
      turns: 1,
      attackerHp: 10,
      defenderHp: 0,
    });
  });

  it('si el atacante no mata, el defensor responde en el turno 2', () => {
    const attacker = normalizeCombatant({
      id: 'debil',
      hp: 1,
      acc: -5,
      dmg: -5,
      weapon: 'daga',
      weaponAcc: 0,
      weaponDmg: 1,
    });
    const defender = normalizeCombatant({
      id: 'verdugo',
      hp: 10,
      acc: 10,
      dmg: 10,
      weapon: 'hacha',
      weaponAcc: 10,
      weaponDmg: 20,
    });
    expect(simulateSingleDuel(attacker, defender, 1017, 0)).toMatchObject({
      winner: 'defender',
      turns: 2,
      attackerHp: 0,
      defenderHp: 10,
    });
  });

  it('misma semilla y roster dan el mismo resumen; otra semilla cambia', () => {
    const roster = createPresetRoster('A');
    const player = findCombatant(roster, 'jugador') as Combatant;
    const sentinel = findCombatant(roster, 'centinela') as Combatant;
    expect(simulateDuel(player, sentinel, 1017, 200)).toEqual(
      simulateDuel(player, sentinel, 1017, 200),
    );
    expect(simulateDuel(player, sentinel, 1017, 200)).not.toEqual(
      simulateDuel(player, sentinel, 1, 200),
    );
  });

  it('el resumen agrega los duelos individuales y redondea a dos decimales', () => {
    const roster = createPresetRoster('A');
    const player = findCombatant(roster, 'jugador') as Combatant;
    const brute = findCombatant(roster, 'bruto') as Combatant;
    const outcomes = Array.from({ length: 20 }, (_, index) =>
      simulateSingleDuel(player, brute, 1017, index),
    );
    const summary = simulateDuel(player, brute, 1017, 20);
    const attackerWins = outcomes.filter(
      (outcome) => outcome.winner === 'attacker',
    ).length;
    const defenderWins = outcomes.filter(
      (outcome) => outcome.winner === 'defender',
    ).length;
    const averageTurns =
      outcomes.reduce((total, outcome) => total + outcome.turns, 0) /
      outcomes.length;

    expect(summary).toMatchObject({
      count: 20,
      attackerWins,
      defenderWins,
      draws: 20 - attackerWins - defenderWins,
      averageTurns: roundTo(averageTurns),
    });
    expect(
      summary.turnDistribution.reduce((total, entry) => total + entry.count, 0),
    ).toBe(20);
  });

  it('redondea y limita el número de duelos', () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.235, 2)).toBe(1.24);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(normalizeDuelCount(0)).toBe(DUEL_LIMITS.min);
    expect(normalizeDuelCount(99_999)).toBe(DUEL_LIMITS.max);
    expect(normalizeDuelCount('250')).toBe(250);
    expect(normalizeDuelCount(Number.NaN)).toBe(DEFAULT_DUELS);
  });
});

describe('exportación de la tabla', () => {
  it('incluye roster, valores, semilla, notas y fecha sin decidir', () => {
    const roster = createPresetRoster('A');
    const payload = buildCombatDecision({
      roster,
      preset: 'A',
      seed: 1017,
      duels: 50,
      attackerId: 'jugador',
      defenderId: 'centinela',
      decision: '',
      notes: 'pendiente de playtest',
      decidedAt: '2026-11-08T12:00:00.000Z',
    });

    expect(payload).toMatchObject({
      experiment: 'EXP-003',
      seed: 1017,
      preset: 'A',
      decision: '',
      notes: 'pendiente de playtest',
      decidedAt: '2026-11-08T12:00:00.000Z',
      parameters: {
        preset: 'A',
        seed: 1017,
        duels: 50,
        attacker: 'jugador',
        defender: 'centinela',
      },
    });
    expect(payload.roster).toHaveLength(4);
    expect(payload.attack.impactHits).toBe(30);
    expect(payload.duel.count).toBe(50);
    expect(payload.presetDefinitions.C.detail).toContain('+6 PV');
    expect(payload.presetDefinitions.D.detail).toContain('+2 al daño');
  });

  it('rechaza un export sin dos combatientes distintos', () => {
    expect(() =>
      buildCombatDecision({
        roster: createPresetRoster('A'),
        preset: 'A',
        seed: 1017,
        duels: 10,
        attackerId: 'jugador',
        defenderId: 'jugador',
        decision: '',
        notes: '',
        decidedAt: '2026-11-08T12:00:00.000Z',
      }),
    ).toThrow('dos combatientes distintos');
  });
});
