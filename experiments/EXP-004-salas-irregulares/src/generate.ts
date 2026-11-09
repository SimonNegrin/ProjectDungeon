/**
 * Generadores deterministas de EXP-004.
 *
 * Tres planes de salas distintos (crecimiento sobre roca, BSP con máscaras y
 * plantillas empaquetadas) comparten un finalizador que resuelve conexiones,
 * puertas, spawn, enemigos, paletas y estadísticas. Ni `Math.random` ni relojes
 * intervienen en la generación.
 */

import { AMBIENT_PALETTE, FLOOR_PALETTES } from '../../../src/host/floor';
import {
  UnionFind,
  boxArea,
  boxGap,
  boxInside,
  boxesOverlap,
  inBounds,
  maskIsConnected,
  maskToPoints,
  neighbors4,
  pointKey,
  pointsToMask,
  sortPoints,
  wallTileKind,
  type Box,
} from './grid';
import { createRng, hashSeed, type Rng } from './rng';
import { hasLineOfSight, placeEnemies, placeSpawns, refineSpawnHoles } from './spawn';
import type {
  Corridor,
  CorridorKind,
  Door,
  DoorOrientation,
  DoorStyle,
  Enemy,
  FloorAmbient,
  FloorPaletteId,
  GeneratedMap,
  MapOptions,
  MapStats,
  ResolvedMapOptions,
  Room,
  SizeRole,
  Spawns,
  Tile,
  VariantId,
} from './types';

const VARIANT_SALT: Readonly<Record<VariantId, number>> = {
  growth: 0x4a3f2d11,
  bsp: 0x7c9e1a23,
  templates: 0x2b6d8f45,
};

const AMBIENT_ORDER: readonly FloorAmbient[] = [
  'humid',
  'death',
  'ruin',
  'vegetation',
  'mixed',
];

const DOOR_STYLES: readonly DoorStyle[] = ['wood', 'metal', 'grated'];

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;

interface Counter {
  value: number;
}

interface RawRoom {
  readonly box: Box;
  readonly cells: readonly import('./types').Point[];
}

interface Link {
  readonly roomA: number;
  readonly roomB: number;
  /** Celdas de muro entre las dos salas, sin incluir sus suelos. */
  readonly cells: readonly import('./types').Point[];
  /** 0 para puerta directa; 1-3 para pasillo corto. */
  readonly length: number;
}

interface LinkSelection {
  readonly links: readonly Link[];
  readonly extras: readonly Link[];
  readonly wide: Link | null;
}

type Template = {
  readonly id: string;
  readonly rows: readonly string[];
};

const TEMPLATES: readonly Template[] = [
  {
    id: 'big-notch',
    rows: [
      '11111111',
      '11111111',
      '11111111',
      '11100111',
      '11100111',
      '11111111',
      '11111111',
      '11111111',
    ],
  },
  {
    id: 'l-six',
    rows: ['111111', '111111', '111000', '111000', '111000'],
  },
  {
    id: 'notch-five',
    rows: ['11111', '11111', '11111', '11100', '11000'],
  },
  {
    id: 'z-six',
    rows: ['111100', '111100', '001111', '001111'],
  },
  {
    id: 't-five',
    rows: ['11111', '11111', '11111', '01110', '00100'],
  },
  {
    id: 'small-l',
    rows: ['111', '110', '100'],
  },
  {
    id: 'small-notch',
    rows: ['1111', '1111', '1101', '1111'],
  },
];

/** Normaliza las opciones con avisos; nunca lanza. */
export function resolveOptions(input: MapOptions = {}): {
  options: ResolvedMapOptions;
  warnings: string[];
} {
  const warnings: string[] = [];

  function clampInt(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    label: string,
  ): number {
    const numeric = value === undefined ? fallback : Number(value);
    const rounded = Number.isFinite(numeric) ? Math.round(numeric) : fallback;
    const clamped = Math.min(max, Math.max(min, rounded));
    if (clamped !== rounded) {
      warnings.push(`El ${label} se ajustó de ${rounded} a ${clamped}.`);
    }
    return clamped;
  }

  const mapWidth = clampInt(input.mapWidth, 22, 12, 40, 'ancho del mapa');
  const mapHeight = clampInt(input.mapHeight, 18, 10, 34, 'alto del mapa');
  let roomCount = clampInt(input.roomCount, 5, 4, 6, 'número de salas');
  let roomMin = clampInt(input.roomMin, 3, 2, 6, 'tamaño mínimo de sala');
  let roomMax = clampInt(input.roomMax, 9, 4, 12, 'tamaño máximo de sala');

  if (roomMin > roomMax) {
    warnings.push('El tamaño mínimo era mayor que el máximo; se intercambiaron.');
    const swap = roomMin;
    roomMin = roomMax;
    roomMax = swap;
  }
  const fitMax = Math.min(mapWidth, mapHeight) - 2;
  if (roomMax > fitMax) {
    warnings.push(`El tamaño máximo de sala se recortó a ${fitMax} por el mapa.`);
    roomMax = fitMax;
  }
  if (roomMin > roomMax) roomMin = roomMax;
  if (roomCount > 6) roomCount = 6;

  const corridorMaxLength = clampInt(
    input.corridorMaxLength,
    3,
    0,
    3,
    'pasillo máximo',
  );
  const wideCorridorChance = clampInt(
    input.wideCorridorChance,
    33,
    0,
    100,
    'probabilidad de pasillo ancho',
  );
  const wallThickness = clampInt(input.wallThickness, 1, 1, 2, 'grosor de muro');
  const megaRoomChance = clampInt(
    input.megaRoomChance,
    17,
    0,
    100,
    'probabilidad de caverna',
  );
  const spawnMinTiles = clampInt(
    input.spawnMinTiles,
    6,
    1,
    12,
    'mínimo de huecos de spawn',
  );

  return {
    options: {
      mapWidth,
      mapHeight,
      roomCount,
      roomMin,
      roomMax,
      corridorMaxLength,
      wideCorridorChance,
      wallThickness,
      megaRoomChance,
      spawnMinTiles,
    },
    warnings,
  };
}

/** Punto de entrada puro: misma semilla, variante y opciones ⇒ mismo mapa. */
export function generateMap(
  variant: VariantId,
  seed: number,
  input: MapOptions = {},
): GeneratedMap {
  const { options, warnings } = resolveOptions(input);
  const normalizedSeed = seed >>> 0;
  const rng = createRng(hashSeed(normalizedSeed, VARIANT_SALT[variant]));
  const counter: Counter = { value: 0 };

  const wantsCavern = rng.chance(options.megaRoomChance / 100);
  const wantsWide = rng.chance(options.wideCorridorChance / 100);
  const rawRooms = wantsCavern
    ? buildCavern(rng, options, counter, warnings)
    : buildPlan(variant, rng, options, counter, warnings, wantsWide);

  // En plantillas, si el azar pide pasillo ancho pero el empaquetado no dejó
  // hueco, se añade una cámara pequeña separada por 4 tiles.
  if (
    variant === 'templates' &&
    !wantsCavern &&
    wantsWide &&
    rawRooms.length < 6 &&
    !hasWideGap(rawRooms)
  ) {
    placeWideGrowthRoom(rawRooms, 'small', rng, options, counter);
  }

  if (rawRooms.length === 0) {
    warnings.push('La generación no produjo salas; se usó una sala de emergencia.');
    const box: Box = {
      x: 2,
      y: 2,
      width: Math.max(3, Math.min(options.mapWidth - 4, 7)),
      height: Math.max(3, Math.min(options.mapHeight - 4, 7)),
    };
    rawRooms.push({ box, cells: allBoxCells(box) });
  }

  ensureShape(rawRooms, rng, warnings, options);
  normalizeRatios(rawRooms, 0.75, new Set(), options, true);
  ensureSharedWallBox(rawRooms, options);
  if (wantsWide) {
    ensureWideGap(rawRooms, options);
    ensureWideCells(rawRooms);
    ensureSharedWallBox(rawRooms, options);
  }
  ensureDirectDoor(rawRooms);
  if (
    !roomsHaveDirectPair(rawRooms) &&
    (!wantsWide || (options.wallThickness === 2 && rawRooms.length <= 3))
  ) {
    if (ensureSharedWallBox(rawRooms, options, true)) ensureDirectDoor(rawRooms);
  }
  normalizeRatios(rawRooms, 0.92, protectedEdgeCells(rawRooms), options, true);

  return finalizeMap(
    variant,
    normalizedSeed,
    rng,
    options,
    rawRooms,
    counter,
    wantsCavern,
    wantsWide,
    warnings,
  );
}

function buildPlan(
  variant: VariantId,
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
  warnings: string[],
  wantsWide: boolean,
): RawRoom[] {
  if (variant === 'growth') return buildGrowth(rng, options, counter, warnings, wantsWide);
  if (variant === 'bsp') return buildBsp(rng, options, counter, warnings);
  return buildTemplates(rng, options, counter, warnings, wantsWide);
}

// ---------------------------------------------------------------------------
// Crecimiento sobre roca
// ---------------------------------------------------------------------------

function buildGrowth(
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
  warnings: string[],
  wantsWide: boolean,
): RawRoom[] {
  const specs = roomSpecs(options.roomCount);
  const rooms: RawRoom[] = [];

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    let placed = false;

    if (index === 2 && wantsWide) {
      placed = placeWideGrowthRoom(rooms, spec, rng, options, counter);
    }

    for (let phase = 0; phase < 2 && !placed; phase += 1) {
      const preferShared = index === 1 && phase === 0;
      const preferWide = index === 2 && wantsWide && phase === 0;
      for (let attempt = 0; attempt < 400 && !placed; attempt += 1) {
        counter.value += 1;
        const box = randomBox(rng, options, spec);
        if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
        if (rooms.some((room) => boxGap(box, room.box) < placementMinGap(options, index))) continue;
        if (rooms.length > 0) {
          const gaps = rooms.map((room) => boxGap(box, room.box));
          const nearest = Math.min(...gaps);
          const limit = index === 2 && wantsWide && phase === 0 ? 4 : 3;
          if (nearest > limit) continue;
          if (preferShared && !gaps.some((gap) => gap === 1)) continue;
          if (preferWide && !gaps.some((gap) => gap === 4)) continue;
        }
        const cells = growMask(box, spec, rng);
        if (cells.length < minCells(spec)) continue;
        if (rooms.length > 0 && !canConnectToExisting(box, cells, rooms, options)) continue;
        rooms.push({ box, cells });
        placed = true;
      }
    }

    if (!placed) {
      warnings.push(`No se pudo colocar la sala ${index + 1} con crecimiento.`);
    }
  }

  if (rooms.length < Math.min(4, options.roomCount)) {
    warnings.push('El grosor de muro pedido no cupo; se relajó la separación para completar las salas.');
    let guard = 0;
    while (rooms.length < Math.min(4, options.roomCount) && guard < 4) {
      guard += 1;
      const before = rooms.length;
      placeFallbackRoom(rooms, rng, options, 'small');
      if (rooms.length === before) break;
    }
  }

  if (rooms.length > 0 && !hasSharedWall(rooms)) {
    warnings.push('El crecimiento no logró una pared compartida; se relajó la separación.');
    placeFallbackRoom(rooms, rng, options, 'small');
  }

  return rooms;
}

function placeWideGrowthRoom(
  rooms: RawRoom[],
  spec: RoomSpec,
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
): boolean {
  if (rooms.length === 0) return false;
  for (let sizeAttempt = 0; sizeAttempt < 10; sizeAttempt += 1) {
    counter.value += 1;
    const templateBox = randomBox(rng, options, spec);
    const candidates = wideBoxCandidates(rooms, templateBox.width, templateBox.height, options);
    for (const box of rng.shuffle(candidates).slice(0, 24)) {
      counter.value += 1;
      const cells = growMask(box, spec, rng);
      if (cells.length < minCells(spec)) continue;
      if (!hasWideAlignment(box, cells, rooms)) continue;
      rooms.push({ box, cells });
      return true;
    }
  }
  return false;
}

