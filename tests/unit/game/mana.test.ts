import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  MANA_RECOVERY_PER_TURN,
  ROSTER,
  createInitialState,
  createMana,
  createPlayerFromArchetype,
  createRng,
  manaMaxFor,
  recoverMana,
  reduce,
  restoreEnemyTurn,
  restorePlayerTurn,
  restoreMana,
  type ArchetypeId,
  type MagicLevel,
} from '../../../src/game/index';
import { BspMapGenerator } from '../../../src/game/bsp';
import { makeState, makeUnit } from './helpers';

const LEVELS: readonly MagicLevel[] = [0, 1, 2, 3, 4];
const MANA_MAXES = [0, 4, 8, 12, 16] as const;

const ARCHETYPE_LEVELS: Readonly<Record<ArchetypeId, MagicLevel>> = {
  warrior: 0,
  barbarian: 0,
  rogue: 0,
  archer: 0,
  mage: 4,
  cleric: 3,
  spellblade: 2,
  cook: 1,
  farmer: 0,
};

function mageWithSpentMana(): ReturnType<typeof makeUnit> {
  return makeUnit({
    id: 'player-1',
    faction: 'player',
    magicLevel: 4,
    x: 5,
    y: 5,
    mp: 0,
    actions: 0,
    mana: { current: 0, max: 16 },
  });
}

describe('maná derivado del nivel de magia', () => {
  it('usa una única fórmula con máximos 0/4/8/12/16', () => {
    expect(LEVELS.map((level) => manaMaxFor(level))).toEqual([...MANA_MAXES]);
    for (const [index, level] of LEVELS.entries()) {
      expect(createMana(level), `nivel ${level}`).toEqual({
        current: MANA_MAXES[index],
        max: MANA_MAXES[index],
      });
    }
  });

  it('el roster declara los niveles acordados y arranca con el maná completo', () => {
    for (const [id, level] of Object.entries(ARCHETYPE_LEVELS) as [
      ArchetypeId,
      MagicLevel,
    ][]) {
      const player = createPlayerFromArchetype(id);
      expect(player.stats.magicLevel, id).toBe(level);
      expect(player.mana, id).toEqual({ current: level * 4, max: level * 4 });
      expect(player.mana.max, id).toBe(manaMaxFor(level));
    }

    const mage = createPlayerFromArchetype('mage');
    expect(mage.mana.max).toBe(16);
    // El maná no se confunde con el MP de movimiento.
    expect(mage.maxMp).toBe(ROSTER.mage.maxMp);
    expect(mage.mana.max).not.toBe(mage.maxMp);
  });

  it('los enemigos no tienen magia en este corte', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });

    expect(state.enemies.length).toBeGreaterThan(0);
    for (const enemy of state.enemies) {
      expect(enemy.stats.magicLevel).toBe(0);
      expect(enemy.mana).toEqual({ current: 0, max: 0 });
    }
    for (const definition of Object.values(BESTIARY)) {
      expect(definition.stats.magicLevel).toBe(0);
    }
  });

  it('un nivel 0 tiene maná 0 también al recuperar', () => {
    const warrior = createPlayerFromArchetype('warrior');

    expect(warrior.stats.magicLevel).toBe(0);
    expect(warrior.mana).toEqual({ current: 0, max: 0 });
    expect(recoverMana(warrior).mana).toEqual({ current: 0, max: 0 });
  });

  it('subir el nivel recalcula el máximo sin regalar maná', () => {
    const warrior = createPlayerFromArchetype('warrior');
    const spent = { ...warrior, mana: { current: 0, max: 0 } };
    const promoted = {
      ...spent,
      stats: { ...warrior.stats, magicLevel: 4 as const },
    };

    expect(restoreMana(promoted).mana).toEqual({ current: 0, max: 16 });
  });

  it('bajar el nivel recalcula el máximo y recorta el actual', () => {
    const mage = createPlayerFromArchetype('mage');
    const spent = { ...mage, mana: { current: 12, max: 16 } };
    const downgraded = {
      ...spent,
      stats: { ...mage.stats, magicLevel: 2 as const },
    };

    expect(restoreMana(downgraded).mana).toEqual({ current: 8, max: 8 });
  });

  it('cambiar el nivel conserva el maná actual que cabe en el nuevo máximo', () => {
    const spellblade = createPlayerFromArchetype('spellblade');
    const spent = { ...spellblade, mana: { current: 3, max: 8 } };
    const promoted = {
      ...spent,
      stats: { ...spellblade.stats, magicLevel: 4 as const },
    };
    const downgraded = {
      ...spent,
      stats: { ...spellblade.stats, magicLevel: 1 as const },
    };

    expect(restoreMana(promoted).mana).toEqual({ current: 3, max: 16 });
    expect(restoreMana(downgraded).mana).toEqual({ current: 3, max: 4 });
  });
});

