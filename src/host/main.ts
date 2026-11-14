import type { Command, GameEvent, GameState, Position } from '../game/types';
import type { MapGenerator } from '../game/map';
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
import { formatBreakdown } from './damage-labels';
import { createDebugApi, type AnimationSnapshot } from './debug';
import { MAX_DAMAGE_TEXTS, layoutDamageTexts } from './feedback';
import { FEEDBACK_CONFIG } from './feedback-config';
import {
  EMPTY_FRAME_EFFECTS,
  bannerForCue,
  frameEffectsAt,
  unitMarkForEvent,
  weaponSlotPulseAt,
  type BannerFeedback,
  type UnitMarkFeedback,
} from './feedback-events';
import {
  createBannerView,
  createFrameEffectView,
  createScreenFadeView,
  createUnitMarkerView,
  type TimedUnitMark,
} from './feedback-overlay-view';
import { gridPixelSize, TILE_SIZE } from './geometry';
import { createDebugView, createHudView, createNoticeView } from './hud';
import { buildPanelDetail } from './hud-detail';
import { canOpenCharacterPanel, isManagedKey, translateKey } from './input';
import {
  rejectionMessage,
  type PanelSelection,
} from './inventory-panel';
import { createInventoryPanelView } from './inventory-panel-view';
import {
  INITIAL_SPELL_MENU,
  moveSpellSelection,
  SPELL_ORDER,
  spellIndex,
  type SpellMenuSelection,
} from './spell-menu';
import { createSpellMenuView } from './spell-menu-view';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_VIEWPORT,
  computeFrameLayout,
  computeUiLine,
  mapXToFramePercent,
  mapYToFramePercent,
} from './layout';
import {
  advanceTimeline,
  activeCues,
  buildMotionTimeline,
  cameraAt,
  completedSteps,
  dyingUnitIds,
  focusUnitId,
  presentationState,
  visualPosition,
  visualPositions,
  type MotionTimeline,
} from './motion';
import { noticeForRejection } from './notices';
import { createPerceptionOverlayView } from './perception-overlay';
import { buildPresentationEvents } from './presentation';
import { renderScene, type SceneAssets } from './renderer';
import { parseSeedParam, nextSeed } from './seed';
import { GameSession, type StepResult } from './session';
import { trackSpottedUnits, reconcileSpottedUnits, untrackSpottedUnits } from './spot';
import { createSpotMarkerView } from './spot-view';
import { createViewportVisibility } from './visibility';
import {
  alarmEffectAt,
  pickupItemEffectAt,
  worldEffectsAt,
} from './world-effects';

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

/** Instancia de texto de daño anclada al mundo y gobernada por el reloj. */
type DamageTextResult = 'hit' | 'miss' | 'heal' | 'revive';

interface DamageTextInstance {
  readonly text: string;
  /** Desglose por tipo bajo el total; vacío si no aplica. */
  readonly detail: string;
  readonly result: DamageTextResult;
  readonly target: Position;
  readonly attacker: Position;
  remainingMs: number;
}

interface DamageFeedbackView {
  update(
    texts: readonly DamageTextInstance[],
    camera: { x: number; y: number },
    map: { readonly width: number; readonly height: number },
  ): void;
  clear(): void;
}

/** Banner efímero gobernado por el reloj de presentación. */
interface TimedBanner extends BannerFeedback {
  remainingMs: number;
}

function cssPercent(value: number): string {
  return `${value}%`;
}

/** Cuántos píxeles de pantalla sube el texto durante su vida. */
const DAMAGE_TEXT_RISE_PX = 4;
/** Ventana final de desvanecido, dentro del reloj de presentación. */
const DAMAGE_TEXT_FADE_MS = 220;

/**
 * Los textos viven en DOM y se anclan al mundo: cada frame se recolocan con la
 * cámara. Hay hasta tres nodos estables (no se recrean) y `layoutDamageTexts`
 * evita que se pisen. El texto más reciente ocupa el nodo primario.
 */
