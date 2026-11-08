import type { Command, GameEvent, GameState } from '../game/types';
import { loadAssets } from './assets';
import { cameraBounds, centerCameraOnTile } from './camera';
import {
  clampCursorToViewport,
  cursorAtPlayer,
  deriveCursorStatus,
  isCursorInteractive,
  moveCursor,
  cursorRange,
} from './cursor';
import { createCursorView } from './cursor-view';
import { createDebugApi } from './debug';
import { collectDamageFeedbacks } from './feedback';
import { gridPixelSize, TILE_SIZE } from './geometry';
import { createDebugView, createHudView, createNoticeView } from './hud';
import { isManagedKey, translateKey } from './input';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_VIEWPORT,
  computeFrameLayout,
  mapHeightToFramePercent,
  mapWidthToFramePercent,
  mapXToFramePercent,
  mapYToFramePercent,
} from './layout';
import { noticeForRejection } from './notices';
import { renderScene, type SceneAssets } from './renderer';
import { parseSeedParam, nextSeed } from './seed';
import { GameSession, type StepResult } from './session';

const DAMAGE_FEEDBACK_MS = 1200;

function showError(message: string): void {
  const element = document.querySelector<HTMLElement>('#game-error');
  if (element) {
    element.textContent = message;
    element.hidden = false;
  }
  console.error(message);
}

/** No secuestrar teclas cuando el foco está en un campo editable. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

interface DamageFeedbackView {
  update(state: GameState, camera: { x: number; y: number }, events: readonly GameEvent[]): void;
  clear(): void;
}

function cssPercent(value: number): string {
  return `${value}%`;
}

/**
 * El feedback se posiciona en porcentajes del marco completo, pero partiendo
 * del sub-rectángulo del mapa: el mapa empieza en el 21,875 % del ancho y una
 * casilla ocupa el 4,6875 % horizontal y el 8,333… % vertical.
 */
