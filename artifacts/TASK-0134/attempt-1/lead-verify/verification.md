---
type: Verification
title: "TASK-0134: verificación independiente del intento 1"
description: Revisión del diff, criterios y reejecución de tests del estado de partida.
task: TASK-0134
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:19:26Z }
---

# Alcance revisado

Diff completo `main...task/TASK-0134` (40 archivos). Producción:

- `src/game/types.ts`: `GameState.players` documentada como única party
  ordenada; `activePlayerId: string | null` y `round: number`; `turn` sale del
  estado.
- `src/game/engine.ts`: el constructor único escribe `activePlayerId` y
  `round: 1`; `Restart` sigue por el constructor.
- `src/game/party.ts` (nuevo) y `src/game/index.ts`: `partyOrder`,
  `activePlayer`, `activePlayerIndex`; puras, sin setters ni transiciones.
- `src/game/turn.ts`: solo renombra `state.turn` a `state.round`; los eventos
  conservan su payload `turn`; no cambia activo, recursos ni fase.
- `src/host/debug.ts`: snapshot con `activePlayerId`, `round`, `partyOrder`;
  `turn` queda como alias `@deprecated` de `round`.
- `src/host/hud.ts`: `buildHudModel` y `actionSuggestion` usan `activePlayer`;
  `F1` emite fase, ronda, activo `(i/M)` y orden de party.
- `src/host/motion.ts`: `presentationState` devuelve `round` (el evento sigue
  aportando `turn`).

Tests: 1, 2 y 6 jugadores en orden, round-trip JSON y snapshot/F1; renombrados
mecánicos `state.turn`→`state.round` y literales `GameState` con
`activePlayerId`/`round`; textos de F1 `Turno`→`Ronda`. Sin aserciones de
comportamiento debilitadas ni eliminadas. No hay cambios en requisitos,
arnés, `package.json`, `pnpm-lock.yaml`, costes, RNG, botín, muerte, IA, mapa,
roster ni configuración.

# Criterios

1. Party ordenada, activo, ronda y fase con valores explícitos y estables:
   `players` (orden de `config.players`), `activePlayerId`, `round` y `Phase`.
2. Activo por referencia estable (`id`), sin copia de `Unit` ni lista paralela:
   `state.players` es la única lista; los helpers leen por id.
3. Snapshot y F1 exponen activo, ronda, orden y fase desde `GameState`:
   campos del snapshot y líneas `Fase/Activo/Ronda` + `Orden de party`.
4. Estado serializable y reconstruible: round-trip JSON con 1, 2 y 6 jugadores
   conserva activo, ronda y orden.
5. Party consumida de TASK-0122: el constructor único usa `config.players`; no
   hay reconstrucción ni reordenación en el host.
6. Sin transiciones nuevas: `EndTurn`/fase enemiga/relevo siguen fuera;
   `resolveEndTurn` no cambia el activo.
7. Tests de snapshot, serialización y orden con 1, 2 y 6 jugadores y
   `pnpm run verify` pasa.

# Comandos reejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/host/debug.test.ts` | 75/75, 2 archivos | `targeted-tests.txt` |
| `pnpm run verify` | 102 archivos/1537 tests; docs:check 660 documentos/160 tareas, config:check, tsc, build y bundle OK | `verify-final.txt` |

`test:e2e` no se ejecuta: la ficha lo declara no aplicable. Los E2E tocados
solo actualizan literales y textos y quedan cubiertos por `tsc`.

# Desviaciones aceptadas

- `GameSnapshot.turn` se conserva como alias obsoleto de `round` para no romper
  E2E históricos; se rellena solo desde `state.round` y está marcado
  `@deprecated`.
- Los eventos conservan `turn` como dato histórico; el estado usa `round`.
- `F1` usa índice 1-based; sin activo muestra `—` y `0/M`.
- La adopción de `activePlayer` fuera de `buildHudModel`/F1 (input, cámara,
  cursor, panel) queda en TASK-0149 a TASK-0152, que implementan el relevo.

# Fricción

El informe no registra fricción reutilizable. Sin propuestas `pending`.
