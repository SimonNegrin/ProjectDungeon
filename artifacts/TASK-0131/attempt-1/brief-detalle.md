---
type: Task Brief Detail
title: "TASK-0131: contrato técnico del intento 1"
description: Modelo de cadáver, transferencia total y puntos de muerte.
task: TASK-0131
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:00:00Z }
---

# Decisiones cerradas (no reabrir)

1. **Estado muerto.** No añadir `lifeState` ni cambiar `isAlive`: la unidad
   muerta sigue siendo `hp === 0` y permanece en `players` con su `id`, nombre,
   arquetipo, variante, posición y stats. Se vacían `equipment` y la mochila.
   La mochila conserva `capacity` con huecos `null`. TASK-0132 añadirá el estado
   fantasma sin rehacer esto.
2. **Ampliación aditiva de `Container`** (`inventory.ts`): campos opcionales
   `kind?: 'chest' | 'corpse'` y `corpseOf?: string` (id de la unidad). Los
   cofres y fixtures sin `kind` siguen válidos. Documentar en el tipo el riesgo
   de que REQ-020 revise el modelo antes de publicar la v1 de guardado; no crear
   una segunda estructura de contenedores.
3. **Módulo nuevo `src/game/death.ts`**, puro y exportado en `index.ts`:
   `settleUnitDeath(state, unitId): GameState`. Idempotente. Si recibe un
   enemigo, devuelve el estado sin cambios (TASK-0133 lo ampliará). Para un
   jugador muerto o que acaba de morir:
   - id estable `corpse-<unitId>`; no duplicar si ya existe un contenedor con
     `corpseOf === unitId`;
   - contenedor en `unit.x, unit.y`, `kind: 'corpse'`, `corpseOf: unit.id`;
   - `items` compactos: primero los huecos de `EQUIPMENT_SLOTS` (solo no nulos) y
     después los huecos de mochila en orden; sin `null` intermedios; `capacity`
     igual al número de instancias transferidas;
   - unidad con `hp: 0`, `equipment` todo `null` e inventario sin instancias;
   - `containers` se añade al final del array existente; sin duplicar instancias
     (la contención es la única verdad).
4. **Puntos de muerte.** Llamar a `settleUnitDeath` justo cuando se fija el
   `UnitDied`:
   - `combat.ts`: muerte del objetivo del ataque y muerte del atacante por
     réplica (ambas ramas);
   - `magic.ts`: muerte del objetivo de daño mágico (hoy solo enemigos, pero la
     ruta debe quedar cubierta).
   No añadir eventos ni cambiar el orden `Acción → UnitDied → GameEnded`.
5. **Sin bloqueo.** No tocar `grid.ts` ni la ocupación: `isOccupied` ya ignora
   `hp === 0` y los `Container` no bloquean. Añadir test de movimiento sobre la
   casilla del cadáver y de casilla compartida con vivo, enemigo u otro cadáver.
6. **Persistencia.** El contenedor de jugador no se elimina al quedarse sin
   objetos. Se puede vaciar con `equipItem` desde `kind: 'container'` (ruta ya
   existente); el contenedor debe seguir en `state.containers`. No implementar
   retirada de cadáveres ni saqueo.
7. **Snapshot.** `debug.ts` ya clona `containers` y unidades; no duplicar el
   modelo. Añadir solo el test que compruebe que `kind`, `corpseOf`, la unidad
   muerta y sus objetos viajan en el snapshot y sobreviven a JSON.
8. **Tests.** En `inventory.test.ts`/`engine.test.ts` (o `death.test.ts` si
   aparece): transferencia completa con equipo y mochila llenos sin pérdida;
   identidad y `hp: 0`; casilla compartida y movimiento; persistencia al vaciar;
   serialización; RNG intacto. En `combat.test.ts`/`integration.test.ts`, cubrir
   la muerte real por ataque sin romper las aserciones actuales de eventos.
9. **Fuera.** No tocar `docs/`, `src/host` salvo lo imprescindible, `package.json`
   ni `pnpm-lock.yaml`. No cambiar botín, cofres, resurrección ni fantasma.
