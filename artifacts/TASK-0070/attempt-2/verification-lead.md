---
type: Verification
title: "TASK-0070: verificación independiente del lead"
description: Revisión del diff, re-ejecución de tests y comprobación de criterios de las tres tablas.
task: TASK-0070
attempt: 2
status: stable
generated: { by: task-lead, at: 2026-11-11T22:20:00Z }
---

# Alcance revisado

- Rama `task/TASK-0070`; commits `7b36a71` (brief), `d57af23` (helpers/tests),
  `8817540` (tres tablas), `895d6c5` (informe 1), `0443f1f` (brief 2),
  `afb062a` (hint de arma) y `13987d2` (informe 2).
- Diff completo revisado. Solo cambian
  `experiments/EXP-003-mesa-combate/src/{main.ts,bench-ui.ts,experiment.css,tables.test.ts}`
  y artefactos; `docs/tasks` solo refleja el estado de la tarea.
- `git diff --name-only main...HEAD -- src tests index.html public
  experiments/EXP-003-mesa-combate/experiment.md package.json` está vacío.

# Comprobaciones

- DoR: requisito REQ-028 v2 aprobado, criterios y plan de test, dependencia
  TASK-0069 `done`, artefactos y timeouts definidos.
- API `window.__experiment` conservada y ampliada; sin cambios en el motor.
- No se han borrado, saltado ni debilitado tests existentes: `tables.test.ts` es
  nuevo y no se modificó ningún test previo.
- Sin dependencias nuevas ni cambios en `src/` de producción.

# Tests ejecutados por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run experiments/EXP-003-mesa-combate/src` | 11 archivos, 178 tests OK | `attempt-2/test-exp003-lead.txt` |
| `pnpm run verify` | Falla solo el test ajeno `EXP-004 spawn` por timeout de 5 s bajo carga paralela (2 intentos) | `attempt-1/verify-output-lead*.txt` |
| `pnpm exec vitest run experiments/EXP-004-salas-irregulares/src/spawn.test.ts` | 20 tests OK aislado; confirma que el fallo no es de EXP-003 | `attempt-1/exp004-isolated-lead.txt` |
| docs + config + `vitest run --testTimeout=15000` + build + bundle | 72 archivos, 974 tests OK; tsc, vite y bundle OK | `attempt-2/verify-equivalent-lead.txt` |
| `pnpm run verify` en `main` tras la fusión | 974 tests, build y bundle OK | `attempt-2/verify-output-lead-main.txt` |

El informe del runner incluye una ejecución completa de `pnpm run verify` en
verde (973 tests) en `attempt-1/verify-output.txt`. El timeout de EXP-004 es
preexistente y ajeno a esta tarea: su código no aparece en el diff.

# Criterios de aceptación

| Criterio | Comprobación |
|---|---|
| 15 columnas exactas | `COMBAT_COLUMNS`, `colgroup` y `thead` tienen las 15 columnas en orden; test de columnas. |
| Bloques de 4 por enemigo, `rowspan` y un input por stat | `groupMatchupsByEnemy` y `rowSpan = block.rows.length`; un `<td>` por campo compartido; test de agrupación. |
| Foco resalta 4 filas y se conserva | `focus`/`blur` añaden `is-block-active`; `sync*` omite el elemento activo y no reconstruye el DOM al recalcular. |
| `% real` con delta/estado y 4/4 en el enemigo | `formatRealCell`, `formatFourOfFour`; el bloque pinta el 4/4 y los avisos de dispersión/arma global. |
| Tabla de armas con unidades bajo el nombre | `weaponRows`, `formatWeaponUsers`; test de unidades. |
| Tabla de héroes con set completo y «sin arma» | `HERO_COLUMNS`/`HERO_TABLE_FIELDS`; selectores con opción vacía; hint de arma. |
| Recálculo 4 / 3 / todas / objetivo | `affectedRows` y `recalculateMatchups`; tests de 4, 3 y 6 filas; objetivo solo diagnóstico; estado `aria-live` con recuento. |
| Sustitución de la tabla de 18 columnas y detalle ampliado | No queda `matchup-table`; detalle conserva acciones, hechizos, maná, PV, réplicas y duración y añade banda, TTK, turnos/rondas y daño. |
| Resets por tabla y global sin resets por campo | Botones «Restablecer enemigos/armas/héroes/todo»; no hay botones de reset dentro de celdas. |
| Ancho completo sin overflow de documento | `.experiment-shell` a `width:100%`, tablas con `table-layout:fixed`, `min-width` 1080/940/560 y `overflow-x:auto` interno; a 1280 el wrapper supera el `min-width` y a 900 el scroll queda dentro. No se ejecutó QA visual: TASK-0071. |
| Export con catálogo, objetivos, diagnóstico e id | `buildBenchExport`/`benchFileName`; base y `bench-overrides-<id>` distinguidos. |
| Tests y verify | 178 tests focalizados y 974 en la secuencia equivalente; ver nota de EXP-004. |

# R-004

La celda Arma de combates muestra ahora «Acierto +N · Daño +N» bajo el selector y
se sincroniza con el catálogo de trabajo; el intento 2 cierra esta brecha.

# Limitaciones y disposición

- Sin Playwright, E2E ni capturas por instrucción del usuario y alcance de
  TASK-0071; la comprobación visual real queda pendiente allí.
- El timeout intermitente de EXP-004 no es fricción de esta tarea ni se ha
  tocado. No hay propuestas del runner pendientes de triaje.
