import { expect, type Page } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { BESTIARY } from '../../src/game/bestiary';
import { createInitialState } from '../../src/game/engine';
import { DEFAULT_MAP_SEED, type MapGenerator } from '../../src/game/map';
import type { Command, GameEvent, GameState, Position } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { visibleTileRange, type TileRange } from '../../src/host/geometry';

export async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
}

export interface ReachableTile {
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

/**
 * Tiles de suelo alcanzables desde el jugador con su coste BFS, limitados al
 * viewport actual. Excluye por defecto a las unidades vivas. Permite a los
 * tests derivar destinos verdes/ámbar del snapshot en vez de fijar coordenadas
 * de una geometría concreta.
 */
export function reachableVisibleTiles(
  snap: GameSnapshot,
  options: {
    readonly minDistance?: number;
    readonly maxDistance?: number;
  } = {},
): ReachableTile[] {
  const width = snap.grid.width;
  const height = snap.grid.height;
  const start = snap.players[0];
  const blocked = new Set(
    [...snap.players, ...snap.enemies]
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.y * width + unit.x),
  );
  const distances = new Int32Array(width * height).fill(-1);
  const startIndex = start.y * width + start.x;
  if (snap.grid.tiles[startIndex] !== 'floor') return [];
  distances[startIndex] = 0;
  const queue: number[] = [startIndex];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const x = current % width;
    const y = (current - x) / width;
    const distance = distances[current];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const index = ny * width + nx;
      if (snap.grid.tiles[index] !== 'floor') continue;
      if (blocked.has(index)) continue;
      if (distances[index] !== -1) continue;
      distances[index] = distance + 1;
      queue.push(index);
    }
  }

  const minX = Math.floor(snap.camera.x / snap.tileSize);
  const minY = Math.floor(snap.camera.y / snap.tileSize);
  const maxX = Math.ceil((snap.camera.x + snap.viewport.width) / snap.tileSize) - 1;
  const maxY = Math.ceil((snap.camera.y + snap.viewport.height) / snap.tileSize) - 1;
  const minDistance = options.minDistance ?? 1;
  const maxDistance = options.maxDistance ?? Number.POSITIVE_INFINITY;
  const tiles: ReachableTile[] = [];
  for (let y = Math.max(0, minY); y <= Math.min(height - 1, maxY); y += 1) {
    for (let x = Math.max(0, minX); x <= Math.min(width - 1, maxX); x += 1) {
      const distance = distances[y * width + x];
      if (distance < minDistance || distance > maxDistance) continue;
      tiles.push({ x, y, distance });
    }
  }
  return tiles;
}

/** Primer tile visible (dentro del viewport actual) del tipo pedido. */
export function findVisibleTile(
  snap: GameSnapshot,
  wanted: 'wall' | 'floor',
): { x: number; y: number } {
  const minX = Math.floor(snap.camera.x / snap.tileSize);
  const minY = Math.floor(snap.camera.y / snap.tileSize);
  const maxX = Math.ceil((snap.camera.x + snap.viewport.width) / snap.tileSize) - 1;
  const maxY = Math.ceil((snap.camera.y + snap.viewport.height) / snap.tileSize) - 1;
  for (let y = Math.max(0, minY); y <= Math.min(snap.grid.height - 1, maxY); y += 1) {
    for (let x = Math.max(0, minX); x <= Math.min(snap.grid.width - 1, maxX); x += 1) {
      if (snap.grid.tiles[y * snap.grid.width + x] === wanted) return { x, y };
    }
  }
  throw new Error(`No hay ningún tile ${wanted} en el viewport.`);
}

/**
 * Abre el host en modo test y sustituye la partida por un estado BSP construido
 * en Node con el generador histórico. Los specs anteriores a TASK-0046 fijan
 * coordenadas y recuentos de BSP; el juego normal usa `growth` por defecto.
 *
 * No relaja aserciones: el estado cargado es el mismo `createInitialState` con
 * `BspMapGenerator`, expuesto por el hook `?test=1` de `window.__game.setup`.
 */
export interface BspStateOptions {
  /** Reposiciona al jugador y reinicia su origen, sin tocar el mapa. */
  readonly player?: Position;
  /** Sustituye las unidades enemigas del estado cargado. */
  readonly enemies?: GameState['enemies'];
  /** Fija el RNG de combate para un resultado determinista. */
  readonly rng?: GameState['rng'];
}

