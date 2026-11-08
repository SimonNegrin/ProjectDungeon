---
type: Task
id: TASK-0029
title: "Host: HUD de equipo, armas en el mapa y feedback de combate"
description: Mostrar arma, escudo, armadura y modificadores, dibujar las armas del mapa, la pista de G y el feedback de impacto, fallo y daño.
status: stable
task_status: backlog
task_type: feature
requirement: REQ-010
requirement_ids: [R-003, R-004, R-010, T-006, T-010]
depends_on: [TASK-0027, TASK-0028]
unlocks: [TASK-0030]
created_at: 2026-11-08T17:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0029/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
---

# Objetivo

Que el host presente el combate con equipo de
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos)
R-010 y T-006: HUD con arma, escudo, armadura y modificadores; armas dibujadas
en el mapa con pista de `G`; feedback de impacto o fallo y daño; vida del enemigo
bajo el cursor y el resto en `F1`. La presentación no cambia reglas.

# Contexto

- Motor y estado: `TASK-0026`, `TASK-0027` y `TASK-0028`.
- Host: `src/host/hud.ts`, `renderer.ts`, `feedback.ts`, `debug.ts`,
  `input.ts` y `main.ts`; assets en `src/host/assets.ts`.
- Estilo y capas: [ADR-008](../decisions/ADR-008-presentacion-animada.md) y
  [REQ-004](../requirements/REQ-004-cursor-seleccion.md).

# Criterios de aceptación

- [ ] El HUD muestra el arma equipada, el escudo, la armadura y los
      modificadores del jugador; se actualiza al recoger o cambiar de arma y
      coincide con el snapshot.
- [ ] El hacha y la daga se dibujan en el mapa; la pista de `G` aparece solo
      cuando el jugador está sobre un arma y desaparece al recogerla.
- [ ] Un ataque produce "Fallo" o "−N" sobre el objetivo y muestra el daño
      resultante; el feedback no tapa el mapa y el fallo se comunica con texto,
      no solo con color o animación.
- [ ] En juego normal no se muestran los dados; `F1` muestra tiradas, equipo y
      vida de todos, incluida la vida del enemigo bajo el cursor.
- [ ] El HUD, el render y el feedback no recalculan reglas: leen estado y
      eventos del motor. No se duplican fórmulas ni valores de combate.
- [ ] Tests de HUD, feedback, debug y renderer; captura de humo a 1280×720 con
      un arma en el mapa y un ataque. No se debilitan tests existentes.
- [ ] `pnpm run verify` pasa; sin cambios en `src/game/`, `package.json` ni
      dependencias.

# Plan de test

- **Unitario:** HUD con cada arma y equipo; pista de `G`; feedback de impacto,
  fallo y daño; `F1` con tiradas y vida; renderer de armas y orden de capas.
- **Integración:** recogida y cambio de arma actualizan HUD y snapshot; ataque
  real genera el feedback correcto.
- **Visual:** captura de humo con arma en el mapa, pista, impacto, fallo y `F1`.
- **Regresión:** `pnpm test` y `pnpm run verify`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0029/attempt-1/report.md`.
- [ ] Capturas en `attempt-1/screenshots/` y salidas de tests/`verify`.
- [ ] Commit SHA en la rama `task/TASK-0029`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm test -- tests/unit/host/hud.test.ts tests/unit/host/feedback.test.ts tests/unit/host/debug.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- Solo presentación: no cambiar fórmulas, daño, impacto, turnos ni equipo.
- No tocar `src/game/`, `index.html`, `public/`, `docs/` ni dependencias.
- No añadir arte final, animaciones nuevas ni efectos que oculten el mapa.

# No objetivos

- E2E y QA visual completos (`TASK-0030`).
- Cambiar el bestiario, la percepción o la huida.
- Inventario completo, loot o pantallas nuevas.