function createDamageFeedbackView(
  frame: HTMLElement,
  options: { readonly reducedMotion?: boolean } = {},
): DamageFeedbackView {
  const reducedMotion = options.reducedMotion === true;
  const nodes = [
    ...frame.querySelectorAll<HTMLElement>('[data-damage-text]'),
  ];
  if (nodes.length === 0) {
    throw new Error('Faltan los elementos de texto de daño.');
  }

  /**
   * El desglose se pinta como nodo hermano bajo el texto principal. Así el nodo
   * `damage-feedback` conserva su `-N` exacto y el total sigue siendo el
   * protagonista; el detalle es una segunda línea sin cambiar el HTML base.
   */
  const detailNodes = nodes.map((node, index) => {
    const testId =
      index === 0 ? 'damage-feedback-detail' : `damage-feedback-detail-${index + 1}`;
    const existing = frame.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (existing) return existing;

    const detail = document.createElement('div');
    detail.className = 'damage-feedback-detail';
    detail.dataset.testid = testId;
    detail.dataset.damageDetail = String(index);
    detail.hidden = true;
    node.after(detail);
    return detail;
  });

  const hideDetail = (detail: HTMLElement): void => {
    detail.hidden = true;
    detail.textContent = '';
    detail.style.opacity = '0';
  };

  const hide = (node: HTMLElement, detail: HTMLElement): void => {
    node.hidden = true;
    node.textContent = '';
    delete node.dataset.result;
    node.style.opacity = '0';
    hideDetail(detail);
  };

  return {
    update(texts, camera, map): void {
      const layouts = layoutDamageTexts(
        texts.map((text) => ({ target: text.target, attacker: text.attacker })),
        map,
      );

      nodes.forEach((node, index) => {
        const text = texts[index];
        const layout = layouts[index];
        const detail = detailNodes[index];
        if (!text || !layout) {
          hide(node, detail);
          return;
        }

        const progress = reducedMotion
          ? 0
          : 1 -
            Math.min(
              1,
              Math.max(0, text.remainingMs / FEEDBACK_CONFIG.texts.damageMs),
            );
        const rise = Math.round(progress * DAMAGE_TEXT_RISE_PX);
        const left = cssPercent(mapXToFramePercent(layout.x * TILE_SIZE - camera.x));
        const top = cssPercent(mapYToFramePercent(layout.y * TILE_SIZE - camera.y));
        const opacity = reducedMotion
          ? '1'
          : `${Math.min(
              1,
              Math.max(0, text.remainingMs / DAMAGE_TEXT_FADE_MS),
            )}`;

        node.hidden = false;
        node.textContent = text.text;
        node.dataset.result = text.result;
        node.style.left = left;
        node.style.top = top;
        node.style.opacity = opacity;
        node.style.transform = `translate(-50%, calc(-100% - ${rise}px))`;

        // El desglose cuelga del ancla base y solo existe si el evento trajo
        // paquetes con daño > 0; un fallo o un recorte total no inventa texto.
        if (text.detail === '') {
          hideDetail(detail);
          return;
        }
        detail.hidden = false;
        detail.textContent = text.detail;
        detail.style.left = left;
        detail.style.top = top;
        detail.style.opacity = opacity;
        detail.style.transform = 'translate(-50%, 2px)';
      });
    },
    clear(): void {
      nodes.forEach((node, index) => hide(node, detailNodes[index]));
    },
  };
}

