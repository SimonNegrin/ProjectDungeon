import { activePlayer } from '../game/party';
import type { SpellId } from '../game/spells';
import type { Command, GameState, Position, Unit } from '../game/types';
import { KEY_BINDINGS, MANAGED_KEY_CODES } from './keymap';
import type { NoticeCode } from './notices';
import { SPELL_ORDER, type SpellMenuSelection } from './spell-menu';

/** Datos mínimos de un evento de teclado; permite probar el mapeo sin DOM. */
export interface KeyInput {
  readonly key: string;
  readonly repeat?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

export type InputIgnoreReason =
  | 'repeat'
  | 'modifier'
  | 'unmapped'
  | 'game-over'
  | 'wrong-phase'
  | 'no-active-player'
  | 'no-target'
  | 'animating'
  | 'panning'
  | 'spell-menu-open'
  | 'panel-open';

export interface TranslateKeyOptions {
  /** Con una animación activa solo responden `F1` y `Esc`; el resto se descarta. */
  readonly animating?: boolean;
  /** Con un paneo de cámara activo solo responden `F1` y `Esc`; el resto se descarta. */
  readonly panning?: boolean;
  /** Estado de la lista de hechizos; sin él se comporta como cerrada y vacía. */
  readonly spellMenu?: SpellMenuSelection;
  /** Panel de personaje abierto: bloquea los comandos del mapa (R-015/T-009). */
  readonly panelOpen?: boolean;
}

/**
 * Intención de input. Los comandos se envían al motor; el movimiento del cursor
 * y los avisos son acciones del host. `toggle-debug` y `new-seed` son acciones
 * de presentación que no alteran el estado de la partida por sí mismas.
 */
export type InputIntent =
  | { readonly type: 'command'; readonly command: Command }
  | { readonly type: 'cursor'; readonly dx: number; readonly dy: number }
  | { readonly type: 'notice'; readonly notice: NoticeCode }
  | { readonly type: 'toggle-debug' }
  | { readonly type: 'new-seed' }
  | { readonly type: 'spell-menu-toggle' }
  | { readonly type: 'spell-menu-close' }
  | { readonly type: 'spell-menu-move'; readonly delta: number }
  | { readonly type: 'spell-menu-select'; readonly spellId: SpellId }
  | { readonly type: 'spell-cast'; readonly spellId: SpellId; readonly unitId: string; readonly target: Position }
  | { readonly type: 'pause-toggle' }
  | { readonly type: 'panel-open' }
  | { readonly type: 'panel-close' }
  | { readonly type: 'ignored'; readonly reason: InputIgnoreReason };

/**
 * Tabla de movimiento derivada del mapa único: cada código con `cursor` aporta
 * su delta. No hay una segunda lista literal de WASD o flechas.
 */
const MOVES: Readonly<Map<string, { readonly dx: number; readonly dy: number }>> =
  new Map(
    KEY_BINDINGS.flatMap((binding) => {
      const step = binding.cursor;
      if (step === undefined) return [];
      return binding.codes.map(
        (code) => [code, { dx: step.dx, dy: step.dy }] as const,
      );
    }),
  );

/** Teclas cuyo comportamiento del navegador conviene bloquear. */
export function isManagedKey(key: string): boolean {
  return MANAGED_KEY_CODES.has(key.toLowerCase());
}

function command(value: Command): InputIntent {
  return { type: 'command', command: value };
}

function ignored(reason: InputIgnoreReason): InputIntent {
  return { type: 'ignored', reason };
}

/**
 * El panel pertenece al jugador activo y solo si está vivo (REQ-018 T-009,
 * REQ-034 T-006). Un fantasma activo no lo abre aunque otro jugador siga vivo.
 */
function activePlayerCanOpenPanel(state: GameState): Unit | undefined {
  const active = activePlayer(state);
  return active !== undefined && active.hp > 0 ? active : undefined;
}

/** Condición de apertura del panel: partida en curso, fase de jugador y activo vivo. */
export function canOpenCharacterPanel(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  if (state.phase !== 'player') return false;
  return activePlayerCanOpenPanel(state) !== undefined;
}

/** Enemigo vivo exactamente en el tile bajo el cursor. */
function findEnemyAt(state: GameState, cursor: Position): Unit | undefined {
  return state.enemies.find(
    (enemy) => enemy.hp > 0 && enemy.x === cursor.x && enemy.y === cursor.y,
  );
}

/**
 * Traduce una pulsación a una intención. Es una función pura: no toca el DOM,
 * no despacha comandos y no muta el estado ni el cursor.
 *
 * Reglas:
 * - `repeat` y modificadores (ctrl/meta/alt) se ignoran.
 * - Con el panel abierto solo `Escape` e `I` cierran; el resto se bloquea.
 * - Con una animación o un paneo activos responden `F1` y `Esc`; el resto se
 *   descarta. El aviso de ronda no bloquea.
 * - `I` abre el panel en fase de jugador con un jugador vivo, sin coste.
 * - `F1` y `F2` son acciones del host; `F2` también funciona con la partida
 *   terminada.
 * - Con la partida terminada solo `F1` y `F2` reaccionan.
 * - Flechas/`WASD` mueven el cursor del host en cuatro direcciones.
 * - `Espacio`/`Enter` envían `MoveTo` al tile del cursor.
 * - `F` envía `Attack` contra el enemigo bajo el cursor; sin enemigo avisa.
 * - `Q` abre/cierra la lista de hechizos; con la lista abierta `↑/↓` o `W/S`
 *   navegan, `1`-`6` eligen, `Enter` lanza contra el cursor y `Esc` cierra.
 * - Cerrada, `X` lanza el hechizo seleccionado.
 * - `Esc` abre la pausa salvo que el panel o la lista de hechizos estén
 *   abiertos, en cuyo caso los cierra (REQ-024 R-001/R-002).
 * - Movimiento, acciones y fin de turno exigen fase de jugador y usan al activo.
 * - `N` termina el turno; `E` y `R` ya no se mapean.
 * - `G` y `1`-`3` ya no gestionan equipo: recoger, equipar y cambiar de arma
 *   viven en el panel.
 */
export function translateKey(
  input: KeyInput,
  state: GameState,
  cursor: Position,
  options: TranslateKeyOptions = {},
): InputIntent {
  if (input.repeat) return ignored('repeat');
  if (input.ctrlKey || input.metaKey || input.altKey) return ignored('modifier');

  const key = input.key.toLowerCase();

  // El panel es modal: mientras está abierto ningún comando del mapa, ni
  // siquiera el debug, llega al motor.
  if (options.panelOpen) {
    if (key === 'escape' || key === 'i') return { type: 'panel-close' };
    return ignored('panel-open');
  }

  if (key === 'f1') return { type: 'toggle-debug' };
  // `Esc` es global: abre la pausa aunque haya una animación en curso. Con la
  // lista de hechizos abierta, primero la cierra.
  if (key === 'escape') {
    return options.spellMenu?.open === true
      ? { type: 'spell-menu-close' }
      : { type: 'pause-toggle' };
  }
  if (options.animating) return ignored('animating');
  if (options.panning) return ignored('panning');

  if (key === 'f2') return { type: 'new-seed' };

  if (key === 'i') {
    if (state.status !== 'playing') return ignored('game-over');
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!activePlayerCanOpenPanel(state)) return ignored('no-active-player');
    if (options.spellMenu?.open) return ignored('spell-menu-open');
    return { type: 'panel-open' };
  }

