/**
 * Variante `growth` de producción (TASK-0046, ADR-013).
 *
 * Compone el núcleo compartido (`generateChamberPlan` + `placeChamberContents`)
 * y lo expone como `MapGenerator` con `id = 'growth'`. No copia el generador
 * monolítico de `experiments/`, no importa BSP ni plantillas y no usa
 * `Math.random`, relojes, DOM ni estado global.
 */

import { BESTIARY } from '../../bestiary';
import {
  DOOR_STYLES,
  floorDistances,
  isFloorTile,
  MAP_WEAPON_SPECS,
  placeMapWeapons,
  roomAt,
  tileIndex,
  type GeneratedMap,
  type MapEnemy,
  type MapGenerator,
  type MapOptions,
  type ResolvedMapOptions,
  type Spawns,
} from '../../map';
import type { Position } from '../../types';
import {
  generateChamberPlan,
  placeChamberContents,
  type ChamberContentsOptions,
  type ChamberOptions,
} from '../core';
import type { OpenMouth } from '../core/doors';
import type { Hotspot } from '../core/enemies';

/** Opciones aceptadas por la variante: las del motor más las del núcleo. */
export interface GrowthMapOptions
  extends MapOptions,
    ChamberOptions,
    ChamberContentsOptions {}

export const GROWTH_MAP_GENERATOR_ID = 'growth';

function chamberOptionsFrom(options: GrowthMapOptions): ChamberOptions {
  return {
    mapWidth: options.mapWidth,
    mapHeight: options.mapHeight,
    // `roomTarget` es el nombre histórico de `MapOptions`; en growth el número
    // de salas vive en `roomCount`.
    roomCount: options.roomCount ?? options.roomTarget,
    roomMin: options.roomMin,
    roomMax: options.roomMax,
    corridorMaxLength: options.corridorMaxLength,
    wideCorridorChance: options.wideCorridorChance,
    wallThickness: options.wallThickness,
    cavernChance: options.cavernChance,
    spawnMinTiles: options.spawnMinTiles ?? options.minSpawnTiles,
  };
}

function contentsOptionsFrom(options: GrowthMapOptions): ChamberContentsOptions {
  return {
    numPlayers: options.numPlayers,
    enemySurfaceFactor: options.enemySurfaceFactor,
    enemyPlayersFactor: options.enemyPlayersFactor,
    hiddenEnemyChance: options.hiddenEnemyChance,
    exitMode: options.exitMode,
    minSpawnTiles: options.minSpawnTiles ?? options.spawnMinTiles,
  };
}

/**
 * `GeneratedMap.options` conserva la forma histórica de `ResolvedMapOptions`.
 * Se rellenan solo campos coherentes con el mapa ya generado; no se aplica el
 * recorte de 20×20 de BSP.
 */
function resolvedOptionsFor(
  plan: ReturnType<typeof generateChamberPlan>,
): ResolvedMapOptions {
  const wideCount = plan.corridors.filter((corridor) => corridor.width === 2).length;
  const loopRatio = Math.min(
    40,
    Math.round((plan.loops / Math.max(1, plan.rooms.length)) * 100),
  );

  return {
    mapWidth: plan.width,
    mapHeight: plan.height,
    roomTarget: plan.options.roomCount,
    roomMin: plan.options.roomMin,
    roomMax: plan.options.roomMax,
    loopRatio,
    wideCorridorCount: Math.min(2, wideCount),
    wideCorridorWidth: 2,
  };
}

function cloneEnemies(enemies: readonly MapEnemy[]): MapEnemy[] {
  return enemies.map((enemy) => ({
    ...enemy,
    home: { x: enemy.home.x, y: enemy.home.y },
  }));
}

function cloneOpenMouths(mouths: readonly OpenMouth[]): OpenMouth[] {
  return mouths.map((mouth) => ({ ...mouth }));
}

function cloneHotspots(hotspots: readonly Hotspot[]): Hotspot[] {
  return hotspots.map((hotspot) => ({ ...hotspot }));
}

