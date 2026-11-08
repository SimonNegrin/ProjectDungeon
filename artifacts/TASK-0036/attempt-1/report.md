---
type: Task Report
title: "TASK-0036: informe de ejecución"
description: Colocación determinista de cuatro enemigos y ajuste de E2E.
task: TASK-0036
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:30:00Z }
artifacts: artifacts/TASK-0036/attempt-1/
verified:
---

# Estado

`success`. Cuatro enemigos deterministas, tests nuevos y E2E verdes.

# Cambios

- Archivos: `src/game/enemy-placement.ts` (nuevo), `engine.ts`, `index.ts`,
  `tests/unit/game/enemy-placement.test.ts` (nuevo), `engine.test.ts`,
  `tests/e2e/support.ts` y seis specs E2E.
- Commits: `751f65b` (motor y unitarios), `5aa514b` (E2E).
- `placeMapEnemies` usa `mulberry32(map.seed ^ sal)`, conserva `spawns.enemy`
  como `enemy-1` si cumple y deriva los 4 si no. Sin tocar RNG del BSP ni combate.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/enemy-placement.test.ts tests/unit/game/engine.test.ts tests/unit/game/map.test.ts tests/unit/game/map-integration.test.ts` | 78 passed | `test-output.txt` |
| `pnpm run verify` | docs+config+536 tests+build OK | `verify-output.txt` |
| `pnpm run test:e2e` | 63 passed | `e2e-output.txt` |

# Evidencia visual

- Capturas de Playwright en `test-results/` (no versionadas): `enemy-phase.png`,
  `attack-after-walk.png` y `victory.png`.

# Desviaciones

- Mapas inyectados sin salas conservan el enemigo único histórico; el BSP de
  producción siempre coloca 4.
- Los E2E de victoria derrotan a los 4 con `defeatAllEnemies`; los de derrota
  despiertan antes de pasar turnos. `frame-qa`/`motion-qa` se ajustan también a
  enemigos dormidos (TASK-0034).

# Problemas conocidos y preguntas abiertas

- En `e5f2d64` ya fallaban 6 E2E por supuestos previos a la percepción
  (`e2e-baseline.txt`); corregidos dentro del ajuste E2E.
- Sin preguntas bloqueantes.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief asumía E2E verdes salvo supuestos de 1 enemigo, pero la base tenía 6 fallos por IA dormida | `e2e-baseline.txt` | Comparar con worktree base antes de tocar E2E | Evita atribuir fallos previos al runner | Registrar el baseline E2E en el brief | Bajo | `accepted` |

Disposición del lead: `accepted`; baseline E2E en futuros briefs.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2717 |
| `report_bytes` | 2543 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
