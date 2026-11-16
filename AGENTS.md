---
type: Agent Instructions
title: Instrucciones de entrada para agentes
description: Punto de entrada para cualquier agente que trabaje en ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:33:37Z }
---

# ProyectDungeon

Lee primero [docs/index.md](docs/index.md) y, según la tarea,
[docs/harness/workflow.md](docs/harness/workflow.md). Este fichero es el router:
las reglas de flujo viven en el workflow; aquí solo lo que no puede perderse.

## Agente

- Por defecto, `game-lead`. La selección se guarda por sesión: para orientar una
  sesión abierta, `/requirement` (producto) o `/harness` (arnés).
- `task-runner` no se invoca a mano: lo lanza `game-lead` con una tarea.
- Si la sesión no es `game-lead` y la petición cambia juego, producto o alcance,
  no edites `src/`, `tests/`, `index.html` ni `public/`: comprueba requisito y
  tarea aceptados y pide el cambio de agente si faltan.
- Si hay una tarea `ready`, el siguiente paso es `game-lead`; no se implementa
  directamente.
- Las consultas y cambios de arnés se hacen con `/harness`, en modo
  `harness-audit` de `game-lead` ([ADR-031](docs/decisions/ADR-031-arnes-dos-agentes.md)).

## Invariantes

- Sin código de juego sin una tarea aceptada. El usuario decide lo creativo.
- Propiedad: `game-lead` → `docs/**`, `artifacts/**`, `AGENTS.md`,
  `opencode.jsonc`, `.opencode/**` y `scripts/**`; `task-runner` → `src/**`,
  `tests/**`, `index.html`, `public/**` y el código de `experiments/**`. Un solo
  dueño por dominio; `docs/design/**`, `docs/glossary.md` y `docs/log.md` ya no
  se reparten.
- Handoffs como deltas: la ficha es el contrato; el brief solo existe en un
  reintento. Informe 2 KB objetivo y tope duro 4 KB; esquema en la
  [plantilla de tarea](docs/templates/task.md).
- Verificación: `pnpm run verify:task TASK-NNNN` más los criterios firmados en la
  ficha. Sin firma no hay cierre.
- Experimentos en `experiments/EXP-*` y artefactos en `artifacts/TASK-*`; son
  evidencia y no se reescriben.
- Todo comando va con el parámetro `timeout` de la herramienta de shell; macOS
  no trae el binario `timeout`. Política en
  [workflow](docs/harness/workflow.md#timeouts-y-procesos).
- pnpm 12.18.0; nunca npm ni npx. `pnpm run verify` antes de cerrar cualquier
  cambio.
- Documentación nueva en Markdown con frontmatter OKF
  ([documentación](docs/harness/documentacion.md)).
