---
type: Task Brief
title: "TASK-0071: brief del intento 1"
description: E2E y QA visual de las tres tablas inline de EXP-003.
task: TASK-0071
attempt: 1
status: stable
brief_bytes: 2204
read_detail: true
generated: { by: task-lead, at: 2026-11-11T23:55:00Z }
---

# Objetivo

Sustituir el E2E obsoleto de `tests/e2e/experiment-bench.spec.ts` por cobertura de
las tres tablas inline y adaptar solo los localizadores obsoletos de
`tests/e2e/experiment-combat.spec.ts`. `pnpm run verify` y `pnpm run test:e2e`
verdes; capturas 1280×720 y 900×700 en `artifacts/TASK-0071/attempt-1/`.

# No objetivos

- No tocar motor, fórmulas, catálogo base, `main.ts`, `bench-ui.ts`, `src/` de
  producción, `index.html`, `public/` ni `experiment.md`.
- `experiment.css` solo si la QA visual bloquea R-015/T-005; mínimo y documentado.
- No debilitar tests: sin `skip`/`only`, timeouts artificiales ni aserciones
  laxas.

# Invariantes

- `?test=1&seed=1017`, 1000 duelos; API e IDs actuales.
- 12 filas en 3 bloques de 4; objetivos 75/85/30; overrides base vacíos.
- Un input por stat con `rowspan=4`, foco conservado y 4 filas resaltadas.
- Recálculo: enemigo 4, héroe 3, espada 6, hacha 4, cuchillo 0; objetivo 0 duelos.
- Resets por tabla y global; sin reset por campo.

# Criterios de aceptación

`docs/tasks/TASK-0071-exp-003-tres-tablas-e2e.md#criterios-de-aceptación`.

# Contexto mínimo

- `tests/e2e/experiment-bench.spec.ts`: reescribir (usa la UI v1).
- `tests/e2e/experiment-combat.spec.ts`: solo localizadores
  (`matchup-*`→`combats-*`).
- `experiments/EXP-003-mesa-combate/src/main.ts`: solo lectura.
- IDs, estados, casos, comandos y capturas: `brief-detalle.md`.
- Baseline (9 fallos por IDs v1): `attempt-1/logs/baseline-e2e.txt`.

# Artefactos

`attempt-1/`: `report.md`, `test-output.txt`, `verify-output.txt`,
`screenshots/`, `logs/`, `exports/`. Capturas con
`E2E_ARTIFACTS_DIR=artifacts/TASK-0071/attempt-1`; copia las clave a
`attempt-1/screenshots/` y registra la ruta final.

# Riesgos

- Timeout ajeno de `EXP-004 spawn`: evidencia y secuencia equivalente de
  TASK-0070; no tocar EXP-004.
- Si el layout incumple R-015/T-005: ajuste CSS mínimo con evidencia
  antes/después.
