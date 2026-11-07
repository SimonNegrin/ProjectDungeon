---
type: README
title: ProyectDungeon
description: Repositorio de desarrollo, documentación y experimentos de ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# ProyectDungeon

Dungeon crawler 2D por turnos, cooperativo y local-first. El objetivo final es
que varias personas jueguen desde el móvil mientras la pantalla host muestra la
partida. Ahora mismo el proyecto está en la **fase 0**: documentación, arnés de
agentes y shell de experimentos. Todavía no hay código de juego.

## Estado actual

- Documentación base en OKF v0.2.
- Agentes de OpenCode: `requirements-writer`, `task-lead`, `task-runner`.
- Skills de OpenCode para requisitos, tareas, experimentos, arquitectura y QA visual.
- Shell de experimentos interactivo y primer experimento de humo.
- Sin servidor, sin QR y sin multijugador remoto.

## Requisitos

- Node.js >= 20.
- pnpm 9.15.0.

## Arranque rápido

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run dev
```

Abre la URL que muestre Vite (por defecto <http://127.0.0.1:5173/experiments/>)
para ver el índice de experimentos.

## Comandos

| Comando | Uso |
|---|---|
| `pnpm run dev` | Servidor de desarrollo. |
| `pnpm run build` | Typecheck y build de producción. |
| `pnpm test` | Tests unitarios con Vitest. |
| `pnpm run test:e2e` | Tests de navegador con Playwright. |
| `pnpm run docs:check` | Valida OKF, enlaces y grafo de tareas. |
| `pnpm run config:check` | Valida agentes, skills y `opencode.jsonc`. |
| `pnpm run tasks:board` | Regenera `docs/tasks/index.md`. |
| `pnpm run tasks:next` | Muestra la siguiente tarea lista. |
| `pnpm run verify` | Validación completa local. |

## Dónde mirar

- [Índice de documentación](docs/index.md)
- [Visión](docs/vision.md)
- [Alcance y fases](docs/scope.md)
- [Flujo de trabajo](docs/harness/workflow.md)
- [Agentes](docs/harness/agents.md)
- [Experimentos](docs/harness/experiments.md)
- [QA visual](docs/harness/visual-qa.md)
- [Experimentos interactivos](experiments/index.md)

## Convenciones

- Documentación en español; código, identificadores y commits en inglés.
- Cada documento Markdown del bundle lleva frontmatter OKF.
- Las decisiones creativas las aprueba el usuario.
- Las decisiones técnicas se registran en ADRs.
- Un agente no modifica código sin una tarea aceptada.
