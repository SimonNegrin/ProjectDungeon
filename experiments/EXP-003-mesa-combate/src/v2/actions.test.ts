import { describe, expect, it } from 'vitest';
import {
  isAdjacent,
  meleeRejection,
  pickEnemySpell,
  restoreTurn,
  selectDamageSpells,
  spellRejection,
} from './actions';
import { CATALOG, createUnit, templateFor } from './catalog';
import { performMeleeAttack, performMove, performSpellCast } from './duel';
import type { SpellDefinition } from './types';
import { makeState, patchUnit, scriptedRng } from './test-helpers';

function damageSpell(id: string): SpellDefinition {
  return CATALOG.spells[id];
}

describe('acciones por turno', () => {
  it('usa 2 acciones por defecto y 3 para el Pícaro', () => {
    expect(createUnit(templateFor(CATALOG, 'guerrero'), 0).maxActions).toBe(2);
    expect(createUnit(templateFor(CATALOG, 'picaro'), 0).maxActions).toBe(3);
    expect(createUnit(templateFor(CATALOG, 'mago'), 0).maxActions).toBe(2);
    expect(createUnit(templateFor(CATALOG, 'clerigo'), 0).maxActions).toBe(2);
  });

  it('restaura MP, acciones, maná y contador de hechizos al inicio del turno', () => {
    const unit = createUnit(templateFor(CATALOG, 'mago'), 0);
    unit.mp = 0;
    unit.actions = 0;
    unit.mana = 0;
    unit.spellsCastThisTurn = 2;
    restoreTurn(unit);
    expect(unit.mp).toBe(unit.maxMp);
    expect(unit.actions).toBe(unit.maxActions);
    expect(unit.mana).toBe(unit.maxMana);
    expect(unit.spellsCastThisTurn).toBe(0);
  });

  it('atacar consume una acción y usa 4 tiradas si impacta', () => {
    const state = makeState();
    patchUnit(state.enemy, { awareness: 'alert', hp: 20, maxHp: 20 });
    state.rng = scriptedRng([6, 1, 6, 1]);
    const before = state.hero.actions;
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok).toBe(true);
    expect(state.hero.actions).toBe(before - 1);
    expect(state.metrics.actions.hero.attack).toBe(1);
    expect(state.rng.calls).toBe(4);
  });

  it('rechaza el ataque sin acción, sin arma, no adyacente o contra un dormido sin tirar', () => {
    const state = makeState();
    patchUnit(state.hero, { actions: 0 });
    patchUnit(state.enemy, { awareness: 'alert' });
    state.rng = scriptedRng([6, 1, 6, 1]);
    expect(meleeRejection(state.hero, state.enemy, CATALOG)).toBe('no-action');
    expect(performMeleeAttack(state, state.hero, state.enemy)).toEqual({
      ok: false,
      reason: 'no-action',
    });
    expect(state.rng.calls).toBe(0);

    const mago = createUnit(templateFor(CATALOG, 'mago'), 3);
    const target = createUnit(templateFor(CATALOG, 'centinela'), 4);
    expect(meleeRejection(mago, target, CATALOG)).toBe('unarmed');

    patchUnit(state.hero, { actions: 2 });
    patchUnit(state.enemy, { pos: 6 });
    expect(meleeRejection(state.hero, state.enemy, CATALOG)).toBe(
      'not-adjacent',
    );

    patchUnit(state.enemy, { pos: 4, awareness: 'dormant' });
    expect(meleeRejection(state.hero, state.enemy, CATALOG)).toBe(
      'target-dormant',
    );
    expect(state.rng.calls).toBe(0);
  });

  it('lanzar un hechizo consume una acción y su maná', () => {
    const state = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 5 });
    const spell = damageSpell('fuego-ii');
    state.rng = scriptedRng([6, 1, 1, 6]);
    const result = performSpellCast(state, state.hero, state.enemy, spell);
    expect(result.ok).toBe(true);
    expect(state.hero.actions).toBe(state.hero.maxActions - 1);
    expect(state.hero.mana).toBe(state.hero.maxMana - spell.cost);
    expect(state.hero.spellsCastThisTurn).toBe(1);
    expect(state.metrics.actions.hero.spell).toBe(1);
    expect(state.metrics.mana.hero.spent).toBe(spell.cost);
    expect(state.metrics.spells[spell.id].casts).toBe(1);
  });

  it('limita a dos hechizos por turno aunque queden acciones', () => {
    const state = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 5 });
    patchUnit(state.hero, { maxActions: 3, actions: 3 });
    const spell = damageSpell('fuego-ii');
    state.rng = scriptedRng([6, 1, 1, 6, 6, 1, 1, 6]);
    expect(performSpellCast(state, state.hero, state.enemy, spell).ok).toBe(
      true,
    );
    expect(performSpellCast(state, state.hero, state.enemy, spell).ok).toBe(
      true,
    );
    const third = performSpellCast(state, state.hero, state.enemy, spell);
    expect(third).toEqual({ ok: false, reason: 'spell-limit' });
    expect(state.hero.actions).toBe(1);
  });

  it('rechaza hechizos de forma atómica sin consumir ni tirar', () => {
    const noMana = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 5 });
    patchUnit(noMana.hero, { mana: 1 });
    noMana.rng = scriptedRng([6, 1]);
    expect(
      performSpellCast(noMana, noMana.hero, noMana.enemy, damageSpell('fuego-ii')),
    ).toEqual({ ok: false, reason: 'not-enough-mana' });
    expect(noMana.hero.actions).toBe(noMana.hero.maxActions);
    expect(noMana.hero.mana).toBe(1);
    expect(noMana.hero.spellsCastThisTurn).toBe(0);
    expect(noMana.rng.calls).toBe(0);
    expect(noMana.enemy.hp).toBe(noMana.enemy.maxHp);

    const lowLevel = makeState({ heroId: 'clerigo', heroPos: 3, enemyPos: 5 });
    expect(
      performSpellCast(
        lowLevel,
        lowLevel.hero,
        lowLevel.enemy,
        damageSpell('resurreccion-iv'),
      ),
    ).toEqual({ ok: false, reason: 'level-too-low' });

    const far = makeState({ heroId: 'mago', heroPos: 0, enemyPos: 7 });
    expect(
      performSpellCast(far, far.hero, far.enemy, damageSpell('fuego-ii')),
    ).toEqual({ ok: false, reason: 'out-of-range' });

    const noAction = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 5 });
    patchUnit(noAction.hero, { actions: 0 });
    expect(
      performSpellCast(
        noAction,
        noAction.hero,
        noAction.enemy,
        damageSpell('fuego-ii'),
      ),
    ).toEqual({ ok: false, reason: 'no-action' });
  });

  it('moverse cuesta 1 MP y no consume acción', () => {
    const state = makeState();
    const actionsBefore = state.hero.actions;
    const result = performMove(state, state.hero, 2);
    expect(result.ok).toBe(true);
    expect(state.hero.mp).toBe(state.hero.maxMp - 1);
    expect(state.hero.actions).toBe(actionsBefore);
    expect(state.metrics.actions.hero.move).toBe(1);
    expect(isAdjacent(state.hero, state.enemy)).toBe(false);

    patchUnit(state.hero, { mp: 0 });
    expect(performMove(state, state.hero, 1)).toEqual({
      ok: false,
      reason: 'no-mp',
    });
  });

  it('rechaza moverse a una casilla ocupada', () => {
    const state = makeState();
    expect(performMove(state, state.hero, state.enemy.pos)).toEqual({
      ok: false,
      reason: 'blocked',
    });
  });
});