function createDamageFeedbackView(frame: HTMLElement): DamageFeedbackView {
  const feedback = frame.querySelector<HTMLElement>('[data-testid="damage-feedback"]');
  const flash = frame.querySelector<HTMLElement>('[data-testid="attack-flash"]');
  if (!feedback || !flash) {
    throw new Error('Faltan los elementos de feedback de ataque.');
  }

  let timer: number | undefined;
  let flashTimer: number | undefined;

  return {
    update(state, camera, events): void {
      const feedbacks = collectDamageFeedbacks(events, state);
      const last = feedbacks.at(-1);
      if (!last) return;

      const left = cssPercent(mapXToFramePercent((last.x + 0.5) * TILE_SIZE - camera.x));
      const top = cssPercent(mapYToFramePercent(last.y * TILE_SIZE - camera.y));

      feedback.textContent = `-${last.damage}`;
      feedback.style.left = left;
      feedback.style.top = top;

      feedback.classList.remove('is-active');
      void feedback.offsetWidth;
      feedback.classList.add('is-active');

      flash.style.left = cssPercent(mapXToFramePercent(last.x * TILE_SIZE - camera.x));
      flash.style.top = cssPercent(mapYToFramePercent(last.y * TILE_SIZE - camera.y));
      flash.style.width = cssPercent(mapWidthToFramePercent(TILE_SIZE));
      flash.style.height = cssPercent(mapHeightToFramePercent(TILE_SIZE));
      flash.classList.remove('is-active');
      void flash.offsetWidth;
      flash.classList.add('is-active');

      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        feedback.textContent = '';
        feedback.classList.remove('is-active');
      }, DAMAGE_FEEDBACK_MS);

      if (flashTimer !== undefined) window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => {
        flash.classList.remove('is-active');
      }, 400);
    },
    clear(): void {
      if (timer !== undefined) window.clearTimeout(timer);
      if (flashTimer !== undefined) window.clearTimeout(flashTimer);
      timer = undefined;
      flashTimer = undefined;
      feedback.textContent = '';
      feedback.classList.remove('is-active');
      flash.classList.remove('is-active');
    },
  };
}

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const stage = document.querySelector<HTMLElement>('[data-testid="stage"]');
  const frame = document.querySelector<HTMLElement>('[data-testid="frame"]');
  const gameRoot = document.querySelector<HTMLElement>('[data-testid="game-root"]');

  if (!canvas || !stage || !frame || !gameRoot) {
    showError('No se encontró la estructura de la partida (#game-canvas y #game-root).');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    showError('El navegador no ha podido crear un contexto Canvas 2D.');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  /** Ajusta el marco presentado al espacio disponible sin tocar el canvas interno. */
  const applyPresentation = (): void => {
    const layout = computeFrameLayout(stage.clientWidth, stage.clientHeight);
    frame.style.left = `${layout.left}px`;
    frame.style.top = `${layout.top}px`;
    frame.style.width = `${layout.width}px`;
    frame.style.height = `${layout.height}px`;
    gameRoot.style.setProperty('--frame-width', `${layout.width}px`);
  };

  applyPresentation();
  new ResizeObserver(applyPresentation).observe(stage);

  const viewport = MAP_VIEWPORT;
  const parsedSeed = parseSeedParam(window.location.search);
  if (parsedSeed.warning) console.warn(parsedSeed.warning);

  const session = new GameSession({ seed: parsedSeed.seed });
  let world = gridPixelSize(session.state.grid, TILE_SIZE);
  let bounds = cameraBounds(world, viewport);
  let camera = centerCameraOnTile(session.state.players[0], viewport, world, TILE_SIZE);
  let lastEvents: readonly GameEvent[] = [];
  let assets: SceneAssets | undefined;
  let cursor = cursorAtPlayer(session.state.players[0]);
  let cursorStatus = deriveCursorStatus(session.state, cursor);

  const hudView = createHudView(gameRoot);
  const debugView = createDebugView(gameRoot);
  const feedbackView = createDamageFeedbackView(frame);
  const cursorView = createCursorView(frame);
  const noticeView = createNoticeView(gameRoot);

  const resetCursorToPlayer = (): void => {
    cursor = cursorAtPlayer(session.state.players[0]);
  };

  const render = (events: readonly GameEvent[] = []): void => {
    const state = session.state;
    // El mapa puede cambiar de tamaño o de semilla: se recalcula siempre para
    // que cámara y límites nunca queden obsoletos.
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    camera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);

    // El cursor nunca mueve la cámara; si la cámara se desplaza al mover al
    // jugador, se recoloca al tile visible más cercano.
    if (isCursorInteractive(state)) {
      cursor = clampCursorToViewport(cursor, camera, viewport, state.grid, TILE_SIZE);
    }
    cursorStatus = deriveCursorStatus(state, cursor);

    if (assets) {
      renderScene(ctx, state, assets, camera, viewport, TILE_SIZE);
    }
    hudView.update(state);
    cursorView.update(cursorStatus, camera);
    feedbackView.update(state, camera, events);
    debugView.update(state, camera, bounds, viewport, lastEvents, cursorStatus);
  };

  /** Camino único para teclado, botón de reinicio y `window.__game.dispatch`. */
  const applyCommand = (command: Command): StepResult => {
    const result = session.dispatch(command);
    lastEvents = result.events;

    if (command.type === 'Restart') {
      feedbackView.clear();
      debugView.close();
    }

    for (const event of result.events) {
      if (event.type === 'GameRestarted' || event.type === 'PlayerTurnStarted') {
        resetCursorToPlayer();
      }
      if (event.type === 'CommandRejected') {
        const notice = noticeForRejection(event.reason);
        if (notice) noticeView.show(notice);
      }
    }

    render(result.events);
    return result;
  };

  /** `F2`: semilla nueva en el host, sin tocar el motor ni cerrar el debug. */
  const regenerate = (): void => {
    session.regenerate(nextSeed(session.seed));
    lastEvents = [];
    feedbackView.clear();
    noticeView.clear();
    resetCursorToPlayer();
    render([]);
  };

  try {
    assets = await loadAssets();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showError(`No se pudieron cargar los assets locales de la sala: ${message}`);
    return;
  }

  window.__game = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds,
      viewport,
      tileSize: TILE_SIZE,
      assetsLoaded: true,
      lastEvents,
      cursor: cursorStatus,
    }),
    applyCommand,
  );

  for (const button of gameRoot.querySelectorAll<HTMLButtonElement>('[data-action="restart"]')) {
    button.addEventListener('click', () => {
      applyCommand({ type: 'Restart' });
    });
  }

  window.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isManagedKey(event.key)) event.preventDefault();

    const intent = translateKey(event, session.state, cursor);
    if (intent.type === 'cursor') {
      cursor = moveCursor(
        cursor,
        intent.dx,
        intent.dy,
        cursorRange(camera, viewport, session.state.grid, TILE_SIZE),
      );
      render();
      return;
    }
    if (intent.type === 'notice') {
      noticeView.show(intent.notice);
      return;
    }
    if (intent.type === 'toggle-debug') {
      debugView.toggle();
      return;
    }
    if (intent.type === 'new-seed') {
      regenerate();
      return;
    }
    if (intent.type === 'command') {
      applyCommand(intent.command);
    }
  });

  render();
}

void boot();
