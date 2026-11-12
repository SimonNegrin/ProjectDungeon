---
type: Task Report
title: "TASK-0081: informe de ejecución"
description: Nivel de magia único 0–4 y maná nivel × 4 con recarga por turno.
task: TASK-0081
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T22:50:00Z }
artifacts: artifacts/TASK-0081/attempt-1/
verified:
---

# Estado

`success`. `pnpm run verify` verde en el tercer intento (1054 tests, build y
bundle). Los dos primeros fallaron solo por el test pesado de `EXP-004` bajo
carga paralela; ver fricción.

# Cambios

- `UnitStats.magicLevel` (0–4) sustituye a `MagicSchool`/`stats.magia`; `Unit.mana
  { current, max }` usa una única fórmula (`src/game/mana.ts`).
- Roster: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1, resto 0. Bestiario:
  los tres tipos 0. Maná 16/12/8/4/0; enemigos 0/0.
- `turn.ts` recarga maná con MP y acciones solo en vivas; `debug.cloneUnit`
  clona `mana`; serialización y snapshot conservan `magicLevel` y el maná.
- Tests migrados y nuevos en `tests/unit/game/mana.test.ts`. Commit: `5dab41c`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | verde: 1054/1054, build y bundle OK | `verify-output.txt` |
| `pnpm run test` | verde: 1054/1054 | `test-output.txt` |
| `pnpm run test:e2e` | no aplica (sin UI/HUD) | — |

# Evidencia visual

No aplica: sin cambios de HUD, render ni input.

# Desviaciones

Ninguna de alcance. No se tocaron `docs/`, dependencias, acciones, réplica ni MP;
`package.json` y `pnpm-lock.yaml` intactos.

# Problemas conocidos y preguntas abiertas

- `verify` falló dos veces por `experiments/EXP-004.../spawn.test.ts` (timeout
  de 5 s bajo carga); aislado y con `--maxWorkers=4` pasa.
- El test manual de Mago/Cocinero en debug queda para `TASK-0083`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `EXP-004` agota 5 s con la suite completa y tumba `verify` | `logs/verify-failed.txt`, `logs/spawn-test-output.txt`, `logs/test-maxworkers4.txt` | Reintentar o `--maxWorkers=4` | Flake repetible que bloquea el gate en máquinas cargadas | Subir el timeout o acotar workers | Bajo | `pending` |
| La arquitectura dice que `Unit` guarda `magicLevel`; ficha y tipos lo ponen en `UnitStats` | `docs/design/architecture.md:99`, `src/game/types.ts:39` | Ninguno; implementado según la ficha | `TASK-0083` puede buscar el campo en el nivel equivocado | Precisar «`UnitStats.magicLevel` y `Unit.mana`» | 1 min | `pending` |
