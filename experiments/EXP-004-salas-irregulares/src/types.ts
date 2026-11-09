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
  readonly directDoors: number;
  readonly corridorCount: number;
  readonly corridorLengths: CorridorLengthCounts;
  readonly loops: number;
  readonly wideCount: number;
  readonly wideLength: number;
  readonly cavernArea: number;
  readonly cavernShare: number;
  readonly spawnHoles: number;
  readonly spawnAccesses: number;
  readonly enemyCount: number;
  readonly emptyRooms: number;
  readonly maxEnemiesPerRoom: number;
  readonly generationAttempts: number;
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
}

export interface GeneratedMap {
  readonly seed: number;
  readonly variant: VariantId;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly corridors: readonly Corridor[];
  /** Conexiones extra sobre el árbol de salas (0-3). */
  readonly loops: number;
  readonly spawns: Spawns;
  readonly enemies: readonly Enemy[];
  readonly palettes: readonly RoomPalette[];
  readonly warnings: readonly string[];
  readonly stats: MapStats;
  readonly options: ResolvedMapOptions;
}
