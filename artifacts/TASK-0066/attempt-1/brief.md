---
type: Task Brief
title: "TASK-0066: brief del intento 1"
description: Motor y datos puros del banco de ajuste de EXP-003, sin UI.
task: TASK-0066
attempt: 1
status: stable
brief_bytes: 2535
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:30:00Z }
---

# Objetivo

Crear un módulo puro en `experiments/EXP-003-mesa-combate/src/v2/` con el estado
de datos del banco de ajuste: catálogo de trabajo con overrides, objetivos por
enemigo, recálculo de filas afectadas, diagnóstico 4-de-4 y export reproducible.
Exportarlo desde `v2/index.ts` y cubrirlo con tests.

Lee `brief-detalle.md` antes de implementar (contrato técnico).

# No objetivos

- UI, DOM, tabla de armas, editor expandible, `main.ts`, `ui.ts`,
  `experiment.css` ([TASK-0067](../../../docs/tasks/TASK-0067-exp-003-banco-ajuste-ui.md)).
- E2E, capturas y QA visual
  ([TASK-0068](../../../docs/tasks/TASK-0068-exp-003-banco-ajuste-e2e.md)).
- Cambiar `measure.ts`, `duel.ts`, `catalog.ts`, el escenario, las fórmulas o los
  valores base; editar `experiment.md`.
- Añadir dependencias.

# Invariantes

- `CATALOG` es inmutable: el overlay devuelve un catálogo nuevo; ningún test debe
  observar mutación del base.
- Semilla, duelos y orden fijo de filas se mantienen al recalcular.
- Sin `Math.random`, `Date.now` ni `performance.now` en el runtime v2 (test
  existente).
- TypeScript estricto (`noUnusedLocals`, `noUnusedParameters`).
- No tocar `src/` de producción, `tests/` de producción, `index.html` ni
  `public/`.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0066-exp-003-banco-ajuste-motor.md#criterios-de-aceptación`;
no copiar.

# Contexto mínimo

- `src/v2/catalog.ts`: `CATALOG`, `templateFor`; bestiario con `weaponId`,
  stats, `maxHp`, `maxActions`, `armorId` y `shieldId`.
- `src/v2/types.ts`: `Catalog`, `CombatantTemplate`, `WeaponDefinition`, `Stats`.
- `src/v2/measure.ts`: `runMatchup`, `measureMatchups`, `MatchupResult`,
  `MeasurementPayload` y constantes.
- `../_shell/rng.ts`: `hashString` para el identificador determinista.
- Requisito: `docs/requirements/REQ-028-ajuste-interactivo-balance.md`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, API en el informe; commit
  SHA.

# Riesgos y decisiones abiertas

- [TASK-0067](../../../docs/tasks/TASK-0067-exp-003-banco-ajuste-ui.md) consumirá
  estos exports: prioriza funciones puras y serializables.
- No decidas objetivos ni valores de balance; 75/85/30 es solo la guía.
- No debilites ni borres tests existentes.
