import { describe, expect, it } from 'vitest';
import { generateChamberPlan, type ChamberPlan } from '../../../src/game/chambers/core';

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

function connectivity(plan: ChamberPlan): {
  percentage: number;
  components: number;
} {
  const total = plan.tiles.filter((tile) => tile === 'floor').length;
  const seen = new Uint8Array(plan.tiles.length);
  let components = 0;
  let largest = 0;
  for (let start = 0; start < plan.tiles.length; start += 1) {
    if (plan.tiles[start] !== 'floor' || seen[start]) continue;
    components += 1;
    let size = 0;
    const queue = [start];
    seen[start] = 1;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      size += 1;
      const x = current % plan.width;
      const y = Math.floor(current / plan.width);
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= plan.width || ny >= plan.height) continue;
        const next = ny * plan.width + nx;
        if (plan.tiles[next] !== 'floor' || seen[next]) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
    largest = Math.max(largest, size);
  }
  return {
    percentage: total === 0 ? 0 : (largest / total) * 100,
    components,
  };
}

describe('barrido de 200 semillas de growth', () => {
  it('mantiene conectividad 100 %, sin islas y los recuentos de salas', () => {
    for (const seed of SEEDS) {
      const plan = generateChamberPlan(seed);
      const shape = connectivity(plan);
      expect(shape.components, `seed ${seed} · componentes`).toBe(1);
      expect(shape.percentage, `seed ${seed} · conectividad`).toBeCloseTo(100, 5);

      const cavern = plan.cavernRoomId !== null;
      if (cavern) {
        expect(plan.rooms.length, `seed ${seed} · caverna`).toBe(3);
      } else {
        expect(plan.rooms.length, `seed ${seed} · normal`).toBeGreaterThanOrEqual(4);
        expect(plan.rooms.length, `seed ${seed} · normal`).toBeLessThanOrEqual(6);
      }

      const wide = plan.corridors.filter((corridor) => corridor.width === 2).length;
      console.log(
        `seed=${seed} rooms=${plan.rooms.length} cavern=${cavern ? 'si' : 'no'} ` +
          `floor=${plan.tiles.filter((tile) => tile === 'floor').length} ` +
          `connect=${shape.percentage.toFixed(2)} loops=${plan.loops} ` +
          `doors=${plan.doors.length} wide=${wide}`,
      );
    }
  });
});