interface ActiveAnimation {
  readonly timeline: MotionTimeline;
  readonly initialState: GameState;
  readonly cursorBefore: CursorStatus;
  readonly cursorPosition: Position;
  readonly firedCues: Set<number>;
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
    const uiLine = computeUiLine(TILE_SIZE, layout.scale);
    document.documentElement.style.setProperty('--ui-line', `${uiLine}px`);
    document.documentElement.style.setProperty('--ui-scale', String(layout.scale));
  };

  applyPresentation();
  new ResizeObserver(applyPresentation).observe(stage);

  const viewport = MAP_VIEWPORT;
  const parsedSeed = parseSeedParam(window.location.search);
  if (parsedSeed.warning) console.warn(parsedSeed.warning);
  /** El hook de setup solo se publica en la URL de test; juego normal no cambia. */
  const testSetupEnabled =
    new URLSearchParams(window.location.search).get('test') === '1';

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
  /** Lista modal de hechizos; vive solo en el host. */
  let spellMenu: SpellMenuSelection = { ...INITIAL_SPELL_MENU };
  /** Panel de personaje: modal DOM que bloquea los comandos del mapa. */
  let panelOpen = false;
  /** Objeto seleccionado en el panel; gobierna la ficha del HUD derecho. */
  let panelSelection: PanelSelection | null = null;
  /** Motivo del último rechazo del panel; se limpia al confirmar otro cambio. */
  let panelMessage: string | null = null;
  /** Detectores que iniciaron un episodio con `EnemySpotted`. */
  let spottedUnits: ReadonlySet<string> = new Set<string>();

  let animation: ActiveAnimation | null = null;
  let frameHandle: number | undefined;
  let lastFrameTime: number | undefined;
  /** `advance()` de debug detiene el reloj automático para ser determinista. */
  let manualClock = false;

  /** Textos de daño vivos, el más reciente primero; máximo tres. */
  let damageTexts: DamageTextInstance[] = [];
  /** Banner y marcas efímeras; viven en el reloj de presentación. */
  let banner: TimedBanner | null = null;
  let unitMarks: TimedUnitMark[] = [];
  let textFrameHandle: number | undefined;
  let textLastFrameTime: number | undefined;

  const hudView = createHudView(gameRoot);
  const spellMenuView = createSpellMenuView(gameRoot);
  const inventoryPanelView = createInventoryPanelView(frame, {
    onCommand: (option) => dispatchPanelCommand(option.command),
    onClose: () => closePanel(),
    onSelectionChange: (selection) => {
      panelSelection = selection;
      // Navegar no reconstruye mapa ni panel: solo se refresca la ficha.
      if (!panelOpen) return;
      hudView.update(
        session.state,
        cursorStatus,
        { weaponPulseMs: null },
        panelSelection === null
          ? null
          : buildPanelDetail(session.state, panelSelection),
      );
    },
  });
  const debugView = createDebugView(gameRoot);
  const feedbackView = createDamageFeedbackView(frame, {
    reducedMotion: prefersReducedMotion,
  });
  const cursorView = createCursorView(frame, {
    reducedMotion: prefersReducedMotion,
  });
  const noticeView = createNoticeView(gameRoot);
  const spotView = createSpotMarkerView(frame);
  const perceptionView = createPerceptionOverlayView(frame);
  const bannerView = createBannerView(frame);
  const markView = createUnitMarkerView(frame);
  const frameEffectView = createFrameEffectView(frame);
  const screenFadeView = createScreenFadeView(frame, {
    reducedMotion: prefersReducedMotion,
  });

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
        cues: [],
      };
    }

    const unitId = focusUnitId(animation.timeline, animation.elapsed);
    const position = unitId
      ? visualPosition(animation.timeline, animation.elapsed, unitId)
      : null;
    const displayCamera = cameraAt(
      animation.timeline,
      animation.elapsed,
      world,
      viewport,
      camera,
    );
    const cues = activeCues(animation.timeline, animation.elapsed).map((cue) => ({
      kind: cue.kind,
      unitId: cue.anchor.unitId,
      startMs: cue.atMs,
      durationMs: cue.durationMs,
      ...(cue.kind === 'attack' ||
      cue.kind === 'replica' ||
      cue.kind === 'spell'
        ? { hit: cue.data.hit === true }
        : {}),
    }));
    return {
      animating: true,
      step: completedSteps(animation.timeline, animation.elapsed),
      totalSteps: animation.timeline.stepCount,
      unitId,
      position: position ? { ...position } : null,
      camera: { x: displayCamera.x, y: displayCamera.y },
      cues,
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
      camera = cameraAt(animation.timeline, elapsed, world, viewport, camera);
      const positions = visualPositions(animation.timeline, elapsed);
      if (assets) {
        renderScene(ctx, display, assets, camera, viewport, TILE_SIZE, {
          positions,
          dyingUnitIds: dyingUnitIds(animation.timeline, elapsed),
          effects: worldEffectsAt(animation.timeline, elapsed),
          alarm: alarmEffectAt(animation.timeline, elapsed),
          pickupItem: pickupItemEffectAt(animation.timeline, elapsed),
          debug: debugView.isOpen(),
        });
      }
      const displayCursor = presentationCursor(animation);
      const slotPulse = weaponSlotPulseAt(animation.timeline, elapsed);
      hudView.update(
        display,
        displayCursor,
        { weaponPulseMs: slotPulse?.durationMs ?? null },
        panelOpen && panelSelection !== null
          ? buildPanelDetail(display, panelSelection)
          : null,
      );
      spellMenuView.update(display, spellMenu);
      // El panel lee el estado de presentación: no adelanta el objeto de un cue.
      inventoryPanelView.update(display);
      cursorView.update(displayCursor, camera);
      debugView.update(display, camera, bounds, viewport, lastEvents, displayCursor);
      spotView.update(state, camera, viewport, spottedUnits);
      perceptionView.update(state, camera, viewport, debugView.isOpen());
      feedbackView.update(damageTexts, camera, display.grid);
      bannerView.update(banner);
      markView.update(unitMarks, state, camera, viewport);
      frameEffectView.update(frameEffectsAt(animation.timeline, elapsed));
      return;
    }

    // Sin animación la poda usa el estado final: el "!" ya no se adelanta a su
    // cue porque durante la animación solo se retira con sus eventos.
    spottedUnits = reconcileSpottedUnits(state, spottedUnits);
    camera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);

    // El cursor nunca mueve la cámara; si la cámara se desplaza al mover al
    // jugador, se recoloca al tile visible más cercano.
    if (isCursorInteractive(state)) {
      cursor = clampCursorToViewport(cursor, camera, viewport, state.grid, TILE_SIZE);
    }
    cursorStatus = deriveCursorStatus(state, cursor);

    if (assets) {
      renderScene(ctx, state, assets, camera, viewport, TILE_SIZE, {
        debug: debugView.isOpen(),
      });
    }
    hudView.update(
      state,
      cursorStatus,
      { weaponPulseMs: null },
      panelOpen && panelSelection !== null
        ? buildPanelDetail(state, panelSelection)
        : null,
    );
    spellMenuView.update(state, spellMenu);
    inventoryPanelView.update(state);
    cursorView.update(cursorStatus, camera);
    debugView.update(state, camera, bounds, viewport, lastEvents, cursorStatus);
    spotView.update(state, camera, viewport, spottedUnits);
    perceptionView.update(state, camera, viewport, debugView.isOpen());
    feedbackView.update(damageTexts, camera, state.grid);
    bannerView.update(banner);
    markView.update(unitMarks, state, camera, viewport);
    frameEffectView.update(EMPTY_FRAME_EFFECTS);
  };

  const cancelTextFrame = (): void => {
    if (textFrameHandle !== undefined) {
      window.cancelAnimationFrame(textFrameHandle);
      textFrameHandle = undefined;
    }
    textLastFrameTime = undefined;
  };

  const hasTransientFeedback = (): boolean =>
    damageTexts.length > 0 || banner !== null || unitMarks.length > 0;

  const advanceTransientFeedback = (deltaMs: number): void => {
    if (deltaMs <= 0) return;
    if (damageTexts.length > 0) {
      for (const text of damageTexts) text.remainingMs -= deltaMs;
      damageTexts = damageTexts.filter((text) => text.remainingMs > 0);
    }
    if (banner) {
      banner.remainingMs -= deltaMs;
      if (banner.remainingMs <= 0) banner = null;
    }
    if (unitMarks.length > 0) {
      for (const mark of unitMarks) mark.remainingMs -= deltaMs;
      unitMarks = unitMarks.filter((mark) => mark.remainingMs > 0);
    }
  };

  const scheduleTextFrame = (): void => {
    if (
      !hasTransientFeedback() ||
      animation !== null ||
      manualClock ||
      textFrameHandle !== undefined
    ) {
      return;
    }
    textLastFrameTime = undefined;
    textFrameHandle = window.requestAnimationFrame(textTick);
  };

  const textTick = (now: number): void => {
    textFrameHandle = undefined;
    if (animation !== null || manualClock || !hasTransientFeedback()) return;
    const raw = textLastFrameTime === undefined ? 0 : now - textLastFrameTime;
    textLastFrameTime = now;
    advanceTransientFeedback(Math.min(MAX_FRAME_DELTA_MS, Math.max(0, raw)));
    render();
    if (hasTransientFeedback()) scheduleTextFrame();
  };

  const addDamageText = (
    text: string,
    result: DamageTextResult,
    target: Position,
    attacker: Position,
    detail: string,
  ): void => {
    damageTexts = [
      {
        text,
        detail,
        result,
        target: { ...target },
        attacker: { ...attacker },
        remainingMs: FEEDBACK_CONFIG.texts.damageMs,
      },
      ...damageTexts,
    ].slice(0, MAX_DAMAGE_TEXTS);
  };

  const showBanner = (feedback: BannerFeedback): void => {
    banner = { ...feedback, remainingMs: feedback.durationMs };
  };

  const addUnitMark = (mark: UnitMarkFeedback): void => {
    unitMarks = [
      { ...mark, remainingMs: mark.durationMs },
      ...unitMarks.filter((candidate) => candidate.unitId !== mark.unitId),
    ];
  };

  const clearTransientFeedback = (): void => {
    damageTexts = [];
    banner = null;
    unitMarks = [];
    cancelTextFrame();
    feedbackView.clear();
    bannerView.clear();
    markView.clear();
  };

  const cueFor = (
    active: ActiveAnimation,
    kind: string,
    atMs: number,
  ) =>
    active.timeline.cues.find(
      (candidate) => candidate.kind === kind && candidate.atMs === atMs,
    );

  const fireFeedbacks = (active: ActiveAnimation, fromMs: number, toMs: number): void => {
    for (let index = 0; index < active.timeline.events.length; index += 1) {
      const entry = active.timeline.events[index];
      if (active.firedCues.has(index)) continue;
      const inWindow =
        entry.atMs > fromMs + EPSILON && entry.atMs <= toMs + EPSILON;
      if (!inWindow) continue;

      active.firedCues.add(index);
      switch (entry.event.type) {
        case 'EnemySpotted':
          spottedUnits = trackSpottedUnits(spottedUnits, [entry.event]);
          break;
        case 'EnemyFled':
        case 'EnemyReturned':
        case 'UnitDied': {
          spottedUnits = untrackSpottedUnits(spottedUnits, entry.event.unitId);
          const mark = unitMarkForEvent(entry.event, session.state);
          if (mark) addUnitMark(mark);
          break;
        }
        case 'EnemyWaited': {
          const mark = unitMarkForEvent(entry.event, session.state);
          if (mark) addUnitMark(mark);
          break;
        }
        case 'AttackPerformed': {
          const attackEvent = entry.event;
          const cue = active.timeline.cues.find(
            (candidate) =>
              candidate.kind === 'attack' &&
              candidate.atMs === entry.atMs &&
              candidate.data.targetId === attackEvent.targetId,
          );
          if (cue?.data.target && cue.data.attacker) {
            addDamageText(
              cue.data.text ?? (attackEvent.hit ? `-${attackEvent.damage}` : 'Fallo'),
              attackEvent.hit ? 'hit' : 'miss',
              cue.data.target,
              cue.data.attacker,
              attackEvent.hit ? formatBreakdown(attackEvent.damageBreakdown) : '',
            );
          }
          break;
        }
        case 'SpellCast': {
          const spellEvent = entry.event;
          const cue = active.timeline.cues.find(
            (candidate) =>
              candidate.kind === 'spell' &&
              candidate.atMs === entry.atMs &&
              candidate.data.targetId === spellEvent.targetId,
          );
          if (cue?.data.target && cue.data.attacker && cue.data.text) {
            const result: DamageTextResult =
              spellEvent.effect === 'heal'
                ? 'heal'
                : spellEvent.effect === 'resurrect'
                  ? 'revive'
                  : spellEvent.hit
                    ? 'hit'
                    : 'miss';
            addDamageText(
              cue.data.text,
              result,
              cue.data.target,
              cue.data.attacker,
              spellEvent.effect === 'damage' && spellEvent.hit
                ? formatBreakdown(spellEvent.damageBreakdown)
                : '',
            );
          }
          break;
        }
        case 'ReplicaPerformed':
          // REQ-027: la réplica no añade texto propio; conserva el `Fallo` del
          // ataque original y su daño se lee en la barra de PV.
          break;
        case 'PickUp':
        case 'SelectWeapon':
        case 'DropItem':
        case 'UnequipItem':
        case 'EnemyPhaseStarted':
        case 'PlayerTurnStarted':
        case 'TurnEnded': {
          const kind =
            entry.event.type === 'PickUp'
              ? 'pickup'
              : entry.event.type === 'SelectWeapon' ||
                  entry.event.type === 'DropItem' ||
                  entry.event.type === 'UnequipItem'
                ? 'select-weapon'
                : entry.event.type === 'EnemyPhaseStarted'
                  ? 'enemy-phase'
                  : entry.event.type === 'PlayerTurnStarted'
                    ? 'player-turn'
                    : 'turn-ended';
          const cue = cueFor(active, kind, entry.atMs);
          if (!cue) break;
          const feedback = bannerForCue(cue);
          if (feedback) showBanner(feedback);
          break;
        }
        case 'AlarmRaised':
          noticeView.show('alarm-raised');
          break;
        default:
          break;
      }
    }
  };

  const finishAnimation = (): void => {
    const active = animation;
    if (!active) return;

    const wasManual = manualClock;
    animation = null;
    cancelFrame();
    manualClock = false;

    const state = session.state;
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    const finalCamera = centerCameraOnTile(state.players[0], viewport, world, TILE_SIZE);

    if (active.resetCursorAtEnd) {
      resetCursorToPlayer();
      // El cursor reaparece con un parpadeo al acabar el beat de su turno.
      cursorView.pulseAppear();
    } else if (isCursorInteractive(state)) {
      cursor = clampCursorToViewport(cursor, finalCamera, viewport, state.grid, TILE_SIZE);
    }

    cursorStatus = deriveCursorStatus(state, cursor);
    render();
    if (!wasManual) scheduleTextFrame();
  };

  const advanceAnimation = (deltaMs: number): void => {
    const active = animation;
    if (!active) return;

    const from = active.elapsed;
    active.elapsed = advanceTimeline(active.timeline, from, deltaMs);
    advanceTransientFeedback(active.elapsed - from);
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
    cancelTextFrame();
    manualClock = false;
    animation = {
      timeline,
      initialState,
      cursorBefore,
      cursorPosition,
      firedCues: new Set<number>(),
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
    if (!animation) {
      // Sin animación, el reloj manual consume la persistencia ya creada
      // (textos, banners y marcas) sin esperas de reloj real. `advance(0)` no
      // consume: solo congela y repinta el estado intermedio.
      manualClock = true;
      cancelFrame();
      cancelTextFrame();
      advanceTransientFeedback(ms);
      render();
      return;
    }
    manualClock = true;
    cancelFrame();
    advanceAnimation(ms);
  };

  /**
   * Hook de test (`?test=1`): sustituye la partida por un estado serializable y
   * limpia la presentación pendiente. No cambia reglas ni expone mutadores del
   * estado vivo; el test lo usa una vez al montar un escenario.
   */
  const setupState = (state: GameState, generator?: MapGenerator): void => {
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    session.load(state, generator);
    lastEvents = [];
    noticeView.clear();
    debugView.close();
    spotView.clear();
    frameEffectView.clear();
    screenFadeView.clear();
    spottedUnits = new Set<string>();
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    resetCursorToPlayer();
    cursorStatus = deriveCursorStatus(state, cursor);
    render();
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
      // El reinicio limpia cualquier cue pendiente y funde 250 ms (R-018).
      clearTransientFeedback();
      spellMenu = { ...INITIAL_SPELL_MENU };
      panelOpen = false;
      panelSelection = null;
      panelMessage = null;
      inventoryPanelView.close();
      debugView.close();
      noticeView.clear();
      spotView.clear();
      frameEffectView.clear();
      spottedUnits = new Set<string>();
      resetCursorToPlayer();
      screenFadeView.play();
      render();
      return result;
    }

    let resetCursorAtEnd = false;
    for (const event of result.events) {
      if (event.type === 'PlayerTurnStarted') resetCursorAtEnd = true;
      if (event.type === 'CommandRejected') {
        const notice = noticeForRejection(event.reason);
        if (notice) noticeView.show(notice);
        // Sacudida de 120 ms sin beat: el input vuelve en el mismo instante.
        cursorView.shake();
      }
    }

    const presentationEvents = buildPresentationEvents(
      command,
      initialState,
      session.state,
      result.events,
    );
    // La visibilidad se decide aquí, con la cámara y el viewport del instante
    // de la acción; el builder de la timeline solo recibe la política.
    const visibility = createViewportVisibility(
      camera,
      viewport,
      new Set(initialState.players.map((player) => player.id)),
    );
    const timeline = buildMotionTimeline(presentationEvents, {
      initialState,
      finalState: session.state,
      visibility,
      reducedMotion: prefersReducedMotion,
    });

    startAnimation(timeline, initialState, resetCursorAtEnd, cursorBefore, cursorPosition);
    return result;
  };

  /**
   * Abre el panel fuera del bucle de render. La elegibilidad la decide
   * `translateKey`/`canOpenCharacterPanel`; aquí solo se evita duplicar el modal.
   */
  const openPanel = (): void => {
    if (panelOpen || !canOpenCharacterPanel(session.state)) return;
    panelOpen = true;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.open(session.state);
    render();
  };

  const closePanel = (): void => {
    if (!panelOpen) return;
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    render();
  };

  /**
   * Comando confirmado desde el panel. Se despacha solo al confirmar y pasa por
   * el mismo camino que el teclado; el motivo de rechazo se muestra en el
   * propio panel. Durante un beat no se aceptan más operaciones.
   */
  const dispatchPanelCommand = (command: Command): void => {
    if (!panelOpen || animation !== null) return;
    if (session.state.phase !== 'player' || session.state.status !== 'playing') {
      return;
    }
    const result = applyCommand(command);
    const rejected = result.events.find(
      (event): event is Extract<GameEvent, { type: 'CommandRejected' }> =>
        event.type === 'CommandRejected',
    );
    panelMessage = rejected ? rejectionMessage(rejected.reason) : null;
    inventoryPanelView.setMessage(panelMessage);
  };

  /** `F2`: semilla nueva en el host, sin tocar el motor ni cerrar el debug. */
  const regenerate = (): void => {
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    session.regenerate(nextSeed(session.seed));
    lastEvents = [];
    noticeView.clear();
    spotView.clear();
    frameEffectView.clear();
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

  const debugApi = createDebugApi(
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

  if (testSetupEnabled) {
    debugApi.setup = (state: GameState, generator?: MapGenerator) => {
      setupState(state, generator);
      return debugApi.snapshot();
    };
  }

  window.__game = debugApi;

  for (const button of gameRoot.querySelectorAll<HTMLButtonElement>('[data-action="restart"]')) {
    button.addEventListener('click', () => {
      applyCommand({ type: 'Restart' });
    });
  }

  window.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Panel modal: solo se interpreta el cierre. No se hace `preventDefault`
    // del resto para no romper `Enter`/`Espacio` de los botones nativos ni `Tab`.
    if (panelOpen) {
      const intent = translateKey(event, session.state, cursor, {
        animating: animation !== null,
        spellMenu,
        panelOpen: true,
      });
      if (intent.type === 'panel-close') {
        event.preventDefault();
        closePanel();
      }
      return;
    }

    if (isManagedKey(event.key)) event.preventDefault();

    const intent = translateKey(event, session.state, cursor, {
      animating: animation !== null,
      spellMenu,
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
    if (intent.type === 'spell-menu-toggle') {
      spellMenu = spellMenu.open
        ? { ...spellMenu, open: false }
        : {
            ...spellMenu,
            open: true,
            index:
              spellMenu.selectedId === null
                ? spellMenu.index
                : Math.max(0, spellIndex(spellMenu.selectedId)),
          };
      render();
      return;
    }
    if (intent.type === 'spell-menu-close') {
      spellMenu = { ...spellMenu, open: false };
      render();
      return;
    }
    if (intent.type === 'spell-menu-move') {
      spellMenu = {
        ...spellMenu,
        index: moveSpellSelection(spellMenu.index, intent.delta, SPELL_ORDER.length),
      };
      render();
      return;
    }
    if (intent.type === 'spell-menu-select') {
      spellMenu = {
        ...spellMenu,
        open: true,
        index: Math.max(0, spellIndex(intent.spellId)),
        selectedId: intent.spellId,
      };
      render();
      return;
    }
    if (intent.type === 'spell-deselect') {
      spellMenu = { ...INITIAL_SPELL_MENU };
      render();
      return;
    }
    if (intent.type === 'spell-cast') {
      spellMenu = { ...spellMenu, open: false, selectedId: intent.spellId };
      applyCommand({
        type: 'CastSpell',
        unitId: intent.unitId,
        spellId: intent.spellId,
        target: { x: intent.target.x, y: intent.target.y },
      });
      return;
    }
    if (intent.type === 'panel-open') {
      openPanel();
      return;
    }
    if (intent.type === 'panel-close') {
      closePanel();
      return;
    }
    if (intent.type === 'command') {
      applyCommand(intent.command);
    }
  });

  render();
}

void boot();
