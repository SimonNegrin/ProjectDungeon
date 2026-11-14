---
type: Task Report
title: "TASK-0122: informe de ejecución"
description: Configuración serializable de partida y constructor único del estado inicial.
task: TASK-0122
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:55:00Z }
artifacts: artifacts/TASK-0122/attempt-1/
verified:
---

# Estado

`blocked` solo por `pnpm run verify`: falla el timeout de 5 s del barrido A/B/C
de `experiments/EXP-004-salas-irregulares/src/spawn.test.ts` bajo la suite
paralela. Ese archivo pasa aislado y la suite completa pasa con
`--no-file-parallelism` (94/94, 1344/1344); `build` y `check:bundle` pasan. No se
ha tocado el experimento.

# Cambios

- `src/game/config.ts`: `PlayerVariant`, `PlayerConfig`, `GameConfig`,
  `GameConfigError`, default y validación antes de generar el mapa.
- `src/game/{types,roster,engine}.ts`: `Unit.variant`, `GameState.config`,
  creación de `player-1..N` en orden, nombre vacío resuelto con el arquetipo,
  respaldo `party[0]` y `Restart` desde `state.config`; constructor único.
- `src/host/{session,main,debug}.ts`: la sesión conserva seed y party, `load`
  lee `state.config`, el arranque usa el default y el snapshot expone `config`
  clonada.
- Tests: `engine.test.ts` (N=1/6, orden, variante, nombre, semilla, JSON, errores
  y respaldo), `session.test.ts` (constructor único, equivalencia,
  Restart/regenerate/load) y `debug.test.ts` (snapshot clonado).
- Commits: `0c4ee7c` (motor/host), `1b75673` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run ...` (3 archivos) | 53/53 OK | `test-output.txt` |
| `pnpm run verify` | Falla: timeout conocido de EXP-004 (5 s) | `verify-output.txt` |
| `pnpm exec vitest run --no-file-parallelism` | 1344/1344 OK | `verify-output.txt` |
| `pnpm run build` + `check:bundle` | OK | `verify-output.txt` |

# Evidencia visual

- No aplica: no hay UI ni Canvas en esta tarea.

# Desviaciones

- `docs/tasks/TASK-0122-motor-configuracion-partida-constructor-unico.md` ya
  estaba modificado en el árbol (`task_status: in_progress`) al empezar; no se
  ha tocado ni incluido en los commits.

# Problemas conocidos y preguntas abiertas

- ¿Acepta el lead el flake conocido de EXP-004 o lo escala a `harness-keeper`
  antes de cerrar? El resto de `verify` está verde.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `verify` falla por timeout de 5 s del barrido A/B/C de EXP-004 con la suite paralela | 2 ejecuciones de `verify`; aislado pasa; `--no-file-parallelism` 1344/1344; ya anotado en `docs/log.md` | `pnpm exec vitest run --no-file-parallelism` | Afecta a cualquier tarea que ejecute `verify` en esta máquina | `harness-keeper`: subir el timeout del test o fijar serial en CI | Bajo; solo configuración de test | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2067 |
| `report_bytes` | 3105 |
| `overflow` | `none` |
| `criteria_failed` | 1 (`pnpm run verify`, flake externo) |
