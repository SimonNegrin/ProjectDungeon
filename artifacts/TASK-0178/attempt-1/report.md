---
type: Task Report
title: "TASK-0178: informe de ejecución"
description: Curación III a alcance 1 con autocuración y coste 8/6; Resurrección IV a coste 12; rechazo atómico a PV completo.
task: TASK-0178
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:16:00Z }
artifacts: artifacts/TASK-0178/attempt-1/
verified:
---

# Estado

`success`: catálogo y motor actualizados; `pnpm run verify` verde con 118
archivos y 1909 tests.

# Cambios

- `src/game/spells.ts`: Curación III coste 8, alcance `{1,1}`, efecto 6 PV;
  Resurrección IV coste 12; `ally` documenta que incluye al lanzador.
- `src/game/magic.ts`: autocuración válida a distancia 0; objetivo aliado vivo
  (incluido el lanzador), alcance 1 y LOS antes de gastar; rechazo
  `target-full-hp` con motivo propio y sin consumir acción, maná, cupo ni RNG.
  La autocuración une gasto y PV en una sola actualización para no pisarse.
- `src/game/types.ts`: nuevo motivo `target-full-hp` (REQ-025 R-014/T-012).
- Tests: catálogo; curación ortogonal, diagonal y propia; sobrecura; PV completo
  con estado intacto; enemigo, cadáver y alcance 2; resurrección derivada del
  catálogo. Ficheros: `magic`, `damage-matrix` y `engine`.
- Commit SHA: `0954c39b1a267c1a75eb869058b0afb9f42c5af3`.

# Cobertura por criterio

- 1 ✓ Catálogo con 8/1–1/6 y Resurrección IV 12; tests leen el catálogo.
- 2 ✓ Ortogonal y diagonal curan `min(6, máximo − actual)` y gastan 8, 1 acción
  y 1 hueco.
- 3 ✓ Autocuración con mismo coste; enemigo y cadáver rechazados; alcance 2
  rechazado.
- 4 ✓ PV completo devuelve `target-full-hp`; estado y RNG idénticos.
- 5 ✓ Tests afectados actualizados sin debilitar; `pnpm run verify` pasa.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 1909 tests, build y bundle | `verify-output.txt` |
| Vitest focalizado | 4 archivos, 196 tests | `targeted-tests-output.txt` |

# Evidencia visual

- No aplica: sin cambios de host, HUD ni E2E (TASK-0179).

# Desviaciones

- No se tocaron fixtures de guardado: ninguno fija coste, alcance ni curación;
  el round-trip existente ya conserva maná, cupo y PV.
- El test de dos resurrecciones usa maná sintético 24 para aislar el cupo: con
  coste 12 y máximo 16 ya no caben dos en un turno real.
- Los specs E2E que asumen curación a 2 casillas y 4 PV quedan temporalmente
  rojos; no se editan aquí, según el alcance.

# Problemas conocidos y preguntas abiertas

- TASK-0179 debe mapear `target-full-hp` al aviso «Ya está a PV completo».
- El caso «sin LOS» de la curación ya no es observable con alcance 1: a
  distancia adyacente no hay casilla intermedia. La comprobación sigue en el
  motor y cubre futuros alcances.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2956 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
