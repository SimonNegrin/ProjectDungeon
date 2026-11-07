import { expect, type Page } from '@playwright/test';
import type { Command } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';

export async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
}

export async function dispatchCommand(page: Page, command: Command) {
  return page.evaluate((cmd) => window.__game!.dispatch(cmd), command);
}

/** Ejecuta un comando y falla si el motor lo rechaza (evita rutas bloqueadas). */
export async function dispatchAccepted(page: Page, command: Command): Promise<void> {
  const result = await dispatchCommand(page, command);
  expect(
    result.events.filter((event) => event.type === 'CommandRejected'),
    `El comando ${command.type} debe ser aceptado`,
  ).toEqual([]);
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
        if (player.x === targetX && player.y === targetY) return;
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
      if (snap.status !== 'playing') return;
      const player = snap.players[0];
      const enemy = snap.enemies[0];
      if (Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y)) <= 1) return;

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
