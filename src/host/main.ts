import packageJson from '../../package.json';
import type {
  Command,
  EnemyPhaseEntry,
  GameEvent,
  GameState,
  Position,
} from '../game/types';
import { DEFAULT_PLAYER_CONFIGS } from '../game/config';
import type { MapGenerator } from '../game/map';
import { activePlayer } from '../game/party';
import { loadAssets } from './assets';
import { cameraBounds, centerCameraOnTile } from './camera';
import {
  cameraPanAt,
  planCameraTransition,
  type CameraTransition,
} from './camera-pan';
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
  roundBanner,
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
  createGameFilePicker,
  requestGameLoad,
  type GameFilePicker,
  type LoadGameOrigin,
} from './load-game';
import {
  activatePauseAction,
  closePause,
  createPauseState,
  escapePause,
  movePauseSelection,
  openPause,
  type PauseContext,
  type PauseState,
  type PauseTransition,
} from './pause-menu';
import { createPauseMenuView } from './pause-menu-view';
import { createResultView } from './result-view';
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
import {
  buildPresentationEvents,
  enemyActorContextAt,
} from './presentation';
import { renderScene, type SceneAssets } from './renderer';
import { parseSeedParam, nextSeed } from './seed';
import { saveGame } from './save-game';
import { GameSession, type StepResult } from './session';
import type { PlayerPartyConfig } from './player-screen';
import { createPlayerScreenView, type PlayerScreenView } from './player-screen-view';
import { startParty } from './party-summary';
import { createPartySummaryView, type PartySummaryView } from './party-summary-view';
import type { StepOneConfig } from './start-screen';
import { createStartScreenView, type StartScreenView } from './start-screen-view';
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
/** Versión informativa del manifiesto; única fuente, `package.json`. */
const GAME_VERSION = packageJson.version;

/** Descarga local del `.zip` ya construido; no crea archivos parciales. */
function downloadSaveFile(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/zip',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Liberar el objeto tras dejar que el navegador inicie la descarga.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

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
  /** Traza de la fase enemiga, si el comando la ejecutó (REQ-031 T-004). */
  readonly enemyPhase?: readonly EnemyPhaseEntry[];
  elapsed: number;
}

/** Paneo de cámara en curso; su reloj es independiente del de animación. */
interface ActivePan {
  readonly transition: CameraTransition;
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

  /**
   * Un único selector para el menú y la pausa (REQ-024 T-009/T-016): el input
   * oculto del marco se abre con un clic y ambos orígenes leen de él.
   */
  const loadFileInput = frame.querySelector<HTMLInputElement>(
    '[data-testid="load-file"]',
  );
  const loadFilePicker: GameFilePicker | null =
    loadFileInput === null ? null : createGameFilePicker(loadFileInput);

  /**
   * Primera pantalla en juego normal (REQ-016). Con `?test=1` no se monta y el
   * host arranca como antes. «Continuar» abre la configuración jugador a
   * jugador; «Cargar» sigue siendo no-op hasta TASK-0141 y el último
   * «Siguiente» abre el resumen (TASK-0126).
   */
  let playerScreenView: PlayerScreenView | null = null;
  let partySummaryView: PartySummaryView | null = null;
  let pendingParty: PlayerPartyConfig | null = null;

  function openPlayerScreen(config: StepOneConfig): void {
    startScreenView?.hide();
    playerScreenView = createPlayerScreenView(frame!, {
      playerCount: config.playerCount,
      seed: config.seed,
      onComplete: (party) => {
        pendingParty = party;
        // La pantalla de jugador se oculta sin destruirse: «Atrás» la devuelve
        // al último jugador con el modelo intacto.
        playerScreenView?.hide();
        if (!partySummaryView) {
          partySummaryView = createPartySummaryView(frame!, {
            onStart: () =>
              pendingParty !== null && startPartySession(pendingParty),
            onBack: () => {
              partySummaryView?.hide();
              playerScreenView?.show();
            },
            onCancelConfirmed: () => {
              partySummaryView?.destroy();
              partySummaryView = null;
              playerScreenView?.destroy();
              playerScreenView = null;
              pendingParty = null;
              startScreenView?.showMenu();
            },
          });
        }
        partySummaryView.show(party);
      },
      onCancelConfirmed: () => {
        partySummaryView?.destroy();
        partySummaryView = null;
        playerScreenView?.destroy();
        playerScreenView = null;
        pendingParty = null;
        startScreenView?.showMenu();
      },
    });
  }

