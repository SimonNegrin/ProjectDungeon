/**
 * Cargador único de partidas locales (REQ-024 R-005/R-006/R-008/R-009,
 * T-005/T-006/T-015/T-016).
 *
 * Es el único punto que une archivo .zip/.json, validación y estado del motor:
 * - `.zip`: `readSaveZip` aplica T-006 (límites, rutas y entradas) y
 *   `readSaveFiles` valida manifiesto y partida con el esquema v1.
 * - `.json`: `parseSave` valida la partida suelta con el mismo esquema.
 *
 * El módulo no conoce el menú, el DOM del juego ni la presentación: recibe un
 * archivo, devuelve el estado validado y, en `requestGameLoad`, aplica o avisa a
 * través de callbacks. Menú principal y pausa comparten exactamente esta ruta.
 *
 * En `.zip` se cruza el manifiesto con el estado: semilla, turno/ronda, fase y
 * party (nombre y arquetipo) deben coincidir. Un desajuste rechaza la carga
 * antes de tocar la partida en curso.
 */

import { parseSave, readSaveFiles, type SaveManifest } from '../game/save';
import { ROSTER } from '../game/roster';
import type { GameState } from '../game/types';
import { readSaveZip, type SaveZipFiles } from './save-zip';

/** Valor de `accept` del único selector de archivo del host. */
export const LOAD_GAME_ACCEPT = '.zip,.json';

/** Límite de T-006 para un archivo suelto; el `.zip` lo aplica `readSaveZip`. */
export const MAX_SAVE_JSON_BYTES = 5 * 1024 * 1024;

export type SaveFileKind = 'zip' | 'json';

/** Origen de la carga; solo decide si hay partida en curso que confirmar. */
export type LoadGameOrigin = 'menu' | 'pause';

/** Archivo mínimo que el cargador necesita; `File` lo cumple tal cual. */
export interface GameFileHandle {
  readonly name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type LoadGameResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly message: string };

export interface GameFilePicker {
  /**
   * Abre el selector del sistema y resuelve con el archivo elegido o `null` si
   * se cancela. Un segundo `pick` mientras hay uno pendiente resuelve `null`.
   */
  pick(): Promise<GameFileHandle | null>;
}

/** Extensión reconocida, sin distinguir mayúsculas; `null` si no se acepta. */
export function saveFileKind(name: string): SaveFileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.json')) return 'json';
  return null;
}

/** Nombre visible de un jugador de la party, con el respaldo del roster. */
function partyName(player: {
  readonly name: string;
  readonly archetypeId: keyof typeof ROSTER;
}): string {
  return player.name === '' ? ROSTER[player.archetypeId].name : player.name;
}

/**
 * Cruza manifiesto y estado del `.zip`. Devuelve el motivo del rechazo o
 * `null` si coinciden. Función pura: no lanza por datos del archivo.
 */
export function crossCheckManifest(
  manifest: SaveManifest,
  state: GameState,
): string | null {
  if (manifest.seed !== state.rng.seed) {
    return `la semilla ${manifest.seed} no coincide con ${state.rng.seed}`;
  }
  if (manifest.summary.round !== state.round) {
    return `la ronda ${manifest.summary.round} no coincide con ${state.round}`;
  }
  if (manifest.summary.turn !== state.round) {
    return `el turno ${manifest.summary.turn} no coincide con la ronda ${state.round}`;
  }
  if (manifest.summary.phase !== state.phase) {
    return `la fase "${manifest.summary.phase}" no coincide con "${state.phase}"`;
  }

  const party = state.config?.players ?? [];
  if (manifest.summary.players.length !== party.length) {
    return `el manifiesto declara ${manifest.summary.players.length} jugadores y la partida ${party.length}`;
  }
  for (const [index, entry] of manifest.summary.players.entries()) {
    const player = party[index];
    if (player === undefined) {
      return `el manifiesto declara un jugador ${index + 1} que la partida no tiene`;
    }
    if (entry.archetype !== player.archetypeId) {
      return `el arquetipo del jugador ${index + 1} no coincide`;
    }
    if (entry.name !== partyName(player)) {
      return `el nombre del jugador ${index + 1} no coincide`;
    }
  }
  return null;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readZipGame(bytes: Uint8Array): Promise<LoadGameResult> {
  let files: SaveZipFiles;
  try {
    files = await readSaveZip(bytes);
  } catch (error) {
    return { ok: false, message: `No se pudo leer el .zip: ${readError(error)}` };
  }

  const parsed = readSaveFiles(files);
  if (!parsed.ok) {
    return {
      ok: false,
      message: `La partida no es válida: ${parsed.error.message}.`,
    };
  }
  const mismatch = crossCheckManifest(parsed.value.manifest, parsed.value.state);
  if (mismatch !== null) {
    return {
      ok: false,
      message: `El manifiesto no coincide con la partida: ${mismatch}.`,
    };
  }
  return { ok: true, state: parsed.value.state };
}

function readJsonGame(bytes: Uint8Array): LoadGameResult {
  if (bytes.byteLength > MAX_SAVE_JSON_BYTES) {
    return {
      ok: false,
      message: `El archivo .json supera el límite de ${MAX_SAVE_JSON_BYTES / (1024 * 1024)} MB.`,
    };
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, message: 'El archivo .json no es UTF-8 válido.' };
  }

  const parsed = parseSave(text);
  if (!parsed.ok) {
    return {
      ok: false,
      message: `La partida no es válida: ${parsed.error.message}.`,
    };
  }
  return { ok: true, state: parsed.value };
}

