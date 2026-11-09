/**
 * Contrato común del experimento EXP-004.
 *
 * Todo es serializable con `JSON.parse(JSON.stringify(...))`: no hay clases,
 * funciones ni referencias compartidas. Las tres variantes devuelven la misma
 * forma para que la página, el render, las métricas y los tests puedan comparar.
 */

export type VariantId = 'growth' | 'bsp' | 'templates';

/** 0 = muro, 1 = suelo. */
export type Tile = 0 | 1;

export type RoomRole = 'large' | 'medium' | 'small' | 'cavern' | 'spawn';

export type SizeRole = Exclude<RoomRole, 'spawn'>;

export type DoorStyle = 'wood' | 'metal' | 'grated';

export type DoorOrientation = 'horizontal' | 'vertical';

export type CorridorKind = 'door' | 'short' | 'wide';

export type EnemyType = 'sentinel' | 'brute' | 'coward';

/** Representación de la salida de nivel de REQ-013. */
export type ExitKind = 'door' | 'stairs-down' | 'stairs-up';

export type ExitMode = ExitKind | 'random';

/** Tile lógico que dibuja el render; las escaleras usan el recorte del tileset. */
export type ExitTile = 'exit-door' | 'staircase-down' | 'staircase-up';

export type HotspotReason = 'rincon' | 'sin-LOS' | 'ambos';

/** Motivo por el que un acceso no puede dibujarse como puerta válida. */
export type OpenMouthReason =
  | 'sin-soporte'
  | 'sin-suelo'
  | 'misma-sala'
  | 'separacion'
  | 'una-por-pasillo'
  | 'pasillo-ancho';

export type FloorAmbient = 'humid' | 'death' | 'ruin' | 'vegetation' | 'mixed';

export type FloorPaletteId = 'neutral' | 'humid' | 'death' | 'ruin' | 'vegetation';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Room {
  readonly id: number;
  /** Caja de límites; las celdas de suelo viven en `cells`. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Máscara de suelo, ordenada por `y` y luego `x`. */
  readonly cells: readonly Point[];
  /** Rol funcional: la sala de spawn se marca `spawn`. */
  readonly role: RoomRole;
  /** Rol por tamaño, independiente de que la sala sea el spawn. */
  readonly sizeRole: SizeRole;
  readonly area: number;
  readonly boxArea: number;
  /** Celdas de la caja que faltan y tocan la máscara. */
  readonly notches: number;
  /** Celdas de la caja que faltan y quedan rodeadas por la máscara. */
  readonly alcoves: number;
  /** Puertas más bocas de pasillo ancho. */
  readonly accesses: number;
  readonly doorIds: readonly number[];
  readonly ambient: FloorAmbient;
  readonly palette: FloorPaletteId;
}

export interface Door {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly style: DoorStyle;
  readonly roomA: number;
  readonly roomB: number;
  /** `true` si el hueco es directo, con 0 tiles de pasillo entre salas. */
  readonly direct: boolean;
  readonly corridorId: number;
}

export interface Corridor {
  readonly id: number;
  /** Tiles tallados entre las dos salas, incluidas las puertas de acceso. */
  readonly cells: readonly Point[];
  readonly kind: CorridorKind;
  /** 0-3; solo `wide` usa longitudes ≥3 y no lleva puertas. */
  readonly length: number;
  readonly doors: readonly number[];
  readonly roomA: number;
  readonly roomB: number;
  readonly width: 1 | 2;
}

/** Acceso abierto sin puerta válida, con el motivo para métricas y debug. */
export interface OpenMouth {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly roomA: number;
  readonly roomB: number;
  readonly corridorId: number;
  readonly reason: OpenMouthReason;
}

export interface Spawns {
  readonly roomId: number;
  /** Seis huecos distintos, fuera de puertas y de fichas. */
  readonly party: readonly Point[];
  /** Alias de `party[0]`, como en el motor actual. */
  readonly player: Point;
}

export interface Enemy {
  readonly id: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
  readonly roomId: number;
  readonly home: Point;
  /** Emboscado en un punto caliente (REQ-012 R-015). */
  readonly hidden: boolean;
  /** Celda interior: sus 4 vecinos ortogonales son suelo de la misma sala. */
  readonly interior: boolean;
}

/** Entrada de nivel: el acceso de spawn (REQ-013 R-001). */
export interface Entrance {
  readonly roomId: number;
  readonly position: Point;
}

/** Salida única de nivel (REQ-013 R-001–R-004). */
export interface Exit {
  readonly roomId: number;
  readonly kind: ExitKind;
  readonly position: Point;
  readonly access: Point;
  readonly tile: ExitTile;
  /** Distancia de grafo desde la sala de spawn. */
  readonly distance: number;
  /** Camino de salas desde spawn hasta la salida. */
  readonly path: readonly number[];
  /** `true` si `door` cayó a escalera por falta de sala de borde. */
  readonly fallback: boolean;
}

/** Punto caliente candidato para emboscada, con su tirada determinista. */
export interface Hotspot {
  readonly x: number;
  readonly y: number;
  readonly roomId: number;
  readonly reason: HotspotReason;
  /** Tirada independiente en [0,1). */
  readonly roll: number;
  /** Elegible para colocar una ficha (sin exclusión ni LOS al spawn). */
  readonly eligible: boolean;
  readonly occupied: boolean;
}

export interface RoomPalette {
  readonly roomId: number;
  readonly ambient: FloorAmbient;
  readonly palette: FloorPaletteId;
  readonly base: string;
  readonly second: string;
}

