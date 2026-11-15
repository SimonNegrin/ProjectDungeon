---
type: Task Verification
title: "TASK-0147: verificación independiente del intento 1"
description: Re-ejecución, revisión del diff y comprobación de la muerte en turno y el wipe.
task: TASK-0147
attempt: 1
status: stable
verified_by: task-lead
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:20:00Z }
---

# Diff revisado

- `src/game/turn.ts`: `closeTurnAfterActiveDeath` puro; solo delega en
  `resolveEndTurn` si la partida sigue, el activo no cambió y ya no está vivo.
- `src/game/engine.ts`: `reduce` captura si el activo estaba vivo antes, aplica
  el comando completo y concatena el cierre. `EndTurn` no se duplica; se propaga
  `enemyPhase`.
- Tests: réplica mortal con dos jugadores, helper de efecto propio con estado
  sintético, último vivo con fantasmas, vivo con fantasmas, muerte en fase
  enemiga (wipe y con otro vivo), derrota con ronda y rechazo posterior.
- Sin cambios en `src/host/**`, `docs/requirements/**`, `docs/harness/**`,
  `AGENTS.md`, `.opencode/**`, dependencias, IA, combate, réplica, daño, costes,
  RNG, botín, mapa, roster ni bestiario.

# Comandos re-ejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts tests/unit/game/replica.test.ts` | 3 archivos, 97 tests OK |
| `pnpm run verify` | 107 archivos, 1695 tests; docs 707, config, tsc, build y bundle OK |
| `pnpm run test:e2e action-counter-turn-qa combat-equipment-qa enemy-phase-offscreen-qa pause-save-load-qa game-input-hud` | 18 tests OK |
| `pnpm run test:e2e feedback-combat-qa feedback-turns-marks-qa motion-qa` | 20 tests OK |

La suite E2E completa no se ejecutó entera por el timeout de 180 s y porque la
ficha declara E2E/visual no aplicable. Las specs sensibles a turnos, réplica,
muerte, feedback, guardado y movimiento pasan por separado.

# Criterios

1. La acción se resuelve antes de cerrar: la réplica mortal emite ataque,
   réplica y muerte, después `TurnEnded` y el siguiente turno. OK.
2. Sin turno muerto: el activo cambia; el muerto recibe `not-active` o
   `game-over` tras el wipe. OK.
3. Wipe: derrota con fantasmas presentes y sin `TurnEnded`/`PlayerTurnStarted`;
   la ronda se conserva. OK.
4. Con un vivo y fantasmas la partida sigue; el control pasa al siguiente
   jugable (fantasma incluido) y luego al vivo. OK.
5. `state.status` y `state.round` exponen Victoria/Derrota y ronda sin
   presentación. OK.
6. Tests de réplica, efecto propio, último vivo, vivo con fantasmas, fase
   enemiga, resultado y `pnpm run verify`. OK.

# Riesgos abiertos (no bloquean)

- No existe aún mecánica de resurrección ni objetos (TASK-0148); la derrota con
  fantasmas se cubre con fantasmas, sin probar objetos inexistentes.
- El «efecto propio» real disponible hoy es la réplica; el helper se prueba con
  un estado sintético para futuros efectos, sin añadir mecánicas.
- Host, input y resultado visual siguen en TASK-0149/0152/0153; ADR-029 queda en
  TASK-0155.
