---
type: Task Brief Detail
title: "TASK-0071: detalle del brief del intento 1"
description: Mapa de IDs, comandos, estados esperados y aserciones de la QA visual.
task: TASK-0071
attempt: 1
status: stable
generated: { by: task-lead, at: 2026-11-11T23:56:00Z }
---

# Hecho de partida

`artifacts/TASK-0071/attempt-1/logs/baseline-e2e.txt`: 9 fallos y 2 verdes. Los
9 fallos son de `experiment-bench.spec.ts` (UI v1) y de dos casos de
`experiment-combat.spec.ts` que aún buscan `matchup-rows`, `matchup-band-*` y
`matchup-select-*`. No hay un fallo de producto: es deuda de localizadores.

# IDs del DOM nuevo (solo lectura de `src/main.ts`)

## Tabla 1 · Combates

- Panel/tabla/tbody: `combats-panel`, `combats-table`, `combats-rows`.
- Fila: `combats-row-<hero>-<enemy>`; foco/click selecciona y actualiza el detalle.
- Victorias: `combats-wins-hero-<hero>-<enemy>`,
  `combats-wins-enemy-<hero>-<enemy>` (texto «N · NN,N %»).
- `% real`: `combats-real-<hero>-<enemy>` («NN,N % · ±X,X pp · dentro|fuera»).
- Bloques: `combats-four-<enemy>`, `combats-problems-<enemy>`.
- Objetivo: `combats-target-<enemy>` y `combats-target-error-<enemy>`.
- Stat compartido: celda `combats-cell-<enemy>-<field>`, input/select
  `combats-field-<enemy>-<field>`, error `combats-field-error-<enemy>-<field>`.
- Hint de arma del enemigo: `combats-weapon-hint-<enemy>`.
- `field`: `maxHp`, `habilidad`, `fuerza`, `defensa`, `resistencia`,
  `maxActions`, `armorId`, `shieldId`, `weaponId`.
- Un solo input/select por campo; el `<td>` lleva `rowspan=4`.

## Tabla 2 · Armas

- `weapons-panel`, `weapons-table`, `weapon-rows`; fila `weapons-row-<id>`.
- Unidades bajo el nombre: `weapon-users-<id>` («Guerrero, Centinela»; vacío =
  «sin unidades»).
- Inputs: `weapon-<id>-accuracy`, `weapon-<id>-damage`; errores
  `weapon-error-<id>-<field>`.

## Tabla 3 · Héroes

- `heroes-panel`, `heroes-table`, `hero-rows`; fila `heroes-row-<hero>`.
- Celda `heroes-cell-<hero>-<field>`; input/select
  `hero-field-<hero>-<field>`; error `hero-field-error-<hero>-<field>`.
- Hint del arma inicial: `hero-weapon-hint-<hero>`.
- `field`: `weaponId`, `maxHp`, `habilidad`, `fuerza`, `defensa`, `resistencia`,
  `maxActions`, `armorId`, `shieldId`, `magicLevel`.

## Detalle, resets, estado y export

- Detalle: `matchup-detail`, `detail-title`, `detail-result`, `detail-actions`,
  `detail-spells`, `detail-mana`, `detail-hp`, `detail-replicas`,
  `detail-duration`.
- Resets: `bench-reset-enemies`, `bench-reset-weapons`, `bench-reset-heroes`,
  `bench-reset-all`.
- Estado: `bench-status` (recálculo y objetivos), `weapons-status`,
  `heroes-status`, `controls-status`.
- Export: `export-summary`, `export-copy`, `export-download`, `export-status`.
- API: `window.__experiment` (`getResults`, `getDiagnosis`, `getTargets`,
  `getOverrides`, `getOverridesId`, `getWorkingCatalog`, `getDecision`,
  `snapshot`, `reset*`, `set*`).

# Estados y recálculos

- Base: 12 filas; 3 bloques de 4; objetivos Centinela 75, Cobarde 85, Bruto 30;
  overrides `{ enemies: {}, weapons: {}, heroes: {} }`.
- Enemigo: PV/stat cambia sus 4 filas. `bench-status` termina en
  «Recalculado: 4 filas afectadas.».
- Héroe: sus 3 filas. «Recalculado: 3 filas afectadas.».
- Arma: sus filas únicas. Espada 6, hacha 4, cuchillo 0. «Recalculado: N filas
  afectadas.».
- Objetivo: solo diagnóstico, 0 duelos; `getResults()` debe ser **idéntico**
  antes y después; `bench-status` dice «0 filas medidas de nuevo».
- Resets por tabla: `bench-reset-enemies` restablece enemigos **y objetivos**;
  `bench-reset-weapons` solo armas; `bench-reset-heroes` solo héroes. Usan
  `weapons-status`/`heroes-status`, no `bench-status`: espera con
  `expect.poll` sobre `getOverrides()`/`getTargets()`, no por texto.
- `bench-reset-all` restablece todo y deja `bench-status` con «Todo
  restablecido».
