/**
 * Navegación espacial del panel de inventario (REQ-032 N-001 a N-010).
 *
 * Módulo puro: no toca DOM ni conoce el modelo del panel. La vista le inyecta el
 * centro de cada celda en coordenadas relativas al panel; aquí solo se resuelve
 * el vecino estricto en una dirección, los empates y el orden de lectura.
 */

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface NavigationPoint {
  readonly x: number;
  readonly y: number;
}

/** Celda seleccionable con su centro y la zona lógica a la que pertenece. */
export interface NavigationCell {
  /** Clave estable (`slot:<slot>`, `backpack:<i>`, `ground:<id>`). */
  readonly key: string;
  readonly zone: string;
  readonly center: NavigationPoint;
}

function readingOrder(a: NavigationCell, b: NavigationCell): number {
  return (
    a.center.y - b.center.y ||
    a.center.x - b.center.x ||
    a.key.localeCompare(b.key)
  );
}

function squaredDistance(a: NavigationPoint, b: NavigationPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Primer objeto en orden de lectura: arriba→abajo y, a igual altura, izquierda→derecha. */
export function firstInReadingOrder(
  cells: readonly NavigationCell[],
): NavigationCell | null {
  return [...cells].sort(readingOrder)[0] ?? null;
}

/**
 * Vecino estrictamente en `direction` desde `currentKey`. Solo entran objetos
 * existentes (la vista no añade huecos vacíos). El candidato más próximo gana
 * por distancia euclídea; el empate se rompe por desviación perpendicular y,
 * si persiste, por orden de lectura. Sin candidato devuelve `null` (sin rebote).
 */
export function findNeighbor(
  cells: readonly NavigationCell[],
  currentKey: string,
  direction: NavigationDirection,
): NavigationCell | null {
  const current = cells.find((cell) => cell.key === currentKey);
  if (!current) return null;

  let best: NavigationCell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDeviation = Number.POSITIVE_INFINITY;

  for (const candidate of cells) {
    if (candidate.key === current.key) continue;
    const dx = candidate.center.x - current.center.x;
    const dy = candidate.center.y - current.center.y;
    const ahead =
      direction === 'up'
        ? dy < 0
        : direction === 'down'
          ? dy > 0
          : direction === 'left'
            ? dx < 0
            : dx > 0;
    if (!ahead) continue;

    const distance = squaredDistance(current.center, candidate.center);
    const deviation =
      direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);

    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        (deviation < bestDeviation ||
          (deviation === bestDeviation && readingOrder(candidate, best!) < 0)))
    ) {
      best = candidate;
      bestDistance = distance;
      bestDeviation = deviation;
    }
  }

  return best;
}

/**
 * Objeto más próximo a un punto; se usa cuando el foco anterior desaparece tras
 * equipar, recoger o soltar. Los empates se resuelven por orden de lectura.
 */
export function nearestTo(
  cells: readonly NavigationCell[],
  point: NavigationPoint,
): NavigationCell | null {
  let best: NavigationCell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of cells) {
    const distance = squaredDistance(point, candidate.center);
    if (
      distance < bestDistance ||
      (distance === bestDistance && readingOrder(candidate, best!) < 0)
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * Siguiente zona disponible al pulsar `Tab`/`Shift+Tab`. `zones` solo contiene
 * zonas con objetos (más las zonas fijas de acciones y cierre), en orden de
 * recorrido; las vacías ya vienen filtradas por la vista.
 */
export function cycleZone(
  zones: readonly string[],
  current: string | null,
  backwards = false,
): string | null {
  if (zones.length === 0) return null;
  const index = current === null ? -1 : zones.indexOf(current);
  if (index < 0) return backwards ? zones[zones.length - 1] : zones[0];
  const delta = backwards ? -1 : 1;
  return zones[(index + delta + zones.length) % zones.length];
}
