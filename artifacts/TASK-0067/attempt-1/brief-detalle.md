---
type: Task Brief Detail
title: "TASK-0067: detalle del brief del intento 1"
description: Contrato técnico de la UI del banco de ajuste de EXP-003.
task: TASK-0067
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T21:10:00Z }
---

# Alcance técnico

La UI vive en `experiments/EXP-003-mesa-combate/`. El motor y los datos puros de
TASK-0066 se consumen sin modificarlos. Si necesitas helpers puros nuevos,
ponlos en `src/bench-ui.ts` (sin DOM) y testéalos en `src/bench-ui.test.ts`.
`main.ts` compone DOM y estado; `experiment.css` añade estilos locales.

No cambies `src/` ni `tests/` de producción, `index.html`, `public/`,
`experiment.md` ni dependencias.

# Estado de la página

- `seed`, `duels`, `results` ya existen. Añade `overrides`, `targets`,
  `workingCatalog` (derivado de `createWorkingCatalog(CATALOG, overrides)`),
  `diagnosis` (`diagnoseBench(results.matchups, targets, workingCatalog)`) y el
  enemigo expandido.
- Toda edición de stats/armas actualiza overrides y programa un recálculo
  diferido (≈250–300 ms). Al dispararse, usa
  `recalculateMatchups(results, workingCatalog, selection)` para cada selección
  pendiente, conservando semilla, duelos y orden.
- Editar el objetivo no recalcula duelos: cambia target, delta, estado, 4-de-4,
  avisos y export.
- Reset por campo: elimina solo ese override y recalcula las filas afectadas.
  Reset por enemigo: elimina sus overrides y devuelve su objetivo a la guía.
  Reset por arma: elimina su override. Reset global: overrides vacíos, objetivos
  a la guía y medición completa de nuevo (`measureMatchups`), idéntica a la base.
- Normaliza con una función pura (`pruneOverrides(base, overrides)`) tras cada
  cambio y antes de medir/exportar: elimina stats/campos iguales a la base,
  entradas de enemigo/arma vacías y no crea parches `{}`. `withEnemyOverride` y
  `withWeaponOverride` aceptan parches vacíos; no los dejes llegar al estado.
- Si el usuario escribe un valor inválido, no apliques: marca `aria-invalid`,
  muestra aviso junto al campo y conserva el último valor válido. En `blur`
  restaura el valor válido. Rangos mínimos: PV ≥ 1, acciones ≥ 0, objetivo 0–100
  entero; stats y acierto/daño enteros en un rango razonable y documentado.
  Los `change` de selects aplican directamente.

# Recálculo y foco

- Estado visible en un `<p data-testid="bench-status" aria-live="polite">`:
  «Recalculando filas afectadas…» → «Recalculado: N filas…»; nunca bloquea.
- No reconstruyas la tabla, el editor, la tabla de armas ni los campos de
  objetivo al terminar un recálculo: actualiza texto/clases in situ. Así el foco
  y la posición no se pierden.
- Reconstruye estructura solo al abrir/cerrar editor, cambiar semilla/duelos,
  reset global o cambios de API que alteren la estructura.

# Layout y test IDs estables

La tabla actual de 12 filas conserva `matchup-rows`, `matchup-row-<hero>-<enemy>`,
`matchup-band-<hero>-<enemy>`, `matchup-select-<hero>-<enemy>` y el botón «Ver».
Añade columnas de objetivo, real, delta y estado; no borres las existentes.

- `bench-panel`, `bench-status`, `bench-reset-all`.
- Objetivo por enemigo: `bench-target-<enemy>`, `bench-target-reset-<enemy>`,
  `bench-target-error-<enemy>`, `bench-guide-<enemy>`.
- Diagnóstico: `bench-diagnosis-<enemy>`, `bench-four-of-four-<enemy>`,
  `bench-diagnosis-rows-<enemy>`, `bench-problems-<enemy>`.
- Fila: `bench-row-target-<hero>-<enemy>`, `bench-row-delta-<hero>-<enemy>`,
  `bench-row-state-<hero>-<enemy>`, `bench-adjust-<hero>-<enemy>`.
- Editor: `bench-editor-<enemy>` en la fila expandible; campos
  `bench-field-<enemy>-<field>` y reset `bench-field-reset-<enemy>-<field>`;
  reset de enemigo `bench-enemy-reset-<enemy>`. Campos: `maxHp`, `habilidad`,
  `fuerza`, `defensa`, `resistencia`, `maxActions`, `armorId`, `shieldId`,
  `weaponId`.
