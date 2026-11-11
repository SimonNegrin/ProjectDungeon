---
type: Task Brief
title: "TASK-0070: brief del intento 2"
description: Añadir el acierto/daño del arma en la celda Arma de la tabla de combates.
task: TASK-0070
attempt: 2
status: stable
brief_bytes: 2324
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:15:00Z }
---

# Objetivo

Cerrar la brecha de R-004 detectada en la verificación del intento 1: la celda
**Arma** de la tabla de combates debe mostrar también el acierto y daño del arma
equipada, no solo el selector. El resto del intento 1 queda validado y no se
toca.

# No objetivos

- E2E, QA visual, Playwright o capturas: TASK-0071.
- Cambiar columnas, agrupación, recálculo, resets, export, motor, fórmulas,
  `src/` de producción, `tests/` de producción, `index.html`, `public/` ni
  `experiment.md`.
- Dependencias nuevas.

# Invariantes

- Se mantienen las 15 columnas exactas y un solo input/select por stat.
- El hint va dentro de la celda Arma existente; no añade columna ni input.
- Debe actualizarse al cambiar el arma del enemigo, al editar el arma en la
  tabla de armas y en cualquier reset; el foco del selector no se pierde.
- Sin arma se muestra «sin arma»; con arma, «Acierto +N · Daño +N» (usa
  `formatWeaponBonus`).

# Criterios de aceptación

Además de los de `docs/tasks/TASK-0070-exp-003-tres-tablas-ui.md`, la celda Arma
de cada bloque de combates muestra el acierto y daño del arma del enemigo y se
mantiene sincronizada con el catálogo de trabajo.

# Contexto mínimo

- `experiments/EXP-003-mesa-combate/src/main.ts`: `buildSharedFieldCell`,
  `renderCombats`, `CombatBlockRefs`, `syncCombats`.
- `experiments/EXP-003-mesa-combate/src/bench-ui.ts`: `formatWeaponBonus`.
- Requisito R-004 en `docs/requirements/REQ-028-ajuste-interactivo-balance.md`.
- Evidencia de la brecha: la celda Arma solo contiene el `select`; el hint de
  arma existe en la tabla de héroes pero no en combates.

# Artefactos

- `artifacts/TASK-0070/attempt-2/report.md`, `test-output.txt`,
  `verify-output.txt`. Sin capturas.

# Riesgos y decisiones abiertas

- No romper el ancho de la columna Arma a 1280; el hint puede envolver.
- Si `pnpm run verify` falla por el timeout ajeno de EXP-004, repite el comando
  una vez y documenta el resultado focalizado; no cambies EXP-004.
- Sin decisiones creativas abiertas.