export async function openBspState(
  page: Page,
  seed: number = DEFAULT_MAP_SEED,
  url = `/?seed=${seed}&test=1`,
  options: BspStateOptions = {},
): Promise<GameSnapshot> {
  const target = new URL(url, 'http://127.0.0.1:4173');
  target.searchParams.set('test', '1');
  if (!target.searchParams.has('seed')) target.searchParams.set('seed', String(seed));
  await page.goto(`${target.pathname}${target.search}`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
  let state = createInitialState({ seed, generator: new BspMapGenerator() });
  if (options.player) {
    const player = state.players[0];
    state = {
      ...state,
      players: [
        { ...player, x: options.player.x, y: options.player.y, home: { ...options.player } },
      ],
    };
  }
  if (options.enemies) state = { ...state, enemies: options.enemies };
  if (options.rng) state = { ...state, rng: options.rng };
  const loaded = await page.evaluate(
    async (next) => {
      // El generador BSP se importa solo en el contexto de test del navegador;
      // producción no lo incluye en el bundle.
      const moduleUrl = '/src/game/index.ts';
      const module = (await import(/* @vite-ignore */ moduleUrl)) as {
        BspMapGenerator: new () => MapGenerator;
      };
      const generator = new module.BspMapGenerator();
      return window.__game!.setup!(next, generator);
    },
    JSON.parse(JSON.stringify(state)),
  );
  await settle(page);
  return loaded;
}

/**
 * Carga el BSP de referencia y deja únicamente al enemigo pedido. Los tests que
 * preparan un combate necesitan un estado controlado sin que el resto de la
 * guardia converja durante el trayecto; no cambia aserciones ni reglas.
 */
export async function openBspWithOnlyEnemy(
  page: Page,
  seed: number,
  enemyId: string,
  options: Omit<BspStateOptions, 'enemies'> = {},
): Promise<GameSnapshot> {
  const base = await openBspState(page, seed);
  const enemy = base.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) throw new Error(`Falta ${enemyId} en el BSP de la semilla ${seed}`);
  return openBspState(page, seed, undefined, { ...options, enemies: [enemy] });
}

/**
 * Lleva el cursor al tile `(x, y)` con flechas reales. El cursor cruza muros y
 * unidades; si el destino no está en el viewport o una pulsación no cambia el
 * cursor, falla en vez de esperar indefinidamente.
 */
export async function moveCursorTo(page: Page, x: number, y: number): Promise<void> {
  for (let guard = 0; guard < 64; guard += 1) {
    const cursor = (await snapshot(page)).cursor;
    if (cursor.x === x && cursor.y === y) return;
    if (!cursor.visible) {
      throw new Error(`El cursor está oculto y no puede ir a (${x},${y})`);
    }

    const key =
      cursor.x < x
        ? 'ArrowRight'
        : cursor.x > x
          ? 'ArrowLeft'
          : cursor.y < y
            ? 'ArrowDown'
            : 'ArrowUp';
    await page.keyboard.press(key);

    const next = (await snapshot(page)).cursor;
    if (next.x === cursor.x && next.y === cursor.y) {
      throw new Error(
        `El cursor no puede pasar de (${cursor.x},${cursor.y}) hacia (${x},${y})`,
      );
    }
  }

  throw new Error(`No se alcanzó el cursor en (${x},${y}).`);
}

export async function dispatchCommand(page: Page, command: Command) {
  return page.evaluate((cmd) => window.__game!.dispatch(cmd), command);
}

/**
 * Despacha un comando y congela el reloj de presentación en la misma tarea del
 * navegador. `dispatch` arranca la animación y programa el rAF real; si el
 * siguiente `page.evaluate` llega tarde, ese rAF puede adelantar el reloj antes
 * de muestrear los cues. Congelar con `advance(0)` dentro del mismo evaluate
 * elimina la ventana: no hay frame real entre el dispatch y el muestreo.
 */
export async function dispatchFrozen(page: Page, command: Command) {
  return page.evaluate((cmd) => {
    const result = window.__game!.dispatch(cmd);
    window.__game!.advance(0);
    return result;
  }, command);
}

/**
 * Completa de forma determinista cualquier animación de presentación pendiente.
 * El motor ya está en el estado final; esto solo adelanta HUD, cámara, cursor y
 * overlay para que las aserciones existentes sigan siendo sobre el resultado.
 */
export async function settle(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.advance(1_000_000));
}

/**
 * Avanza el reloj de presentación hasta que el cue pedido esté activo. No
 * completa la animación: los tests pueden comprobar el aviso o el marcador en
 * el instante de su cue sin adelantar el resto de la timeline.
 *
 * El reloj se congela antes de leer los cues: el rAF real no debe seguir
 * avanzando la animación mientras el test busca su ventana.
 */
export async function advanceToCue(page: Page, kind: string): Promise<GameSnapshot> {
  return page.evaluate((wanted) => {
    const game = window.__game!;
    // Modo manual desde el primer instante; conserva los cues ya activos en 0.
    game.advance(0);
    for (let guard = 0; guard < 800; guard += 1) {
      const snap = game.snapshot();
      if (snap.animation.cues.some((cue) => cue.kind === wanted)) return snap;
      if (!snap.animation.animating) {
        throw new Error(`La animación terminó antes del cue ${wanted}`);
      }
      game.advance(25);
    }
    throw new Error(`No se alcanzó el cue ${wanted} en 20 s de presentación`);
  }, kind);
}