function spawnsFor(
  plan: ReturnType<typeof generateChamberPlan>,
  contents: ReturnType<typeof placeChamberContents>,
  enemies: readonly MapEnemy[],
): Spawns {
  const anchor = enemies[0];
  const enemy = anchor
    ? { x: anchor.x, y: anchor.y }
    : { x: contents.spawns.player.x, y: contents.spawns.player.y };
  const distances = floorDistances(plan, contents.spawns.player);
  const distance = anchor
    ? distances[tileIndex(plan.width, anchor.x, anchor.y)]
    : 0;

  return {
    roomId: contents.spawns.roomId,
    party: contents.spawns.party.map((cell) => ({ x: cell.x, y: cell.y })),
    player: { x: contents.spawns.player.x, y: contents.spawns.player.y },
    enemy,
    distance: distance < 0 ? 0 : distance,
  };
}

/**
 * Rellena `map.enemies` a partir del contenido del plan y conserva el contrato
 * serializable del modelo (`type`, `home`, `hidden`, `interior`).
 */
function mapFor(
  plan: ReturnType<typeof generateChamberPlan>,
  contents: ReturnType<typeof placeChamberContents>,
): GeneratedMap {
  const enemies = cloneEnemies(contents.enemies);
  const exit = contents.exit ? cloneExit(contents.exit) : null;
  const map: GeneratedMap = {
    seed: plan.seed,
    width: plan.width,
    height: plan.height,
    tiles: plan.tiles,
    rooms: plan.rooms,
    corridors: plan.corridors,
    doors: plan.doors,
    spawns: spawnsFor(plan, contents, enemies),
    entrance: {
      roomId: contents.entrance.roomId,
      position: { x: contents.entrance.position.x, y: contents.entrance.position.y },
    },
    exit,
    enemies,
    openMouths: cloneOpenMouths(plan.openMouths),
    hotspots: cloneHotspots(contents.hotspots),
    cavernRoomId: plan.cavernRoomId,
    warnings: [...new Set([...plan.warnings, ...contents.warnings])],
    options: resolvedOptionsFor(plan),
  };

  // Los spawns y las puertas ya los excluye `placeMapWeapons`; aquí se añaden
  // la salida y cada enemigo. El PRNG de armas es propio y no cambia.
  const blockedCells = [
    ...(exit ? [exit.position, exit.access] : []),
    ...enemies.map((enemy) => ({ x: enemy.x, y: enemy.y })),
  ];

  return { ...map, weapons: placeMapWeapons(map, { blockedCells }) };
}

function cloneExit(
  exit: NonNullable<ReturnType<typeof placeChamberContents>['exit']>,
): NonNullable<GeneratedMap['exit']> {
  return {
    ...exit,
    position: { x: exit.position.x, y: exit.position.y },
    access: { x: exit.access.x, y: exit.access.y },
    path: [...exit.path],
  };
}

/**
 * Generador `growth` de producción. Misma semilla y opciones ⇒ estructuras
 * profundamente iguales.
 */
export class GrowthMapGenerator implements MapGenerator {
  readonly id = GROWTH_MAP_GENERATOR_ID;

  generate(seed: number, options?: MapOptions): GeneratedMap;
  generate(seed: number, options?: GrowthMapOptions): GeneratedMap;
  generate(seed: number, options: GrowthMapOptions = {}): GeneratedMap {
    const plan = generateChamberPlan(seed, chamberOptionsFrom(options));
    const contents = placeChamberContents(plan, contentsOptionsFrom(options));
    return mapFor(plan, contents);
  }
}

/**
 * Validador propio de `growth`. No sustituye a `validateGeneratedMap`: aquel
 * exige reglas de BSP (≥20×20, pasillos de ≥3 tiles y 1-2 anchos) que el
 * generador denso no comparte. Este comprueba solo el contrato de producción.
 */
