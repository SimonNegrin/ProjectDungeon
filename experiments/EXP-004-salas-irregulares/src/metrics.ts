/** Métricas de la página para comparar A/B/C sin duplicar la lógica del mapa. */

import type { Metric } from '../../_shell/types';
import type { GeneratedMap } from './types';

export function computeMetrics(map: GeneratedMap, generationMs = 0): Metric[] {
  const { stats } = map;
  const roles = `${stats.largeRooms}G · ${stats.mediumRooms}M · ${stats.smallRooms}P`;
  const lengths = stats.corridorLengths;
  const enemyTypes = ['sentinel', 'brute', 'coward']
    .map((type) => {
      const count = map.enemies.filter((enemy) => enemy.type === type).length;
      return count > 0 ? `${count} ${type}` : null;
    })
    .filter((value): value is string => value !== null)
    .join(' · ');

  return [
    {
      label: 'Salas',
      value: stats.roomCount,
      hint: `${stats.largeRooms} grandes · ${stats.smallRooms} pequeñas`,
    },
    { label: 'Roles', value: roles, hint: stats.cavernRooms > 0 ? 'incluye caverna' : undefined },
    { label: 'Área/caja', value: stats.averageAreaRatio.toFixed(2), hint: 'media de salas' },
    { label: 'Muescas', value: stats.notchCount },
    { label: 'Hornacinas', value: stats.alcoveCount },
    { label: 'Pared compartida', value: stats.sharedWalls, hint: 'pares 1-2 tiles' },
    {
      label: 'Pasillos',
      value: `0:${lengths[0]} 1:${lengths[1]} 2:${lengths[2]} 3:${lengths[3]}`,
    },
    { label: 'Bucles', value: `${stats.loops} / 3` },
    {
      label: 'Ancho',
      value: stats.wideCount === 0 ? 'no' : `${stats.wideCount} × ${stats.wideLength} tiles`,
      hint: stats.wideCount > 0 ? '2 tiles, sin puertas' : undefined,
    },
    {
      label: 'Caverna',
      value: stats.cavernRooms > 0 ? `${(stats.cavernShare * 100).toFixed(0)} %` : 'no',
      hint: stats.cavernRooms > 0 ? `${stats.roomCount} salas en total` : undefined,
    },
    { label: 'Accesos spawn', value: stats.spawnAccesses },
    { label: 'Huecos spawn', value: stats.spawnHoles },
    {
      label: 'Enemigos/sala',
      value: map.rooms
        .map((room) => map.enemies.filter((enemy) => enemy.roomId === room.id).length)
        .join('·'),
      hint: `${stats.enemyCount} fichas · ${stats.emptyRooms} vacía${stats.emptyRooms === 1 ? '' : 's'}${enemyTypes ? ` · ${enemyTypes}` : ''}`,
    },
    { label: 'Generación', value: `${generationMs.toFixed(1)} ms` },
  ];
}
