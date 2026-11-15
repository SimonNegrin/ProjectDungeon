---
type: Task Brief Detail
title: "TASK-0147: contrato técnico del intento 1"
description: Cierre de turno al morir el activo, wipe y exposición del resultado en el motor.
task: TASK-0147
attempt: 1
status: stable
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:15:00Z }
---

# Regla

La muerte del activo puede ocurrir dentro de su turno por una acción suya (hoy,
el camino real es atacar cuerpo a cuerpo, fallar y morir por la réplica del
defensor). `resolveAttack` ya resuelve ataque, réplica, `UnitDied`,
`settleUnitDeath` y, si toca, `GameEnded`. No cambies ese resolvedor.

`reduce` debe cerrar el turno **después** de que el comando termine, solo si:

1. el activo estaba vivo antes del comando;
2. el comando no es `Restart`;
3. el estado resultante sigue en `status === 'playing'`;
4. `activePlayerId` sigue siendo el mismo id;
5. la unidad de ese id ya no está viva (`!isAlive`).

Entonces llama a `resolveEndTurn` sobre el estado resultante y concatena sus
eventos después de los del comando. Si el activo era el último vivo, el estado
ya es `defeat` y `applyTerminal` ya emitió `GameEnded`: no añadas `TurnEnded` ni
`PlayerTurnStarted`. Si el comando termina en victoria, tampoco cierres turno.

Secuencia esperada al morir con otro jugable:

```text
AttackPerformed
ReplicaPerformed
UnitDied
TurnEnded
PlayerTurnStarted      // siguiente jugable; o EnemyPhaseStarted… si era el último del orden
```

La acción queda resuelta antes de `TurnEnded`; no hay `GameEnded` si sigue
jugando. `resolveEndTurn` conserva el avance de índice, la restauración del
siguiente turno, la fase enemiga y la ronda ya implementados en TASK-0146.

# Implementación sugerida

En `src/game/turn.ts`, añade un helper puro y exportado, por ejemplo:

```ts
export function closeTurnAfterActiveDeath(
  state: GameState,
  previousActiveId: string,
): TurnResult | undefined
```

Debe devolver `undefined` si `status !== 'playing'`, si el activo cambió o si la
unidad ya no existe o sigue viva; si procede, devuelve `resolveEndTurn(state)`.
Así el cierre es reutilizable para futuros efectos propios y testeable sin
inventar mecánicas. En `engine.ts`, captura el activo antes del comando y aplica
el helper al resultado, concatenando eventos y propagando `enemyPhase` si lo hay.
No dupliques el `TurnEnded` de `EndTurn`: el helper no debe cerrar dos veces un
turno ya cerrado.

# Resultado del motor

No crees pantalla ni presentación. El resultado ya se expone en el estado:
`status` (`'victory' | 'defeat'`) y `round` (ronda alcanzada). Añade tests que
lo comprueben tras un wipe, incluida una derrota con fantasmas presentes. No
cambies `save.ts` salvo que sea imprescindible; `status` y `round` ya se guardan.

# Casos de prueba obligatorios

- **Muerte por enemigo/réplica con dos jugadores:** activo con 1 PV ataca y falla;
  la réplica lo mata. La acción (ataque, réplica, muerte) se resuelve; después
  `TurnEnded` y `PlayerTurnStarted` al siguiente jugable. Estado `playing`, activo
  siguiente, muerto convertido en fantasma y cadáver creado. Un comando posterior
  del muerto se rechaza (`not-active` si hay otro activo; `game-over` si no).
- **Muerte por efecto propio:** si no existe otro comando de daño propio, cubre
  el helper `closeTurnAfterActiveDeath` con un estado sintético de activo a 0 PV y
  otro vivo, y documenta que la réplica es el único camino real actual. No añadas
  hechizos ni mecánicas.
- **Último vivo:** activo muere por réplica y solo quedan fantasmas. `status:
  'defeat'`, `GameEnded { status: 'defeat' }`, sin `PlayerTurnStarted`; la ronda
  no avanza. Los fantasmas y objetos de resurrección no evitan la derrota.
- **Vivo con fantasmas:** activo muere, hay al menos un vivo y algún fantasma; la
  partida sigue y el control pasa al siguiente jugable (vivo o fantasma). No hay
  turno muerto.
- **Muerte durante la fase enemiga:** confirma que un último vivo que muere por
  enemigo deja derrota y no emite `PlayerTurnStarted`; con otro vivo, la ronda
  avanza y el activo se recoloca (comportamiento de TASK-0146).
- **Resultado:** `state.status` y `state.round` tras la derrota; victoria no se
  toca.

Actualiza solo los tests existentes que cambien de secuencia por la nueva regla,
preservando su intención. No borres aserciones ni relajes expectativas.

# Límites

- No implementes resurrección ni su índice (TASK-0148), resultado visual
  (TASK-0153), cámara, HUD, avisos, input ni guardado nuevo.
- No cambies IA, combate, réplica, daño, costes, RNG, botín, mapa, roster ni
  bestiario; no toques `docs/`, `.opencode/`, `AGENTS.md` ni dependencias.
- `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts`
  (120 s) y `pnpm run verify` (240 s). Ejecuta además `replica.test.ts` si tocas
  el cierre del ataque. Adjunta salidas y commit SHA.