function wideBoxCandidates(
  rooms: readonly RawRoom[],
  width: number,
  height: number,
  options: ResolvedMapOptions,
): Box[] {
  const candidates: Box[] = [];
  for (let y = 1; y <= options.mapHeight - height - 1; y += 1) {
    for (let x = 1; x <= options.mapWidth - width - 1; x += 1) {
      const box: Box = { x, y, width, height };
      if (rooms.some((room) => boxGap(box, room.box) < 1)) continue;
      if (!rooms.some((room) => wideGapTo(box, room.box))) continue;
      candidates.push(box);
    }
  }
  return candidates;
}

function wideGapTo(box: Box, other: Box): boolean {
  if (boxGap(box, other) !== 4) return false;
  const overlapY =
    Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y);
  if (overlapY > 0 && (box.x > other.x + other.width || other.x > box.x + box.width)) {
    return true;
  }
  const overlapX =
    Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x);
  if (overlapX > 0 && (box.y > other.y + other.height || other.y > box.y + box.height)) {
    return true;
  }
  return false;
}

function hasWideGap(rooms: readonly RawRoom[]): boolean {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (wideGapTo(rooms[first].box, rooms[second].box)) return true;
    }
  }
  return false;
}

function hasWideAlignment(
  box: Box,
  cells: readonly import('./types').Point[],
  rooms: readonly RawRoom[],
): boolean {
  for (const room of rooms) {
    if (!wideGapTo(box, room.box)) continue;
    const overlapY =
      Math.min(box.y + box.height, room.box.y + room.box.height) - Math.max(box.y, room.box.y);
    if (overlapY > 0) {
      for (let y = Math.max(box.y, room.box.y); y < Math.min(box.y + box.height, room.box.y + room.box.height); y += 1) {
        if (cells.some((cell) => cell.y === y) && room.cells.some((cell) => cell.y === y)) {
          return true;
        }
      }
    }
    const overlapX =
      Math.min(box.x + box.width, room.box.x + room.box.width) - Math.max(box.x, room.box.x);
    if (overlapX > 0) {
      for (let x = Math.max(box.x, room.box.x); x < Math.min(box.x + box.width, room.box.x + room.box.width); x += 1) {
        if (cells.some((cell) => cell.x === x) && room.cells.some((cell) => cell.x === x)) {
          return true;
        }
      }
    }
  }
  return false;
}

function placeWideTemplateRoom(
  rooms: RawRoom[],
  spec: RoomSpec,
  template: Template,
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
): boolean {
  if (rooms.length === 0) return false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shape = transformTemplate(template, rng.int(8));
    const candidates = wideBoxCandidates(rooms, shape.width, shape.height, options);
    for (const box of rng.shuffle(candidates).slice(0, 24)) {
      counter.value += 1;
      const cells = shapeCells(shape, box);
      if (cells.length < minCells(spec)) continue;
      if (!hasWideAlignment(box, cells, rooms)) continue;
      rooms.push({ box, cells });
      return true;
    }
  }
  return false;
}

function growMask(box: Box, spec: RoomSpec, rng: Rng): import('./types').Point[] {
  const area = boxArea(box);
  const ratio =
    spec === 'large'
      ? 0.78 + rng.next() * 0.08
      : spec === 'small'
        ? 0.72 + rng.next() * 0.18
        : 0.62 + rng.next() * 0.14;
  const target = Math.max(minCells(spec), Math.round(area * ratio));
  const mask = new Set<string>();
  const centerX = box.x + Math.floor(box.width / 2);
  const centerY = box.y + Math.floor(box.height / 2);
  mask.add(pointKey(centerX, centerY));

  let guard = 0;
  while (mask.size < target && guard < area * 12) {
    guard += 1;
    const frontier: import('./types').Point[] = [];
    for (const key of mask) {
      const [x, y] = key.split(',').map(Number);
      for (const direction of DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (nx < box.x || ny < box.y) continue;
        if (nx >= box.x + box.width || ny >= box.y + box.height) continue;
        const nextKey = pointKey(nx, ny);
        if (!mask.has(nextKey)) frontier.push({ x: nx, y: ny });
      }
    }
    if (frontier.length === 0) break;
    const next = rng.pick(frontier);
    mask.add(pointKey(next.x, next.y));
  }

  // Garantiza el mínimo aunque el crecimiento se quede corto.
  for (let y = box.y; y < box.y + box.height && mask.size < minCells(spec); y += 1) {
    for (let x = box.x; x < box.x + box.width && mask.size < minCells(spec); x += 1) {
      mask.add(pointKey(x, y));
    }
  }

  let cells = maskToPoints(mask);
  if (spec !== 'small') cells = carveNotches(cells, box, rng, 1);
  return cells;
}

// ---------------------------------------------------------------------------
// BSP con máscaras
// ---------------------------------------------------------------------------

function buildBsp(
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
  warnings: string[],
): RawRoom[] {
  const inner: Box = {
    x: 1,
    y: 1,
    width: options.mapWidth - 2,
    height: options.mapHeight - 2,
  };
  const leaves: Box[] = [inner];

  while (leaves.length < options.roomCount) {
    const candidates = leaves
      .map((leaf, index) => ({ leaf, index }))
      .filter(({ leaf }) => canSplit(leaf, options));
    if (candidates.length === 0) break;
    candidates.sort(
      (a, b) =>
        boxArea(b.leaf) - boxArea(a.leaf) ||
        a.leaf.y - b.leaf.y ||
        a.leaf.x - b.leaf.x,
    );
    const target = candidates[0];
    const split = splitLeaf(target.leaf, rng, options);
    if (!split) break;
    counter.value += 1;
    leaves.splice(target.index, 1, split[0], split[1]);
  }

  if (leaves.length < options.roomCount) {
    warnings.push(`BSP generó ${leaves.length} hojas en lugar de ${options.roomCount}.`);
  }

  const sizes = leaves
    .map((leaf) => leafArea(leaf))
    .sort((a, b) => a - b);
  const smallestArea = sizes[0];
  const largestArea = sizes[sizes.length - 1];

  return leaves.map((leaf, index) => {
    const isLargest = leafArea(leaf) === largestArea;
    const isSmallest = leafArea(leaf) === smallestArea && index === leaves.findIndex((item) => leafArea(item) === smallestArea);
    const spec: RoomSpec = isLargest ? 'large' : isSmallest ? 'small' : 'medium';
    const baseBox = roomBoxForLeaf(leaf, spec, options, isLargest);
    const box = shiftBoxForThickness(baseBox, leaf, index, spec, options);
    const cells = bspMask(box, spec, rng, index);
    return { box, cells };
  });
}

/**
 * Con grosor 2 desplaza 1 tile las salas no grandes dentro de su hoja. Así
 * aparecen paredes de 2 tiles en un lado y de 1 en el otro, sin cambiar el
 * tamaño de la caja ni la conectividad.
 */
function shiftBoxForThickness(
  box: Box,
  leaf: Box,
  index: number,
  spec: RoomSpec,
  options: ResolvedMapOptions,
): Box {
  if (options.wallThickness !== 2 || spec === 'large') return box;
  const direction = index % 2 === 0 ? 1 : -1;
  if (leaf.width >= leaf.height) {
    const minX = leaf.x;
    const maxX = leaf.x + leaf.width - box.width;
    if (maxX <= minX) return box;
    return { ...box, x: clamp(box.x + direction, minX, maxX) };
  }
  const minY = leaf.y;
  const maxY = leaf.y + leaf.height - box.height;
  if (maxY <= minY) return box;
  return { ...box, y: clamp(box.y + direction, minY, maxY) };
}

function canSplit(leaf: Box, options: ResolvedMapOptions): boolean {
  const minSide = Math.max(4, options.roomMin + 2);
  return leaf.width >= minSide * 2 || leaf.height >= minSide * 2;
}

function splitLeaf(
  leaf: Box,
  rng: Rng,
  options: ResolvedMapOptions,
): [Box, Box] | null {
  const minSide = Math.max(4, options.roomMin + 2);
  const canWidth = leaf.width >= minSide * 2;
  const canHeight = leaf.height >= minSide * 2;
  if (!canWidth && !canHeight) return null;

  const prefersVertical = leaf.width > leaf.height * 1.15;
  const prefersHorizontal = leaf.height > leaf.width * 1.15;
  let splitVertical: boolean;
  if (prefersVertical && canWidth) splitVertical = true;
  else if (prefersHorizontal && canHeight) splitVertical = false;
  else if (!canHeight) splitVertical = true;
  else if (!canWidth) splitVertical = false;
  else splitVertical = rng.chance(0.5);

  if (splitVertical) {
    const minSplit = minSide;
    const maxSplit = leaf.width - minSide;
    const split = clamp(Math.floor(leaf.width / 2) + rng.int(3) - 1, minSplit, maxSplit);
    return [
      { ...leaf, width: split },
      { ...leaf, x: leaf.x + split, width: leaf.width - split },
    ];
  }
  const minSplit = minSide;
  const maxSplit = leaf.height - minSide;
  const split = clamp(Math.floor(leaf.height / 2) + rng.int(3) - 1, minSplit, maxSplit);
  return [
    { ...leaf, height: split },
    { ...leaf, y: leaf.y + split, height: leaf.height - split },
  ];
}

function leafArea(leaf: Box): number {
  return boxArea(leaf);
}

function roomBoxForLeaf(
  leaf: Box,
  spec: RoomSpec,
  options: ResolvedMapOptions,
  extend: boolean,
): Box {
  let width = Math.max(options.roomMin, leaf.width - 2);
  let height = Math.max(options.roomMin, leaf.height - 2);

  if (spec === 'large') {
    width = Math.max(width, Math.min(options.roomMax, 7));
    height = Math.max(height, Math.min(options.roomMax, 7));
  } else if (spec === 'small') {
    width = Math.min(width, Math.min(options.roomMax, 4));
    height = Math.min(height, Math.min(options.roomMax, 4));
  }

  width = Math.min(width, options.roomMax, leaf.width);
  height = Math.min(height, options.roomMax, leaf.height);
  width = Math.max(options.roomMin, width);
  height = Math.max(options.roomMin, height);

  let x = leaf.x + Math.floor((leaf.width - width) / 2);
  let y = leaf.y + Math.floor((leaf.height - height) / 2);

  // La hoja mayor usa su esquina superior izquierda para maximizar la caja y
  // compartir pared con una vecina, dejando al menos 1 tile de margen al sur.
  if (extend) {
    width = Math.min(options.roomMax, leaf.width);
    height = Math.min(options.roomMax, leaf.height);
    x = leaf.x;
    y = leaf.y;
  }

  return { x, y, width, height };
}

function bspMask(
  box: Box,
  spec: RoomSpec,
  rng: Rng,
  index: number,
): import('./types').Point[] {
  const mask = new Set<string>();
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      mask.add(pointKey(x, y));
    }
  }

  if (spec === 'small') {
    if (rng.chance(0.55)) removeCorner(mask, box, rng, 1);
    return maskToPoints(mask);
  }

  const pattern = spec === 'large' ? 1 + rng.int(2) : index % 4 + 1;
  if (pattern === 1) {
    removeCorner(mask, box, rng, Math.min(2, box.width - 2));
  } else if (pattern === 2) {
    removeHalfCorner(mask, box, rng);
  } else if (pattern === 3) {
    removeSideStrip(mask, box, rng);
  } else {
    removeCorner(mask, box, rng, 1);
    removeCorner(mask, box, rng, 1);
  }

  if (!maskIsConnected(maskToPoints(mask))) {
    return allBoxCells(box);
  }
  return maskToPoints(mask);
}

// ---------------------------------------------------------------------------
// Plantillas empaquetadas
// ---------------------------------------------------------------------------