- Tras cualquier reset, `getResults()` vuelve a la base y el export base se
  llama `EXP-003-v2.0-seed-1017-duels-1000.json`.

# Casos E2E mínimos

1. **Enemigo**: `combats-field-centinela-maxHp` 6→30; 4 filas afectadas cambian,
   8 no; los otros enemigos intactos; foco en el input tras el recálculo; las 4
   filas del bloque con `is-block-active`; un solo input y `rowspan=4`.
2. **Héroe**: `hero-field-guerrero-maxHp` 20→1 (o stat que cambie de verdad);
   3 filas afectadas cambian; las otras 9 no. Cambiar
   `hero-field-guerrero-weaponId` a `hacha`: 3 filas, `weapon-users-espada` pasa
   a «Centinela», `weapon-users-hacha` a «Guerrero, Bruto» y el hint a
   «Acierto +2 · Daño +5».
3. **Arma**: `weapon-espada-damage` 3→8: 6 filas afectadas (Guerrero×3 y
   Centinela×4, `guerrero:centinela` una sola vez); el resto intacto; usuarios
   de espada sin cambios. Cuchillo: «sin unidades» y 0 filas.
4. **Objetivo**: `combats-target-centinela` 75→100; `% real` del Guerrero
   conserva el valor; delta y 4-de-4 pasan a «4/4 dentro» y «dentro»; Bruto
   sigue «fuera»; `getResults()` idéntico. Restaurar con reset de enemigos.
5. **Resets**: ensuciar enemigo, arma, héroe y objetivo; reset de enemigos deja
   armas/héroes; reset de armas deja héroes; reset de héroes vuelve a base;
   después ensuciar los tres y `bench-reset-all` vuelve a base y al nombre de
   export base.
6. **Export**: con enemigo + arma + héroe, `getDecision()` dos veces coincide;
   `overrides` con las tres ramas; `catalog.bestiary/weapons/roster` ajustados;
   `targets`, `diagnosis` (3 enemigos × 4 filas), `overridesId`; descarga
   `...-bench-overrides-<id>.json` idéntica al JSON de la API; reset → export
   base sin overrides.
7. **QA visual** (`1280x720` y `900x700`): capturas de las tres tablas, foco,
   detalle y bloque agrupado. Comprobaciones:
   - `document.documentElement.scrollWidth <= innerWidth`.
   - Paneles dentro del viewport; tablas a ancho completo a 1280 (cada tabla
     ≥ 80 % del ancho de ventana); a 900 el scroll de combates y héroes queda
     dentro de `.table-scroll` (`scrollWidth > clientWidth`), nunca del
     documento.
   - Inputs visibles, con `font-size` ≥ 11 px y alto ≥ 18 px.
   - Foco por teclado (`tabToTestId`) con `outline-style != none` y
     `outline-width > 0`.
   - Centinela 100: `combats-real-guerrero-centinela` contiene «dentro» y
     `combats-four-centinela` «4/4 dentro»; Bruto contiene «fuera» y no «4/4
     dentro» (texto, no solo color).
   - Seleccionar `combats-row-picaro-bruto`: `detail-title` «Pícaro vs Bruto»;
     editar `combats-field-bruto-fuerza`; esperar 4 filas; `detail-result` cambia
     y sigue mostrando banda, TTK, turnos y daño.

# `experiment-combat.spec.ts`

Cambia **solo** los localizadores obsoletos, sin tocar las aserciones de
motor/export:

- `matchup-rows` → `combats-rows` (12 filas).
- `matchup-band-guerrero-centinela` («fuera +40,0 pp») → `detail-result`
  (el detalle por defecto es Guerrero vs Centinela) o `combats-real-*`.
- `matchup-select-picaro-bruto` → click en `combats-row-picaro-bruto` y
  `detail-title` «Pícaro vs Bruto».

# Comandos y timeouts

- Iteración E2E:
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0071/attempt-1 pnpm run test:e2e tests/e2e/experiment-bench.spec.ts tests/e2e/experiment-combat.spec.ts`
  (timeout 180 s).
- Suite completa: `pnpm run test:e2e` (timeout 300 s; captura la salida).
- `pnpm run verify` (timeout 300 s). Si solo falla el timeout ajeno de
  `EXP-004 spawn`, documenta y ejecuta la secuencia equivalente de TASK-0070:
  docs + config, `pnpm exec vitest run --testTimeout=15000`, build y bundle.
- Timeouts de cada comando en el informe; nada de esperas indefinidas.

# Evidencia

- `report.md`, `test-output.txt`, `verify-output.txt`, `logs/`, `exports/`.
- Capturas: guarda las del spec con `E2E_ARTIFACTS_DIR` (quedan en
  `<spec>/screenshots/`) y copia las clave a `attempt-1/screenshots/` con prefijo
  `bench-`/`combat-`; registra ruta final y motivo.
- Si tocas `experiment.css`, añade captura «antes» y «después» y explica el
  mínimo cambio en el informe.
