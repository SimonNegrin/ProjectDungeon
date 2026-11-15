---
type: Task Brief Detail
title: "TASK-0146: contrato técnico del intento 1"
description: Turno por jugador, validación del activo, recursos, fase enemiga y ronda.
task: TASK-0146
attempt: 1
status: stable
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:10:00Z }
---

# Contrato de turno

`src/game/turn.ts` y `src/game/engine.ts` implementan un único flujo:

1. `EndTurn` opera sobre `state.activePlayerId`. Si el comando trae `unitId`
   (campo opcional nuevo en el tipo `EndTurn`), debe coincidir con el activo;
   si no, se rechaza con `not-active` y estado intacto. Sin activo válido
   (`activePlayerId` nulo o inexistente en `players`) se rechaza con
   `invalid-active`.
2. Si el activo es un muerto sin fantasma, se rechaza `dead-unit`. Un fantasma
   (`isGhost`) sí puede cerrar turno.
3. Se busca el siguiente jugador jugable con índice mayor: vivo o fantasma. Si
   existe, el estado queda en fase `player`, `activePlayerId` pasa a ese jugador,
   la ronda no cambia y **solo ese jugador** recibe `restoreTurnResources`.
   Eventos: `TurnEnded { turn: round }` y `PlayerTurnStarted { turn: round }`.
   No se ejecuta fase enemiga.
4. Si no hay siguiente jugador, se entra en fase enemiga una sola vez por ronda:
   `TurnEnded`, `EnemyPhaseStarted`, fase enemiga completa en orden de índice,
   `applyTerminal` tras cada enemigo. Si la partida sigue: `round + 1`, activo =
   primer jugador jugable desde el índice 0, se restauran **solo sus** recursos y
   se emite `PlayerTurnStarted { turn: round + 1 }`. Si termina, no se restaura
   ni se emite `PlayerTurnStarted`.
5. No hay fin de turno automático por recursos agotados ni temporizadores.

`restorePlayerTurn` deja de restaurar a toda la party: restaura únicamente al
activo. Mantén la firma pública con un parámetro opcional de id (por compatibilidad
con los tests de `mana.test.ts` y `ghost.test.ts`). Los muertos sin fantasma no se
restauran. Los enemigos siguen restaurándose todos al empezar su fase.

# Validación del activo en comandos

Añade a `RejectionReason` `'not-active'` e `'invalid-active'`. En `reduce`, todo
comando que ya exige fase `player` y lleva `unitId` de jugador valida, después de
la fase y de resolver la unidad, que `unitId === state.activePlayerId`; si no,
devuelve `CommandRejected` con `not-active` y el estado original. Cubre `Move`,
`MoveTo`, `Attack`, `CastSpell`, `PickUp`, `TakeItem`, `TakeAll`, `EquipItem`,
`UnequipItem`, `DropItem`, `SelectWeapon` e `InspectContainer`. No cambies el
orden de los rechazos existentes más de lo necesario: `unknown-unit`, `dead-unit`,
`not-ghost`, etc. siguen teniendo sentido cuando la unidad es la activa.

No valides comandos de enemigos por esta vía: `resolveAttack` y la IA no cambian.

# Fase enemiga expuesta (T-004)

En `src/game/types.ts`:

```ts
export interface EnemyPhaseEntry {
  readonly enemyId: string;
  readonly targetId: string | null;
  readonly action: 'wait' | 'act';
}
```

`TurnResult` y `ReduceResult` añaden `readonly enemyPhase?: readonly
EnemyPhaseEntry[]`. `resolveEndTurn` lo rellena para todos los enemigos vivos, en
el orden de `state.enemies` (índice), también si ninguno actúa (lista de `wait`):

- `action: 'act'` si el enemigo produjo al menos un `UnitMoved` o un
  `AttackPerformed` propios en su turno; si solo produjo `EnemyWaited` o la
  partida terminó antes, `'wait'`.
- `targetId` es el jugador al que ataca o persigue: `plan.targetId` en ataque;
  `plan.attackTargetId` si el plan mueve y ataca; para un plan de alerta que solo
  persigue, el jugador vivo más cercano (puedes exportar `chooseNearestPlayer`
  desde `ai.ts`, sin cambiar la forma de `EnemyPlan` ni la IA); `null` si espera,
  vuelve a casa o huye sin objetivo. No inventes objetivo para un `wait`.
- Determinista y sin leer DOM. No añadas eventos nuevos ni cambies el payload de
  los existentes: hay tests y E2E que comparan eventos exactos.

No toques `src/host/**`. TASK-0152 propagará `enemyPhase` desde `reduce`/sesión y
lo usará para «El master mueve», saltar esperas y HUD. No añadas `enemyPhase` al
estado persistido ni al guardado.

# Comportamiento esperado por escenario

- 2 jugadores: `EndTurn` de `player-1` deja `phase: 'player'`, `round: 1`,
  activo `player-2`, sin `EnemyPhaseStarted`. El segundo `EndTurn` entra en fase
  enemiga y, si la partida sigue, `round: 2` y activo `player-1`.
- 6 jugadores: seis `EndTurn` producen exactamente una `EnemyPhaseStarted` y la
  vuelta a `player-1` con `round: 2`.
- Recursos: cada jugador empieza su turno con MP, acciones, maná y `spellsCast`
  restaurados. Los demás conservan lo gastado hasta su turno. Al empezar la ronda
  solo se restaura el primer jugable.
- Fantasma: conserva su índice, recibe sus recursos al empezar su turno (una
  acción) y puede cerrar turno con `EndTurn`. No se salta por estar muerto.
- Activo inválido: `activePlayerId` nulo o inexistente rechaza `EndTurn` con
  `invalid-active`; un `EndTurn` con `unitId` de otro jugador rechaza
  `not-active`; ambos sin cambios de estado.
- Comandos de unidad no activa: rechazo `not-active`, sin cambios.

# Tests

Amplía `tests/unit/game/turn.test.ts` y `engine.test.ts` con los escenarios de la
ficha: 2 y 6 jugadores, activo inválido, transición a enemiga, recursos por
turno, una sola fase por ronda, orden/target/espera de `enemyPhase`, cierre de
ronda y fantasma. Actualiza fixtures existentes con varios jugadores que ahora
deban declarar `activePlayerId` o pasar por dos `EndTurn` (por ejemplo
`ghost.test.ts` y `combat.test.ts`): conserva la intención del test, no borres
aserciones ni relajes expectativas.

# Límites

- No implementes muerte en turno (TASK-0147), resurrección (TASK-0148), cámara,
  HUD, input, avisos, resultado ni guardado nuevo.
- No cambies IA, combate, daño, costes, RNG, botín, mapa, roster ni bestiario.
- No edites `docs/`, `.opencode/`, `AGENTS.md` ni dependencias.
- `pnpm exec vitest run tests/unit/game/turn.test.ts tests/unit/game/engine.test.ts`
  (120 s) y `pnpm run verify` (240 s). Adjunta salidas y commit SHA.
