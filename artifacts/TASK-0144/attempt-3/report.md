---
type: Task Report
title: "TASK-0144: informe del intento 3"
description: Aserción del HUD corregida; suite E2E completa en verde.
task: TASK-0144
attempt: 3
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:48:34Z }
artifacts: artifacts/TASK-0144/attempt-3/
verified:
---

# Estado

`success`: criterio 8 cerrado; 13/13 en la spec y 273/273 en la suite completa.

# Cambios

- `tests/e2e/qa-visual-revision-ui.spec.ts`: en `hudGeometry`, `hudText` sale de
  un clon de `hud-left` sin `[data-testid="hud-live"]` y se expone `liveRegion`
  (existencia, texto, caja, `clip-path`). En `expectHudBase` se mantienen las
  cuatro negaciones y se añade que `hud-live` existe, tiene texto y sigue oculto
  (caja ≤ 2 px o `clip-path: inset(50%)`). Sin cambios en producto ni en otras
  aserciones.
- Commit SHA: `d9e635e` (spec) y el commit de esta evidencia.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `test:e2e qa-visual-revision-ui --workers=1` | 13/13, 21,8 s | `e2e-specs.txt` |
| `pnpm run verify` | OK: 1734 tests; build y bundle OK, 28,0 s | `verify-output.txt` |
| `test:e2e --workers=1` (900 s) | 273/273, 4 min 21,8 s | `e2e-output.txt` |

Puerto 4173 libre y sin procesos Vite del proyecto al cerrar.

# Evidencia visual

- No se generaron capturas nuevas; el cambio es de aserción. Capturas de la
  tarea siguen en `attempt-1/` y `attempt-2/`.

# Desviaciones

- Ninguna. Se conserva `hudText` para las comprobaciones de «Sin arma»,
  «Sin traits activos» y «filoso: Corta más», que no dependen de `hud-live`.

# Problemas conocidos y preguntas abiertas

- Ninguno. El bloqueo del intento 2 (TASK-0151 vs REQ-033) queda resuelto por la
  excepción autorizada.

# Fricción reutilizable

Ninguna nueva; la entrada del intento 2 queda cubierta por esta corrección.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2209 |
| `report_bytes` | ~1900 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