  if (state.status !== 'playing') return ignored('game-over');

  const menu = options.spellMenu;

  if (key === 'q') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!activePlayer(state)) return ignored('no-active-player');
    return { type: 'spell-menu-toggle' };
  }

  if (menu?.open) {
    if (key === 'arrowup' || key === 'w') {
      return { type: 'spell-menu-move', delta: -1 };
    }
    if (key === 'arrowdown' || key === 's') {
      return { type: 'spell-menu-move', delta: 1 };
    }

    const slot = Number.parseInt(key, 10);
    if (/^[1-6]$/.test(key) && slot >= 1 && slot <= SPELL_ORDER.length) {
      return { type: 'spell-menu-select', spellId: SPELL_ORDER[slot - 1] };
    }

    if (key === 'enter') {
      const player = activePlayer(state);
      if (!player) return ignored('no-active-player');
      const highlighted = Math.min(
        Math.max(0, menu.index),
        SPELL_ORDER.length - 1,
      );
      const spellId = SPELL_ORDER[highlighted];
      return {
        type: 'spell-cast',
        spellId,
        unitId: player.id,
        target: { x: cursor.x, y: cursor.y },
      };
    }

    return ignored('spell-menu-open');
  }

  if (key === 'x') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    const player = activePlayer(state);
    if (!player) return ignored('no-active-player');
    if (!menu?.selectedId) {
      return { type: 'notice', notice: 'no-spell-selected' };
    }
    return {
      type: 'spell-cast',
      spellId: menu.selectedId,
      unitId: player.id,
      target: { x: cursor.x, y: cursor.y },
    };
  }

  const cursorMove = MOVES.get(key);
  if (cursorMove) {
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!activePlayer(state)) return ignored('no-active-player');
    return { type: 'cursor', dx: cursorMove.dx, dy: cursorMove.dy };
  }

  if (key === 'n') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!activePlayer(state)) return ignored('no-active-player');
    return command({ type: 'EndTurn' });
  }

  if (key === 'enter' || key === ' ' || key === 'spacebar') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    const player = activePlayer(state);
    if (!player) return ignored('no-active-player');
    return command({
      type: 'MoveTo',
      unitId: player.id,
      target: { x: cursor.x, y: cursor.y },
    });
  }

  if (key === 'f') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    const player = activePlayer(state);
    if (!player) return ignored('no-active-player');

    const target = findEnemyAt(state, cursor);
    if (!target) return { type: 'notice', notice: 'enemy-out-of-range' };
    return command({ type: 'Attack', unitId: player.id, targetId: target.id });
  }

  return ignored('unmapped');
}
