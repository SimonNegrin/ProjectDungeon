---
type: Agent Instructions
title: Instrucciones de entrada para agentes
description: Punto de entrada para cualquier agente que trabaje en ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# ProyectDungeon

Lee primero [docs/index.md](docs/index.md) y, según la tarea,
[docs/harness/workflow.md](docs/harness/workflow.md).

## Reglas del proyecto

- El agente por defecto es `requirements-writer`.
- No se escribe código de juego sin una tarea aceptada.
- El usuario tiene la última palabra sobre decisiones creativas.
- Las decisiones técnicas se documentan en `docs/decisions/` y no se consultan
  salvo que sean irreversibles, caras o afecten a la sensación de juego.
- Toda la documentación nueva debe ser Markdown con frontmatter OKF.
- Los experimentos viven en `experiments/EXP-*` y usan el shell compartido.
- Los artefactos de tarea viven en `artifacts/TASK-*`.
- Antes de cerrar cualquier cambio, ejecuta `npm run verify` o justifica por qué
  no aplica.

## Flujo

1. `requirements-writer` convierte una conversación en requisitos aprobados.
2. Si hay una incertidumbre, se diseña un experimento interactivo.
3. Los requisitos aprobados generan tareas atómicas.
4. `task-lead` valida la tarea y lanza `task-runner`.
5. `task-lead` verifica de forma independiente y actualiza la tarea.
6. El usuario revisa el resultado jugable o creativo.

No hay que preguntar por decisiones técnicas rutinarias. Sí hay que preguntar por
decisiones creativas, contradicciones de requisitos o bloqueos que impidan
continuar.
