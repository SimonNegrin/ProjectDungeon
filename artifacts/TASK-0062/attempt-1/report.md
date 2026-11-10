---
type: Task Report
title: "TASK-0062: informe de ejecución"
description: Sufijo por pasada de --repeat-each y prueba del helper.
task: TASK-0062
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T21:50:00Z }
artifacts: artifacts/TASK-0062/attempt-1/
verified:
---

# Estado

`success`. Helper corregido, prueba añadida y tres pasadas sin sobrescritura.
`docs/harness/visual-qa.md` queda al lead.

# Cambios

- `tests/e2e/artifacts.ts`: usa `testInfo.repeatEachIndex` (`project.repeatEach`
  no refleja el flag en Playwright 1.65) y lee `E2E_ARTIFACTS_DIR` por llamada.
  Pasada 0 = `<spec>/...` (corrida única intacta); 1..N-1 =
  `<spec>/repeat-<índice>/...`; nombre de archivo intacto.
- `tests/unit/artifacts-helper.test.ts`: 7 casos (sin variable, única, índices
  0/1/2, `project.repeatEach` engañoso, segmento de spec), sin reloj ni estado
  de módulo.
- Commit `2fd7e94`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `--repeat-each=3` con `E2E_ARTIFACTS_DIR` | 3/3; 3 PNG | `repeat-each-output.txt`, `find-repeat.txt` |
| `pnpm run test:e2e` | 98/98 | `e2e-output.txt` |
| `pnpm run test` | 825/825 | `test-output.txt` |
| `pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run docs:check` | OK | `docs-check-output.txt` |
| Vitest del helper | 7/7 | `unit-output.txt` |

# Evidencia visual

- `experiment-shell/{,repeat-1/,repeat-2/}shell-smoke.png`: tres PNG.
- `repeat-before-fix/experiment-shell/shell-smoke.png`: una captura para tres
  pasadas; fallo anterior.

# Desviaciones

- Se conserva el esquema de corrida única; la pasada 0 comparte ruta con ella
  porque `repeatEachIndex` no las distingue. No se añade `repeat-0`.
- No se edita `docs/`; guía y plantilla mantienen el texto anterior.

# Problemas conocidos y preguntas abiertas

- No hay total público (`repeat-1`, `repeat-2`…).
- Corrida única y repetida en la misma carpeta: la pasada 0 pisa la única.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Plantilla cita `<spec>/screenshots/`; repetición usa `repeat-N/` | `docs/templates/task.md:66`, `docs/harness/visual-qa.md:63-70` | Citar ruta real | Toda tarea E2E con capturas repetidas | Añadir `repeat-<índice>` a docs | Bajo; solo docs | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2557 |
| `report_bytes` | 2556 |
| `overflow` | `none` |
| `criteria_failed` | 1 (docs del lead) |
