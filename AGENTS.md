---
type: Agent Instructions
title: Instrucciones de entrada para agentes
description: Punto de entrada para cualquier agente que trabaje en ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:30:00Z }
---

# ProyectDungeon

Lee primero [docs/index.md](docs/index.md) y, según la tarea,
[docs/harness/workflow.md](docs/harness/workflow.md).

## Selección de agente

- `requirements-writer` es el agente primario por defecto para sesiones nuevas
  (`default_agent` en `opencode.jsonc`). La selección se guarda por sesión:
  cambiar la configuración no reemplaza el agente de una sesión ya abierta.
- `requirements-writer` es primario y no se lanza como subagente. Si la sesión
  actual no lo es y la petición crea o cambia comportamiento de juego, producto
  o alcance:
  1. No edites `src/`, `tests/`, `index.html` ni `public/`.
  2. Comprueba si hay un requisito aceptado y una tarea que cubran el cambio.
  3. Si no los hay, detente y pide al usuario cambiar a `requirements-writer` o
     ejecutar `/requirement` antes de continuar.
- Si ya existe una tarea `ready`, el siguiente paso es `task-lead`; no se
  implementa directamente.
- Una sesión por requisito o milestone.

## Reglas del proyecto

- El agente por defecto es `requirements-writer`.
- No se escribe código de juego sin una tarea aceptada.
- El usuario tiene la última palabra sobre decisiones creativas.
- Las decisiones técnicas se documentan en `docs/decisions/` y no se consultan
  salvo que sean irreversibles, caras o afecten a la sensación de juego.
- Toda la documentación nueva debe ser Markdown con frontmatter OKF.
- Los experimentos viven en `experiments/EXP-*` y usan el shell compartido.
- Los artefactos de tarea viven en `artifacts/TASK-*`.
- Antes de cerrar cualquier cambio, ejecuta `pnpm run verify` o justifica por qué
  no aplica.

## Gestor de paquetes

- Usa la versión de **pnpm** fijada en `packageManager` (12.18.0); no uses npm
  ni npx.
- Instala con `pnpm install`.
- Ejecuta scripts con `pnpm run ...` o `pnpm ...`.
- Playwright se instala con `pnpm exec playwright install chromium`.

## Timeouts y procesos

- Todo comando en primer plano debe llevar un `timeout` explícito.
- El timeout explícito es el parámetro de la herramienta de shell; macOS no
  incluye el binario `timeout`. Si se envuelve el comando, `gtimeout` de
  coreutils es la alternativa.
- Los comandos en background solo se usan para servidores o watchers, con puerto
  fijo, comprobación de salud y cierre posterior.
- Nunca esperes indefinidamente a un proceso.
- Si un comando agota el timeout, para el proceso, guarda evidencia y escala.
- La política completa está en
  [docs/harness/workflow.md](docs/harness/workflow.md#timeouts-y-procesos).

## Handoffs

- El brief y el informe son deltas del intento: objetivo 1,5 KB y 2 KB; tope duro
  4 KB. El esquema vive en los anexos de
  [la plantilla de tarea](docs/templates/task.md).
- El esquema es obligatorio: si falta un campo, el handoff no es válido.
- Nada se borra: el desbordamiento va a `brief-detalle.md`/`report-detalle.md` y
  se enlaza.
- Una sesión por tarea o intento; antes de compactar o cambiar, escribe el
  handoff.
- No dupliques criterios ni requisitos: enlaza; el estado vive en la tarea y los
  artefactos.
- El log es un índice de una línea por evento:
  `* YYYY-MM-DD — Tipo — ID — resultado — enlace`.

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
