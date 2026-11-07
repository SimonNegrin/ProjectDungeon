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