function buildTemplates(
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
  warnings: string[],
  wantsWide: boolean,
): RawRoom[] {
  const specs = roomSpecs(options.roomCount);
  const rooms: RawRoom[] = [];

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const template = pickTemplate(spec, rng, options);
    if (!template) {
      warnings.push(`No hay plantilla válida para la sala ${index + 1}.`);
      continue;
    }
    let placed = false;

    if (index === 2 && wantsWide) {
      for (const candidate of allowedTemplates(spec, options)) {
        if (placeWideTemplateRoom(rooms, spec, candidate, rng, options, counter)) {
          placed = true;
          break;
        }
      }
    }

    for (let phase = 0; phase < 2 && !placed; phase += 1) {
      const preferShared = index === 1 && phase === 0;
      const preferWide = index === 2 && wantsWide && phase === 0;
      for (let attempt = 0; attempt < 350 && !placed; attempt += 1) {
        counter.value += 1;
        const orientation = rng.int(8);
        const shape = transformTemplate(template, orientation);
        const box = randomBoxForShape(rng, options, shape.width, shape.height);
        if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
        if (rooms.some((room) => boxGap(box, room.box) < placementMinGap(options, index))) continue;
        if (rooms.length > 0) {
          const gaps = rooms.map((room) => boxGap(box, room.box));
          const nearest = Math.min(...gaps);
          const limit = index === 2 && wantsWide && phase === 0 ? 4 : 3;
          if (nearest > limit) continue;
          if (preferShared && !gaps.some((gap) => gap === 1)) continue;
          if (preferWide && !gaps.some((gap) => gap === 4)) continue;
        }
        const cells = shapeCells(shape, box);
        if (cells.length < minCells(spec)) continue;
        if (rooms.length > 0 && !canConnectToExisting(box, cells, rooms, options)) continue;
        rooms.push({ box, cells });
        placed = true;
      }
    }

    if (!placed) {
      warnings.push(`No se pudo empaquetar la plantilla ${template.id}.`);
      placeFallbackRoom(rooms, rng, options, spec === 'large' ? 'medium' : spec);
    }
  }

  if (rooms.length < Math.min(4, options.roomCount)) {
    warnings.push('El grosor de muro pedido no cupo; se relajó la separación para completar las salas.');
    let guard = 0;
    while (rooms.length < Math.min(4, options.roomCount) && guard < 4) {
      guard += 1;
      const before = rooms.length;
      placeFallbackRoom(rooms, rng, options, 'small');
      if (rooms.length === before) break;
    }
  }

  if (rooms.length > 0 && !hasSharedWall(rooms)) {
    warnings.push('El empaquetado no logró una pared compartida; se relajó la separación.');
    placeFallbackRoom(rooms, rng, options, 'small');
  }

  return rooms;
}

type Shape = {
  readonly rows: readonly string[];
  readonly width: number;
  readonly height: number;
};

function allowedTemplates(spec: RoomSpec, options: ResolvedMapOptions): Template[] {
  return TEMPLATES.filter((template) => {
    const width = template.rows[0].length;
    const height = template.rows.length;
    if (width > options.mapWidth - 2 || height > options.mapHeight - 2) return false;
    if (width > options.roomMax + 1 || height > options.roomMax + 1) return false;
    if (spec === 'large') return width >= 7 && height >= 7;
    if (spec === 'small') return width <= 4 && height <= 4;
    return width >= 4 && height >= 4 && !(width >= 7 && height >= 7);
  });
}

function pickTemplate(
  spec: RoomSpec,
  rng: Rng,
  options: ResolvedMapOptions,
): Template | null {
  const allowed = allowedTemplates(spec, options);
  if (allowed.length === 0) return null;
  return rng.pick(allowed);
}

function transformTemplate(template: Template, orientation: number): Shape {
  let rows = template.rows.map((row) => row.split(''));
  if (orientation >= 4) rows = rows.map((row) => [...row].reverse());
  const rotations = orientation % 4;
  for (let turn = 0; turn < rotations; turn += 1) {
    const height = rows.length;
    const width = rows[0].length;
    const rotated: string[][] = Array.from({ length: width }, () =>
      new Array<string>(height).fill('0'),
    );
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        rotated[x][height - 1 - y] = rows[y][x];
      }
    }
    rows = rotated;
  }
  return {
    rows: rows.map((row) => row.join('')),
    width: rows[0].length,
    height: rows.length,
  };
}

function shapeCells(shape: Shape, box: Box): import('./types').Point[] {
  const cells: import('./types').Point[] = [];
  for (let y = 0; y < shape.height; y += 1) {
    for (let x = 0; x < shape.width; x += 1) {
      if (shape.rows[y][x] === '1') cells.push({ x: box.x + x, y: box.y + y });
    }
  }
  return sortPoints(cells);
}

// ---------------------------------------------------------------------------
// Caverna excepcional
// ---------------------------------------------------------------------------

function buildCavern(
  rng: Rng,
  options: ResolvedMapOptions,
  counter: Counter,
  warnings: string[],
): RawRoom[] {
  const cavernWidth = Math.max(9, Math.min(options.mapWidth - 4, Math.round(options.mapWidth * 0.56)));
  const cavernHeight = Math.max(8, Math.min(options.mapHeight - 4, Math.round(options.mapHeight * 0.56)));

  let cavern: RawRoom | null = null;
  for (let attempt = 0; attempt < 80 && !cavern; attempt += 1) {
    counter.value += 1;
    const width = Math.max(options.roomMin, cavernWidth - rng.int(3));
    const height = Math.max(options.roomMin, cavernHeight - rng.int(2));
    const box: Box = {
      x: 1 + rng.int(Math.max(1, options.mapWidth - width - 2)),
      y: 1 + rng.int(Math.max(1, options.mapHeight - height - 2)),
      width,
      height,
    };
    if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
    const cells = growMask(box, 'large', rng);
    if (cells.length < 50) continue;
    cavern = { box, cells };
  }

  if (!cavern) {
    warnings.push('La caverna no encontró una caja válida; se usó una sala grande.');
    const box: Box = {
      x: 1,
      y: 1,
      width: Math.min(options.mapWidth - 2, 9),
      height: Math.min(options.mapHeight - 2, 8),
    };
    cavern = { box, cells: growMask(box, 'large', rng) };
  }

  const rooms: RawRoom[] = [cavern];
  const annexCount = rng.chance(0.55) ? 2 : 1;
  for (let annex = 0; annex < annexCount; annex += 1) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt += 1) {
      counter.value += 1;
      const width = 3 + rng.int(2);
      const height = 3 + rng.int(2);
      const box: Box = {
        x: 1 + rng.int(Math.max(1, options.mapWidth - width - 2)),
        y: 1 + rng.int(Math.max(1, options.mapHeight - height - 2)),
        width,
        height,
      };
      if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
      if (rooms.some((room) => boxGap(box, room.box) < 1)) continue;
      if (boxGap(box, cavern.box) > 2) continue;
      if (rooms.length > 1 && boxGap(box, cavern.box) < 1) continue;
      const cells = annex === 0 ? allBoxCells(box) : carveNotches(allBoxCells(box), box, rng, 1);
      if (cells.length < 6) continue;
      rooms.push({ box, cells });
      placed = true;
    }
    if (!placed) warnings.push('La caverna no pudo colocar todas las salas anexas.');
  }

  return rooms;
}

// ---------------------------------------------------------------------------
// Formas y colocación compartida
// ---------------------------------------------------------------------------

type RoomSpec = 'large' | 'small' | 'medium';

function placementMinGap(options: ResolvedMapOptions, index: number): number {
  // La segunda sala mantiene la pared compartida de la puerta directa; el
  // resto prefiere 2 tiles de muro cuando el control está en 2.
  return options.wallThickness === 2 && index !== 1 ? 2 : 1;
}

function roomSpecs(count: number): RoomSpec[] {
  const specs: RoomSpec[] = ['large', 'small'];
  for (let index = 2; index < count; index += 1) specs.push('medium');
  return specs;
}

function minCells(spec: RoomSpec): number {
  if (spec === 'large') return 30;
  if (spec === 'small') return 6;
  return 12;
}

function randomBox(rng: Rng, options: ResolvedMapOptions, spec: RoomSpec): Box {
  const innerWidth = options.mapWidth - 2;
  const innerHeight = options.mapHeight - 2;
  let width: number;
  let height: number;
  if (spec === 'large') {
    width = clamp(7 + rng.int(3), 3, Math.min(options.roomMax, innerWidth));
    height = clamp(7 + rng.int(3), 3, Math.min(options.roomMax, innerHeight));
  } else if (spec === 'small') {
    width = clamp(3 + rng.int(2), 3, Math.min(4, innerWidth));
    height = clamp(3 + rng.int(2), 3, Math.min(4, innerHeight));
  } else {
    width = clamp(4 + rng.int(4), 3, Math.min(options.roomMax, innerWidth));
    height = clamp(4 + rng.int(4), 3, Math.min(options.roomMax, innerHeight));
  }
  return {
    x: 1 + rng.int(Math.max(1, innerWidth - width + 1)),
    y: 1 + rng.int(Math.max(1, innerHeight - height + 1)),
    width,
    height,
  };
}

function randomBoxForShape(
  rng: Rng,
  options: ResolvedMapOptions,
  width: number,
  height: number,
): Box {
  const innerWidth = options.mapWidth - 2;
  const innerHeight = options.mapHeight - 2;
  const safeWidth = Math.min(width, innerWidth);
  const safeHeight = Math.min(height, innerHeight);
  return {
    x: 1 + rng.int(Math.max(1, innerWidth - safeWidth + 1)),
    y: 1 + rng.int(Math.max(1, innerHeight - safeHeight + 1)),
    width: safeWidth,
    height: safeHeight,
  };
}

function allBoxCells(box: Box): import('./types').Point[] {
  const cells: import('./types').Point[] = [];
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) cells.push({ x, y });
  }
  return cells;
}

function carveNotches(
  cells: readonly import('./types').Point[],
  box: Box,
  rng: Rng,
  count: number,
): import('./types').Point[] {
  let next = sortPoints(cells);
  for (let notch = 0; notch < count; notch += 1) {
    const candidates = next.filter((cell) => {
      const border =
        cell.x === box.x ||
        cell.y === box.y ||
        cell.x === box.x + box.width - 1 ||
        cell.y === box.y + box.height - 1;
      if (!border) return false;
      const remaining = next.filter((item) => item.x !== cell.x || item.y !== cell.y);
      return remaining.length >= minCells('medium') && maskIsConnected(remaining);
    });
    if (candidates.length === 0) break;
    const victim = rng.pick(candidates);
    next = next.filter((cell) => cell.x !== victim.x || cell.y !== victim.y);
  }
  return next;
}

function hasSharedWall(rooms: readonly RawRoom[]): boolean {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first].box;
      const b = rooms[second].box;
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (gapX === 1 && overlapY > 0) return true;
      if (gapY === 1 && overlapX > 0) return true;
    }
  }
  return false;
}

