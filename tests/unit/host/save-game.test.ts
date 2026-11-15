import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../../../src/game/engine';
import { parseManifest, readSaveFiles } from '../../../src/game/save';
import { ROSTER } from '../../../src/game/roster';
import type { GameState } from '../../../src/game/types';
import { readSaveZip } from '../../../src/host/save-zip';
import {
  saveFileName,
  saveGame,
  type SaveGameDeps,
} from '../../../src/host/save-game';

const SEED = 2738263054;
const GAME_VERSION = '0.1.0';
const CREATED_AT = new Date('2026-11-15T19:05:06Z');

/** Semilla fija y dos jugadores por defecto: estado real y serializable. */
function makeState(): GameState {
  return createInitialState({ seed: SEED });
}

function collectingDeps(
  overrides: Partial<SaveGameDeps> = {},
): { readonly deps: SaveGameDeps; readonly downloads: { filename: string; bytes: Uint8Array }[] } {
  const downloads: { filename: string; bytes: Uint8Array }[] = [];
  return {
    downloads,
    deps: {
      gameVersion: GAME_VERSION,
      now: () => CREATED_AT,
      download: (filename, bytes) => downloads.push({ filename, bytes }),
      ...overrides,
    },
  };
}

describe('guardado desde el host', () => {
  it('descarga un único zip con manifiesto y partida, sin presentación', async () => {
    const state = makeState();
    const { deps, downloads } = collectingDeps();

    const result = await saveGame(state, deps);

    expect(result.ok).toBe(true);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toBe(
      `proyectdungeon-${SEED}-20261115-190506.zip`,
    );

    const files = await readSaveZip(downloads[0]!.bytes);

    // Manifiesto: versión de formato, versión del juego, fecha UTC, semilla y
    // resumen con nombre y arquetipo de la party.
    const manifest = parseManifest(files.manifest);
    expect(manifest.ok).toBe(true);
    if (!manifest.ok) return;
    expect(manifest.value).toEqual({
      format_version: 1,
      game_version: GAME_VERSION,
      created_at: '2026-11-15T19:05:06Z',
      seed: SEED,
      summary: {
        players: state.config!.players.map((player) => ({
          name:
            player.name === ''
              ? ROSTER[player.archetypeId].name
              : player.name,
          archetype: player.archetypeId,
        })),
        turn: state.round,
        round: state.round,
        phase: state.phase,
      },
    });

    // La partida se lee con el mismo esquema y conserva el estado del motor.
    const loaded = readSaveFiles(files);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.state.rng.seed).toBe(SEED);
    expect(loaded.value.state.round).toBe(state.round);
    expect(loaded.value.state.phase).toBe(state.phase);
    expect(loaded.value.state.activePlayerId).toBe(state.activePlayerId);

    // Sin presentación: ni timeline, ni cámara, ni cursor, ni panel.
    const raw = JSON.parse(files.save) as Record<string, unknown>;
    for (const key of ['timeline', 'camera', 'cursor', 'panel', 'banner', 'damageTexts']) {
      expect(raw).not.toHaveProperty(key);
    }
    expect(files.save).not.toMatch(/timeline|camera|cursor|damageTexts/);
  });

  it('dos guardados en segundos distintos producen nombres distintos', async () => {
    let clock = new Date(CREATED_AT);
    const { deps, downloads } = collectingDeps({ now: () => clock });

    const first = await saveGame(makeState(), deps);
    clock = new Date(CREATED_AT.getTime() + 1000);
    const second = await saveGame(makeState(), deps);

    expect(first.ok && second.ok).toBe(true);
    expect(downloads.map((entry) => entry.filename)).toEqual([
      `proyectdungeon-${SEED}-20261115-190506.zip`,
      `proyectdungeon-${SEED}-20261115-190507.zip`,
    ]);
    expect(new Set(downloads.map((entry) => entry.filename)).size).toBe(2);
  });

  it('si la serialización falla avisa y no descarga nada', async () => {
    const state: GameState = { ...makeState(), map: undefined };
    const download = vi.fn();
    const { deps } = collectingDeps({ download });

    const result = await saveGame(state, deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('No se pudo guardar la partida');
    expect(download).not.toHaveBeenCalled();
  });

  it('si falla el contenedor zip avisa y no descarga nada', async () => {
    const download = vi.fn();
    const { deps } = collectingDeps({
      download,
      writeZip: async () => {
        throw new Error('compresión simulada');
      },
    });

    const result = await saveGame(makeState(), deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('compresión simulada');
    }
    expect(download).not.toHaveBeenCalled();
  });

  it('el nombre usa la semilla de la partida y la fecha UTC', () => {
    expect(saveFileName(SEED, new Date('2026-01-02T03:04:05Z'))).toBe(
      `proyectdungeon-${SEED}-20260102-030405.zip`,
    );
  });
});