/**
 * Espera a que el canvas y las fuentes estén estables antes de capturar.
 *
 * Compara dos `toDataURL('image/png')` consecutivos separados por un frame y
 * exige `stableFrames` muestras idénticas seguidas. No cambia el estado del
 * juego: solo da tiempo a que el rasterizado y la composición se asienten.
 */
export async function waitForCanvasStable(
  page: Page,
  selector = '#game-canvas',
  stableFrames = 2,
): Promise<void> {
  await page.evaluate(
    async ({ selector: target, stableFrames: required }) => {
      await document.fonts.ready;
      const canvas = document.querySelector<HTMLCanvasElement>(target);
      if (!canvas) throw new Error(`Falta ${target} para esperar estabilidad`);
      const nextFrame = (): Promise<void> =>
        new Promise((resolve) => requestAnimationFrame(() => resolve()));
      let previous = canvas.toDataURL('image/png');
      let stable = 0;
      for (let attempt = 0; attempt < 120 && stable < required; attempt += 1) {
        await nextFrame();
        const current = canvas.toDataURL('image/png');
        stable = current === previous ? stable + 1 : 0;
        previous = current;
      }
      if (stable < required) {
        throw new Error(`${target} no se estabilizó en 120 frames`);
      }
    },
    { selector, stableFrames },
  );
}

/**
 * Promueve el panel del HUD a su propia capa antes de capturar. Chromium puede
 * rasterizar el borde redondeado con una diferencia de 1 nivel en 4 píxeles
 * entre cargas (verificado: mismo rect, mismo canvas); la capa fija esa
 * composición sin cambiar el contenido, el estado del juego ni el criterio de
 * comparación byte a byte.
 */
