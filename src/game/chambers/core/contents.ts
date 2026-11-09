/**
 * Composición del contenido de un plan de chambers (TASK-0045).
 *
 * El orden es spawn → salida → enemigos: la salida y el spawn se reservan antes
 * de colocar fichas. No construye la variante `growth` ni cambia el generador
 * por defecto; TASK-0046 consume esta pieza. Es puro y serializable.
 */

import type { Entrance, Exit, MapEnemy } from '../../map';
import type { ChamberPlan } from './plan';
import type { ExitMode } from './exit';
import { selectExit, EXIT_MIN_DISTANCE } from './exit';
import {
  DEFAULT_HIDDEN_ENEMY_CHANCE,
  DEFAULT_PLAYERS,
  ENEMY_PLAYERS_FACTOR,
  ENEMY_SURFACE_FACTOR,
  placeChamberEnemies,
  type EnemyBreakdownResult,
  type Hotspot,
} from './enemies';
import { placeSpawns, SPAWN_MIN_TILES, type SpawnPlacement } from './spawn';

export interface ChamberContentsOptions {
  readonly numPlayers?: number;
  readonly enemySurfaceFactor?: number;
  readonly enemyPlayersFactor?: number;
  readonly hiddenEnemyChance?: number;
  readonly exitMode?: ExitMode;
  /** Mínimo de huecos de spawn; 6 por defecto. */
  readonly minSpawnTiles?: number;
}

export interface ChamberContents {
  readonly spawns: SpawnPlacement;
  readonly entrance: Entrance;
  readonly exit: Exit | null;
  readonly enemies: readonly MapEnemy[];
  readonly hotspots: readonly Hotspot[];
  readonly warnings: readonly string[];
  readonly breakdown: EnemyBreakdownResult;
}

export interface ChamberContentsPlan
  extends Pick<
    ChamberPlan,
    'seed' | 'width' | 'height' | 'tiles' | 'rooms' | 'corridors' | 'doors' | 'openMouths'
  > {}

/**
 * Coloca spawn, entrada, salida y enemigos sobre un plan geométrico ya generado.
 * Los tres pasos son deterministas y no mutan el plan de entrada.
 */
export function placeChamberContents(
  plan: ChamberContentsPlan,
  options: ChamberContentsOptions = {},
): ChamberContents {
  const numPlayers = options.numPlayers ?? DEFAULT_PLAYERS;
  const enemySurfaceFactor = options.enemySurfaceFactor ?? ENEMY_SURFACE_FACTOR;
  const enemyPlayersFactor = options.enemyPlayersFactor ?? ENEMY_PLAYERS_FACTOR;
  const hiddenEnemyChance = options.hiddenEnemyChance ?? DEFAULT_HIDDEN_ENEMY_CHANCE;
  const exitMode = options.exitMode ?? 'random';
  const minSpawnTiles = options.minSpawnTiles ?? SPAWN_MIN_TILES;

  const spawnResult = placeSpawns({
    rooms: plan.rooms,
    doors: plan.doors,
    openMouths: plan.openMouths,
    tiles: plan.tiles,
    width: plan.width,
    height: plan.height,
    minTiles: minSpawnTiles,
    seed: plan.seed,
  });

  const entrance: Entrance = {
    roomId: spawnResult.spawns.roomId,
    position: spawnResult.spawns.player,
  };

  const exitResult = selectExit({
    rooms: plan.rooms,
    doors: plan.doors,
    corridors: plan.corridors,
    tiles: plan.tiles,
    width: plan.width,
    height: plan.height,
    spawns: spawnResult.spawns,
    seed: plan.seed,
    mode: exitMode,
  });

  const enemyResult = placeChamberEnemies({
    rooms: plan.rooms,
    doors: plan.doors,
    openMouths: plan.openMouths,
    exit: exitResult.exit,
    tiles: plan.tiles,
    width: plan.width,
    height: plan.height,
    spawns: spawnResult.spawns,
    seed: plan.seed,
    enemySurfaceFactor,
    enemyPlayersFactor,
    numPlayers,
    hiddenEnemyChance,
  });

  return {
    spawns: spawnResult.spawns,
    entrance,
    exit: exitResult.exit,
    enemies: enemyResult.enemies,
    hotspots: enemyResult.hotspots,
    warnings: [
      ...spawnResult.warnings,
      ...exitResult.warnings,
      ...enemyResult.warnings,
    ],
    breakdown: enemyResult.breakdown,
  };
}

export { EXIT_MIN_DISTANCE };
