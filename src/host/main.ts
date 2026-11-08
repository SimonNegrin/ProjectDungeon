import type { Command, GameEvent, GameState, Position } from '../game/types';
import { loadAssets } from './assets';
import { cameraBounds, centerCameraOnTile } from './camera';
import {
  clampCursorToViewport,
  cursorAtPlayer,
  deriveCursorStatus,
  isCursorInteractive,
  moveCursor,
  cursorRange,
  type CursorStatus,
} from './cursor';
import { createCursorView } from './cursor-view';
import { createDebugApi, type AnimationSnapshot } from './debug';
import { collectAttackFeedbacks, damageFeedbackAnchor } from './feedback';
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
import {
  advanceTimeline,
  buildMotionTimeline,
  cameraAt,
  completedSteps,
  focusUnitId,
  presentationState,
  visualPosition,
  visualPositions,
  type MotionTimeline,
} from './motion';
import { noticeForRejection } from './notices';
import { createPerceptionOverlayView } from './perception-overlay';
import { renderScene, type SceneAssets } from './renderer';
import { parseSeedParam, nextSeed } from './seed';
import { GameSession, type StepResult } from './session';
import { trackSpottedUnits } from './spot';
import { createSpotMarkerView } from './spot-view';

const DAMAGE_FEEDBACK_MS = 1200;
/** Delta máximo por frame: una pestaña en segundo plano no adelanta pasos. */
const MAX_FRAME_DELTA_MS = 50;
const EPSILON = 1e-9;

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
 * casilla ocupa el 4,6875 % horizontal y el 8,333… % vertical. El ancla es el
 * borde inferior-centro del texto, que crece hacia arriba con `damage-pop`.
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
      const feedbacks = collectAttackFeedbacks(events, state);
      const last = feedbacks.at(-1);
      if (!last) return;

      const anchor = damageFeedbackAnchor(
        { x: last.x, y: last.y },
        last.attacker,
        { width: state.grid.width, height: state.grid.height },
      );
      const left = cssPercent(mapXToFramePercent(anchor.x * TILE_SIZE - camera.x));
      const top = cssPercent(mapYToFramePercent(anchor.y * TILE_SIZE - camera.y));

      feedback.textContent = last.text;
      feedback.dataset.result = last.hit ? 'hit' : 'miss';
      feedback.style.color = last.hit ? '' : '#9aa7b8';
      feedback.style.left = left;
      feedback.style.top = top;

      feedback.classList.remove('is-active');
      void feedback.offsetWidth;
      feedback.classList.add('is-active');

      // El destello acompaña al impacto; un fallo se comunica solo con texto.
      if (last.hit) {
        flash.style.left = cssPercent(mapXToFramePercent(last.x * TILE_SIZE - camera.x));
        flash.style.top = cssPercent(mapYToFramePercent(last.y * TILE_SIZE - camera.y));
        flash.style.width = cssPercent(mapWidthToFramePercent(TILE_SIZE));
        flash.style.height = cssPercent(mapHeightToFramePercent(TILE_SIZE));
        flash.classList.remove('is-active');
        void flash.offsetWidth;
        flash.classList.add('is-active');

        if (flashTimer !== undefined) window.clearTimeout(flashTimer);
        flashTimer = window.setTimeout(() => {
          flash.classList.remove('is-active');
        }, 400);
      }

      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        feedback.textContent = '';
        feedback.classList.remove('is-active');
        delete feedback.dataset.result;
      }, DAMAGE_FEEDBACK_MS);
    },
    clear(): void {
      if (timer !== undefined) window.clearTimeout(timer);
      if (flashTimer !== undefined) window.clearTimeout(flashTimer);
      timer = undefined;
      flashTimer = undefined;
      feedback.textContent = '';
      feedback.style.color = '';
      feedback.classList.remove('is-active');
      delete feedback.dataset.result;
      flash.classList.remove('is-active');
    },
  };
}

interface ActiveAnimation {
  readonly timeline: MotionTimeline;
  readonly initialState: GameState;
  readonly cursorBefore: CursorStatus;
  readonly cursorPosition: Position;
  readonly firedAttacks: Set<number>;
  readonly resetCursorAtEnd: boolean;
  elapsed: number;
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

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const session = new GameSession({ seed: parsedSeed.seed });
  let world = gridPixelSize(session.state.grid, TILE_SIZE);
  let bounds = cameraBounds(world, viewport);
  let camera = centerCameraOnTile(session.state.players[0], viewport, world, TILE_SIZE);
  let lastEvents: readonly GameEvent[] = [];
  let assets: SceneAssets | undefined;
  let cursor = cursorAtPlayer(session.state.players[0]);
  let cursorStatus = deriveCursorStatus(session.state, cursor);
  /** Detectores que iniciaron un episodio con `EnemySpotted`. */
  let spottedUnits: ReadonlySet<string> = new Set<string>();

