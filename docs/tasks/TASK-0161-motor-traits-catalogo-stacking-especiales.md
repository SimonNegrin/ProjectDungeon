---
type: Task
id: TASK-0161
title: "Motor: catálogo de traits, stacking y especiales"
description: "Añadir traits como dato sobre el equipo: modificadores de los nueve atributos, stacking con suelos y topes, ataque circular y robo de vida, con eventos y snapshot."
status: draft
task_status: in_progress
task_type: feature
requirement: REQ-019
requirement_ids: [R-001, R-002, R-003, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-015, T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-014]
depends_on: []
unlocks: [TASK-0162]
created_at: 2026-11-16T00:55:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0161/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:55:00Z }
verified:
---

# Objetivo

Que un objeto equipado aporte traits de dato —modificadores, ataque circular y
robo de vida— con stacking determinista, agregación única de stats, eventos y
snapshot reproducible, sin DOM.

# Contexto

[REQ-019](../requirements/REQ-019-traits-objetos.md) v3 define el corte en
[R-001 a R-015](../requirements/REQ-019-traits-objetos.md#requisitos-creativos-decididos)
y [T-001 a T-014](../requirements/REQ-019-traits-objetos.md#requisitos-técnicos).
Catálogo y modelo viven en `src/game/equipment.ts`, la agregación en `stats.ts`
y el combate en `combat.ts` y `damage.ts`. Hoy `ItemTrait` solo tiene `id` y
`description`, y el validador exige traits vacíos.

# Criterios de aceptación

- [ ] El catálogo de traits es dato: ID estable, nombre, descripción, tipo,
      parámetros, stacking y fuente; el motor no define traits y el catálogo
      cambia el juego sin tocar código.
- [ ] Los modificadores cubren los nueve atributos, incluidos resistencia, magia,
      PV máx, MP máx y acciones; un único punto agrega inherente → equipo por
      hueco → traits y lo consumen combate, movimiento y presentación.
- [ ] Los numéricos suman por atributo; los especiales son únicos y cuenta el
      mayor; orden estable; PV máx ≥ 1, acciones ≥ 1, MP ≥ 0 y tope 4; ningún
      recorte depende del orden de iteración.
- [ ] El área es dato: radio 1, `incluyeCentro: false` y coste como parámetro;
      cambiarlo cambia el comportamiento sin tocar el motor.
- [ ] El ataque circular golpea las 8 adyacentes, excluye el centro, no daña
      aliados ni al atacante, resuelve una tirada por objetivo en orden fijo y
      sustituye al ataque normal del arma, sin camino paralelo.
- [ ] El robo de vida cura el 50 % del daño efectivo de cada impacto, redondeado
      a la baja, con mínimo 1 si el golpe entra, sin sobrecurar y una vez por
      objetivo golpeado.
- [ ] El pipeline emite equipar/desequipar, impacto y daño infligido; cada
      objetivo del círculo y cada curación producen evento propio; sin trait
      declarado no se emite, y la secuencia se repite con la misma semilla.
- [ ] Las cuatro piezas existen en `ITEMS` con sprite: anillo de robo, collar +2
      MP, guantes +1 acción y maza a dos manos con daño base inferior al hacha;
      ningún arquetipo las recibe ni entran en el botín.
- [ ] El snapshot expone traits activos, fuente, stats efectivos y eventos de
      trait; los tests cubren stacking, suelos y topes, disparadores, área, robo,
      sinergia, traits negativos, serialización y no regresión de REQ-006, REQ-009,
      REQ-010 y REQ-017; `pnpm run verify` pasa.

# Plan de test

- Unitario: `stats.test.ts`, `combat.test.ts`, `item-catalog.test.ts` y un
  `traits.test.ts` nuevo en `tests/unit/game/`.
- Integración: misma semilla y misma secuencia dan los mismos eventos;
  equipar y desequipar devuelve los stats base.
- E2E / visual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0161/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/` | 180 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Sin panel, HUD, feedback ni capturas: eso es TASK-0162.
- Sin cofres ni fuente jugable de las piezas: REQ-020 sigue en borrador.
- Sin cuerpo etéreo ni traits que alteren movimiento, colisión, ocupación, línea
  de visión o mapa (T-008).
- Sin traits enemigos; sin dependencias nuevas; `src/game/` no importa `src/host/`.
- No reescribir tests sellados ni relajar REQ-006/009/010/017.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB. pnpm, nunca npm ni npx.

# No objetivos

- Panel, ficha, HUD y feedback (TASK-0162).
- ADR-024, glosario y arquitectura (T-011, tarea docs posterior).
- Cofres y saqueo de REQ-020; bombas y hechizos explosivos.
- Arte final, traits ocultos, crafting y reroll.
