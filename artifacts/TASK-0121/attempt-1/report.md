---
type: Task Report
title: "TASK-0121: informe de ejecución"
description: Observer de layout-shift compartido con filtro P-006 y recogida de cuatro objetos cubierta.
task: TASK-0121
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:52:00Z }
artifacts: artifacts/TASK-0121/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `tests/e2e/support.ts`: helper único `startLayoutShiftAudit`,
  `readLayoutShifts`, `resetLayoutShifts`, `expectNoForbiddenShifts` y tipos
  `LayoutShiftRecord`/`LayoutShiftSource`. Callback autocontenido; globales
  `__layoutShifts` y `__layoutObserver`. Filtro: `matches` para armazón, panel,
  body, columnas, títulos y slots de Equipo/Bolsa, y `closest` solo para títulos
  y esos slots. Sin `.inventory-column` desnudo ni celdas del Suelo.
- Cuatro specs migrados sin copias inline, sin tocar sus aserciones ni capturas.
- `panel-cursor-cls-qa.spec.ts`: nuevo test que abre con `FOUR_GROUND`, recoge
  `ground:item-test-ground-0..3` con `panelActionTestId('pickup', ...)`,
  `settle`, `expectPanelStable` y `expectNoForbiddenShifts` por fase.
- Commit SHA: `8ab2b98`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec playwright test` (4 specs) | 32 passed (31 previos + 1 nuevo) | `test-output.txt` |
| `pnpm run test:e2e` | 215 passed | `e2e-output.txt` |
| `pnpm run verify` | OK: 94 archivos, 1332 tests; tsc, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- `panel-cursor-cls-qa/screenshots/cls-pickup-four-1280x720.png`: panel con el
  Suelo vacío tras recoger los cuatro objetos.
- `panel-cursor-cls-qa/logs/cls-pickup-four.json`: shifts de filas del Suelo con
  `forbidden: false`; ninguna fase tiene shifts prohibidos.

# Desviaciones

- El primer filtro usó `closest()` sobre toda la lista y marcó como prohibido un
  `li[...inventory-ground-row]` del Suelo en el test existente de panel-top. Era
  un falso positivo: `closest([data-testid="inventory-panel"])` casa con
  cualquier descendiente. Se corrigió a `matches` para cajas estables y
  `closest` solo para títulos/slots, como ya hacían v7 y panel-top. No apareció
  ningún shift real prohibido.

# Problemas conocidos y preguntas abiertas

- Ninguno.

# Fricción reutilizable

Sin entradas.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2071 |
| `report_bytes` | 2449 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
