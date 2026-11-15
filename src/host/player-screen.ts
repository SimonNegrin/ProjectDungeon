/**
 * Modelo puro de la configuración jugador a jugador (REQ-016 R-005, R-007,
 * R-008, R-011, T-005..T-007).
 *
 * Guarda N borradores en memoria y no conoce el DOM ni el reloj: el host lo
 * consume en `next()` para entregar la party al resumen (TASK-0126). No
 * construye `GameSession`, no arranca partida y no reordena jugadores.
 */

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type PlayerConfig,
  type PlayerVariant,
} from '../game/config';
import { ROSTER, type ArchetypeId } from '../game/roster';

export type PlayerScreenStep = 'player' | 'confirm-cancel';

/** Borrador de un jugador mientras se configura; el nombre ya va normalizado. */
export interface PlayerDraft {
  readonly archetypeId: ArchetypeId;
  readonly variant: PlayerVariant;
  /** Normalizado NFC, sin símbolos y truncado a 12 code points; puede ser ''. */
  readonly name: string;
}

/** Datos fijos que llegan desde el paso 1 y no cambian en esta pantalla. */
export interface PlayerScreenConfig {
  /** Entero de 1 a 6. */
  readonly playerCount: number;
  /** Entero sin signo de 32 bits. */
  readonly seed: number;
}

/** Party completa que la pantalla entrega al punto de extensión del resumen. */
export interface PlayerPartyConfig extends PlayerScreenConfig {
  /** Jugadores en orden 1..N, listos como `GameConfig`. */
  readonly players: readonly PlayerConfig[];
}

export interface PlayerScreenState extends PlayerScreenConfig {
  readonly step: PlayerScreenStep;
  /** Índice 0-based del jugador que se está configurando. */
  readonly index: number;
  /** Copia de solo lectura de los N borradores. */
  readonly players: readonly PlayerDraft[];
}

export interface PlayerScreen {
  state(): PlayerScreenState;
  /** Solo IDs del roster; si cambia, la variante vuelve a 1 sin tocar el nombre. */
  setArchetype(archetypeId: ArchetypeId): void;
  /** Solo 1 o 2; un valor inválido conserva la variante anterior. */
  setVariant(variant: PlayerVariant): void;
  /** Normaliza NFC, filtra y trunca en vivo; nunca lanza ni bloquea. */
  setName(name: string): void;
  /** Recorta el nombre actual y avanza, o devuelve la party en el último. */
  next(): PlayerPartyConfig | null;
  /** Recorta el nombre actual y retrocede; en el jugador 1 no hace nada. */
  back(): void;
  /** Abre la confirmación conservando índice y valores. */
  requestCancel(): void;
  /** Descarta la configuración; `true` una sola vez si había confirmación. */
  confirmCancel(): boolean;
  /** Cierra la confirmación y vuelve al jugador actual sin cambios. */
  dismissCancel(): void;
  /** `Esc`: abre la confirmación en jugador y la cierra en el aviso. */
  escape(): void;
  /** Nombre recortado o, si queda vacío, el del arquetipo. */
  effectiveName(index: number): string;
}

/** Límite de nombre en code points, no en unidades UTF-16. */
export const MAX_NAME_CODE_POINTS = 12;

const DEFAULT_ARCHETYPE: ArchetypeId = 'warrior';
const ALLOWED_NAME_CHARACTER = /^[\p{L}\p{Nd} ]$/u;

function isArchetypeId(value: string): value is ArchetypeId {
  return Object.prototype.hasOwnProperty.call(ROSTER, value);
}

/**
 * Normaliza el nombre: NFC primero (los combinantes se componen), después
 * conserva solo letras, dígitos decimales y espacio U+0020, y trunca por code
 * points. Es idempotente y no lanza con entradas arbitrarias.
 */
export function normalizePlayerName(value: string): string {
  const normalized = value.normalize('NFC');
  const kept = Array.from(normalized).filter((character) =>
    ALLOWED_NAME_CHARACTER.test(character),
  );
  return kept.slice(0, MAX_NAME_CODE_POINTS).join('');
}

/**
 * Construye el modelo con N borradores Guerrero/variante 1/nombre vacío. N y
 * semilla quedan fijos: no hay vuelta al paso 1 desde esta pantalla.
 */
export function createPlayerScreen(config: PlayerScreenConfig): PlayerScreen {
  if (
    !Number.isInteger(config.playerCount) ||
    config.playerCount < MIN_PLAYERS ||
    config.playerCount > MAX_PLAYERS
  ) {
    throw new RangeError(
      `La pantalla de jugador espera entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores; recibió ${String(config.playerCount)}.`,
    );
  }

  const playerCount = config.playerCount;
  const seed = config.seed;
  let step: PlayerScreenStep = 'player';
  let index = 0;
  let discarded = false;
  let drafts: PlayerDraft[] = Array.from({ length: playerCount }, () => ({
    archetypeId: DEFAULT_ARCHETYPE,
    variant: 1 as PlayerVariant,
    name: '',
  }));

  const current = (): PlayerDraft => drafts[index];

  const updateCurrent = (patch: Partial<PlayerDraft>): void => {
    drafts = drafts.map((draft, position) =>
      position === index ? { ...draft, ...patch } : draft,
    );
  };

  const trimCurrentName = (): void => {
    const draft = current();
    const trimmed = draft.name.trim();
    if (trimmed !== draft.name) updateCurrent({ name: trimmed });
  };

  return {
    state(): PlayerScreenState {
      return {
        step,
        index,
        playerCount,
        seed,
        players: drafts.map((draft) => ({ ...draft })),
      };
    },
    setArchetype(archetypeId: ArchetypeId): void {
      if (!isArchetypeId(archetypeId)) return;
      const draft = current();
      // Repetir el mismo arquetipo no resetea la variante ni el nombre.
      if (draft.archetypeId === archetypeId) return;
      updateCurrent({ archetypeId, variant: 1 });
    },
    setVariant(variant: PlayerVariant): void {
      if (variant !== 1 && variant !== 2) return;
      updateCurrent({ variant });
    },
    setName(name: string): void {
      updateCurrent({ name: normalizePlayerName(name) });
    },
    next(): PlayerPartyConfig | null {
      trimCurrentName();
      if (index < playerCount - 1) {
        index += 1;
        return null;
      }
      return {
        playerCount,
        seed,
        players: drafts.map((draft) => ({
          archetypeId: draft.archetypeId,
          variant: draft.variant,
          name: draft.name,
        })),
      };
    },
    back(): void {
      trimCurrentName();
      if (index > 0) index -= 1;
    },
    requestCancel(): void {
      if (step === 'player') step = 'confirm-cancel';
    },
    confirmCancel(): boolean {
      if (step !== 'confirm-cancel' || discarded) return false;
      discarded = true;
      return true;
    },
    dismissCancel(): void {
      if (step === 'confirm-cancel') step = 'player';
    },
    escape(): void {
      if (step === 'player') {
        step = 'confirm-cancel';
        return;
      }
      step = 'player';
    },
    effectiveName(target: number): string {
      const draft = drafts[target] ?? current();
      const name = draft.name.trim();
      return name === '' ? ROSTER[draft.archetypeId].name : name;
    },
  };
}
