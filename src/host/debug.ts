import type {
  Command,
  GameEvent,
  GameState,
  GameStatus,
  Phase,
  Position,
  Tile,
  Unit,
} from '../game/types';
import type { CursorTargetKind } from '../game/path';
import type { Corridor, Door, Room, Spawns } from '../game/map';
import type { Camera, CameraBounds } from './camera';
import type { CursorState, CursorStatus } from './cursor';
import type { Viewport } from './geometry';
import type { StepResult } from './session';

export interface CursorSnapshot {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
  readonly kind: CursorTargetKind;
  readonly state: CursorState;
  readonly path: readonly Position[];
  readonly attackTile?: Position;
}

export interface GameSnapshot {
  readonly grid: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly Tile[];
  };
  /** Semilla del mapa generado; `null` si el estado es manual y no tiene mapa. */
  readonly seed: number | null;
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  readonly doors: readonly Door[];
  readonly spawns: Spawns | null;
  readonly players: readonly Unit[];
  readonly enemies: readonly Unit[];
  readonly phase: Phase;
  readonly turn: number;
  readonly status: GameStatus;
  readonly camera: {
    readonly x: number;
    readonly y: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly viewport: Viewport;
  readonly tileSize: number;
  readonly assetsLoaded: boolean;
  readonly lastEvents: readonly GameEvent[];
  readonly cursor: CursorSnapshot;
}

export interface DispatchResult {
  readonly snapshot: GameSnapshot;
  readonly events: GameEvent[];
}

export interface GameDebugApi {
  snapshot(): GameSnapshot;
  dispatch(command: Command): DispatchResult;
}

declare global {
  interface Window {
    __game?: GameDebugApi;
  }
}

export interface DebugSnapshotSource {
  readonly state: GameState;
  readonly camera: Camera;
  readonly bounds: CameraBounds;
  readonly viewport: Viewport;
  readonly tileSize: number;
  readonly assetsLoaded: boolean;
  readonly lastEvents: readonly GameEvent[];
  readonly cursor: CursorStatus;
}

function cloneUnit(unit: Unit): Unit {
  return { ...unit };
}

function cloneEvent(event: GameEvent): GameEvent {
  switch (event.type) {
    case 'UnitMoved':
      return { ...event, from: { ...event.from }, to: { ...event.to } };
    default:
      return { ...event };
  }
}

function cloneRoom(room: Room): Room {
  return { ...room };
}

function cloneCorridor(corridor: Corridor): Corridor {
  return { ...corridor, path: corridor.path.map((point) => ({ ...point })) };
}

function cloneSpawns(spawns: Spawns | undefined): Spawns | null {
  if (!spawns) return null;
  return {
    player: { ...spawns.player },
    enemy: { ...spawns.enemy },
    distance: spawns.distance,
  };
}

function cloneCursor(cursor: CursorStatus): CursorSnapshot {
  return {
    x: cursor.x,
    y: cursor.y,
    visible: cursor.visible,
    kind: cursor.kind,
    state: cursor.state,
    path: cursor.path.map((point) => ({ ...point })),
    ...(cursor.attackTile ? { attackTile: { ...cursor.attackTile } } : {}),
  };
}

function buildSnapshot(source: DebugSnapshotSource): GameSnapshot {
  const map = source.state.map;

  return {
    grid: {
      width: source.state.grid.width,
      height: source.state.grid.height,
      tiles: [...source.state.grid.tiles],
    },
    seed: map?.seed ?? null,
    rooms: map ? map.rooms.map(cloneRoom) : [],
    corridors: map ? map.corridors.map(cloneCorridor) : [],
    doors: map ? map.doors.map((door) => ({ ...door })) : [],
    spawns: cloneSpawns(map?.spawns),
    players: source.state.players.map(cloneUnit),
    enemies: source.state.enemies.map(cloneUnit),
    phase: source.state.phase,
    turn: source.state.turn,
    status: source.state.status,
    camera: {
      x: source.camera.x,
      y: source.camera.y,
      maxX: source.bounds.maxX,
      maxY: source.bounds.maxY,
    },
    viewport: { width: source.viewport.width, height: source.viewport.height },
    tileSize: source.tileSize,
    assetsLoaded: source.assetsLoaded,
    lastEvents: source.lastEvents.map(cloneEvent),
    cursor: cloneCursor(source.cursor),
  };
}

/**
 * API de depuración: snapshot serializable y dispatch determinista por el mismo
 * camino que el teclado. No expone el estado vivo ni mutadores.
 */
export function createDebugApi(
  getSource: () => DebugSnapshotSource,
  dispatchCommand: (command: Command) => StepResult,
): GameDebugApi {
  return {
    snapshot(): GameSnapshot {
      return buildSnapshot(getSource());
    },
    dispatch(command: Command): DispatchResult {
      const result = dispatchCommand(command);
      return {
        snapshot: buildSnapshot(getSource()),
        events: result.events.map(cloneEvent),
      };
    },
  };
}
