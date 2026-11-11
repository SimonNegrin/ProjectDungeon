---
type: Task Brief Detail
title: "TASK-0072: detalle del brief del intento 1"
description: Modelo de objetivos por par, formato del export, diagnóstico y tests esperados.
task: TASK-0072
attempt: 1
status: stable
generated: { by: task-lead, at: 2026-11-12T00:20:00Z }
---

# Detalle del brief · TASK-0072

Este anexo concreta el modelo de objetivos por par, el formato del export y los
tests esperados. La ficha y el requisito mandan; esto solo evita decisiones
implícitas.

## 1. Modelo de objetivos (`src/v2/bench.ts`)

- `BenchTargets = Readonly<Record<string, number>>`, con clave
  `heroId:enemyId`. No cambies el alias; cambia su contenido.
- `targetKey(heroId, enemyId)` devuelve `` `${heroId}:${enemyId}` ``.
- `DEFAULT_TARGET = 50`; `TARGETS_VERSION = 2`; `guideTargetFor(enemyId)` es
  `GUIDE_TARGETS[enemyId] ?? DEFAULT_TARGET`. `GUIDE_TARGETS` no se muta.
- `createTargets(catalog = CATALOG)`: recorre `catalog.roster` y, dentro, 
  `catalog.bestiary` (orden hero-major, el mismo de `measureMatchups`) y asigna
  `guideTargetFor(enemy.id)` a cada par. Devuelve un objeto nuevo.
- `setTarget(targets, heroId, enemyId, value)`: valida con `validateTarget`
  (lanza `RangeError` si no es entero 0–100) y devuelve un mapa nuevo con solo
  esa clave cambiada. No muta la entrada.
- `resetTarget(targets, heroId, enemyId)`: devuelve un mapa nuevo con ese par a
  `guideTargetFor(enemyId)`.
- `resetEnemyTargets(targets, enemyId, catalog = CATALOG)`: devuelve un mapa
  nuevo con los cuatro pares de ese enemigo a la guía. No toca otros enemigos.
- `resetTargets(catalog = CATALOG)`: `createTargets(catalog)`.
- `isTargetsGuide(targets)`: compara claves y valores con `createTargets()`;
  sirve para decidir el nombre de descarga y no confundir “guía” con “sin
  overrides”.
- `targetsId(targets)`: usa el mismo `canonicalJson` + `hashString` que
  `overridesId` y devuelve 8 hex. El orden de inserción no cambia el id.
- Añadir un enemigo sin guía al catálogo debe producir 50 en sus cuatro pares;
  no hardcodees los 12 pares ni los tres enemigos.

## 2. Diagnóstico (`src/v2/bench.ts`)

- `diagnoseEnemy(matchups, targets: BenchTargets, margin = MARGIN_PP,
  catalog = CATALOG)`. Para cada matchup lee `targets[targetKey(...)]`; si
  falta, lanza `Error('Sin objetivo para el par <clave>.')`. Valida cada
  objetivo con `validateTarget`.
- Cada fila de `EnemyDiagnosis.rows` conserva `heroId`, `heroWinRate`, `target`,
  `delta` e `inside`. `delta` es real − objetivo de esa fila y `inside` usa
  `|delta| <= margin`.
- `EnemyDiagnosis` deja de tener `target`, `min`, `max` y `dispersion`; el
  `outside` sigue siendo `{ heroId, delta }[]`.
- `problems` solo admite `outside` y `global-weapon`. Elimina el tipo
  `dispersion`, el cálculo de dispersión, `DISPERSION_LIMIT_PP` y su mensaje.
- `fourOfFour` es `rows.length === 4 && insideCount === 4`.
- `diagnoseBench(matchups, targets, catalog, margin)` pasa el mapa entero.

## 3. Export (`src/v2/bench.ts`)

- `BenchExport` añade `targetsVersion` y `targetsId`.
- `buildBenchExport` incluye `targets` por par, `targetsVersion: TARGETS_VERSION`
  y `targetsId: targetsId(targets)`. Sin timestamp.
- `benchExportFileName(payload, overrides, targets)`:
  - `bench-base` si no hay overrides; `bench-overrides-<overridesId>` si los hay.
  - Si `!isTargetsGuide(targets)`, añade `-targets-<targetsId>`.
  - Forma: `<experiment>-<engine>-seed-<seed>-duels-<duels>-<sufijo>.json`.
- `benchFileName(payload, overrides, targets)` en `src/bench-ui.ts`:
  - sin overrides y objetivos de guía → nombre base histórico
    `EXP-003-v2.0-seed-<seed>-duels-<duels>.json`;
  - en cualquier otro caso delega en `benchExportFileName`.
- Consecuencia: cambiar un objetivo cambia `targetsId` y el nombre, pero no
  `overridesId`; dos conjuntos de objetivos distintos no comparten nombre.

## 4. Resumen del export (`src/bench-ui.ts`)

- `formatBenchSummary` mantiene la firma actual. La línea `objetivos:` agrupa
  por enemigo y usa los objetivos de `entry.rows`, por ejemplo:
  `Centinela 75/75/75/75 % · Bruto 30/30/30/30 % · Cobarde 85/85/85/85 %`.
