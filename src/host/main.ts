import { createInitialState } from '../game/engine';
import { loadAssets } from './assets';
import { cameraBounds, centerCameraOnTile } from './camera';
import { createDebugApi } from './debug';
import { gridPixelSize, TILE_SIZE, type Viewport } from './geometry';
import { renderScene } from './renderer';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;

function showError(message: string): void {
  const element = document.querySelector<HTMLElement>('#game-error');
  if (element) {
    element.textContent = message;
    element.hidden = false;
  }
  console.error(message);
}

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) {
    showError('No se encontró el canvas de la sala (#game-canvas).');
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
  const state = createInitialState();
  const world = gridPixelSize(state.grid, TILE_SIZE);
  const bounds = cameraBounds(world, viewport);
  const camera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);

  try {
    const assets = await loadAssets();

    // El snapshot es de solo lectura y refleja el estado, la cámara y los
    // assets en el momento de la llamada; TASK-0003 podrá actualizar el estado
    // sin cambiar esta API. Se publica cuando los assets ya están listos para
    // que `window.__game` implique `assetsLoaded: true`.
    window.__game = createDebugApi(() => ({
      state,
      camera,
      bounds,
      viewport,
      tileSize: TILE_SIZE,
      assetsLoaded: true,
    }));

    renderScene(ctx, state, assets, camera, viewport, TILE_SIZE);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showError(`No se pudieron cargar los assets locales de la sala: ${message}`);
  }
}

void boot();
