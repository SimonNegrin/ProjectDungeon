---
type: Task Report
title: "TASK-0042: informe de ejecución"
description: Implementación de EXP-004 v3 con emboscadas, interior y salida de nivel.
task: TASK-0042
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T13:00:00Z }
artifacts: artifacts/TASK-0042/attempt-1/
verified:
---

# Estado

`success`. Criterios cubiertos; queda una desviación de documentación y el
playtest abierto.

# Cambios

- `types.ts`: `entrance`, `exit`, `hotspots`, `Enemy.hidden/interior`,
  `hiddenEnemyChance`, `exitMode` y métricas nuevas.
- `spawn.ts`: componentes ≤2 en 8 direcciones, 6 huecos por capacidad, no-mayor
  en empate, enemigos interiores, puntos calientes y emboscadas deterministas.
- `exit.ts` (nuevo): BFS de salas, door/stairs/random, borde, reserva y fallback.
- `generate.ts`: caverna exacta de 3, mínimo global 3, 3 salas sin bucles y
  salida antes de enemigos.
- `render.ts`: entrada, salida, `STAIR_RECTS` local, hotspots, emboscados y
  datasets. `metrics.ts` y `main.ts`: controles, métricas y JSON.
- Tests: `contract`, `shapes`, `spawn` y `exit` (nuevo); 617 passing.
- Commit de implementación y evidencia:
  `272ddc8f3dc72659c62d4320db86af9191501d13`.
- `docs/tasks/TASK-0042…md` no se tocó; su diff es del lead.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | 0 | `docs-check-output.txt` |
| `pnpm run test` | 0 · 44 archivos · 617 tests | `test-output.txt` |
| `pnpm run build` | 0 | `build-output.txt` |
| `pnpm run verify` | 0 | `verify-output.txt` |

# Evidencia visual

- 108 capturas 1280×720 en `screenshots/`: A/B/C × 8 semillas
  (`2,5,8,17,23,40,56,279837264`), normal/debug/mapa/13×13, caverna, pasillo
  ancho y los 4 `exitMode` por variante.
- `capture-log.txt` sin errores; `decision-example.json` con entrada, salida,
  hotspots, emboscados, componentes y avisos.
- Mirar `growth-seed-11-exitMode-stairs-down.png`, `…-exitMode-door.png`,
  `bsp-seed-2-debug-zoom.png` y `growth-seed-2-13x13.png`.

# Desviaciones

- **`experiment.md` no actualizado:** reservado al lead y denegado por la
  herramienta. Texto exacto en `experiment-observations.md`.
- **Escaleras:** `TILE_RECTS` no expone `staircase down/up` y no se tocó `src/`.
  Recorte local (`sx` 224/256, `sy` 512) más huellas doradas y flecha. `door`
  va sobre el muro del borde y no abre paso.
- **Caverna de 3:** anexos ≥4×4; sin bucles ni anchos extra en 3 salas para
  conservar distancia ≥2 (aviso si no cabe el ancho).
- **Tests v2:** separación ≥2 sustituida por componentes ≤2 con cobertura nueva,
  justificada por REQ-012 v3 (R-002/R-009).

# Problemas conocidos y preguntas abiertas

- Con `hiddenEnemyChance` 1 no siempre se ocupan todos los elegibles si se
  agrupan o el presupuesto es menor; es el límite de componentes ≤2.
- El playtest debe elegir variante y representación de salida.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief pide editar `experiment.md`; la herramienta lo deniega y el rol lo reserva al lead. | `experiment-observations.md`; edición rechazada. | Texto listo en artefactos. | Se repite en tareas de experimento. | Permitir editar solo Observaciones o no pedirlo en el brief. | Bajo; riesgo de pisar al lead. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3266 |
| `report_bytes` | 3553 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
