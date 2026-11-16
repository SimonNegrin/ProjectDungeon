---
type: Task Verification
title: "TASK-0148: verificación independiente del intento 1"
description: Re-ejecución, revisión del diff y comprobación de la resurrección por cadáver, índice y recursos.
task: TASK-0148
attempt: 1
status: stable
verified_by: task-lead
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:10:00Z }
---

# Diff revisado

- `src/game/types.ts`: `CastSpell.targetId?` opcional; compatible con las
  llamadas por casilla.
- `src/game/magic.ts`: resolución del cadáver por id o por casilla; la posición
  sale de `Container.corpseOf`, no de la unidad fantasma; adyacencia y LOS se
  miden contra esa posición; `revivePlayer` quita `ghost`, fija PV y deja el
  contador de acciones inherente para que el turno lo restaure.
- `src/game/engine.ts`: propaga `targetId` al resolvedor.
- Tests: 7 en `magic`, 3 en `engine`, 2 en `turn`; sin líneas de test borradas
  ni debilitadas.
- Sin cambios en `src/host/**`, `docs/requirements/**`, `docs/harness/**`,
  `AGENTS.md`, `.opencode/**`, dependencias, IA, combate, botín, mapa ni RNG.

# Comandos re-ejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/game/magic.test.ts tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts` | 3 archivos, 130 tests OK |
| `pnpm run verify` | 109 archivos, 1746 tests; docs 738, config, tsc, build y bundle OK |
| `pnpm run test:e2e --workers=1` | 273 tests OK, 4.1 min, un worker |

La suite E2E completa se ejecutó en serie por el riesgo de puerto 4173 y
paralelismo; terminó sin fallos y sin procesos colgados.

# Criterios

1. Comando a cadáver concreto, lanzador vivo, nivel 4 y 8 de maná. OK:
   `targetId` elige la unidad; sin él se conserva la resolución por casilla.
2. Adyacencia a la casilla del cadáver y casilla sin vivos; el fantasma no
   ocupa. OK: `isOccupied` solo cuenta vivos y la distancia usa el contenedor.
3. Consumo de 8 de maná, casilla del cadáver y 60 % del PV máximo hacia arriba
   con mínimo 1. OK: `revivePlayer` y `targetHp`; tabla de R-013 probada.
4. Varios cadáveres en la misma casilla: resucita el elegido y el resto queda
   intacto. OK: test con `targetId` y dos cadáveres.
5. Misma ronda si el índice no pasó; siguiente si ya pasó; sin doble turno. OK:
   tests de `engine` y `turn`; `resolveEndTurn` conserva el orden.
6. Recursos al empezar su turno. OK: MP, maná, acciones y cupo se comprueban
   tras `EndTurn`, no en el instante de resucitar.
7. Intento inválido sin cambios ni consumo. OK: tests de nivel, maná, objetivo,
   ocupación y `targetId` inválido.
8. Tests y `pnpm run verify`. OK.

# Riesgo abierto que impide cerrar

- El `Container` del cadáver se conserva tras resucitar (decisión del brief para
  no inventar transferencia de objetos). Si el resucitado muere otra vez,
  `settlePlayerDeath` ve el cadáver viejo, no crea uno nuevo y descarta el equipo
  nuevo en lugar de pasarlo a un contenedor.
- No es un criterio de esta ficha, pero afecta al ciclo de vida de la
  resurrección y puede perder objetos. Requiere decisión de `requirements-writer`
  y usuario: ¿el cadáver desaparece al resucitar, se conserva como contenedor,
  se sueltan sus objetos o los recupera el resucitado? Sin esa regla no se debe
  fusionar el intento.
- Recomendación: bloquear TASK-0148 y abrir la decisión en REQ-021/REQ-018; el
  código verificado queda en `task/TASK-0148` para retomarlo sin repetir la
  implementación.
