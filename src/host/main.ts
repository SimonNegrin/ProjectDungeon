import type { Command, GameEvent, GameState } from '../game/types';
import { loadAssets } from './assets';
import { cameraBounds, centerCameraOnTile } from './camera';
import { createDebugApi } from './debug';
import { collectDamageFeedbacks } from './feedback';
import { gridPixelSize, TILE_SIZE, type Viewport } from './geometry';
import { createDebugView, createHudView } from './hud';
import { isManagedKey, translateKey } from './input';
import { renderScene, type SceneAssets } from './renderer';
import { GameSession, type StepResult } from './session';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;

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

function percent(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function createDamageFeedbackView(stage: HTMLElement, viewport: Viewport): DamageFeedbackView {
  const feedback = stage.querySelector<HTMLElement>('[data-testid="damage-feedback"]');
  const highlight = stage.querySelector<HTMLElement>('[data-testid="active-tile"]');
  const flash = stage.querySelector<HTMLElement>('[data-testid="attack-flash"]');
  if (!feedback || !highlight || !flash) {
    throw new Error('Faltan los elementos de feedback de ataque o resaltado de casilla.');
  }

  let timer: number | undefined;
  let flashTimer: number | undefined;

  return {
    update(state, camera, events): void {
      const player = state.players[0];
      if (player) {
        highlight.style.left = percent(player.x * TILE_SIZE - camera.x, viewport.width);
        highlight.style.top = percent(player.y * TILE_SIZE - camera.y, viewport.height);
        highlight.style.width = percent(TILE_SIZE, viewport.width);
        highlight.style.height = percent(TILE_SIZE, viewport.height);
      }

      const feedbacks = collectDamageFeedbacks(events, state);
      const last = feedbacks.at(-1);
      if (!last) return;

      const left = percent((last.x + 0.5) * TILE_SIZE - camera.x, viewport.width);
      const top = percent(last.y * TILE_SIZE - camera.y, viewport.height);

      feedback.textContent = `-${last.damage}`;
      feedback.style.left = left;
      feedback.style.top = top;

      feedback.classList.remove('is-active');
      void feedback.offsetWidth;
      feedback.classList.add('is-active');

      flash.style.left = percent(last.x * TILE_SIZE - camera.x, viewport.width);
      flash.style.top = percent(last.y * TILE_SIZE - camera.y, viewport.height);
      flash.style.width = percent(TILE_SIZE, viewport.width);
      flash.style.height = percent(TILE_SIZE, viewport.height);
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
  const stage = canvas?.parentElement ?? null;
  const gameRoot = document.querySelector<HTMLElement>('[data-testid="game-root"]');

  if (!canvas || !stage || !gameRoot) {
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

  const viewport: Viewport = { width: canvas.width, height: canvas.height };
  const session = new GameSession();
  const world = gridPixelSize(session.state.grid, TILE_SIZE);
  const bounds = cameraBounds(world, viewport);
  let camera = centerCameraOnTile(session.state.players[0], viewport, world, TILE_SIZE);
  let lastEvents: readonly GameEvent[] = [];
  let assets: SceneAssets | undefined;

  const hudView = createHudView(gameRoot);
  const debugView = createDebugView(gameRoot);
  const feedbackView = createDamageFeedbackView(stage, viewport);

  const render = (events: readonly GameEvent[] = []): void => {
    const state = session.state;
    camera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);
    if (assets) {
      renderScene(ctx, state, assets, camera, viewport, TILE_SIZE);
    }
    hudView.update(state);
    feedbackView.update(state, camera, events);
    debugView.update(state, camera, bounds, viewport, lastEvents);
  };

  /** Camino único para teclado, botón de reinicio y `window.__game.dispatch`. */
  const applyCommand = (command: Command): StepResult => {
    const result = session.dispatch(command);
    lastEvents = result.events;

    if (command.type === 'Restart') {
      feedbackView.clear();
      debugView.close();
    }

    render(result.events);
    return result;
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

    const intent = translateKey(event, session.state);
    if (intent.type === 'toggle-debug') {
      debugView.toggle();
      return;
    }
    if (intent.type === 'command') {
      applyCommand(intent.command);
    }
  });

  render();
}

void boot();
