---
type: Task Report
title: "TASK-0094: informe de ejecución"
description: Instancias con localización única, ocho huecos, mochila paramétrica, stats efectivos y operaciones atómicas de 1 MP.
task: TASK-0094
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:15:00Z }
artifacts: artifacts/TASK-0094/attempt-1/
verified:
---

# Estado

`success`. Implementados instancias, mochila y equipo; `pnpm run verify` pasa con
`VITEST_MAX_WORKERS=1` (ver Problemas conocidos).

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
- Commit SHA: `4fe4372de89126e29eec62fbdf4b2f4fdbe67835` (`task/TASK-0094`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (focalizados, 20 archivos) | 381/381 | `focused-test-output.txt` |
| `pnpm exec vitest run` (suite completa) | 1220/1220 | `test-output.txt` |
| `VITEST_MAX_WORKERS=1 pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run verify` (workers por defecto) | falla EXP-004 por timeout | `verify-output-default-*.txt` |
| EXP-004 aislado | 20/20 | `logs/exp-004-isolated.txt` |

Cobertura nueva: localización/IDs únicos, capacidad 8 y alternativa, intercambio con
mochila llena, suelo y contenedor, rechazos atómicos, dos manos por ambos lados,
soltar equipado, sin apilado, coste 1 MP/0 acciones, serialización y agregación
sintética de modificadores.

# Evidencia visual

- No aplica: la UI de panel y el arte llegan en TASK-0095/TASK-0096/TASK-0098.

# Desviaciones

- `SelectWeapon` se conserva como alias tipado para no reescribir escenarios E2E;
  su semántica nueva es equipar desde mochila con 1 MP. Documentado arriba.
- El catálogo no tiene armas a dos manos (llegan con REQ-020); la regla se prueba
  con catálogo sintético inyectado en `equipItem`, sin tocar `ITEMS`.
- No se ejecutó Playwright.

# Problemas conocidos y preguntas abiertas

- EXP-004 `spawn.test.ts` (barrido de 200 semillas) supera los 5 s de timeout bajo
  la suite completa con workers por defecto; aislado pasa. No se modificó el test
  ni el arnés. `VITEST_MAX_WORKERS=1` da el verify verde.
- `src/game/` sigue puro; no hay importaciones de `src/host/`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| EXP-004 agota su timeout de 5 s al correr la suite completa | `verify-output-default-*.txt` vs `logs/exp-004-isolated.txt` | `VITEST_MAX_WORKERS=1 pnpm run verify` | Afecta a cualquier tarea que ejecute verify en esta máquina | Ajustar el timeout del test o marcarlo lento | Bajo; no cambia reglas | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3132 |
| `report_bytes` | 3549 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
