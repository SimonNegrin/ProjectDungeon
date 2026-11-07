import type { GameEvent, GameState, Unit } from '../game/types';
import {
  pathLength,
  wideCorridorStretch,
  type Corridor,
  type Door,
  type Room,
} from '../game/map';
import type { Camera, CameraBounds } from './camera';
import type { Viewport } from './geometry';

export const KEYS_HELP =
  'WASD/Flechas mover · Espacio/Enter atacar · E terminar turno · R reiniciar · F1 debug';

export interface HudModel {
  readonly playerHp: string;
  readonly playerMp: string;
  readonly action: string;
  readonly phase: string;
  readonly enemyHp: string;
  readonly turn: string;
  readonly status: string;
  readonly keys: string;
  readonly overlays: {
    readonly victory: boolean;
    readonly defeat: boolean;
  };
}

export interface DebugModel {
  readonly lines: readonly string[];
}

function formatHp(unit: Unit | undefined): string {
  return unit ? `${unit.hp}/${unit.maxHp}` : '—/—';
}

function formatMp(unit: Unit | undefined): string {
  return unit ? `${unit.mp}/${unit.maxMp}` : '—/—';
}

function phaseLabel(state: GameState): string {
  return state.phase === 'player' ? 'Jugador' : 'Enemigo';
}

function statusLabel(state: GameState): string {
  if (state.status === 'victory') return 'Victoria';
  if (state.status === 'defeat') return 'Derrota';
  return 'En juego';
}

function boolLabel(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'Sí' : 'No';
}

/** Modelo del HUD derivado solo del estado del motor. */
export function buildHudModel(state: GameState): HudModel {
  const player = state.players[0];
  const enemy = state.enemies[0];

  return {
    playerHp: formatHp(player),
    playerMp: formatMp(player),
    action: boolLabel(player?.actionAvailable),
    phase: phaseLabel(state),
    enemyHp: formatHp(enemy),
    turn: `Turno ${state.turn}`,
    status: statusLabel(state),
    keys: KEYS_HELP,
    overlays: {
      victory: state.status === 'victory',
      defeat: state.status === 'defeat',
    },
  };
}

function eventLabel(event: GameEvent): string {
  switch (event.type) {
    case 'UnitMoved':
      return `${event.unitId}: (${event.from.x},${event.from.y})→(${event.to.x},${event.to.y}) MP ${event.mpLeft}`;
    case 'AttackPerformed':
      return `${event.attackerId}→${event.targetId} -${event.damage} (HP ${event.targetHp})`;
    case 'UnitDied':
      return `${event.unitId} muere`;
    case 'TurnEnded':
      return `termina turno ${event.turn}`;
    case 'EnemyPhaseStarted':
      return `fase enemiga (turno ${event.turn})`;
    case 'PlayerTurnStarted':
      return `fase jugador (turno ${event.turn})`;
    case 'EnemyWaited':
      return `${event.unitId} espera`;
    case 'GameEnded':
      return `fin: ${event.status}`;
    case 'GameRestarted':
      return 'reinicio';
    case 'CommandRejected':
      return `${event.commandType} rechazado: ${event.reason}`;
  }
}

function positions(unit: Unit | undefined): string {
  return unit ? `(${unit.x}, ${unit.y})` : '—';
}

function formatEventSummary(events: readonly GameEvent[]): string {
  if (events.length === 0) return 'ninguno';
  return events.slice(-8).map(eventLabel).join(' · ');
}

function roomLabel(room: Room): string {
  return `${room.id} (${room.x},${room.y}) ${room.width}×${room.height} ${room.role}`;
}

function doorLabel(door: Door): string {
  return `(${door.x},${door.y}) ${door.orientation} sala ${door.roomId}`;
}

function wideCorridorLabel(map: NonNullable<GameState['map']>, corridor: Corridor): string {
  const length = pathLength(corridor.path);
  const lane = wideCorridorStretch(map, corridor);
  return `${corridor.fromRoomId}→${corridor.toRoomId} ${corridor.width} tiles · ${length} tiles · carril ${lane}`;
}

