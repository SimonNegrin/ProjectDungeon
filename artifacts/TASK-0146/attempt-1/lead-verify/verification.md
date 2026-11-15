---
type: Task Verification
title: "TASK-0146: verificación independiente del intento 1"
description: Re-ejecución, revisión del diff y comprobación de criterios del turno por jugador.
task: TASK-0146
attempt: 1
status: stable
verified_by: task-lead
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:06:18Z }
---

# Diff revisado

- `src/game/{turn,engine,types,ai}.ts`: validación del activo en todos los
  comandos, `EndTurn` con `unitId` opcional, avance al siguiente jugable,
  restauración solo del activo, una fase enemiga por ronda y `enemyPhase`.
- Tests: 71 nuevos/actualizados en `turn.test.ts` y `engine.test.ts`; fixtures
  multi-jugador de `ai`, `combat`, `death`, `ghost` y `magic` declaran el activo
  o ceden turno. No se borraron aserciones ni se relajaron expectativas.
- Sin cambios en `src/host/**`, `docs/requirements/**`, `docs/harness/**`,
  `AGENTS.md`, `.opencode/**`, dependencias, IA, combate, costes, RNG, botín,
  mapa ni bestiario.
- `restorePlayerTurn` conserva firma pública y restaura solo al activo; los
  enemigos siguen restaurándose al empezar su fase.

# Comandos re-ejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/game/turn.test.ts tests/unit/game/engine.test.ts` | 2 archivos, 71 tests OK |
| `pnpm run verify` | 107 archivos, 1688 tests; docs 703, config 4 agentes/3 skills, build y bundle OK |
| `pnpm run test:e2e game-input-hud.spec.ts` | 1 test OK (el fallo visto en la suite completa era flake por carga) |
| `pnpm run test:e2e action-counter-turn-qa combat-equipment-qa cursor-qa pause-save-load-qa load-game hud-three-zones-qa` | 36 tests OK |

# E2E completa

`pnpm run test:e2e` se cortó por el timeout de 180 s del arnés tras ~157 tests;
no se repitió con el mismo comando. El único fallo observado en paralelo,
`game-input-hud.spec.ts`, pasa aislado. La tarea declara E2E no aplicable por ser
motor sin DOM; las specs sensibles a turnos, combate, guardado, carga, HUD de
fantasma y cursor pasan.

# Criterios

1. `EndTurn` valida el activo, cierra turno y avanza; tras el último entra en
   fase enemiga. OK (tests de 2/6 jugadores e inválidos).
2. Recursos restaurados al empezar cada turno, no todos al inicio de fase. OK.
3. Sin auto-fin por recursos ni temporizador. OK.
4. Comandos de unidad no activa rechazados con `not-active` sin cambios. OK para
   todos los comandos de jugador.
5. `enemyPhase` expone `enemyId`, `targetId` y `wait|act` en orden de índice,
   una vez por ronda. OK.
6. Vuelta al primer jugable y `round + 1`. OK.
7. Fantasma con índice, recursos y `EndTurn`. OK.
8. Tests de 2/6, activo inválido, transición, recursos, orden enemigo y cierre;
   `pnpm run verify` OK. OK.

# Riesgos abiertos (no bloquean)

- `src/host/input.ts` sigue eligiendo al primer vivo, no al activo: lo corrige
  TASK-0149. `GameSession.dispatch` aún no propaga `enemyPhase`: lo consume
  TASK-0152.
- ADR-029, glosario y diseño de hotseat quedan en TASK-0155.
- La suite E2E completa excede 180 s; no se repitió sin hipótesis nueva.
