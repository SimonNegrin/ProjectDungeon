---
type: README
title: ProyectDungeon
description: Repositorio de desarrollo, documentación y experimentos de ProyectDungeon.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:12:11Z }
---

# ProyectDungeon

Dungeon crawler 2D por turnos, cooperativo y local-first. El objetivo final es
que varias personas jueguen desde el móvil mientras la pantalla host muestra la
partida. El primer hito jugable está cerrado y probado; las mejoras de encuadre,
sala y movimiento se recogen en `REQ-002`.

## Estado actual

- Documentación base en OKF v0.2.
- Agentes de OpenCode: `requirements-writer`, `harness-keeper`, `task-lead`,
  `task-runner`.
- Skills de OpenCode para requisitos, verificación de tareas y QA visual.
- Motor determinista de rejilla, turnos, combate e IA en `src/game/`.
- Host Canvas 2D en `src/host/` con la sala de 32×24, sprites de 32rogues y
  cámara limitada a los bordes del mapa.
- Teclado, HUD, overlays de victoria/derrota, reinicio, debug y E2E del loop
  completo.
- Primer hito cerrado tras el playtest. `REQ-002` recoge el siguiente corte:
  marco 16:9, mapa 13×13, sala más pequeña y más movimiento.
- Shell de experimentos interactivo y primer experimento de humo.
- Sin servidor, sin QR y sin multijugador remoto.

## Requisitos

- Node.js >= 20.
- pnpm 12.18.0.

## Arranque rápido

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run dev
```

`pnpm run dev` abre el juego en `/`. El índice de experimentos sigue disponible
en `/experiments/`.

## Comandos

| Comando | Uso |
|---|---|
| `pnpm run dev` | Servidor de desarrollo. |
| `pnpm run build` | Typecheck y build de producción (solo el juego). |
| `pnpm run build:experiments` | Build de experimentos en `dist-experiments/`, separado de `dist/`. |
| `pnpm run check:bundle` | Comprueba que `dist/` no contiene BSP, plantillas ni experimentos. |
| `pnpm test` | Tests unitarios con Vitest. |
| `pnpm run test:e2e` | Tests de navegador con Playwright. |
| `pnpm run docs:check` | Valida OKF, enlaces, grafo y topes de handoff. |
| `pnpm run config:check` | Valida agentes, skills y `opencode.jsonc`. |
| `pnpm run tasks:board` | Regenera `docs/tasks/index.md`. |
| `pnpm run tasks:next` | Muestra la siguiente tarea lista. |
| `pnpm run verify` | Validación completa local. |

## Dónde mirar

- [Índice de documentación](docs/index.md)
- [Visión](docs/vision.md)
- [Alcance y fases](docs/scope.md)
- [Flujo de trabajo](docs/harness/workflow.md)
- [Agentes y permisos](docs/harness/workflow.md#agentes)
- [Experimentos](docs/harness/experiments.md)
- [QA visual](docs/harness/visual-qa.md)
- [Experimentos interactivos](experiments/index.md)

## Arte placeholder

Los sprites y tiles son del pack [32rogues](https://sethbb.itch.io/32rogues) de
Seth Boyles, versionado en `public/assets/32rogues/` con su `LICENSE.txt`. El
juego carga los assets desde el bundle y no usa red en runtime.

## Convenciones

- Documentación en español; código, identificadores y commits en inglés.
- Cada documento Markdown del bundle lleva frontmatter OKF.
- Las decisiones creativas las aprueba el usuario.
- Las decisiones técnicas se registran en ADRs.
- Un agente no modifica código sin una tarea aceptada.
