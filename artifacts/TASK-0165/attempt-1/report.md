---
type: Task Report
title: "TASK-0165: informe de ejecución"
description: "La ficha equipada del panel resuelve el jugador activo, no el primero vivo."
task: TASK-0165
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:41:00Z }
artifacts: artifacts/TASK-0165/attempt-1/
verified:
---

# Estado

`success`. `buildPanelDetail` sin `unitId` resuelve el jugador activo y vivo,
igual que el panel; sin activo deja el bloque equipado vacío.

# Cambios

- `src/host/hud-detail.ts`: nuevo `detailUnit` con la misma resolución que el
  panel (`unitId` explícito o `activePlayer` con `hp > 0`). Sin activo válido no
  hay portador; ya no cae en el primer jugador. No toca el panel ni el motor.
- `tests/unit/host/hud-detail.test.ts`: tres tests nuevos: activo en el segundo
  con armas distintas, prioridad de `unitId` explícito y ausencia de activo.
- `tests/e2e/hud-right-detail-qa.spec.ts`: hotseat de dos jugadores, segundo
  activo, panel abierto y `hud-panel-equipped` con el hacha del segundo; al
  cerrar, el detalle del cursor no cambia.
- Commit SHA: `9bb71215`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/hud-detail.test.ts` antes del arreglo | 2 fallos / 26 pasan | `unit-failing-output.txt` |
| `pnpm exec vitest run tests/unit/host/hud-detail.test.ts` | 28/28 | `unit-output.txt` |
| `pnpm run verify` | OK: 767 docs, 6 experimentos, 113 archivos / 1828 tests, tsc, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 284/284 | `e2e-output.txt` |

El fallo previo es el esperado: el bloque equipado devolvía «Espada» del primero
en vez de «Hacha» del activo, y con `activePlayerId: null` seguía mostrando la
espada.

# Evidencia visual

- No aplica: la tarea prohíbe capturas porque el cambio es de contenido, no de
  aspecto. La comprobación es DOM (`hud-panel-equipped-title` y stats).

# Desviaciones

- `pnpm run test:e2e -- hud-right-detail-qa.spec.ts` ejecutó la suite completa
  (284 tests) en vez de filtrar el spec; el resultado final es
  `pnpm run test:e2e`, también 284/284. No se relajó ninguna aserción.
- No se tocó `docs/` ni la ficha; quedan para `game-lead` la firma de criterios
  y `pnpm run verify:task TASK-0165`.

# Problemas conocidos y preguntas abiertas

- Sin activo o con el activo fantasma (`hp <= 0`) la ficha queda sin portador,
  coherente con un panel que no se abre. El `unitId` explícito conserva la
  prioridad aunque la unidad esté muerta, como el panel.
- Sin preguntas abiertas.

# Fricción reutilizable

Sin entradas: no hay comportamiento novedoso, fallo repetible ni contradicción
documental que reportar.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | `none` (primer intento) |
| `report_bytes` | 2876 |
| `overflow` | `none` |
| `criteria_failed` | `0` |
