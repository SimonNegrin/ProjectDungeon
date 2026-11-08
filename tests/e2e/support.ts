import { expect, type Page } from '@playwright/test';
import type { Command } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { visibleTileRange, type TileRange } from '../../src/host/geometry';

export async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
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
 * Completa de forma determinista cualquier animación de presentación pendiente.
 * El motor ya está en el estado final; esto solo adelanta HUD, cámara, cursor y
 * overlay para que las aserciones existentes sigan siendo sobre el resultado.
 */
export async function settle(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.advance(1_000_000));
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
            { x: snap.enemies[0].x, y: snap.enemies[0].y },
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
export async function approachEnemy(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__game!;
    const width = game.snapshot().grid.width;

    const bfsNextStep = (
      grid: GameSnapshot['grid'],
      start: { x: number; y: number },
      enemy: { x: number; y: number },
    ): { dx: number; dy: number } | null => {
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

      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        const x = current % width;
        const y = (current - x) / width;

        if (Math.max(Math.abs(x - enemy.x), Math.abs(y - enemy.y)) === 1) {
          let first = current;
          while (previous[first] !== startIndex && previous[first] !== -1) {
            first = previous[first];
          }
          const firstX = first % width;
          const firstY = (first - firstX) / width;
          return { dx: firstX - start.x, dy: firstY - start.y };
        }

        for (const [dx, dy] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
          if (grid.tiles[cellKey(nx, ny)] !== 'floor') continue;
          if (nx === enemy.x && ny === enemy.y) continue;
          const nextIndex = cellKey(nx, ny);
          if (seen[nextIndex]) continue;
          seen[nextIndex] = 1;
          previous[nextIndex] = current;
          queue.push(nextIndex);
        }
      }

      return null;
    };

    for (let guard = 0; guard < 600; guard += 1) {
      const snap = game.snapshot();
      if (snap.status !== 'playing') {
        game.advance(1_000_000);
        return;
      }
      const player = snap.players[0];
      const enemy = snap.enemies[0];
      if (Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y)) <= 1) {
        game.advance(1_000_000);
        return;
      }

      if (player.mp > 0) {
        const step = bfsNextStep(snap.grid, player, enemy);
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
  });
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
    if (player.mp >= minimumMp && player.actionAvailable) return snap;
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
    if (snap.cursor.path.length > snap.players[0].mp) return snap;

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
