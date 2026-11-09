---
type: Task Report
title: "TASK-0044: informe de ejecución"
description: Núcleo puro de chambers con opciones, formas, pasillos y puertas.
task: TASK-0044
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:10:00Z }
artifacts: artifacts/TASK-0044/attempt-1/
verified:
---

# Estado

`success`. `src/game/chambers/core/` genera planes geométricos puros y
deterministas, sin spawn, enemigos, entrada ni salida.

# Cambios

- Núcleo en `src/game/chambers/core/`: `options`, `rng`, `grid`, `shapes`,
  `corridors`, `doors`, `palettes`, `plan` e `index`.
- Tests: `chambers-core.test.ts` (21 casos) y `chambers-sweep.test.ts`
  (200 semillas).
- Sin cambios en `src/game/index.ts`, BSP, host, experimentos, `index.html`,
  dependencias ni `docs/`; sin `variants/growth.ts`.
- Commit: `c297699eccc1bda169f96cd96fd18ed98db98d04`
  (`feat(TASK-0044): añade núcleo de salas, pasillos y puertas`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 47 archivos, 657/657 tests | `test-output.txt` |
| `pnpm run verify` | docs + config + tests + build OK | `verify-output.txt` |
| Barrido 200 semillas | conectividad 100 %, 1 componente, 4-6 salas / 3 caverna | `seed-sweep.txt` |
| Núcleo puro | 21/21 reglas | `test-output.txt` |

# Evidencia visual

No aplica: no se toca UI ni render; la evidencia es geométrica y de tests.

# Desviaciones

- Layout normal por empaquetado determinista 3×2/2×2 con muescas, no port
  literal de EXP-004; cumple R-002/R-003.
- Caverna en mapas demasiado pequeños cae a mapa normal con `warnings`.

# Problemas conocidos

- `validateGeneratedMap` exige `corridor.path.length >= 3` y 1-3 huecos por sala;
  un enlace directo de growth tiene path de 1 tile. El core no lo llama:
  TASK-0045/0046 deberá adaptar el adaptador o el validador sin debilitar BSP.
- La caverna se marca con `cavernRoomId`; `Room.role` conserva TASK-0043.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Validador de producción vs. enlaces directos de 0 tiles | `map.ts` rechaza paths <3; R-005/T-014 permiten puerta directa | Core no valida; TASK-0045 reconcilia | Afecta a toda integración de growth | Validador de growth o regla que distinga enlace directo | Medio; toca modelo y tests BSP | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3213 |
| `report_bytes` | 2558 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