export interface CorridorLengthCounts {
  readonly 0: number;
  readonly 1: number;
  readonly 2: number;
  readonly 3: number;
}

/** Desglose serializable del presupuesto de enemigos de REQ-012 R-006/R-007/R-008. */
export interface EnemyBreakdown {
  /** N: tiles de suelo de las salas, sin pasillos. */
  readonly surfaceN: number;
  /** P: jugadores configurados (1-6). */
  readonly playersP: number;
  readonly surfaceFactor: number;
  readonly playersFactor: number;
  readonly surfaceTerm: number;
  readonly playersTerm: number;
  /** T = ceil(surfaceFactor × N) + ceil(playersFactor × P). */
  readonly total: number;
  /** Fichas que caben con separación ≥2; puede ser menor que `total`. */
  readonly planned: number;
  /** Presupuesto por sala, indexado por `roomId`. */
  readonly perRoom: readonly number[];
  /** Fichas realmente colocadas por sala, indexado por `roomId`. */
  readonly placedPerRoom: readonly number[];
  readonly sentinels: number;
  readonly brutes: number;
  readonly cowards: number;
  /** Fichas en celdas interiores (incluye emboscadas interiores). */
  readonly interior: number;
  /** Fichas en el borde de su sala. */
  readonly border: number;
  readonly hidden: number;
  readonly hotspotsTotal: number;
  readonly hotspotsEligible: number;
  readonly hotspotRolls: number;
  readonly hotspotsOccupied: number;
  /** Componente máxima de adyacencia de 8 direcciones entre fichas. */
  readonly componentsMax: number;
}

export interface MapStats {
  readonly roomCount: number;
  readonly largeRooms: number;
  readonly mediumRooms: number;
  readonly smallRooms: number;
  readonly cavernRooms: number;
  readonly totalFloor: number;
  readonly roomFloor: number;
  readonly corridorFloor: number;
  readonly averageAreaRatio: number;
  readonly notchCount: number;
  readonly alcoveCount: number;
  readonly sharedWalls: number;
  readonly doorCount: number;
  readonly validDoors: number;
  readonly directDoors: number;
  readonly openMouths: number;
  readonly doorMinDistance: number | null;
  readonly corridorCount: number;
  readonly corridorLengths: CorridorLengthCounts;
  readonly loops: number;
  readonly wideCount: number;
  readonly wideLength: number;
  readonly cavernArea: number;
  readonly cavernShare: number;
  readonly spawnHoles: number;
  readonly spawnAccesses: number;
  readonly spawnAccess: Point | null;
  readonly spawnHoleMaxDistance: number;
  readonly enemyCount: number;
  readonly emptyRooms: number;
  readonly maxEnemiesPerRoom: number;
  readonly generationAttempts: number;
  readonly enemy: EnemyBreakdown;
  /** La sala de spawn coincide con la de mayor área. */
  readonly spawnIsLargest: boolean;
  /** Componente máxima de adyacencia de 8 direcciones del grupo. */
  readonly spawnComponentsMax: number;
  readonly entranceRoomId: number;
  readonly exitRoomId: number | null;
  readonly exitKind: ExitKind | null;
  readonly exitDistance: number | null;
  readonly exitPath: readonly number[];
  readonly exitFallback: boolean;
  readonly enemyComponentsMax: number;
  readonly interiorEnemies: number;
  readonly borderEnemies: number;
  readonly hiddenEnemies: number;
  readonly hotspotsTotal: number;
  readonly hotspotsEligible: number;
  readonly hotspotRolls: number;
  readonly hotspotOccupied: number;
}

export interface ResolvedMapOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly roomCount: number;
  readonly roomMin: number;
  readonly roomMax: number;
  readonly corridorMaxLength: number;
  readonly wideCorridorChance: number;
  readonly wallThickness: number;
  readonly megaRoomChance: number;
  readonly spawnMinTiles: number;
  readonly enemySurfaceFactor: number;
  readonly enemyPlayersFactor: number;
  readonly numPlayers: number;
  readonly hiddenEnemyChance: number;
  readonly exitMode: ExitMode;
}

export interface MapOptions {
  readonly mapWidth?: number;
  readonly mapHeight?: number;
  readonly roomCount?: number;
  readonly roomMin?: number;
  readonly roomMax?: number;
  readonly corridorMaxLength?: number;
  readonly wideCorridorChance?: number;
  readonly wallThickness?: number;
  readonly megaRoomChance?: number;
  readonly spawnMinTiles?: number;
  readonly enemySurfaceFactor?: number;
  readonly enemyPlayersFactor?: number;
  readonly numPlayers?: number;
  readonly hiddenEnemyChance?: number;
  readonly exitMode?: ExitMode | string;
}

export interface GeneratedMap {
  readonly seed: number;
  readonly variant: VariantId;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly corridors: readonly Corridor[];
  /** Conexiones extra sobre el árbol de salas (0-3). */
  readonly loops: number;
  readonly spawns: Spawns;
  readonly entrance: Entrance;
  /** `null` solo si no existe ninguna sala no-spawn alcanzable (aviso). */
  readonly exit: Exit | null;
  readonly enemies: readonly Enemy[];
  /** Puntos calientes evaluados por la colocación de enemigos. */
  readonly hotspots: readonly Hotspot[];
  readonly palettes: readonly RoomPalette[];
  readonly warnings: readonly string[];
  readonly stats: MapStats;
  readonly options: ResolvedMapOptions;
}
