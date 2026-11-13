---
type: Task Report
title: "TASK-0094: informe de ejecución"
description: Instancias con localización única, ocho huecos, mochila paramétrica, stats efectivos y operaciones atómicas de 1 MP.
task: TASK-0094
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:21:00Z }
artifacts: artifacts/TASK-0094/attempt-1/
verified:
  - by: task-lead
    at: 2026-11-13T20:22:17Z
    note: >-
      Lead: verify 1225/1225 en main `a173d85`; 94/94 focalizados; E2E en
      TASK-0098.
---

# Estado

`success`. Implementados instancias, mochila y equipo; `pnpm run verify` pasa y
la confirmación serial cubre el flake conocido de EXP-004.

# Cambios

- Archivos: `src/game/{inventory,stats,types,engine,combat,magic,roster,actions,index}.ts`;
  host mínimo en `debug,hud,input,presentation,motion,renderer,world-effects,main.ts`;
  tests unitarios/E2E de tipos actualizados; nuevos `inventory.test.ts` y `stats.test.ts`.
- Mapeo de comandos: `PickUp` (suelo→mochila), `EquipItem` (mochila,suelo,contenedor),
  `UnequipItem` (hueco→mochila), `DropItem` (mochila/hueco→suelo). `SelectWeapon`
  queda como alias legacy de mochila 0-2 para `tsc` E2E; el puente `1`-`3` usa
  `EquipItem` y `G` sigue siendo `PickUp`.
- `map.weapons` deja de estar en `GameState`; las armas generadas pasan a
  `state.groundItems`. El snapshot conserva vistas derivadas `weapons` y
  `legacyEquipment` solo para compilar los E2E previos.
- Correcciones de revisión: `locateSource` busca la instancia concreta en el
  suelo del tile (varias por casilla); restaurado el test de serialización de
  stats; `validateGrowthMap` valida el mapa reconstruido del estado con sus
  `groundItems`; fixtures de presentación sin IDs duplicados.
- Commit SHA: `d827c18ebd8b95dd09b4071a624f41d7837d0ed1`; base `4fe4372`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (focalizados, 4 archivos tocados) | 69/69 | `focused-test-output.txt` |
| `pnpm exec vitest run` (suite completa) | 1225/1225 | `test-output.txt` |
| `pnpm run verify` (workers por defecto) | OK | `verify-output.txt` |
| `pnpm run verify` (lead, main) | OK 1225/1225 | `verify-lead.txt` |
| `VITEST_MAX_WORKERS=1 pnpm run verify` (lead, main) | OK 1225/1225 | `verify-lead-serial.txt` |
| EXP-004 aislado | 20/20 | `logs/exp-004-isolated.txt` |

Cobertura: localización/IDs, dos objetos por tile, capacidad, intercambio,
suelo/contenedor, dos manos, soltar, sin apilado, coste, serialización y stats.

# Evidencia visual

- No aplica: la UI de panel y el arte llegan en TASK-0095/TASK-0096/TASK-0098.

# Desviaciones

- `SelectWeapon` se conserva como alias tipado para no reescribir escenarios E2E;
  su semántica nueva es equipar desde mochila con 1 MP. Documentado arriba.
- El catálogo no tiene armas a dos manos (llegan con REQ-020); la regla se prueba
  con catálogo sintético inyectado en `equipItem`, sin tocar `ITEMS`.
- No se ejecutó Playwright.

# Problemas conocidos y preguntas abiertas

- EXP-004 `spawn.test.ts` (barrido de 200 semillas) supera intermitentemente los
  5 s bajo carga. La pasada por defecto del lead en `main` dio 1225/1225; una
  repetición posterior falló solo por ese timeout (1224/1225) y
  `VITEST_MAX_WORKERS=1` confirmó 1225/1225. Flake conocido; evidencia en
  `verify-lead*.txt`.
- `src/game/` sigue puro; no hay importaciones de `src/host/`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| EXP-004 agota intermitentemente su timeout de 5 s con la suite completa | `verify-output-default-1..3.txt` fallan; `verify-output.txt` y aislado pasan | Reintentar o `VITEST_MAX_WORKERS=1 pnpm run verify` | Afecta a cualquier tarea que ejecute verify en esta máquina | `harness-keeper`: ajustar timeout | Bajo; no cambia reglas | `deferred` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3132 |
| `report_bytes` | 4076 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
