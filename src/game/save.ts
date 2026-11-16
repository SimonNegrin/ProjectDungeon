/**
 * Esquema de guardado v1 (REQ-024 T-001/T-002/T-004/T-005, REQ-034 T-010).
 *
 * Construye `partida.json` y `manifiesto.json` desde el estado del motor y los
 * valida de forma estricta antes de devolver un estado. Es puro: no conoce el
 * host, el DOM, la red ni relojes; `game_version` y `created_at` entran por
 * parámetro.
 *
 * La v1 se fija con el modelo actual de `Container` (`kind`/`corpseOf`
 * opcionales). `lootable` viaja en cada instancia y no se recalcula al cargar.
 * No hay allocator de ids: los ids existentes de mapa, unidades, instancias y
 * contenedores son la única fuente y viajan en el archivo.
 *
 * Validación estricta: claves desconocidas, tipos erróneos, `null` inesperado,
 * números no finitos, índices fuera de rango y referencias rotas se rechazan.
 * No se usa `eval`, `Function` ni un reviver ejecutable.
 */

import { BESTIARY } from './bestiary';
import type { Hotspot } from './chambers/core/enemies';
import type { OpenMouth } from './chambers/core/doors';
import { MAX_PLAYERS, MIN_PLAYERS, validateGameConfig, type PlayerVariant } from './config';
import { EQUIPMENT_SLOTS, ITEMS } from './equipment';
import type {
  Container,
  EquipmentSlots,
  GroundItem,
  Inventory,
  ItemInstance,
} from './inventory';
import { manaMaxFor } from './mana';
import type {
  Corridor,
  Door,
  Entrance,
  Exit,
  GeneratedMap,
  MapEnemy,
  MapWeapon,
  ResolvedMapOptions,
  Room,
  Spawns,
} from './map';
import { ROSTER, type ArchetypeId } from './roster';
import type {
  Actions,
  Awareness,
  DamageType,
  Faction,
  GameState,
  GameStatus,
  Grid,
  Mana,
  Phase,
  Position,
  ResistanceBand,
  ResistanceProfile,
  RngState,
  Tile,
  Unit,
  UnitStats,
} from './types';

export const SAVE_FORMAT_VERSION = 1 as const;

export interface SaveBuildInput {
  /** Versión del juego; informativa y no bloquea la carga. */
  readonly gameVersion: string;
  /** Fecha ISO UTC terminada en `Z`. */
  readonly createdAt: string;
}

export interface SaveFiles {
  readonly manifest: string;
  readonly save: string;
}

export interface SaveFileInputs {
  readonly manifest?: string | null;
  readonly save?: string | null;
}

export interface SaveManifestPartyEntry {
  readonly name: string;
  readonly archetype: ArchetypeId;
}

export interface SaveManifestSummary {
  readonly players: readonly SaveManifestPartyEntry[];
  readonly turn: number;
  readonly round: number;
  readonly phase: Phase;
}

export interface SaveManifest {
  readonly format_version: 1;
  readonly game_version: string;
  readonly created_at: string;
  readonly seed: number;
  readonly summary: SaveManifestSummary;
}

export type SaveErrorCode =
  | 'manifest-missing'
  | 'manifest-json'
  | 'manifest-version'
  | 'manifest-invalid'
  | 'save-missing'
  | 'save-json'
  | 'save-version'
  | 'save-invalid';

export interface SaveError {
  readonly code: SaveErrorCode;
  readonly message: string;
  readonly path: string;
}

export type SaveResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SaveError };

export type SaveBuildErrorCode =
  | 'missing-map'
  | 'missing-config'
  | 'invalid-config'
  | 'invalid-state'
  | 'invalid-created-at'
  | 'invalid-game-version';

/** Error de construcción: el estado o los argumentos no son serializables. */
export class SaveBuildError extends Error {
  readonly code: SaveBuildErrorCode;

  constructor(code: SaveBuildErrorCode, message: string) {
    super(message);
    this.name = 'SaveBuildError';
    this.code = code;
  }
}

const DAMAGE_TYPES: readonly DamageType[] = [
  'slash',
  'blunt',
  'pierce',
  'magic',
  'electric',
];
const RESISTANCE_BANDS: readonly ResistanceBand[] = [
  'vulnerable',
  'normal',
  'resistant',
  'very-resistant',
];
const PHASES: readonly Phase[] = ['player', 'enemy'];
const AWARENESS_VALUES: readonly Awareness[] = ['dormant', 'alert', 'returning'];
const STATUS_VALUES: readonly GameStatus[] = ['playing', 'victory', 'defeat'];
const FACTIONS: readonly Faction[] = ['player', 'enemy'];
const ROOM_ROLES = ['large', 'small', 'medium'] as const;
const CORRIDOR_KINDS = ['tree', 'loop'] as const;
const DOOR_ORIENTATIONS = ['horizontal', 'vertical'] as const;
const DOOR_STYLES = ['wood', 'metal', 'grated'] as const;
const EXIT_KINDS = ['door', 'stairs-down', 'stairs-up'] as const;
const EXIT_TILES = ['exit-door', 'staircase-down', 'staircase-up'] as const;
const OPEN_MOUTH_REASONS = [
  'sin-soporte',
  'sin-suelo',
  'misma-sala',
  'separacion',
  'una-por-pasillo',
  'pasillo-ancho',
] as const;
const HOTSPOT_REASONS = ['rincon', 'sin-LOS', 'ambos'] as const;

const ROOT_KEYS = [
  'format_version',
  'seed',
  'rng',
  'grid',
  'map',
  'phase',
  'turn',
  'round',
  'activePlayerId',
  'party',
  'players',
  'enemies',
  'groundItems',
  'containers',
  'status',
] as const;
const ROOT_REQUIRED = [
  'format_version',
  'seed',
  'rng',
  'grid',
  'map',
  'phase',
  'turn',
  'round',
  'activePlayerId',
  'party',
  'players',
  'enemies',
  'status',
] as const;

const MANIFEST_KEYS = [
  'format_version',
  'game_version',
  'created_at',
  'seed',
  'summary',
] as const;
const SUMMARY_KEYS = ['players', 'turn', 'round', 'phase'] as const;
const PARTY_ENTRY_KEYS = ['name', 'archetype'] as const;
const SAVE_PARTY_KEYS = ['archetypeId', 'variant', 'name'] as const;

const UNIT_KEYS = [
  'id',
  'nombre',
  'faction',
  'enemyType',
  'archetypeId',
  'variant',
  'x',
  'y',
  'hp',
  'maxHp',
  'baseMaxHp',
  'ghost',
  'mp',
  'maxMp',
  'baseMaxMp',
  'mana',
  'actions',
  'spellsCast',
  'stats',
  'equipment',
  'inventory',
  'awareness',
  'fleeing',
  'home',
  'lastKnown',
  'alertTurns',
  'hasShouted',
] as const;
const UNIT_OPTIONAL_KEYS = ['ghost', 'baseMaxHp', 'baseMaxMp'] as const;
const STATS_KEYS = [
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
  'punteria',
  'magicLevel',
  'acciones',
] as const;
/**
 * Rango de los cuatro atributos inherentes (`habilidad`, `fuerza`, `defensa` y
 * `punteria`). El roster usa valores entre -1 y 3; ±9 deja margen para contenido
 * futuro sin admitir magnitudes que rompan la comparación de combate ni colar
 * enteros arbitrarios en un archivo manipulado. `magicLevel` y `acciones`
 * conservan sus límites propios.
 */
const STAT_MIN = -9;
const STAT_MAX = 9;
const MANA_KEYS = ['current', 'max'] as const;
const ACTIONS_KEYS = ['max', 'remaining'] as const;
const INVENTORY_KEYS = ['capacity', 'items'] as const;
const INSTANCE_KEYS = ['id', 'itemId', 'lootable'] as const;
const GROUND_ITEM_KEYS = ['id', 'itemId', 'lootable', 'x', 'y'] as const;
const CONTAINER_KEYS = ['id', 'x', 'y', 'capacity', 'items', 'kind', 'corpseOf', 'opened'] as const;
const CONTAINER_REQUIRED = ['id', 'x', 'y', 'capacity', 'items'] as const;

