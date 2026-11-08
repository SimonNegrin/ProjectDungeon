---
type: Task Brief
title: "TASK-0021: detalle del brief del intento 1"
description: Enlaces, recuadros exactos, clasificación de tiles y guía de captura.
task: TASK-0021
attempt: 1
status: stable
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T12:10:00Z }
---

# Enlaces de contexto

- [TASK-0021](../../../docs/tasks/TASK-0021-host-damero-decoracion.md), en
  especial «Diseño esperado», «Criterios de aceptación» y «Plan de test».
- [REQ-007](../../../docs/requirements/REQ-007-damero-decoracion-suelo.md):
  R-001…R-009, T-001…T-009, «Mezcla inicial propuesta» y «Fuera de alcance».
- [ADR-010](../../../docs/decisions/ADR-010-damero-decoracion-presentacion.md).
- [Arquitectura § Suelo y decoración](../../../docs/design/architecture.md#suelo-y-decoración).
- [Workflow § Timeouts](../../../docs/harness/workflow.md#timeouts-y-procesos).

# Puntos de integración

- `src/host/renderer.ts`: `renderScene` dibuja suelo por `floorTileFor`; añade
  tinte y decals. `floorTileFor` no cambia de contrato.
- `src/host/assets.ts`: `TILE_RECTS` y nuevos recuadros de decal (32×32).
- `src/host/debug.ts`: `GameSnapshot` y `buildSnapshot`; añade decoración.
- `src/host/main.ts`: composición del snapshot; no cambia el canvas ni el HUD.
- `src/game/map.ts`: `Room`, `Corridor`, `Door`, `Spawns`; solo lectura.

# Recuadros de decal (rejilla 32×32)

Columna `a` = 0, fila 1 = primera fila del PNG. `sx = columna × 32`,
`sy = (fila − 1) × 32`, `sw = sh = 32`.

| Filas | Columnas | `sy` | `sx` |
|---|---|---|---|
| 7, 8, 9, 10, 11 | e, f, g | 192, 224, 256, 288, 320 | 128, 160, 192 |
| 21, 22 | a, b | 640, 672 | 0, 32 |
| 23 | a, b, c, d | 704 | 0, 32, 64, 96 |

Verificado sobre `tiles.png` (544×832, 17×26 celdas): esas celdas tienen alpha y
las vecinas de la lista no. Familias visuales: suciedad/piedritas (7, 10),
hierba (8), huesos/restos (9, 11, 22), setas (21) y sangre/slime (23). La mezcla
40/20/15/15/10 de REQ-007 es una propuesta; respeta rangos y máximo un decal.

# Clasificación y elegibilidad

- **Sala:** tile `floor` dentro de algún `Room` (x, y, width, height).
- **Pasillo:** tile `floor` fuera de toda sala y que no sea umbral.
- **Umbral:** `map.doors` (nunca decal).
- **Aparición:** `map.spawns.player` y `map.spawns.enemy` (nunca decal).
- Elegibles: `floor` que no sea aparición ni umbral. La densidad se mide sobre
  elegibles de cada área.
- Sin `state.map`: damero en todos los `floor`, cero decals y resumen vacío.

# Damero y tinte

- Paridad global `(x + y) % 2`, sin reinicio por sala ni dependencia de cámara.
- Una sola configuración exportada (color y alpha) para la paridad alterna;
  ~10 % hacia gris-azul y diferencia de luminancia en escala de grises.
- Se compone con una capa translúcida sobre el tile ya dibujado; no recolorea el
  PNG ni usa posiciones fraccionarias. No afecta a muros ni decals.

# Planificación determinista

- Hash entero con semilla, `x`, `y` y sal por familia (por ejemplo
  `Math.imul` y mezcla de bits); sin `Math.random`, `Date.now` ni estado global.
- Si un umbral de hash deja la densidad fuera del rango en la semilla de
  referencia, usa una cuota determinista (ordenar por score y elegir los
  primeros N) para garantizar 12–18 % en salas y 6–8 % en pasillos.
- Un único `planFloor`/`planDecoration` puro alimenta render y snapshot.

# Capturas

- Semilla `?seed=279837264`, 1280×720, sala, pasillo y umbral.
- Usa Vite con puerto fijo, health check y cierre; o Playwright con `webServer`.
  No uses `timeout` de shell (macOS no lo tiene) ni dejes servidores.
- Guarda PNG y el comando/repetibilidad en `screenshots/` o `logs/`.
