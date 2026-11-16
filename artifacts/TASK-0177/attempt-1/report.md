---
type: Task Report
title: "TASK-0177: informe de ejecución"
description: Maná +4 por turno con constante global; producción, tests y experimento v2 actualizados.
task: TASK-0177
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:08:47Z }
artifacts: artifacts/TASK-0177/attempt-1/
verified:
---

# Estado

`success`: el maná recupera +4 por turno en vez de rellenarse; `pnpm run verify`
verde con 118 archivos y 1907 tests.

# Cambios

- `src/game/mana.ts`: `MANA_RECOVERY_PER_TURN = 4`; `restoreMana` recalcula el
  máximo y recorta sin regalar; `recoverMana` aplica
  `min(actual + 4, máximo)`.
- `src/game/turn.ts`: inicio de turno de jugador y enemigo usa `recoverMana`.
- Tests de `mana`, `turn`, `magic` y `spell-flow`: expectativas derivadas de la
  constante; cubren +4, tope, inicial lleno, cambio de nivel, muerto y
  persistencia del gasto.
- `experiments/EXP-003-mesa-combate` v2: `restoreTurn` suma +4 y las métricas
  cuentan la recuperación real; snapshot de medición regenerado.
- Commit SHA: `c3d044f2acfd718b5655f93cbcdb8541492c6335`.

# Cobertura por criterio

- 1 ✓ Constante exportada y única; recuperación `min(actual + 4, máximo)`.
- 2 ✓ Jugador y enemigo +4 al empezar su turno; quien no ha actuado conserva;
  el inicial sigue lleno.
- 3 ✓ Subir nivel no regala (0/0 → 0/16); bajar recorta (12/16 → 8/8).
- 4 ✓ Tests actualizados sin debilitar; costes, efectos y resolución intactos.
- 5 ✓ `pnpm run verify`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 1907 tests, build y bundle | `verify-output.txt` |
| Vitest focalizado | 6 archivos, 165 tests | `targeted-tests-output.txt` |
| `pnpm run build:experiments` | ok | `build-experiments-output.txt` |

# Evidencia visual

- No aplica: sin cambios de HUD ni E2E (TASK-0179).

# Desviaciones

- `experiments/EXP-003-mesa-combate/experiment.md` sigue describiendo la recarga
  completa y sus tablas son anteriores a +4; queda para `game-lead`.
- El snapshot `results/v2-seed-1017-duels-1000.json` se regeneró con el modelo
  nuevo; `measure.test.ts` exige coincidencia byte a byte.
- El experimento v2 importa la constante de `src/game/mana.ts` para no duplicar
  el 4.

# Problemas conocidos y preguntas abiertas

- ¿La actualización de `experiment.md` y su tabla de maná entra en el cierre de
  REQ-025 o en otra tarea? No la toco.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `measure.test.ts` solo escribe el JSON de resultados si falta | `measure.test.ts:124-131`; snapshot regenerado aquí | Apartar el JSON y ejecutar el test | Cualquier cambio del modelo v2 repite el paso | Modo `UPDATE_RESULTS=1` | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin brief en el intento 1) |
| `report_bytes` | 3024 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
