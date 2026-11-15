---
type: Task Brief
title: "TASK-0130: brief del intento 1"
description: Saqueabilidad por instancia, política de botín en el catálogo y RNG derivado.
task: TASK-0130
attempt: 1
status: stable
brief_bytes: 2092
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:40:00Z }
---

# Objetivo

Que cada `ItemInstance` nazca con `lootable`, que el catálogo declare
`lootPolicy` con los porcentajes en datos y que al crear un enemigo se tire por
cada objeto con un RNG derivado de la semilla y del id del enemigo, sin consumir
el RNG principal; el snapshot de debug lo expone.

# No objetivos

- Cadáveres y descarte al morir (TASK-0133), saqueo y guardado (TASK-0138).
- Render, panel de cadáveres, objetos nuevos, llaves ni piezas de REQ-019.
- Tocar el RNG principal, mapa, combate, IA o tests seeded.

# Invariantes

- `src/game` puro: sin DOM, sin `src/host`, sin red, sin relojes ni `Math.random`.
- Misma semilla e id de enemigo ⇒ mismo resultado; el orden no altera otros
  enemigos y `state.rng` queda idéntico a `createRng(seed)`.
- No borrar, saltar ni debilitar tests: los fixtures se actualizan conservando su
  intención.
- El contrato técnico está cerrado en `brief-detalle.md`; leerlo antes de editar.

# Criterios de aceptación

`docs/tasks/TASK-0130-motor-saqueabilidad-lootpolicy-rng-botin.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/`: `inventory.ts`, `equipment.ts`, `rng.ts`, `engine.ts`
  (`createEnemy`), `types.ts`, `index.ts`.
- `src/host/debug.ts`: clones del snapshot.
- REQ-034 R-002/R-003/R-008/R-012, T-001/T-002/T-003/T-008/T-009.
- Tests: `tests/unit/game/{inventory,item-catalog,engine,integration}.test.ts`,
  `tests/unit/host/debug.test.ts`, `tests/unit/game/helpers.ts`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas.

# Riesgos

- `lootable` obligatorio rompe literales en tests y E2E: usar el helper, nunca
  relajar el tipo.
- Si una duda cambia reglas de REQ-034, devolver `blocked`; no inventar campos.
- Timeouts: tests 120 s; `pnpm run verify` 240 s.