function placeFallbackRoom(
  rooms: RawRoom[],
  rng: Rng,
  options: ResolvedMapOptions,
  spec: RoomSpec,
): void {
  const dimensions =
    spec === 'small'
      ? { width: 3 + rng.int(2), height: 3 + rng.int(2) }
      : spec === 'large'
        ? { width: 7, height: 7 }
        : { width: 4 + rng.int(2), height: 4 + rng.int(2) };

  const candidates: Box[] = [];
  for (const room of rooms) {
    const box = room.box;
    const positions = [
      { x: box.x + box.width + 1, y: box.y - dimensions.height + 1 },
      { x: box.x - dimensions.width - 1, y: box.y - dimensions.height + 1 },
      { x: box.x - dimensions.width + 1, y: box.y + box.height + 1 },
      { x: box.x - dimensions.width + 1, y: box.y - dimensions.height - 1 },
      { x: box.x + box.width + 1, y: box.y },
      { x: box.x - dimensions.width - 1, y: box.y },
      { x: box.x, y: box.y + box.height + 1 },
      { x: box.x, y: box.y - dimensions.height - 1 },
    ];
    for (const position of positions) {
      candidates.push({ ...position, ...dimensions });
    }
  }

  const ordered = rng.shuffle(candidates);
  for (const box of ordered) {
    if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
    if (rooms.some((room) => boxGap(box, room.box) < 1)) continue;
    if (!rooms.some((room) => boxGap(box, room.box) === 1)) continue;
    const cells = spec === 'small' ? allBoxCells(box) : growMask(box, spec, rng);
    if (cells.length < minCells(spec)) continue;
    rooms.push({ box, cells });
    if (ensureDirectDoor(rooms) && roomsConnected(rooms, options)) return;
    rooms.pop();
  }

  // Último recurso: cualquier caja con separación corta y conexión posible.
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const box = randomBox(rng, options, spec);
    if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) continue;
    if (rooms.some((room) => boxGap(box, room.box) < 1)) continue;
    if (!rooms.some((room) => boxGap(box, room.box) <= 3)) continue;
    const cells = spec === 'small' ? allBoxCells(box) : growMask(box, spec, rng);
    if (cells.length < minCells(spec)) continue;
    if (!canConnectToExisting(box, cells, rooms, options)) continue;
    rooms.push({ box, cells });
    return;
  }
}

function removeCorner(mask: Set<string>, box: Box, rng: Rng, depth: number): void {
  const corner = rng.int(4);
  const x0 = corner === 0 || corner === 2 ? box.x : box.x + box.width - depth;
  const y0 = corner < 2 ? box.y : box.y + box.height - depth;
  removeRect(mask, { x: x0, y: y0, width: depth, height: depth });
}

function removeHalfCorner(mask: Set<string>, box: Box, rng: Rng): void {
  const corner = rng.int(4);
  const width = Math.max(1, Math.floor(box.width / 2));
  const height = Math.max(1, Math.floor(box.height / 2));
  const x0 = corner === 0 || corner === 2 ? box.x : box.x + box.width - width;
  const y0 = corner < 2 ? box.y : box.y + box.height - height;
  removeRect(mask, { x: x0, y: y0, width, height });
}

function removeSideStrip(mask: Set<string>, box: Box, rng: Rng): void {
  const vertical = rng.chance(0.5);
  const depth = Math.min(2, vertical ? box.width - 1 : box.height - 1);
  if (vertical) {
    const fromTop = rng.chance(0.5);
    const y0 = fromTop ? box.y : box.y + Math.floor(box.height / 2);
    removeRect(mask, { x: box.x, y: y0, width: depth, height: Math.max(1, Math.floor(box.height / 2)) });
  } else {
    const fromLeft = rng.chance(0.5);
    const x0 = fromLeft ? box.x : box.x + Math.floor(box.width / 2);
    removeRect(mask, { x: x0, y: box.y, width: Math.max(1, Math.floor(box.width / 2)), height: depth });
  }
}

function removeRect(mask: Set<string>, rect: Box): void {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      mask.delete(pointKey(x, y));
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Garantiza al menos una forma no rectangular y tres muescas en el mapa. */
function ensureShape(
  rooms: RawRoom[],
  rng: Rng,
  warnings: string[],
  options: ResolvedMapOptions,
): void {
  if (rooms.length === 0) return;

  const notches = () => totalNotches(rooms);
  let guard = 0;
  while (notches() < 3 && guard < 40) {
    guard += 1;
    const ordered = [...rooms].sort(
      (a, b) =>
        b.cells.length - a.cells.length ||
        a.box.y - b.box.y ||
        a.box.x - b.box.x,
    );
    let removed = false;
    for (const room of ordered) {
      const candidates = room.cells.filter(
        (cell) =>
          (cell.x === room.box.x ||
            cell.y === room.box.y ||
            cell.x === room.box.x + room.box.width - 1 ||
            cell.y === room.box.y + room.box.height - 1) &&
          room.cells.filter((item) => item.x !== cell.x || item.y !== cell.y).length >= 6,
      );
      if (candidates.length === 0) continue;
      const victim = rng.pick(candidates);
      const remaining = room.cells.filter(
        (item) => item.x !== victim.x || item.y !== victim.y,
      );
      if (!maskIsConnected(remaining)) continue;
      const index = rooms.indexOf(room);
      const previous = rooms[index];
      rooms[index] = { box: room.box, cells: sortPoints(remaining) };
      if (!roomsConnected(rooms, options)) {
        rooms[index] = previous;
        continue;
      }
      removed = true;
      break;
    }
    if (!removed) break;
  }

  if (notches() < 3) warnings.push('No se pudieron tallar tres muescas.');
}

function totalNotches(rooms: readonly RawRoom[]): number {
  let total = 0;
  for (const room of rooms) {
    const mask = pointsToMask(room.cells);
    for (let y = room.box.y; y < room.box.y + room.box.height; y += 1) {
      for (let x = room.box.x; x < room.box.x + room.box.width; x += 1) {
        if (mask.has(pointKey(x, y))) continue;
        const touches = neighbors4(x, y).some((next) => mask.has(pointKey(next.x, next.y)));
        if (touches) total += 1;
      }
    }
  }
  return total;
}

/** Rebaja la relación área/caja sin romper la máscara ni las celdas protegidas. */
function normalizeRatios(
  rooms: RawRoom[],
  threshold = 0.75,
  protectedCells: ReadonlySet<string> = new Set(),
  options?: ResolvedMapOptions,
  preserveConnectivity = false,
): void {
  for (let index = 0; index < rooms.length; index += 1) {
    const room = rooms[index];
    let cells = [...room.cells];
    let guard = 0;

    while (cells.length / boxArea(room.box) > threshold && cells.length > 6 && guard < 60) {
      guard += 1;
      let removed = false;
      const ordered = sortPoints(cells);
      for (const cell of ordered) {
        const border =
          cell.x === room.box.x ||
          cell.y === room.box.y ||
          cell.x === room.box.x + room.box.width - 1 ||
          cell.y === room.box.y + room.box.height - 1;
        if (!border) continue;
        if (protectedCells.has(pointKey(cell.x, cell.y))) continue;
        const remaining = cells.filter((item) => item.x !== cell.x || item.y !== cell.y);
        if (!maskIsConnected(remaining)) continue;
        if (preserveConnectivity && options) {
          const previous = rooms[index];
          rooms[index] = { box: room.box, cells: sortPoints(remaining) };
          const ok = roomsConnected(rooms, options);
          rooms[index] = previous;
          if (!ok) continue;
        }
        cells = remaining;
        removed = true;
        break;
      }
      if (!removed) break;
    }

    rooms[index] = { box: room.box, cells: sortPoints(cells) };
  }
}

function protectedEdgeCells(rooms: readonly RawRoom[]): Set<string> {
  const protectedCells = new Set<string>();
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const gapX = Math.max(0, Math.max(a.box.x, b.box.x) - Math.min(a.box.x + a.box.width, b.box.x + b.box.width));
      const gapY = Math.max(0, Math.max(a.box.y, b.box.y) - Math.min(a.box.y + a.box.height, b.box.y + b.box.height));
      const overlapX = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
      const overlapY = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      const relevant = gapX === 1 || gapX === 4 || gapY === 1 || gapY === 4;
      if (!relevant) continue;
      if (overlapY > 0) {
        const left = a.box.x < b.box.x ? a : b;
        const right = left === a ? b : a;
        for (const cell of left.cells) {
          if (cell.x === left.box.x + left.box.width - 1) protectedCells.add(pointKey(cell.x, cell.y));
        }
        for (const cell of right.cells) {
          if (cell.x === right.box.x) protectedCells.add(pointKey(cell.x, cell.y));
        }
      }
      if (overlapX > 0) {
        const top = a.box.y < b.box.y ? a : b;
        const bottom = top === a ? b : a;
        for (const cell of top.cells) {
          if (cell.y === top.box.y + top.box.height - 1) protectedCells.add(pointKey(cell.x, cell.y));
        }
        for (const cell of bottom.cells) {
          if (cell.y === bottom.box.y) protectedCells.add(pointKey(cell.x, cell.y));
        }
      }
    }
  }
  return protectedCells;
}

function roomsHaveDirectPair(rooms: readonly RawRoom[]): boolean {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      for (const cellA of rooms[first].cells) {
        for (const cellB of rooms[second].cells) {
          if (Math.abs(cellA.x - cellB.x) + Math.abs(cellA.y - cellB.y) === 2) return true;
        }
      }
    }
  }
  return false;
}

function edgeCellsToTarget(
  room: RawRoom,
  targetX: number,
  targetY: number,
  others: ReadonlySet<string>,
): import('./types').Point[] | null {
  if (targetX < room.box.x || targetY < room.box.y) return null;
  if (targetX >= room.box.x + room.box.width || targetY >= room.box.y + room.box.height) {
    return null;
  }
  if (room.cells.some((cell) => cell.x === targetX && cell.y === targetY)) return [];
  if (others.has(pointKey(targetX, targetY))) return null;

  const sameColumn = room.cells
    .filter((cell) => cell.x === targetX)
    .sort((a, b) => Math.abs(a.y - targetY) - Math.abs(b.y - targetY));
  if (sameColumn.length > 0) {
    const from = sameColumn[0].y;
    const additions: import('./types').Point[] = [];
    const step = from < targetY ? 1 : -1;
    for (let y = from + step; y !== targetY + step; y += step) {
      if (others.has(pointKey(targetX, y))) return null;
      additions.push({ x: targetX, y });
    }
    return additions;
  }

  const sameRow = room.cells
    .filter((cell) => cell.y === targetY)
    .sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
  if (sameRow.length > 0) {
    const from = sameRow[0].x;
    const additions: import('./types').Point[] = [];
    const step = from < targetX ? 1 : -1;
    for (let x = from + step; x !== targetX + step; x += step) {
      if (others.has(pointKey(x, targetY))) return null;
      additions.push({ x, y: targetY });
    }
    return additions;
  }

  return null;
}

/**
 * Garantiza al menos una puerta directa. Si dos cajas están separadas por un
 * único tile de muro, extiende las máscaras hasta la pared para que exista un
 * par de suelos a distancia 2 y el finalizador pueda abrir el hueco.
 */
