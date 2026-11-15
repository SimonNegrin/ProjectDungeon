import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../../../src/game/engine';
import {
  buildSaveFiles,
  parseManifest,
  type SaveFiles,
} from '../../../src/game/save';
import type { GameState } from '../../../src/game/types';
import {
  activatePauseAction,
  createPauseState,
  escapePause,
  openPause,
  type PauseContext,
} from '../../../src/host/pause-menu';
import {
  MAX_SAVE_JSON_BYTES,
  crossCheckManifest,
  loadGameFile,
  requestGameLoad,
  saveFileKind,
  type GameFileHandle,
} from '../../../src/host/load-game';
import { writeSaveZip } from '../../../src/host/save-zip';

const SEED = 2738263054;
const GAME_VERSION = '0.1.0';
const CREATED_AT = '2026-11-15T20:00:00Z';

const READY: PauseContext = {
  phase: 'player',
  status: 'playing',
  animating: false,
  panning: false,
};

/** Dos jugadores con nombre propio: el manifiesto y el HUD tienen texto real. */
function twoPlayerState(): GameState {
  return createInitialState({
    seed: SEED,
    players: [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'warrior', variant: 2, name: 'Bru' },
    ],
  });
}

/** Estado con ronda y activo distintos del inicial para comprobar la carga. */
function midGameState(): GameState {
  const base = twoPlayerState();
  return {
    ...base,
    round: 3,
    activePlayerId: base.players[1].id,
  };
}

