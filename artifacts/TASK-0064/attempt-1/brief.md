---
type: Task Brief
title: "TASK-0064: brief del intento 1"
description: Página v2 de EXP-003 con controles, tabla, detalle, export y API de test.
task: TASK-0064
attempt: 1
status: stable
brief_bytes: 2788
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T19:10:00Z }
---

# Objetivo

Sustituir la página v1 de `experiments/EXP-003-mesa-combate/` por la mesa v2.0:
semilla y duelos editables, 12 emparejamientos, detalle, export JSON y
`window.__experiment`. Mide y exporta; no aprueba balance.

# No objetivos

- Cambiar reglas, fórmulas o catálogo de `src/v2/**`; solo se admite exponer una
  medición parametrizada sin alterar los valores por defecto.
- Tocar `src/` de producción, `experiment.md`, `docs/harness/**` ni plantillas.
- Añadir dependencias, arte o escenarios de grupo.

# Invariantes

- `?test=1&seed=1017` determinista; misma semilla y duelos ⇒ mismo snapshot.
- Semilla 1017 y 1.000 duelos siguen reproduciendo
  `results/v2-seed-1017-duels-1000.json`.
- Cabecera: valores pendientes de aprobación del usuario y hallazgo actual
  96,3–100 % de victorias del héroe, fuera de la banda 40–60 %.
- No se borran ni debilitan tests: el e2e v1 se migra a v2 con cobertura
  equivalente.

# Criterios de aceptación

En [la tarea](../../../docs/tasks/TASK-0064-exp-003-v2-pagina-api-export.md#criterios-de-aceptación).

# Contexto mínimo

- `src/v2/measure.ts`: `runMatchup`, `measureAll`, payload actual.
- `src/v2/types.ts`: `MatchupResult` y métricas.
- `src/main.ts` y `src/experiment.css`: UI v1 a reemplazar; `src/combat.ts` no se
  toca. Shell: `experiments/_shell/{styles.css,export.ts,types.ts}`.
- `tests/e2e/experiment-combat.spec.ts`: e2e v1 a migrar (`artifactPath`).
- Hallazgo: `artifacts/TASK-0063/attempt-1/report.md`.

# Enfoque

- Helpers puros de formato/agregación en `src/ui.ts` + test; `src/v2/` prohíbe
  `Math.random`/relojes.
- Parametrizar semilla/duelos con argumentos opcionales o función nueva,
  conservando `measureAll()` y el JSON byte a byte.
- Export sin timestamp: versión de catálogo, semilla, escenario, catálogo y
  métricas; copiar y descargar.
- API: `getSeed`, `setSeed`, `getDuels`, `setDuels`, `runAll`, `getResults`,
  `snapshot`, `getDecision`, `reset`; `getDecision` devuelve el payload exportable.
- Migrar el e2e y capturar tabla/detalle con
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0064/attempt-1`.

# Artefactos

`artifacts/TASK-0064/attempt-1/`: `report.md`, `test-output.txt`,
`docs-check-output.txt`, `verify-output.txt`, `e2e-output.txt`, capturas y JSON.
Commit SHA en el informe.

# Riesgos y decisiones abiertas

- 12×1.000 duelos al arrancar puede ser lento en navegador: medir y mostrar carga
  si hace falta, sin cambiar el defecto de 1.000. Sin decisión creativa abierta.
