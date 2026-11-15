---
type: Task Brief
title: "TASK-0134: contrato técnico del intento 1"
description: Campos, helpers, snapshot, F1 y tests del estado de partida.
task: TASK-0134
attempt: 1
status: stable
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:20:00Z }
---

# Contrato de modelo

`GameState` (en `src/game/types.ts`) queda así en lo que toca a esta tarea:

- `players: readonly Unit[]`: única lista, **party en orden de turno 1..N**. No
  se añade ninguna lista de ids ni copia de la unidad activa.
- `activePlayerId: string | null`: id de la unidad activa. El constructor único
  escribe siempre `players[0].id`; `null` solo existe en estados manuales sin
  jugadores.
- `round: number`: índice de ronda 1-based. Sustituye exactamente al antiguo
  `turn` de `GameState`; no conviven los dos campos en el estado.
- `phase: Phase`: se conserva `'player' | 'enemy'`, valores estables.
- El orden de `players` viene de `config.players` (TASK-0122), sin reordenar ni
  reconstruir la party en el host.

`createInitialState` (`src/game/engine.ts`) escribe `activePlayerId` y
`round: 1`. `Restart` sigue construyendo por el constructor único. `resolveEndTurn`
(`src/game/turn.ts`) solo renombra `state.turn` a `state.round`; **no** cambia el
activo, no avanza índice por jugador, no cambia recursos ni fase. Los eventos
`TurnEnded`, `EnemyPhaseStarted` y `PlayerTurnStarted` conservan su payload
`turn` (es histórico y no es el estado).

# Helpers de lectura

Nuevo `src/game/party.ts`, exportado desde `src/game/index.ts`; puro, sin DOM:

- `partyOrder(state): readonly string[]` → ids de `state.players` en orden.
- `activePlayer(state): Unit | undefined` → unidad cuyo id es `activePlayerId`.
- `activePlayerIndex(state): number` → índice 0-based, o `-1` sin activo.

No añadir setters ni transiciones. `activePlayerIndex` sirve a TASK-0148 para el
índice de ronda, pero esta tarea no lo consume.

# Snapshot de debug

`GameSnapshot` (`src/host/debug.ts`) añade:

- `activePlayerId: string | null`
- `round: number`
- `partyOrder: readonly string[]`
- `phase` se conserva.

Se mantiene `turn: number` como **alias obsoleto** de `round` (`@deprecated` en
el tipo) para que los E2E históricos que leen `snapshot.turn` sigan compilando y
pasando; se rellena desde `state.round`, jamás desde otra fuente. No añadir
`turn` al `GameState`. El snapshot sigue siendo una copia independiente.

# F1 y HUD

En `src/host/hud.ts`:

- `buildHudModel` resuelve al jugador con `activePlayer(state)` en lugar de
  `state.players[0]`.
- `buildDebugModel` usa `activePlayer`, `activePlayerIndex` y `partyOrder` y
  emite:
  - `Fase: <Jugador|Enemigo> · Ronda <n> · Activo <id> (<i>/<M>) · Estado: <...>`
  - `Orden de party: <id1>, <id2>, ...`
- El resto de líneas de F1 no cambia. Las etiquetas de eventos siguen usando
  `event.turn`.

No cambiar cámara, input, cursor, panel de inventario, menú de hechizos ni
`main.ts`: sus relevos/lecturas son TASK-0149 a TASK-0152. Solo se adopta el
helper en el modelo del HUD.

# Tests

- `tests/unit/game/helpers.ts`: `StateOptions.round?` y `activePlayerId?`;
  `makeState` por defecto `round: 1` y `activePlayerId: players[0]?.id ?? null`.
- `tests/unit/game/engine.test.ts`:
  - 1, 2 y 6 jugadores: `activePlayerId` es `player-1`, `round` es 1 y
    `partyOrder` coincide con el orden de `config.players`.
  - Round-trip JSON del estado completo conserva activo, ronda y orden.
  - `activePlayer`/`activePlayerIndex`/`partyOrder` devuelven lo esperado y no
    mutan el estado.
  - `Restart` vuelve a `player-1` y ronda 1.
- `tests/unit/host/debug.test.ts`:
  - snapshot con 2 y 6 jugadores expone `activePlayerId`, `round`,
    `partyOrder` y `phase`; `partyOrder` = ids de `players`; `turn` = `round`.
  - `buildDebugModel` contiene activo, ronda, orden y fase, con `i/M`.
  - JSON del snapshot conserva los campos (sin funciones ni referencias).
- Actualizar literales de `GameState` y aserciones afectadas:
  `state.turn` → `state.round`; `makeState({ turn })` → `{ round }`;
  `presentationState(...).turn` → `.round`; en estados manuales sin jugadores,
  `activePlayerId: null`. Los E2E que leen `snapshot.turn` pueden quedarse.
- Actualizar en E2E solo el texto de F1 `Fase: ... · Turno N` → `... · Ronda N`
  (buscar `Turno` en `tests/e2e`); no cambiar aserciones de comportamiento.

# Límites

- No implementar transiciones de turno, índice por jugador, fase enemiga nueva,
  relevo, recursos por turno ni resurrección.
- No tocar `docs/` ni el arnés; el lead cierra documentación.
- No cambiar `GameConfig`, validación, roster, spawn, costes, RNG, botín,
  muerte, contenedores ni IA.
- Si el contrato choca con REQ-031 o REQ-034, devolver `blocked` con evidencia.