export function validateGrowthMap(
  map: Pick<
    GeneratedMap,
    | 'width'
    | 'height'
    | 'tiles'
    | 'rooms'
    | 'corridors'
    | 'doors'
    | 'spawns'
    | 'entrance'
    | 'exit'
    | 'enemies'
    | 'weapons'
    | 'warnings'
    | 'options'
  >,
): { readonly ok: boolean; readonly issues: readonly string[] } {
  const issues: string[] = [];
  const { width, height, tiles, rooms, corridors, doors, spawns } = map;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3) {
    issues.push('Dimensiones de mapa inválidas.');
  }
  if (tiles.length !== width * height) {
    issues.push('La rejilla no coincide con las dimensiones.');
  }
  for (let x = 0; x < width; x += 1) {
    if (tiles[tileIndex(width, x, 0)] !== 'wall') issues.push('Borde superior abierto.');
    if (tiles[tileIndex(width, x, height - 1)] !== 'wall') {
      issues.push('Borde inferior abierto.');
    }
  }
  for (let y = 0; y < height; y += 1) {
    if (tiles[tileIndex(width, 0, y)] !== 'wall') issues.push('Borde izquierdo abierto.');
    if (tiles[tileIndex(width, width - 1, y)] !== 'wall') {
      issues.push('Borde derecho abierto.');
    }
  }

  if (map.options.mapWidth !== width || map.options.mapHeight !== height) {
    issues.push('Las opciones no coinciden con las dimensiones del mapa.');
  }
  if (map.options.roomMin > map.options.roomMax) {
    issues.push('El tamaño mínimo de sala supera el máximo.');
  }

  for (const room of rooms) {
    if (!room.cells) {
      issues.push(`Sala ${room.id} sin máscara.`);
      continue;
    }
    if (room.area !== room.cells.length) {
      issues.push(`Sala ${room.id} declara área ${String(room.area)} con ${room.cells.length} celdas.`);
    }
    if (
      room.x < 1 ||
      room.y < 1 ||
      room.x + room.width > width - 1 ||
      room.y + room.height > height - 1
    ) {
      issues.push(`Sala ${room.id} fuera del área interior.`);
    }
    const seen = new Set<string>();
    let previous: Position | null = null;
    for (const cell of room.cells) {
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) issues.push(`Sala ${room.id} repite la celda ${key}.`);
      seen.add(key);
      if (
        cell.x < room.x ||
        cell.y < room.y ||
        cell.x >= room.x + room.width ||
        cell.y >= room.y + room.height
      ) {
        issues.push(`Sala ${room.id} tiene la celda ${key} fuera de su caja.`);
      }
      if (!isFloorTile(map, cell.x, cell.y)) {
        issues.push(`Sala ${room.id} tiene la celda ${key} sobre muro.`);
      }
      if (previous && (cell.y < previous.y || (cell.y === previous.y && cell.x < previous.x))) {
        issues.push(`Sala ${room.id} tiene la máscara desordenada.`);
      }
      previous = cell;
    }
  }

  for (let index = 0; index < corridors.length; index += 1) {
    const corridor = corridors[index];
    const path = corridor.path;
    if (corridor.id !== undefined && corridor.id !== index) {
      issues.push(`Corredor ${index} con id ${corridor.id}.`);
    }
    if (corridor.roomA !== undefined && corridor.roomA !== corridor.fromRoomId) {
      issues.push(`Corredor ${index} con roomA incoherente.`);
    }
    if (corridor.roomB !== undefined && corridor.roomB !== corridor.toRoomId) {
      issues.push(`Corredor ${index} con roomB incoherente.`);
    }
    if (!rooms.some((room) => room.id === corridor.fromRoomId)) {
      issues.push(`Corredor ${index} con sala origen inexistente.`);
    }
    if (!rooms.some((room) => room.id === corridor.toRoomId)) {
      issues.push(`Corredor ${index} con sala destino inexistente.`);
    }
    for (let step = 1; step < path.length; step += 1) {
      const previous = path[step - 1];
      const current = path[step];
      if (
        Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y) !== 1
      ) {
        issues.push(`Corredor ${index} no es ortogonal.`);
        break;
      }
    }
    for (const cell of path) {
      if (!isFloorTile(map, cell.x, cell.y)) {
        issues.push(`Corredor ${index} pasa por muro.`);
        break;
      }
    }
    if (corridor.length !== undefined && corridor.length !== Math.max(0, path.length - 1)) {
      issues.push(`Corredor ${index} con length incoherente.`);
    }
  }

  const doorKeys = new Set<string>();
  for (const door of doors) {
    const key = `${door.x},${door.y}`;
    if (doorKeys.has(key)) issues.push(`Puerta duplicada en (${key}).`);
    doorKeys.add(key);
    if (!isFloorTile(map, door.x, door.y)) {
      issues.push(`Puerta (${key}) sobre muro.`);
    }
    if (!DOOR_STYLES.includes(door.style ?? 'wood')) {
      issues.push(`Puerta (${key}) con estilo desconocido.`);
    }
    if (door.roomA === undefined || door.roomB === undefined) {
      issues.push(`Puerta (${key}) sin dos salas.`);
    } else if (door.roomA === door.roomB) {
      issues.push(`Puerta (${key}) conecta dos veces la misma sala.`);
    } else {
      if (!rooms.some((room) => room.id === door.roomA)) {
        issues.push(`Puerta (${key}) con sala A inexistente.`);
      }
      if (!rooms.some((room) => room.id === door.roomB)) {
        issues.push(`Puerta (${key}) con sala B inexistente.`);
      }
      if (door.corridorId !== undefined) {
        const corridor = corridors[door.corridorId];
        if (!corridor) {
          issues.push(`Puerta (${key}) con corredor inexistente.`);
        } else if (
          ![corridor.fromRoomId, corridor.toRoomId].includes(door.roomA) ||
          ![corridor.fromRoomId, corridor.toRoomId].includes(door.roomB)
        ) {
          issues.push(`Puerta (${key}) no coincide con su corredor.`);
        }
      }
    }
  }

  if (spawns.roomId === undefined) {
    issues.push('El spawn no declara sala.');
  } else if (!rooms.some((room) => room.id === spawns.roomId)) {
    issues.push(`El spawn declara una sala inexistente ${spawns.roomId}.`);
  }
  if (!isFloorTile(map, spawns.player.x, spawns.player.y)) {
    issues.push('Jugador sobre muro.');
  }
  const playerRoom = roomAt(rooms, spawns.player.x, spawns.player.y);
  if (!playerRoom) {
    issues.push('Jugador fuera de sala.');
  } else if (spawns.roomId !== undefined && playerRoom.id !== spawns.roomId) {
    issues.push('La sala del jugador no coincide con la declarada.');
  }
  if (spawns.party) {
    if (spawns.party.length !== 6) {
      issues.push(`El grupo de spawn tiene ${spawns.party.length} huecos; se esperaban 6.`);
    }
    if (spawns.party[0]?.x !== spawns.player.x || spawns.party[0]?.y !== spawns.player.y) {
      issues.push('El grupo de spawn no tiene a `player` como `party[0]`.');
    }
    const seen = new Set<string>();
    for (const cell of spawns.party) {
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) issues.push(`El grupo de spawn repite la celda ${key}.`);
      seen.add(key);
      if (!isFloorTile(map, cell.x, cell.y)) {
        issues.push(`El grupo de spawn tiene la celda ${key} sobre muro.`);
      } else if (roomAt(rooms, cell.x, cell.y)?.id !== spawns.roomId) {
        issues.push(`El grupo de spawn tiene la celda ${key} fuera de la sala.`);
      }
    }
  }
  if (!isFloorTile(map, spawns.enemy.x, spawns.enemy.y)) {
    issues.push('Ancla de enemigo sobre muro.');
  }
  const distances = floorDistances(map, spawns.player);
  const anchorDistance = distances[tileIndex(width, spawns.enemy.x, spawns.enemy.y)];
  if (anchorDistance >= 0 && anchorDistance !== spawns.distance) {
    issues.push(`Distancia declarada ${spawns.distance} != BFS ${anchorDistance}.`);
  }

  if (map.entrance) {
    if (map.entrance.roomId !== spawns.roomId) {
      issues.push('La entrada no está en la sala de spawn.');
    }
    if (
      map.entrance.position.x !== spawns.player.x ||
      map.entrance.position.y !== spawns.player.y
    ) {
      issues.push('La entrada no coincide con party[0].');
    }
  }

  if (map.exit) {
    const exit = map.exit;
    if (!rooms.some((room) => room.id === exit.roomId)) {
      issues.push(`La salida declara una sala inexistente ${exit.roomId}.`);
    }
    const expectedTile = exit.kind === 'door' ? 'wall' : 'floor';
    if (map.tiles[tileIndex(width, exit.position.x, exit.position.y)] !== expectedTile) {
      issues.push(`La salida ${exit.kind} está sobre un tile inesperado.`);
    }
    if (!isFloorTile(map, exit.access.x, exit.access.y)) {
      issues.push('El acceso de la salida está sobre muro.');
    }
    if (exit.path.length === 0 || exit.path[0] !== spawns.roomId) {
      issues.push('El camino de salida no parte de la sala de spawn.');
    }
  }

  const enemyIds = new Set<string>();
  for (const enemy of map.enemies ?? []) {
    if (enemyIds.has(enemy.id)) issues.push(`Enemigo duplicado ${enemy.id}.`);
    enemyIds.add(enemy.id);
    if (!(enemy.type in BESTIARY)) {
      issues.push(`Enemigo ${enemy.id} con tipo ${enemy.type}.`);
    }
    if (!isFloorTile(map, enemy.x, enemy.y)) {
      issues.push(`Enemigo ${enemy.id} sobre muro.`);
    }
    const room = roomAt(rooms, enemy.x, enemy.y);
    if (!room || room.id !== enemy.roomId) {
      issues.push(`Enemigo ${enemy.id} fuera de su sala ${enemy.roomId}.`);
    }
    if (enemy.roomId === spawns.roomId) {
      issues.push(`Enemigo ${enemy.id} en la sala de spawn.`);
    }
    if (enemy.home.x !== enemy.x || enemy.home.y !== enemy.y) {
      issues.push(`Enemigo ${enemy.id} con home distinto de su posición.`);
    }
    if (map.exit) {
      const reserved = new Set([
        `${map.exit.position.x},${map.exit.position.y}`,
        `${map.exit.access.x},${map.exit.access.y}`,
      ]);
      if (reserved.has(`${enemy.x},${enemy.y}`)) {
        issues.push(`Enemigo ${enemy.id} sobre la salida reservada.`);
      }
    }
  }

  const weapons = map.weapons;
  if (!weapons) {
    issues.push('El mapa no declara armas.');
  } else {
    if (weapons.length !== MAP_WEAPON_SPECS.length) {
      issues.push(
        `El mapa tiene ${weapons.length} armas; se esperaban ${MAP_WEAPON_SPECS.length}.`,
      );
    }

    const doorKeys = new Set(doors.map((door) => `${door.x},${door.y}`));
    const spawnKeys = new Set([
      ...(spawns.party ?? []).map((cell) => `${cell.x},${cell.y}`),
      `${spawns.player.x},${spawns.player.y}`,
      `${spawns.enemy.x},${spawns.enemy.y}`,
    ]);
    const exitKeys = new Set(
      map.exit
        ? [
            `${map.exit.position.x},${map.exit.position.y}`,
            `${map.exit.access.x},${map.exit.access.y}`,
          ]
        : [],
    );
    const enemyKeys = new Set(
      (map.enemies ?? []).map((enemy) => `${enemy.x},${enemy.y}`),
    );
    const weaponIds = new Set<string>();
    const weaponCells = new Set<string>();
    const weaponRoomIds = new Set<number>();

    for (let index = 0; index < weapons.length; index += 1) {
      const weapon = weapons[index];
      const spec = MAP_WEAPON_SPECS[index];
      const key = `${weapon.x},${weapon.y}`;

      if (!spec) {
        issues.push(`Arma sobrante ${weapon.id}.`);
      } else if (weapon.id !== spec.id || weapon.weaponId !== spec.weaponId) {
        issues.push(
          `Arma ${index} es ${weapon.id}/${weapon.weaponId}; se esperaba ${spec.id}/${spec.weaponId}.`,
        );
      }
      if (weaponIds.has(weapon.id)) issues.push(`Arma duplicada ${weapon.id}.`);
      weaponIds.add(weapon.id);
      if (weaponCells.has(key)) issues.push(`Dos armas en la celda ${key}.`);
      weaponCells.add(key);

      if (!isFloorTile(map, weapon.x, weapon.y)) {
        issues.push(`Arma ${weapon.id} sobre muro.`);
        continue;
      }
      if (distances[tileIndex(width, weapon.x, weapon.y)] <= 0) {
        issues.push(`Arma ${weapon.id} no es alcanzable desde el spawn.`);
      }
      const room = roomAt(rooms, weapon.x, weapon.y);
      if (!room) {
        issues.push(`Arma ${weapon.id} fuera de sala.`);
      } else {
        if (room.id === spawns.roomId) {
          issues.push(`Arma ${weapon.id} en la sala de spawn.`);
        }
        if (weaponRoomIds.has(room.id)) {
          issues.push(`Dos armas comparten la sala ${room.id}.`);
        }
        weaponRoomIds.add(room.id);
      }
      if (doorKeys.has(key)) issues.push(`Arma ${weapon.id} sobre una puerta.`);
      if (spawnKeys.has(key)) {
        issues.push(`Arma ${weapon.id} sobre un hueco de spawn.`);
      }
      if (exitKeys.has(key)) issues.push(`Arma ${weapon.id} sobre la salida.`);
      if (enemyKeys.has(key)) {
        issues.push(`Arma ${weapon.id} sobre un enemigo.`);
      }
    }
  }

  if (!Array.isArray(map.warnings)) {
    issues.push('Los avisos no son una lista.');
  }

  return { ok: issues.length === 0, issues };
}