function ensureDirectDoor(rooms: RawRoom[]): boolean {
  if (roomsHaveDirectPair(rooms)) return true;

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const others = new Set<string>();
      for (let index = 0; index < rooms.length; index += 1) {
        if (index === first || index === second) continue;
        for (const cell of rooms[index].cells) others.add(pointKey(cell.x, cell.y));
      }

      // A a la izquierda de B.
      if (a.box.x + a.box.width + 1 === b.box.x) {
        const startY = Math.max(a.box.y, b.box.y);
        const endY = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - 1;
        for (let y = startY; y <= endY; y += 1) {
          const aRow = a.cells.filter((cell) => cell.y === y);
          const bRow = b.cells.filter((cell) => cell.y === y);
          if (aRow.length === 0 || bRow.length === 0) continue;
          const targetA = b.box.x - 2;
          const targetB = b.box.x;
          const maxA = Math.max(...aRow.map((cell) => cell.x));
          const minB = Math.min(...bRow.map((cell) => cell.x));
          if (maxA > targetA || minB < targetB) continue;
          const additionsA = rangePoints(maxA + 1, targetA, y, 'x');
          const additionsB = rangePoints(targetB, minB - 1, y, 'x');
          if ([...additionsA, ...additionsB].some((cell) => others.has(pointKey(cell.x, cell.y)))) {
            continue;
          }
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...additionsA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...additionsB]) };
          return true;
        }
      }

      // A a la derecha de B.
      if (b.box.x + b.box.width + 1 === a.box.x) {
        const startY = Math.max(a.box.y, b.box.y);
        const endY = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - 1;
        for (let y = startY; y <= endY; y += 1) {
          const aRow = a.cells.filter((cell) => cell.y === y);
          const bRow = b.cells.filter((cell) => cell.y === y);
          if (aRow.length === 0 || bRow.length === 0) continue;
          const targetA = a.box.x;
          const targetB = a.box.x - 2;
          const minA = Math.min(...aRow.map((cell) => cell.x));
          const maxB = Math.max(...bRow.map((cell) => cell.x));
          if (minA < targetA || maxB > targetB) continue;
          const additionsA = rangePoints(targetA, minA - 1, y, 'x');
          const additionsB = rangePoints(maxB + 1, targetB, y, 'x');
          if ([...additionsA, ...additionsB].some((cell) => others.has(pointKey(cell.x, cell.y)))) {
            continue;
          }
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...additionsA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...additionsB]) };
          return true;
        }
      }

      // A encima de B.
      if (a.box.y + a.box.height + 1 === b.box.y) {
        const startX = Math.max(a.box.x, b.box.x);
        const endX = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - 1;
        for (let x = startX; x <= endX; x += 1) {
          const aColumn = a.cells.filter((cell) => cell.x === x);
          const bColumn = b.cells.filter((cell) => cell.x === x);
          if (aColumn.length === 0 || bColumn.length === 0) continue;
          const targetA = b.box.y - 2;
          const targetB = b.box.y;
          const maxA = Math.max(...aColumn.map((cell) => cell.y));
          const minB = Math.min(...bColumn.map((cell) => cell.y));
          if (maxA > targetA || minB < targetB) continue;
          const additionsA = rangePoints(maxA + 1, targetA, x, 'y');
          const additionsB = rangePoints(targetB, minB - 1, x, 'y');
          if ([...additionsA, ...additionsB].some((cell) => others.has(pointKey(cell.x, cell.y)))) {
            continue;
          }
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...additionsA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...additionsB]) };
          return true;
        }
      }

      // A debajo de B.
      if (b.box.y + b.box.height + 1 === a.box.y) {
        const startX = Math.max(a.box.x, b.box.x);
        const endX = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - 1;
        for (let x = startX; x <= endX; x += 1) {
          const aColumn = a.cells.filter((cell) => cell.x === x);
          const bColumn = b.cells.filter((cell) => cell.x === x);
          if (aColumn.length === 0 || bColumn.length === 0) continue;
          const targetA = a.box.y;
          const targetB = a.box.y - 2;
          const minA = Math.min(...aColumn.map((cell) => cell.y));
          const maxB = Math.max(...bColumn.map((cell) => cell.y));
          if (minA < targetA || maxB > targetB) continue;
          const additionsA = rangePoints(targetA, minA - 1, x, 'y');
          const additionsB = rangePoints(maxB + 1, targetB, x, 'y');
          if ([...additionsA, ...additionsB].some((cell) => others.has(pointKey(cell.x, cell.y)))) {
            continue;
          }
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...additionsA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...additionsB]) };
          return true;
        }
      }
    }
  }

  // Último recurso: crea un saliente de una celda hasta la pared compartida
  // usando una columna o fila ya existente de cada sala.
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const others = new Set<string>();
      for (let index = 0; index < rooms.length; index += 1) {
        if (index === first || index === second) continue;
        for (const cell of rooms[index].cells) others.add(pointKey(cell.x, cell.y));
      }

      const overlapY =
        Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      if (a.box.x + a.box.width + 1 === b.box.x && overlapY > 0) {
        for (let y = Math.max(a.box.y, b.box.y); y < Math.min(a.box.y + a.box.height, b.box.y + b.box.height); y += 1) {
          const addA = edgeCellsToTarget(a, b.box.x - 2, y, others);
          const addB = edgeCellsToTarget(b, b.box.x, y, others);
          if (addA === null || addB === null) continue;
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...addA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...addB]) };
          return true;
        }
      }
      if (b.box.x + b.box.width + 1 === a.box.x && overlapY > 0) {
        for (let y = Math.max(a.box.y, b.box.y); y < Math.min(a.box.y + a.box.height, b.box.y + b.box.height); y += 1) {
          const addA = edgeCellsToTarget(a, a.box.x, y, others);
          const addB = edgeCellsToTarget(b, a.box.x - 2, y, others);
          if (addA === null || addB === null) continue;
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...addA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...addB]) };
          return true;
        }
      }

      const overlapX =
        Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
      if (a.box.y + a.box.height + 1 === b.box.y && overlapX > 0) {
        for (let x = Math.max(a.box.x, b.box.x); x < Math.min(a.box.x + a.box.width, b.box.x + b.box.width); x += 1) {
          const addA = edgeCellsToTarget(a, x, b.box.y - 2, others);
          const addB = edgeCellsToTarget(b, x, b.box.y, others);
          if (addA === null || addB === null) continue;
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...addA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...addB]) };
          return true;
        }
      }
      if (b.box.y + b.box.height + 1 === a.box.y && overlapX > 0) {
        for (let x = Math.max(a.box.x, b.box.x); x < Math.min(a.box.x + a.box.width, b.box.x + b.box.width); x += 1) {
          const addA = edgeCellsToTarget(a, x, a.box.y, others);
          const addB = edgeCellsToTarget(b, x, a.box.y - 2, others);
          if (addA === null || addB === null) continue;
          rooms[first] = { box: a.box, cells: sortPoints([...a.cells, ...addA]) };
          rooms[second] = { box: b.box, cells: sortPoints([...b.cells, ...addB]) };
          return true;
        }
      }
    }
  }

  return false;
}

function rangePoints(
  from: number,
  to: number,
  fixed: number,
  axis: 'x' | 'y',
): import('./types').Point[] {
  if (from > to) return [];
  const points: import('./types').Point[] = [];
  for (let value = from; value <= to; value += 1) {
    points.push(axis === 'x' ? { x: value, y: fixed } : { x: fixed, y: value });
  }
  return points;
}

/** Intenta trasladar una sala completa sin tocar sus dimensiones. */
function tryTranslateRoom(
  rooms: RawRoom[],
  index: number,
  dx: number,
  dy: number,
  options: ResolvedMapOptions,
): boolean {
  const room = rooms[index];
  const box: Box = {
    x: room.box.x + dx,
    y: room.box.y + dy,
    width: room.box.width,
    height: room.box.height,
  };
  if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) return false;
  for (let other = 0; other < rooms.length; other += 1) {
    if (other === index) continue;
    if (boxGap(box, rooms[other].box) < 1) return false;
  }
  rooms[index] = {
    box,
    cells: sortPoints(room.cells.map((cell) => ({ x: cell.x + dx, y: cell.y + dy }))),
  };
  if (!roomsConnected(rooms, options)) {
    rooms[index] = room;
    return false;
  }
  return true;
}


function tryShrinkRoomAway(
  rooms: RawRoom[],
  index: number,
  side: 'left' | 'right' | 'top' | 'bottom',
  amount: number,
  options: ResolvedMapOptions,
): boolean {
  const room = rooms[index];
  let box: Box;
  if (side === 'right') {
    box = { ...room.box, width: room.box.width - amount };
  } else if (side === 'left') {
    box = { ...room.box, x: room.box.x + amount, width: room.box.width - amount };
  } else if (side === 'bottom') {
    box = { ...room.box, height: room.box.height - amount };
  } else {
    box = { ...room.box, y: room.box.y + amount, height: room.box.height - amount };
  }
  if (box.width < options.roomMin || box.height < options.roomMin) return false;
  if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) return false;

  const cells = room.cells.filter(
    (cell) =>
      cell.x >= box.x &&
      cell.y >= box.y &&
      cell.x < box.x + box.width &&
      cell.y < box.y + box.height,
  );
  if (cells.length < 6 || !maskIsConnected(cells)) return false;

  const wasLarge =
    (room.box.width >= 7 && room.box.height >= 7) || room.cells.length >= 50;
  const anotherLarge = rooms.some(
    (other, otherIndex) =>
      otherIndex !== index &&
      ((other.box.width >= 7 && other.box.height >= 7) || other.cells.length >= 50),
  );
  const stillLarge = (box.width >= 7 && box.height >= 7) || cells.length >= 50;
  if (wasLarge && !anotherLarge && !stillLarge) return false;

  rooms[index] = { box, cells: sortPoints(cells) };
  if (!roomsConnected(rooms, options)) {
    rooms[index] = room;
    return false;
  }
  return true;
}

/** Crea un par de salas separadas por 4 tiles de muro para el pasillo ancho. */
function ensureWideGap(rooms: RawRoom[], options: ResolvedMapOptions): boolean {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (boxGap(rooms[first].box, rooms[second].box) === 4) return true;
    }
  }

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const overlapY =
        Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      const overlapX =
        Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);

      if (overlapY > 0) {
        if (b.box.x > a.box.x + a.box.width) {
          const gap = b.box.x - (a.box.x + a.box.width);
          if (gap >= 1 && gap <= 3) {
            const need = 4 - gap;
            const smallerFirst = a.cells.length <= b.cells.length;
            if (smallerFirst) {
              if (tryShrinkRoomAway(rooms, first, 'right', need, options)) return true;
            } else if (tryShrinkRoomAway(rooms, second, 'left', need, options)) return true;
            if (tryTranslateRoom(rooms, first, -need, 0, options)) return true;
            if (tryTranslateRoom(rooms, second, need, 0, options)) return true;
          }
        } else if (a.box.x > b.box.x + b.box.width) {
          const gap = a.box.x - (b.box.x + b.box.width);
          if (gap >= 1 && gap <= 3) {
            const need = 4 - gap;
            const smallerFirst = a.cells.length <= b.cells.length;
            if (smallerFirst) {
              if (tryShrinkRoomAway(rooms, first, 'left', need, options)) return true;
            } else if (tryShrinkRoomAway(rooms, second, 'right', need, options)) return true;
            if (tryTranslateRoom(rooms, second, -need, 0, options)) return true;
            if (tryTranslateRoom(rooms, first, need, 0, options)) return true;
          }
        }
      }

      if (overlapX > 0) {
        if (b.box.y > a.box.y + a.box.height) {
          const gap = b.box.y - (a.box.y + a.box.height);
          if (gap >= 1 && gap <= 3) {
            const need = 4 - gap;
            const smallerFirst = a.cells.length <= b.cells.length;
            if (smallerFirst) {
              if (tryShrinkRoomAway(rooms, first, 'bottom', need, options)) return true;
            } else if (tryShrinkRoomAway(rooms, second, 'top', need, options)) return true;
            if (tryTranslateRoom(rooms, first, 0, -need, options)) return true;
            if (tryTranslateRoom(rooms, second, 0, need, options)) return true;
          }
        } else if (a.box.y > b.box.y + b.box.height) {
          const gap = a.box.y - (b.box.y + b.box.height);
          if (gap >= 1 && gap <= 3) {
            const need = 4 - gap;
            const smallerFirst = a.cells.length <= b.cells.length;
            if (smallerFirst) {
              if (tryShrinkRoomAway(rooms, first, 'top', need, options)) return true;
            } else if (tryShrinkRoomAway(rooms, second, 'bottom', need, options)) return true;
            if (tryTranslateRoom(rooms, second, 0, -need, options)) return true;
            if (tryTranslateRoom(rooms, first, 0, need, options)) return true;
          }
        }
      }
    }
  }

  return false;
}

