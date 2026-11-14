---
type: Task Brief Detail
title: "TASK-0122: detalle del brief del intento 1"
description: Contrato técnico propuesto para la configuración y el constructor único.
task: TASK-0122
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:50:00Z }
---

# Contrato

1. `src/game/config.ts`, exportado por `src/game/index.ts`:
   - `PlayerVariant = 1 | 2`.
   - `PlayerConfig { archetypeId: ArchetypeId; variant: PlayerVariant; name: string }`.
   - `GameConfig { seed: number; players: readonly PlayerConfig[] }`.
   - `GameConfigError` (clase) con `code`:
     `'player-count' | 'unknown-archetype' | 'invalid-variant' | 'invalid-seed'`.
2. `Unit` añade `variant: PlayerVariant | null`; `null` en enemigos y unidades
   sintéticas. `createPlayerFromArchetype` acepta `variant?: PlayerVariant`
   (por defecto 1). El snapshot la hereda de `Unit`.
3. `GameState` añade `config?: GameConfig`, opcional para estados manuales y
   fixtures; el estado creado por el constructor siempre lo lleva. El snapshot
   expone `config: GameConfig | null` clonado.
4. `CreateInitialStateConfig` añade `players?: readonly PlayerConfig[]`. Sin
   `players`, el defecto es un único Guerrero, variante 1, nombre vacío. Mantener
   el overload `createInitialState(generator, options)` y `seed`/`options`.
5. Construcción: validar N, arquetipo (propio de `ROSTER`), variante y semilla
   (`Number.isInteger` y finito) antes de generar; normalizar con
   `normalizeSeed`; crear `player-1..N` en el orden de la lista usando
   `spawns.party[i] ?? spawns.party[0] ?? spawns.player`; nombre vacío toma el
   del arquetipo, el resto se guarda tal cual. `state.config` guarda la semilla
   normalizada y los jugadores en orden.
6. `reduce` con `Restart`: reconstruir desde `state.config` cuando exista
   (conserva party y semilla); sin config, comportamiento por defecto actual.
7. `GameSession`: guarda seed y players de la configuración; `regenerate`
   conserva la party; `load` toma `state.config` si existe. `main.ts` arranca con
   la config construida desde `?seed=` y el Guerrero por defecto; no construye
   jugadores por su cuenta.
8. Tests: en `engine.test.ts`, N=1 y N=6, orden/variante/nombre, nombre vacío,
   semilla normalizada, serialización JSON de estado/config y errores tipados
   (N=0/7, arquetipo desconocido, variante 0/3, semilla no finita). En
   `integration.test.ts` o `session.test.ts`, el arranque del host usa el
   constructor único y dos llamadas equivalentes dan estados idénticos; `Restart`
   conserva la party. Adaptar `makeUnit`/`makeState` con valores por defecto sin
   debilitar aserciones existentes.

# Notas

- No implementar render de variante ni HUD: solo el dato en el estado.
- No tocar `Container`, el catálogo de equipo ni el balance.
- Si el generador no ofrece 6 huecos (`spawns.party` incompleto), usar el hueco 0
  como respaldo documentado; no inventar posiciones sobre muros.
