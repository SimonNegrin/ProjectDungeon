---
type: Task Brief
title: "TASK-0068: detalle del brief del intento 1"
description: Inventario de API/test IDs, matriz E2E y trampas del banco de ajuste.
task: TASK-0068
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:20:00Z }
---

# Contrato de la página

- URL determinista: `/experiments/EXP-003-mesa-combate/?test=1&seed=1017`
  (1.000 duelos por emparejamiento).
- API `window.__experiment`: `getResults`, `snapshot`, `getDecision`,
  `getTargets`, `getOverrides`, `getOverridesId`, `getDiagnosis`,
  `getWorkingCatalog`, `setTarget`, `resetTarget`, `setEnemyField`,
  `resetEnemyField`, `resetEnemy`, `setWeaponField`, `resetWeapon`,
  `resetWeaponField`, `resetAll`. Los getters fuerzan el recálculo pendiente.
- Test IDs útiles:
  - Filas: `matchup-row-<hero>-<enemy>`, `bench-row-{target,real,delta,state}-…`,
    `matchup-wins-…`, `matchup-band-…`.
  - Editor: `bench-adjust-…`, `bench-editor-row-<enemy>`,
    `bench-field-<enemy>-<campo>`, `bench-field-reset-…`,
    `bench-enemy-reset-<enemy>`, `bench-editor-shared-<enemy>`.
  - Diagnóstico: `bench-diagnosis-<enemy>`, `bench-four-of-four-<enemy>`,
    `bench-diagnosis-row-<hero>-<enemy>`, `bench-target-<enemy>`,
    `bench-target-reset-<enemy>`, `bench-problems-<enemy>`.
  - Armas: `bench-weapon-row-<id>`, `bench-weapon-<id>-{accuracy,damage}`,
    `bench-weapon-users-<id>`, `bench-weapon-reset-<id>`,
    `bench-weapon-field-reset-<id>-<campo>`.
  - Reset global/export/estado: `bench-reset-all`, `export-summary`,
    `export-download`, `export-status`, `bench-status`, `matchup-rows`.

# Datos base relevantes

- Enemigos: Centinela (PV 6, espada, escudo), Bruto (PV 8, hacha, coraza),
  Cobarde (PV 5, daga, escudo).
- Armas y portadores: espada → Guerrero y Centinela; hacha → Bruto; daga →
  Pícaro y Cobarde; cuchillo → nadie.
- Objetivos de guía: 75 Centinela, 85 Cobarde, 30 Bruto. Margen ±5 pp.
- Cambiar un enemigo afecta a sus 4 filas. Cambiar espada afecta a 6 filas
  únicas (Guerrero × 3 enemigos + Centinela × 4 héroes, con la fila
  Guerrero–Centinela compartida). Comprueba el recuento con
  `affectedRows`/estado, no con una lista fija de tasas.

# Matriz mínima de tests

1. Editar PV de Centinela (p. ej. 6 → 30) desde la UI: `bench-status` indica
   4 filas afectadas; las 4 filas de Centinela cambian y las 8 restantes quedan
   idénticas a `getResults()` previo. El editor sigue abierto y el foco no se
   pierde.
2. Cambiar objetivo de Centinela a 100 en `bench-target-centinela`: cambian
   delta y `bench-four-of-four-centinela`; con 100 debe mostrarse 4/4 dentro.
   Restaurar con `bench-target-reset-centinela` y comprobar guía 75.
3. Editar daño de espada (3 → 8) en `bench-weapon-espada-damage`: usuarios
   listados incluyen Guerrero y Centinela; cambian exactamente las 6 filas
   afectadas y no las otras 6. Reset de arma devuelve la base.
4. Reset por enemigo (`bench-enemy-reset-centinela`) tras editar PV: resultados
   iguales a la base, overrides sin Centinela y export sin ese override.
   Reset global (`bench-reset-all`) tras editar enemigo, arma y objetivo:
   resultados base, objetivos de guía, `getOverrides()` vacío y export base
   (`bench-base` en el nombre, sin bloque de overrides de contenido).
5. Export: `getDecision()` incluye `catalog`, `targets`, `diagnosis`,
   `overrides`, `overridesId`; dos lecturas con el mismo estado producen JSON
   idéntico. La descarga ajustada usa
   `EXP-003-v2.0-seed-1017-duels-1000-bench-overrides-<id>.json`; sin overrides
   `…-bench-base.json`.
6. QA visual: 1280×720 y 900×700 con editor abierto y tabla de armas. Comprueba
   que `documentElement.scrollWidth <= innerWidth` (sin desbordamiento del
   documento), que `.table-scroll` puede tener scroll interno, que
   dentro/fuera aparece como texto («dentro»/«fuera», «x/4») y que un campo
   enfocado por teclado tiene `outline`/`box-shadow` visible. Captura de cada
   viewport.

# Trampas

- El recálculo espera ~280 ms; usa `expect.poll` sobre `getResults`/
  `getDiagnosis` o sobre `bench-status`. Nunca `waitForTimeout`.
- `fill()` + evento `change` solo para inputs que escuchan `change`; los campos
  del banco escuchan `input` (y `change` en selects). Verifica que el valor se
  aplicó leyendo API, no solo el DOM.
- Al enfocar un input numérico y escribir, el valor se aplica con debounce; el
  `blur` restaura el último válido. Para foco visible, tabula hasta un campo y
  comprueba estilos computados.
- `getDecision()` y `snapshot()` hacen flush; no los llames dentro de un bucle
  que dependa de un temporizador pendiente sin esperar el cambio de estado.
- Capturas con `E2E_ARTIFACTS_DIR=artifacts/TASK-0068/attempt-1`; el helper
  `artifactPath` añade `<spec>/screenshots/`. No escribas rutas fijas a
  `artifacts/`.
- No modifiques los 4 tests de `experiment-combat.spec.ts`; si añades un helper
  compartido, hazlo sin cambiar su comportamiento.
