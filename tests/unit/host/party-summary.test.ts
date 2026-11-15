import { describe, expect, it } from 'vitest';
import type { PlayerConfig } from '../../../src/game/config';
import type { ArchetypeId } from '../../../src/game/roster';
import { createPartySummary, startParty } from '../../../src/host/party-summary';
import type { PlayerPartyConfig } from '../../../src/host/player-screen';

const SEED = 4242;

function party(players: readonly PlayerConfig[]): PlayerPartyConfig {
  return { playerCount: players.length, seed: SEED, players };
}

describe('resumen de party: composición', () => {
  it('pinta una fila numerada con arquetipo, variante y nombre efectivo', () => {
    const summary = createPartySummary(
      party([{ archetypeId: 'warrior', variant: 1, name: '' }]),
    );

    expect(summary.players).toEqual([
      { number: 1, archetype: 'Guerrero', variant: 1, name: 'Guerrero' },
    ]);
  });

  it('conserva el orden y resuelve nombres vacíos con el arquetipo', () => {
    const input = party([
      { archetypeId: 'mage', variant: 2, name: 'Ana' },
      { archetypeId: 'warrior', variant: 1, name: '' },
    ]);
    const snapshot = JSON.stringify(input);

    const summary = createPartySummary(input);

    expect(summary.players).toEqual([
      { number: 1, archetype: 'Mago', variant: 2, name: 'Ana' },
      { number: 2, archetype: 'Guerrero', variant: 1, name: 'Guerrero' },
    ]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('muestra la semilla recibida sin tocarla', () => {
    const summary = createPartySummary(
      party([{ archetypeId: 'rogue', variant: 1, name: 'Boro' }]),
    );

    expect(summary.seed).toBe(SEED);
  });
});

describe('arranque de partida: constructor único', () => {
  it('construye la sesión con la semilla y los dos jugadores configurados', () => {
    const players: readonly PlayerConfig[] = [
      { archetypeId: 'mage', variant: 2, name: 'Ana' },
      { archetypeId: 'warrior', variant: 1, name: 'Boro' },
    ];

    const result = startParty(party(players));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.session.state.config?.players).toEqual(players);
    expect(result.session.state.config?.seed).toBe(SEED);
    expect(result.session.seed).toBe(SEED);
    expect(result.session.state.map?.seed).toBe(SEED);
    expect(
      result.session.state.players.map((player) => ({
        archetypeId: player.archetypeId,
        variant: player.variant,
        name: player.nombre,
      })),
    ).toEqual([
      { archetypeId: 'mage', variant: 2, name: 'Ana' },
      { archetypeId: 'warrior', variant: 1, name: 'Boro' },
    ]);
  });

  it('resuelve el nombre vacío con el del arquetipo al construir el estado', () => {
    const result = startParty(
      party([{ archetypeId: 'warrior', variant: 1, name: '' }]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.state.players[0].nombre).toBe('Guerrero');
  });

  it('rechaza N=0 sin lanzar y devuelve el mensaje del constructor', () => {
    const result = startParty(party([]));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rechaza un arquetipo inventado sin lanzar y sin estado parcial', () => {
    const result = startParty(
      party([
        {
          archetypeId: 'dragon' as ArchetypeId,
          variant: 1,
          name: 'X',
        },
      ]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
  });
});