export async function stabilizeHudPaint(page: Page): Promise<void> {
  await page.evaluate(() => {
    const hud = document.querySelector<HTMLElement>('[data-testid="hud"]');
    if (hud) hud.style.willChange = 'transform';
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Captura una captura de página completa estable: repite `page.screenshot`
 * hasta obtener dos buffers consecutivos idénticos byte a byte. No cambia el
 * criterio de comparación entre cargas; solo asegura que la captura no recoge
 * un rasterizado transitorio.
 */
export async function stableScreenshot(
  page: Page,
  options: Parameters<Page['screenshot']>[0] = {},
): Promise<Buffer> {
  const settings = { fullPage: true, animations: 'disabled' as const, ...options };
  let previous = await page.screenshot(settings);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await page.screenshot(settings);
    if (Buffer.compare(previous, current) === 0) return current;
    previous = current;
  }
  throw new Error('La captura no se estabilizó tras 12 intentos');
}

/** Ejecuta un comando y falla si el motor lo rechaza (evita rutas bloqueadas). */
export async function dispatchAccepted(page: Page, command: Command): Promise<void> {
  const result = await dispatchCommand(page, command);
  expect(
    result.events.filter((event) => event.type === 'CommandRejected'),
    `El comando ${command.type} debe ser aceptado`,
  ).toEqual([]);
  await settle(page);
}

export async function move(page: Page, dx: number, dy: number): Promise<void> {
  await dispatchAccepted(page, { type: 'Move', unitId: 'player-1', dx, dy });
}

export async function endTurn(page: Page): Promise<void> {
  await dispatchAccepted(page, { type: 'EndTurn' });
}

export async function restart(page: Page): Promise<void> {
  await dispatchAccepted(page, { type: 'Restart' });
}

/** Turnos que `ensureMp` puede terminar como máximo antes de fallar. */
const MAX_MP_TURNS = 8;

/**
 * Espera a tener al menos `minimum` MP sin mover al jugador. Si falta MP,
 * termina el turno con `EndTurn` real y adelanta la presentación con `settle`.
 * El bucle está acotado: falla si la partida deja de estar en `playing` o si el
 * MP no se alcanza en `MAX_MP_TURNS` turnos. Devuelve el snapshot alcanzado.
 */
export async function ensureMp(page: Page, minimum: number): Promise<GameSnapshot> {
  for (let turns = 0; turns <= MAX_MP_TURNS; turns += 1) {
    const snap = await snapshot(page);
    expect(
      snap.status,
      `La partida dejó de estar en playing (${snap.status}) esperando ${minimum} MP`,
    ).toBe('playing');
    if (snap.players[0].mp >= minimum) return snap;
    if (turns === MAX_MP_TURNS) break;
    await endTurn(page);
  }

  throw new Error(
    `No se alcanzaron ${minimum} MP tras ${MAX_MP_TURNS} turnos sin moverse.`,
  );
}

/**
 * Lleva al jugador hasta `(tx, ty)` con comandos reales aceptados. La ruta se
 * calcula con BFS sobre `snapshot.grid.tiles` y se recalcula en cada paso porque
 * la fase enemiga mueve al goblin. Cuando no quedan MP se termina el turno.
 *
 * No teletransporta ni inyecta estado.
 */
export async function walkTo(page: Page, tx: number, ty: number): Promise<void> {
  await page.evaluate(
    ({ targetX, targetY }) => {
      const game = window.__game!;
      const width = game.snapshot().grid.width;

      const bfsPath = (
        grid: GameSnapshot['grid'],
        start: { x: number; y: number },
        goal: { x: number; y: number },
        blocked: { x: number; y: number },
      ): Array<{ x: number; y: number }> | null => {
        const cellKey = (x: number, y: number): number => y * width + x;
        const previous = new Int32Array(width * grid.height).fill(-1);
        const seen = new Uint8Array(width * grid.height);
        const startIndex = cellKey(start.x, start.y);
        seen[startIndex] = 1;
        const queue: number[] = [startIndex];
        const directions = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ] as const;

        const reconstruct = (index: number): Array<{ x: number; y: number }> => {
          const path: Array<{ x: number; y: number }> = [];
          let current = index;
          while (current !== startIndex) {
            const x = current % width;
            const y = (current - x) / width;
            path.push({ x, y });
            current = previous[current];
          }
          path.push({ x: start.x, y: start.y });
          return path.reverse();
        };

        for (let head = 0; head < queue.length; head += 1) {
          const current = queue[head];
          const x = current % width;
          const y = (current - x) / width;
          if (x === goal.x && y === goal.y) return reconstruct(current);

          for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
            if (grid.tiles[cellKey(nx, ny)] !== 'floor') continue;
            if (nx === blocked.x && ny === blocked.y) continue;
            const nextIndex = cellKey(nx, ny);
            if (seen[nextIndex]) continue;
            seen[nextIndex] = 1;
            previous[nextIndex] = current;
            queue.push(nextIndex);
          }
        }

        return null;
      };

      for (let guard = 0; guard < 2000; guard += 1) {
        const snap = game.snapshot();
        const player = snap.players[0];
        if (player.x === targetX && player.y === targetY) {
          game.advance(1_000_000);
          return;
        }
        if (snap.status !== 'playing') {
          throw new Error(
            `La partida terminó (${snap.status}) antes de llegar a (${targetX},${targetY})`,
          );
        }

        if (player.mp > 0) {
          const path = bfsPath(
            snap.grid,
            { x: player.x, y: player.y },
            { x: targetX, y: targetY },
            snap.enemies[0] && snap.enemies[0].hp > 0
              ? { x: snap.enemies[0].x, y: snap.enemies[0].y }
              : { x: -1, y: -1 },
          );
          if (path && path.length > 1) {
            const next = path[1];
            const result = game.dispatch({
              type: 'Move',
              unitId: player.id,
              dx: next.x - player.x,
              dy: next.y - player.y,
            });
            if (!result.events.some((event) => event.type === 'CommandRejected')) continue;
          }
        }

        game.dispatch({ type: 'EndTurn' });
      }

      throw new Error(`No se alcanzó (${targetX},${targetY}) con comandos aceptados.`);
    },
    { targetX: tx, targetY: ty },
  );
}

/**
 * Acerca al jugador al enemigo con comandos reales (una casilla por `Move` y
 * `EndTurn` cuando no quedan MP). Calcula la ruta con BFS sobre la rejilla y la
 * recalcula tras cada fase enemiga. No inyecta estados ni teletransporta.
 */
export type ApproachSide = 'north' | 'east' | 'south' | 'west';