describe('curación y resurrección', () => {
  it('cura a un aliado a 2–3 casillas y no a sí mismo ni a un enemigo', () => {
    const state = makeState({
      heroId: 'clerigo',
      heroPos: 2,
      enemyPos: 7,
    });
    const ally = createUnit(templateFor(CATALOG, 'guerrero'), 4);
    patchUnit(ally, { hp: 5 });
    const spell = CATALOG.spells['curacion-iii'];
    const healed = performSpellCast(state, state.hero, ally, spell);
    expect(healed.ok).toBe(true);
    expect(ally.hp).toBe(5 + (spell.effect.type === 'heal' ? spell.effect.amount : 0));
    expect(state.metrics.healing.hero).toBe(ally.hp - 5);

    const self = spellRejection(state.hero, state.hero, spell, CATALOG);
    expect(self).not.toBeNull();

    const enemy = createUnit(templateFor(CATALOG, 'centinela'), 5);
    expect(spellRejection(state.hero, enemy, spell, CATALOG)).toBe(
      'invalid-target',
    );
  });

  it('resucita al 60 % del PV máximo con nivel 4, 8 de maná y adyacencia', () => {
    const state = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 7 });
    const corpse = createUnit(templateFor(CATALOG, 'guerrero'), 4);
    patchUnit(corpse, { hp: 0 });
    const spell = CATALOG.spells['resurreccion-iv'];
    const fraction = spell.effect.type === 'resurrect' ? spell.effect.hpFraction : 0;
    const result = performSpellCast(state, state.hero, corpse, spell);
    expect(result.ok).toBe(true);
    expect(corpse.hp).toBe(Math.max(1, Math.ceil(corpse.maxHp * fraction)));

    const clerigo = createUnit(templateFor(CATALOG, 'clerigo'), 3);
    expect(spellRejection(clerigo, corpse, spell, CATALOG)).toBe(
      'level-too-low',
    );

    const alive = createUnit(templateFor(CATALOG, 'guerrero'), 4);
    expect(spellRejection(state.hero, alive, spell, CATALOG)).toBe(
      'invalid-target',
    );
  });
});

