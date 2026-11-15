import type { GameState, Grid, Tile, Unit } from './types';

/**
 * Crea una sala rectangular con muros en el borde y suelo transitable dentro.
 * La sala mínima es 3x3 para que siempre exista al menos una casilla de suelo.
 */
export function createRoomGrid(width: number, height: number): Grid {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3) {
    throw new RangeError('Room dimensions must be integers greater than or equal to 3');
  }

  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push(isBorder ? 'wall' : 'floor');
    }
  }

  return { width, height, tiles };
}

export function isInside(grid: Grid, x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < grid.width &&
    y < grid.height
  );
}

export function tileAt(grid: Grid, x: number, y: number): Tile | undefined {
  if (!isInside(grid, x, y)) return undefined;
  return grid.tiles[y * grid.width + x];
}

export function isWallAt(grid: Grid, x: number, y: number): boolean {
  return tileAt(grid, x, y) === 'wall';
}

export function isFloorAt(grid: Grid, x: number, y: number): boolean {
  return tileAt(grid, x, y) === 'floor';
}

export function isAlive(unit: Unit): boolean {
  return unit.hp > 0;
}

/**
 * Fantasma controlable (REQ-021 T-002): muerto con la marca aditiva `ghost`.
 * La marca sola no basta: sin `hp === 0` la unidad sigue siendo un vivo.
 */
export function isGhost(unit: Pick<Unit, 'hp' | 'ghost'>): boolean {
  return unit.hp === 0 && unit.ghost === true;
}

/** Estado derivado de una unidad; nunca se guarda por separado. */
export type LifeState = 'alive' | 'dead' | 'ghost';

/**
 * Vivo, muerto o fantasma, derivado de `hp` y `ghost` (REQ-021 T-001/T-002).
 * Un muerto sin fantasma y un fantasma son estados distintos, pero `hp === 0`
 * sigue siendo la señal única de muerte.
 */
export function lifeState(unit: Pick<Unit, 'hp' | 'ghost'>): LifeState {
  if (unit.hp > 0) return 'alive';
  return isGhost(unit) ? 'ghost' : 'dead';
}

export function livingUnitAt(units: readonly Unit[], x: number, y: number): Unit | undefined {
  return units.find((unit) => isAlive(unit) && unit.x === x && unit.y === y);
}

/**
 * Jugadores y enemigos vivos bloquean la casilla. Los muertos no.
 */
export function isOccupied(state: GameState, x: number, y: number): boolean {
  return (
    livingUnitAt(state.players, x, y) !== undefined ||
    livingUnitAt(state.enemies, x, y) !== undefined
  );
}
