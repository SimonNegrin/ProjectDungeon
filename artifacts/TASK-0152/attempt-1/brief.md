---
type: Task Brief
title: "TASK-0152: brief del intento 1"
description: Fase enemiga con aviso, cámara y HUD de actor/objetivo.
task: TASK-0152
attempt: 1
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:10:00Z }
---

# Objetivo

Presentar la fase enemiga: «El master mueve» solo si algún enemigo actúa, cámara
al actor, HUD derecho con el actor y HUD izquierdo con la ficha compacta del
objetivo o «Sin objetivo»; al acabar, vuelta al primer jugador y «Ronda N».
Propagar `enemyPhase` por `GameSession`.

# No objetivos

- Resultado Victoria/Derrota (TASK-0153), timer o avisos nuevos.
- IA, orden enemigo, motor, economía ni `docs/design/turn-economy.md`.
- Quitar marcas `...`, `!!` o `zzz` de REQ-017.
- Requisitos, arnés, plantillas, `AGENTS.md` o `.opencode/**`.

# Invariantes

- `src/game/` puro; el host presenta. No cambies reglas ni balance.
- No debilites tests. Duraciones v1: 800 ms de aviso, 300 ms de paneo.
- `prefers-reduced-motion` salta sin animación; tests sin relojes reales.
- Una fase enemiga por ronda; manda el motor.

# Criterios de aceptación

En `docs/tasks/TASK-0152-host-fase-enemiga-master-mueve.md`, sección «Criterios
de aceptación». Enlaza; no los copies.

# Contexto mínimo

- `src/game/turn.ts`: `resolveEndTurn` devuelve `enemyPhase` (`enemyId`,
  `targetId`, `wait|act`).
- `src/host/session.ts`: `StepResult`/`dispatch` deben reenviar `enemyPhase`.
- `src/host/main.ts`: `applyCommand`, `buildMotionTimeline`, `startAnimation`,
  `finishAnimation` y HUD; `motion.ts`/`camera-pan.ts`: timeline y paneo 300 ms.
- `src/host/hud.ts`, `hud-detail.ts`, `index.html` y `feedback-events.ts`.
- REQ-031 R-007 a R-010, R-022, T-004 a T-006, T-008.

# Decisiones del lead

- Sin `action: 'act'`, no hay banner ni cue de fase; se conservan marcas de
  espera. Decide con `enemyPhase`.
- Solo los `act` reciben cámara y HUD.
- HUD izquierdo: ficha compacta con miniatura, nombre, PV y stats del objetivo;
  sin arma, inventario ni equipo. Sin `targetId`, «Sin objetivo».
- HUD derecho: detalle de enemigo del actor.
- «El master mueve» sustituye `FASE ENEMIGA`; conserva `enemyPhaseBannerMs`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `logs/`.
- E2E en `tests/e2e/<spec>/screenshots/`.

# Riesgos

- E2E completa supera 180 s: specs sensibles por separado, con registro.
- Tests de `FASE ENEMIGA` y cue incondicional: actualiza solo lo que cambia.
- No toques `tests/unit/game/turn.test.ts` salvo por la propagación.
