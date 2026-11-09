/**
 * Núcleo compartido de chambers.
 *
 * Este índice reúne opciones, rejilla, formas, pasillos, puertas y paletas. No
 * se exporta desde `src/game/index.ts`: la variante `growth` y su entrada
 * estática se añaden en TASK-0045/TASK-0046.
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
