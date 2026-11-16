---
type: Task
id: TASK-0168
title: "Motor: cofres por sala y botín progresivo determinista"
description: "Generar cofres en las salas no-spawn con tiradas 50/20, contenido de dos objetos orientado a mejorar el equipo del grupo y una pieza de traits garantizada por nivel."
status: stable
task_status: done
task_type: feature
requirement: REQ-020
requirement_ids: [R-001, R-002, R-004, R-005, R-007, R-008, T-001, T-004]
depends_on: [TASK-0167]
unlocks: [TASK-0169]
created_at: 2026-11-16T16:20:04Z
completed_at: 2026-11-16T17:10:21Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0168/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
  - by: game-lead
    at: 2026-11-16T17:10:21Z
    note: >-
      Intento 1 verificado tras una revisión con dos correcciones (snapshot con
      `opened` y bloqueo de enemigos BSP; `edf51595`). Siete criterios firmados;
      la pieza de traits sustituye el relleno del cofre que la porta, decisión
      reversible a validar en playtest. `verify` completo y `verify:task` en
      verde. Detalle en `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que una partida nueva tenga cofres deterministas en las salas no-spawn y que su
contenido suba la potencia del grupo según [REQ-020](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos)
[R-001, R-002, R-004, R-005, R-007 y R-008](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos).

# Contexto

El generador de producción es `growth` con salas irregulares
([REQ-011](../requirements/REQ-011-generador-densa-salas-irregulares.md)) y el
spawn ya elige la sala más protegida ([REQ-012](../requirements/REQ-012-spawn-sala-protegida.md)).
`Container` existe con `kind: 'chest'` pero ningún cofre se crea. La fórmula y el
umbral por hueco están en [ADR-033](../decisions/ADR-033-cofres-poder-botin-progresivo.md)
y la puntuación en TASK-0167.

# Criterios de aceptación

- [x] Cada sala no-spawn tira 50 % de cofre y, si acierta, 20 % de un segundo en
      la misma sala; nunca en el acceso de spawn, la salida, un muro ni una casilla
      ocupada; dos cofres no comparten tile.
- [x] Si el nivel no genera ningún cofre, se fuerza uno por semilla en una sala
      no-spawn; un nivel sin botín no existe.
- [x] La generación usa un RNG derivado propio: la misma semilla con el mismo
      grupo da los mismos cofres, posiciones y contenido, y el combate con esa
      semilla no cambia.
- [x] Cada cofre tiene capacidad 4 y dos objetos: uno es mejora real por hueco
      contra el mejor equipo del grupo (la más cercana al umbral) y el otro es
      relleno común. Sin mejora disponible en el catálogo, el primero cae al
      relleno.
- [x] Una pieza de traits por nivel, fuera de la curva, configurable y repartida
      entre los cofres generados; las cuatro piezas son alcanzables.
- [x] El snapshot expone cofres, posición, capacidad, estado y contenido; la
      profundidad se acepta como parámetro y hoy vale 1 sin efecto.
- [x] Tests de determinismo, 50/20, forzado, colocación válida, umbral por hueco,
      relleno y pieza garantizada; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/loot.test.ts` y un `dungeon-chests.test.ts` nuevo
  con semillas fijas y un grupo canónico.
- Integración: partida con `growth` y 1-6 jugadores; ningún cofre pisa spawn,
  salida, muro u ocupante.
- E2E / visual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0168/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Sin apertura, depósito ni guardado: TASK-0169.
- Sin UI, HUD ni feedback: TASK-0170.
- No reutilizar el RNG principal; no tocar spawn, enemigos ni botín de cadáveres.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Llaves, trampas, cofres cerrados y encadenado de mazmorras.
- Ampliación del catálogo y ajuste fino de poderes.
- Depósito y transferencia.
