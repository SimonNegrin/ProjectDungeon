import type { Command, GameState, Position, Unit } from '../game/types';
import type { NoticeCode } from './notices';

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
  | 'no-target';

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
  | { readonly type: 'ignored'; readonly reason: InputIgnoreReason };

const MOVES: Readonly<Record<string, { readonly dx: number; readonly dy: number }>> = {
  w: { dx: 0, dy: -1 },
  arrowup: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  arrowdown: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  arrowleft: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
};

const MANAGED_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'f',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'e',
  'r',
  'enter',
  ' ',
  'spacebar',
  'f1',
  'f2',
]);

/** Teclas cuyo comportamiento del navegador conviene bloquear. */
export function isManagedKey(key: string): boolean {
  return MANAGED_KEYS.has(key.toLowerCase());
}

function command(value: Command): InputIntent {
  return { type: 'command', command: value };
}

function ignored(reason: InputIgnoreReason): InputIntent {
  return { type: 'ignored', reason };
}

function findActivePlayer(state: GameState): Unit | undefined {
  return state.players.find((player) => player.hp > 0);
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
 * - `F1` y `F2` son acciones del host; `F2` también funciona con la partida
 *   terminada.
 * - Con la partida terminada solo `R`, `F1` y `F2` reaccionan.
 * - Flechas/`WASD` mueven el cursor del host en cuatro direcciones.
 * - `Espacio`/`Enter` envían `MoveTo` al tile del cursor.
 * - `F` envía `Attack` contra el enemigo bajo el cursor; sin enemigo avisa.
 * - Movimiento, acciones y fin de turno exigen fase de jugador.
 */
export function translateKey(input: KeyInput, state: GameState, cursor: Position): InputIntent {
  if (input.repeat) return ignored('repeat');
  if (input.ctrlKey || input.metaKey || input.altKey) return ignored('modifier');

  const key = input.key.toLowerCase();

  if (key === 'f1') return { type: 'toggle-debug' };
  if (key === 'f2') return { type: 'new-seed' };
  if (key === 'r') return command({ type: 'Restart' });

  if (state.status !== 'playing') return ignored('game-over');

  const cursorMove = MOVES[key];
  if (cursorMove) {
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!findActivePlayer(state)) return ignored('no-active-player');
    return { type: 'cursor', dx: cursorMove.dx, dy: cursorMove.dy };
  }

  if (key === 'e') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    if (!findActivePlayer(state)) return ignored('no-active-player');
    return command({ type: 'EndTurn' });
  }

  if (key === 'enter' || key === ' ' || key === 'spacebar') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    const player = findActivePlayer(state);
    if (!player) return ignored('no-active-player');
    return command({
      type: 'MoveTo',
      unitId: player.id,
      target: { x: cursor.x, y: cursor.y },
    });
  }

  if (key === 'f') {
    if (state.phase !== 'player') return ignored('wrong-phase');
    const player = findActivePlayer(state);
    if (!player) return ignored('no-active-player');

    const target = findEnemyAt(state, cursor);
    if (!target) return { type: 'notice', notice: 'enemy-out-of-range' };
    return command({ type: 'Attack', unitId: player.id, targetId: target.id });
  }

  return ignored('unmapped');
}
