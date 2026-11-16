---
type: Verification
title: "TASK-0167: verificación del intento 1"
description: "Poder por trait y powerScore determinista con los valores de ADR-033; criterios firmados y verify:task en verde."
task: TASK-0167
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:36:41Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0167` pasa: ficha, estado, informe, cinco
criterios firmados, alcance dentro de `feature` sin cambios y `pnpm run verify`
completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los cinco quedan firmados:

- Los traits del catálogo declaran `poder` entero con signo y
  `validateTraitCatalog` rechaza ausente o fraccionario con la regla `power`. El
  test de tabla fija los 17 traits reales y los cuatro negativos restan.
- `powerScore` suma acierto, daño total de paquetes, absorción, evasión y Σ poder
  de traits; el test comprueba dos llamadas idénticas y que el objeto no muta.
- Los objetos de `ITEMS` tienen puntuación estable y los malditos restan por
  debajo de su base. La tabla del test replica los valores provisionales de
  ADR-033.
- El diff no toca fórmulas de combate, stats efectivos ni stacking; la suite
  completa (REQ-019 y REQ-029 incluidas) pasa sin cambios.
- Tests nuevos en `tests/unit/game/loot-power.test.ts`; `pnpm run verify` en
  verde con 114 archivos y 1839 tests.

Nota de firma: la ficha y ADR-033 dicen «18 traits» y «13 objetos», pero el
catálogo vigente tiene **17 traits y 14 objetos** (`circular-mace` incluida desde
REQ-019). Los criterios se firman sobre el catálogo completo: ningún trait ni
objeto queda sin cubrir ni se inventa una entrada para cuadrar el recuento. La
discrepancia es documental y queda anotada para el cierre.

# Diff revisado

`git diff main...HEAD`:

- `src/game/equipment.ts`: campo `poder` en `TraitDefinition`, valores de
  ADR-033 en los 17 traits, regla `power` en `validateTraitCatalog` y
  `powerScore` (ya sale por el `export *` de `src/game/index.ts`).
- `tests/unit/game/loot-power.test.ts`: tabla de traits y objetos, pureza,
  malditos y validación.
- `artifacts/TASK-0167/attempt-1/` y la propia ficha.

Sin cambios fuera de alcance. Riesgo bajo: es aditivo y no modifica combate.

# Qué debe probar el usuario

Nada visual en este corte. En el playtest de cofres, comprobar que el orden de
poder (maza circular como objeto más valioso, anillo de robo por encima del
collar, guantes de acción altos y malditos por debajo) se siente razonable cuando
TASK-0168 lo use para elegir el botín.
