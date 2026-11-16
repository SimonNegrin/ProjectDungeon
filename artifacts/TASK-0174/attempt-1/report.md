---
type: Task Report
title: "TASK-0174: informe de ejecución"
description: Densidad por party real y suelo de una ficha por sala no-spawn.
task: TASK-0174
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:17:13Z }
artifacts: artifacts/TASK-0174/attempt-1/
verified:
---

# Estado

`success`. El generador denso recibe `P = players.length` y el total aplica
`max(fórmula, R)` antes de repartir, con aviso y desglose en el snapshot.

# Cambios

- `src/game/engine.ts`: `createInitialState` deriva `numPlayers` de la party
  validada y lo pasa a la generación; es el único cableado de producción.
- `src/game/map.ts`: `MapOptions.numPlayers` documentado para generadores de
  densidad; BSP lo ignora.
- `src/game/chambers/core/enemies.ts`: `enemyTotalFor` aplica el suelo;
  `computeEnemyBudget` centraliza N, P, R, ambos totales y el aviso; el
  `breakdown` expone `formulaTotal`, `nonSpawnRooms` y `total`.
- `src/host/debug.ts`: el snapshot expone `enemyBudget` (P real, R, fórmula y
  total aplicado) y `warnings`; `null` fuera de densidad (BSP).
- Tests: matriz y suelo unitarios, colocación sintética con 6 salas no-spawn,
  creación con 1/6 jugadores, snapshot y guardado/carga sin regenerar.
- Commit SHA: `e7a177d4a941e855b63a99e88ed71c0899afcbef`

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 1901 tests, build y bundle | `verify-output.txt` |
| `pnpm exec playwright test tests/e2e/host-growth-render-qa.spec.ts` | 5/5 | `e2e-growth-output.txt` |

# Evidencia visual

- Rutas: no hay capturas; el plan de test declara «E2E / visual: no».
- Qué debe mirar el usuario: el total del mapa con 1 y 6 jugadores en el
  snapshot (`enemyBudget`) y el aviso del suelo.

# Desviaciones

- Se adaptó una aserción E2E de `host-growth-render-qa` que esperaba 11
  enemigos con la party por defecto de 1 jugador (`P = 6` heredado). Ahora exige
  4-6; no se relajó ninguna otra comprobación.

# Problemas conocidos y preguntas abiertas

- El snapshot recalcula el presupuesto con los factores documentados porque
  producción no los configura; `EXP-004` conserva los suyos en su capa
  (TASK-0175). Si un futuro camino de producción los personalizara, habría que
  persistirlos en el mapa.
- El formato de guardado no cambia: `enemyBudget` se deriva al cargar desde el
  mapa y la party guardados. El reparto se conserva (test de carga).

# Fricción reutilizable

Sin entradas que cumplan un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin brief en el intento 1) |
| `report_bytes` | 2680 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