/** Extiende las máscaras hasta las paredes de un par separado por 4 tiles. */
function ensureWideCells(rooms: RawRoom[]): boolean {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const others = new Set<string>();
      for (let index = 0; index < rooms.length; index += 1) {
        if (index === first || index === second) continue;
        for (const cell of rooms[index].cells) others.add(pointKey(cell.x, cell.y));
      }

      const overlapY =
        Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      if (overlapY > 0) {
        const left = a.box.x < b.box.x ? first : second;
        const right = left === first ? second : first;
        const leftRoom = rooms[left];
        const rightRoom = rooms[right];
        if (boxGap(leftRoom.box, rightRoom.box) === 4) {
          const targetLeft = leftRoom.box.x + leftRoom.box.width - 1;
          const targetRight = rightRoom.box.x;
          const startY = Math.max(leftRoom.box.y, rightRoom.box.y);
          const endY = Math.min(leftRoom.box.y + leftRoom.box.height, rightRoom.box.y + rightRoom.box.height) - 1;
          for (let y = startY; y <= endY; y += 1) {
            const leftRow = leftRoom.cells.filter((cell) => cell.y === y);
            const rightRow = rightRoom.cells.filter((cell) => cell.y === y);
            if (leftRow.length === 0 || rightRow.length === 0) continue;
            const maxLeft = Math.max(...leftRow.map((cell) => cell.x));
            const minRight = Math.min(...rightRow.map((cell) => cell.x));
            const additionsLeft = rangePoints(maxLeft + 1, targetLeft, y, 'x');
            const additionsRight = rangePoints(targetRight, minRight - 1, y, 'x');
            if (
              [...additionsLeft, ...additionsRight].some((cell) =>
                others.has(pointKey(cell.x, cell.y)),
              )
            ) {
              continue;
            }
            rooms[left] = {
              box: leftRoom.box,
              cells: sortPoints([...leftRoom.cells, ...additionsLeft]),
            };
            rooms[right] = {
              box: rightRoom.box,
              cells: sortPoints([...rightRoom.cells, ...additionsRight]),
            };
            return true;
          }
        }
      }

      const overlapX =
        Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
      if (overlapX > 0) {
        const top = a.box.y < b.box.y ? first : second;
        const bottom = top === first ? second : first;
        const topRoom = rooms[top];
        const bottomRoom = rooms[bottom];
        if (boxGap(topRoom.box, bottomRoom.box) === 4) {
          const targetTop = topRoom.box.y + topRoom.box.height - 1;
          const targetBottom = bottomRoom.box.y;
          const startX = Math.max(topRoom.box.x, bottomRoom.box.x);
          const endX = Math.min(topRoom.box.x + topRoom.box.width, bottomRoom.box.x + bottomRoom.box.width) - 1;
          for (let x = startX; x <= endX; x += 1) {
            const topColumn = topRoom.cells.filter((cell) => cell.x === x);
            const bottomColumn = bottomRoom.cells.filter((cell) => cell.x === x);
            if (topColumn.length === 0 || bottomColumn.length === 0) continue;
            const maxTop = Math.max(...topColumn.map((cell) => cell.y));
            const minBottom = Math.min(...bottomColumn.map((cell) => cell.y));
            const additionsTop = rangePoints(maxTop + 1, targetTop, x, 'y');
            const additionsBottom = rangePoints(targetBottom, minBottom - 1, x, 'y');
            if (
              [...additionsTop, ...additionsBottom].some((cell) =>
                others.has(pointKey(cell.x, cell.y)),
              )
            ) {
              continue;
            }
            rooms[top] = {
              box: topRoom.box,
              cells: sortPoints([...topRoom.cells, ...additionsTop]),
            };
            rooms[bottom] = {
              box: bottomRoom.box,
              cells: sortPoints([...bottomRoom.cells, ...additionsBottom]),
            };
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Si no hay pared compartida, ensancha una caja hacia su vecina para dejar un
 * único tile de muro. Después `ensureDirectDoor` alinea las máscaras.
 */
function ensureSharedWallBox(
  rooms: RawRoom[],
  options: ResolvedMapOptions,
  allowGap4 = false,
): boolean {
  const maxGap = allowGap4 ? 4 : 3;
  if (hasSharedWall(rooms)) return true;

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const overlapY =
        Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
      const overlapX =
        Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);

      if (overlapY > 0) {
        if (b.box.x > a.box.x + a.box.width) {
          const gap = b.box.x - (a.box.x + a.box.width);
          if (gap >= 2 && gap <= maxGap) {
            const sharedY = sharedCoordinate(a.cells, b.cells, 'y');
            if (expandRoomToward(rooms, first, gap - 1, 'x', options, sharedY)) return true;
          }
        } else if (a.box.x > b.box.x + b.box.width) {
          const gap = a.box.x - (b.box.x + b.box.width);
          if (gap >= 2 && gap <= maxGap) {
            const sharedY = sharedCoordinate(a.cells, b.cells, 'y');
            if (expandRoomToward(rooms, second, gap - 1, 'x', options, sharedY)) return true;
          }
        }
      }

      if (overlapX > 0) {
        if (b.box.y > a.box.y + a.box.height) {
          const gap = b.box.y - (a.box.y + a.box.height);
          if (gap >= 2 && gap <= maxGap) {
            const sharedX = sharedCoordinate(a.cells, b.cells, 'x');
            if (expandRoomToward(rooms, first, gap - 1, 'y', options, sharedX)) return true;
          }
        } else if (a.box.y > b.box.y + b.box.height) {
          const gap = a.box.y - (b.box.y + b.box.height);
          if (gap >= 2 && gap <= maxGap) {
            const sharedX = sharedCoordinate(a.cells, b.cells, 'x');
            if (expandRoomToward(rooms, second, gap - 1, 'y', options, sharedX)) return true;
          }
        }
      }
    }
  }

  return false;
}

function sharedCoordinate(
  a: readonly import('./types').Point[],
  b: readonly import('./types').Point[],
  axis: 'x' | 'y',
): number | undefined {
  const values = new Set(b.map((cell) => cell[axis]));
  for (const cell of a) {
    if (values.has(cell[axis])) return cell[axis];
  }
  return undefined;
}

function expandRoomToward(
  rooms: RawRoom[],
  index: number,
  amount: number,
  axis: 'x' | 'y',
  options: ResolvedMapOptions,
  fixed?: number,
): boolean {
  const room = rooms[index];
  const box: Box =
    axis === 'x'
      ? { ...room.box, width: room.box.width + amount }
      : { ...room.box, height: room.box.height + amount };
  if (!boxInside(box, options.mapWidth, options.mapHeight, 1)) return false;
  for (let other = 0; other < rooms.length; other += 1) {
    if (other === index) continue;
    if (boxGap(box, rooms[other].box) < 1) return false;
  }

  const additions: import('./types').Point[] = [];
  if (axis === 'x') {
    const newRight = box.x + box.width - 1;
    const rows = fixed === undefined
      ? Array.from({ length: box.height }, (_, offset) => box.y + offset)
      : [fixed];
    for (const y of rows) {
      const row = room.cells.filter((cell) => cell.y === y);
      if (row.length === 0) continue;
      const maxX = Math.max(...row.map((cell) => cell.x));
      additions.push(...rangePoints(maxX + 1, newRight, y, 'x'));
      break;
    }
  } else {
    const newBottom = box.y + box.height - 1;
    const columns = fixed === undefined
      ? Array.from({ length: box.width }, (_, offset) => box.x + offset)
      : [fixed];
    for (const x of columns) {
      const column = room.cells.filter((cell) => cell.x === x);
      if (column.length === 0) continue;
      const maxY = Math.max(...column.map((cell) => cell.y));
      additions.push(...rangePoints(maxY + 1, newBottom, x, 'y'));
      break;
    }
  }

  if (additions.length === 0) return false;
  rooms[index] = { box, cells: sortPoints([...room.cells, ...additions]) };
  return true;
}

// ---------------------------------------------------------------------------
// Conexiones
// ---------------------------------------------------------------------------

function canConnectToExisting(
  box: Box,
  cells: readonly import('./types').Point[],
  rooms: readonly RawRoom[],
  options: ResolvedMapOptions,
): boolean {
  if (rooms.length === 0) return true;
  const candidate: RawRoom = { box, cells };
  const tempRooms = [...rooms, candidate];
  const mask = new Set<string>();
  for (const room of tempRooms) {
    for (const cell of room.cells) mask.add(pointKey(cell.x, cell.y));
  }
  const index = tempRooms.length - 1;
  for (let existing = 0; existing < rooms.length; existing += 1) {
    if (findLink(existing, index, tempRooms, mask, options)) return true;
  }
  return false;
}

function roomsConnected(rooms: readonly RawRoom[], options: ResolvedMapOptions): boolean {
  if (rooms.length <= 1) return true;
  const mask = new Set<string>();
  for (const room of rooms) {
    for (const cell of room.cells) mask.add(pointKey(cell.x, cell.y));
  }
  const union = new UnionFind(rooms.length);
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (findLink(first, second, rooms, mask, options)) union.union(first, second);
    }
  }
  const root = union.find(0);
  for (let index = 1; index < rooms.length; index += 1) {
    if (union.find(index) !== root) return false;
  }
  return true;
}

function findLink(
  roomA: number,
  roomB: number,
  rooms: readonly RawRoom[],
  roomMask: ReadonlySet<string>,
  options: ResolvedMapOptions,
): Link | null {
  const a = rooms[roomA];
  const b = rooms[roomB];
  const maxDistance = options.corridorMaxLength + 2;
  let best: { link: Link; score: number } | null = null;

  for (const cellA of a.cells) {
    for (const cellB of b.cells) {
      const distance = Math.abs(cellA.x - cellB.x) + Math.abs(cellA.y - cellB.y);
      if (distance < 2 || distance > maxDistance) continue;
      const paths = [
        lPath(cellA, cellB, true),
        lPath(cellA, cellB, false),
      ];
      for (const path of paths) {
        if (!path) continue;
        if (path.some((cell) => !inBounds(cell.x, cell.y, options.mapWidth, options.mapHeight))) {
          continue;
        }
        if (
          path.some(
            (cell) =>
              cell.x <= 0 ||
              cell.y <= 0 ||
              cell.x >= options.mapWidth - 1 ||
              cell.y >= options.mapHeight - 1,
          )
        ) {
          continue;
        }
        if (path.some((cell) => roomMask.has(pointKey(cell.x, cell.y)))) continue;
        const length = Math.max(0, path.length - 1);
        if (length > options.corridorMaxLength) continue;
        const score = distance * 10 + path.length;
        if (!best || score < best.score) {
          best = {
            link: { roomA, roomB, cells: path, length },
            score,
          };
        }
      }
    }
  }

  return best?.link ?? null;
}

function lPath(
  a: import('./types').Point,
  b: import('./types').Point,
  horizontalFirst: boolean,
): import('./types').Point[] | null {
  if (a.x === b.x) {
    const cells: import('./types').Point[] = [];
    const dy = Math.sign(b.y - a.y);
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: a.x, y });
    return cells;
  }
  if (a.y === b.y) {
    const cells: import('./types').Point[] = [];
    const dx = Math.sign(b.x - a.x);
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: a.y });
    return cells;
  }

  const cells: import('./types').Point[] = [];
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  if (horizontalFirst) {
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: a.y });
    cells.push({ x: b.x, y: a.y });
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: b.x, y });
  } else {
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: a.x, y });
    cells.push({ x: a.x, y: b.y });
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: b.y });
  }
  return cells;
}

function linkKey(link: Link): string {
  return `${link.roomA}:${link.roomB}:${link.cells.map((cell) => pointKey(cell.x, cell.y)).join('|')}`;
}

function compareLinks(a: Link, b: Link, wallThickness: number): number {
  const gapScore = (link: Link): number =>
    wallThickness === 2
      ? Math.abs(link.cells.length - 2) * 10 + link.length
      : link.length;
  return (
    gapScore(a) - gapScore(b) ||
    a.roomA - b.roomA ||
    a.roomB - b.roomB ||
    (a.cells[0]?.y ?? 0) - (b.cells[0]?.y ?? 0) ||
    (a.cells[0]?.x ?? 0) - (b.cells[0]?.x ?? 0)
  );
}