const MAP_KEYS = [
  'seed',
  'width',
  'height',
  'tiles',
  'rooms',
  'corridors',
  'doors',
  'spawns',
  'entrance',
  'exit',
  'enemies',
  'openMouths',
  'hotspots',
  'cavernRoomId',
  'weapons',
  'warnings',
  'options',
] as const;
const MAP_REQUIRED = [
  'seed',
  'width',
  'height',
  'tiles',
  'rooms',
  'corridors',
  'doors',
  'spawns',
  'warnings',
  'options',
] as const;
const MAP_OPTIONAL = [
  'entrance',
  'exit',
  'enemies',
  'openMouths',
  'hotspots',
  'cavernRoomId',
  'weapons',
] as const;
const ROOM_KEYS = ['id', 'x', 'y', 'width', 'height', 'role', 'cells', 'area'] as const;
const ROOM_OPTIONAL = ['cells', 'area'] as const;
const ROOM_REQUIRED = ['id', 'x', 'y', 'width', 'height', 'role'] as const;
const CORRIDOR_KEYS = [
  'id',
  'fromRoomId',
  'toRoomId',
  'roomA',
  'roomB',
  'kind',
  'width',
  'doorEligible',
  'path',
  'cells',
  'length',
] as const;
const CORRIDOR_OPTIONAL = ['id', 'roomA', 'roomB', 'cells', 'length'] as const;
const CORRIDOR_REQUIRED = [
  'fromRoomId',
  'toRoomId',
  'kind',
  'width',
  'doorEligible',
  'path',
] as const;
const DOOR_KEYS = [
  'id',
  'x',
  'y',
  'orientation',
  'roomId',
  'style',
  'roomA',
  'roomB',
  'corridorId',
  'direct',
] as const;
const DOOR_OPTIONAL = ['id', 'style', 'roomA', 'roomB', 'corridorId', 'direct'] as const;
const DOOR_REQUIRED = ['x', 'y', 'orientation', 'roomId'] as const;
const SPAWNS_KEYS = ['roomId', 'party', 'player', 'enemy', 'distance'] as const;
const SPAWNS_OPTIONAL = ['roomId', 'party'] as const;
const SPAWNS_REQUIRED = ['player', 'enemy', 'distance'] as const;
const ENTRANCE_KEYS = ['roomId', 'position'] as const;
const EXIT_KEYS = [
  'roomId',
  'kind',
  'position',
  'access',
  'tile',
  'distance',
  'path',
  'fallback',
] as const;
const MAP_ENEMY_KEYS = [
  'id',
  'type',
  'x',
  'y',
  'roomId',
  'home',
  'hidden',
  'interior',
] as const;
const OPEN_MOUTH_KEYS = [
  'id',
  'x',
  'y',
  'orientation',
  'roomA',
  'roomB',
  'corridorId',
  'reason',
] as const;
const HOTSPOT_KEYS = ['x', 'y', 'roomId', 'reason', 'roll', 'eligible', 'occupied'] as const;
const MAP_WEAPON_KEYS = ['id', 'weaponId', 'x', 'y'] as const;
const OPTIONS_KEYS = [
  'mapWidth',
  'mapHeight',
  'roomTarget',
  'roomMin',
  'roomMax',
  'loopRatio',
  'wideCorridorCount',
  'wideCorridorWidth',
] as const;

/** Error interno de validación con ruta estable para el informe y los tests. */
class InvalidValue extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'InvalidValue';
    this.path = path;
  }
}

function invalid(path: string, message: string): never {
  throw new InvalidValue(path, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectObject(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(path, 'debe ser un objeto');
  return value;
}

function expectArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) invalid(path, 'debe ser un array');
  return value;
}

function expectExactKeys(
  object: Record<string, unknown>,
  path: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) invalid(`${path}.${key}`, 'campo desconocido');
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) {
      invalid(`${path}.${key}`, 'campo obligatorio ausente');
    }
  }
}

function expectEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    invalid(path, `valor no permitido: ${String(value)}`);
  }
  return value as T;
}

function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') invalid(path, 'debe ser booleano');
  return value;
}

function expectString(value: unknown, path: string, allowEmpty = true): string {
  if (typeof value !== 'string') invalid(path, 'debe ser texto');
  if (!allowEmpty && value.length === 0) invalid(path, 'no puede estar vacío');
  return value;
}

