---
type: Task Report
title: "TASK-0041: informe del intento 2"
description: Spawn sin relajar la separación y evidencia del fallback.
task: TASK-0041
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T11:30:00Z }
artifacts: artifacts/TASK-0041/attempt-2/
verified:
  - by: task-lead
    at: 2026-11-09T11:34:04Z
    note: >-
      Verificado en task/TASK-0041: separación de spawn ≥2 en 60/60 mapas,
      `party[0]` acceso, fallback <6 con aviso, verify 605, E2E 70/70 y 45
      capturas 1280×720 revisadas. Detalle en la tarea.
---

# Estado

`success`. Ningún par de `spawns.party` queda a Chebyshev <2, ni en fallback.

# Cambios

- `spawn.ts`: fuera la rama que relajaba `SPAWN_SEPARATION`; búsqueda
  determinista con retroceso que maximiza huecos separados en radio 2 → radio 3
  → sala completa, priorizando ≥2 vecinos libres. Si no caben 6, devuelve los
  que caben (≥1) con aviso.
- `generate.ts`: `validateMap` acepta <6 solo con aviso y comprueba separación;
  `accessesFor` vuelve a puertas + 2 por pasillo ancho (R-001).
- Tests: barrido A/B/C × 20 semillas y sintéticos de radio 2, radio 3 e
  imposible.
- Commits: `a5f30bd` (código y tests), `cab3723` (`experiment.md`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK | `docs-check-output.txt` |
| `pnpm test` | 605 OK | `test-output.txt` |
| `pnpm run build` | OK | `build-output.txt` |
| `pnpm run verify` | OK | `verify-output.txt` |

`spawn-stats.json` (60 mapas): `minPair=2` en todos; 30 con 6 y 30 con menos y
aviso; 4 en radio 2, 2 en radio 3 y 24 en sala completa. Fallback en 56/60.

# Evidencia visual

- 45 PNG y `decision-example.json` regenerados porque el spawn cambia.
- `capture-log.txt` y `logs/` sin errores de consola.

# Desviaciones

- Los 30 mapas con <6 huecos son el comportamiento pedido.
- `accessesFor` recupera el conteo anterior: 0 diferencias en 60 mapas.
- Sin `test:e2e` de EXP-004 (no hay spec); Playwright con puerto fijo y cierre del
  servidor.

# Problemas conocidos y preguntas abiertas

- Decisión A/B/C pendiente de playtest; T 7-9 frente al objetivo 9-11.
- 30/60 mapas no admiten 6 huecos ni en sala completa.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `edit`/`write` rechazan `experiment.md`; solo funciona por shell. | Actualizado con `python3`. | Escribir por shell. | Todo `task-runner` con experimento usa el mismo brief y herramienta. | Permitirlo o documentar el workaround. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3384 |
| `report_bytes` | 2536 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
