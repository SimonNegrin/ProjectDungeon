---
type: Task Brief
title: "TASK-0142: brief del intento 1"
description: QA de botín, cadáveres y saqueo de punta a punta, sin cambiar reglas.
task: TASK-0142
attempt: 1
status: stable
brief_bytes: 2276
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:00:00Z }
---

# Objetivo

Demostrar con unitarios, integración y E2E que botín, cadáveres y saqueo cumplen
REQ-034 tal como está implementado. Mide y reporta; no cambia comportamiento.
Cada criterio debe tener aserción ejecutable y evidencia.

# No objetivos

- Corregir defectos, rebalancear, añadir objetos/llaves/cofres cerrados.
- Reescribir los specs de TASK-0135/0136/0138/0141: se reutilizan y enlazan.
- QA de hotseat, resultado, inicio o arte del cadáver.

# Invariantes

- No debilitar, borrar ni saltar tests. No tocar `src/`: si un test destapa un
  defecto real, para, guárdalo como evidencia y reporta `blocked`; no lo tapes ni
  relajes el criterio.
- Semilla fija y comandos reales en E2E; `openState`/`openBspState` solo montan
  escenarios. Capturas con `advance`/`settle`, sin reloj real.

# Criterios de aceptación

`docs/tasks/TASK-0142-qa-e2e-botin.md#criterios-de-aceptación`, enlazados uno a
uno en el informe (criterio → test → evidencia).

# Contexto mínimo

- `src/game/loot.ts`, `death.ts`, `inventory.ts`, `save.ts`; `src/host/debug.ts`,
  `inventory-panel.ts`, `renderer.ts`.
- Ya cubierto: `tests/unit/game/{loot,death,inventory,save-schema}.test.ts`,
  `tests/unit/host/{inventory-panel,renderer}.test.ts`, E2E
  `corpse-containers-render-qa.spec.ts` y `corpse-loot-panel-qa.spec.ts`.
- Helpers: `tests/e2e/support.ts` (`openBspState`, `openState`, `snapshot`,
  `dispatchAccepted`, `advanceToCue`, `settle`, `walkTo`), `tests/e2e/artifacts.ts`.

# Artefactos

`artifacts/TASK-0142/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, `screenshots/` (cadáver, panel y coste), `logs/`, `saves/`.
Spec nuevo `tests/e2e/loot-qa.spec.ts`; unitarios solo para huecos reales.

# Riesgos y decisiones abiertas

- Huecos probables: round-trip guardar/cargar con `lootable` y cadáveres en
  navegador; cadáver oculto durante el beat de muerte a nivel de host.
- Si algo ya está cubierto, enlaza el test y añade solo la aserción que falte.