/**
 * Lee y valida un archivo de partida. No aplica nada: el host decide cuándo
 * sustituir la sesión. Devuelve el motivo visible de cualquier rechazo.
 */
export async function loadGameFile(
  file: GameFileHandle,
): Promise<LoadGameResult> {
  const kind = saveFileKind(file.name);
  if (kind === null) {
    return {
      ok: false,
      message: 'Solo se puede cargar un archivo .zip o .json de partida.',
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    return {
      ok: false,
      message: `No se pudo leer el archivo: ${readError(error)}`,
    };
  }

  return kind === 'zip' ? readZipGame(bytes) : readJsonGame(bytes);
}

export type LoadGameStatus = 'loaded' | 'cancelled' | 'rejected';

export type LoadGameOutcome =
  | { readonly status: 'loaded'; readonly origin: LoadGameOrigin; readonly state: GameState }
  | { readonly status: 'cancelled'; readonly origin: LoadGameOrigin }
  | { readonly status: 'rejected'; readonly origin: LoadGameOrigin; readonly message: string };

export interface LoadGameRequest {
  readonly origin: LoadGameOrigin;
  readonly pick: () => Promise<GameFileHandle | null>;
  /** Solo se llama con un estado validado; nunca con uno rechazado. */
  readonly apply: (state: GameState) => void;
  /** Mensaje visible de rechazo; la partida en curso queda intacta. */
  readonly notify: (message: string) => void;
}

/**
 * Flujo común de los dos orígenes: elegir archivo, validar, aplicar o avisar.
 * Cancelar el selector no hace cambios. La confirmación de la pausa vive en su
 * modelo de menú y llega aquí ya resuelta: cuando el host llama, el usuario ha
 * confirmado reemplazar la partida.
 */
export async function requestGameLoad(
  request: LoadGameRequest,
): Promise<LoadGameOutcome> {
  let file: GameFileHandle | null;
  try {
    file = await request.pick();
  } catch (error) {
    const message = `No se pudo abrir el archivo: ${readError(error)}`;
    request.notify(message);
    return { status: 'rejected', origin: request.origin, message };
  }

  if (file === null) return { status: 'cancelled', origin: request.origin };

  const result = await loadGameFile(file);
  if (!result.ok) {
    request.notify(result.message);
    return {
      status: 'rejected',
      origin: request.origin,
      message: result.message,
    };
  }

  request.apply(result.state);
  return { status: 'loaded', origin: request.origin, state: result.state };
}

/**
 * Único selector de archivo del host, reutilizado por el menú y la pausa. No
 * crea nodos: recibe el `input[type=file]` de la estructura y pide abrirlo.
 */
export function createGameFilePicker(input: HTMLInputElement): GameFilePicker {
  let resolvePending: ((file: GameFileHandle | null) => void) | null = null;

  const settle = (file: GameFileHandle | null): void => {
    const resolve = resolvePending;
    resolvePending = null;
    // Vaciar el valor permite volver a elegir el mismo archivo.
    input.value = '';
    resolve?.(file);
  };

  input.addEventListener('change', () => {
    settle(input.files?.[0] ?? null);
  });
  input.addEventListener('cancel', () => settle(null));

  return {
    pick(): Promise<GameFileHandle | null> {
      if (resolvePending !== null) return Promise.resolve(null);
      input.value = '';
      return new Promise((resolve) => {
        resolvePending = resolve;
        try {
          input.click();
        } catch {
          settle(null);
        }
      });
    },
  };
}