  const startScreenView: StartScreenView | null = testSetupEnabled
    ? null
    : createStartScreenView(frame, {
        search: window.location.search,
        onContinue: openPlayerScreen,
        onLoadRequested: () => {
          void loadGameFrom('menu');
        },
      });

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let session = new GameSession({
    seed: parsedSeed.seed,
    players: DEFAULT_PLAYER_CONFIGS,
  });
  let world = gridPixelSize(session.state.grid, TILE_SIZE);
  let bounds = cameraBounds(world, viewport);
  let camera = centerCameraOnTile(session.state.players[0], viewport, world, TILE_SIZE);
  /**
   * Jugador en el que centrar la próxima cámara sin animación. Solo lo escribe
   * la carga: el render normal sigue centrando en el primer jugador para no
   * alterar el resto de la partida (criterio de TASK-0141).
   */
  let pendingCameraFocusPlayerId: string | null = null;
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
  /** Pausa global (REQ-024). El motor y la sesión no la conocen. */
  let pause: PauseState = createPauseState();

  let animation: ActiveAnimation | null = null;
  let frameHandle: number | undefined;
  let lastFrameTime: number | undefined;
  /** Paneo de relevo; comparte el gate de input con las animaciones. */
  let pan: ActivePan | null = null;
  let panFrameHandle: number | undefined;
  let panLastFrameTime: number | undefined;
  /** `advance()` de debug detiene el reloj automático para ser determinista. */
  let manualClock = false;

  /** Textos de daño vivos, el más reciente primero; máximo tres. */
  let damageTexts: DamageTextInstance[] = [];
  /** Banner y marcas efímeras; viven en el reloj de presentación. */
  let banner: TimedBanner | null = null;
  /**
   * Ronda cuyo aviso `Ronda N` ya se mostró. La primera fase de personajes de
   * una ronda ya anunciada cae en `TU TURNO`; solo el salto de ronda repite el
   * aviso. Cargar o montar un escenario fija la ronda actual sin banner.
   */
  let lastRoundNotice = session.state.round;
  let unitMarks: TimedUnitMark[] = [];
  let textFrameHandle: number | undefined;
  let textLastFrameTime: number | undefined;

