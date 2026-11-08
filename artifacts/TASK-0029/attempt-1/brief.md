---
type: Task Brief
title: "TASK-0029: brief del intento 1"
description: HUD de equipo, armas en el mapa y feedback derivados del motor.
task: TASK-0029
attempt: 1
status: stable
brief_bytes: 2558
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:10:00Z }
---

# Objetivo

Presentar el combate de REQ-010 sin recalcular reglas: HUD con arma, escudo,
armadura y modificadores; hacha y daga en el mapa con pista de `G`; feedback de
impacto, fallo y daño; `F1` con tiradas, equipo y vida de todos, incluido el
enemigo bajo el cursor.

# No objetivos

- E2E/QA visual completos (`TASK-0030`), fórmulas, turnos, bestiario o input
  `G`/`1`-`3`, arte final, animaciones, inventario o pantallas nuevas.

# Invariantes

- Solo presentación: no tocar `src/game/`, `index.html`, `public/`, `docs/` ni
  dependencias; los nodos DOM nuevos se crean desde `src/host/`.
- Equipo desde el catálogo `src/game/equipment.ts`, sin fórmulas duplicadas.
- Conservar el texto de impacto `-N` ASCII (hay E2E que afirman `-1`/`-9`); el
  fallo usa `Fallo`, no solo color o animación. No debilitar tests.

# Criterios de aceptación

Viven en [TASK-0029](../../../docs/tasks/TASK-0029-host-hud-equipo-feedback.md#criterios-de-aceptación).

# Contexto mínimo

- `hud.ts`: stats de equipo/modificadores con nodos dinámicos (testids
  `hud-weapon`, `hud-shield`, `hud-armor`, `hud-modifiers`,
  `hud-cursor-enemy-hp`). Pista `weapon-hint` visible solo si el jugador ocupa
  un arma del mapa; oculta tras recogerla.
- `renderer.ts`: dibujar `state.map.weapons` entre decals y unidades con formas
  planas provisionales (sin assets nuevos), sin alterar capas.
- `feedback.ts` + `main.ts`: `AttackPerformed` trae `hit`, `damage`,
  `targetHp`, `rolls`; impacto `-N`, fallo `Fallo`, sin tapar el mapa.
- `debug.ts`: exponer armas del mapa clonadas (`weapons`) y añadir a
  `buildDebugModel` equipo/modificadores, vida de todos, tiradas del último
  ataque y enemigo bajo el cursor, sin perder líneas actuales.
- Requisito: [R-010 y T-006](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos).

# Artefactos

- `report.md`, salidas de test, `screenshots/` y `logs/` en
  `artifacts/TASK-0029/attempt-1/`.
- Captura 1280×720 con arma, pista, ataque (impacto y fallo) y `F1`. Con
  Playwright, usar `E2E_ARTIFACTS_DIR`; sin servidores en background.
- Commit en `task/TASK-0029`; SHA en el informe.

# Riesgos

- HUD sobrio; no cubrir el mapa.
- Si falla un E2E existente, corrige la presentación, no la aserción.
