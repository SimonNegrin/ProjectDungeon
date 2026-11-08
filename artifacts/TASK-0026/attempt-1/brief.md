---
type: Task Brief
title: "TASK-0026: brief del intento 1"
description: Motor de combate con equipo, modificadores y RNG sembrado.
task: TASK-0026
attempt: 1
status: stable
brief_bytes: 2557
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:48:00Z }
---

# Objetivo

Sustituir el daño fijo de `src/game/` por el resolvedor de REQ-010 con catálogo
de armas, armadura y escudo, modificadores por unidad y RNG sembrado
serializable. Jugador y enemigo comparten `resolveAttack`; el motor sigue puro y
determinista.

# No objetivos

- Armas en el mapa, recogida y cambio (TASK-0027); bestiario, visión, alarma o
  huida (TASK-0028); HUD/feedback (TASK-0029); E2E/QA visual (TASK-0030).
- `src/host/`, `index.html`, `public/`, `docs/`, `experiments/`, dependencias.

# Invariantes

- Fórmulas y valores: REQ-010 R-001..R-004, R-011, R-013 y tabla A de EXP-003.
- Orden de tiradas: ataque, escudo; si impacta, daño y armadura. Fallo = 2
  tiradas; impacto = 4.
- Victoria/derrota, economía de turno y rechazos existentes no cambian.
- No `Math.random`, `Date.now` ni estado global mutable.
- Tests existentes: se actualizan a RNG controlado conservando su intención; no
  se borran, saltan ni debilitan.

# Criterios de aceptación

`docs/tasks/TASK-0026-motor-combate-equipo-modificadores.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/combat.ts`, `types.ts`, `engine.ts`, `turn.ts`, `ai.ts`; tests en
  `tests/unit/game/{combat,engine,helpers,integration}.test.ts`.
- REQ-010 `#requisitos-creativos`, `#requisitos-técnicos` y
  `#modificadores-y-equipo-aceptados`; EXP-003.
- Catálogo en `src/game/equipment.ts`: IDs `sword`, `axe`, `dagger`, `armor`,
  `shield`; espada +3/4, hacha +2/6, daga +4/3.
- `GameState.rng = { seed, state }` serializable; `seed` normalizada = semilla
  de partida, ya expuesta en solo lectura por `window.__game.snapshot().seed`.
  Cada tirada devuelve un `d6` y un estado nuevo.
- Jugador: `+1/+1/+1`, espada, armadura 1, escudo 1, 20 PV. Enemigo provisional:
  `+0/+0/+0`, espada, escudo 1, armadura 1, 10 PV; TASK-0028 lo sustituye.
- `ai.ts`/`turn.ts` siguen llamando a `resolveAttack`; sin fórmulas paralelas.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`. Commit en `task/TASK-0026`.

# Riesgos y decisiones abiertas

- Distribución empírica con muestras grandes y tolerancia ±2 puntos.
- `makeState`/`makeUnit` aceptan RNG y equipo sin romper llamadas actuales.
- El contador del RNG no va en el snapshot: `src/host/` está fuera de alcance;
  nota.
