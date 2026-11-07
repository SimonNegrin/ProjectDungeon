---
type: Task Report
title: "Informe — TASK-0008: MapGenerator, BSP, salas y pasillos estrechos"
description: Generador BSP determinista en src/game/, modelo GeneratedMap serializable, integración con createInitialState, tests y medición real de rendimiento.
task: TASK-0008
attempt: 1
report_status: completed
status: stable
result: implemented
branch: task/TASK-0008
commit: 1715093b5a75876cc78c0bf0025b0f2ed3d1d29b
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:40:00Z }
---

# Resumen

Implementado el generador BSP determinista de `REQ-003` detrás de la interfaz
`MapGenerator`, con `BspMapGenerator` (`id = 'bsp'`) como implementación por
defecto. `createInitialState` genera el mapa, coloca jugador y enemigo en
`map.spawns` y expone `GameState.map`. La semilla de referencia `279837264` y la
configuración 32×32 / 9 / 4 / 11 / 20 producen 9 salas (2 grandes, 3 pequeñas,
4 medianas), 8 corredores de árbol y 2 bucles, con conectividad 100 %, sin
puertas y sin pasillos anchos.

No se ha tocado el host, `index.html`, `public/`, `docs/`, `experiments/`,
`package.json` ni el lockfile. `pnpm run verify` pasa. El E2E no se ha ejecutado
por indicación expresa del brief.

# Cambios

Producción:

- `src/game/map.ts` (nuevo): tipos `Room`, `Corridor`, `Door`, `Spawns`,
  `MapOptions`, `ResolvedMapOptions`, `GeneratedMap`, `MapGenerator`; semilla
  por defecto, `DEFAULT_MAP_OPTIONS`, normalización de opciones, PRNG
  `mulberry32`, consultas de rejilla y validadores puros.
- `src/game/bsp.ts` (nuevo): `BspMapGenerator`. Partición BSP con control de
  capacidad, programa de roles, colocación con margen interior, slots de puerta,
  BFS multi-fuente para pasillos, rutas en Z para garantizar esquinas,
  union-find de conectividad, bucles, apariciones y aceptación con reintentos.
- `src/game/types.ts`: `GameState.map?: GeneratedMap`.
- `src/game/engine.ts`: `createInitialState({ seed, options, generator })` y
  compatibilidad `createInitialState(generator, options)`; por defecto
  `BspMapGenerator`, semilla `DEFAULT_MAP_SEED` y opciones de referencia. Las
  unidades se colocan en `map.spawns`.
- `src/game/index.ts`: exporta `map.ts` y `bsp.ts`.

Tests:

- `tests/unit/game/map.test.ts` (nuevo, 26 tests): opciones, determinismo,
  estructura, roles, separación, corredores, bucles, callejones, conectividad,
  apariciones, serialización, validadores negativos, 24×24, 40×40 y rendimiento.
- `tests/unit/game/map-integration.test.ts` (nuevo, 5 tests): BSP por defecto,
  semilla/opciones, serialización, stub de `MapGenerator`, movimiento, ataque,
  fin de turno, reinicio y estado manual sin mapa.
- `tests/unit/game/engine.test.ts`: adaptado al mapa generado (32×32, borde,
  `state.map`, spawns, determinismo, round-trip JSON, `Restart`) conservando las
  comprobaciones de HP/MP/acción/fase/turno y pureza.
- `tests/unit/host/{renderer,hud,debug,session}.test.ts`: solo adaptación a
  `makeState()` para las pruebas de host que necesitan la sala fija de 20×20.
  No se modificó código de host ni se debilitaron aserciones.

# Comandos y resultados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm exec tsc --noEmit` | 120 s | OK |
| `pnpm run test` | 120 s | 20 archivos, 179 tests, todos OK |
| `pnpm run verify` | 240 s (brief 180 s) | OK: docs, config, tests y build |
| `pnpm run build` (dentro de verify) | 120 s | OK, 41 módulos |
| `pnpm run test:e2e` | — | **No ejecutado** por restricción del brief |

