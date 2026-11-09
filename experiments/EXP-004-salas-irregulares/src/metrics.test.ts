import { describe, expect, it } from 'vitest';
import { generateMap } from './generate';
import { computeMetrics } from './metrics';
import type { VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];

describe('métricas de la v2', () => {
  it('muestran puertas/bocas, acceso, N, P, términos, T y reparto', () => {
    for (const variant of VARIANTS) {
      const map = generateMap(variant, 279837264);
      const metrics = computeMetrics(map, 1.5);
      const byLabel = new Map(metrics.map((metric) => [metric.label, metric]));

      const doors = byLabel.get('Puertas');
      expect(doors?.value).toBe(`${map.stats.validDoors} válidas`);
      expect(String(doors?.hint)).toContain(`${map.stats.openMouths} bocas`);

      const access = byLabel.get('Acceso spawn');
      expect(access?.value).toBe(`${map.spawns.player.x},${map.spawns.player.y}`);
      expect(String(access?.hint)).toContain(`${map.stats.spawnHoles} huecos`);

      const enemies = byLabel.get('Enemigos T');
      expect(enemies?.value).toBe(map.stats.enemy.total);
      expect(String(enemies?.hint)).toContain(`N ${map.stats.enemy.surfaceN}`);
      expect(String(enemies?.hint)).toContain(`P ${map.stats.enemy.playersP}`);

      const share = byLabel.get('Reparto');
      expect(String(share?.value)).toBe(map.stats.enemy.perRoom.join('·'));

      const types = byLabel.get('Tipos');
      expect(String(types?.value)).toBe(
        `${map.stats.enemy.sentinels}S · ${map.stats.enemy.brutes}B · ${map.stats.enemy.cowards}C`,
      );
    }
  });
});