export async function approachEnemy(
  page: Page,
  preferredSide?: ApproachSide,
): Promise<void> {
  const visionByType: Record<string, number> = Object.fromEntries(
    Object.entries(BESTIARY).map(([type, definition]) => [type, definition.vision]),
  );

  await page.evaluate(({ side, visionByType: vision }) => {
    const game = window.__game!;
    const width = game.snapshot().grid.width;

    /**
     * Dijkstra sobre la rejilla con un coste extra en las casillas dentro de la
     * visión de otros enemigos. La IA alertada gasta su MP (5/4/6 por tipo):
     * rodear una sala evita que el jugador termine la fase a tiro y llegue
     * muerto al objetivo.
     */
    const bfsNextStep = (
      grid: GameSnapshot['grid'],
      start: { x: number; y: number },
      enemy: { x: number; y: number },
      blocked: ReadonlySet<number>,
      dangerPenalty: (x: number, y: number) => number,
    ): { dx: number; dy: number } | null => {
      const size = width * grid.height;
      const cellKey = (x: number, y: number): number => y * width + x;
      const previous = new Int32Array(size).fill(-1);
      const cost = new Float64Array(size).fill(Number.POSITIVE_INFINITY);
      const settled = new Uint8Array(size);
      const startIndex = cellKey(start.x, start.y);
      cost[startIndex] = 0;
      const frontier: number[] = [startIndex];
      const directions = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const;

      // Prefiere una casilla ortogonalmente adyacente para que los tests de
      // orientación no dependan de un contacto en diagonal. Si se pide un lado,
      // se intenta primero esa casilla y se cae a cualquier ortogonal.
      const preferred =
        side === undefined
          ? null
          : side === 'north'
            ? { x: enemy.x, y: enemy.y - 1 }
            : side === 'east'
              ? { x: enemy.x + 1, y: enemy.y }
              : side === 'south'
                ? { x: enemy.x, y: enemy.y + 1 }
                : { x: enemy.x - 1, y: enemy.y };
      const preferredIndex =
        preferred !== null &&
        preferred.x >= 0 &&
        preferred.y >= 0 &&
        preferred.x < grid.width &&
        preferred.y < grid.height &&
        grid.tiles[cellKey(preferred.x, preferred.y)] === 'floor' &&
        !blocked.has(cellKey(preferred.x, preferred.y))
          ? cellKey(preferred.x, preferred.y)
          : null;

      const firstStep = (goal: number): { dx: number; dy: number } => {
        let first = goal;
        while (previous[first] !== startIndex && previous[first] !== -1) {
          first = previous[first];
        }
        const firstX = first % width;
        const firstY = (first - firstX) / width;
        return { dx: firstX - start.x, dy: firstY - start.y };
      };

      let fallbackIndex: number | null = null;
      let fallbackCost = Number.POSITIVE_INFINITY;

      while (frontier.length > 0) {
        let best = 0;
        for (let index = 1; index < frontier.length; index += 1) {
          if (cost[frontier[index]] < cost[frontier[best]]) best = index;
        }
        const current = frontier.splice(best, 1)[0];
        if (settled[current]) continue;
        settled[current] = 1;

        if (preferredIndex !== null && current === preferredIndex) {
          return firstStep(current);
        }

        const x = current % width;
        const y = (current - x) / width;
        const distance = Math.max(Math.abs(x - enemy.x), Math.abs(y - enemy.y));
        const orthogonal = x === enemy.x || y === enemy.y;
        if (
          preferredIndex === null &&
          distance === 1 &&
          orthogonal &&
          cost[current] < fallbackCost
        ) {
          fallbackCost = cost[current];
          fallbackIndex = current;
        }

        for (const [dx, dy] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
          if (grid.tiles[cellKey(nx, ny)] !== 'floor') continue;
          if (nx === enemy.x && ny === enemy.y) continue;
          const nextIndex = cellKey(nx, ny);
          if (blocked.has(nextIndex) || settled[nextIndex]) continue;
          const nextCost = cost[current] + 1 + dangerPenalty(nx, ny);
          if (nextCost < cost[nextIndex]) {
            cost[nextIndex] = nextCost;
            previous[nextIndex] = current;
            frontier.push(nextIndex);
          }
        }
      }

      return fallbackIndex === null ? null : firstStep(fallbackIndex);
    };

    let lastKey = '';
    let stuck = 0;

    for (let guard = 0; guard < 600; guard += 1) {
      const snap = game.snapshot();
      if (snap.status !== 'playing') {
        game.advance(1_000_000);
        return;
      }
      const player = snap.players[0];
      const enemy = snap.enemies[0];
      const key = `${player.x},${player.y},${player.mp}`;
      if (key === lastKey) stuck += 1;
      else {
        stuck = 0;
        lastKey = key;
      }
      const distance = Math.max(
        Math.abs(player.x - enemy.x),
        Math.abs(player.y - enemy.y),
      );
      const orthogonal = player.x === enemy.x || player.y === enemy.y;
      const atPreferredSide =
        side === undefined
          ? distance === 1 && orthogonal
          : side === 'north'
            ? player.x === enemy.x && player.y === enemy.y - 1
            : side === 'east'
              ? player.x === enemy.x + 1 && player.y === enemy.y
              : side === 'south'
                ? player.x === enemy.x && player.y === enemy.y + 1
                : player.x === enemy.x - 1 && player.y === enemy.y;
      if (atPreferredSide) {
        game.advance(1_000_000);
        return;
      }

      // Si rodear la visión deja al helper oscilando, fuerza un avance hacia una
      // casilla libre adyacente al objetivo (nunca ataca al objetivo).
      if (stuck >= 6) {
        const goal = [
          { x: enemy.x, y: enemy.y - 1 },
          { x: enemy.x + 1, y: enemy.y },
          { x: enemy.x, y: enemy.y + 1 },
          { x: enemy.x - 1, y: enemy.y },
        ].find(
          (tile) =>
            tile.x >= 0 &&
            tile.y >= 0 &&
            tile.x < width &&
            tile.y < snap.grid.height &&
            snap.grid.tiles[tile.y * width + tile.x] === 'floor' &&
            !snap.enemies.some(
              (candidate) =>
                candidate.hp > 0 && candidate.x === tile.x && candidate.y === tile.y,
            ),
        );
        if (goal) {
          const result = game.dispatch({
            type: 'MoveTo',
            unitId: player.id,
            target: goal,
          });
          stuck = 0;
          if (!result.events.some((event) => event.type === 'CommandRejected')) {
            continue;
          }
        }
      }

      // La IA alertada persigue con el MP de su tipo: si otro enemigo se
      // acerca, se elimina con `MoveTo` (que ataca al llegar) antes de que
      // acumule golpes.
      // El objetivo del helper se excluye para que el test lo ataque después.
      if (player.actions.remaining > 0) {
        const chaser = snap.enemies
          .filter((candidate) => candidate.hp > 0 && candidate.id !== enemy.id)
          .map((candidate) => ({
            candidate,
            distance: Math.max(
              Math.abs(player.x - candidate.x),
              Math.abs(player.y - candidate.y),
            ),
          }))
          .filter((entry) => entry.distance <= 8)
          .sort(
            (a, b) =>
              a.distance - b.distance ||
              a.candidate.id.localeCompare(b.candidate.id),
          )[0]?.candidate;
        if (chaser) {
          const result = game.dispatch({
            type: 'MoveTo',
            unitId: player.id,
            target: { x: chaser.x, y: chaser.y },
          });
          if (!result.events.some((event) => event.type === 'CommandRejected')) continue;
        }
      }

      // Tras atacar, el MP restante se emplea en alejarse: un enemigo alertado
      // recorre 4 tiles y no conviene terminar la fase a su alcance.
      if (player.actions.remaining === 0 && player.mp > 0) {
        const living = snap.enemies.filter((candidate) => candidate.hp > 0);
        const distanceToAll = (x: number, y: number): number =>
          living.reduce(
            (minimum, candidate) =>
              Math.min(
                minimum,
                Math.max(Math.abs(x - candidate.x), Math.abs(y - candidate.y)),
              ),
            Number.POSITIVE_INFINITY,
          );
        const currentScore = distanceToAll(player.x, player.y);
        let away:
          | { readonly dx: number; readonly dy: number; readonly score: number }
          | undefined;
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
          [1, -1],
          [1, 1],
          [-1, 1],
          [-1, -1],
        ] as const) {
          const nx = player.x + dx;
          const ny = player.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= snap.grid.height) continue;
          if (snap.grid.tiles[ny * width + nx] !== 'floor') continue;
          if (living.some((candidate) => candidate.x === nx && candidate.y === ny)) continue;
          if (dx !== 0 && dy !== 0) {
            const sideAX = player.x + dx;
            const sideAY = player.y;
            const sideBX = player.x;
            const sideBY = player.y + dy;
            const free = (x: number, y: number): boolean =>
              x >= 0 &&
              y >= 0 &&
              x < width &&
              y < snap.grid.height &&
              snap.grid.tiles[y * width + x] === 'floor' &&
              !living.some((candidate) => candidate.x === x && candidate.y === y);
            if (!free(sideAX, sideAY) || !free(sideBX, sideBY)) continue;
          }
          const score = distanceToAll(nx, ny);
          if (score > currentScore && (away === undefined || score > away.score)) {
            away = { dx, dy, score };
          }
        }
        if (away) {
          const result = game.dispatch({
            type: 'Move',
            unitId: player.id,
            dx: away.dx,
            dy: away.dy,
          });
          if (!result.events.some((event) => event.type === 'CommandRejected')) continue;
        }
      }

      if (player.mp > 0) {
        const blocked = new Set(
          snap.enemies
            .filter((candidate) => candidate.hp > 0 && candidate.id !== enemy.id)
            .map((candidate) => candidate.y * width + candidate.x),
        );
        const dangerPenalty = (x: number, y: number): number => {
          let penalty = 0;
          for (const other of snap.enemies) {
            if (other.hp <= 0 || other.id === enemy.id || other.enemyType === null) {
              continue;
            }
            const radius = vision[other.enemyType] ?? 0;
            if (
              Math.max(Math.abs(x - other.x), Math.abs(y - other.y)) <= radius
            ) {
              penalty += 40;
            }
          }
          return penalty;
        };
        const step = bfsNextStep(snap.grid, player, enemy, blocked, dangerPenalty);
        if (step && (step.dx !== 0 || step.dy !== 0)) {
          const result = game.dispatch({
            type: 'Move',
            unitId: player.id,
            dx: step.dx,
            dy: step.dy,
          });
          if (!result.events.some((event) => event.type === 'CommandRejected')) continue;
        }
      }

      game.dispatch({ type: 'EndTurn' });
    }

    throw new Error('No se alcanzó la adyacencia con el enemigo.');
  }, { side: preferredSide, visionByType });
}

