---
type: Task Report
title: "TASK-0148: informe del intento 1"
description: Resurrección por cadáver concreto, índice y recursos.
task: TASK-0148
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:02:00Z }
artifacts: artifacts/TASK-0148/attempt-1/
verified:
---

# Estado

`success`. Motor de resurrección y tests; sin host, menú, HUD ni E2E.

# Cambios

- Archivos: `src/game/{magic,types,engine}.ts` y
  `tests/unit/game/{magic,engine,turn}.test.ts`.
- Commit: `8e553ebd047194cfb43ab3cac1e8c258f06da97a`.
- `CastSpell.targetId?` elige cadáver concreto; sin él se resuelve por casilla
  (compatible). La casilla sale del `Container.corpseOf`; allí se miden
  adyacencia y LOS.
- Al resucitar se quita `ghost`, se vuelve a la casilla del cadáver con
  `ceil(0,6 × maxHp)` (mín. 1) y su máximo de acciones; MP, maná y cupo llegan
  al empezar su turno (REQ-031 T-003).
- Índice: `resolveEndTurn` ya devuelve la misma ronda si el índice no pasó y la
  siguiente si pasó; sin doble turno.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/{magic,engine,turn}.test.ts` | 130/130 | `test-output.txt` |
| `pnpm run verify` | OK (1746 tests, docs, config, build, bundle) | `verify-output.txt` |

# Evidencia visual

- No aplica.

# Desviaciones

- Con `targetId` manda el id y la casilla del contenedor; `target` no decide
  (probado con el objetivo en la posición del fantasma).

# Problemas conocidos y preguntas abiertas

- El `Container` del cadáver se conserva tras resucitar (brief; sin transferir
  objetos). Riesgo: una segunda muerte ve el cadáver viejo en
  `settlePlayerDeath`, no crea otro y descarta el equipo nuevo. Decide el lead.
- Sin `targetId`, con varios cadáveres se elige el primero de `players`; el host
  debe enviar `targetId`.

# Fricción reutilizable

—

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2487 |
| `report_bytes` | 2045 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