function selectLinks(
  candidates: readonly Link[],
  roomCount: number,
  rng: Rng,
  wantsWide: boolean,
  wallThickness: number,
  warnings: string[],
): LinkSelection {
  const sorted = [...candidates].sort((a, b) => compareLinks(a, b, wallThickness));
  const union = new UnionFind(roomCount);
  const tree: Link[] = [];
  const used = new Set<string>();

  // Con grosor 2 se conserva una puerta directa como excepción, pero el resto
  // del árbol prefiere paredes de 2 tiles.
  if (wallThickness === 2) {
    const direct = sorted.find((link) => link.length === 0);
    if (direct) {
      union.union(direct.roomA, direct.roomB);
      tree.push(direct);
      used.add(linkKey(direct));
    }
    if (!sorted.some((link) => link.cells.length >= 2)) {
      warnings.push('No hubo enlaces con 2 tiles de muro; se usaron los disponibles.');
    }
  }

  for (const link of sorted) {
    if (used.has(linkKey(link))) continue;
    if (union.union(link.roomA, link.roomB)) {
      tree.push(link);
      used.add(linkKey(link));
    }
  }

  if (tree.length < roomCount - 1) {
    warnings.push('El grafo de salas no quedó conexo con enlaces cortos.');
  }

  const available = sorted.filter((link) => !used.has(linkKey(link)));
  const loopBudget = Math.min(3, rng.int(4));
  const extras: Link[] = [];
  for (const link of available) {
    if (extras.length >= loopBudget) break;
    if (tree.some((treeLink) => sameRooms(treeLink, link))) continue;
    extras.push(link);
    used.add(linkKey(link));
  }

  let wide: Link | null = null;
  if (wantsWide) {
    const treeWide = tree.find((link) => link.length >= 3);
    if (treeWide) {
      wide = treeWide;
    } else {
      const candidate = available.find(
        (link) =>
          link.length >= 3 &&
          !used.has(linkKey(link)) &&
          !tree.some((treeLink) => sameRooms(treeLink, link)) &&
          !extras.some((extra) => sameRooms(extra, link)),
      );
      if (candidate) {
        if (extras.length < 3) {
          extras.push(candidate);
        } else {
          const replaceIndex = extras.findIndex((link) => link.length < 3);
          if (replaceIndex >= 0) extras.splice(replaceIndex, 1, candidate);
        }
        wide = candidate;
        used.add(linkKey(candidate));
      } else {
        warnings.push('No hubo un par de salas para abrir el pasillo ancho.');
      }
    }
  }

  if (![...tree, ...extras].some((link) => link.length === 0)) {
    const direct = available.find(
      (link) => link.length === 0 && !used.has(linkKey(link)),
    );
    if (direct) {
      if (extras.length < 3) {
        extras.push(direct);
      } else {
        const replaceIndex = extras.findIndex((link) => link !== wide);
        if (replaceIndex >= 0) extras.splice(replaceIndex, 1, direct);
      }
      used.add(linkKey(direct));
    } else if (!hasSharedWallRaw(candidates)) {
      warnings.push('No se encontró una puerta directa entre salas.');
    }
  }

  return { links: tree, extras, wide };
}

function sameRooms(a: Link, b: Link): boolean {
  return (
    (a.roomA === b.roomA && a.roomB === b.roomB) ||
    (a.roomA === b.roomB && a.roomB === b.roomA)
  );
}

function hasSharedWallRaw(links: readonly Link[]): boolean {
  return links.some((link) => link.length === 0);
}

function findWideDetour(
  rooms: readonly RawRoom[],
  roomMask: ReadonlySet<string>,
  options: ResolvedMapOptions,
): Link | null {
  const wallCell = (x: number, y: number): boolean =>
    x > 0 &&
    y > 0 &&
    x < options.mapWidth - 1 &&
    y < options.mapHeight - 1 &&
    !roomMask.has(pointKey(x, y));

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const starts = new Set<string>();
      const goals = new Set<string>();
      for (const cell of rooms[first].cells) {
        for (const next of neighbors4(cell.x, cell.y)) {
          if (wallCell(next.x, next.y)) starts.add(pointKey(next.x, next.y));
        }
      }
      for (const cell of rooms[second].cells) {
        for (const next of neighbors4(cell.x, cell.y)) {
          if (wallCell(next.x, next.y)) goals.add(pointKey(next.x, next.y));
        }
      }
      if (starts.size === 0 || goals.size === 0) continue;

      const queue: import('./types').Point[][] = [...starts].map((key) => {
        const [x, y] = key.split(',').map(Number);
        return [{ x, y }];
      });
      for (let cursor = 0; cursor < queue.length && cursor < 40_000; cursor += 1) {
        const path = queue[cursor];
        if (path.length === 3) {
          const last = path[path.length - 1];
          if (goals.has(pointKey(last.x, last.y))) {
            return { roomA: first, roomB: second, cells: path, length: 3 };
          }
          continue;
        }
        const last = path[path.length - 1];
        for (const next of neighbors4(last.x, last.y)) {
          if (!wallCell(next.x, next.y)) continue;
          if (path.some((cell) => cell.x === next.x && cell.y === next.y)) continue;
          queue.push([...path, next]);
        }
      }
    }
  }
  return null;
}

function widenLink(
  link: Link,
  options: ResolvedMapOptions,
  roomMask: ReadonlySet<string>,
): import('./types').Point[] {
  const set = new Set(link.cells.map((cell) => pointKey(cell.x, cell.y)));
  for (const cell of link.cells) {
    const horizontal =
      set.has(pointKey(cell.x - 1, cell.y)) || set.has(pointKey(cell.x + 1, cell.y));
    const vertical =
      set.has(pointKey(cell.x, cell.y - 1)) || set.has(pointKey(cell.x, cell.y + 1));
    const attempts = horizontal && vertical
      ? [
          { x: cell.x - 1, y: cell.y },
          { x: cell.x + 1, y: cell.y },
          { x: cell.x, y: cell.y - 1 },
          { x: cell.x, y: cell.y + 1 },
        ]
      : horizontal
        ? [
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y + 1 },
          ]
        : [
            { x: cell.x - 1, y: cell.y },
            { x: cell.x + 1, y: cell.y },
          ];
    for (const next of attempts) {
      if (next.x <= 0 || next.y <= 0) continue;
      if (next.x >= options.mapWidth - 1 || next.y >= options.mapHeight - 1) continue;
      const key = pointKey(next.x, next.y);
      if (roomMask.has(key)) continue;
      set.add(key);
    }
  }
  return maskToPoints(set);
}

// ---------------------------------------------------------------------------
// Finalizador
// ---------------------------------------------------------------------------

function finalizeMap(
  variant: VariantId,
  seed: number,
  rng: Rng,
  options: ResolvedMapOptions,
  rawRooms: RawRoom[],
  counter: Counter,
  wantsCavern: boolean,
  wantsWide: boolean,
  warnings: string[],
): GeneratedMap {
  const ordered = [...rawRooms].sort(
    (a, b) => a.box.y - b.box.y || a.box.x - b.box.x,
  );

  const roomMask = new Set<string>();
  for (const room of ordered) {
    for (const cell of room.cells) roomMask.add(pointKey(cell.x, cell.y));
  }

  const candidates: Link[] = [];
  for (let first = 0; first < ordered.length; first += 1) {
    for (let second = first + 1; second < ordered.length; second += 1) {
      const link = findLink(first, second, ordered, roomMask, options);
      if (link) candidates.push(link);
    }
  }

  if (wantsWide && !candidates.some((link) => link.length >= 3)) {
    const detour = findWideDetour(ordered, roomMask, options);
    if (detour) candidates.push(detour);
  }

  const selection = selectLinks(
    candidates,
    ordered.length,
    rng,
    wantsWide,
    options.wallThickness,
    warnings,
  );
  const allLinks = [...selection.links, ...selection.extras];
  const wideKey = selection.wide ? linkKey(selection.wide) : null;

  const tiles = new Array<Tile>(options.mapWidth * options.mapHeight).fill(0);
  for (const room of ordered) {
    for (const cell of room.cells) {
      tiles[cell.y * options.mapWidth + cell.x] = 1;
    }
  }

  const doors: Door[] = [];
  const corridors: Corridor[] = [];
  let nextDoorId = 0;

  for (const link of allLinks) {
    const isWide = wideKey !== null && linkKey(link) === wideKey;
    const roomA = ordered[link.roomA];
    const roomB = ordered[link.roomB];
    const direction =
      Math.abs(roomA.box.x - roomB.box.x) >= Math.abs(roomA.box.y - roomB.box.y)
        ? 'vertical'
        : 'horizontal';
    const orientation: DoorOrientation = direction;

    if (isWide) {
      const widened = widenLink(link, options, roomMask);
      for (const cell of widened) {
        if (inBounds(cell.x, cell.y, options.mapWidth, options.mapHeight)) {
          tiles[cell.y * options.mapWidth + cell.x] = 1;
        }
      }
      corridors.push({
        id: corridors.length,
        cells: widened,
        kind: 'wide',
        length: link.length,
        doors: [],
        roomA: link.roomA,
        roomB: link.roomB,
        width: 2,
      });
      continue;
    }

    const corridorCells = link.cells;
    for (const cell of corridorCells) {
      tiles[cell.y * options.mapWidth + cell.x] = 1;
    }

    const doorCells =
      link.length === 0
        ? [link.cells[0]]
        : [link.cells[0], link.cells[link.cells.length - 1]];
    const doorIds: number[] = [];
    for (const doorCell of doorCells) {
      if (!doorCell) continue;
      const style = doorStyleFor(seed, link.roomA, link.roomB, doorCell.x, doorCell.y);
      const door: Door = {
        id: nextDoorId,
        x: doorCell.x,
        y: doorCell.y,
        orientation,
        style,
        roomA: link.roomA,
        roomB: link.roomB,
        direct: link.length === 0,
        corridorId: corridors.length,
      };
      doors.push(door);
      doorIds.push(door.id);
      nextDoorId += 1;
    }

    const kind: CorridorKind = link.length === 0 ? 'door' : 'short';
    corridors.push({
      id: corridors.length,
      cells: corridorCells,
      kind,
      length: link.length,
      doors: doorIds,
      roomA: link.roomA,
      roomB: link.roomB,
      width: 1,
    });
  }

  // La puerta directa comparte hueco entre dos salas; el resto de puertas son
  // accesos de pasillo y se cuentan en su sala correspondiente.
  const palettes: {
    roomId: number;
    ambient: FloorAmbient;
    palette: FloorPaletteId;
    base: string;
    second: string;
  }[] = [];

  const cavernIndex = wantsCavern
    ? ordered.reduce(
        (best, room, index) =>
          room.cells.length > ordered[best].cells.length ? index : best,
        0,
      )
    : -1;

  const rawRoomObjects: Room[] = ordered.map((room, index) => {
    const ambient = AMBIENT_ORDER[(index + (seed % AMBIENT_ORDER.length)) % AMBIENT_ORDER.length];
    const palette = AMBIENT_PALETTE[ambient];
    const colors = FLOOR_PALETTES[palette];
    palettes.push({
      roomId: index,
      ambient,
      palette,
      base: colors.base,
      second: colors.second,
    });
    const accesses = accessesFor(index, doors, corridors);
    const doorIds = doors.filter((door) => door.roomA === index || door.roomB === index).map((door) => door.id);
    const shape = shapeStats(room.cells, room.box);
    const sizeRole: SizeRole = index === cavernIndex ? 'cavern' : sizeRoleFor(room.box, room.cells.length);
    return {
      id: index,
      x: room.box.x,
      y: room.box.y,
      width: room.box.width,
      height: room.box.height,
      cells: room.cells,
      role: sizeRole,
      sizeRole,
      area: room.cells.length,
      boxArea: boxArea(room.box),
      notches: shape.notches,
      alcoves: shape.alcoves,
      accesses,
      doorIds,
      ambient,
      palette,
    };
  });

  const spawnResult = placeSpawns({
    rooms: rawRoomObjects,
    doors,
    corridors,
    tiles,
    width: options.mapWidth,
    height: options.mapHeight,
    minTiles: options.spawnMinTiles,
    seed,
  });
  warnings.push(...spawnResult.warnings);

  const rooms = rawRoomObjects.map((room) =>
    room.id === spawnResult.spawns.roomId
      ? { ...room, role: 'spawn' as const, sizeRole: room.sizeRole }
      : room,
  );

  const enemyResult = placeEnemies({
    rooms,
    doors,
    tiles,
    width: options.mapWidth,
    height: options.mapHeight,
    spawns: spawnResult.spawns,
    seed,
    emptyRoomChance: 0.3,
  });
  warnings.push(...enemyResult.warnings);

  const refined = refineSpawnHoles({
    rooms,
    doors,
    tiles,
    width: options.mapWidth,
    height: options.mapHeight,
    spawns: spawnResult.spawns,
    enemies: enemyResult.enemies,
    minTiles: options.spawnMinTiles,
  });
  warnings.push(...refined.warnings);
  const finalSpawns = refined.spawns;

  if (
    enemyResult.enemies.some((enemy) =>
      finalSpawns.party.some((hole) =>
        hasLineOfSight(tiles, options.mapWidth, options.mapHeight, enemy, hole),
      ),
    )
  ) {
    warnings.push('Algún enemigo conserva línea de visión a un hueco de spawn.');
  }

  const stats = buildStats({
    rooms,
    doors,
    corridors,
    tiles,
    loops: selection.extras.length,
    counter,
    enemies: enemyResult.enemies,
    spawns: finalSpawns,
    doorsForSpawn: doors,
  });

  return {
    seed,
    variant,
    width: options.mapWidth,
    height: options.mapHeight,
    tiles,
    rooms,
    doors,
    corridors,
    loops: selection.extras.length,
    spawns: finalSpawns,
    enemies: enemyResult.enemies,
    palettes,
    warnings,
    stats,
    options,
  };
}