- Armas: `bench-weapon-table`, `bench-weapon-row-<weapon>`,
  `bench-weapon-<weapon>-accuracy`, `bench-weapon-<weapon>-damage`,
  `bench-weapon-users-<weapon>`, `bench-weapon-reset-<weapon>`.
- Export: conserva `export-summary`, `export-copy`, `export-download` y
  `export-status`. El resumen debe incluir overridesId, objetivos y diagnóstico.

El editor debe avisar de que el enemigo es compartido y que afecta a sus cuatro
filas, con los nombres de los héroes derivados del catálogo. No hay copias por
fila. La tabla de armas lista todas las armas del catálogo (espada, hacha, daga,
cuchillo) con acierto, daño y unidades que las usan (héroes y enemigos).

# Diagnóstico y avisos

Cada tarjeta muestra objetivo editable con guía, «4/4 dentro» o
«3/4; Mago fuera por +7,1 pp», las cuatro filas con real/delta/dentro-fuera y
los avisos de `problems` (dispersión, bloque compartido, arma global). Los
avisos son informativos: no bloquean edición, export ni reset.

# API `window.__experiment`

Amplía sin romper la existente. Mantén `getSeed`, `setSeed`, `getDuels`,
`setDuels`, `runAll`, `getResults`, `snapshot`, `getDecision` y `reset`.
Añade, como mínimo:

- `getTargets()`, `setTarget(enemyId, value)`, `resetTarget(enemyId)`.
- `getOverrides()`, `resetEnemy(enemyId)`, `resetWeapon(weaponId)`,
  `resetAll()`.
- `setEnemyField(enemyId, field, value)` y
  `resetEnemyField(enemyId, field)`.
- `setWeaponField(weaponId, 'accuracy' | 'damage', value)`.
- `recalculate(selection?)`, `getDiagnosis()`, `getWorkingCatalog()`,
  `getOverridesId()`.
- `snapshot()` devuelve lo actual más `targets`, `overrides`, `overridesId` y
  `diagnosis`; `getDecision()` devuelve `buildBenchExport(...)`.

Las mutaciones por API validan y recalculan de forma síncrona (los tests leen el
resultado justo después). En la UI, la escritura usa el recálculo diferido.

# Compatibilidad con el E2E actual

`tests/e2e/experiment-combat.spec.ts` no se toca en esta tarea. Debe seguir
pasando con el estado base:

- `getDecision()` y `snapshot()` conservan `experiment`, `engine`,
  `catalogVersion`, `seed`, `duels`, `scenario`, `catalog`, `matchups` y son
  deterministas.
- Con overrides vacíos, el nombre de descarga debe seguir siendo
  `EXP-003-v2.0-seed-<seed>-duels-<duels>.json`. Con overrides, usa el nombre
  `bench-overrides-<id>` de `benchExportFileName` para no sobrescribir la base.
- `export-summary` conserva las frases `catálogo EXP-003-v2.0.0` y
  `semilla <seed>` que comprueba el E2E.
- La tabla sin editor abierto sigue teniendo 12 filas.

# Tests obligatorios

- Unitarios de `bench-ui.ts`: validación de campos de enemigo y arma, rangos,
  selects, normalización/prune (sin overrides vacíos), formato de objetivo/delta,
  resumen 4-de-4, unidades por arma, nombre de descarga base/ajustado y que las
  listas salen del catálogo.
- Integración sin DOM: aplicar override de un enemigo y recalcular solo sus 4
  filas; aplicar arma y recalcular sus filas; reset por campo/enemigo/arma/global;
  target cambia diagnóstico pero no duelos; mismo estado produce el mismo export
  y `overridesId`.
- `pnpm run verify` debe pasar. `pnpm run test:e2e` no es obligatorio aquí
  (TASK-0068), pero no debe romperse por decisiones de nombre/API.

# Riesgos

- Recalcular 4 × 1.000 duelos: mide y deja constancia; si supera 1 s, el estado
  diferido y `aria-live` son obligatorios.
- No reutilices `formatBand` para el objetivo: usa delta real - objetivo y
  margen ±5 pp.
- No hardcodees enemigos, armas, héroes ni valores; recórrelos desde el
  catálogo.
- `diagnoseBench` lanza si falta un objetivo: garantiza objetivos para todos los
  enemigos del catálogo.
