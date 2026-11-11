---
type: Task Report
title: "TASK-0073: informe de ejecución"
description: Filtros de vista en las tres tablas de EXP-003 con helpers puros y tests Node.
task: TASK-0073
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:22:33Z }
artifacts: artifacts/TASK-0073/attempt-1/
verified:
---

# Estado

`success`. Implementación, tests y `pnpm run verify` verdes; la DOM real queda
para TASK-0074, como marca el brief.

# Cambios

- `bench-ui.ts`: `normalizeSearchText`, `matchesSearch`, `filterCombatBlocks`,
  `filterWeapons`, `filterHeroes`, sin medir ni mutar resultados.
- `main.ts`: filtros fuera del estado del banco; toolbars con etiqueta visible y
  botón de limpiar; avisos `role="status"`; filas visibles en Combates con
  `rowSpan = block.rows.length`; `hidden` en Armas/Héroes; foco conservado.
- `experiment.css`: estilos de filtros, botones y aviso de sin resultados.
- `filters.test.ts`: 14 tests nuevos.
- Commit SHA: `c95298c` (implementación) + `7838f19` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run experiments/EXP-003-mesa-combate/src` | 12 archivos, 197 tests OK | `test-output.txt` |
| `pnpm run verify` | OK: docs, config, 73 archivos/993 tests, build y bundle | `verify-output.txt` |

Cubierto: tildes/mayúsculas/ñ, subcadena y vacío; armas por nombre y por unidad
(incluido «picaro»/«PÍCARO»); héroe una fila por bloque; enemigo cuatro filas;
`rowspan` = filas visibles; combinación héroe+enemigo; orden conservado; bloque
vacío eliminado; sin resultados devuelve lista vacía; no mutación y mismas
referencias de fila; payload de resultados intacto.

# Evidencia visual

- Sin capturas: el brief excluye QA visual en este intento.
- Los tests de DOM (escribir, limpiar, editar con filtro), el foco real, el
  `rowspan` renderizado y el aviso visible quedan para TASK-0074.

# Desviaciones

- Ninguna de alcance. El `rowspan` se verifica como el valor que consume el
  render (`block.rows.length`), no como atributo DOM.

# Problemas conocidos y preguntas abiertas

- `docs:check` emite avisos preexistentes de tamaño de handoffs anteriores; no
  hace fallar `verify`.
- No se ejecutaron `test:e2e` ni Playwright, según el brief.

# Fricción reutilizable

Sin entradas: no se encontró comportamiento no documentado ni fallo repetible.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2498 |
| `report_bytes` | 2527 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