function accessesFor(roomId: number, doors: readonly Door[], corridors: readonly Corridor[]): number {
  let accesses = doors.filter((door) => door.roomA === roomId || door.roomB === roomId).length;
  for (const corridor of corridors) {
    if (corridor.kind === 'wide' && (corridor.roomA === roomId || corridor.roomB === roomId)) {
      // Una boca ancha ocupa dos tiles: pesa como dos accesos al elegir refugio.
      accesses += 2;
    }
  }
  return accesses;
}

function sizeRoleFor(box: Box, area: number): SizeRole {
  if ((box.width >= 7 && box.height >= 7) || area >= 50) return 'large';
  if ((box.width <= 4 && box.height <= 4) || area <= 19) return 'small';
  return 'medium';
}

function shapeStats(cells: readonly import('./types').Point[], box: Box): { notches: number; alcoves: number } {
  const mask = pointsToMask(cells);
  let notches = 0;
  let alcoves = 0;
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      if (mask.has(pointKey(x, y))) continue;
      let inside = 0;
      for (const next of neighbors4(x, y)) {
        if (mask.has(pointKey(next.x, next.y))) inside += 1;
      }
      if (inside > 0) notches += 1;
      if (inside >= 3) alcoves += 1;
    }
  }
  return { notches, alcoves };
}

function doorStyleFor(
  seed: number,
  roomA: number,
  roomB: number,
  x: number,
  y: number,
): DoorStyle {
  const hash = hashSeed(seed ^ Math.imul(roomA + 1, 0x9e3779b9) ^ Math.imul(roomB + 7, 0x85ebca6b), x * 31 + y * 17);
  return DOOR_STYLES[hash % DOOR_STYLES.length];
}

function buildStats(input: {
  rooms: readonly Room[];
  doors: readonly Door[];
  corridors: readonly Corridor[];
  tiles: readonly Tile[];
  loops: number;
  counter: Counter;
  enemies: readonly Enemy[];
  spawns: Spawns;
  doorsForSpawn: readonly Door[];
}): MapStats {
  const { rooms, doors, corridors, tiles, loops, counter, enemies, spawns } = input;
  const roomFloor = rooms.reduce((sum, room) => sum + room.area, 0);
  const totalFloor = tiles.reduce<number>((sum, tile) => sum + (tile === 1 ? 1 : 0), 0);
  const corridorFloor = Math.max(0, totalFloor - roomFloor);
  const lengths: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const corridor of corridors) {
    if (corridor.kind !== 'wide') lengths[corridor.length as 0 | 1 | 2 | 3] += 1;
  }
  const wide = corridors.filter((corridor) => corridor.kind === 'wide');
  const cavernRoom = rooms.find((room) => room.sizeRole === 'cavern');
  const cavernArea = cavernRoom?.area ?? 0;
  const occupied = new Set(enemies.map((enemy) => enemy.roomId));
  const spawnRoom = rooms.find((room) => room.id === spawns.roomId);
  const maxEnemies = Math.max(0, ...rooms.map((room) => enemies.filter((enemy) => enemy.roomId === room.id).length));

  return {
    roomCount: rooms.length,
    largeRooms: rooms.filter((room) => room.sizeRole === 'large').length,
    mediumRooms: rooms.filter((room) => room.sizeRole === 'medium').length,
    smallRooms: rooms.filter((room) => room.sizeRole === 'small').length,
    cavernRooms: rooms.filter((room) => room.sizeRole === 'cavern').length,
    totalFloor,
    roomFloor,
    corridorFloor,
    averageAreaRatio:
      rooms.length === 0
        ? 0
        : Number((rooms.reduce((sum, room) => sum + room.area / room.boxArea, 0) / rooms.length).toFixed(3)),
    notchCount: rooms.reduce((sum, room) => sum + room.notches, 0),
    alcoveCount: rooms.reduce((sum, room) => sum + room.alcoves, 0),
    sharedWalls: countSharedWalls(rooms),
    doorCount: doors.length,
    directDoors: doors.filter((door) => door.direct).length,
    corridorCount: corridors.length,
    corridorLengths: lengths,
    loops,
    wideCount: wide.length,
    wideLength: wide.reduce((sum, corridor) => sum + corridor.length, 0),
    cavernArea,
    cavernShare: roomFloor === 0 ? 0 : Number((cavernArea / roomFloor).toFixed(3)),
    spawnHoles: spawns.party.length,
    spawnAccesses: spawnRoom?.accesses ?? 0,
    enemyCount: enemies.length,
    emptyRooms: rooms.filter((room) => room.id !== spawns.roomId && !occupied.has(room.id)).length,
    maxEnemiesPerRoom: maxEnemies,
    generationAttempts: counter.value,
  };
}

function countSharedWalls(rooms: readonly Room[]): number {
  let count = 0;
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const a = rooms[first];
      const b = rooms[second];
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if ((gapX === 1 || gapX === 2) && overlapY >= 2) count += 1;
      if ((gapY === 1 || gapY === 2) && overlapX >= 2) count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// API de validación compartida por tests y página
// ---------------------------------------------------------------------------

export function roomAtCell(map: GeneratedMap, x: number, y: number): Room | null {
  for (const room of map.rooms) {
    if (room.cells.some((cell) => cell.x === x && cell.y === y)) return room;
  }
  return null;
}

export function connectivityPercentage(map: GeneratedMap): number {
  const floorCount = map.tiles.reduce<number>((sum, tile) => sum + (tile === 1 ? 1 : 0), 0);
  if (floorCount === 0) return 0;
  const start = map.spawns.player;
  const seen = new Set<string>([pointKey(start.x, start.y)]);
  const queue: import('./types').Point[] = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of neighbors4(current.x, current.y)) {
      if (!inBounds(next.x, next.y, map.width, map.height)) continue;
      const key = pointKey(next.x, next.y);
      if (seen.has(key)) continue;
      if (map.tiles[next.y * map.width + next.x] !== 1) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return (seen.size / floorCount) * 100;
}

export function validateMap(map: GeneratedMap): string[] {
  const issues: string[] = [];

  if (map.tiles.length !== map.width * map.height) issues.push('tiles no coincide con width×height');

  for (let x = 0; x < map.width; x += 1) {
    if (map.tiles[x] === 1) issues.push(`borde superior con suelo en x=${x}`);
    if (map.tiles[(map.height - 1) * map.width + x] === 1) issues.push(`borde inferior con suelo en x=${x}`);
  }
  for (let y = 0; y < map.height; y += 1) {
    if (map.tiles[y * map.width] === 1) issues.push(`borde izquierdo con suelo en y=${y}`);
    if (map.tiles[y * map.width + map.width - 1] === 1) issues.push(`borde derecho con suelo en y=${y}`);
  }

  if (connectivityPercentage(map) < 99.999) issues.push('el suelo no es conexo');

  for (const room of map.rooms) {
    if (!maskIsConnected(room.cells)) issues.push(`la sala ${room.id} no es conexa`);
    if (room.cells.some((cell) => room.x > cell.x || room.y > cell.y || cell.x >= room.x + room.width || cell.y >= room.y + room.height)) {
      issues.push(`la sala ${room.id} tiene celdas fuera de su caja`);
    }
  }

  for (let first = 0; first < map.rooms.length; first += 1) {
    for (let second = first + 1; second < map.rooms.length; second += 1) {
      const a = map.rooms[first];
      const b = map.rooms[second];
      if (boxesOverlap(a, b)) issues.push(`las salas ${a.id} y ${b.id} se solapan`);
      const aMask = pointsToMask(a.cells);
      if (b.cells.some((cell) => aMask.has(pointKey(cell.x, cell.y)))) {
        issues.push(`las salas ${a.id} y ${b.id} comparten suelo`);
      }
    }
  }

  for (const corridor of map.corridors) {
    if (corridor.length < 0 || corridor.length > 3) issues.push(`pasillo ${corridor.id} con longitud ${corridor.length}`);
    if (corridor.kind === 'wide') {
      if (corridor.length < 3) issues.push(`pasillo ancho ${corridor.id} demasiado corto`);
      if (corridor.doors.length > 0) issues.push(`pasillo ancho ${corridor.id} con puertas`);
    }
  }

  if (map.loops < 0 || map.loops > 3) issues.push(`bucles fuera de rango: ${map.loops}`);

  const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
  if (!spawnRoom) issues.push('la sala de spawn no existe');
  if (map.spawns.party.length < map.options.spawnMinTiles) {
    issues.push(`menos de ${map.options.spawnMinTiles} huecos de spawn`);
  }
  if (new Set(map.spawns.party.map((point) => pointKey(point.x, point.y))).size !== map.spawns.party.length) {
    issues.push('hay huecos de spawn repetidos');
  }
  for (const hole of map.spawns.party) {
    if (map.tiles[hole.y * map.width + hole.x] !== 1) issues.push(`hueco de spawn en muro (${hole.x},${hole.y})`);
    if (map.doors.some((door) => door.x === hole.x && door.y === hole.y)) {
      issues.push(`hueco de spawn sobre puerta (${hole.x},${hole.y})`);
    }
    if (map.enemies.some((enemy) => enemy.x === hole.x && enemy.y === hole.y)) {
      issues.push(`hueco de spawn ocupado por enemigo (${hole.x},${hole.y})`);
    }
  }

  return issues;
}

export function fingerprint(map: GeneratedMap): string {
  let hash = hashSeed(map.seed, 0x811c9dc5);
  for (const tile of map.tiles) {
    hash = Math.imul(hash ^ tile, 0x01000193) >>> 0;
  }
  for (const room of map.rooms) {
    hash = Math.imul(hash ^ room.id ^ room.area, 0x27d4eb2f) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Reexporta la regla de muro para que los tests no importen Canvas. */
export { wallTileKind };
export type { Box };