/**
 * Derrota a todos los enemigos vivos con comandos reales. `preserveId` permite
 * dejar vivo a un enemigo concreto para que el test lo remate por su cuenta.
 */
export async function defeatAllEnemies(
  page: Page,
  maxCommands = 400,
  preserveId?: string | readonly string[],
): Promise<{ readonly snapshot: GameSnapshot; readonly events: readonly GameEvent[] }> {
  const preserveIds =
    preserveId === undefined
      ? []
      : typeof preserveId === 'string'
        ? [preserveId]
        : [...preserveId];
  const result = await page.evaluate(({ limit, preserveIds: preservedList }) => {
    const preserved = new Set(preservedList);
    const game = window.__game!;
    const width = game.snapshot().grid.width;
    const events: GameEvent[] = [];

    const chebyshev = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

    /**
     * Retirada con búsqueda en anchura: elige la casilla alcanzable con el MP
     * que maximiza la distancia al enemigo vivo más cercano y la recorre. La IA
     * alertada gasta todo su MP por tipo, así que retirarse un solo tile ya no
     * basta.
     */
    const retreat = (): void => {
      const snap = game.snapshot();
      const player = snap.players[0];
      const living = snap.enemies.filter((enemy) => enemy.hp > 0);
      if (living.length === 0 || player.mp <= 0) return;

      const occupied = new Set(living.map((enemy) => `${enemy.x},${enemy.y}`));
      const free = (x: number, y: number): boolean =>
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < snap.grid.height &&
        snap.grid.tiles[y * width + x] === 'floor' &&
        !occupied.has(`${x},${y}`);
      const cells: Array<{ x: number; y: number; steps: Array<[number, number]> }> = [
        { x: player.x, y: player.y, steps: [] },
      ];
      const visited = new Set<string>([`${player.x},${player.y}`]);
      const directions = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ] as const;

      for (let head = 0; head < cells.length; head += 1) {
        const current = cells[head];
        if (current.steps.length >= player.mp) continue;
        for (const [dx, dy] of directions) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (!free(nx, ny)) continue;
          if (dx !== 0 && dy !== 0) {
            if (!free(current.x + dx, current.y) || !free(current.x, current.y + dy)) {
              continue;
            }
          }
          const key = `${nx},${ny}`;
          if (visited.has(key)) continue;
          visited.add(key);
          cells.push({ x: nx, y: ny, steps: [...current.steps, [dx, dy]] });
        }
      }

      const score = (cell: { x: number; y: number }): number =>
        living.reduce(
          (minimum, enemy) =>
            Math.min(
              minimum,
              Math.max(
                Math.abs(cell.x - enemy.x),
                Math.abs(cell.y - enemy.y),
              ),
            ),
          Number.POSITIVE_INFINITY,
        );
      let best = cells[0];
      let bestScore = score(cells[0]);
      for (const cell of cells) {
        const candidate = score(cell);
        if (candidate > bestScore) {
          best = cell;
          bestScore = candidate;
        }
      }

      for (const [dx, dy] of best.steps) {
        const result = game.dispatch({
          type: 'Move',
          unitId: player.id,
          dx,
          dy,
        });
        events.push(...result.events);
        if (result.events.some((event) => event.type === 'CommandRejected')) return;
      }
    };

    for (let guard = 0; guard < limit; guard += 1) {
      const snap = game.snapshot();
      if (snap.status !== 'playing') return { status: snap.status, events };

      const player = snap.players[0];
      const living = snap.enemies.filter(
        (enemy) => enemy.hp > 0 && !preserved.has(enemy.id),
      );
      if (living.length === 0) {
        return { status: snap.status, events };
      }

      let target = living[0];
      for (const enemy of living) {
        const distance = chebyshev(player, enemy);
        const best = chebyshev(player, target);
        if (distance < best || (distance === best && enemy.id < target.id)) target = enemy;
      }

      if (player.actions.remaining > 0 && chebyshev(player, target) === 1) {
        const attack = game.dispatch({
          type: 'Attack',
          unitId: player.id,
          targetId: target.id,
        });
        events.push(...attack.events);
        if (!attack.events.some((event) => event.type === 'CommandRejected')) {
          retreat();
          const end = game.dispatch({ type: 'EndTurn' });
          events.push(...end.events);
          continue;
        }
      }

      if (player.actions.remaining > 0 && player.mp > 0) {
        const move = game.dispatch({
          type: 'MoveTo',
          unitId: player.id,
          target: { x: target.x, y: target.y },
        });
        events.push(...move.events);
        if (!move.events.some((event) => event.type === 'CommandRejected')) continue;
      }

      if (player.actions.remaining === 0) retreat();
      const end = game.dispatch({ type: 'EndTurn' });
      events.push(...end.events);
    }

    throw new Error('No se derrotaron todos los enemigos con comandos reales.');
  }, { limit: maxCommands, preserveIds });

  await settle(page);
  return { snapshot: await snapshot(page), events: result.events };
}

