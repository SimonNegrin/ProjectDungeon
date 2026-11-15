/**
 * Modelo puro del menú de pausa (REQ-024 R-001/R-002/R-003/R-007/R-013).
 *
 * No toca el DOM, el reloj ni el motor: recibe un contexto derivado del estado
 * y devuelve la siguiente instantánea del menú. El host aplica los efectos
 * (`close`, `confirm-*`, `save`) y la vista solo pinta esta instantánea.
 */

export const PAUSE_ACTIONS = [
  'resume',
  'new-game',
  'load-game',
  'save-game',
  'controls',
] as const;

export type PauseAction = (typeof PAUSE_ACTIONS)[number];

export type PauseScreen = 'root' | 'controls' | 'confirm-new' | 'confirm-load';

/** Datos mínimos del host que deciden si guardar está disponible. */
export interface PauseContext {
  readonly phase: 'player' | 'enemy';
  readonly status: 'playing' | 'victory' | 'defeat';
  readonly animating: boolean;
  readonly panning: boolean;
}

export interface SaveAvailability {
  readonly enabled: boolean;
  /** Motivo visible cuando `enabled` es `false`; `null` si se puede guardar. */
  readonly reason: string | null;
}

export interface PauseState {
  readonly open: boolean;
  readonly screen: PauseScreen;
  readonly index: number;
  readonly save: SaveAvailability;
}

/** Efecto que el host ejecuta después de activar una acción. */
export type PauseEffect =
  | 'none'
  | 'close'
  | 'save'
  | 'confirm-new'
  | 'confirm-load';

export interface PauseTransition {
  readonly state: PauseState;
  readonly effect: PauseEffect;
}

const CLOSED: PauseState = {
  open: false,
  screen: 'root',
  index: 0,
  save: { enabled: false, reason: null },
};

/** Estado cerrado inicial. `openPause` recalcula la disponibilidad de guardar. */
export function createPauseState(): PauseState {
  return { ...CLOSED, save: { ...CLOSED.save } };
}

/**
 * Guardar exige partida en juego, fase de personajes, sin animación y sin
 * paneo (R-003/T-007). El motivo distingue cada causa para que el menú explique
 * por qué está desactivado.
 */
export function saveAvailability(context: PauseContext): SaveAvailability {
  if (context.status !== 'playing') {
    return {
      enabled: false,
      reason: 'No se puede guardar una partida terminada.',
    };
  }
  if (context.phase !== 'player') {
    return {
      enabled: false,
      reason: 'Solo se puede guardar en la fase de personajes.',
    };
  }
  if (context.animating) {
    return {
      enabled: false,
      reason: 'Espera a que termine la animación para guardar.',
    };
  }
  if (context.panning) {
    return {
      enabled: false,
      reason: 'Espera a que termine el paneo para guardar.',
    };
  }
  return { enabled: true, reason: null };
}

function safeIndex(index: number): number {
  if (!Number.isInteger(index)) return 0;
  return Math.min(PAUSE_ACTIONS.length - 1, Math.max(0, index));
}

/**
 * Abre la pausa en la raíz con la selección en «Reanudar» y congela la
 * disponibilidad de guardar con el contexto del instante de apertura.
 */
export function openPause(state: PauseState, context: PauseContext): PauseState {
  if (state.open) return state;
  return {
    open: true,
    screen: 'root',
    index: 0,
    save: saveAvailability(context),
  };
}

export function closePause(state: PauseState): PauseState {
  if (!state.open) return state;
  return createPauseState();
}

/** Mueve la selección de la raíz sin rebotar en los extremos. */
export function movePauseSelection(state: PauseState, delta: number): PauseState {
  if (!state.open || state.screen !== 'root' || !Number.isFinite(delta)) {
    return state;
  }
  return { ...state, index: safeIndex(state.index + Math.trunc(delta)) };
}

/**
 * Activa una acción. Sin `action` explícita usa la selección de la raíz; la
 * vista pasa la acción pulsada con ratón. Los submenús no ejecutan acciones de
 * la raíz: `controls` solo vuelve con `escapePause` y una confirmación activa
 * confirma y cierra.
 */
export function activatePauseAction(
  state: PauseState,
  action?: PauseAction,
): PauseTransition {
  if (!state.open) return { state, effect: 'none' };

  if (state.screen === 'confirm-new') {
    return {
      state: closePause(state),
      effect: 'confirm-new',
    };
  }
  if (state.screen === 'confirm-load') {
    // Sin cargador todavía (TASK-0141), confirmar cierra el aviso y vuelve a
    // la raíz; la pausa sigue abierta y no se lee ningún archivo.
    return {
      state: { ...state, screen: 'root' },
      effect: 'confirm-load',
    };
  }
  if (state.screen === 'controls') {
    return { state, effect: 'none' };
  }

  const selected = action ?? PAUSE_ACTIONS[safeIndex(state.index)];
  const selectedIndex = PAUSE_ACTIONS.indexOf(selected);
  const selectedState: PauseState = { ...state, index: selectedIndex };
  switch (selected) {
    case 'resume':
      return { state: closePause(state), effect: 'close' };
    case 'new-game':
      return { state: { ...selectedState, screen: 'confirm-new' }, effect: 'none' };
    case 'load-game':
      return { state: { ...selectedState, screen: 'confirm-load' }, effect: 'none' };
    case 'save-game':
      if (!state.save.enabled) return { state, effect: 'none' };
      return { state: selectedState, effect: 'save' };
    case 'controls':
      return { state: { ...selectedState, screen: 'controls' }, effect: 'none' };
  }
}

/**
 * `Esc`: en la raíz cierra; en controles o en un aviso vuelve a la raíz
 * conservando la selección de origen (R-002).
 */
export function escapePause(state: PauseState): PauseState {
  if (!state.open) return state;
  if (state.screen === 'root') return closePause(state);
  return { ...state, screen: 'root' };
}