  const hudView = createHudView(gameRoot);
  const spellMenuView = createSpellMenuView(gameRoot);
  const inventoryPanelView = createInventoryPanelView(frame, {
    reducedMotion: prefersReducedMotion,
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

  /** Contexto de pausa derivado del estado y del reloj; no toca la sesión. */
  const pauseContext = (): PauseContext => ({
    phase: session.state.phase,
    status: session.state.status,
    animating: animation !== null,
    panning: pan !== null,
  });

  const pauseMenuView = createPauseMenuView(frame, {
    onAction: (action) => handlePauseTransition(activatePauseAction(pause, action)),
    onMoveSelection: (delta) => {
      const next = movePauseSelection(pause, delta);
      if (next === pause) return;
      pause = next;
      pauseMenuView.update(pause, pauseContext());
    },
    onActivateSelection: () => {
      handlePauseTransition(activatePauseAction(pause));
    },
    onConfirm: () => {
      handlePauseTransition(activatePauseAction(pause));
    },
    onCancel: () => handlePauseEscape(),
  });

  /**
   * Resultado final (REQ-031 R-020). Se monta siempre, también con `?test=1`:
   * lee el estado que el host ya presentó y solo muestra los datos finales.
   * «Nueva» comparte el camino de la pausa; «Cargar» usa el cargador común sin
   * confirmación porque no hay partida en curso.
   */
  const resultView = createResultView(frame, {
    onNewGame: () => confirmNewGame(),
    onLoad: () => {
      void loadGameFrom('result');
    },
  });

  /**
   * Sustituye la partida por el estado validado y reconstruye solo lo derivable
   * (cámara y HUD). No restaura presentación: cancela animación, feedback,
   * avisos y modales, y deja la cámara en el activo una vez.
   */
  const applyLoadedState = (state: GameState): void => {
    pause = createPauseState();
    pauseMenuView.hide();
    resultView.hide();
    startScreenView?.hide();
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    session.load(state);
    // Cargar no anuncia ronda: la región viva la lee del estado y no queda beat.
    lastRoundNotice = state.round;
    lastEvents = [];
    noticeView.clear();
    debugView.close();
    spotView.clear();
    frameEffectView.clear();
    screenFadeView.clear();
    spottedUnits = new Set<string>();
    world = gridPixelSize(state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    pendingCameraFocusPlayerId = state.activePlayerId;
    const active =
      state.players.find((player) => player.id === state.activePlayerId) ??
      state.players[0];
    cursor = cursorAtPlayer(active);
    cursorStatus = deriveCursorStatus(state, cursor);
    render();
    // El foco vuelve al marco: el teclado manda sin depender del menú anterior.
    frame.focus({ preventScroll: true });
  };

  /**
   * Carga compartida por menú y pausa (REQ-024 R-005/T-016). La confirmación de
   * la pausa ya ocurrió en su aviso; aquí solo se elige, se valida y se aplica
   * o se anuncia el rechazo. Un segundo intento durante la lectura se ignora.
   */
  let loading = false;
  const loadGameFrom = async (origin: LoadGameOrigin): Promise<void> => {
    /** Mensaje de rechazo en la región viva del origen que abrió el selector. */
    const setLoadMessage = (message: string | null): void => {
      if (origin === 'menu') startScreenView?.setLoadMessage(message);
      else if (origin === 'pause') pauseMenuView.setLoadMessage(message);
      else resultView.setLoadMessage(message);
    };

    if (loading) return;
    if (loadFilePicker === null) {
      setLoadMessage('No se pudo abrir el selector de archivos.');
      return;
    }
    loading = true;
    setLoadMessage(null);
    try {
      await requestGameLoad({
        origin,
        pick: () => loadFilePicker.pick(),
        apply: applyLoadedState,
        notify: (message) => {
          console.error(message);
          setLoadMessage(message);
        },
      });
    } finally {
      loading = false;
    }
  };

  const resetCursorToPlayer = (): void => {
    const active = activePlayer(session.state) ?? session.state.players[0];
    if (active) cursor = cursorAtPlayer(active);
  };

  const cancelFrame = (): void => {
    if (frameHandle !== undefined) {
      window.cancelAnimationFrame(frameHandle);
      frameHandle = undefined;
    }
    lastFrameTime = undefined;
  };

  const cancelPanFrame = (): void => {
    if (panFrameHandle !== undefined) {
      window.cancelAnimationFrame(panFrameHandle);
      panFrameHandle = undefined;
    }
    panLastFrameTime = undefined;
  };

  const cancelPan = (): void => {
    pan = null;
    cancelPanFrame();
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
        enemyActorId: null,
        enemyTargetId: null,
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
    const display = presentationState(
      session.state,
      animation.timeline,
      animation.elapsed,
      animation.initialState,
    );
    const enemyContext =
      display.phase === 'enemy'
        ? enemyActorContextAt(
            animation.enemyPhase,
            animation.timeline,
            animation.elapsed,
          )
        : null;
    return {
      animating: true,
      step: completedSteps(animation.timeline, animation.elapsed),
      totalSteps: animation.timeline.stepCount,
      unitId,
      position: position ? { ...position } : null,
      camera: { x: displayCamera.x, y: displayCamera.y },
      enemyActorId: enemyContext?.actorId ?? null,
      enemyTargetId: enemyContext?.targetId ?? null,
      cues,
    };
  };

  /**
   * El resultado solo se pinta cuando ninguna pantalla de arranque lo tapa:
   * «Nueva partida» abre el paso 1 y la partida anterior deja de mostrarse
   * aunque su estado final siga cargado hasta que arranque la siguiente.
   */
  const resultBlocked = (): boolean =>
    startScreenView?.isActive() === true ||
    playerScreenView?.isActive() === true ||
    partySummaryView?.isActive() === true;

  const render = (): void => {
    // Con la pausa abierta el canvas y los HUD quedan congelados: solo se
    // repinta la propia vista modal.
    if (pause.open) {
      pauseMenuView.update(pause, pauseContext());
      return;
    }
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
      // Solo durante la fase enemiga: actor y objetivo salen de la traza del
      // motor; al volver el turno del jugador el HUD recupera su ficha normal.
      const enemyContext =
        display.phase === 'enemy'
          ? enemyActorContextAt(animation.enemyPhase, animation.timeline, elapsed)
          : null;
      hudView.update(
        display,
        displayCursor,
        { weaponPulseMs: slotPulse?.durationMs ?? null },
        panelOpen && panelSelection !== null
          ? buildPanelDetail(display, panelSelection)
          : null,
        enemyContext,
      );
      spellMenuView.update(display, spellMenu);
      // El panel lee el estado de presentación: no adelanta el objeto de un cue.
      inventoryPanelView.update(display);
      cursorView.update(displayCursor, camera);
      debugView.update(
        display,
        camera,
        bounds,
        viewport,
        lastEvents,
        displayCursor,
        enemyContext,
      );
      spotView.update(state, camera, viewport, spottedUnits);
      perceptionView.update(state, camera, viewport, debugView.isOpen());
      feedbackView.update(damageTexts, camera, display.grid);
      bannerView.update(banner);
      markView.update(unitMarks, state, camera, viewport);
      frameEffectView.update(frameEffectsAt(animation.timeline, elapsed));
      // Solo tras el cue de `GameEnded`: el estado de presentación mantiene
      // `playing` hasta que el beat termina, así que aquí no hay temporizador.
      if (resultBlocked()) resultView.hide();
      else resultView.update(display);
      return;
    }

    // Sin animación la poda usa el estado final: el "!" ya no se adelanta a su
    // cue porque durante la animación solo se retira con sus eventos.
    spottedUnits = reconcileSpottedUnits(state, spottedUnits);
    if (pan) {
      // Durante el paneo la cámara la gobierna su reloj: no se recentra en el
      // activo ni se recoloca el cursor hasta que termine.
      camera = cameraPanAt(pan.transition, pan.elapsed);
    } else {
      // La carga de una partida pide una única vez que la cámara muestre al
      // activo; después el render normal sigue al jugador activo.
      const focusPlayer =
        (pendingCameraFocusPlayerId === null
          ? undefined
          : state.players.find(
              (player) => player.id === pendingCameraFocusPlayerId,
            )) ??
        activePlayer(state) ??
        state.players[0];
      pendingCameraFocusPlayerId = null;
      camera = centerCameraOnTile(focusPlayer, viewport, world, TILE_SIZE);

      // El cursor nunca mueve la cámara; si la cámara se desplaza al mover al
      // jugador, se recoloca al tile visible más cercano.
      if (isCursorInteractive(state)) {
        cursor = clampCursorToViewport(
          cursor,
          camera,
          viewport,
          state.grid,
          TILE_SIZE,
        );
      }
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
    debugView.update(
      state,
      camera,
      bounds,
      viewport,
      lastEvents,
      cursorStatus,
      null,
    );
    spotView.update(state, camera, viewport, spottedUnits);
    perceptionView.update(state, camera, viewport, debugView.isOpen());
    feedbackView.update(damageTexts, camera, state.grid);
    bannerView.update(banner);
    markView.update(unitMarks, state, camera, viewport);
    frameEffectView.update(EMPTY_FRAME_EFFECTS);
    if (resultBlocked()) resultView.hide();
    else resultView.update(state);
  };

  const finishPan = (): void => {
    const active = pan;
    if (!active) return;
    pan = null;
    cancelPanFrame();
    camera = { ...active.transition.to };
    render();
    if (!manualClock) scheduleTextFrame();
  };

  const advancePan = (deltaMs: number): void => {
    const active = pan;
    if (!active) return;
    active.elapsed = Math.min(
      active.transition.durationMs,
      active.elapsed + Math.max(0, deltaMs),
    );
    if (active.elapsed + EPSILON >= active.transition.durationMs) {
      finishPan();
      return;
    }
    render();
  };

  const panTick = (now: number): void => {
    panFrameHandle = undefined;
    if (pause.open || pan === null || manualClock) return;

    const raw = panLastFrameTime === undefined ? 0 : now - panLastFrameTime;
    panLastFrameTime = now;
    advancePan(Math.min(MAX_FRAME_DELTA_MS, Math.max(0, raw)));

    if (pan !== null && !manualClock) {
      panFrameHandle = window.requestAnimationFrame(panTick);
    }
  };

  /** Arranca el paneo desde la cámara actual y agenda su reloj. */
  const startPan = (transition: CameraTransition, manual: boolean): void => {
    cancelPanFrame();
    pan = { transition, elapsed: 0 };
    camera = { ...transition.from };
    if (manual) manualClock = true;
    render();
    if (manual) return;
    panLastFrameTime = undefined;
    panFrameHandle = window.requestAnimationFrame(panTick);
    scheduleTextFrame(true);
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

  const scheduleTextFrame = (resetClock = false): void => {
    if (
      pause.open ||
      !hasTransientFeedback() ||
      animation !== null ||
      manualClock ||
      textFrameHandle !== undefined
    ) {
      return;
    }
    // El reloj solo se reinicia al abrir una tanda de feedback. En cada
    // reenganche desde `textTick` se conserva la marca para que el delta sea
    // monotónico y los textos/banners se consuman.
    if (resetClock) textLastFrameTime = undefined;
    textFrameHandle = window.requestAnimationFrame(textTick);
  };

  const textTick = (now: number): void => {
    textFrameHandle = undefined;
    if (
      pause.open ||
      animation !== null ||
      manualClock ||
      !hasTransientFeedback()
    ) {
      return;
    }
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
                  : 'turn-ended';
          const cue = cueFor(active, kind, entry.atMs);
          if (!cue) break;
          const feedback = bannerForCue(cue);
          if (feedback) showBanner(feedback);
          break;
        }
        case 'PlayerTurnStarted': {
          const cue = cueFor(active, 'player-turn', entry.atMs);
          if (!cue) break;
          // La ronda ya anunciada conserva `TU TURNO`; el salto de ronda (o la
          // vuelta de la fase enemiga) muestra solo `Ronda N` (R-010).
          if (entry.event.turn !== lastRoundNotice) {
            lastRoundNotice = entry.event.turn;
            showBanner(roundBanner(entry.event.turn));
            break;
          }
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
    const transition = planCameraTransition({
      previous: {
        activePlayerId: active.initialState.activePlayerId,
        round: active.initialState.round,
      },
      finalState: state,
      camera,
      viewport,
      world,
      tileSize: TILE_SIZE,
      reducedMotion: prefersReducedMotion,
    });

    if (active.resetCursorAtEnd) {
      resetCursorToPlayer();
      // El cursor reaparece con un parpadeo al acabar el beat de su turno.
      cursorView.pulseAppear();
    } else if (isCursorInteractive(state)) {
      cursor = clampCursorToViewport(
        cursor,
        transition.to,
        viewport,
        state.grid,
        TILE_SIZE,
      );
    }

    cursorStatus = deriveCursorStatus(state, cursor);

    if (transition.kind === 'pan') {
      startPan(transition, wasManual);
      return;
    }

    camera = transition.to;
    render();
    if (!wasManual) scheduleTextFrame(true);
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
    if (pause.open || !animation || manualClock) return;

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
    enemyPhase?: readonly EnemyPhaseEntry[],
  ): void => {
    cancelFrame();
    cancelPan();
    cancelTextFrame();
    manualClock = false;
    animation = {
      timeline,
      initialState,
      cursorBefore,
      cursorPosition,
      firedCues: new Set<number>(),
      resetCursorAtEnd,
      ...(enemyPhase === undefined ? {} : { enemyPhase }),
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
    cancelPan();
  };

  const completeAnimation = (): void => {
    const active = animation;
    if (!active) return;
    fireFeedbacks(active, -1, active.timeline.totalMs);
    active.elapsed = active.timeline.totalMs;
    finishAnimation();
  };

  /**
   * Abre la pausa sin tocar la sesión. Cancela los rAF conservando `elapsed`,
   * `damageTexts`, `banner` y `unitMarks`; al reanudar el reloj sigue desde el
   * mismo punto (REQ-024 T-007).
   */
  const openPauseMenu = (): void => {
    // Con la partida terminada no hay pausa: el resultado solo ofrece sus dos
    // acciones explícitas (REQ-031 R-020).
    if (pause.open || resultView.isActive()) return;
    pause = openPause(pause, pauseContext());
    cancelFrame();
    cancelPanFrame();
    cancelTextFrame();
    pauseMenuView.show(pause, pauseContext());
  };

  /** Cierra la pausa y reengancha solo los relojes que tenían trabajo. */
  const resumeFromPause = (): void => {
    pause = closePause(pause);
    pauseMenuView.hide();
    if (manualClock) return;
    lastFrameTime = undefined;
    textLastFrameTime = undefined;
    panLastFrameTime = undefined;
    if (pan !== null) {
      if (panFrameHandle === undefined) {
        panFrameHandle = window.requestAnimationFrame(panTick);
      }
      return;
    }
    if (animation !== null) {
      if (frameHandle === undefined) {
        frameHandle = window.requestAnimationFrame(tick);
      }
      return;
    }
    if (hasTransientFeedback()) scheduleTextFrame(true);
  };

  const syncPauseMenu = (): void => {
    if (pause.open) pauseMenuView.update(pause, pauseContext());
    else pauseMenuView.hide();
  };

  /**
   * Confirmar «Cargar» en la pausa conserva el menú abierto mientras se elige el
   * archivo; el cargador compartido cierra la pausa solo si la partida es
   * válida. Cancelar el selector o un archivo inválido no tocan la sesión.
   */
  const confirmLoadGame = (): void => {
    syncPauseMenu();
    void loadGameFrom('pause');
  };

  /**
   * Guardar desde la pausa: serializa con `buildSaveFiles`, comprime con
   * `writeSaveZip` y solo entonces descarga. El error se anuncia en el menú sin
   * mover el foco; un segundo clic durante la operación se ignora.
   */
  let saving = false;
  const saveGameFromPause = async (): Promise<void> => {
    if (saving) return;
    saving = true;
    pauseMenuView.setSaveMessage(null);
    const result = await saveGame(session.state, {
      gameVersion: GAME_VERSION,
      now: () => new Date(),
      download: downloadSaveFile,
    });
    saving = false;
    if (!pause.open || result.ok) return;
    console.error(result.message);
    pauseMenuView.setSaveMessage(result.message);
  };

  /**
   * Confirmar «Nueva partida» descarta animación y feedback, limpia los modales
   * de juego y abre el paso 1 del arranque. Con `?test=1` no hay pantalla de
   * inicio: solo se cierra la pausa.
   */
  const confirmNewGame = (): void => {
    pause = closePause(pause);
    pauseMenuView.hide();
    resultView.hide();
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    noticeView.clear();
    spotView.clear();
    frameEffectView.clear();
    screenFadeView.clear();
    spottedUnits = new Set<string>();
    if (startScreenView !== null) startScreenView.showStepOne();
    render();
  };

  const handlePauseTransition = (transition: PauseTransition): void => {
    pause = transition.state;
    switch (transition.effect) {
      case 'close':
        resumeFromPause();
        return;
      case 'save':
        // El menú sigue abierto y con el foco donde estaba; el resultado del
        // guardado solo escribe en la región viva.
        void saveGameFromPause();
        return;
      case 'confirm-new':
        confirmNewGame();
        return;
      case 'confirm-load':
        confirmLoadGame();
        return;
      default:
        syncPauseMenu();
    }
  };

  const handlePauseEscape = (): void => {
    const wasOpen = pause.open;
    pause = escapePause(pause);
    if (wasOpen && !pause.open) resumeFromPause();
    else syncPauseMenu();
  };

  const advanceForTest = (ms: number): void => {
    // La pausa congela también el reloj manual: `advance` no consume tiempo.
    if (pause.open) return;
    if (!animation && !pan) {
      // Sin animación, el reloj manual consume la persistencia ya creada
      // (textos, banners y marcas) sin esperas de reloj real. `advance(0)` no
      // consume: solo congela y repinta el estado intermedio.
      manualClock = true;
      cancelFrame();
      cancelPanFrame();
      cancelTextFrame();
      advanceTransientFeedback(ms);
      render();
      return;
    }
    manualClock = true;
    cancelFrame();
    cancelPanFrame();
    cancelTextFrame();
    if (animation) {
      const from = animation.elapsed;
      const to = advanceTimeline(
        animation.timeline,
        from,
        Math.max(0, ms),
      );
      const consumed = to - from;
      advanceAnimation(consumed);
      // Tras acabar la animación, el resto del tiempo alimenta el paneo.
      if (pan !== null && ms > consumed) advancePan(ms - consumed);
      return;
    }
    advancePan(ms);
  };

  /**
   * Hook de test (`?test=1`): sustituye la partida por un estado serializable y
   * limpia la presentación pendiente. No cambia reglas ni expone mutadores del
   * estado vivo; el test lo usa una vez al montar un escenario.
   */
  const setupState = (state: GameState, generator?: MapGenerator): void => {
    pause = createPauseState();
    pauseMenuView.hide();
    resultView.hide();
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    session.load(state, generator);
    // El hook de test monta un escenario, no una ronda nueva: sin banner.
    lastRoundNotice = state.round;
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

  /**
   * «Empezar»: arranca con el constructor único y, si rechaza la configuración,
   * deja el resumen visible con el mensaje. Con éxito sustituye la sesión,
   * destruye las pantallas de arranque y resetea la presentación como un
   * reinicio, sin pasar por `session.load` (hook de test).
   */
  const startPartySession = (party: PlayerPartyConfig): boolean => {
    const result = startParty(party);
    if (!result.ok) {
      partySummaryView?.showError(result.error);
      return false;
    }

    session = result.session;
    partySummaryView?.destroy();
    partySummaryView = null;
    playerScreenView?.destroy();
    playerScreenView = null;
    pendingParty = null;
    startScreenView?.hide();

    pause = createPauseState();
    pauseMenuView.hide();
    resultView.hide();
    cancelAnimation();
    clearTransientFeedback();
    spellMenu = { ...INITIAL_SPELL_MENU };
    panelOpen = false;
    panelSelection = null;
    panelMessage = null;
    inventoryPanelView.close();
    lastEvents = [];
    noticeView.clear();
    debugView.close();
    spotView.clear();
    frameEffectView.clear();
    screenFadeView.clear();
    spottedUnits = new Set<string>();
    world = gridPixelSize(session.state.grid, TILE_SIZE);
    bounds = cameraBounds(world, viewport);
    resetCursorToPlayer();
    cursorStatus = deriveCursorStatus(session.state, cursor);
    // Empezar una partida abre la ronda 1: el aviso es solo presentación y su
    // reloj lo apaga; no crea beat ni cue en la timeline.
    lastRoundNotice = session.state.round;
    showBanner(roundBanner(session.state.round));
    render();
    scheduleTextFrame(true);
    return true;
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
      resultView.hide();
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
      // El reinicio legacy no muestra banner; la ronda se lee en la región viva.
      lastRoundNotice = session.state.round;
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
      ...(result.enemyPhase === undefined ? {} : { enemyPhase: result.enemyPhase }),
    });

    startAnimation(
      timeline,
      initialState,
      resetCursorAtEnd,
      cursorBefore,
      cursorPosition,
      result.enemyPhase,
    );
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
    resultView.hide();
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
    // F2 no anuncia ronda: el nuevo tablero ya está en la suya.
    lastRoundNotice = session.state.round;
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
      panning: pan !== null,
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

  window.addEventListener('keydown', (event) => {
    // La pantalla de inicio, la de jugadores, el resumen o el resultado
    // consumen sus teclas; el mapa y F1 no se interpretan mientras alguna esté
    // visible. El resultado consume además `Esc`: no hay pausa al terminar.
    if (
      startScreenView?.isActive() ||
      playerScreenView?.isActive() ||
      partySummaryView?.isActive()
    ) {
      return;
    }
    if (resultView.isActive()) {
      // Sin comandos ni pausa con la partida terminada. `F1` sigue abriendo el
      // overlay de debug: es diagnóstico, no una acción de juego.
      if (isManagedKey(event.key)) event.preventDefault();
      if (event.key.toLowerCase() === 'f1') {
        debugView.toggle();
        render();
      }
      return;
    }
    if (isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // La pausa consume sus teclas en la vista; el host solo bloquea las
    // gestionadas para que el navegador no haga nada con ellas.
    if (pause.open) {
      if (isManagedKey(event.key)) event.preventDefault();
      return;
    }

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
      panning: pan !== null,
      spellMenu,
    });
    if (intent.type === 'pause-toggle') {
      openPauseMenu();
      return;
    }
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
