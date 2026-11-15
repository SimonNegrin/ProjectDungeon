/**
 * Modelo puro de la pantalla de inicio (REQ-016 R-001..R-004, R-011, R-012).
 *
 * Vive fuera del DOM y del reloj: el menú principal y el paso 1 solo guardan
 * `playerCount` y `seedText`. No construye `GameSession` ni conoce el motor; el
 * host solo consume `StepOneConfig` en sus puntos de extensión. La pantalla de
 * inicio real (E2E: TASK-0141) completa la carga; aquí «Cargar» solo avisa.
 */

import { MAX_PLAYERS, MIN_PLAYERS } from '../game/config';
import { hasSeedParam, nextSeed, parseSeedParam, parseSeedText } from './seed';

export type StartScreenStep = 'menu' | 'step1' | 'confirm-cancel';

/** Datos que el paso 1 entrega al host; las tareas siguientes los consumen. */
export interface StepOneConfig {
  /** Entero de 1 a 6. */
  readonly playerCount: number;
  /** Entero sin signo de 32 bits. */
  readonly seed: number;
}

/** Puntos de extensión estables del host. En esta tarea son no-op. */
export interface StartScreenHandlers {
  onContinue(config: StepOneConfig): void;
  onLoadRequested(): void;
}

export interface StartScreenState {
  readonly step: StartScreenStep;
  readonly playerCount: number;
  readonly seedText: string;
  readonly error: string | null;
  /** Campo que produjo el error; permite enlazar `aria-invalid` sin adivinar. */
  readonly errorField: ErrorSource | null;
  readonly notice: string | null;
}

export interface StartScreenOptions {
  /** Query string de la página (`window.location.search`). */
  readonly search?: string;
  /** Aleatoriedad inyectable para tests; por defecto usa `nextSeed`. */
  readonly random?: () => number;
}

type ErrorSource = 'players' | 'seed';

export interface StartScreen {
  state(): StartScreenState;
  /** Abre el paso 1 con la precarga pendiente o una semilla nueva. */
  openStepOne(): void;
  /** Acepta solo enteros de 1 a 6; conserva N si el valor no es válido. */
  setPlayerCount(value: number): void;
  /** Guarda el texto tal cual y limpia el error de semilla. */
  setSeedText(text: string): void;
  /** Devuelve la configuración válida o `null` si la semilla bloquea. */
  continueStepOne(): StepOneConfig | null;
  /** Abre la confirmación de cancelación solo desde el paso 1. */
  requestCancel(): void;
  /** Descarta la configuración y vuelve al menú con N=1. */
  confirmCancel(): void;
  /** Cierra el aviso y vuelve al paso 1 sin tocar nada. */
  dismissCancel(): void;
  /** `Esc`: nada en el menú, cancelar en el paso 1 y cerrar el aviso. */
  escape(): void;
}

function invalidSeedMessage(text: string): string {
  return `Semilla inválida "${text}": escribe un entero decimal de 32 bits.`;
}

function invalidPlayerCountMessage(value: number): string {
  return `El número de jugadores debe ser un entero entre ${MIN_PLAYERS} y ${MAX_PLAYERS}; llegó ${String(value)}.`;
}

/**
 * Construye el modelo. Con `?seed` válido la semilla queda como precarga de la
 * primera entrada; con `?seed` inválido se genera una y el aviso del parser se
 * conserva en `notice`; sin parámetro se genera una. Nunca busca la
 * configuración anterior: recargar siempre empieza de cero.
 */
export function createStartScreen(options: StartScreenOptions = {}): StartScreen {
  const search = options.search ?? '';
  const random = options.random;
  const generate = (previous: number): number =>
    random === undefined ? nextSeed(previous) : nextSeed(previous, random);

  const parsedParam = parseSeedParam(search);
  const seedInUrl = hasSeedParam(search);
  const pendingSeed: number | null =
    seedInUrl && parsedParam.warning === undefined ? parsedParam.seed : null;
  const notice = seedInUrl && parsedParam.warning !== undefined ? parsedParam.warning : null;
  let lastSeed = pendingSeed ?? generate(parsedParam.seed);

  let step: StartScreenStep = 'menu';
  let playerCount = MIN_PLAYERS;
  let seedText = '';
  let error: string | null = null;
  let errorSource: ErrorSource | null = null;
  let pending = pendingSeed;

  const setError = (source: ErrorSource, message: string): void => {
    error = message;
    errorSource = source;
  };

  const clearError = (source?: ErrorSource): void => {
    if (source !== undefined && errorSource !== source) return;
    error = null;
    errorSource = null;
  };

  const openStepOne = (): void => {
    if (pending !== null) {
      lastSeed = pending;
      pending = null;
    } else {
      lastSeed = generate(lastSeed);
    }
    step = 'step1';
    playerCount = MIN_PLAYERS;
    seedText = String(lastSeed);
    clearError();
  };

  const continueStepOne = (): StepOneConfig | null => {
    if (step !== 'step1') return null;

    if (seedText === '') {
      lastSeed = generate(lastSeed);
      seedText = String(lastSeed);
      clearError('seed');
      return { playerCount, seed: lastSeed };
    }

    const parsed = parseSeedText(seedText);
    if (!parsed.valid) {
      setError('seed', invalidSeedMessage(seedText));
      return null;
    }

    lastSeed = parsed.seed;
    seedText = String(parsed.seed);
    clearError('seed');
    return { playerCount, seed: parsed.seed };
  };

  const requestCancel = (): void => {
    if (step !== 'step1') return;
    step = 'confirm-cancel';
  };

  const confirmCancel = (): void => {
    if (step !== 'confirm-cancel') return;
    step = 'menu';
    playerCount = MIN_PLAYERS;
    seedText = '';
    clearError();
  };

  const dismissCancel = (): void => {
    if (step !== 'confirm-cancel') return;
    step = 'step1';
  };

  return {
    state(): StartScreenState {
      return { step, playerCount, seedText, error, errorField: errorSource, notice };
    },
    openStepOne,
    setPlayerCount(value: number): void {
      if (!Number.isInteger(value) || value < MIN_PLAYERS || value > MAX_PLAYERS) {
        setError('players', invalidPlayerCountMessage(value));
        return;
      }
      playerCount = value;
      clearError('players');
    },
    setSeedText(text: string): void {
      seedText = text;
      clearError('seed');
    },
    continueStepOne,
    requestCancel,
    confirmCancel,
    dismissCancel,
    escape(): void {
      if (step === 'step1') {
        requestCancel();
        return;
      }
      if (step === 'confirm-cancel') dismissCancel();
    },
  };
}
