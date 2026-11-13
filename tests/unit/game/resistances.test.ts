import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  FAMILY_PROFILES,
  ROSTER,
  bandFor,
  familyResistanceProfile,
  resolveAttack,
  resolvePackets,
  type ArchetypeId,
  type DamageType,
  type EnemyFamily,
  type ResistanceBand,
  type ResistanceProfile,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

const DAMAGE_TYPES: readonly DamageType[] = ['slash', 'blunt', 'pierce', 'magic', 'electric'];
const BANDS: readonly ResistanceBand[] = [
  'vulnerable',
  'normal',
  'resistant',
  'very-resistant',
];
const ARCHETYPES: readonly ArchetypeId[] = [
  'warrior',
  'barbarian',
  'rogue',
  'archer',
  'mage',
  'cleric',
  'spellblade',
  'cook',
  'farmer',
];
const FAMILIES: readonly EnemyFamily[] = [
  'humanoid',
  'construct',
  'undead',
  'beast',
  'elemental',
  'dragon',
];

function expectCompleteProfile(label: string, profile: ResistanceProfile): void {
  expect(Object.keys(profile).sort(), label).toEqual([...DAMAGE_TYPES].sort());
  for (const type of DAMAGE_TYPES) {
    expect(BANDS, `${label}/${type}`).toContain(bandFor(profile, type));
  }
}

describe('perfiles de resistencia del catálogo (REQ-029)', () => {
  it('los nueve arquetipos declaran un perfil completo de bandas válidas', () => {
    expect(Object.keys(ROSTER).sort()).toEqual([...ARCHETYPES].sort());

    for (const id of ARCHETYPES) {
      expectCompleteProfile(`roster/${id}`, ROSTER[id].stats.resistencia);
    }
  });

  it('las seis familias son plantillas reutilizables con perfil completo', () => {
    expect(Object.keys(FAMILY_PROFILES).sort()).toEqual([...FAMILIES].sort());

    for (const family of FAMILIES) {
      expectCompleteProfile(`familia/${family}`, FAMILY_PROFILES[family]);
    }
  });

  it('cada enemigo hereda su familia y solo sobrescribe bandas concretas', () => {
    for (const definition of Object.values(BESTIARY)) {
      const base = FAMILY_PROFILES[definition.family];
      expect(definition.family).toBe('humanoid');
      expectCompleteProfile(`bestiario/${definition.id}`, definition.stats.resistencia);
      expect(definition.stats.resistencia).toEqual(
        familyResistanceProfile(definition.family, definition.resistanceOverrides),
      );

      // La sobrescritura es parcial: no duplica el perfil entero.
      expect(Object.keys(definition.resistanceOverrides).length).toBeLessThan(
        DAMAGE_TYPES.length,
      );

      for (const type of DAMAGE_TYPES) {
        const override = definition.resistanceOverrides[type];
        expect(definition.stats.resistencia[type], `${definition.id}/${type}`).toBe(
          override ?? base[type],
        );
      }
    }
  });

  it('la sobrescritura no muta la plantilla de familia compartida', () => {
    const before = { ...FAMILY_PROFILES.humanoid };
    const overridden = familyResistanceProfile('humanoid', { slash: 'resistant' });

    expect(overridden.slash).toBe('resistant');
    expect(FAMILY_PROFILES.humanoid).toEqual(before);
    expect(overridden).not.toBe(FAMILY_PROFILES.humanoid);
  });

  it('una unidad sin perfil explícito recibe normal en los cinco tipos', () => {
    const unit = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 });

    expect(unit.stats.resistencia).toEqual({});
    for (const type of DAMAGE_TYPES) {
      expect(bandFor(unit.stats.resistencia, type), type).toBe('normal');
      expect(bandFor({}, type), type).toBe('normal');
    }
  });

  it('los perfiles son serializables en catálogos y unidades', () => {
    expect(JSON.parse(JSON.stringify(ROSTER))).toEqual(ROSTER);
    expect(JSON.parse(JSON.stringify(BESTIARY))).toEqual(BESTIARY);
    expect(JSON.parse(JSON.stringify(FAMILY_PROFILES))).toEqual(FAMILY_PROFILES);

    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      stats: { resistencia: ROSTER.barbarian.stats.resistencia },
    });
    expect(JSON.parse(JSON.stringify(player)).stats.resistencia).toEqual(
      ROSTER.barbarian.stats.resistencia,
    );
  });

  it('dos unidades con el mismo perfil reciben el mismo tratamiento', () => {
    const profile: ResistanceProfile = {
      ...BESTIARY.brute.stats.resistencia,
      slash: 'resistant',
    };
    const attacker = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });

    function attack(profileForTarget: ResistanceProfile): number {
      const target = makeUnit({
        id: 'enemy-1',
        faction: 'enemy',
        x: 6,
        y: 5,
        stats: { resistencia: profileForTarget },
      });
      const state = makeState({
        players: [attacker],
        enemies: [target],
        rng: rngForDice([6, 1, 3, 1]),
      });
      const result = resolveAttack(state, 'player-1', 'enemy-1');
      if (!result.ok) throw new Error(result.reason);
      return result.damage;
    }

    expect(attack(profile)).toBe(attack({ ...profile }));
  });

  it('un paquete usa la banda del catálogo: resistente y vulnerable', () => {
    const dice = rngForDice([3, 1]);
    const packet = { type: 'blunt' as const, amount: 6 };

    function totalAgainst(type: 'sentinel' | 'brute' | 'coward'): number {
      return resolvePackets(
        [packet],
        0,
        0,
        BESTIARY[type].stats.resistencia,
        dice,
      ).total;
    }

    // Contra contundente, el bruto es resistente y el cobarde vulnerable.
    expect(bandFor(BESTIARY.brute.stats.resistencia, 'blunt')).toBe('resistant');
    expect(bandFor(BESTIARY.coward.stats.resistencia, 'blunt')).toBe('vulnerable');
    expect(totalAgainst('brute')).toBeLessThan(totalAgainst('sentinel'));
    expect(totalAgainst('coward')).toBeGreaterThan(totalAgainst('sentinel'));
  });

  it('cambiar una banda en un fixture cambia el combate sin tocar el resolvedor', () => {
    const normal = { ...BESTIARY.sentinel.stats.resistencia };
    const attacker = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });

    function attackWith(profileForTarget: ResistanceProfile): number {
      const target = makeUnit({
        id: 'enemy-1',
        faction: 'enemy',
        x: 6,
        y: 5,
        stats: { resistencia: profileForTarget },
      });
      const state = makeState({
        players: [attacker],
        enemies: [target],
        rng: rngForDice([6, 1, 3, 1]),
      });
      const result = resolveAttack(state, 'player-1', 'enemy-1');
      if (!result.ok) throw new Error(result.reason);
      return result.damage;
    }

    const resistant = attackWith({ ...normal, slash: 'resistant' });
    const baseline = attackWith(normal);
    const vulnerable = attackWith({ ...normal, slash: 'vulnerable' });

    expect(resistant).toBeLessThan(baseline);
    expect(baseline).toBeLessThan(vulnerable);
  });
});