Salidas completas en `test-output.txt` y `verify-output.txt`.

# Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| `MapGenerator` con `id` y `generate`; `BspMapGenerator` por defecto; inyectable | Cumple | `map.ts`, `bsp.ts`, test de interfaz y `map-integration.test.ts` |
| Mapa 32×32 y acepta 24×24 y 40×40 sin cambios de código | Cumple | Tests de otros tamaños; 24×24 y 40×40 generan 9 salas y validan |
| 8-12 salas, ≥2 grandes, ≥3 pequeñas, sin solape, ≥1 muro entre salas | Cumple (referencia) | 9 salas: 2 grandes, 3 pequeñas, 4 medianas; validador sin incidencias |
| Pasillos de 1 tile, ortogonales, conectan todas las salas, tramo recto ≥5 y corredor con ≥2 esquinas | Cumple | 10 corredores; recto máximo 20; esquinas máximas 4; conectividad 100 % |
| 1-3 bucles; callejones ≤4 | Cumple | 2 bucles; callejón máximo 0 |
| Jugador en sala con salida; enemigo en la sala más lejana, otra sala, distancia ≥12 y fuera del viewport 12×12 | Cumple | Spawns `(6,8)` y `(23,28)`, distancia BFS 59, viewport origen `(0,0)` |
| Determ mismo con misma semilla; semillas distintas difieren | Cumple | Tests de determinismo y diferencia estructural |
| Estado serializable; `window.__game` expone seed/rooms/corridors/doors/spawns | Parcial / diferido | Round-trip JSON del estado y del mapa OK; `window.__game` se difiere a TASK-0010 (host fuera de alcance) |
| Generación <100 ms en CI | Cumple en esta máquina | Mediana 2,88 ms; máximo 5,36 ms; arranque en frío 20,42 ms |
| No tocar host/render/HUD/encuadre; sin puertas ni pasillos anchos | Cumple | Diff solo en `src/game/` y tests; `doors = []`; todos los corredores `width: 1` |
| `pnpm run verify` pasa sin debilitar tests | Cumple | `verify-output.txt`; 179 tests OK |

# Snapshot de la semilla de referencia

`GeneratedMap` completo en `map-seed-279837264.json`; representación legible en
`map-seed-279837264.txt`.

- Semilla: `279837264`; tamaño 32×32; 9 salas; 10 corredores; 0 puertas.
- Opciones resueltas: `{ mapWidth: 32, mapHeight: 32, roomTarget: 9,
  roomMin: 4, roomMax: 11, loopRatio: 20, wideCorridorCount: 0,
  wideCorridorWidth: 2 }`.
- Avisos: ninguno.
- Conectividad: 100 %; bloques 2×2 fuera de salas: 0; callejón máximo: 0.
- Spawns: jugador `(6,8)`; enemigo `(23,28)`; distancia BFS 59; enemigo fuera
  del viewport inicial `[0,11]×[0,11]`.

Salas:

| id | posición | tamaño | rol |
|---:|---|---|---|
| 0 | (3,4) | 7×9 | large |
| 1 | (3,21) | 7×8 | large |
| 2 | (13,3) | 6×6 | medium |
| 3 | (13,11) | 5×4 | small |
| 4 | (16,17) | 5×4 | small |
| 5 | (15,23) | 6×6 | medium |
| 6 | (23,5) | 6×8 | medium |
| 7 | (23,16) | 6×7 | medium |
| 8 | (23,25) | 5×4 | small |

Corredores:

| desde → hasta | tipo | tiles | esquinas | tramo recto |
|---|---|---:|---:|---:|
| 0 → 1 | tree | 26 | 3 | 20 |
| 2 → 3 | tree | 8 | 2 | 5 |
| 4 → 5 | tree | 9 | 4 | 3 |
| 3 → 4 | tree | 5 | 1 | 3 |
| 6 → 7 | tree | 3 | 0 | 2 |
| 7 → 8 | tree | 9 | 2 | 5 |
| 2 → 6 | tree | 4 | 0 | 3 |
| 0 → 2 | tree | 4 | 2 | 1 |
| 1 → 5 | loop | 5 | 0 | 4 |
| 5 → 8 | loop | 8 | 2 | 5 |

