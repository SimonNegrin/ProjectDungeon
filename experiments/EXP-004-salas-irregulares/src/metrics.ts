/** Métricas de la página para comparar A/B/C sin duplicar la lógica del mapa. */

import type { Metric } from '../../_shell/types';
import type { GeneratedMap } from './types';

export function computeMetrics(map: GeneratedMap, generationMs = 0): Metric[] {
  const { stats } = map;
  const roles = `${stats.largeRooms}G · ${stats.mediumRooms}M · ${stats.smallRooms}P`;
  const lengths = stats.corridorLengths;
  const enemy = stats.enemy;
  const doorHint =
    stats.openMouths === 0
      ? 'todos los accesos con puerta'
      : `${stats.openMouths} boca${stats.openMouths === 1 ? '' : 's'} sin puerta`;
  const access = stats.spawnAccess
    ? `${stats.spawnAccess.x},${stats.spawnAccess.y}`
    : '—';
  const exit = map.exit;
  const exitValue = exit
    ? `${exit.kind} · R${exit.roomId} · d${exit.distance}`
    : 'sin salida';
  const exitHint = exit
    ? `${exit.position.x},${exit.position.y} → ${exit.access.x},${exit.access.y}${exit.fallback ? ' · fallback' : ''}`
    : 'aviso de fallback';
  const hiddenHint =
    stats.hotspotsEligible === 0
      ? 'sin puntos calientes elegibles'
      : `${stats.hotspotOccupied}/${stats.hotspotsEligible} ocupados`;

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
    {
      label: 'Puertas',
      value: `${stats.validDoors} válidas`,
      hint: `${doorHint} · separación mín. ${stats.doorMinDistance ?? '—'}`,
    },
    {
      label: 'Acceso spawn',
      value: access,
      hint: `${stats.spawnAccesses} accesos · ${stats.spawnHoles} huecos a ≤${stats.spawnHoleMaxDistance}`,
    },
    {
      label: 'Spawn mayor',
      value: stats.spawnIsLargest ? 'sí' : 'no',
      hint: `componente ${stats.spawnComponentsMax} · ${stats.spawnHoles} huecos`,
    },
    {
      label: 'Enemigos T',
      value: enemy.total,
      hint: `N ${enemy.surfaceN} × ${enemy.surfaceFactor} → ${enemy.surfaceTerm} · P ${enemy.playersP} × ${enemy.playersFactor} → ${enemy.playersTerm}${enemy.planned === enemy.total ? '' : ` · plan ${enemy.planned}`}`,
    },
    {
      label: 'Reparto',
      value: enemy.perRoom.join('·'),
      hint: `colocado ${enemy.placedPerRoom.join('·')}`,
    },
    {
      label: 'Tipos',
      value: `${enemy.sentinels}S · ${enemy.brutes}B · ${enemy.cowards}C`,
      hint: `${stats.enemyCount} fichas · ${stats.emptyRooms} salas vacías`,
    },
    {
      label: 'Interior/borde',
      value: `${enemy.interior} / ${enemy.border}`,
      hint: `componente ${enemy.componentsMax}`,
    },
    {
      label: 'Emboscadas',
      value: `${enemy.hidden} (${stats.hotspotsEligible} elegibles)`,
      hint: hiddenHint,
    },
    {
      label: 'Salida',
      value: exitValue,
      hint: exitHint,
    },
    { label: 'Generación', value: `${generationMs.toFixed(1)} ms` },
  ];
}