  let animation: ActiveAnimation | null = null;
  let frameHandle: number | undefined;
  let lastFrameTime: number | undefined;
  /** `advance()` de debug detiene el reloj automático para ser determinista. */
  let manualClock = false;

  const hudView = createHudView(gameRoot);
  const debugView = createDebugView(gameRoot);
  const feedbackView = createDamageFeedbackView(frame);
  const cursorView = createCursorView(frame);
  const noticeView = createNoticeView(gameRoot);
  const spotView = createSpotMarkerView(frame);
  const perceptionView = createPerceptionOverlayView(frame);

  const resetCursorToPlayer = (): void => {
    cursor = cursorAtPlayer(session.state.players[0]);
  };

  const cancelFrame = (): void => {
    if (frameHandle !== undefined) {
      window.cancelAnimationFrame(frameHandle);
      frameHandle = undefined;
    }
    lastFrameTime = undefined;
  };

  const presentationCursor = (active: ActiveAnimation): CursorStatus => {
    const completed = completedSteps(active.timeline, active.elapsed);
    return {
      ...active.cursorBefore,
      x: active.cursorPosition.x,
      y: active.cursorPosition.y,
      visible: false,
      path: active.cursorBefore.path.slice(completed),
      strongSteps: Math.max(0, active.cursorBefore.strongSteps - completed),
    };
  };

  const animationSnapshot = (): AnimationSnapshot => {
    if (!animation) {
      return {
        animating: false,
        step: 0,
        totalSteps: 0,
        unitId: null,
        position: null,
        camera: { x: camera.x, y: camera.y },
      };
    }

    const unitId = focusUnitId(animation.timeline, animation.elapsed);
    const position = unitId
      ? visualPosition(animation.timeline, animation.elapsed, unitId)
      : null;
    const displayCamera = cameraAt(animation.timeline, animation.elapsed, world, viewport);
    return {
      animating: true,
      step: completedSteps(animation.timeline, animation.elapsed),
      totalSteps: animation.timeline.stepCount,
      unitId,
      position: position ? { ...position } : null,
      camera: { x: displayCamera.x, y: displayCamera.y },
    };
  };

  const render = (): void => {
    const state = session.state;
    // El mapa puede cambiar de tamaño o de semilla: se recalcula siempre para
    // que cámara y límites nunca queden obsoletos.
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);