# Rendimiento

Medición real fuera de la función pura, Node `v22.14.0`, `darwin arm64`:

| Métrica | Valor |
|---|---:|
| Arranque en frío (1.ª generación) | 20,42 ms |
| Calentamiento | 1 generación |
| Repeticiones medidas | 10 |
| Mínimo | 2,23 ms |
| Mediana | 2,88 ms |
| Máximo | 5,36 ms |
| Umbral | <100 ms |

El test de rendimiento de la suite calienta una vez, mide 3 generaciones y
comprueba mediana y máximo <100 ms. La última ejecución registró
`runs=2.31,2.08,2.07`, `median=2.08`, `max=2.31` ms. No se mide el tiempo dentro
del generador.

# Desviaciones y limitaciones

1. **`window.__game` (diferido a TASK-0010).** El criterio de exposición de
   `seed`, `rooms`, `corridors`, `doors` y `spawns` en `window.__game` requiere
   tocar `src/host/debug.ts`, prohibido en esta tarea. Se garantiza el modelo
   serializable (`GameState.map` + round-trip JSON) y se deja la exposición al
   host para TASK-0010, tal y como autoriza el brief.
2. **E2E no ejecutado.** Por instrucción del brief, `pnpm run test:e2e` queda para
   TASK-0010/TASK-0011. El host actual sigue renderizando con la cámara y el HUD
   existentes; la integración visual del mapa nuevo no se ha validado aquí.
3. **24×24 degrada el programa de roles.** El interior útil es 20×20 y no caben
   con separación de muro 2 salas de 7×7, 3 de 4×4 y 4 de 6×6. El generador
   produce 9 salas válidas (pequeñas/medianas) y registra un aviso honesto
   (`No se pudo garantizar el programa de roles…`). El mínimo de 2 grandes y 3
   pequeñas se cumple y verifica en 32×32 y 40×40. No se falsean dimensiones ni
   roles.
4. **`Restart` vuelve a la semilla/generador por defecto.** Conservar semilla y
   generador de la sesión es parte de TASK-0010. En esta tarea el comportamiento
   por defecto es el acordado en el brief.
5. **Mapa distinto al snapshot de EXP-001.** Se mantienen semilla, parámetros y
   estructura (BSP, roles, bucles), pero la partición usa una restricción de
   capacidad para alcanzar el objetivo de hojas en 24×24 y el mapa resultante no
   es idéntico al de la maqueta. El brief permite portar y optimizar el
   prototipo, no copiarlo.
6. **Medición de rendimiento local, no CI.** Los valores son de esta máquina
   (`darwin arm64`, Node 22.14). Aun así el máximo está muy por debajo del umbral
   de 100 ms. El arranque en frío también queda por debajo.

# Artefactos

```text
artifacts/TASK-0008/attempt-1/
  brief.md                    # brief del lead
  report.md                   # este informe
  test-output.txt             # suite completa + salida detallada del test de rendimiento
  verify-output.txt           # docs:check + config:check + test + build
  map-seed-279837264.json     # GeneratedMap completo
  map-seed-279837264.txt      # representación ASCII
  performance.txt             # mediciones reales (frío, 10 repeticiones, mediana, máximo)
```

# Preguntas para el lead

- ¿Se acepta la degradación documentada de 24×24 (9 salas pequeñas/medianas sin
  el mínimo de grandes) como comportamiento válido de "otros tamaños", o se
  quiere que TASK-0009/una tarea futura ajuste el empaquetado para forzar roles?
- Confirmar que la exposición de `window.__game` queda efectivamente en
  TASK-0010 y no requiere un ajuste adicional en TASK-0008.
