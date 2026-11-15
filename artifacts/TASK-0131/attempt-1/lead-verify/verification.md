---
type: Lead Verification
title: "TASK-0131: verificación independiente del intento 1"
description: Revisión del diff, criterios y reejecución de tests y verify.
task: TASK-0131
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:10:00Z }
---

# Diff

- `main...task/TASK-0131`: 3 commits (`4329e58` motor, `42b5e46` tests,
  `5ef0e05` evidencia), 14 archivos, +940/−2.
- Alcance: `src/game` (`death.ts` nuevo, `inventory.ts`, `combat.ts`, `magic.ts`,
  `index.ts`), dos líneas de `src/host/debug.ts` para copiar los campos
  opcionales del contenedor, tests y artefactos. Sin `docs/requirements/**`,
  `docs/harness/**`, `package.json` ni `pnpm-lock.yaml`.
- Sin `skip`/`todo`/`only` nuevos ni tests previos modificados: el único test
  existente tocado es el snapshot de `debug.test.ts`, que solo añade un caso.
- `git diff --check` solo marca una línea en blanco al final de
  `test-output.txt` (artefacto generado); el código no tiene problemas de
  espacios.

# Criterios

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Muerte de jugador crea `Container` de cadáver en su casilla con todo el equipo y mochila, sin tirada ni filtro | `death.ts` (`settleUnitDeath`, orden `EQUIPMENT_SLOTS` + mochila); `death.test.ts` «transfiere todo… sin pérdida» con capacidad 16 y 16 instancias; RNG igual a las tiradas del ataque |
| 2 | Unidad muerta con 0 PV, identidad estable y sin objetos; cadáver vinculado | `hp: 0`, `emptyEquipment()`, mochila vacía conservando capacidad; test de identidad; `Container.corpseOf` |
| 3 | El cadáver no bloquea y comparte casilla con vivos, otros cadáveres o enemigos | `grid.isOccupied` no cambia; test de movimiento sobre dos cadáveres y test de enemigo vivo en la casilla |
| 4 | El cadáver de jugador persiste al vaciarse | Test que extrae el arma con `equipItem` desde el contenedor y comprueba que el contenedor sigue con `[null]`; caso de cadáver nacido vacío |
| 5 | Estado y snapshot exponen cadáver y unidad muerta; serializables | JSON del estado y test de `debug.test.ts` con `kind`, `corpseOf`, unidad `hp: 0` y equipamiento vacío |
| 6 | Ampliación aditiva de `Container` y riesgo de REQ-020 anotado | `kind?`/`corpseOf?` opcionales; docblock con el riesgo antes de la v1 de guardado; cofres y fixtures sin `kind` siguen válidos |
| 7 | Tests de transferencia, identidad, casilla compartida y serialización; `verify` | 10 casos nuevos en `death.test.ts`, 1 en `debug.test.ts`; `pnpm run verify` OK |

# Comandos reejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: docs:check (solo avisos previos, más el aviso de tamaño del informe), config:check, 101 archivos/1502 tests, `tsc`, build y bundle | `verify-lead.txt` |
| `pnpm exec vitest run` (7 archivos de la tarea) | 7 archivos, 186/186 | `targeted-tests.txt` |

No se ejecutó `test:e2e`: no cambia render, panel ni HUD; el único cambio de
host (`debug.ts`) añade campos opcionales al clon del snapshot y el test unitario
lo cubre.

# Prueba manual acordada

`window.__game.snapshot()` de una partida con un jugador muerto muestra en
`containers` el cadáver (`kind: 'corpse'`, `corpseOf`) con todo el equipo y la
mochila, y en `players` la misma unidad con `hp: 0` y sin objetos.

# Fricción triada

Ninguna entrada del informe. No hay propuestas abiertas que eleven a
`requirements-writer`.

# Conocido y fuera de alcance

- La resurrección actual no devuelve objetos ni retira el cadáver: TASK-0148.
- Fantasma (TASK-0132), cadáver de enemigo (TASK-0133), render/panel (TASK-0135
  y TASK-0136), saqueo y guardado quedan fuera de esta tarea.
