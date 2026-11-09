/**
 * Resolución de opciones del núcleo de chambers (REQ-011 T-005).
 *
 * Nunca lanza: los valores imposibles se corrigen y se registra un aviso
 * legible. Los valores aprobados por defecto son 22×18, 5 salas, salas de 3-8
 * tiles, pasillo máximo 3, ancho 33 %, muro 1 (admite 1-2), caverna 15 % y
 * mínimo 6 huecos de spawn.
 */

import { clamp } from './rng';

export interface ChamberOptions {
  readonly mapWidth?: number;
  readonly mapHeight?: number;
  /** Número de salas de un mapa normal; la caverna fija 3. */
  readonly roomCount?: number;
  /** Lado mínimo de una sala en tiles, no número de salas. */
  readonly roomMin?: number;
  /** Lado máximo de una sala en tiles, no número de salas. */
  readonly roomMax?: number;
  readonly corridorMaxLength?: number;
  /** Probabilidad de pasillo ancho en porcentaje (0-100). */
  readonly wideCorridorChance?: number;
  readonly wallThickness?: number;
  /** Probabilidad de mapa caverna en porcentaje (0-100). */
  readonly cavernChance?: number;
  /** Mínimo de huecos de spawn; lo consume TASK-0045. */
  readonly spawnMinTiles?: number;
}

export interface ResolvedChamberOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly roomCount: number;
  readonly roomMin: number;
  readonly roomMax: number;
  readonly corridorMaxLength: number;
  readonly wideCorridorChance: number;
  readonly wallThickness: number;
  readonly cavernChance: number;
  readonly spawnMinTiles: number;
}

export interface ResolvedChamberOptionsResult {
  readonly options: ResolvedChamberOptions;
  readonly warnings: readonly string[];
}

export const DEFAULT_CHAMBER_OPTIONS: ResolvedChamberOptions = {
  mapWidth: 22,
  mapHeight: 18,
  roomCount: 5,
  roomMin: 3,
  roomMax: 8,
  corridorMaxLength: 3,
  wideCorridorChance: 33,
  wallThickness: 1,
  cavernChance: 15,
  spawnMinTiles: 6,
};

function resolveInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string,
  warnings: string[],
): number {
  if (value === undefined) return fallback;
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    warnings.push(`${label} no numérico; se usa ${fallback}.`);
    return fallback;
  }
  const resolved = clamp(Math.trunc(raw), min, max);
  if (resolved !== raw) {
    warnings.push(`${label} normalizado de ${raw} a ${resolved}.`);
  }
  return resolved;
}

/**
 * Resuelve las opciones geométricas. Corrige mapas demasiado pequeños para
 * alojar al menos 3 salas bajando `roomMin` con aviso, en vez de lanzar.
 */
export function resolveChamberOptions(
  input: ChamberOptions = {},
): ResolvedChamberOptionsResult {
  const warnings: string[] = [];
  const defaults = DEFAULT_CHAMBER_OPTIONS;

  const mapWidth = resolveInteger(
    input.mapWidth,
    defaults.mapWidth,
    12,
    40,
    'Ancho del mapa',
    warnings,
  );
  const mapHeight = resolveInteger(
    input.mapHeight,
    defaults.mapHeight,
    10,
    34,
    'Alto del mapa',
    warnings,
  );
  const roomCount = resolveInteger(
    input.roomCount,
    defaults.roomCount,
    4,
    6,
    'Número de salas',
    warnings,
  );
  let roomMin = resolveInteger(
    input.roomMin,
    defaults.roomMin,
    2,
    6,
    'Tamaño mínimo de sala',
    warnings,
  );
  let roomMax = resolveInteger(
    input.roomMax,
    defaults.roomMax,
    4,
    12,
    'Tamaño máximo de sala',
    warnings,
  );

  if (roomMin > roomMax) {
    warnings.push(
      `El tamaño mínimo de sala (${roomMin}) era mayor que el máximo (${roomMax}); se intercambiaron.`,
    );
    const swap = roomMin;
    roomMin = roomMax;
    roomMax = swap;
  }

  const fitMax = Math.min(mapWidth, mapHeight) - 2;
  if (roomMax > fitMax) {
    warnings.push(`El tamaño máximo de sala se recortó de ${roomMax} a ${fitMax} por el mapa.`);
    roomMax = Math.max(3, fitMax);
  }
  if (roomMin > roomMax) {
    warnings.push(`El tamaño mínimo de sala se recortó a ${roomMax} para no superar el máximo.`);
    roomMin = roomMax;
  }

  const corridorMaxLength = resolveInteger(
    input.corridorMaxLength,
    defaults.corridorMaxLength,
    0,
    3,
    'Longitud máxima de pasillo',
    warnings,
  );
  const wideCorridorChance = resolveInteger(
    input.wideCorridorChance,
    defaults.wideCorridorChance,
    0,
    100,
    'Probabilidad de pasillo ancho',
    warnings,
  );
  const wallThickness = resolveInteger(
    input.wallThickness,
    defaults.wallThickness,
    1,
    2,
    'Grosor de muro',
    warnings,
  );
  const cavernChance = resolveInteger(
    input.cavernChance,
    defaults.cavernChance,
    0,
    100,
    'Probabilidad de caverna',
    warnings,
  );
  const spawnMinTiles = resolveInteger(
    input.spawnMinTiles,
    defaults.spawnMinTiles,
    1,
    12,
    'Mínimo de huecos de spawn',
    warnings,
  );

  // Una cuadrícula de 3 columnas × 2 filas es el máximo del layout normal. Si
  // con `roomMin` no caben ni 3 salas, se baja el mínimo (no el recuento).
  const gap = wallThickness;
  const capacityAt = (side: number): number => {
    const columns = Math.min(3, Math.max(1, Math.floor((mapWidth - 2 + gap) / (side + gap))));
    const rows = Math.min(2, Math.max(1, Math.floor((mapHeight - 2 + gap) / (side + gap))));
    return columns * rows;
  };
  while (roomMin > 2 && capacityAt(Math.max(3, roomMin)) < 3) {
    roomMin -= 1;
    warnings.push(
      `El mapa no admite 3 salas de ${roomMin + 1} tiles; el tamaño mínimo se redujo a ${roomMin}.`,
    );
  }
  if (roomMin > roomMax) {
    roomMax = roomMin;
  }

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
      cavernChance,
      spawnMinTiles,
    },
    warnings,
  };
}
