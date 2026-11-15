/**
 * Orquestación del guardado local (REQ-024 R-003/R-004/R-015, T-002/T-009).
 *
 * Es el único punto que une motor y archivo: `buildSaveFiles` serializa el
 * estado y `writeSaveZip` lo empaqueta. El módulo no conoce el DOM ni el menú;
 * recibe reloj, descarga y versión para poder probarse sin navegador.
 *
 * El archivo se construye y comprime antes de llamar a `download`: si algo
 * falla, no se entrega un `.zip` parcial. El nombre usa UTC y la semilla del
 * estado; dos segundos distintos producen nombres distintos.
 */

import type { GameState } from '../game/types';
import { buildSaveFiles } from '../game/save';
import { writeSaveZip, type SaveZipFiles } from './save-zip';

export interface SaveGameDeps {
  /** Versión informativa del juego; sale de `package.json` en el host. */
  readonly gameVersion: string;
  /** Reloj inyectable; el host usa `new Date()`. */
  readonly now: () => Date;
  /** Entrega final del archivo; solo se llama tras comprimir con éxito. */
  readonly download: (filename: string, bytes: Uint8Array) => void;
  /**
   * Contenedor inyectable solo para probar el fallo de compresión. Producción
   * usa siempre `writeSaveZip`.
   */
  readonly writeZip?: (files: SaveZipFiles) => Promise<Uint8Array>;
}

export type SaveGameResult =
  | { readonly ok: true; readonly filename: string; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly message: string };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Fecha ISO UTC sin milisegundos, formato que exige el manifiesto v1. */
export function saveTimestamp(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('El reloj no devolvió una fecha válida.');
  }
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}Z`
  );
}

/** `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha UTC. */
export function saveFileName(seed: number, date: Date): string {
  const createdAt = saveTimestamp(date);
  const stamp = createdAt.slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return `proyectdungeon-${seed}-${stamp}.zip`;
}

function failure(error: unknown): SaveGameResult {
  const detail = error instanceof Error ? error.message : String(error);
  return { ok: false, message: `No se pudo guardar la partida: ${detail}` };
}

/**
 * Construye `manifiesto.json` + `partida.json`, los comprime y solo entonces
 * entrega el único `.zip`. Devuelve el motivo visible si algo falla.
 */
export async function saveGame(
  state: GameState,
  deps: SaveGameDeps,
): Promise<SaveGameResult> {
  try {
    const now = deps.now();
    const createdAt = saveTimestamp(now);
    // La semilla canónica es la del RNG; `buildSaveFiles` exige que coincida
    // con la de configuración y mapa.
    const filename = saveFileName(state.rng.seed, now);
    const files = buildSaveFiles(state, {
      gameVersion: deps.gameVersion,
      createdAt,
    });
    const writeZip = deps.writeZip ?? writeSaveZip;
    const bytes = await writeZip(files);
    deps.download(filename, bytes);
    return { ok: true, filename, bytes };
  } catch (error) {
    return failure(error);
  }
}