    if (animation) {
      const elapsed = animation.elapsed;
      const display = presentationState(
        state,
        animation.timeline,
        elapsed,
        animation.initialState,
      );
      camera = cameraAt(animation.timeline, elapsed, world, viewport);
      const positions = visualPositions(animation.timeline, elapsed);
      if (assets) {
        renderScene(ctx, display, assets, camera, viewport, TILE_SIZE, { positions });
      }
      const displayCursor = presentationCursor(animation);
      hudView.update(display, displayCursor);
      cursorView.update(displayCursor, camera);
      debugView.update(display, camera, bounds, viewport, lastEvents, displayCursor);
      spotView.update(state, camera, viewport, spottedUnits);
      perceptionView.update(state, camera, viewport, debugView.isOpen());
      return;
    }

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
    hudView.update(state, cursorStatus);
    cursorView.update(cursorStatus, camera);
    debugView.update(state, camera, bounds, viewport, lastEvents, cursorStatus);
    spotView.update(state, camera, viewport, spottedUnits);
    perceptionView.update(state, camera, viewport, debugView.isOpen());
  };

  const fireFeedbacks = (active: ActiveAnimation, fromMs: number, toMs: number): void => {
    let index = 0;
    for (const entry of active.timeline.events) {
      const inWindow =
        entry.atMs > fromMs + EPSILON && entry.atMs <= toMs + EPSILON;
      if (inWindow && entry.event.type === 'EnemySpotted') {
        spottedUnits = trackSpottedUnits(spottedUnits, [entry.event]);
      }
      if (
        entry.event.type === 'AttackPerformed' &&
        !active.firedAttacks.has(index) &&
        inWindow
      ) {
        active.firedAttacks.add(index);
        const display = presentationState(
          session.state,
          active.timeline,
          entry.atMs,
          active.initialState,
        );
        const displayCamera = cameraAt(active.timeline, entry.atMs, world, viewport);
        feedbackView.update(display, displayCamera, [entry.event]);
      }
      index += 1;
    }
  };

  const finishAnimation = (): void => {
    const active = animation;
    if (!active) return;

    animation = null;
    cancelFrame();
    manualClock = false;

    const state = session.state;
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    const finalCamera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);

    if (active.resetCursorAtEnd) {
      resetCursorToPlayer();
    } else if (isCursorInteractive(state)) {
      cursor = clampCursorToViewport(cursor, finalCamera, viewport, state.grid, TILE_SIZE);
    }

    cursorStatus = deriveCursorStatus(state, cursor);
    render();
  };

  const advanceAnimation = (deltaMs: number): void => {
    const active = animation;
    if (!active) return;

    const from = active.elapsed;
    active.elapsed = advanceTimeline(active.timeline, from, deltaMs);
    fireFeedbacks(active, from, active.elapsed);

    if (active.elapsed + EPSILON >= active.timeline.totalMs) {
      finishAnimation();
    } else {
      render();
    }
  };

  const tick = (now: number): void => {
    frameHandle = undefined;
    if (!animation || manualClock) return;

    const raw = lastFrameTime === undefined ? 0 : now - lastFrameTime;
    lastFrameTime = now;
    advanceAnimation(Math.min(MAX_FRAME_DELTA_MS, Math.max(0, raw)));

    if (animation && !manualClock) {
      frameHandle = window.requestAnimationFrame(tick);
    }
  };

  const startAnimation = (
    timeline: MotionTimeline,
    initialState: GameState,
    resetCursorAtEnd: boolean,
    cursorBefore: CursorStatus,
    cursorPosition: Position,
  ): void => {
    cancelFrame();
    manualClock = false;
    animation = {
      timeline,
      initialState,
      cursorBefore,
      cursorPosition,
      firedAttacks: new Set<number>(),
      resetCursorAtEnd,
      elapsed: 0,
    };

    if (prefersReducedMotion || timeline.totalMs <= 0) {
      fireFeedbacks(animation, -1, timeline.totalMs);
      animation.elapsed = timeline.totalMs;
      finishAnimation();
      return;
    }

    fireFeedbacks(animation, -1, 0);
    render();
    lastFrameTime = undefined;
    frameHandle = window.requestAnimationFrame(tick);
  };

  const cancelAnimation = (): void => {
    animation = null;
    manualClock = false;
    cancelFrame();
  };

  const completeAnimation = (): void => {
    const active = animation;
    if (!active) return;
    fireFeedbacks(active, -1, active.timeline.totalMs);
    active.elapsed = active.timeline.totalMs;
    finishAnimation();
  };

  const advanceForTest = (ms: number): void => {
    if (!animation) return;
    manualClock = true;
    cancelFrame();
    advanceAnimation(ms);
  };

  /** Camino único para teclado, botón de reinicio y `window.__game.dispatch`. */
  const applyCommand = (command: Command, completeFirst = false): StepResult => {
    if (completeFirst) completeAnimation();

    const initialState = session.state;
    const cursorBefore = cursorStatus;
    const cursorPosition = { ...cursor };
    const result = session.dispatch(command);
    lastEvents = result.events;

    if (command.type === 'Restart' || result.events.some((event) => event.type === 'GameRestarted')) {
      cancelAnimation();
      feedbackView.clear();
      debugView.close();
      noticeView.clear();
      spottedUnits = new Set<string>();
      resetCursorToPlayer();
      render();
      return result;
    }

    let resetCursorAtEnd = false;
    for (const event of result.events) {
      if (event.type === 'PlayerTurnStarted') resetCursorAtEnd = true;
      if (event.type === 'AlarmRaised') noticeView.show('alarm-raised');
      if (event.type === 'CommandRejected') {
        const notice = noticeForRejection(event.reason);
        if (notice) noticeView.show(notice);
      }
    }

    const timeline = buildMotionTimeline(result.events);

    if (timeline.totalMs <= 0) {
      if (resetCursorAtEnd) resetCursorToPlayer();
      render();
      feedbackView.update(session.state, camera, result.events);
      return result;
    }

    startAnimation(timeline, initialState, resetCursorAtEnd, cursorBefore, cursorPosition);
    return result;
  };

  /** `F2`: semilla nueva en el host, sin tocar el motor ni cerrar el debug. */
  const regenerate = (): void => {
    cancelAnimation();
    session.regenerate(nextSeed(session.seed));
    lastEvents = [];
    feedbackView.clear();
    noticeView.clear();
    spottedUnits = new Set<string>();
    resetCursorToPlayer();
    cursorStatus = deriveCursorStatus(session.state, cursor);
    render();
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
      cursor: animation ? presentationCursor(animation) : cursorStatus,
      animation: animationSnapshot(),
    }),
    (command) => applyCommand(command, true),
    advanceForTest,
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

    const intent = translateKey(event, session.state, cursor, {
      animating: animation !== null,
    });
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
      render();
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