function expectInteger(
  value: unknown,
  path: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    invalid(path, `debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}

function expectFormatVersion(
  value: unknown,
  path: string,
  code: 'manifest-version' | 'save-version',
): void {
  if (value === SAVE_FORMAT_VERSION) return;
  if (typeof value === 'number') {
    throw new VersionError(code, `${path}: versión de formato no soportada: ${value}`);
  }
  invalid(path, 'format_version debe ser el número 1');
}

class VersionError extends Error {
  readonly code: 'manifest-version' | 'save-version';

  constructor(code: 'manifest-version' | 'save-version', message: string) {
    super(message);
    this.name = 'VersionError';
    this.code = code;
  }
}

function orderedKeys(
  source: Record<string, unknown>,
  canonical: readonly string[],
  optional: readonly string[],
): string[] {
  const present = Object.keys(source).filter((key) => canonical.includes(key));
  const missing = canonical.filter(
    (key) => !present.includes(key) && !optional.includes(key),
  );
  return [...present, ...missing];
}

/** Reordena los valores según las claves del original; conserva presencia/ausencia. */
function reorder(
  source: Record<string, unknown>,
  values: Record<string, unknown>,
  optional: readonly string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of orderedKeys(source, Object.keys(values), optional)) {
    result[key] = values[key];
  }
  return result;
}

function isIsoUtc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

/* -------------------------------------------------------------------------- */
/* Serialización                                                              */
/* -------------------------------------------------------------------------- */

function serializeInstance(instance: ItemInstance): Record<string, unknown> {
  return reorder(
    instance as unknown as Record<string, unknown>,
    { id: instance.id, itemId: instance.itemId, lootable: instance.lootable },
  );
}

function serializeGroundItem(item: GroundItem): Record<string, unknown> {
  return reorder(item as unknown as Record<string, unknown>, {
    id: item.id,
    itemId: item.itemId,
    lootable: item.lootable,
    x: item.x,
    y: item.y,
  });
}

function serializeContainer(container: Container): Record<string, unknown> {
  const values: Record<string, unknown> = {
    id: container.id,
    x: container.x,
    y: container.y,
    capacity: container.capacity,
    items: container.items.map((item) =>
      item === null ? null : serializeInstance(item),
    ),
  };
  if (container.kind !== undefined) values.kind = container.kind;
  if (container.corpseOf !== undefined) values.corpseOf = container.corpseOf;
  if (container.opened !== undefined) values.opened = container.opened;
  return reorder(
    container as unknown as Record<string, unknown>,
    values,
    CONTAINER_OPTIONAL,
  );
}

const CONTAINER_OPTIONAL = ['kind', 'corpseOf', 'opened'] as const;

function serializeInventory(inventory: Inventory): Record<string, unknown> {
  return reorder(inventory as unknown as Record<string, unknown>, {
    capacity: inventory.capacity,
    items: inventory.items.map((item) =>
      item === null ? null : serializeInstance(item),
    ),
  });
}

function serializeEquipment(equipment: EquipmentSlots): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const instance = equipment[slot];
    values[slot] = instance === null ? null : serializeInstance(instance);
  }
  return reorder(equipment as unknown as Record<string, unknown>, values);
}

function serializeMana(mana: Mana): Record<string, unknown> {
  return reorder(mana as unknown as Record<string, unknown>, {
    current: mana.current,
    max: mana.max,
  });
}

function serializeActions(actions: Actions): Record<string, unknown> {
  return reorder(actions as unknown as Record<string, unknown>, {
    max: actions.max,
    remaining: actions.remaining,
  });
}

function serializeResistance(
  resistance: ResistanceProfile,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const type of DAMAGE_TYPES) {
    const band = resistance[type];
    if (band !== undefined) values[type] = band;
  }
  return reorder(
    resistance as unknown as Record<string, unknown>,
    values,
  );
}

function serializeStats(stats: UnitStats): Record<string, unknown> {
  return reorder(stats as unknown as Record<string, unknown>, {
    habilidad: stats.habilidad,
    fuerza: stats.fuerza,
    defensa: stats.defensa,
    resistencia: serializeResistance(stats.resistencia),
    punteria: stats.punteria,
    magicLevel: stats.magicLevel,
    acciones: stats.acciones,
  });
}

function serializePosition(position: Position): Record<string, unknown> {
  return reorder(position as unknown as Record<string, unknown>, {
    x: position.x,
    y: position.y,
  });
}

function serializeUnit(unit: Unit): Record<string, unknown> {
  const values: Record<string, unknown> = {
    id: unit.id,
    nombre: unit.nombre,
    faction: unit.faction,
    enemyType: unit.enemyType,
    archetypeId: unit.archetypeId,
    variant: unit.variant,
    x: unit.x,
    y: unit.y,
    hp: unit.hp,
    maxHp: unit.maxHp,
    baseMaxHp: unit.baseMaxHp,
    ghost: unit.ghost,
    mp: unit.mp,
    maxMp: unit.maxMp,
    baseMaxMp: unit.baseMaxMp,
    mana: serializeMana(unit.mana),
    actions: serializeActions(unit.actions),
    spellsCast: unit.spellsCast,
    stats: serializeStats(unit.stats),
    equipment: serializeEquipment(unit.equipment),
    inventory: serializeInventory(unit.inventory),
    awareness: unit.awareness,
    fleeing: unit.fleeing,
    home: serializePosition(unit.home),
    lastKnown: unit.lastKnown === null ? null : serializePosition(unit.lastKnown),
    alertTurns: unit.alertTurns,
    hasShouted: unit.hasShouted,
  };
  if (unit.ghost === undefined) delete values.ghost;
  return reorder(unit as unknown as Record<string, unknown>, values, UNIT_OPTIONAL_KEYS);
}

function serializeRoom(room: Room): Record<string, unknown> {
  const values: Record<string, unknown> = {
    id: room.id,
    x: room.x,
    y: room.y,
    width: room.width,
    height: room.height,
    role: room.role,
  };
  if (room.cells !== undefined) {
    values.cells = room.cells.map(serializePosition);
  }
  if (room.area !== undefined) values.area = room.area;
  return reorder(room as unknown as Record<string, unknown>, values, ROOM_OPTIONAL);
}

function serializeCorridor(corridor: Corridor): Record<string, unknown> {
  const values: Record<string, unknown> = {
    fromRoomId: corridor.fromRoomId,
    toRoomId: corridor.toRoomId,
    kind: corridor.kind,
    width: corridor.width,
    doorEligible: corridor.doorEligible,
    path: corridor.path.map(serializePosition),
  };
  if (corridor.id !== undefined) values.id = corridor.id;
  if (corridor.roomA !== undefined) values.roomA = corridor.roomA;
  if (corridor.roomB !== undefined) values.roomB = corridor.roomB;
  if (corridor.cells !== undefined) {
    values.cells = corridor.cells.map(serializePosition);
  }
  if (corridor.length !== undefined) values.length = corridor.length;
  return reorder(
    corridor as unknown as Record<string, unknown>,
    values,
    CORRIDOR_OPTIONAL,
  );
}

function serializeDoor(door: Door): Record<string, unknown> {
  const values: Record<string, unknown> = {
    x: door.x,
    y: door.y,
    orientation: door.orientation,
    roomId: door.roomId,
  };
  if (door.id !== undefined) values.id = door.id;
  if (door.style !== undefined) values.style = door.style;
  if (door.roomA !== undefined) values.roomA = door.roomA;
  if (door.roomB !== undefined) values.roomB = door.roomB;
  if (door.corridorId !== undefined) values.corridorId = door.corridorId;
  if (door.direct !== undefined) values.direct = door.direct;
  return reorder(door as unknown as Record<string, unknown>, values, DOOR_OPTIONAL);
}

function serializeSpawns(spawns: Spawns): Record<string, unknown> {
  const values: Record<string, unknown> = {
    player: serializePosition(spawns.player),
    enemy: serializePosition(spawns.enemy),
    distance: spawns.distance,
  };
  if (spawns.roomId !== undefined) values.roomId = spawns.roomId;
  if (spawns.party !== undefined) {
    values.party = spawns.party.map(serializePosition);
  }
  return reorder(spawns as unknown as Record<string, unknown>, values, SPAWNS_OPTIONAL);
}

function serializeEntrance(entrance: Entrance): Record<string, unknown> {
  return reorder(entrance as unknown as Record<string, unknown>, {
    roomId: entrance.roomId,
    position: serializePosition(entrance.position),
  });
}

function serializeExit(exit: Exit): Record<string, unknown> {
  return reorder(exit as unknown as Record<string, unknown>, {
    roomId: exit.roomId,
    kind: exit.kind,
    position: serializePosition(exit.position),
    access: serializePosition(exit.access),
    tile: exit.tile,
    distance: exit.distance,
    path: [...exit.path],
    fallback: exit.fallback,
  });
}

function serializeMapEnemy(enemy: MapEnemy): Record<string, unknown> {
  return reorder(enemy as unknown as Record<string, unknown>, {
    id: enemy.id,
    type: enemy.type,
    x: enemy.x,
    y: enemy.y,
    roomId: enemy.roomId,
    home: serializePosition(enemy.home),
    hidden: enemy.hidden,
    interior: enemy.interior,
  });
}

function serializeOpenMouth(mouth: OpenMouth): Record<string, unknown> {
  return reorder(mouth as unknown as Record<string, unknown>, {
    id: mouth.id,
    x: mouth.x,
    y: mouth.y,
    orientation: mouth.orientation,
    roomA: mouth.roomA,
    roomB: mouth.roomB,
    corridorId: mouth.corridorId,
    reason: mouth.reason,
  });
}

function serializeHotspot(hotspot: Hotspot): Record<string, unknown> {
  return reorder(hotspot as unknown as Record<string, unknown>, {
    x: hotspot.x,
    y: hotspot.y,
    roomId: hotspot.roomId,
    reason: hotspot.reason,
    roll: hotspot.roll,
    eligible: hotspot.eligible,
    occupied: hotspot.occupied,
  });
}

function serializeMapWeapon(weapon: MapWeapon): Record<string, unknown> {
  return reorder(weapon as unknown as Record<string, unknown>, {
    id: weapon.id,
    weaponId: weapon.weaponId,
    x: weapon.x,
    y: weapon.y,
  });
}

function serializeOptions(options: ResolvedMapOptions): Record<string, unknown> {
  return reorder(options as unknown as Record<string, unknown>, {
    mapWidth: options.mapWidth,
    mapHeight: options.mapHeight,
    roomTarget: options.roomTarget,
    roomMin: options.roomMin,
    roomMax: options.roomMax,
    loopRatio: options.loopRatio,
    wideCorridorCount: options.wideCorridorCount,
    wideCorridorWidth: options.wideCorridorWidth,
  });
}

function serializeMap(map: GeneratedMap): Record<string, unknown> {
  const values: Record<string, unknown> = {
    seed: map.seed,
    width: map.width,
    height: map.height,
    tiles: [...map.tiles],
    rooms: map.rooms.map(serializeRoom),
    corridors: map.corridors.map(serializeCorridor),
    doors: map.doors.map(serializeDoor),
    spawns: serializeSpawns(map.spawns),
    warnings: [...map.warnings],
    options: serializeOptions(map.options),
  };
  if (map.entrance !== undefined) values.entrance = serializeEntrance(map.entrance);
  if (map.exit !== undefined) {
    values.exit = map.exit === null ? null : serializeExit(map.exit);
  }
  if (map.enemies !== undefined) {
    values.enemies = map.enemies.map(serializeMapEnemy);
  }
  if (map.openMouths !== undefined) {
    values.openMouths = map.openMouths.map(serializeOpenMouth);
  }
  if (map.hotspots !== undefined) {
    values.hotspots = map.hotspots.map(serializeHotspot);
  }
  if (map.cavernRoomId !== undefined) values.cavernRoomId = map.cavernRoomId;
  if (map.weapons !== undefined) {
    values.weapons = map.weapons.map(serializeMapWeapon);
  }
  return reorder(map as unknown as Record<string, unknown>, values, MAP_OPTIONAL);
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

function readPosition(
  raw: unknown,
  path: string,
  width: number,
  height: number,
): Position {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, ['x', 'y']);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  return reorder(object, { x, y }) as unknown as Position;
}

function readInstance(
  raw: unknown,
  path: string,
  instanceIds: Set<string>,
): ItemInstance {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, INSTANCE_KEYS);
  const id = expectString(object.id, `${path}.id`, false);
  if (instanceIds.has(id)) invalid(`${path}.id`, `id de instancia duplicado: ${id}`);
  instanceIds.add(id);
  const itemId = expectString(object.itemId, `${path}.itemId`, false);
  if (!Object.prototype.hasOwnProperty.call(ITEMS, itemId)) {
    invalid(`${path}.itemId`, `objeto desconocido: ${itemId}`);
  }
  const lootable = expectBoolean(object.lootable, `${path}.lootable`);
  return reorder(object, { id, itemId, lootable }) as unknown as ItemInstance;
}

function readInventory(
  raw: unknown,
  path: string,
  instanceIds: Set<string>,
): Inventory {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, INVENTORY_KEYS);
  const capacity = expectInteger(object.capacity, `${path}.capacity`, 0, 1024);
  const rawItems = expectArray(object.items, `${path}.items`);
  if (rawItems.length !== capacity) {
    invalid(`${path}.items`, 'la mochila debe tener exactamente `capacity` huecos');
  }
  const items = rawItems.map((item, index) =>
    item === null ? null : readInstance(item, `${path}.items[${index}]`, instanceIds),
  );
  return reorder(object, { capacity, items }) as unknown as Inventory;
}

function readEquipment(
  raw: unknown,
  path: string,
  instanceIds: Set<string>,
): EquipmentSlots {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, EQUIPMENT_SLOTS);
  const slots: Record<string, ItemInstance | null> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const value = object[slot];
    if (value === null) {
      slots[slot] = null;
      continue;
    }
    const instance = readInstance(value, `${path}.${slot}`, instanceIds);
    if (ITEMS[instance.itemId].slot !== slot) {
      invalid(`${path}.${slot}`, `el objeto ${instance.itemId} no cabe en ${slot}`);
    }
    slots[slot] = instance;
  }
  return reorder(object, slots) as unknown as EquipmentSlots;
}

function readResistance(raw: unknown, path: string): ResistanceProfile {
  const object = expectObject(raw, path);
  for (const key of Object.keys(object)) {
    if (!DAMAGE_TYPES.includes(key as DamageType)) {
      invalid(`${path}.${key}`, 'tipo de daño desconocido');
    }
    expectEnum(object[key], RESISTANCE_BANDS, `${path}.${key}`);
  }
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(object)) values[key] = object[key];
  return reorder(object, values) as unknown as ResistanceProfile;
}

function readStats(raw: unknown, path: string): UnitStats {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, STATS_KEYS);
  const habilidad = expectInteger(
    object.habilidad,
    `${path}.habilidad`,
    STAT_MIN,
    STAT_MAX,
  );
  const fuerza = expectInteger(
    object.fuerza,
    `${path}.fuerza`,
    STAT_MIN,
    STAT_MAX,
  );
  const defensa = expectInteger(
    object.defensa,
    `${path}.defensa`,
    STAT_MIN,
    STAT_MAX,
  );
  const resistencia = readResistance(object.resistencia, `${path}.resistencia`);
  const punteria = expectInteger(
    object.punteria,
    `${path}.punteria`,
    STAT_MIN,
    STAT_MAX,
  );
  const magicLevel = expectInteger(object.magicLevel, `${path}.magicLevel`, 0, 4);
  const acciones = expectInteger(object.acciones, `${path}.acciones`, 0, 4);
  return reorder(object, {
    habilidad,
    fuerza,
    defensa,
    resistencia,
    punteria,
    magicLevel,
    acciones,
  }) as unknown as UnitStats;
}

function readMana(raw: unknown, path: string, magicLevel: number): Mana {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, MANA_KEYS);
  const current = expectInteger(object.current, `${path}.current`);
  const max = expectInteger(object.max, `${path}.max`);
  if (current > max) invalid(`${path}.current`, 'el maná actual supera el máximo');
  if (max !== manaMaxFor(magicLevel as 0 | 1 | 2 | 3 | 4)) {
    invalid(`${path}.max`, 'el maná máximo no coincide con el nivel de magia');
  }
  return reorder(object, { current, max }) as unknown as Mana;
}

function readActions(raw: unknown, path: string): Actions {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, ACTIONS_KEYS);
  const max = expectInteger(object.max, `${path}.max`, 0, 4);
  const remaining = expectInteger(object.remaining, `${path}.remaining`, 0, max);
  return reorder(object, { max, remaining }) as unknown as Actions;
}

function readUnit(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  instanceIds: Set<string>,
): Unit {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, UNIT_KEYS, UNIT_KEYS.filter(
    (key) => !UNIT_OPTIONAL_KEYS.includes(key as 'ghost'),
  ));
  const id = expectString(object.id, `${path}.id`, false);
  const nombre = expectString(object.nombre, `${path}.nombre`, false);
  const faction = expectEnum(object.faction, FACTIONS, `${path}.faction`);
  const enemyType =
    object.enemyType === null
      ? null
      : expectEnum(object.enemyType, Object.keys(BESTIARY) as ('sentinel' | 'brute' | 'coward')[], `${path}.enemyType`);
  const archetypeId =
    object.archetypeId === null
      ? null
      : expectEnum(
          object.archetypeId,
          Object.keys(ROSTER) as ArchetypeId[],
          `${path}.archetypeId`,
        );
  const variant =
    object.variant === null
      ? null
      : (expectInteger(object.variant, `${path}.variant`, 1, 2) as PlayerVariant);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const maxHp = expectInteger(object.maxHp, `${path}.maxHp`, 1);
  const hp = expectInteger(object.hp, `${path}.hp`, 0, maxHp);
  const baseMaxHp =
    object.baseMaxHp === undefined
      ? undefined
      : expectInteger(object.baseMaxHp, `${path}.baseMaxHp`, 1);
  const ghost =
    object.ghost === undefined ? undefined : expectBoolean(object.ghost, `${path}.ghost`);
  const maxMp = expectInteger(object.maxMp, `${path}.maxMp`);
  const mp = expectInteger(object.mp, `${path}.mp`, 0, maxMp);
  const baseMaxMp =
    object.baseMaxMp === undefined
      ? undefined
      : expectInteger(object.baseMaxMp, `${path}.baseMaxMp`);
  const stats = readStats(object.stats, `${path}.stats`);
  const mana = readMana(object.mana, `${path}.mana`, stats.magicLevel);
  const actions = readActions(object.actions, `${path}.actions`);
  const spellsCast = expectInteger(object.spellsCast, `${path}.spellsCast`, 0, 2);
  const equipment = readEquipment(object.equipment, `${path}.equipment`, instanceIds);
  const inventory = readInventory(object.inventory, `${path}.inventory`, instanceIds);
  const awareness = expectEnum(object.awareness, AWARENESS_VALUES, `${path}.awareness`);
  const fleeing = expectBoolean(object.fleeing, `${path}.fleeing`);
  const home = readPosition(object.home, `${path}.home`, width, height);
  const lastKnown =
    object.lastKnown === null
      ? null
      : readPosition(object.lastKnown, `${path}.lastKnown`, width, height);
  const alertTurns = expectInteger(object.alertTurns, `${path}.alertTurns`);
  const hasShouted = expectBoolean(object.hasShouted, `${path}.hasShouted`);

  const values: Record<string, unknown> = {
    id,
    nombre,
    faction,
    enemyType,
    archetypeId,
    variant,
    x,
    y,
    hp,
    maxHp,
    mp,
    maxMp,
    mana,
    actions,
    spellsCast,
    stats,
    equipment,
    inventory,
    awareness,
    fleeing,
    home,
    lastKnown,
    alertTurns,
    hasShouted,
  };
  if (ghost !== undefined) values.ghost = ghost;
  if (baseMaxHp !== undefined) values.baseMaxHp = baseMaxHp;
  if (baseMaxMp !== undefined) values.baseMaxMp = baseMaxMp;
  return reorder(
    object,
    values,
    UNIT_OPTIONAL_KEYS,
  ) as unknown as Unit;
}

function readTiles(
  raw: unknown,
  path: string,
  width: number,
  height: number,
): readonly Tile[] {
  const tiles = expectArray(raw, path);
  if (tiles.length !== width * height) {
    invalid(path, 'el número de tiles no coincide con las dimensiones');
  }
  return tiles.map((tile, index) =>
    expectEnum(tile, ['floor', 'wall'] as const, `${path}[${index}]`),
  );
}

function readRoom(
  raw: unknown,
  path: string,
  width: number,
  height: number,
): Room {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, ROOM_KEYS, ROOM_REQUIRED);
  const id = expectInteger(object.id, `${path}.id`);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const roomWidth = expectInteger(object.width, `${path}.width`, 1, width - x);
  const roomHeight = expectInteger(object.height, `${path}.height`, 1, height - y);
  const role = expectEnum(object.role, ROOM_ROLES, `${path}.role`);
  const values: Record<string, unknown> = {
    id,
    x,
    y,
    width: roomWidth,
    height: roomHeight,
    role,
  };
  if (object.cells !== undefined) {
    values.cells = expectArray(object.cells, `${path}.cells`).map((cell, index) =>
      readPosition(cell, `${path}.cells[${index}]`, width, height),
    );
  }
  if (object.area !== undefined) {
    const area = expectInteger(object.area, `${path}.area`);
    if (object.cells !== undefined && area !== (object.cells as unknown[]).length) {
      invalid(`${path}.area`, 'el área no coincide con el número de celdas');
    }
    values.area = area;
  }
  return reorder(object, values, ROOM_OPTIONAL) as unknown as Room;
}

function readCorridor(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Corridor {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, CORRIDOR_KEYS, CORRIDOR_REQUIRED);
  const fromRoomId = expectInteger(object.fromRoomId, `${path}.fromRoomId`);
  const toRoomId = expectInteger(object.toRoomId, `${path}.toRoomId`);
  if (!roomIds.has(fromRoomId)) invalid(`${path}.fromRoomId`, 'sala desconocida');
  if (!roomIds.has(toRoomId)) invalid(`${path}.toRoomId`, 'sala desconocida');
  const kind = expectEnum(object.kind, CORRIDOR_KINDS, `${path}.kind`);
  const corridorWidth = expectInteger(object.width, `${path}.width`, 1, 2);
  const doorEligible = expectBoolean(object.doorEligible, `${path}.doorEligible`);
  const pathCells = expectArray(object.path, `${path}.path`).map((cell, index) =>
    readPosition(cell, `${path}.path[${index}]`, width, height),
  );
  const values: Record<string, unknown> = {
    fromRoomId,
    toRoomId,
    kind,
    width: corridorWidth,
    doorEligible,
    path: pathCells,
  };
  if (object.id !== undefined) values.id = expectInteger(object.id, `${path}.id`);
  if (object.roomA !== undefined) {
    const roomA = expectInteger(object.roomA, `${path}.roomA`);
    if (!roomIds.has(roomA)) invalid(`${path}.roomA`, 'sala desconocida');
    values.roomA = roomA;
  }
  if (object.roomB !== undefined) {
    const roomB = expectInteger(object.roomB, `${path}.roomB`);
    if (!roomIds.has(roomB)) invalid(`${path}.roomB`, 'sala desconocida');
    values.roomB = roomB;
  }
  if (object.cells !== undefined) {
    values.cells = expectArray(object.cells, `${path}.cells`).map((cell, index) =>
      readPosition(cell, `${path}.cells[${index}]`, width, height),
    );
  }
  if (object.length !== undefined) {
    values.length = expectInteger(object.length, `${path}.length`);
  }
  return reorder(object, values, CORRIDOR_OPTIONAL) as unknown as Corridor;
}

function readDoor(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Door {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, DOOR_KEYS, DOOR_REQUIRED);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const orientation = expectEnum(object.orientation, DOOR_ORIENTATIONS, `${path}.orientation`);
  const roomId = expectInteger(object.roomId, `${path}.roomId`);
  if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
  const values: Record<string, unknown> = { x, y, orientation, roomId };
  if (object.id !== undefined) values.id = expectInteger(object.id, `${path}.id`);
  if (object.style !== undefined) {
    values.style = expectEnum(object.style, DOOR_STYLES, `${path}.style`);
  }
  for (const key of ['roomA', 'roomB', 'corridorId'] as const) {
    if (object[key] !== undefined) {
      const value = expectInteger(object[key], `${path}.${key}`);
      if ((key === 'roomA' || key === 'roomB') && !roomIds.has(value)) {
        invalid(`${path}.${key}`, 'sala desconocida');
      }
      values[key] = value;
    }
  }
  if (object.direct !== undefined) {
    values.direct = expectBoolean(object.direct, `${path}.direct`);
  }
  return reorder(object, values, DOOR_OPTIONAL) as unknown as Door;
}

function readSpawns(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Spawns {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, SPAWNS_KEYS, SPAWNS_REQUIRED);
  const player = readPosition(object.player, `${path}.player`, width, height);
  const enemy = readPosition(object.enemy, `${path}.enemy`, width, height);
  const distance = expectInteger(object.distance, `${path}.distance`);
  const values: Record<string, unknown> = { player, enemy, distance };
  if (object.roomId !== undefined) {
    const roomId = expectInteger(object.roomId, `${path}.roomId`);
    if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
    values.roomId = roomId;
  }
  if (object.party !== undefined) {
    const party = expectArray(object.party, `${path}.party`).map((cell, index) =>
      readPosition(cell, `${path}.party[${index}]`, width, height),
    );
    if (party.length !== 6) invalid(`${path}.party`, 'el grupo de spawn debe tener 6 huecos');
    if (party[0]?.x !== player.x || party[0]?.y !== player.y) {
      invalid(`${path}.party[0]`, 'el grupo debe empezar por el jugador');
    }
    values.party = party;
  }
  return reorder(object, values, SPAWNS_OPTIONAL) as unknown as Spawns;
}

function readEntrance(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Entrance {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, ENTRANCE_KEYS);
  const roomId = expectInteger(object.roomId, `${path}.roomId`);
  if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
  const position = readPosition(object.position, `${path}.position`, width, height);
  return reorder(object, { roomId, position }) as unknown as Entrance;
}

function readExit(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Exit {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, EXIT_KEYS);
  const roomId = expectInteger(object.roomId, `${path}.roomId`);
  if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
  const kind = expectEnum(object.kind, EXIT_KINDS, `${path}.kind`);
  const position = readPosition(object.position, `${path}.position`, width, height);
  const access = readPosition(object.access, `${path}.access`, width, height);
  const tile = expectEnum(object.tile, EXIT_TILES, `${path}.tile`);
  const distance = expectInteger(object.distance, `${path}.distance`);
  const pathValues = expectArray(object.path, `${path}.path`).map((value, index) =>
    expectInteger(value, `${path}.path[${index}]`, 0, width * height - 1),
  );
  const fallback = expectBoolean(object.fallback, `${path}.fallback`);
  return reorder(object, {
    roomId,
    kind,
    position,
    access,
    tile,
    distance,
    path: pathValues,
    fallback,
  }) as unknown as Exit;
}

function readMapEnemy(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): MapEnemy {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, MAP_ENEMY_KEYS);
  const id = expectString(object.id, `${path}.id`, false);
  const type = expectEnum(
    object.type,
    Object.keys(BESTIARY) as ('sentinel' | 'brute' | 'coward')[],
    `${path}.type`,
  );
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const roomId = expectInteger(object.roomId, `${path}.roomId`);
  if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
  const home = readPosition(object.home, `${path}.home`, width, height);
  const hidden = expectBoolean(object.hidden, `${path}.hidden`);
  const interior = expectBoolean(object.interior, `${path}.interior`);
  return reorder(object, {
    id,
    type,
    x,
    y,
    roomId,
    home,
    hidden,
    interior,
  }) as unknown as MapEnemy;
}

function readOpenMouth(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): OpenMouth {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, OPEN_MOUTH_KEYS);
  const id = expectInteger(object.id, `${path}.id`);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const orientation = expectEnum(object.orientation, DOOR_ORIENTATIONS, `${path}.orientation`);
  const roomA = expectInteger(object.roomA, `${path}.roomA`);
  const roomB = expectInteger(object.roomB, `${path}.roomB`);
  if (!roomIds.has(roomA)) invalid(`${path}.roomA`, 'sala desconocida');
  if (!roomIds.has(roomB)) invalid(`${path}.roomB`, 'sala desconocida');
  const corridorId = expectInteger(object.corridorId, `${path}.corridorId`);
  const reason = expectEnum(object.reason, OPEN_MOUTH_REASONS, `${path}.reason`);
  return reorder(object, {
    id,
    x,
    y,
    orientation,
    roomA,
    roomB,
    corridorId,
    reason,
  }) as unknown as OpenMouth;
}

function readHotspot(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  roomIds: ReadonlySet<number>,
): Hotspot {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, HOTSPOT_KEYS);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const roomId = expectInteger(object.roomId, `${path}.roomId`);
  if (!roomIds.has(roomId)) invalid(`${path}.roomId`, 'sala desconocida');
  const reason = expectEnum(object.reason, HOTSPOT_REASONS, `${path}.reason`);
  const roll = object.roll;
  if (typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0 || roll >= 1) {
    invalid(`${path}.roll`, 'debe ser un número en [0, 1)');
  }
  const eligible = expectBoolean(object.eligible, `${path}.eligible`);
  const occupied = expectBoolean(object.occupied, `${path}.occupied`);
  return reorder(object, {
    x,
    y,
    roomId,
    reason,
    roll,
    eligible,
    occupied,
  }) as unknown as Hotspot;
}

function readMapWeapon(
  raw: unknown,
  path: string,
  width: number,
  height: number,
): MapWeapon {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, MAP_WEAPON_KEYS);
  const id = expectString(object.id, `${path}.id`, false);
  const weaponId = expectString(object.weaponId, `${path}.weaponId`, false);
  if (!Object.prototype.hasOwnProperty.call(ITEMS, weaponId)) {
    invalid(`${path}.weaponId`, `objeto desconocido: ${weaponId}`);
  }
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  return reorder(object, { id, weaponId, x, y }) as unknown as MapWeapon;
}

function readOptions(raw: unknown, path: string): ResolvedMapOptions {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, OPTIONS_KEYS);
  const values: Record<string, unknown> = {};
  for (const key of OPTIONS_KEYS) {
    values[key] = expectInteger(object[key], `${path}.${key}`);
  }
  return reorder(object, values) as unknown as ResolvedMapOptions;
}

function readMap(
  raw: unknown,
  path: string,
  seed: number,
  width: number,
  height: number,
  tiles: readonly Tile[],
): GeneratedMap {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, MAP_KEYS, MAP_REQUIRED);
  const mapSeed = expectInteger(object.seed, `${path}.seed`, 0, 0xffff_ffff);
  if (mapSeed !== seed) invalid(`${path}.seed`, 'no coincide con la semilla de la partida');
  const mapWidth = expectInteger(object.width, `${path}.width`, 1, 4096);
  const mapHeight = expectInteger(object.height, `${path}.height`, 1, 4096);
  if (mapWidth !== width || mapHeight !== height) {
    invalid(path, 'las dimensiones no coinciden con `grid`');
  }
  const mapTiles = readTiles(object.tiles, `${path}.tiles`, mapWidth, mapHeight);
  if (mapTiles.length !== tiles.length) {
    invalid(`${path}.tiles`, 'no coincide con los tiles de `grid`');
  }
  for (let index = 0; index < tiles.length; index += 1) {
    if (mapTiles[index] !== tiles[index]) {
      invalid(`${path}.tiles[${index}]`, 'no coincide con los tiles de `grid`');
    }
  }

  const rawRooms = expectArray(object.rooms, `${path}.rooms`);
  const rooms = rawRooms.map((room, index) =>
    readRoom(room, `${path}.rooms[${index}]`, mapWidth, mapHeight),
  );
  const roomIds = new Set<number>();
  for (const [index, room] of rooms.entries()) {
    if (roomIds.has(room.id)) {
      invalid(`${path}.rooms[${index}].id`, `sala duplicada: ${room.id}`);
    }
    roomIds.add(room.id);
  }

  const corridors = expectArray(object.corridors, `${path}.corridors`).map(
    (corridor, index) =>
      readCorridor(corridor, `${path}.corridors[${index}]`, mapWidth, mapHeight, roomIds),
  );
  const doors = expectArray(object.doors, `${path}.doors`).map((door, index) =>
    readDoor(door, `${path}.doors[${index}]`, mapWidth, mapHeight, roomIds),
  );
  const spawns = readSpawns(object.spawns, `${path}.spawns`, mapWidth, mapHeight, roomIds);
  const warnings = expectArray(object.warnings, `${path}.warnings`).map((warning, index) =>
    expectString(warning, `${path}.warnings[${index}]`),
  );
  const options = readOptions(object.options, `${path}.options`);

  const values: Record<string, unknown> = {
    seed: mapSeed,
    width: mapWidth,
    height: mapHeight,
    tiles: mapTiles,
    rooms,
    corridors,
    doors,
    spawns,
    warnings,
    options,
  };
  if (object.entrance !== undefined) {
    values.entrance = readEntrance(
      object.entrance,
      `${path}.entrance`,
      mapWidth,
      mapHeight,
      roomIds,
    );
  }
  if (object.exit !== undefined) {
    values.exit =
      object.exit === null
        ? null
        : readExit(object.exit, `${path}.exit`, mapWidth, mapHeight, roomIds);
  }
  if (object.enemies !== undefined) {
    values.enemies = expectArray(object.enemies, `${path}.enemies`).map(
      (enemy, index) =>
        readMapEnemy(enemy, `${path}.enemies[${index}]`, mapWidth, mapHeight, roomIds),
    );
  }
  if (object.openMouths !== undefined) {
    values.openMouths = expectArray(object.openMouths, `${path}.openMouths`).map(
      (mouth, index) =>
        readOpenMouth(mouth, `${path}.openMouths[${index}]`, mapWidth, mapHeight, roomIds),
    );
  }
  if (object.hotspots !== undefined) {
    values.hotspots = expectArray(object.hotspots, `${path}.hotspots`).map(
      (hotspot, index) =>
        readHotspot(hotspot, `${path}.hotspots[${index}]`, mapWidth, mapHeight, roomIds),
    );
  }
  if (object.cavernRoomId !== undefined) {
    if (object.cavernRoomId === null) {
      values.cavernRoomId = null;
    } else {
      const cavernRoomId = expectInteger(object.cavernRoomId, `${path}.cavernRoomId`);
      if (!roomIds.has(cavernRoomId)) {
        invalid(`${path}.cavernRoomId`, 'sala desconocida');
      }
      values.cavernRoomId = cavernRoomId;
    }
  }
  if (object.weapons !== undefined) {
    values.weapons = expectArray(object.weapons, `${path}.weapons`).map(
      (weapon, index) =>
        readMapWeapon(weapon, `${path}.weapons[${index}]`, mapWidth, mapHeight),
    );
  }
  return reorder(object, values, MAP_OPTIONAL) as unknown as GeneratedMap;
}

function readGroundItem(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  instanceIds: Set<string>,
): GroundItem {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, GROUND_ITEM_KEYS);
  const id = expectString(object.id, `${path}.id`, false);
  if (instanceIds.has(id)) invalid(`${path}.id`, `id de instancia duplicado: ${id}`);
  instanceIds.add(id);
  const itemId = expectString(object.itemId, `${path}.itemId`, false);
  if (!Object.prototype.hasOwnProperty.call(ITEMS, itemId)) {
    invalid(`${path}.itemId`, `objeto desconocido: ${itemId}`);
  }
  const lootable = expectBoolean(object.lootable, `${path}.lootable`);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  return reorder(object, { id, itemId, lootable, x, y }) as unknown as GroundItem;
}

function readContainer(
  raw: unknown,
  path: string,
  width: number,
  height: number,
  instanceIds: Set<string>,
  unitIds: ReadonlySet<string>,
  containerIds: Set<string>,
): Container {
  const object = expectObject(raw, path);
  expectExactKeys(object, path, CONTAINER_KEYS, CONTAINER_REQUIRED);
  const id = expectString(object.id, `${path}.id`, false);
  if (containerIds.has(id)) invalid(`${path}.id`, `contenedor duplicado: ${id}`);
  containerIds.add(id);
  const x = expectInteger(object.x, `${path}.x`, 0, width - 1);
  const y = expectInteger(object.y, `${path}.y`, 0, height - 1);
  const capacity = expectInteger(object.capacity, `${path}.capacity`, 0, 1024);
  const rawItems = expectArray(object.items, `${path}.items`);
  if (rawItems.length > capacity) {
    invalid(`${path}.items`, 'hay más instancias que capacidad');
  }
  const items = rawItems.map((item, index) =>
    item === null ? null : readInstance(item, `${path}.items[${index}]`, instanceIds),
  );
  const values: Record<string, unknown> = { id, x, y, capacity, items };
  if (object.kind !== undefined) {
    values.kind = expectEnum(object.kind, ['chest', 'corpse'] as const, `${path}.kind`);
  }
  if (object.corpseOf !== undefined) {
    const corpseOf = expectString(object.corpseOf, `${path}.corpseOf`, false);
    if (values.kind !== 'corpse') {
      invalid(`${path}.corpseOf`, 'solo un contenedor `corpse` puede tener `corpseOf`');
    }
    if (!unitIds.has(corpseOf)) {
      invalid(`${path}.corpseOf`, `unidad desconocida: ${corpseOf}`);
    }
    values.corpseOf = corpseOf;
  }
  if (object.opened !== undefined) {
    values.opened = expectBoolean(object.opened, `${path}.opened`);
  }
  return reorder(object, values, CONTAINER_OPTIONAL) as unknown as Container;
}

function readParty(raw: unknown): readonly {
  readonly archetypeId: ArchetypeId;
  readonly variant: PlayerVariant;
  readonly name: string;
}[] {
  const party = expectArray(raw, '$.party');
  if (party.length < MIN_PLAYERS || party.length > MAX_PLAYERS) {
    invalid('$.party', `debe tener entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`);
  }
  return party.map((entry, index) => {
    const path = `$.party[${index}]`;
    const object = expectObject(entry, path);
    expectExactKeys(object, path, SAVE_PARTY_KEYS);
    const archetypeId = expectEnum(
      object.archetypeId,
      Object.keys(ROSTER) as ArchetypeId[],
      `${path}.archetypeId`,
    );
    const variant = expectInteger(object.variant, `${path}.variant`, 1, 2) as PlayerVariant;
    const name = expectString(object.name, `${path}.name`);
    return { archetypeId, variant, name };
  });
}

function readSaveRoot(raw: unknown): GameState {
  const object = expectObject(raw, '$.partida');
  expectExactKeys(object, '$.partida', ROOT_KEYS, ROOT_REQUIRED);
  expectFormatVersion(object.format_version, '$.partida.format_version', 'save-version');

  const seed = expectInteger(object.seed, '$.partida.seed', 0, 0xffff_ffff);

  const rngObject = expectObject(object.rng, '$.partida.rng');
  expectExactKeys(rngObject, '$.partida.rng', ['seed', 'state'] as const);
  const rngSeed = expectInteger(rngObject.seed, '$.partida.rng.seed', 0, 0xffff_ffff);
  if (rngSeed !== seed) invalid('$.partida.rng.seed', 'no coincide con `seed`');
  const rngState = expectInteger(rngObject.state, '$.partida.rng.state', 0, 0xffff_ffff);
  const rng: RngState = reorder(rngObject, {
    seed: rngSeed,
    state: rngState,
  }) as unknown as RngState;

  const gridObject = expectObject(object.grid, '$.partida.grid');
  expectExactKeys(gridObject, '$.partida.grid', ['width', 'height', 'tiles'] as const);
  const width = expectInteger(gridObject.width, '$.partida.grid.width', 1, 4096);
  const height = expectInteger(gridObject.height, '$.partida.grid.height', 1, 4096);
  const tiles = readTiles(gridObject.tiles, '$.partida.grid.tiles', width, height);

  const map = readMap(object.map, '$.partida.map', seed, width, height, tiles);
  const grid: Grid = reorder(gridObject, {
    width,
    height,
    tiles: map.tiles,
  }) as unknown as Grid;

  const phase = expectEnum(object.phase, PHASES, '$.partida.phase');
  const turn = expectInteger(object.turn, '$.partida.turn');
  const round = expectInteger(object.round, '$.partida.round');
  if (turn === 0) invalid('$.partida.turn', 'debe ser positivo');
  if (round === 0) invalid('$.partida.round', 'debe ser positivo');
  if (turn !== round) invalid('$.partida.turn', 'debe coincidir con `round`');

  const activePlayerId = expectString(
    object.activePlayerId,
    '$.partida.activePlayerId',
    false,
  );

  const party = readParty(object.party);

  const instanceIds = new Set<string>();
  const unitIds = new Set<string>();
  const rawPlayers = expectArray(object.players, '$.partida.players');
  const players = rawPlayers.map((player, index) => {
    const path = `$.partida.players[${index}]`;
    const unit = readUnit(player, path, width, height, instanceIds);
    if (unitIds.has(unit.id)) invalid(`${path}.id`, `unidad duplicada: ${unit.id}`);
    unitIds.add(unit.id);
    return unit;
  });
  if (players.length !== party.length) {
    invalid('$.partida.players', 'el número de unidades no coincide con la party');
  }
  for (const [index, unit] of players.entries()) {
    const path = `$.partida.players[${index}]`;
    if (unit.faction !== 'player') invalid(`${path}.faction`, 'debe ser `player`');
    if (unit.id !== `player-${index + 1}`) {
      invalid(`${path}.id`, 'el id debe ser `player-<índice+1>`');
    }
    const config = party[index];
    if (unit.archetypeId !== config.archetypeId) {
      invalid(`${path}.archetypeId`, 'no coincide con la party');
    }
    if (unit.variant !== config.variant) {
      invalid(`${path}.variant`, 'no coincide con la party');
    }
  }
  if (!players.some((player) => player.id === activePlayerId)) {
    invalid('$.partida.activePlayerId', 'el activo no existe en `players`');
  }

  const enemies = expectArray(object.enemies, '$.partida.enemies').map(
    (enemy, index) => {
      const path = `$.partida.enemies[${index}]`;
      const unit = readUnit(enemy, path, width, height, instanceIds);
      if (unitIds.has(unit.id)) invalid(`${path}.id`, `unidad duplicada: ${unit.id}`);
      unitIds.add(unit.id);
      return unit;
    },
  );

  const groundItems =
    object.groundItems === undefined
      ? undefined
      : expectArray(object.groundItems, '$.partida.groundItems').map(
          (item, index) =>
            readGroundItem(
              item,
              `$.partida.groundItems[${index}]`,
              width,
              height,
              instanceIds,
            ),
        );

  const containerIds = new Set<string>();
  const containers =
    object.containers === undefined
      ? undefined
      : expectArray(object.containers, '$.partida.containers').map(
          (container, index) =>
            readContainer(
              container,
              `$.partida.containers[${index}]`,
              width,
              height,
              instanceIds,
              unitIds,
              containerIds,
            ),
        );

  const status = expectEnum(object.status, STATUS_VALUES, '$.partida.status');

  return {
    grid,
    map,
    ...(groundItems === undefined ? {} : { groundItems }),
    players,
    enemies,
    config: { seed, players: party },
    phase,
    activePlayerId,
    round,
    status,
    rng,
    ...(containers === undefined ? {} : { containers }),
  };
}

function readManifestRoot(raw: unknown): SaveManifest {
  const object = expectObject(raw, '$.manifiesto');
  expectExactKeys(object, '$.manifiesto', MANIFEST_KEYS);
  expectFormatVersion(
    object.format_version,
    '$.manifiesto.format_version',
    'manifest-version',
  );
  const gameVersion = expectString(object.game_version, '$.manifiesto.game_version', false);
  if (gameVersion.trim() === '') {
    invalid('$.manifiesto.game_version', 'no puede estar vacío');
  }
  const createdAt = expectString(object.created_at, '$.manifiesto.created_at', false);
  if (!isIsoUtc(createdAt)) {
    invalid('$.manifiesto.created_at', 'debe ser una fecha ISO UTC terminada en Z');
  }
  const seed = expectInteger(object.seed, '$.manifiesto.seed', 0, 0xffff_ffff);

  const summary = expectObject(object.summary, '$.manifiesto.summary');
  expectExactKeys(summary, '$.manifiesto.summary', SUMMARY_KEYS);
  const rawPlayers = expectArray(summary.players, '$.manifiesto.summary.players');
  if (rawPlayers.length < MIN_PLAYERS || rawPlayers.length > MAX_PLAYERS) {
    invalid(
      '$.manifiesto.summary.players',
      `debe tener entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores`,
    );
  }
  const players = rawPlayers.map((entry, index) => {
    const path = `$.manifiesto.summary.players[${index}]`;
    const value = expectObject(entry, path);
    expectExactKeys(value, path, PARTY_ENTRY_KEYS);
    const name = expectString(value.name, `${path}.name`, false);
    const archetype = expectEnum(
      value.archetype,
      Object.keys(ROSTER) as ArchetypeId[],
      `${path}.archetype`,
    );
    return { name, archetype };
  });
  const turn = expectInteger(summary.turn, '$.manifiesto.summary.turn', 1);
  const round = expectInteger(summary.round, '$.manifiesto.summary.round', 1);
  const phase = expectEnum(summary.phase, PHASES, '$.manifiesto.summary.phase');

  return {
    format_version: SAVE_FORMAT_VERSION,
    game_version: gameVersion,
    created_at: createdAt,
    seed,
    summary: { players, turn, round, phase },
  };
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                */
/* -------------------------------------------------------------------------- */

function jsonError(
  code: SaveErrorCode,
  message: string,
  path: string,
): SaveResult<never> {
  return { ok: false, error: { code, message, path } };
}

function parseJson(
  input: string | null | undefined,
  missingCode: SaveErrorCode,
  jsonCode: SaveErrorCode,
  path: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: SaveError } {
  if (input === null || input === undefined || input.trim() === '') {
    return {
      ok: false,
      error: { code: missingCode, message: 'no hay contenido que interpretar', path },
    };
  }
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch {
    return {
      ok: false,
      error: { code: jsonCode, message: 'el contenido no es JSON válido', path },
    };
  }
}

/** Construye ambos archivos con JSON determinista a partir del estado. */
export function buildSaveFiles(state: GameState, input: SaveBuildInput): SaveFiles {
  if (input.gameVersion.trim() === '') {
    throw new SaveBuildError('invalid-game-version', '`gameVersion` no puede estar vacío.');
  }
  if (!isIsoUtc(input.createdAt)) {
    throw new SaveBuildError(
      'invalid-created-at',
      '`createdAt` debe ser una fecha ISO UTC terminada en Z.',
    );
  }
  if (state.map === undefined) {
    throw new SaveBuildError('missing-map', 'El estado no tiene `map`; no hay v1 que guardar.');
  }
  const config = state.config;
  if (config === undefined) {
    throw new SaveBuildError(
      'missing-config',
      'El estado no tiene `config`; la party no se puede reconstruir.',
    );
  }
  try {
    validateGameConfig(config);
  } catch (error) {
    throw new SaveBuildError(
      'invalid-config',
      error instanceof Error ? error.message : 'La configuración no es válida.',
    );
  }

  const seed = state.rng.seed;
  if (config.seed !== seed) {
    throw new SaveBuildError('invalid-state', '`config.seed` no coincide con el RNG.');
  }
  if (state.map.seed !== seed) {
    throw new SaveBuildError('invalid-state', '`map.seed` no coincide con el RNG.');
  }
  if (
    state.map.width !== state.grid.width ||
    state.map.height !== state.grid.height ||
    state.players.length !== config.players.length
  ) {
    throw new SaveBuildError(
      'invalid-state',
      '`grid`, `map`, party y jugadores no son coherentes.',
    );
  }

  const save = {
    format_version: SAVE_FORMAT_VERSION,
    seed,
    rng: serializeRng(state.rng),
    grid: reorder(state.grid as unknown as Record<string, unknown>, {
      width: state.grid.width,
      height: state.grid.height,
      tiles: [...state.grid.tiles],
    }),
    map: serializeMap(state.map),
    phase: state.phase,
    turn: state.round,
    round: state.round,
    activePlayerId: state.activePlayerId,
    party: config.players.map((player) => ({
      archetypeId: player.archetypeId,
      variant: player.variant,
      name: player.name,
    })),
    players: state.players.map(serializeUnit),
    enemies: state.enemies.map(serializeUnit),
    ...(state.groundItems === undefined
      ? {}
      : { groundItems: state.groundItems.map(serializeGroundItem) }),
    ...(state.containers === undefined
      ? {}
      : { containers: state.containers.map(serializeContainer) }),
    status: state.status,
  };

  const manifest = {
    format_version: SAVE_FORMAT_VERSION,
    game_version: input.gameVersion,
    created_at: input.createdAt,
    seed,
    summary: {
      players: config.players.map((player) => ({
        name:
          player.name === ''
            ? ROSTER[player.archetypeId].name
            : player.name,
        archetype: player.archetypeId,
      })),
      turn: state.round,
      round: state.round,
      phase: state.phase,
    },
  };

  return { manifest: JSON.stringify(manifest), save: JSON.stringify(save) };
}

function serializeRng(rng: RngState): Record<string, unknown> {
  return reorder(rng as unknown as Record<string, unknown>, {
    seed: rng.seed,
    state: rng.state,
  });
}

/** Valida `manifiesto.json`; nunca lanza por datos del archivo. */
export function parseManifest(
  input: string | null | undefined,
): SaveResult<SaveManifest> {
  const parsed = parseJson(
    input,
    'manifest-missing',
    'manifest-json',
    '$.manifiesto',
  );
  if (!parsed.ok) return parsed;

  try {
    return { ok: true, value: readManifestRoot(parsed.value) };
  } catch (error) {
    if (error instanceof VersionError) {
      return jsonError(error.code, error.message, '$.manifiesto.format_version');
    }
    if (error instanceof InvalidValue) {
      return jsonError('manifest-invalid', error.message, error.path);
    }
    return jsonError(
      'manifest-invalid',
      error instanceof Error ? error.message : 'manifiesto inválido',
      '$.manifiesto',
    );
  }
}

/** Valida `partida.json` y reconstruye el estado; nunca lo muta. */
export function parseSave(input: string | null | undefined): SaveResult<GameState> {
  const parsed = parseJson(input, 'save-missing', 'save-json', '$.partida');
  if (!parsed.ok) return parsed;

  try {
    return { ok: true, value: readSaveRoot(parsed.value) };
  } catch (error) {
    if (error instanceof VersionError) {
      return jsonError(error.code, error.message, '$.partida.format_version');
    }
    if (error instanceof InvalidValue) {
      return jsonError('save-invalid', error.message, error.path);
    }
    return jsonError(
      'save-invalid',
      error instanceof Error ? error.message : 'partida inválida',
      '$.partida',
    );
  }
}

/**
 * Lee el sobre `{ manifest, save }` con la misma validación que el cargador:
 * primero el manifiesto (ausente o inválido corta la carga) y después la partida.
 */
export function readSaveFiles(
  files: SaveFileInputs,
): SaveResult<{ readonly state: GameState; readonly manifest: SaveManifest }> {
  const manifest = parseManifest(files.manifest);
  if (!manifest.ok) return manifest;

  const save = parseSave(files.save);
  if (!save.ok) return save;

  return { ok: true, value: { state: save.value, manifest: manifest.value } };
}
