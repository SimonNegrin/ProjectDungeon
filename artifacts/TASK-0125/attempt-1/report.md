---
type: Task Report
title: "TASK-0125: informe de ejecución"
description: Ficha de arquetipo con nueve atributos, arma, magia y dos miniaturas.
task: TASK-0125
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:45:00Z }
artifacts: artifacts/TASK-0125/attempt-1/
verified:
---

# Estado

`success`. La ficha cuelga de `player-archetypes` y muestra nueve atributos,
arma y magia desde `ROSTER`; sus dos miniaturas cambian con el arquetipo y la
variante.

# Cambios

- `src/host/archetype-sheet.ts`: modelo puro, 18 celdas de REQ-016 y arma
  equipada/futura.
- `src/host/player-screen-view.ts`: `player-archetype-options` y ficha
  (`player-sheet`, 9 filas, arma, `player-variants`) reutilizada en cada render.
- `index.html` retira la sección estática `player-variants`; `ui.css` añade
  ficha, miniaturas y ajuste compacto para 1280×720.
- Tests: `tests/unit/host/archetype-sheet.test.ts` y ampliación de
  `tests/e2e/player-screen.spec.ts`.
- Commits: `bd1c8c6`, `39fe050`, `bc497b6`, `6e524eb`; ver `commit.txt`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/archetype-sheet.test.ts` | 8/8 OK | `test-output.txt` |
| `pnpm run verify` | 1434/1434, tsc, build y bundle OK | `verify-output.txt` |
| `E2E_ARTIFACTS_DIR=tests/e2e pnpm exec playwright test player-screen.spec.ts` | 5/5 OK | `e2e-output.txt` |

Una pasada manual agotó 5 s en un test de `experiments/EXP-004`; `verify`
pasó 1434/1434.

# Evidencia visual

- `tests/e2e/player-screen/screenshots/ficha-guerrero-1280x720.png`
- `tests/e2e/player-screen/screenshots/ficha-mago-1280x720.png`
- Mirar: nueve filas legibles sin depender del color, «Espada»/«bastón
  (futura)», magia 0/4, miniaturas, variante activa con texto y contorno, y
  acciones visibles a 1280×720.

# Desviaciones

- `ui.css` reduce gaps y padding y usa stats en cinco columnas para que ficha,
  miniaturas y acciones quepan a 1280×720.
- El contador E2E previo incluía las dos miniaturas; ahora cuenta solo
  `player-archetype-options`.
- `?test=1`, «Cargar», nombre, avance, cancelación, paso 1, `hud.ts`, roster y
  dependencias no cambian.

# Problemas conocidos y preguntas abiertas

- `hud.ts` mantiene `PORTRAIT_RECTS`; unificarlo es TASK-0127. Resumen y
  «Empezar» siguen fuera de alcance (TASK-0126).

# Fricción reutilizable

Sin entradas.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2475 |
| `report_bytes` | 2557 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
