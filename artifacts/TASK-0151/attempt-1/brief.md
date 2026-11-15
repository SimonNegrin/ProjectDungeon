---
type: Task Brief
title: "TASK-0151: brief del intento 1"
description: HUD «Jugador N de M», ficha del activo y aviso «Ronda N» no bloqueante.
task: TASK-0151
attempt: 1
status: stable
brief_bytes: 2088
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:20:00Z }
---

# Objetivo

«Jugador N de M» junto al activo y, al empezar cada ronda de personajes, un
«Ronda N» superior de 2 s que no bloquea. Al cargar no hay aviso ni beat
pendiente; la ronda se lee del estado.

# No objetivos

- Fase enemiga y «El master mueve» (TASK-0152); resultado (TASK-0153); QA
  completa (TASK-0154).
- Reglas, motor, cámara, input, pausa, guardado ni rediseño de la columna.
- `docs/**`, `AGENTS.md`, `.opencode/**`; `turn-economy.md` es TASK-0155.

# Invariantes

- `activePlayerId`, `round` y `players` son la verdad; el host solo deriva.
- El aviso no entra en la timeline ni en el gate de input.
- No debilitar tests; los que esperan «TU TURNO» al volver de ronda pasan a
  «Ronda N» conservando su intención.

# Criterios

En [TASK-0151](../../../docs/tasks/TASK-0151-host-hud-jugador-n-de-m-ronda.md#criterios-de-aceptación).

# Contexto mínimo

- [R-006/R-010/R-021/R-024/R-025](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
  y [T-006/T-008](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-técnicos).
- [REQ-024 T-015](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos)
  y [REQ-033 R-008](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos).
- `src/host/{hud,main,feedback-config,feedback-events}.ts`, `index.html`, `ui.css`.
- `tests/unit/host/{hud,feedback-events,ui-foundations}.test.ts`.

# Detalle obligatorio

Lee [brief-detalle.md](brief-detalle.md): contrato, puntos de `main.ts`, tests,
specs E2E por separado y riesgo de layout.

# Artefactos

`attempt-1/{report.md,test-output.txt,verify-output.txt,e2e-output.txt}`;
capturas en `attempt-1/e2e/<spec>/screenshots/`; commit con `TASK-0151` y SHA;
informe ≤2 KB.
