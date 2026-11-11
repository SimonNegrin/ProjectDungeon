import { describe, expect, it } from 'vitest';
import {
  resolveDamage as productionDamage,
  resolveHit as productionHit,
} from '../../../../src/game/combat';
import { CATALOG, createUnit, templateFor } from './catalog';
import {
  absorption,
  defenseBonus,
  magicAttackBonus,
  magicDamage,
  magicHit,
  physicalAttackBonus,
  physicalDamage,
  physicalHit,
  resolveMagicAttack,
  resolvePhysicalAttack,
} from './resolver';
import { makeState, patchUnit, scriptedRng } from './test-helpers';

describe('fórmula física', () => {
  const attacker = createUnit(templateFor(CATALOG, 'guerrero'), 0);
  const defender = createUnit(templateFor(CATALOG, 'centinela'), 1);

  it('coincide con producción en los 36 pares de impacto', () => {
    const attackBonus = physicalAttackBonus(attacker, CATALOG);
    const defense = defenseBonus(defender, CATALOG);
    let hits = 0;
    for (let attackDie = 1; attackDie <= 6; attackDie += 1) {
      for (let shieldDie = 1; shieldDie <= 6; shieldDie += 1) {
        const expected = productionHit(
          attackBonus,
          defense,
          attackDie,
          shieldDie,
        );
        expect(
          physicalHit(attackBonus, defense, attackDie, shieldDie),
        ).toBe(expected);
        if (expected) hits += 1;
      }
    }
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(36);
  });

  it('el empate falla', () => {
    expect(physicalHit(2, 2, 4, 4)).toBe(false);
    expect(productionHit(2, 2, 4, 4)).toBe(false);
  });

  it('coincide con producción en un barrido de daño con resistencia + armadura', () => {
    for (let damageBonus = 0; damageBonus <= 10; damageBonus += 1) {
      for (let targetAbsorption = 0; targetAbsorption <= 6; targetAbsorption += 1) {
        for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
          for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
            expect(
              physicalDamage(
                damageBonus,
                targetAbsorption,
                damageDie,
                armorDie,
              ),
            ).toBe(
              productionDamage(
                damageBonus,
                targetAbsorption,
                damageDie,
                armorDie,
              ),
            );
          }
        }
      }
    }
  });

  it('aplica mínimo 1 aunque la absorción supere el daño', () => {
    expect(physicalDamage(1, 20, 1, 6)).toBe(1);
  });

  it('usa 2 tiradas si falla y 4 si impacta, en el orden ataque → escudo → daño → armadura', () => {
    const state = makeState();
    patchUnit(state.enemy, { awareness: 'alert' });

    const missRng = scriptedRng([1, 6]);
    const miss = resolvePhysicalAttack(
      state.hero,
      state.enemy,
      missRng,
      CATALOG,
    );
    expect(miss.hit).toBe(false);
    expect(miss.rolls).toEqual({
      attack: 1,
      shield: 6,
      damage: null,
      armor: null,
    });
    expect(missRng.calls).toBe(2);

    const hitRng = scriptedRng([6, 1, 6, 1]);
    const hit = resolvePhysicalAttack(state.hero, state.enemy, hitRng, CATALOG);
    expect(hit.hit).toBe(true);
    expect(hit.rolls).toEqual({ attack: 6, shield: 1, damage: 6, armor: 1 });
    expect(hitRng.calls).toBe(4);
    expect(hit.damage).toBe(
      physicalDamage(
        state.hero.stats.fuerza +
          CATALOG.weapons[state.hero.weaponId ?? ''].damage,
        absorption(state.enemy, CATALOG),
        6,
        1,
      ),
    );
  });
});

describe('fórmula mágica', () => {
  const caster = createUnit(templateFor(CATALOG, 'mago'), 0);
  const target = createUnit(templateFor(CATALOG, 'centinela'), 2);
  const spell = CATALOG.spells['fuego-ii'];

  it('suma el nivel de magia al acierto del hechizo', () => {
    expect(magicAttackBonus(caster, spell)).toBe(
      caster.magicLevel + spell.accuracy,
    );
    for (let attackDie = 1; attackDie <= 6; attackDie += 1) {
      for (let shieldDie = 1; shieldDie <= 6; shieldDie += 1) {
        expect(
          magicHit(
            caster.magicLevel,
            spell.accuracy,
            defenseBonus(target, CATALOG),
            attackDie,
            shieldDie,
          ),
        ).toBe(
          productionHit(
            caster.magicLevel + spell.accuracy,
            defenseBonus(target, CATALOG),
            attackDie,
            shieldDie,
          ),
        );
      }
    }
  });

  it('el nivel no suma al daño: solo el poder del hechizo', () => {
    const lowLevel = createUnit(templateFor(CATALOG, 'mago'), 0);
    patchUnit(lowLevel, { magicLevel: 2 });
    const lightSpell = CATALOG.spells['fuego-ii'];
    const low = resolveMagicAttack(
      lowLevel,
      target,
      lightSpell,
      scriptedRng([6, 1, 6, 1]),
      CATALOG,
    );
    const high = resolveMagicAttack(
      caster,
      target,
      lightSpell,
      scriptedRng([6, 1, 6, 1]),
      CATALOG,
    );
    expect(low.damage).toBe(high.damage);
    expect(high.damage).toBe(
      magicDamage(spell.power, absorption(target, CATALOG), 6, 1),
    );
  });

  it('el empate falla', () => {
    expect(magicHit(0, 0, 0, 4, 4)).toBe(false);
  });

  it('usa 2 tiradas si falla y 4 si impacta', () => {
    const missRng = scriptedRng([1, 6]);
    const miss = resolveMagicAttack(caster, target, spell, missRng, CATALOG);
    expect(miss.hit).toBe(false);
    expect(missRng.calls).toBe(2);

    const hitRng = scriptedRng([6, 1, 1, 6]);
    const hit = resolveMagicAttack(caster, target, spell, hitRng, CATALOG);
    expect(hit.hit).toBe(true);
    expect(hitRng.calls).toBe(4);
  });
});
