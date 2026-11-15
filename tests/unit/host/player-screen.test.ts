import { describe, expect, it } from 'vitest';
import type { PlayerVariant } from '../../../src/game/config';
import { ROSTER, type ArchetypeId } from '../../../src/game/roster';
import {
  MAX_NAME_CODE_POINTS,
  createPlayerScreen,
  normalizePlayerName,
} from '../../../src/host/player-screen';

const SEED = 42;
const ARCHETYPE_IDS = Object.keys(ROSTER) as ArchetypeId[];

describe('pantalla de jugador: defaults', () => {
  it('crea N borradores Guerrero/variante 1/nombre vacío y conserva N y semilla', () => {
    for (const playerCount of [1, 6]) {
      const screen = createPlayerScreen({ playerCount, seed: SEED });
      const state = screen.state();

      expect(state).toMatchObject({
        step: 'player',
        index: 0,
        playerCount,
        seed: SEED,
      });
      expect(state.players).toHaveLength(playerCount);
      for (const player of state.players) {
        expect(player).toEqual({ archetypeId: 'warrior', variant: 1, name: '' });
      }
    }
  });
});

describe('pantalla de jugador: arquetipos y variantes', () => {
  it('acepta los nueve arquetipos del roster', () => {
    expect(ARCHETYPE_IDS).toHaveLength(9);
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    for (const id of ARCHETYPE_IDS) {
      screen.setArchetype(id);

      expect(screen.state().players[0].archetypeId).toBe(id);
    }
  });

  it('guarda la variante por jugador y rechaza una variante inválida', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.setVariant(2);
    screen.next();
    screen.setVariant(2);

    expect(screen.state().players.map((player) => player.variant)).toEqual([2, 2]);

    screen.back();
    screen.setVariant(3 as PlayerVariant);

    expect(screen.state().players[0].variant).toBe(2);
  });

  it('cambiar de arquetipo devuelve la variante a 1 y conserva el nombre', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });
    screen.setArchetype('mage');
    screen.setVariant(2);
    screen.setName('Ana');

    screen.setArchetype('rogue');

    expect(screen.state().players[0]).toEqual({
      archetypeId: 'rogue',
      variant: 1,
      name: 'Ana',
    });
  });

  it('reseleccionar el mismo arquetipo no resetea variante ni nombre', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });
    screen.setArchetype('mage');
    screen.setVariant(2);
    screen.setName('Ana');

    screen.setArchetype('mage');

    expect(screen.state().players[0]).toEqual({
      archetypeId: 'mage',
      variant: 2,
      name: 'Ana',
    });
  });

  it('ignora un arquetipo que no está en el roster', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });
    screen.setArchetype('mage');

    screen.setArchetype('inventor' as ArchetypeId);

    expect(screen.state().players[0].archetypeId).toBe('mage');
  });
});

describe('pantalla de jugador: nombre', () => {
  it('acepta acentos, eñes y espacios interiores', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    screen.setName('Ñandú');
    expect(screen.state().players[0].name).toBe('Ñandú');

    screen.setName('Ana María');
    expect(screen.state().players[0].name).toBe('Ana María');
  });

  it('compone NFC con marcas combinantes y es idempotente', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    screen.setName('Jose\u0301');
    const once = screen.state().players[0].name;
    screen.setName(once);

    expect(once).toBe('José');
    expect(screen.state().players[0].name).toBe(once);
    expect(normalizePlayerName(once)).toBe(once);
  });

  it('conserva espacios hasta aceptar y los recorta al avanzar', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.setName('  Ana María ');

    expect(screen.state().players[0].name).toBe('  Ana María ');

    screen.next();

    expect(screen.state().players[0].name).toBe('Ana María');
  });

  it('trunca a 12 code points sin error', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    screen.setName('abcdefghijklm');

    const name = screen.state().players[0].name;
    expect(name).toBe('abcdefghijkl');
    expect(Array.from(name)).toHaveLength(MAX_NAME_CODE_POINTS);
  });

  it('descarta emoji, símbolos y controles sin lanzar', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    screen.setName('A👾B!\tC\nD');
    expect(screen.state().players[0].name).toBe('ABCD');

    screen.setName('👾¡!');
    expect(screen.state().players[0].name).toBe('');
  });

  it('vacío queda en cadena vacía y effectiveName usa el del arquetipo', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.setName('   ');
    screen.next();

    expect(screen.state().players[0].name).toBe('');
    expect(screen.effectiveName(0)).toBe('Guerrero');

    screen.back();
    screen.setArchetype('mage');
    expect(screen.effectiveName(0)).toBe('Mago');
  });

  it('effectiveName devuelve el nombre propio recortado', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });

    screen.setName('  Ana  ');

    expect(screen.effectiveName(0)).toBe('Ana');
  });

  it('permite nombres duplicados entre jugadores', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.setName('Ana');
    screen.next();
    screen.setName('Ana');
    const party = screen.next();

    expect(party?.players.map((player) => player.name)).toEqual(['Ana', 'Ana']);
  });
});

