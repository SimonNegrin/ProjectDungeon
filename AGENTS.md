---
type: Agent Instructions
title: Instrucciones de entrada para agentes
description: Punto de entrada para cualquier agente que trabaje en ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:10:00Z }
---

# ProyectDungeon

Lee primero [docs/index.md](docs/index.md) y, según la tarea,
[docs/harness/workflow.md](docs/harness/workflow.md). Este fichero es el router:
las reglas de flujo viven en el workflow; aquí solo lo que no puede perderse.

## Agente

- Por defecto, `requirements-writer`. La selección se guarda por sesión: para
  cambiar una sesión abierta, `/requirement`.
- Si la sesión no es `requirements-writer` y la petición cambia juego, producto
  o alcance, no edites `src/`, `tests/`, `index.html` ni `public/`: comprueba
  requisito y tarea aceptados y pide el cambio de agente si faltan.
- Si hay una tarea `ready`, el siguiente paso es `task-lead`; no se implementa
  directamente.
- `harness-keeper` se invoca a mano para consultas y cambios de arnés.

## Invariantes

- Sin código de juego sin una tarea aceptada. El usuario decide lo creativo.
- Propiedad: `harness-keeper` → `docs/harness/**`, `docs/templates/**`,
  `AGENTS.md`, `.opencode/**` y `opencode.jsonc`; `requirements-writer` → el
  resto del producto; `task-lead` → tareas, decisiones, diseño y glosario.
- Handoffs como deltas: brief 1,5 KB e informe 2 KB; tope duro 4 KB; esquema en
  la [plantilla de tarea](docs/templates/task.md).
- Experimentos en `experiments/EXP-*` y artefactos en `artifacts/TASK-*`; son
  evidencia y no se reescriben.
- Todo comando va con el parámetro `timeout` de la herramienta de shell; macOS
  no trae el binario `timeout`. Política en
  [workflow](docs/harness/workflow.md#timeouts-y-procesos).
- pnpm 12.18.0; nunca npm ni npx. `pnpm run verify` antes de cerrar cualquier
  cambio.
- Documentación nueva en Markdown con frontmatter OKF
  ([documentación](docs/harness/documentacion.md)).