function mapDebugLines(state: GameState): readonly string[] {
  const map = state.map;
  if (!map) {
    return [
      'Semilla: n/a (determinista)',
      'Salas: n/a',
      'Huecos: n/a',
      'Spawns: n/a',
      'Pasillos anchos: n/a',
    ];
  }

  const wide = map.corridors.filter((corridor) => corridor.width === 2);
  return [
    `Semilla: ${map.seed}`,
    `Salas: ${map.rooms.map(roomLabel).join(' · ')}`,
    `Huecos: ${map.doors.length === 0 ? 'ninguno' : map.doors.map(doorLabel).join(' · ')}`,
    `Spawns: jugador (${map.spawns.player.x},${map.spawns.player.y}) · enemigo (${map.spawns.enemy.x},${map.spawns.enemy.y}) · distancia ${map.spawns.distance}`,
    `Pasillos anchos: ${
      wide.length === 0
        ? 'ninguno'
        : wide.map((corridor) => wideCorridorLabel(map, corridor)).join(' · ')
    }`,
  ];
}

/** Información del overlay de debug, también derivada del estado y la cámara. */
export function buildDebugModel(
  state: GameState,
  camera: Camera,
  bounds: CameraBounds,
  viewport: Viewport,
  lastEvents: readonly GameEvent[],
): DebugModel {
  const player = state.players[0];
  const enemy = state.enemies[0];

  return {
    lines: [
      `Jugador: ${positions(player)} · HP ${formatHp(player)} · MP ${formatMp(player)} · Acción ${boolLabel(player?.actionAvailable)}`,
      `Enemigo: ${positions(enemy)} · HP ${formatHp(enemy)}`,
      `Fase: ${phaseLabel(state)} · Turno ${state.turn} · Estado: ${statusLabel(state)}`,
      `Cámara: (${camera.x}, ${camera.y}) · Límites (${bounds.maxX}, ${bounds.maxY}) · Viewport ${viewport.width}×${viewport.height}`,
      ...mapDebugLines(state),
      `Últimos eventos: ${formatEventSummary(lastEvents)}`,
      'F2 nueva semilla',
    ],
  };
}

function requireElement<T extends HTMLElement>(root: ParentNode, testId: string): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Falta el elemento con data-testid="${testId}"`);
  }
  return element;
}

export interface HudView {
  update(state: GameState): void;
}

/** Vista DOM del HUD y de los overlays de resultado. */
export function createHudView(root: ParentNode): HudView {
  const playerHp = requireElement(root, 'hud-player-hp');
  const playerMp = requireElement(root, 'hud-player-mp');
  const action = requireElement(root, 'hud-action');
  const phase = requireElement(root, 'hud-phase');
  const enemyHp = requireElement(root, 'hud-enemy-hp');
  const turn = requireElement(root, 'hud-turn');
  const status = requireElement(root, 'hud-status');
  const keys = requireElement(root, 'hud-keys');
  const victory = requireElement(root, 'overlay-victory');
  const defeat = requireElement(root, 'overlay-defeat');

  return {
    update(state: GameState): void {
      const model = buildHudModel(state);
      playerHp.textContent = model.playerHp;
      playerMp.textContent = model.playerMp;
      action.textContent = model.action;
      phase.textContent = model.phase;
      enemyHp.textContent = model.enemyHp;
      turn.textContent = model.turn;
      status.textContent = model.status;
      keys.textContent = model.keys;
      victory.hidden = !model.overlays.victory;
      defeat.hidden = !model.overlays.defeat;
    },
  };
}

export interface DebugView {
  update(
    state: GameState,
    camera: Camera,
    bounds: CameraBounds,
    viewport: Viewport,
    lastEvents: readonly GameEvent[],
  ): void;
  isOpen(): boolean;
  toggle(): void;
  close(): void;
}

/** Overlay de debug independiente del HUD y de la partida. */
export function createDebugView(root: ParentNode): DebugView {
  const overlay = requireElement(root, 'debug-overlay');
  const content = requireElement(root, 'debug-content');

  return {
    update(state, camera, bounds, viewport, lastEvents): void {
      content.textContent = buildDebugModel(state, camera, bounds, viewport, lastEvents).lines.join(
        '\n',
      );
    },
    isOpen(): boolean {
      return !overlay.hidden;
    },
    toggle(): void {
      overlay.hidden = !overlay.hidden;
    },
    close(): void {
      overlay.hidden = true;
    },
  };
}
