---
type: Task Brief
title: "TASK-0078: brief del intento 1"
description: Contador de acciones en HUD/debug, cierre manual con E, sugerencia y beats por acción.
task: TASK-0078
attempt: 1
status: stable
brief_bytes: 2529
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T19:00:00Z }
---

# Objetivo

HUD y debug muestran acciones restantes/máximas; `E` cierra el turno sin
auto-terminación; la sugerencia aparece solo con 0 acciones y sin MP útil; cada
acción conserva su beat en orden. Corrige la aserción de `cursor-qa` descrita en
los criterios.

# No objetivos

- HUD lateral de `REQ-022`/`REQ-023`, iconos o arte definitivo.
- Cambiar fórmulas, contador del motor, costes, valores de balance o beats de
  `REQ-017`.
- Guardado, hechizos, réplica o dependencias nuevas.

# Invariantes

- `src/game/**` no cambia salvo tests si son imprescindibles; el host solo
  presenta y lee `actions`.
- `E` sigue siendo el único cierre; gastar la última acción no termina turno.
- El HUD actual se conserva: extiende `hud-action` y añade un nodo discreto para
  la sugerencia; no rediseñes columnas.
- La presentación reconstruye el contador por ataque ocurrido (2→1→0), no todo
  a 0 en el primer beat.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0078-host-contador-acciones-fin-turno.md`, sección
«Criterios de aceptación»; enlázalos, no los copies.

# Contexto mínimo

- `src/host/hud.ts`: `HudModel`, `buildHudModel`, `buildDebugModel`, `HudView`.
- `src/host/motion.ts`: `presentationState` reconstruye acciones durante beats.
- `src/host/input.ts`: `E`/`EndTurn`; confirma que no hay auto-cierre.
- `index.html`: nodo `hud-action` y estilos del HUD actual.
- `tests/unit/host/hud.test.ts`, `tests/e2e/cursor-qa.spec.ts` («enemigo
  alcanzable sin acción»), `game-input-hud.spec.ts`, `frame-qa.spec.ts`,
  `generated-map-qa.spec.ts`, `motion-qa.spec.ts`.
- Requisito: [REQ-026](../../../docs/requirements/REQ-026-economia-acciones-rebalanceo.md),
  anclas R-008, T-006 y T-007.

# Artefactos

- `report.md`, `verify-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`.

# Riesgos y decisiones abiertas

- Formato provisional del contador: `restantes/máximas` (p. ej. `2/2`); usa un
  testid estable y evita aserciones sobre el envoltorio del HUD.
- «MP útil» se define como `mp > 0`; la sugerencia exige además fase de jugador
  y partida en curso.
- E2E nuevo con capturas 1280×720 y 900×700; actualiza expectativas antiguas
  `Sí`/`No` sin debilitar su intención.
