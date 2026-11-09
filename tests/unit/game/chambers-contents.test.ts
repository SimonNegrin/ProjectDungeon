import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../../../src/game/map';
import { hasLineOfSight } from '../../../src/game/perception';
import {
  SPAWN_MIN_TILES,
  chooseSpawnAccess,
  generateChamberPlan,
  maxComponentSize,
  partyCapacity,
  placeChamberContents,
  roomAreaOf,
} from '../../../src/game/chambers/core';

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

/**
 * Accesos según REQ-012 R-001: puertas más dos por pasillo ancho que toca la
 * sala. Se deriva de la geometría (`corridors`), no de `openMouths`, para que la
 * prueba no copie la implementación y detecte las bocas estrechas contadas de más.
 */
function accessesFor(
  roomId: number,
  plan: ReturnType<typeof generateChamberPlan>,
): number {
  let count = plan.doors.filter(
    (door) => door.roomA === roomId || door.roomB === roomId,
  ).length;
  for (const corridor of plan.corridors) {
    if (corridor.width !== 2) continue;
    if (
      (corridor.roomA ?? corridor.fromRoomId) === roomId ||
      (corridor.roomB ?? corridor.toRoomId) === roomId
    ) {
      count += 2;
    }
  }
  return count;
}

function capacityFor(
  room: Room,
  plan: ReturnType<typeof generateChamberPlan>,
): number {
  const access = chooseSpawnAccess(room, plan.doors, plan.openMouths);
  return partyCapacity(
    room,
    plan.doors,
    access,
    plan.tiles,
    plan.width,
    plan.height,
    plan.seed,
  );
}

describe('barrido de 200 semillas del plan con contenido', () => {
  it('mantiene spawn, entrada, salida, enemigos y reservas sin excepciones', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      for (const seed of SEEDS) {
        const plan = generateChamberPlan(seed);
        const contents = placeChamberContents(plan);
        const label = `seed ${seed}`;
        const spawnRoom = plan.rooms.find(
          (room) => room.id === contents.spawns.roomId,
        );
        expect(spawnRoom, `${label} · sala de spawn`).toBeDefined();

        expect(plan.width, `${label} · ancho`).toBe(22);
        expect(plan.height, `${label} · alto`).toBe(18);
        expect(contents.breakdown.total, `${label} · T`).toBeGreaterThanOrEqual(10);
        expect(contents.breakdown.total, `${label} · T`).toBeLessThanOrEqual(12);
        expect(contents.enemies.length, `${label} · fichas ≤ T`).toBeLessThanOrEqual(
          contents.breakdown.total,
        );

        expect(contents.spawns.party, `${label} · seis huecos`).toHaveLength(
          SPAWN_MIN_TILES,
        );
        expect(contents.spawns.player, `${label} · alias`).toEqual(
          contents.spawns.party[0],
        );
        expect(
          new Set(contents.spawns.party.map((cell) => `${cell.x},${cell.y}`)).size,
          `${label} · huecos distintos`,
        ).toBe(SPAWN_MIN_TILES);
        expect(
          maxComponentSize(contents.spawns.party),
          `${label} · componentes de spawn`,
        ).toBeLessThanOrEqual(2);

        const roomCells = new Set(
          (spawnRoom?.cells ?? []).map((cell) => `${cell.x},${cell.y}`),
        );
        for (const cell of contents.spawns.party) {
          expect(roomCells.has(`${cell.x},${cell.y}`), `${label} · hueco fuera`).toBe(
            true,
          );
        }

        const viable = plan.rooms.filter((room) => capacityFor(room, plan) >= SPAWN_MIN_TILES);
        if (viable.length > 0) {
          const minimumAccesses = Math.min(
            ...viable.map((room) => accessesFor(room.id, plan)),
          );
          expect(
            accessesFor(contents.spawns.roomId, plan),
            `${label} · protección`,
          ).toBe(minimumAccesses);

          const tied = viable.filter(
            (room) => accessesFor(room.id, plan) === minimumAccesses,
          );
          const largestArea = Math.max(...plan.rooms.map(roomAreaOf));
          if (tied.some((room) => roomAreaOf(room) !== largestArea)) {
            expect(
              roomAreaOf(spawnRoom as Room),
              `${label} · no mayor en empate`,
            ).not.toBe(largestArea);
          }
        }

        expect(contents.entrance, `${label} · entrada`).toEqual({
          roomId: contents.spawns.roomId,
          position: contents.spawns.player,
        });
        expect(contents.exit, `${label} · salida`).not.toBeNull();
        expect(contents.exit?.roomId, `${label} · salida en spawn`).not.toBe(
          contents.spawns.roomId,
        );
        if (contents.exit && contents.exit.roomId === contents.spawns.roomId) {
          throw new Error(`${label} · salida en la sala de spawn`);
        }
        if (contents.exit) {
          const farEnough = contents.exit.distance >= 2;
          expect(
            farEnough ||
              contents.warnings.some((warning) => /distancia ≥2/i.test(warning)),
            `${label} · distancia de salida`,
          ).toBe(true);
        }

        expect(
          maxComponentSize(contents.enemies),
          `${label} · componentes de enemigos`,
        ).toBeLessThanOrEqual(2);

        const grid = { width: plan.width, height: plan.height, tiles: plan.tiles };
        const seesSpawn = contents.enemies.some((enemy) =>
          contents.spawns.party.some((hole) => hasLineOfSight(grid, enemy, hole)),
        );
        if (seesSpawn) {
          expect(
            contents.warnings.some((warning) => /línea de visión/i.test(warning)),
            `${label} · LOS relajada sin aviso`,
          ).toBe(true);
        }

        for (const room of plan.rooms) {
          const inRoom = contents.enemies.filter((enemy) => enemy.roomId === room.id);
          if (room.id === contents.spawns.roomId) {
            expect(inRoom, `${label} · enemigos en spawn`).toHaveLength(0);
          } else {
            expect(contents.breakdown.perRoom[room.id], `${label} · presupuesto`).toBeGreaterThanOrEqual(1);
            expect(inRoom.length, `${label} · sala ${room.id} vacía`).toBeGreaterThanOrEqual(1);
          }
        }

        if (contents.exit) {
          const reserved = new Set([
            `${contents.exit.position.x},${contents.exit.position.y}`,
            `${contents.exit.access.x},${contents.exit.access.y}`,
          ]);
          for (const enemy of contents.enemies) {
            expect(
              reserved.has(`${enemy.x},${enemy.y}`),
              `${label} · enemigo en salida`,
            ).toBe(false);
          }
        }

        expect(JSON.parse(JSON.stringify(contents)), label).toEqual(contents);
        console.log(
          `${label} rooms=${plan.rooms.length} spawn=${contents.spawns.roomId} ` +
            `exit=${contents.exit?.roomId ?? 'null'}:${contents.exit?.kind ?? '-'}:` +
            `${contents.exit?.distance ?? '-'} total=${contents.breakdown.total} ` +
            `enemies=${contents.enemies.length} warnings=${contents.warnings.length}`,
        );
      }
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