/** Rango de tiles visibles para la cámara actual, calculado por el host. */
export function visibleRange(snap: GameSnapshot): TileRange {
  return visibleTileRange(snap.camera, snap.viewport, snap.grid, snap.tileSize);
}

/**
 * Gasta un `Move` real en la dirección libre que más aleja al jugador del
 * enemigo. Devuelve `false` si no hay ninguna retirada válida. No teletransporta
 * ni inyecta estado.
 */
export async function moveAwayFromEnemy(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const game = window.__game!;
    const snap = game.snapshot();
    const player = snap.players[0];
    const enemy = snap.enemies[0];
    const width = snap.grid.width;
    const directions = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ] as const;

    const tile = (x: number, y: number): string | undefined =>
      x < 0 || y < 0 || x >= snap.grid.width || y >= snap.grid.height
        ? undefined
        : snap.grid.tiles[y * width + x];

    const free = (x: number, y: number): boolean =>
      tile(x, y) === 'floor' &&
      !(x === enemy.x && y === enemy.y) &&
      !(x === player.x && y === player.y);

    const canStep = (dx: number, dy: number): boolean => {
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (!free(nx, ny)) return false;
      if (dx !== 0 && dy !== 0) {
        if (!free(player.x + dx, player.y) || !free(player.x, player.y + dy)) return false;
      }
      return true;
    };

    const distance = (x: number, y: number): number =>
      Math.max(Math.abs(x - enemy.x), Math.abs(y - enemy.y));

    const candidates = directions
      .filter(([dx, dy]) => canStep(dx, dy))
      .sort(
        ([adx, ady], [bdx, bdy]) =>
          distance(player.x + bdx, player.y + bdy) -
          distance(player.x + adx, player.y + ady),
      );

    for (const [dx, dy] of candidates) {
      const result = game.dispatch({
        type: 'Move',
        unitId: player.id,
        dx,
        dy,
      });
      if (!result.events.some((event) => event.type === 'CommandRejected')) {
        game.advance(1_000_000);
        return true;
      }
    }

    return false;
  });
}