describe('recuperación de maná por turno', () => {
  it('el jugador recupera +4 junto a MP y acciones al empezar su turno', () => {
    const mage = mageWithSpentMana();
    const state = makeState({
      players: [mage],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0]).toMatchObject({
      mp: mage.maxMp,
      mana: {
        current: Math.min(mage.mana.current + MANA_RECOVERY_PER_TURN, mage.mana.max),
        max: mage.mana.max,
      },
      actions: { remaining: mage.actions.max },
    });
  });

  it('el enemigo recupera +4 al empezar su fase', () => {
    const enemy = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      x: 18,
      y: 18,
      magicLevel: 2,
      mana: { current: 0, max: 8 },
    });
    const state = makeState({ enemies: [enemy] });

    const restored = restoreEnemyTurn(state);

    expect(restored.enemies[0].mana).toEqual({
      current: Math.min(enemy.mana.current + MANA_RECOVERY_PER_TURN, enemy.mana.max),
      max: enemy.mana.max,
    });
  });

  it('no supera el máximo aunque quede menos hueco que la recuperación', () => {
    const nearlyFull = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      magicLevel: 4,
      mana: { current: 15, max: 16 },
    });

    const result = reduce(
      makeState({
        players: [nearlyFull],
        enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
      }),
      { type: 'EndTurn' },
    );

    expect(result.state.players[0].mana).toEqual({ current: 16, max: 16 });
  });

  it('no recupera el maná de una unidad muerta', () => {
    const dead = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      hp: 0,
      magicLevel: 4,
      mana: { current: 0, max: 16 },
    });

    const restored = restorePlayerTurn(makeState({ players: [dead] }));

    expect(restored.players[0].mana).toEqual({ current: 0, max: 16 });
  });

  it('el gasto persiste entre turnos y cada turno solo suma la recuperación', () => {
    const mage = mageWithSpentMana();
    const enemy = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 });
    const first = reduce(makeState({ players: [mage], enemies: [enemy] }), {
      type: 'EndTurn',
    });
    expect(first.state.players[0].mana).toEqual({
      current: Math.min(mage.mana.current + MANA_RECOVERY_PER_TURN, mage.mana.max),
      max: mage.mana.max,
    });

    const spentAgain = {
      ...first.state,
      players: first.state.players.map((unit) => ({
        ...unit,
        mana: { current: 3, max: 16 },
      })),
    };
    const second = reduce(spentAgain, { type: 'EndTurn' });

    expect(second.state.players[0].mana).toEqual({
      current: Math.min(3 + MANA_RECOVERY_PER_TURN, 16),
      max: 16,
    });
  });

  it('es determinista: mismo estado de maná y comandos, mismo resultado', () => {
    const mage = mageWithSpentMana();
    const state = makeState({
      players: [mage],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
      rng: createRng(4242),
    });

    const first = reduce(state, { type: 'EndTurn' });
    const second = reduce(state, { type: 'EndTurn' });

    expect(JSON.stringify(first.state)).toBe(JSON.stringify(second.state));
    expect(first.state.players[0].mana).toEqual({
      current: Math.min(mage.mana.current + MANA_RECOVERY_PER_TURN, mage.mana.max),
      max: mage.mana.max,
    });
  });
});