- No listes una entrada por par ni cambies el resto de líneas (semilla, 
  overridesId, diagnóstico, catálogo, bytes).
- El JSON conserva los 12 pares en `targets`.

## 5. Tabla de combates (`src/main.ts`)

- `CombatRowRefs` gana `targetInput` y `targetError`; `CombatBlockRefs` los
  pierde. El 4-de-4 y los problemas siguen en la celda del enemigo.
- `buildTargetCell(heroId, enemyId)` crea una celda por fila:
  - `td` normal (sin `rowspan`; evita la clase `shared-cell` o usa una propia).
  - input numérico 0–100 con testid
    `combats-target-${heroId}-${enemyId}` y error
    `combats-target-error-${heroId}-${enemyId}`.
  - valor `targets[targetKey(heroId, enemyId)] ?? guideTargetFor(enemyId)`;
    `title` con la guía del enemigo; `aria-label` con «Héroe vs Enemigo».
  - al editar: valida, actualiza solo ese par y llama a `refreshDiagnosisOnly()`;
    el estado dice `Objetivo de <Héroe> vs <Enemigo>: diagnóstico actualizado; 0 filas medidas de nuevo.`
  - al hacer blur, restaura el último valor válido del par y limpia el error.
- En `renderCombats`, construye la celda de objetivo dentro del bucle de filas.
  En la primera fila del bloque añade `enemyCell`, victorias, `targetCell`,
  `real` y las nueve celdas de stats con `rowSpan`; en las siguientes añade
  victorias, `targetCell` y `real`. No pongas `rowSpan` al objetivo.
- `syncCombats` actualiza por fila el input del objetivo si no tiene el foco,
  y el delta/estado/4-de-4 desde el diagnóstico. `renderBlockProblems` filtra
  solo `global-weapon`.
- `matchupDelta`, `renderDetail` y la línea de objetivo del detalle usan el
  objetivo del par seleccionado.
- Resets: `resetEnemiesState` y `resetAllState` usan `resetTargets()` (12 pares);
  `resetEnemyApi(enemyId)` usa `resetEnemyTargets(...)` (4 pares). No resetees
  objetivos en armas ni héroes.
- API: `getTargets()` devuelve el mapa por par; `setTarget(heroId, enemyId,
  value)` y `resetTarget(heroId, enemyId)` validan que héroe y enemigo existan
  (`RangeError` si no) y refrescan solo el diagnóstico. Conserva el resto de
  operaciones. `currentSnapshot().targets` es el mapa por par.

## 6. Tipos y snapshot (`src/ui.ts`)

- `BenchSnapshot.targets` sigue siendo `BenchTargets` (cambia el contenido, no el
  tipo).
- `V2ExperimentApi.getTargets(): BenchTargets`;
  `setTarget(heroId, enemyId, value)`; `resetTarget(heroId, enemyId)`.

## 7. Tests

Actualiza y añade, sin borrar cobertura existente salvo la que ya no representa
el modelo (dispersión, objetivo único por enemigo):

- `src/v2/bench.test.ts`
  - 12 claves en orden fijo; guía heredada por enemigo; fallback 50 con un
    catálogo de prueba con un enemigo sin guía; `GUIDE_TARGETS` no muta.
  - `setTarget` cambia solo un par y no muta; `resetTarget` y
    `resetEnemyTargets`; `resetTargets`; `isTargetsGuide`.
  - 4-de-4 con objetivos distintos por fila (todas dentro y una fuera);
    `outside` conserva héroe y delta; no existe `dispersion` ni el problem kind.
  - `targetsId` determinista e insensible al orden; `targetsVersion: 2`;
    mismo estado → mismo JSON; cambiar objetivo cambia `targetsId` y nombre pero
    no `overridesId`; el JSON contiene los 12 pares y no `timestamp`.
- `src/bench-ui.test.ts`
  - nombre base/overrides/targets; cambiar objetivo cambia el nombre.
  - resumen agrupado por enemigo (`75/75/75/75 %`), no una línea por par.
  - diagnóstico con objetivos distintos; reset de un par.
- `src/tables.test.ts`: diagnóstico y export con objetivos por par; resets.
- `src/ui.test.ts`: el fixture de `BenchSnapshot` usa `createTargets()`.

## 8. E2E: solo compatibilidad de tipos

`pnpm run verify` ejecuta `tsc` sobre `tests/e2e`. El spec
`tests/e2e/experiment-bench.spec.ts` usa `EnemyDiagnosis.target` (en torno a las
líneas 601 y 788). Adapta **solo** esas referencias para que compile (por
ejemplo, `rows.every(row => row.target === ...)` o elimina la aserción
obsoleta). No reescribas selectores, flujos ni el resto del E2E: es TASK-0074.
No ejecutes `pnpm run test:e2e`.

## 9. Comandos y evidencia

- `pnpm exec vitest run experiments/EXP-003-mesa-combate/src` (timeout 120 s).
- `pnpm run verify` (timeout 300 s).
- Salidas en `artifacts/TASK-0072/attempt-1/test-output.txt` y
  `verify-output.txt`.
- `git diff --stat` solo debe tocar `experiments/EXP-003-mesa-combate/src/**`,
  `tests/e2e/experiment-bench.spec.ts` (solo tipos) y `artifacts/TASK-0072/**`.
