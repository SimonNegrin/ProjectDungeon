import type { GameState, GameStatus, Phase, Tile, Unit } from '../game/types';
import type { Camera, CameraBounds } from './camera';
import type { Viewport } from './geometry';

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
}

export interface GameDebugApi {
  snapshot(): GameSnapshot;
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
}

function cloneUnit(unit: Unit): Unit {
  return { ...unit };
}

/**
 * API de depuración de solo lectura. El snapshot es una copia plana y
 * serializable: no expone comandos, mutadores ni referencias al estado vivo.
 */
export function createDebugApi(getSource: () => DebugSnapshotSource): GameDebugApi {
  return {
    snapshot(): GameSnapshot {
      const source = getSource();
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
      };
    },
  };
}
