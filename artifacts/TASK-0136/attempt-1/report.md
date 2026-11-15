---
type: Task Report
title: "TASK-0136: informe de ejecución"
description: Saqueo de cadáver desde el mismo tile, coste 0 y «coger todo» en el panel.
task: TASK-0136
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:20:00Z }
artifacts: artifacts/TASK-0136/attempt-1/
verified:
---

# Estado

`success`. El panel lista cadáveres-contenedor del tile del activo y reutiliza
la transferencia de contenedores con coste 0 para el vivo.

# Cambios

- `src/game/inventory.ts`: `takeContainerItem`/`takeAllContainerItems` sobre
  `locateSource`/`withBackpackItem`; mismo tile para `kind: 'corpse'` y retirada
  del cadáver de enemigo vacío.
- `src/game/{types,engine}.ts`: `TakeItem`/`TakeAll`, `not-same-tile`, coste 0
  del vivo y una acción por objeto del fantasma.
- `src/host/inventory-panel.ts`: cadáveres desde `state.containers`, objetos
  navegables, `take`/`take-all`/`equip`, `containerOpenCost` y activo vivo.
- `src/host/{inventory-panel-view,input}.ts`, `index.html`, `ui.css`: lista de
  objetos del cadáver con scroll, «sin coste» visible y apertura solo del activo.
- Tests unitarios, integración y E2E; escenarios de cadáver pasan de unidades
  muertas a contenedores `kind: 'corpse'`.
- Commit SHA: `0214731`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| Vitest focalizado (panel, cursor, input, inventario, engine) | 149 pasan | `test-output.txt` |
| E2E acotado (3 specs) | 11 pasan | `e2e-output.txt` |
| `pnpm run verify` | pasa (1568 tests, build y bundle) | `verify-output.txt` |

# Evidencia visual

- `corpse-loot-panel-qa/screenshots/panel-cadaver-coste.png`: dos cadáveres del
  tile, submenú con «Coger / Coger todo sin coste» y «Equipar 1 MP».
- `.../panel-tras-coger-todo.png`: el cadáver de enemigo desaparece y el de
  jugador permanece sin coste de acción ni MP.

# Desviaciones

- Los tests de retirada que equipaban desde una casilla adyacente se movieron al
  mismo tile para conservar su intención bajo la regla nueva.
- Los fixtures visuales usan contenedores vacíos para no alterar geometría/CLS;
  la identidad sigue viniendo de `corpseOf`.

# Problemas conocidos y preguntas abiertas

- Ninguno abierto. No se ejecutó la suite E2E completa; queda para TASK-0142.

# Fricción reutilizable

Sin entradas: no apareció comportamiento no documentado ni fallo repetible.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2492 |
| `report_bytes` | 2547 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
