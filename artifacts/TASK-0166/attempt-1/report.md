---
type: Task Report
title: "TASK-0166: informe de ejecución"
description: "La lista de hechizos calcula la disponibilidad con el jugador activo."
task: TASK-0166
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:52:00Z }
artifacts: artifacts/TASK-0166/attempt-1/
verified:
---

# Estado

`success`. `buildSpellMenuModel` resuelve el lanzador con `activePlayer(state)`;
sin activo no cae al primero y todos los hechizos aparecen por nivel.

# Cambios

- `src/host/spell-menu.ts`: se elimina el resolutor local que caía en el primer
  vivo y se importa `activePlayer` de `src/game/party`.
- `tests/unit/host/spell-menu.test.ts`: activo en el segundo, activo en el
  primero, sin activo y relevo con `N` de ida y vuelta; expectativas derivadas
  del catálogo y del maná.
- `tests/e2e/spell-hud-qa.spec.ts`: hotseat guerrero→mago con `Q` y `N`,
  comprobando `data-availability` en el DOM y el retorno sin herencia.
- Commit SHA: `d176637`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run spell-menu.test.ts` antes | 3 fallos / 7 pasan | `test-fail-before.txt` |
| `vitest run spell-menu.test.ts` | 10/10 | `test-pass-after.txt` |
| `pnpm run test:e2e spell-hud-qa.spec.ts` | 6/6 | `e2e-output.txt` |
| `pnpm run verify` | 113 archivos / 1832 tests, tsc, build, bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 285/285 | `e2e-output.txt` |

Antes del arreglo la lista usaba nivel y maná del primero; tras `N` tampoco
cambiaba. No se debilitó ningún test existente.

# Evidencia visual

- No aplica: la ficha prohíbe capturas. La E2E lee `data-availability` y el
  texto de disponibilidad antes y después de cada `N`.

# Desviaciones

- Ninguna. No se tocó `docs/` ni la ficha; la firma de criterios y
  `verify:task` quedan para `game-lead`.

# Problemas conocidos y preguntas abiertas

- Sin preguntas abiertas.

# Fricción reutilizable

Sin entradas.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | `none` (primer intento) |
| `report_bytes` | 2114 |
| `overflow` | `none` |
| `criteria_failed` | `0` |
