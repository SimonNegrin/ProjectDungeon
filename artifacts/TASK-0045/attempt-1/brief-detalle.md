---
type: Task Brief Detail
title: "TASK-0045: detalle de integración del brief"
description: Notas técnicas para promocionar spawn, enemigos y salida y adaptar BSP.
task: TASK-0045
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:30:00Z }
---

# Core propuesto

Mantén módulos puros separados y exportados desde `core/index.ts`. Nombres
orientativos; prioriza claridad y reutilización por TASK-0046.

- `spawn.ts`: constantes `SPAWN_MIN_TILES=6`, `SPAWN_RADIUS=2`,
  `SPAWN_FALLBACK_RADIUS=3`, `SPAWN_MAX_COMPONENT=2`; `chooseSpawnAccess` y
  `placeSpawns(input)` con `{ rooms, doors, openMouths, tiles, width, height,
  seed, minTiles }` → `{ spawns: { roomId, party, player }, warnings }`.
  `accesses` = puertas + bocas que tocan la sala (usa `roomA`/`roomB`/`roomId`).
  Capacidad = máximo de huecos con componentes ≤2, contando fallbacks de radio;
  en empate evita la sala de mayor área si otra admite 6; luego más suelo libre
  y `id`. El acceso es suelo interior junto a la puerta más cercana al centro
  (desempate por `id`); si no hay, junto a la boca. `party[0]=acceso`; el resto
  a Chebyshev ≤2 del acceso, priorizando ≥2 vecinos libres; parejas 8-dir
  permitidas, ninguna componente >2. Fallbacks a radio 3 y sala completa con
  `warnings`.
- `enemies.ts`: `enemyTotalFor`, `enemyTypeCounts`, `distributeEnemyBudget`,
  `assignEnemyTypes` y `placeChamberEnemies(input)` → `{ enemies, hotspots,
  warnings, breakdown }`. `T = ceil(0,02·N)+ceil(1,2·P)`, `N` = suma de `area`
  de salas, `P` por defecto 6. Reparto proporcional por área con mínimo 1 en
  salas no-spawn y resto mayor determinista. Tipos 60/20/20 con redondeo
  unitario y mínimo 1 bruto/1 cobarde si `T≥4`; cobardes a salas lejanas,
  brutos a las mayores, centinelas al resto. Colocación por sala con presupuesto,
  preferencia estricta por interior si existe recambio válido, componentes
  globales 8-dir ≤2 y exclusión de spawn, salida, puertas, armas y huecos.
  Punto caliente = suelo de sala no-spawn con ≥3 vecinos ortogonales de muro o
  sin LOS a ningún acceso. Tirada independiente con `hiddenEnemyChance` (0,25);
  una emboscada consume presupuesto, nunca lo aumenta. Nunca superes `T`.
- `exit.ts`: `EXIT_MIN_DISTANCE=2`, grafo desde `corridors.roomA/roomB`,
  BFS, salida en sala no-spawn alcanzable; prefiere la más lejana con desempate
  por `id` y área. `door` exige muro del borde con suelo de la sala dentro y
  acceso interior adyacente; si no hay, cae a `stairs-down` con aviso.
  Escaleras sobre suelo de la sala. `random` elige entre las tres con hash
  estable de semilla. Devuelve `Exit` con `tile`, `distance`, `path` y
  `fallback`; `reservedExitCells(exit)`.
- Composición recomendada en `contents.ts` o similar: spawn → salida →
  enemigos, porque la salida y el spawn se reservan antes de enemigos. Expón
  `entrance = { roomId: spawns.roomId, position: party[0] }`. No construyas
  `variants/growth.ts`.

# BSP

- Sustituye la elección actual de `chooseSpawns` por el contrato nuevo:
  protección (menos accesos), 6 huecos alrededor del acceso, `party[0]` acceso,
  `spawns.roomId`, sin enemigos en la sala de spawn y sin visión inicial a
  ningún hueco. Mantén `player` como alias.
- `spawns.enemy` puede seguir siendo un ancla válida de `enemy-1` si cae en sala
  no-spawn y no ve ningún hueco; si no, recalcula. No añadas salida.
- En `enemy-placement.ts`, excluye toda la sala de spawn, no solo
  `spawns.player`, y comprueba LOS contra todos los huecos. Conserva 4 fichas,
  4 salas distintas, separación ≥2, pareja ≤8 de alarma y aislado >8. No uses
  el antiguo umbral de 12 tiles como requisito.
- Los tests existentes que fijan `{x:6,y:8}` / `{x:23,y:28}`, distancia ≥12 o
  viewport son casos de spawn afectados: actualízalos a las reglas nuevas sin
  perder cobertura (6 huecos, sala protegida, sin visión, 4 salas).

# Tests sugeridos

- Unitarios de spawn: protección/empate, acceso, 6 huecos, componentes,
  fallback radio 3/sala, avisos, P y factores 0/1/6.
- Enemigos: fórmula, reparto, tipos, interior, emboscadas 0/1/0,25, reserva de
  salida, global ≤2, determinismo y pureza.
- Salida: 3 salas en cadena, door/stairs/random, fallback, sin sala válida,
  reserva, alcanzabilidad y estabilidad.
- Barrido de 200 semillas del plan con `placeChamberContents` (sin `growth`):
  sin excepciones, spawn válido, 1 entrada/1 salida, sin enemigos en spawn,
  reserva respetada y componentes ≤2.
- Regresión: BSP de referencia y alternativas, `REQ-009`, `map*.test.ts`,
  `engine.test.ts`, serialización. Espía `Math.random` y comprueba que no se usa.
