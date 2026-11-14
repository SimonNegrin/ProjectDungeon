---
type: Task Report
title: "TASK-0113: informe de ejecución"
description: Stats y traits como listas verticales en HUD izquierdo y ficha derecha.
task: TASK-0113
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T16:36:00Z }
artifacts: artifacts/TASK-0113/attempt-1/
verified:
---

# Estado

`success`. HUD izquierdo y ficha derecha muestran stats y traits como listas DOM
verticales, sin `·`, conservando PV/MP/magia/maná/acciones, condicionales y
`data-testid`.

# Cambios

- Archivos: `index.html`, `src/host/hud-detail.ts`, `src/host/hud.ts`,
  `src/host/ui.css`, tests unitarios de HUD/ficha y E2E afectados.
- `HudModel.stats` y `traits` pasan a arrays; `unitStatEntries`, `statLines` y
  `unitTraits` son la fuente única. La ficha del aliado reutiliza la lista de
  stats existente. `statsLabel` queda solo para el overlay `F1`, fuera de la UI
  de juego.
- Nuevo `tests/e2e/hud-vertical-lists-qa.spec.ts`: ambos HUD, atributos del
  aliado, objeto, bloques seleccionado/equipado, ausencia de `·`, una entrada
  por línea y capturas a 900×700 y 1280×720.
- Commit SHA: `5140565`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 93 archivos, 1321 tests, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | OK: 190 tests | `test-output.txt` |

# Evidencia visual

- `hud-vertical-lists-qa/screenshots/hud-listas-{900x700,1280x720}.png`
- `hud-vertical-lists-qa/screenshots/ficha-listas-{900x700,1280x720}.png`
- `hud-vertical-lists-qa/screenshots/aliado-listas-{900x700,1280x720}.png`
- `hud-vertical-lists-qa/logs/listas-verticales.json`
- Mirar: cada stat/trait en su línea, sin `·`, y filas PV/MP/acciones intactas.

# Desviaciones

- Ninguna. No se tocaron biseles, `--ui-bevel`, `--ui-line`, valores, catálogo
  ni reglas. Los tests existentes se adaptaron sin retirar cobertura.

# Problemas conocidos y preguntas abiertas

- Ninguno. El cambio es solo de presentación; no se modificó el estado de juego.

# Fricción reutilizable

Ninguna entrada: no hubo comportamiento no documentado, fallo repetible,
contradicción ni workaround generalizable.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2542 |
| `report_bytes` | 2317 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