describe('selección de hechizos', () => {
  it('maximiza la suma de poder, desempata por coste y respeta maná y acciones', () => {
    const state = makeState({ heroId: 'mago', heroPos: 3, enemyPos: 6 });
    const selected = selectDamageSpells(state.hero, state.enemy, CATALOG);
    expect(selected.length).toBeLessThanOrEqual(2);

    const candidates = Object.values(CATALOG.spells).filter(
      (spell) =>
        spell.effect.type === 'damage' &&
        spell.level <= state.hero.magicLevel &&
        spell.cost <= state.hero.mana,
    );
    let bestPower = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const first of candidates) {
      for (const second of candidates) {
        const sequence = [first, second];
        const cost = sequence.reduce((total, spell) => total + spell.cost, 0);
        if (cost > state.hero.mana) continue;
        const power = sequence.reduce((total, spell) => total + spell.power, 0);
        if (
          power > bestPower ||
          (power === bestPower && cost < bestCost)
        ) {
          bestPower = power;
          bestCost = cost;
        }
      }
    }

    const selectedPower = selected.reduce(
      (total, spell) => total + spell.power,
      0,
    );
    const selectedCost = selected.reduce(
      (total, spell) => total + spell.cost,
      0,
    );
    expect(selectedPower).toBe(bestPower);
    expect(selectedCost).toBe(bestCost);
  });

  it('la IA solo lanza hechizos si su perfil lo permite', () => {
    const mago = createUnit(templateFor(CATALOG, 'mago'), 3);
    const target = createUnit(templateFor(CATALOG, 'centinela'), 5);
    expect(
      pickEnemySpell(mago, target, CATALOG, CATALOG.aiProfiles['perfil-valiente']),
    ).toBeNull();
    expect(
      pickEnemySpell(
        mago,
        target,
        CATALOG,
        {
          ...CATALOG.aiProfiles['perfil-valiente'],
          castSpells: true,
        },
      ),
    ).not.toBeNull();
  });
});
