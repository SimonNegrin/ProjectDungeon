import type {
  Command,
  GameEvent,
  GameState,
  GameStatus,
  Phase,
  Position,
  RngState,
  Tile,
  Unit,
} from '../game/types';
import type { CursorTargetKind } from '../game/path';
import type {
  Corridor,
  Door,
  Entrance,
  Exit,
  MapEnemy,
  MapGenerator,
  MapWeapon,
  Room,
  Spawns,
} from '../game/map';
import type { OpenMouth } from '../game/chambers/core/doors';
import type { Hotspot } from '../game/chambers/core/enemies';
import type { Camera, CameraBounds } from './camera';
import type { CursorState, CursorStatus } from './cursor';
import {
  planDecoration,
  roomPalettesFor,
  summarizeDecoration,
  type DecorationSummary,
  type RoomPalette,
} from './floor';
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

export interface AnimationSnapshot {
  readonly animating: boolean;
  readonly step: number;
  readonly totalSteps: number;
  readonly unitId: string | null;
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly tileX: number;
    readonly tileY: number;
  } | null;
  readonly camera: {
    readonly x: number;
    readonly y: number;
  };
}

export interface GameSnapshot {
  readonly grid: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly Tile[];
  };
  /** Semilla del mapa generado; `null` si el estado es manual y no tiene mapa. */
  readonly seed: number | null;
  /** RNG de combate clonado; coincide con el estado antes y después de cada comando. */
  readonly rng: RngState;
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  readonly doors: readonly Door[];
  readonly spawns: Spawns | null;
  /** Entrada de nivel de la variante, o `null` si el mapa no la declara. */
  readonly entrance: Entrance | null;
  /** Salida de nivel de la variante, o `null`. */
  readonly exit: Exit | null;
  /** Enemigos declarados por el generador (`type`, `home`, `hidden`, `interior`). */
  readonly mapEnemies: readonly MapEnemy[];
  /** Bocas sin puerta con su motivo; vacío si el generador no las declara. */
  readonly openMouths: readonly OpenMouth[];
  /** Puntos calientes de emboscada; vacío si el generador no los declara. */
  readonly hotspots: readonly Hotspot[];
  /** Sala caverna de la variante, o `null`. */
  readonly cavernRoomId: number | null;
  /** Armas aún presentes en el mapa, clonadas y en solo lectura. */
  readonly weapons: readonly MapWeapon[];
  /** Resumen de solo lectura de la decoración plana; coincide con el render. */
  readonly decoration: readonly DecorationSummary[];
  /** Paleta y ambiente deterministas de cada sala; el render usa los mismos. */
  readonly floorPalettes: readonly RoomPalette[];
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
  readonly animation: AnimationSnapshot;
}

export interface DispatchResult {
  readonly snapshot: GameSnapshot;
  readonly events: GameEvent[];
}

export interface GameDebugApi {
  snapshot(): GameSnapshot;
  dispatch(command: Command): DispatchResult;
  /** Avanza el reloj de presentación de forma determinista (solo tests). */
  advance(ms: number): GameSnapshot;
  /**
   * Carga un estado serializable construido por el test. Solo existe en el
   * host cuando la URL trae `test=1`; en juego normal la API conserva sus tres
   * claves históricas.
   */
  setup?(state: GameState, generator?: MapGenerator): GameSnapshot;
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
  readonly animation?: AnimationSnapshot;
}

function cloneUnit(unit: Unit): Unit {
  return {
    ...unit,
    stats: { ...unit.stats, magia: unit.stats.magia.map((family) => ({ ...family })) },
    equipment: { ...unit.equipment },
    weapons: [...unit.weapons],
    home: { ...unit.home },
    lastKnown: unit.lastKnown ? { ...unit.lastKnown } : null,
  };
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
    ...(spawns.roomId !== undefined ? { roomId: spawns.roomId } : {}),
    ...(spawns.party ? { party: spawns.party.map((hole) => ({ ...hole })) } : {}),
    player: { ...spawns.player },
    enemy: { ...spawns.enemy },
    distance: spawns.distance,
  };
}

function cloneEntrance(entrance: Entrance | undefined): Entrance | null {
  if (!entrance) return null;
  return { roomId: entrance.roomId, position: { ...entrance.position } };
}

function cloneExit(exit: Exit | null | undefined): Exit | null {
  if (!exit) return null;
  return {
    ...exit,
    position: { ...exit.position },
    access: { ...exit.access },
    path: [...exit.path],
  };
}

function cloneMapEnemy(enemy: MapEnemy): MapEnemy {
  return { ...enemy, home: { ...enemy.home } };
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
  const animation: AnimationSnapshot = source.animation ?? {
    animating: false,
    step: 0,
    totalSteps: 0,
    unitId: null,
    position: null,
    camera: { x: source.camera.x, y: source.camera.y },
  };

  return {
    grid: {
      width: source.state.grid.width,
      height: source.state.grid.height,
      tiles: [...source.state.grid.tiles],
    },
    seed: map?.seed ?? null,
    rng: { seed: source.state.rng.seed, state: source.state.rng.state },
    rooms: map ? map.rooms.map(cloneRoom) : [],
    corridors: map ? map.corridors.map(cloneCorridor) : [],
    doors: map ? map.doors.map((door) => ({ ...door })) : [],
    spawns: cloneSpawns(map?.spawns),
    entrance: cloneEntrance(map?.entrance),
    exit: cloneExit(map?.exit ?? null),
    mapEnemies: map?.enemies?.map(cloneMapEnemy) ?? [],
    openMouths: map?.openMouths?.map((mouth) => ({ ...mouth })) ?? [],
    hotspots: map?.hotspots?.map((hotspot) => ({ ...hotspot })) ?? [],
    cavernRoomId: map?.cavernRoomId ?? null,
    weapons: map?.weapons?.map((weapon) => ({ ...weapon })) ?? [],
    decoration: [...summarizeDecoration(planDecoration(map))],
    floorPalettes: [...roomPalettesFor(map)],
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
    animation: {
      ...animation,
      position: animation.position ? { ...animation.position } : null,
      camera: { ...animation.camera },
    },
  };
}

/**
 * API de depuración: snapshot serializable y dispatch determinista por el mismo
 * camino que el teclado. No expone el estado vivo ni mutadores.
 */
export function createDebugApi(
  getSource: () => DebugSnapshotSource,
  dispatchCommand: (command: Command) => StepResult,
  advanceTime: (ms: number) => void = () => {},
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
    advance(ms: number): GameSnapshot {
      advanceTime(ms);
      return buildSnapshot(getSource());
    },
  };
}