describe('pantalla de jugador: avance y retroceso', () => {
  it('conserva los valores por jugador y emite la party en orden al final', () => {
    const screen = createPlayerScreen({ playerCount: 3, seed: SEED });
    screen.setArchetype('mage');
    screen.setVariant(2);
    screen.setName('Uno');

    expect(screen.next()).toBeNull();
    expect(screen.state().index).toBe(1);
    screen.setArchetype('rogue');
    screen.setName('Dos');

    expect(screen.next()).toBeNull();
    expect(screen.state().index).toBe(2);
    screen.setArchetype('cleric');
    screen.setVariant(2);
    screen.setName('Tres');

    screen.back();
    screen.back();
    expect(screen.state().index).toBe(0);
    expect(screen.state().players).toEqual([
      { archetypeId: 'mage', variant: 2, name: 'Uno' },
      { archetypeId: 'rogue', variant: 1, name: 'Dos' },
      { archetypeId: 'cleric', variant: 2, name: 'Tres' },
    ]);

    const atFirst = screen.state();
    screen.back();
    expect(screen.state()).toEqual(atFirst);

    screen.next();
    screen.next();
    const party = screen.next();

    expect(party).toEqual({
      playerCount: 3,
      seed: SEED,
      players: [
        { archetypeId: 'mage', variant: 2, name: 'Uno' },
        { archetypeId: 'rogue', variant: 1, name: 'Dos' },
        { archetypeId: 'cleric', variant: 2, name: 'Tres' },
      ],
    });
  });

  it('recorta el nombre del jugador actual al retroceder', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.next();
    screen.setName('  Dos  ');

    screen.back();

    expect(screen.state().players[1].name).toBe('Dos');
    expect(screen.state().index).toBe(0);
  });
});

describe('pantalla de jugador: cancelación', () => {
  it('pedir cancelar abre el aviso y desistir conserva índice y valores', () => {
    const screen = createPlayerScreen({ playerCount: 2, seed: SEED });
    screen.setName('Ana');
    screen.next();
    screen.setName('Bea');
    const before = screen.state();

    screen.requestCancel();

    expect(screen.state().step).toBe('confirm-cancel');
    expect(screen.state().index).toBe(before.index);
    expect(screen.state().players).toEqual(before.players);

    screen.dismissCancel();

    expect(screen.state()).toMatchObject({
      step: 'player',
      index: before.index,
      players: before.players,
    });
  });

  it('confirmar señala el descarte una sola vez', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });
    expect(screen.confirmCancel()).toBe(false);

    screen.requestCancel();

    expect(screen.confirmCancel()).toBe(true);
    expect(screen.confirmCancel()).toBe(false);
  });

  it('Esc abre la confirmación en jugador y la cierra en el aviso sin cancelar', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: SEED });
    screen.setArchetype('mage');
    screen.setName('Ana');

    screen.escape();
    expect(screen.state().step).toBe('confirm-cancel');

    screen.escape();
    expect(screen.state()).toMatchObject({
      step: 'player',
      players: [{ archetypeId: 'mage', variant: 1, name: 'Ana' }],
    });
  });
});
