---
type: Task
id: TASK-0151
title: "Host/HUD: Jugador N de M, ficha activo y Ronda N"
description: "Mostrar «Jugador N de M» junto al activo, su ficha completa en fase de personajes y el aviso transitorio «Ronda N» no bloqueante."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-006, R-025, T-008]
depends_on: [TASK-0146, TASK-0150]
unlocks: [TASK-0152, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T22:40:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0151/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T22:40:00Z
    note: >-
      Intento 1 verificado (código `d526125`, tests `b43edcd`, evidencia
      `aa2431a`). Diff limitado a host, HTML/CSS, tests y artefactos; sin motor,
      requisitos, arnés, dependencias ni docs de diseño. `pnpm run verify`
      reejecutado: docs 723, 107 archivos/1718 tests, config, tsc, build y bundle
      OK. E2E por specs separadas: 60/60 en 12 specs. Criterios 1-7 cumplidos.
      Evidencia en `attempt-1/report.md` y `lead-verify/verification.md`.
---

# Objetivo

Que la mesa sepa en todo momento a quién le toca y en qué ronda está, sin que el
aviso de ronda interrumpa la acción.

# Contexto

REQ-031
[R-006](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
y
[R-025](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fijan «Ronda N» y «Jugador N de M»; T-008 define el HUD. TASK-0146 aporta activo
y ronda, TASK-0150 el relevo. La ficha compacta del objetivo enemigo es
TASK-0152.

# Criterios de aceptación

- [x] El HUD izquierdo muestra la ficha completa del activo en fase de
      personajes, con «Jugador N de M» junto al nombre.
- [x] N es la posición en el orden y M el total; con un jugador se lee «Jugador
      1 de 1».
- [x] Al empezar cada ronda de personajes aparece «Ronda N» en la parte superior
      durante 2 s por defecto, configurable.
- [x] El aviso no bloquea: se puede mover el cursor, actuar o abrir el panel
      mientras se desvanece.
- [x] El aviso no aparece al cargar una partida; la ronda se lee sin beat
      pendiente.
- [x] `aria-live` anuncia activo y ronda sin depender solo del color.
- [x] Tests de N/M, cambio de activo, aviso no bloqueante, duración y ausencia al
      cargar; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/hud.test.ts`.
- Integración: dos jugadores, relevo y cambio de ronda.
- E2E: captura del HUD y del aviso; la suite completa va en TASK-0154.
- Manual: comprobar que el aviso se desvanece sin frenar la partida.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0151/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/hud.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el HUD de la fase enemiga; eso es TASK-0152.
- No cambiar la ficha del activo más allá de «Jugador N de M».
- No añadir temporizadores de turno.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Ficha compacta del objetivo enemigo.
- Resultado de partida.
- Información privada o pantallas por jugador.
- Rediseñar la columna izquierda.
