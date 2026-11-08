---
type: Task Report
title: "TASK-0037: informe de ejecución"
description: IA de alerta con 4 MP, regreso y huida determinista del cobarde.
task: TASK-0037
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:10:00Z }
artifacts: artifacts/TASK-0037/attempt-1/
verified:
---

# Estado

`success`. Motor, tests y E2E verdes; sin cambios en `src/host/`, `docs/`,
`experiments/`, dependencias ni valores de combate.

# Cambios

- Archivos: `src/game/ai.ts`, `combat.ts`, `perception.ts`, `turn.ts`,
  `types.ts`; tests unitarios y E2E citados en `diff-stat.txt`.
- Commit SHA: `9933e603e20c7c13b50297600a6b2927ba6344f5`.
- `planEnemyAction` devuelve secuencias de hasta 4 MP; alerta ataca al llegar y
  conserva la acción; regreso no ataca y duerme al llegar.
- Huida determinista del cobarde con `fleeing`, umbral 40 %, LOS y desempate
  BFS; `EnemyFled` con `unitId`. `Math.random` ausente.
- Criterios: [TASK-0037](../../../docs/tasks/TASK-0037-motor-ia-alerta-mp-huida-cobarde.md#criterios-de-aceptación).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` (baseline previo) | 63 passed | `e2e-baseline.txt` |
| `pnpm exec vitest run ai turn integration combat perception` | 85 passed | `test-output.txt` |
| `pnpm run verify` | 549 tests + build OK | `verify-output.txt` |
| `pnpm run test:e2e` (final) | 63 passed | `e2e-output.txt` |

# Evidencia visual

- Rutas: `test-results/` (capturas Playwright de fallos intermedios, no
  versionadas).
- Qué debe mirar el usuario: no hay UI nueva; TASK-0039 cubre QA visual.

# Desviaciones

- Los E2E de combate asumían un tile por fase y la secuencia RNG inicial. Se
  ajustaron solo supuestos: daño/HP derivados de `AttackPerformed`, semillas
  `FEEDBACK_SEED=1` y `NORMAL_FEEDBACK_SEED=9`, y `defeatAllEnemies` conserva
  `enemy-1` donde el test necesita rematarlo.
- `tests/e2e/support.ts`: `approachEnemy` usa Dijkstra con penalización de
  visión y `defeatAllEnemies` retirada BFS. No cambia reglas; evita que la
  persecución de 4 MP invalide escenarios de presentación.
- `floor-qa-ambient` despeja enemigos dejando `enemy-1` vivo y lejos de los
  tiles de ambiente, porque la caminata anterior terminaba en derrota.
- No se borró, saltó ni debilitó ningún test unitario; los legacy de turno
  solo cambiaron de “un tile” a “hasta 4 MP”.

# Problemas conocidos y preguntas abiertas

- Riesgo TASK-0035: un alertado por onda que luego ve al jugador no reemite
  `EnemySpotted`; no bloquea. Feedback en TASK-0038.
- La cobertura E2E específica de huida/alerta sigue en TASK-0039.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| E2E de combate fijan daño/HP y “un tile por fase” | Cambios en 7 specs y `support.ts`; baseline previo 63/63 (`e2e-baseline.txt`) | derivar de eventos y helpers con pathfinding | cualquier cambio de IA o RNG rompe muchos specs | documentar en `docs/harness` que los specs deriven de eventos | bajo | `deferred` |

Disposición del lead: `deferred` a `requirements-writer` por ser fricción
documental/de arnés (`docs/harness/**` fuera del alcance del lead). La evidencia
“12/63 fallos iniciales” no está en `e2e-baseline.txt` (63/63 OK); se descarta
ese dato y se conserva la propuesta. No bloquea TASK-0037.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2723 |
| `report_bytes` | 3573 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
