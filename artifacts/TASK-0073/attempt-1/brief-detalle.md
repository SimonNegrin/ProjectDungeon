---
type: Task Brief Detail
title: "TASK-0073: detalle de implementación del intento 1"
description: Helpers puros, estado de filtros, render de filas visibles y plan de tests.
task: TASK-0073
attempt: 1
status: stable
generated: { by: task-lead, at: 2026-11-12T09:12:00Z }
---

# Estado de filtros

Tres estados independientes, solo de vista, fuera de `overrides`, `targets`,
`results` y `diagnosis`:

```ts
const combatFilters = { hero: '', enemy: '' };
let weaponFilter = '';
let heroFilter = '';
```

No los toques en resets, `setSeed`, `setDuels`, `runAll`, export ni API.

# Helpers puros (`bench-ui.ts`)

Añade y exporta, sin DOM ni medición:

```ts
export function normalizeSearchText(value: string): string;
export function matchesSearch(haystack: string, query: string): boolean;
export function filterCombatBlocks<T extends { heroId: string; enemyId: string }>(
  blocks: ReadonlyArray<EnemyBlock<T>>,
  filters: { readonly hero: string; readonly enemy: string },
  nameOf: (id: string) => string,
): ReadonlyArray<EnemyBlock<T>>;
export function filterWeapons(
  rows: ReadonlyArray<WeaponUsageRow>,
  query: string,
): ReadonlyArray<WeaponUsageRow>;
export function filterHeroes(
  heroes: ReadonlyArray<{ readonly id: string; readonly name: string }>,
  query: string,
): ReadonlyArray<{ readonly id: string; readonly name: string }>;
```

- `normalizeSearchText`: `String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()`.
  Comprueba «Clérigo»/«clerigo», «CENTINELA»/«centinela» y «ñ»/«n».
- `matchesSearch`: consulta vacía → `true`; si no, subcadena normalizada.
- `filterCombatBlocks`: recibe los bloques ya agrupados
  (`groupMatchupsByEnemy(results.matchups, results.enemyOrder)`), filtra filas
  por nombre de héroe con `filters.hero` y por nombre de enemigo con
  `filters.enemy`, conserva orden y elimina bloques sin filas. `rowspan` visible
  = `block.rows.length`.
- `filterWeapons`: nombre del arma **o** cualquiera de sus unidades
  (`weaponRows(workingCatalog)` ya trae `users`).
- `filterHeroes`: solo nombre.

# UI y render

## Combates

- Añade a `combatsToolbar` dos `label.filter-field` con texto visible «Héroe» y
  «Enemigo», input `type="search"` y botón `type="button"` de limpiar. Test IDs:
  `combats-filter-hero`, `combats-filter-enemy`, `combats-filter-hero-clear`,
  `combats-filter-enemy-clear`.
- `renderCombats` usa `filterCombatBlocks(...)` en lugar de todos los bloques.
  Reconstruye solo las filas visibles; `rowSpan` de Enemigo y los nueve stats =
  número de filas visibles. Un bloque con 0 filas no se appendea.
- El input de filtro vive en la toolbar, fuera del `tbody`: reconstruir no le
  quita el foco. No llames a `blur`, `focus` ni a funciones de medición.
- Al cambiar un filtro: actualiza estado, `renderCombats(); syncCombats();` y
  alterna el aviso. No midas.
- Aviso `p.filter-empty` con `role="status"` y test ID `combats-filter-empty`,
  fuera de la tabla, texto «Sin resultados para el filtro.»; oculto si hay
  bloques.
- Limpiar pone el campo a `''`, re-renderiza y devuelve el foco al input.

## Armas y héroes

- Un `label.filter-field` en cada toolbar (`weapons-filter`, `heroes-filter`) con
  botón de limpiar (`weapons-filter-clear`, `heroes-filter-clear`).
- Renderiza todas las filas una vez y aplica la visibilidad con `row.hidden`
  según `filterWeapons`/`filterHeroes`; así conservas los refs de inputs y el
  foco. Avisos `weapons-filter-empty` y `heroes-filter-empty`.
- En `syncWeapons`, tras actualizar `users`, recalcula también la visibilidad:
  si el filtro es por unidad y cambia el arma de un héroe o enemigo, la fila
  aparece/desaparece sin reconstruir ni perder foco.
- `syncHeroes` no necesita recalcular visibilidad (solo nombres), pero no
  resetees el filtro.

# Estilos (`experiment.css`)

`.panel-toolbar` debe admitir los filtros junto al estado y al reset con
`flex-wrap`; inputs compactos, etiqueta visible y botón pequeño. Mantén el ancho
completo y sin overflow de documento a 1280×720. El mensaje de vacío debe ser
legible y no romper la tabla.

# Tests (sin jsdom)

No añadas dependencias. `vitest.config.ts` no tiene entorno DOM. Cubre la capa
de vista y los helpers en Node:

- `normalizeSearchText`/`matchesSearch`: tildes, mayúsculas, espacios y vacío.
- `filterWeapons`: por nombre, por unidad, combinación y sin resultados.
- `filterHeroes`: «clerigo» encuentra Clérigo; sin resultados.
- `filterCombatBlocks`: filtro de héroe deja una fila por bloque; filtro de
  enemigo deja cuatro; combinación da la intersección; se conserva orden;
  bloque sin filas desaparece; número de filas visibles = `rowspan` esperado;
  no muta los arrays de entrada y devuelve las mismas referencias de fila.
- Ausencia de medición: los helpers no importan ni llaman a `measureMatchups`,
  `recalculateMatchups` ni `runMatchup`; el test puede comprobar que el payload
  de resultados no cambia de identidad/contenido tras filtrar.

La DOM real (foco, `rowspan` renderizado, aviso visible) queda para el E2E de
TASK-0074; no la dupliques aquí.

# Verificación

`pnpm exec vitest run experiments/EXP-003-mesa-combate/src` y `pnpm run verify`
(timeout 120 s). No `test:e2e`, no Playwright, no capturas.
