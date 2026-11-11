---
type: Task Brief Detail
title: "TASK-0074: detalle del brief del intento 1"
description: Estado de partida del E2E, tasas base, export y mecánica de filtros.
task: TASK-0074
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T00:10:00Z }
---

# Estado de partida

`pnpm run test:e2e tests/e2e/experiment-bench.spec.ts` → 3 verdes, 5 rojos:

- «cambiar el objetivo…»: `combats-target-centinela` ya no existe.
- «los resets…»: `combats-target-cobarde` ya no existe.
- «el export…»: espera `targets` por enemigo, sin `targetsVersion`/`targetsId`,
  y nombres `EXP-003-v2.0-seed-1017-duels-1000.json`.
- Las dos QA visual: mismo `combats-target-centinela` retirado.

Los 3 verdes (stat de enemigo, stat/arma de héroe, daño de arma) no usan
objetivos y sirven de referencia de estilo y helpers.

# Tasas base con `?test=1&seed=1017` (1.000 duelos)

| Enemigo | Guerrero | Pícaro | Mago | Clérigo |
|---|---:|---:|---:|---:|
| Centinela | 100 % | 99,7 % | 99,8 % | 100 % |
| Bruto | 99,6 % | 96,3 % | 99,9 % | 100 % |
| Cobarde | 100 % | 99,7 % | 100 % | 100 % |

Guía: Centinela 75, Bruto 30, Cobarde 85. Con la guía, todas las filas están
fuera (delta positivo). Subir el objetivo de un par a 100 deja esa fila dentro;
bajarlo a 0 la deja fuera. El 4-de-4 cuenta filas dentro de su propio objetivo.

# Export

- `EXP-003-v2.0` + `-seed-1017-duels-1000-`.
- Sin overrides: `bench-base`; con overrides: `bench-overrides-<overridesId>`.
- Objetivos distintos de la guía añaden `-targets-<targetsId>`.
- `targets` tiene 12 claves `hero:enemy`; `targetsVersion: 2`; `targetsId` y
  `overridesId` son 8 hex deterministas.
- Resumen textual:
  `objetivos: Centinela 75/75/75/75 % · Bruto 30/30/30/30 % · Cobarde 85/85/85/85 %`
  (orden de `enemyOrder`; objetivo por par en el orden de filas del bloque).

# Filtros

- Combates: `input` en `combats-filter-hero|enemy` llama a `renderCombats()`,
  que reconstruye `<tbody>` con `rowspan = block.rows.length`; los bloques sin
  filas desaparecen y `combats-filter-empty` deja de estar `hidden` si no queda
  ninguno. El campo de filtro está fuera del `<tbody>`, así que conserva foco.
- Armas y Héroes: no reconstruyen; alternan `row.hidden` y
  `weapons|heroes-filter-empty.hidden` en `syncWeapons()`/`syncHeroes()`.
- Limpiar: botón `*-clear` vacía el valor, re-renderiza y devuelve el foco.
- Coincidencia: subcadena, sin mayúsculas ni diacríticos; en Armas busca nombre
  y unidades que la usan.

# Capturas

`E2E_ARTIFACTS_DIR=artifacts/TASK-0074/attempt-1 pnpm run test:e2e`
escribe `attempt-1/experiment-bench/screenshots/<nombre>.png`. Los exports van
a `attempt-1/experiment-bench/exports/`. Citar la ruta real en el informe.
