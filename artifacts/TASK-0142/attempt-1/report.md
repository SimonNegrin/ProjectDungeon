---
type: Task Report
title: "TASK-0142: informe de ejecución"
description: QA de botín, cadáveres y saqueo, sin cambios de comportamiento.
task: TASK-0142
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:15:00Z }
artifacts: artifacts/TASK-0142/attempt-1/
verified:
---

# Estado

`success`. REQ-034 queda cubierto con unitarios existentes enlazados y un E2E
nuevo de muerte real, cadáver oculto en el beat, saqueo y round-trip de guardado.
No se tocó `src/`.

# Cambios

- Archivos: `tests/e2e/loot-qa.spec.ts`; artefactos del intento.
- Commit SHA: `f3db820` (test); artefactos en el commit siguiente.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 107 archivos, 1678 tests; build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 251 passed | `e2e-output.txt` |

# Criterios → test → evidencia

1. Determinismo y carga: `loot.test.ts` (RNG derivado sin tocar el principal),
   `save-schema.test.ts` y E2E `loot-qa.spec.ts` «guardar y cargar…»;
   `logs/guardado-cargado.json`.
2. 25 %/100 % y objetos independientes: `loot.test.ts`.
3. Sin saqueables no hay cadáver; solo pasan los saqueables; oculto en el beat:
   `engine.test.ts`, `renderer.test.ts` y las dos muertes reales de
   `loot-qa.spec.ts`. Evidencia: `sin-cadaver-*.png`, `cadaver-oculto-beat.png`,
   `cadaver-visible.png` y `muerte-con-botin.json`
   (`beatMatchesNoLootTwin=true`, `settledDiffersFromNoLootTwin=true`).
4. Retirada al vaciar y cadáver de jugador persistente: `inventory.test.ts`,
   `corpse-loot-panel-qa.spec.ts` y E2E nuevo (`panel-tras-saquear.png`,
   `containersAfter: []`).
5. Mismo tile y coste: `inventory.test.ts`, `inventory-panel.test.ts`
   (`containerOpenCost`) y E2E nuevo (`panel-cadaver-coste.png`; MP 5→5,
   acciones 1→1).
6. Panel y render desde contenedores: `renderer.test.ts`,
   `inventory-panel.test.ts` y `corpse-containers-render-qa.spec.ts`.
7. Guardar/cargar `lootable` y cadáveres: `save-schema.test.ts` y E2E nuevo;
   `logs/guardado-cargado.json` conserva `lootable:false`, ambos cadáveres y el
   RNG.
8. Capturas y comandos: `screenshots/`, `saves/`, `verify-output.txt`,
   `e2e-output.txt`.

# Evidencia visual

- `screenshots/cadaver-oculto-beat.png`, `cadaver-visible.png`.
- `screenshots/sin-cadaver-ataque.png`, `sin-cadaver-panel.png`.
- `screenshots/panel-cadaver-coste.png`, `panel-tras-saquear.png`,
  `carga-con-contenedores.png`.
- Mirar: cadáver tras el beat, coste «sin coste» y contenedores conservados al
  cargar.

# Desviaciones

- Ninguna de comportamiento. La suite E2E completa con `E2E_ARTIFACTS_DIR`
  generó capturas de otros specs; se retiraron para dejar solo las de la tarea.

# Problemas conocidos y preguntas abiertas

- El cofre solo tiene coste verificable («1 acción») y rechazo de operaciones de
  cadáver; no hay comando de apertura, así que su adyacencia no tiene aserción
  ejecutable. Se enlaza el unitario de coste; no es defecto de TASK-0142.
- El E2E compara el beat con un gemelo no saqueable de las mismas instancias; es
  determinista y no depende de píxeles absolutos del decorado.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Brief pide `screenshots/` en la raíz y plantilla pide `<spec>/screenshots/` | Brief vs Anexo A/B de `docs/templates/task.md` | Guardar ambas rutas | Afecta a toda tarea visual | Unificar redacción | Bajo | `deferred` — lo decide `requirements-writer`/`harness-keeper`; la ruta canónica de `visual-qa.md` es `<spec>/screenshots/` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2276 |
| `report_bytes` | 3.6 KB |
| `overflow` | `none` |
| `criteria_failed` | 0 |
