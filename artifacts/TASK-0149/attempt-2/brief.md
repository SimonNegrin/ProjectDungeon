---
type: Task Brief
title: "TASK-0149: brief del intento 2"
description: Cerrar huecos de aviso no bloqueante, integración a dos jugadores y Q del fantasma.
task: TASK-0149
attempt: 2
status: stable
brief_bytes: 2497
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:45:00Z }
---

# Objetivo

Completar el intento 1 sin rehacerlo: demostrar que un aviso transitorio no
bloquea, integrar `N` con dos jugadores y evitar que el fantasma abra una lista
de hechizos que el motor rechaza.

# No objetivos

- Implementar «Ronda N», cámara, HUD o fase enemiga.
- Cambiar motor, pausa o alcance.

# Invariantes

- Los tests del intento 1 se conservan; solo se corrigen o amplían.
- No se editan `docs/**`, `AGENTS.md` ni `.opencode/**`.
- El aviso de ronda es presentación, no un gate de input.

# Criterios de aceptación

Viven en [TASK-0149](../../../docs/tasks/TASK-0149-host-n-retirada-e-r-esc-pausa.md#criterios-de-aceptación).
El intento 1 cubrió todos salvo la prueba directa de libertad durante un aviso y
la integración de `N` con dos jugadores.

# Contexto mínimo

- [Informe del intento 1](../attempt-1/report.md) y diff `d580f3b`.
- `tests/e2e/feedback-turns-marks-qa.spec.ts`: tras `advance(1_000_000)` el
  banner `TU TURNO` sigue visible con `animation.animating === false`.
- `tests/unit/host/session.test.ts`: `commandFromKey` traduce tecla a comando.
- `src/host/input.ts`: `Q` usa `activePlayer`; el motor solo deja lanzar a vivos.

# Correcciones pedidas

1. En `feedback-turns-marks-qa.spec.ts`, con el banner `TU TURNO` visible y la
   animación terminada, pulsa `ArrowRight`: el cursor avanza y el banner sigue
   visible. Sin esperas de reloj real; usa el estado ya avanzado.
2. En `session.test.ts`, integra dos jugadores: el primer `N` pasa el activo al
   segundo sin fase enemiga; el segundo cierra la ronda, emite
   `EnemyPhaseStarted`/`PlayerTurnStarted` y vuelve al primero. Cubre el rechazo
   de `EndTurn` de un no activo.
3. `Q` exige activo **vivo**, como el panel: el fantasma no abre la lista.
   Restaura el caso del cadáver. Si el requisito dijera lo contrario, justifícalo.

# Artefactos

- `attempt-2/{report.md,test-output.txt,verify-output.txt,e2e-output.txt}`.
- Commit(s) con `TASK-0149`; incluye el SHA.

# Riesgos

- No conviertas el test del banner en una espera de reloj real.
- No toques los cambios ajenos del árbol (`docs/log.md`, REQ-021, TASK-0148).
- E2E por specs separadas, nunca la suite completa (180 s).
