---
type: Task
id: TASK-0008
title: "Motor: interfaz MapGenerator, BSP, salas y pasillos estrechos"
description: Implementa la generación BSP determinista de 32×32, el modelo de mapa serializable, las salas, los pasillos estrechos, los bucles y las apariciones.
status: draft
task_status: ready
task_type: feature
requirement: REQ-003
requirement_ids: [R-001, R-002, R-003, R-004, R-007, R-012, T-001, T-002, T-003, T-004, T-007, T-011]
depends_on: [TASK-0006]
unlocks: [TASK-0009]
created_at: 2026-11-07T22:17:27Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0008/
priority: P1
risk: high
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:17:27Z }
verified:
---

# Objetivo

Sustituir la sala fija por una generación BSP determinista en `src/game/`, detrás
de la interfaz `MapGenerator`. El mapa resultante es de 32×32, tiene 8-12 salas
con roles de grande/pequeña/mediana, pasillos estrechos de 1 tile con esquinas,
1-3 bucles y apariciones jugador/enemigo. Esta tarea no añade puertas ni
pasillos anchos; deja el modelo preparado para TASK-0009.

# Contexto

- Requisito: [REQ-003](../requirements/REQ-003-generacion-mapa.md).
- Decisión del algoritmo: [EXP-001](../../experiments/EXP-001-generador-mazmorra/experiment.md).
- Interfaz y modelo: [ADR-007](../decisions/ADR-007-map-generator.md).
- Referencia de prototipo: `experiments/EXP-001-generador-mazmorra/src/dungeon.ts`
  (no se importa desde producción).
- Código actual: `src/game/engine.ts`, `src/game/types.ts`, `src/game/grid.ts`.
- Assets: `public/assets/32rogues/tiles.png` (el render es de TASK-0010).

# Diseño técnico de referencia

- `MapOptions`: `mapWidth`, `mapHeight`, `roomTarget`, `roomMin`, `roomMax`,
  `loopRatio`, `wideCorridorCount`, `wideCorridorWidth` (los dos últimos se
  implementan en TASK-0009; aquí se aceptan y se ignoran con un aviso o se
  reservan en el tipo).
- `GeneratedMap`: `seed`, `width`, `height`, `tiles`, `rooms`, `corridors`,
  `doors` (vacío en esta tarea), `spawns`, `warnings`, `options`.
- `Room`: `id`, `x`, `y`, `width`, `height`, `role: 'large' | 'small' | 'medium'`.
- `Corridor`: `fromRoomId`, `toRoomId`, `kind: 'tree' | 'loop'`,
  `width: 1`, `doorEligible: boolean`, `path: Position[]`.
- `Spawns`: `player`, `enemy`, `distance`.
- `MapGenerator`: `{ readonly id: string; generate(seed, options): GeneratedMap }`.
- `BspMapGenerator` implementa la interfaz. `createInitialState` acepta un
  generador y opciones; por defecto usa `BspMapGenerator` y la configuración de
  referencia `roomTarget 9`, `roomMin 4`, `roomMax 11`, `loopRatio 20`.
- Semilla por defecto documentada: `279837264` (la de `EXP-001`).
- El generador no conoce DOM, Canvas ni teclado. No usa `Math.random`,
  `Date.now` ni `performance.now`.

# Criterios de aceptación

- [ ] Existe `MapGenerator` con `id` y `generate(seed, options)`; `BspMapGenerator`
      es la implementación por defecto y `createInitialState` puede recibir otra.
- [ ] El mapa mide 32×32 y el generador acepta otros tamaños (`24×24`, `40×40`)
      sin cambios de código.
- [ ] Con la configuración de referencia y la semilla `279837264` hay 8-12 salas,
      al menos 2 grandes (7×7 a 11×11) y al menos 3 pequeñas (3×3 a 5×5); las
      salas no se solapan y están separadas por al menos 1 tile de muro.
- [ ] Los pasillos son de 1 tile, ortogonales, conectan todas las salas y hay al
      menos un tramo recto de 5 tiles y uno con dos o más esquinas.
- [ ] Hay 1-3 bucles; ningún callejón sin salida supera 4 tiles desde la última
      bifurcación.
- [ ] El jugador aparece en una sala con salida; el enemigo en la sala más lejana
      por camino, en otra sala, a distancia ≥12 y fuera del viewport inicial de
      12×12. Ambos sobre suelo.
- [ ] La misma semilla y opciones producen un mapa profundamente igual; semillas
      distintas producen diferencias estructurales.
- [ ] El estado es serializable y `window.__game` expone seed, rooms, corridors,
      doors y spawns.
- [ ] La generación de 32×32 tarda menos de 100 ms en CI con la semilla de
      referencia; si no, se optimiza sin cambiar la estructura.
- [ ] No se modifican el host, el render, el HUD ni el encuadre. No se añaden
      puertas ni pasillos anchos en esta tarea.
- [ ] `pnpm run verify` pasa y no se debilitan tests existentes.

# Plan de test

- **Unitario:** determinismo; BFS de conectividad; recuento y roles de salas;
  separación y no solape; forma de pasillos; bucles y callejones; apariciones y
  distancia; serialización; rendimiento.
- **Integración:** `createInitialState` con BSP y con un stub de `MapGenerator`;
  el motor sigue funcionando con el mapa generado.
- **E2E / visual:** no aplica en esta tarea; la integración visual es TASK-0010 y
  el QA es TASK-0011.
- **Manual:** no aplica; el usuario verá el mapa en TASK-0010/TASK-0011.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Generador, motor y determinismo |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Build con el generador nuevo |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0008/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0008/attempt-1/test-output.txt`
- [ ] Snapshot de la semilla `279837264` en `artifacts/TASK-0008/attempt-1/`
- [ ] Medición de rendimiento
- [ ] Commit SHA en la rama `task/TASK-0008`

# Restricciones

- No tocar `src/host/`, `index.html` ni `public/`.
- No añadir puertas, pasillos anchos ni reglas de muros de render.
- No cambiar `REQ-003`, `EXP-001` ni el alcance.
- No añadir dependencias.
- Mantener el motor determinista y sin DOM.

# No objetivos

- Puertas y pasillos anchos (TASK-0009).
- Render, cámara, HUD y debug (TASK-0010).
- E2E y QA visual (TASK-0011).
- Escaleras, varios niveles, enemigos adicionales o niebla de guerra.

# Notas

- La maqueta de `EXP-001` midió 250,9 ms para BSP; el objetivo de producción es
  <100 ms. Se puede optimizar la partición, la búsqueda de conexiones y las
  copias, pero no falsear la métrica.
- Si una combinación de opciones no cabe, se normaliza y se devuelve un aviso en
  `warnings`; no se rompe el generador.