/**
 * Deja al jugador adyacente al enemigo con al menos `minimumMp` MP y acción.
 * Si ya está adyacente pero le falta MP o acción, termina el turno (el enemigo
 * ataca) y espera al siguiente turno del jugador. Usa solo `EndTurn` real.
 */
export async function ensureAdjacentWithMp(
  page: Page,
  minimumMp: number,
): Promise<GameSnapshot> {
  for (let guard = 0; guard < 3; guard += 1) {
    const snap = await snapshot(page);
    const player = snap.players[0];
    const enemy = snap.enemies[0];
    const distance = Math.max(
      Math.abs(player.x - enemy.x),
      Math.abs(player.y - enemy.y),
    );
    if (distance !== 1) {
      throw new Error(`El jugador no está adyacente al enemigo (distancia ${distance}).`);
    }
    if (player.mp >= minimumMp && player.actions.remaining > 0) return snap;
    await endTurn(page);
  }

  throw new Error(`No se alcanzaron ${minimumMp} MP y acción junto al enemigo.`);
}

/**
 * Retrocede con `Move` reales hasta que el plan sobre el enemigo cueste más que
 * el MP restante, manteniendo al enemigo dentro del viewport. Solo mueve al
 * jugador cuando el plan todavía cabe en el MP; si no queda MP, termina turno.
 */
export async function retreatEnemyOutOfReach(
  page: Page,
  maxSteps = 10,
): Promise<GameSnapshot> {
  for (let step = 0; step < maxSteps; step += 1) {
    let snap = await snapshot(page);
    const enemy = snap.enemies[0];
    await moveCursorTo(page, enemy.x, enemy.y);
    snap = await snapshot(page);
    if (snap.cursor.kind !== 'enemy') {
      throw new Error('El cursor dejó de apuntar al enemigo durante la retirada.');
    }
    if (snap.players[0].mp > 0 && snap.cursor.path.length > snap.players[0].mp) {
      return snap;
    }

    if (snap.players[0].mp === 0) {
      await endTurn(page);
      continue;
    }

    const moved = await moveAwayFromEnemy(page);
    if (!moved) {
      throw new Error('No hay ninguna retirada válida para alejarse del enemigo.');
    }
  }

  throw new Error('No se consiguió que el enemigo quedara fuera de alcance.');
}
