---
type: Task
id: TASK-0029
title: "Host: HUD de equipo, armas en el mapa y feedback de combate"
description: Mostrar arma, escudo, armadura y modificadores, dibujar las armas del mapa, la pista de G y el feedback de impacto, fallo y daño.
status: stable
task_status: done
task_type: feature
requirement: REQ-010
requirement_ids: [R-003, R-004, R-010, T-006, T-010]
depends_on: [TASK-0027, TASK-0028]
unlocks: [TASK-0030]
created_at: 2026-11-08T17:31:45Z
completed_at: 2026-11-08T19:05:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0029/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-08T19:45:00Z
    note: >-
      Intento 1 verificado en task/TASK-0029: implementación 0f6e42a,
      corrección e4e4b6d e informe 605c95f. Diff completo revisado; verify OK
      (483 tests, 142 documentos, config y build) y test:e2e OK (57/57). HUD
      con arma/escudo/armadura/mods, armas del mapa, pista de G, feedback
      Fallo/-N y F1 con equipo enemigo, tiradas y vida de todos; capturas
      revisadas. Sin cambios en src/game, index.html, public, docs ni
      dependencias; sin tests borrados o debilitados. Fricción de walkTo:
      deferred a TASK-0030.
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

- [x] El HUD muestra el arma equipada, el escudo, la armadura y los
      modificadores del jugador; se actualiza al recoger o cambiar de arma y
      coincide con el snapshot.
- [x] El hacha y la daga se dibujan en el mapa; la pista de `G` aparece solo
      cuando el jugador está sobre un arma y desaparece al recogerla.
- [x] Un ataque produce "Fallo" o "−N" sobre el objetivo y muestra el daño
      resultante; el feedback no tapa el mapa y el fallo se comunica con texto,
      no solo con color o animación.
- [x] En juego normal no se muestran los dados; `F1` muestra tiradas, equipo y
      vida de todos, incluida la vida del enemigo bajo el cursor.
- [x] El HUD, el render y el feedback no recalculan reglas: leen estado y
      eventos del motor. No se duplican fórmulas ni valores de combate.
- [x] Tests de HUD, feedback, debug y renderer; captura de humo a 1280×720 con
      un arma en el mapa y un ataque. No se debilitan tests existentes.
- [x] `pnpm run verify` pasa; sin cambios en `src/game/`, `package.json` ni
      dependencias.

# Plan de test

- **Unitario:** HUD con cada arma y equipo; pista de `G`; feedback de impacto,
  fallo y daño; `F1` con tiradas y vida; renderer de armas y orden de capas.
- **Integración:** recogida y cambio de arma actualizan HUD y snapshot; ataque
  real genera el feedback correcto.
- **Visual:** captura de humo con arma en el mapa, pista, impacto, fallo y `F1`.
- **Regresión:** `pnpm test` y `pnpm run verify`.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0029/attempt-1/report.md`.
- [x] Capturas en `attempt-1/screenshots/` y salidas de tests/`verify`.
- [x] Commit SHA en la rama `task/TASK-0029`.

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

# Verificación

`task-lead` revisó el diff completo y re-ejecutó `pnpm run verify` (483 tests,
142 documentos, config y build) y `pnpm run test:e2e` (57/57), con salidas en
`attempt-1/lead-verify-final.txt` y `attempt-1/lead-e2e-final.txt`. Se
revisaron las capturas `weapon-in-map`, `weapon-map-hint`, `weapon-picked`,
`attack-hit`, `attack-miss` y `debug-f1`: HUD de equipo, armas del mapa, pista
de `G` que desaparece al recoger, impacto `-2`, fallo `Fallo` y `F1` con
equipo enemigo, tiradas y vida de todos. En la primera verificación faltaba el
equipo enemigo en `F1` y el fallo se resumía como `-0`; se relanzó al runner
con esa evidencia y se corrigió en `e4e4b6d`. Sin cambios en `src/game/`,
`index.html`, `public/`, `docs/` ni dependencias; sin tests borrados, saltados
o debilitados. Fricción de `walkTo` con 0 MP: error local del smoke,
`deferred` a `TASK-0030`.

