---
type: Task Report
title: "TASK-0025: informe del intento 1"
description: Mesa de combate EXP-003 con roster, presets, ataque, duelo y export.
task: TASK-0025
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:02:00Z }
artifacts: artifacts/TASK-0025/attempt-1/
verified:
---

# Estado

`success`. EXP-003 construido, registrado y listo para playtest; no se marca
`decided` ni se toca `src/`.

# Cambios

- `experiments/EXP-003-mesa-combate/`: página, `combat.ts`, UI, CSS, tests y
  export de prueba en `results/`.
- `manifest.ts` e `index.md`: EXP-003 `ready`. `experiment.md` solo cambia
  `experiment_status`; Decisión intacta.
- `tests/e2e/experiment-combat.spec.ts`: 4 pruebas de carga, presets, roster,
  ataque, duelo y export.
- Commit: `3b6f41c`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK, 2 avisos de tamaño | `docs-check-output.txt` |
| `pnpm test` | 31 archivos, 426 tests | `test-output.txt` |
| `pnpm run verify` | docs + config + tests + build OK | `verify-output.txt` |
| `pnpm run test:e2e` | 55 tests (4 nuevos) | `e2e-output.txt` |

Unitarios: 36 combinaciones, mínimo 1, distribución, RNG, duelo y redondeo.

# Evidencia visual

- `screenshots/preset-a.png`, `preset-b.png`, `preset-c.png`, `preset-d.png`,
  `roster-personalizado.png`, `tabla-personalizada.png`.
- A deja al centinela en ~2,63 ataques; C ~7,04; D ~1,20; B baja a 26/36.

# Desviaciones

- UI a mano: el shell no cubre roster ni presets; se reutilizan
  `_shell/styles.css`, `rng.ts` y `export.ts`.
- El export de prueba usa A, `decision: ""` y «pendiente de playtest»; no decide.

# Problemas conocidos y preguntas abiertas

- Valores de C y D elegidos por el runner: +6 PV/+1 armadura/−1 daño y
  PV×0,65/+2 daño. Quedan al playtest.
- `experiment.md` conserva la lista de parámetros de una unidad; el roster la
  sustituye. No se editó para no invadir al requirements-writer.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El workflow exige `timeout`, pero macOS no lo trae. | `zsh: command not found: timeout`. | Timeout de la herramienta de shell. | Afecta a cualquier runner en macOS. | Documentar `gtimeout` o el timeout de la herramienta. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3071 |
| `report_bytes` | 2542 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
