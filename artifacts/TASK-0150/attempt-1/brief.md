---
type: Task Brief
title: "TASK-0150: brief del intento 1"
description: Relevo por cámara y paneo de 300 ms con bloqueo de input y movimiento reducido.
task: TASK-0150
attempt: 1
status: stable
brief_bytes: 1797
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:10:00Z }
---

# Objetivo

Al cerrar turno, la cámara llega al siguiente jugador con un paneo de 300 ms; el
input se bloquea hasta llegar y se libera al terminar. Ronda 1 es directa, la
vuelta enemiga llega al primer jugador y con `prefers-reduced-motion` todo salta.

# No objetivos

- «Jugador N de M», «Ronda N» ni HUD (TASK-0151); fase enemiga (TASK-0152).
- Cambiar reglas, motor, duración, pausa o guardado; editar `docs/**`,
  `AGENTS.md` ni `.opencode/**`.

# Invariantes

- Un único turno: `activePlayerId` del motor.
- Paneo determinista con `advance(ms)`; `settle` completa animación y paneo.
- Reutiliza el gate `panning`; no debilites tests; `src/game/**` no cambia.

# Criterios

En [TASK-0150](../../../docs/tasks/TASK-0150-host-relevo-camara-paneo.md#criterios-de-aceptación).

# Contexto

- [R-005/R-006/R-010/R-021/R-022](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos).
- `src/host/main.ts`: `render` y `finishAnimation` centran en `players[0]`;
  `pauseContext` y keydown pasan `panning: false`.
- `src/host/input.ts` ya prueba el gate; `motion.ts`, `camera.ts` y `debug.ts`
  aportan cámara, reloj y snapshot.

# Detalle obligatorio

Lee [brief-detalle.md](brief-detalle.md): enfoque, reglas de paneo, tests y
specs E2E que se ejecutan por separado.

# Artefactos

- `attempt-1/{report.md,test-output.txt,verify-output.txt,e2e-output.txt}`.
- Capturas en `attempt-1/e2e/<spec>/screenshots/`.
- Commit(s) con `TASK-0150` y SHA. Informe ≤ 2 KB.