function saveFiles(state: GameState = midGameState()): SaveFiles {
  return buildSaveFiles(state, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
}

async function zipHandle(
  files: SaveFiles,
  name = 'proyectdungeon.zip',
): Promise<GameFileHandle> {
  const bytes = await writeSaveZip(files);
  return { name, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
}

function jsonHandle(text: string, name = 'partida.json'): GameFileHandle {
  const bytes = new TextEncoder().encode(text);
  return { name, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
}

function withManifest(
  files: SaveFiles,
  change: (manifest: Record<string, unknown>) => void,
): SaveFiles {
  const manifest = JSON.parse(files.manifest) as Record<string, unknown>;
  change(manifest);
  return { ...files, manifest: JSON.stringify(manifest) };
}

function parsedManifest(files: SaveFiles) {
  const manifest = parseManifest(files.manifest);
  if (!manifest.ok) throw new Error(manifest.error.message);
  return manifest.value;
}

describe('cargador único .zip/.json', () => {
  it('reconoce .zip y .json sin distinguir mayúsculas y rechaza el resto', () => {
    expect(saveFileKind('partida.zip')).toBe('zip');
    expect(saveFileKind('PROYECTDUNGEON.ZIP')).toBe('zip');
    expect(saveFileKind('partida.json')).toBe('json');
    expect(saveFileKind('Partida.JSON')).toBe('json');
    expect(saveFileKind('partida.txt')).toBeNull();
    expect(saveFileKind('partida.zip.txt')).toBeNull();
  });

  it('carga un .zip validado y conserva ronda, activo y party', async () => {
    const state = midGameState();
    const result = await loadGameFile(await zipHandle(saveFiles(state)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.rng.seed).toBe(SEED);
    expect(result.state.round).toBe(3);
    expect(result.state.activePlayerId).toBe(state.players[1].id);
    expect(result.state.phase).toBe('player');
    expect(result.state.config?.players.map((player) => player.name)).toEqual([
      'Ana',
      'Bru',
    ]);
    expect(result.state.players.map((player) => player.id)).toEqual([
      'player-1',
      'player-2',
    ]);
  });

  it('carga un .zip con mago y clérigo y conserva sus stats negativos', async () => {
    const state = createInitialState({
      seed: SEED,
      players: [
        { archetypeId: 'mage', variant: 1, name: 'Bru' },
        { archetypeId: 'cleric', variant: 2, name: 'Cle' },
      ],
    });
    expect(state.players[0]?.stats.fuerza).toBe(-1);
    expect(state.players[1]?.stats.fuerza).toBe(-1);

    const result = await loadGameFile(await zipHandle(saveFiles(state)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual(state);
    expect(result.state.players[0]?.stats.fuerza).toBe(-1);
  });

  it('carga un .json suelto con el mismo esquema v1', async () => {
    const result = await loadGameFile(jsonHandle(saveFiles().save));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.rng.seed).toBe(SEED);
    expect(result.state.round).toBe(3);
    expect(result.state.activePlayerId).toBe('player-2');
  });

  it('rechaza una extensión no admitida con mensaje visible', async () => {
    const result = await loadGameFile(jsonHandle('{}', 'partida.txt'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('.zip o .json');
  });

  it('un .zip corrupto se rechaza sin estado', async () => {
    const bytes = new TextEncoder().encode('PK\u0003\u0004 roto');
    const result = await loadGameFile({
      name: 'roto.zip',
      arrayBuffer: async () => bytes.buffer as ArrayBuffer,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('No se pudo leer el .zip');
  });

  it('un .json malformado se rechaza sin estado', async () => {
    const result = await loadGameFile(jsonHandle('{"format_version":1}'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('La partida no es válida');
  });

  it('aplica el límite de 5 MB a un .json suelto', async () => {
    const result = await loadGameFile({
      name: 'grande.json',
      arrayBuffer: async () => new ArrayBuffer(MAX_SAVE_JSON_BYTES + 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('5 MB');
  });
});

describe('validación cruzada manifiesto ↔ partida', () => {
  it('acepta un manifiesto que coincide en semilla, turno, ronda, fase y party', () => {
    const state = midGameState();
    expect(crossCheckManifest(parsedManifest(saveFiles(state)), state)).toBeNull();
  });

  it('acepta el nombre del roster cuando la party no trae nombre propio', async () => {
    const state = createInitialState({ seed: SEED });
    expect(state.config?.players[0]?.name).toBe('');

    const result = await loadGameFile(await zipHandle(saveFiles(state)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.config?.players[0]?.name).toBe('');
  });

  it('rechaza semilla, ronda, turno y fase distintas', () => {
    const state = midGameState();
    const manifest = parsedManifest(saveFiles(state));
    const summary = manifest.summary;

    expect(
      crossCheckManifest({ ...manifest, seed: manifest.seed + 1 }, state),
    ).toContain('semilla');
    expect(
      crossCheckManifest(
        { ...manifest, summary: { ...summary, round: summary.round + 1 } },
        state,
      ),
    ).toContain('ronda');
    expect(
      crossCheckManifest(
        { ...manifest, summary: { ...summary, turn: summary.turn + 1 } },
        state,
      ),
    ).toContain('turno');
    expect(
      crossCheckManifest(
        { ...manifest, summary: { ...summary, phase: 'enemy' } },
        state,
      ),
    ).toContain('fase');
  });

  it('rechaza nombre, arquetipo y número de jugadores distintos', () => {
    const state = midGameState();
    const manifest = parsedManifest(saveFiles(state));
    const players = manifest.summary.players;

    expect(
      crossCheckManifest(
        {
          ...manifest,
          summary: {
            ...manifest.summary,
            players: [{ ...players[0]!, name: 'Otra' }, players[1]!],
          },
        },
        state,
      ),
    ).toContain('nombre del jugador 1');
    expect(
      crossCheckManifest(
        {
          ...manifest,
          summary: {
            ...manifest.summary,
            players: [
              { ...players[0]!, archetype: 'rogue' },
              players[1]!,
            ],
          },
        },
        state,
      ),
    ).toContain('arquetipo del jugador 1');
    expect(
      crossCheckManifest(
        {
          ...manifest,
          summary: { ...manifest.summary, players: [players[0]!] },
        },
        state,
      ),
    ).toContain('la partida 2');
  });

  it('el cargador rechaza un .zip cuyo manifiesto no coincide con la partida', async () => {
    const tampered = withManifest(saveFiles(), (manifest) => {
      manifest.seed = 1;
    });
    const result = await loadGameFile(await zipHandle(tampered));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('El manifiesto no coincide con la partida');
      expect(result.message).toContain('semilla');
    }
  });
});

describe('flujo compartido por menú y pausa', () => {
  it('el menú carga directo, sin confirmación y aplicando una sola vez', async () => {
    const apply = vi.fn();
    const notify = vi.fn();
    const expected = midGameState();

    const outcome = await requestGameLoad({
      origin: 'menu',
      pick: async () => await zipHandle(saveFiles(expected)),
      apply,
      notify,
    });

    expect(outcome.status).toBe('loaded');
    expect(apply).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
    expect(apply.mock.calls[0]![0]).toMatchObject({
      round: expected.round,
      activePlayerId: expected.activePlayerId,
    });
  });

  it('menú y pausa comparten cargador: el mismo archivo produce el mismo estado', async () => {
    const handles = {
      menu: await zipHandle(saveFiles()),
      pause: await zipHandle(saveFiles()),
    };
    const applied: GameState[] = [];

    const fromMenu = await requestGameLoad({
      origin: 'menu',
      pick: async () => handles.menu,
      apply: (state) => applied.push(state),
      notify: vi.fn(),
    });
    const fromPause = await requestGameLoad({
      origin: 'pause',
      pick: async () => handles.pause,
      apply: (state) => applied.push(state),
      notify: vi.fn(),
    });

    expect(fromMenu.status).toBe('loaded');
    expect(fromPause.status).toBe('loaded');
    expect(applied).toHaveLength(2);
    expect(applied[0]).toEqual(applied[1]);
  });

  it('cancelar el selector no aplica ni avisa', async () => {
    const apply = vi.fn();
    const notify = vi.fn();

    const outcome = await requestGameLoad({
      origin: 'pause',
      pick: async () => null,
      apply,
      notify,
    });

    expect(outcome).toEqual({ status: 'cancelled', origin: 'pause' });
    expect(apply).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('un archivo inválido avisa y deja intacta la partida', async () => {
    const apply = vi.fn();
    const notify = vi.fn();

    const outcome = await requestGameLoad({
      origin: 'pause',
      pick: async () => jsonHandle('{"format_version":1}'),
      apply,
      notify,
    });

    expect(outcome.status).toBe('rejected');
    expect(apply).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toContain('La partida no es válida');
  });

  it('en pausa el aviso confirma antes de cargar; cancelarlo no hace nada', async () => {
    const opened = openPause(createPauseState(), READY);

    // «Cargar partida» abre el aviso; no hay efecto de carga todavía.
    const ask = activatePauseAction(opened, 'load-game');
    expect(ask.effect).toBe('none');
    expect(ask.state.screen).toBe('confirm-load');

    // Esc en el aviso vuelve a la raíz sin ejecutar el cargador.
    expect(escapePause(ask.state)).toMatchObject({
      open: true,
      screen: 'root',
      index: 2,
    });

    // Confirmar emite el único efecto que el host traduce en carga compartida.
    const confirmed = activatePauseAction(ask.state);
    expect(confirmed.effect).toBe('confirm-load');

    const apply = vi.fn();
    const outcome = await requestGameLoad({
      origin: 'pause',
      pick: async () => await zipHandle(saveFiles()),
      apply,
      notify: vi.fn(),
    });
    expect(outcome.status).toBe('loaded');
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
