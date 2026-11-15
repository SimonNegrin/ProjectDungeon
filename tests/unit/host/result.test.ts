import { describe, expect, it } from 'vitest';
import type { PlayerConfig } from '../../../src/game/config';
import { createInitialState } from '../../../src/game/engine';
import type { GameState, GameStatus } from '../../../src/game/types';
import { buildResultScreen } from '../../../src/host/result';

const SEED = 4242;

const SIX: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'mage', variant: 2, name: 'Bru' },
  { archetypeId: 'rogue', variant: 1, name: 'Cid' },
  { archetypeId: 'cleric', variant: 2, name: 'Dee' },
  { archetypeId: 'archer', variant: 1, name: 'Eli' },
  { archetypeId: 'cook', variant: 2, name: 'Fay' },
];

function ended(status: GameStatus, players: readonly PlayerConfig[] = SIX): GameState {
  return {
    ...createInitialState({ seed: SEED, players }),
    status,
    round: 3,
  };
}

describe('pantalla de resultado: estado', () => {
  it('no existe mientras la partida sigue en curso', () => {
    expect(buildResultScreen(createInitialState({ seed: SEED }))).toBeNull();
  });

  it('distingue Victoria y Derrota con la ronda alcanzada', () => {
    const victory = buildResultScreen(ended('victory'));
    const defeat = buildResultScreen({
      ...ended('defeat'),
      round: 7,
    });

    expect(victory).toMatchObject({ status: 'victory', title: 'Victoria', round: 3 });
    expect(defeat).toMatchObject({ status: 'defeat', title: 'Derrota', round: 7 });
  });
});

describe('pantalla de resultado: datos de la mesa', () => {
  it('muestra la semilla de la configuración inicial', () => {
    expect(buildResultScreen(ended('victory'))?.seed).toBe(SEED);
  });

  it('sin configuración cae a la semilla del RNG sin inventarla', () => {
    const state = ended('defeat');
    const withoutConfig: GameState = { ...state, config: undefined };

    expect(buildResultScreen(withoutConfig)?.seed).toBe(state.rng.seed);
  });

  it('lista la party en orden 1..6 con nombre y arquetipo', () => {
    const screen = buildResultScreen(ended('victory'));

    expect(screen?.players).toEqual([
      { number: 1, name: 'Ana', archetype: 'Guerrero' },
      { number: 2, name: 'Bru', archetype: 'Mago' },
      { number: 3, name: 'Cid', archetype: 'Pícaro' },
      { number: 4, name: 'Dee', archetype: 'Clérigo' },
      { number: 5, name: 'Eli', archetype: 'Arquero' },
      { number: 6, name: 'Fay', archetype: 'Cocinero' },
    ]);
  });

  it('resuelve un nombre vacío con el del arquetipo', () => {
    const state = ended('victory', [{ archetypeId: 'warrior', variant: 1, name: '' }]);
    const named: GameState = {
      ...state,
      players: state.players.map((player) => ({ ...player, nombre: '' })),
    };

    expect(buildResultScreen(named)?.players).toEqual([
      { number: 1, name: 'Guerrero', archetype: 'Guerrero' },
    ]);
  });

  it('anuncia título, ronda, semilla y party para la región viva', () => {
    const screen = buildResultScreen(ended('defeat'));

    expect(screen?.announcement).toBe(
      'Derrota. Ronda 3. Semilla 4242. Party: Ana (Guerrero), Bru (Mago), Cid (Pícaro), Dee (Clérigo), Eli (Arquero), Fay (Cocinero).',
    );
  });

  it('es puro: no muta ni reutiliza el estado recibido', () => {
    const state = ended('victory');
    const before = JSON.stringify(state);

    const first = buildResultScreen(state)!;
    const second = buildResultScreen(state)!;

    expect(JSON.stringify(state)).toBe(before);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});
