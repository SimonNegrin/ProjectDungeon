import type {
  Command,
  GameEvent,
  GameState,
  GameStatus,
  Phase,
  Tile,
  Unit,
} from '../game/types';
import type { Camera, CameraBounds } from './camera';
import type { Viewport } from './geometry';
import type { StepResult } from './session';

export interface GameSnapshot {
  readonly grid: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly Tile[];
  };
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

function buildSnapshot(source: DebugSnapshotSource): GameSnapshot {
  return {
    grid: {
      width: source.state.grid.width,
      height: source.state.grid.height,
      tiles: [...source.state.grid.tiles],
    },
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
