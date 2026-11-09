/**
 * Núcleo compartido de chambers.
 *
 * Este índice reúne opciones, rejilla, formas, pasillos, puertas, paletas y el
 * contenido jugable (spawn, enemigos y salida). No se exporta desde
 * `src/game/index.ts`: la variante `growth` y su entrada estática se añaden en
 * TASK-0046.
 */

export {
  DEFAULT_CHAMBER_OPTIONS,
  resolveChamberOptions,
  type ChamberOptions,
  type ResolvedChamberOptions,
  type ResolvedChamberOptionsResult,
} from './options';

export {
  GROWTH_SALT,
  clamp,
  createRng,
  hashSeed,
  mulberry32,
  normalizeSeed,
  type Rng,
} from './rng';

export {
  boxArea,
  boxContains,
  boxGap,
  boxInside,
  boxesOverlap,
  chebyshev,
  inBounds,
  manhattan,
  maskIsConnected,
  maskToPoints,
  neighbors4,
  pathLength,
  pointKey,
  pointsToMask,
  reachableCount,
  samePoint,
  sortPoints,
  UnionFind,
  type Box,
  type Point,
} from './grid';

export {
  buildCavernLayout,
  buildNormalLayout,
  carveRoomMask,
  maskCellCount,
  maskInsideBox,
  maxNotchDepth,
  roomNotchCount,
  type RawRoom,
  type RoomLayout,
  type RoomSpec,
} from './shapes';

export {
  findLink,
  findLinks,
  findWideDetour,
  selectLinks,
  widenLink,
  withWideFallback,
  type ChamberLink,
  type LinkSelection,
} from './corridors';

export {
  DOOR_MIN_SEPARATION,
  placeDoors,
  validateDoorCandidate,
  type DoorCandidate,
  type DoorCorridorShape,
  type DoorPlacement,
  type DoorPlacementInput,
  type DoorRoomShape,
  type OpenMouth,
  type OpenMouthReason,
} from './doors';

export {
  AMBIENT_ORDER,
  AMBIENT_PALETTE,
  ambientFor,
  assignRoomPalettes,
  doorStyleFor,
  type ChamberAmbient,
  type ChamberPaletteId,
  type RoomPalette,
} from './palettes';

export {
  generateChamberPlan,
  planFloorCount,
  roomBox,
  type ChamberPlan,
} from './plan';

export {
  SPAWN_FALLBACK_RADIUS,
  SPAWN_MAX_COMPONENT,
  SPAWN_MIN_TILES,
  SPAWN_RADIUS,
  adjacent8,
  chooseSpawnAccess,
  componentSizeWith,
  maxComponentSize,
  partyCapacity,
  placeSpawns,
  roomAreaOf,
  roomCellsOf,
  type SpawnInput,
  type SpawnPlacement,
  type SpawnResult,
} from './spawn';

export {
  EXIT_MIN_DISTANCE,
  buildRoomGraph,
  doorBoundaryCandidates,
  orthogonalNeighbors,
  pathToRoom,
  reservedExitCells,
  roomDistances,
  selectExit,
  stairPosition,
  type ExitInput,
  type ExitMode,
  type ExitResult,
  type RoomDistances,
} from './exit';

export {
  DEFAULT_HIDDEN_ENEMY_CHANCE,
  DEFAULT_PLAYERS,
  ENEMY_BRUTE_SHARE,
  ENEMY_COWARD_SHARE,
  ENEMY_MAX_COMPONENT,
  ENEMY_PLAYERS_FACTOR,
  ENEMY_SURFACE_FACTOR,
  adjacentCells,
  assignEnemyTypes,
  distributeEnemyBudget,
  enemyTotalFor,
  enemyTypeCounts,
  interiorCell,
  placeChamberEnemies,
  type ChamberEnemyInput,
  type ChamberEnemyResult,
  type EnemyBreakdownResult,
  type EnemyRoomPriority,
  type EnemyTypeCounts,
  type Hotspot,
  type HotspotReason,
} from './enemies';

export {
  placeChamberContents,
  type ChamberContents,
  type ChamberContentsOptions,
  type ChamberContentsPlan,
} from './contents';
