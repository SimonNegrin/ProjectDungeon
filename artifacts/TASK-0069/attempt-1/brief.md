---
type: Task Brief
title: "TASK-0069: brief del intento 1"
description: Motor y datos v2 del banco de EXP-003 con overrides de héroe.
task: TASK-0069
attempt: 1
status: stable
brief_bytes: 2709
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T21:49:13Z }
---

# Objetivo

Ampliar motor y datos de `experiments/EXP-003-mesa-combate` para la v2 de
REQ-028: overrides de héroe, enemigo compartido, filas afectadas por
enemigo/héroe/arma, diagnóstico y export con héroes, y API ampliada. Sin tablas
ni layout.

# No objetivos

- Tablas/layout: [TASK-0070](../../../docs/tasks/TASK-0070-exp-003-tres-tablas-ui.md).
- E2E/QA visual: [TASK-0071](../../../docs/tasks/TASK-0071-exp-003-tres-tablas-e2e.md).
- Fórmulas, reglas, escenario, producción, `index.html`, `public/`, `experiment.md`.

# Invariantes

- `CATALOG` no se muta; sin overrides el catálogo de trabajo equivale a la base.
- Enemigo = 4 filas; héroe = 3; arma = todas las filas del catálogo de trabajo,
  deduplicadas (espada/daga 6, hacha 4, cuchillo 0).
- Objetivo ⇒ solo diagnóstico, sin duelos. Igual estado ⇒ mismo export e
  `overridesId`, sin timestamp.

# Criterios de aceptación

[Enlace](../../../docs/tasks/TASK-0069-exp-003-tres-tablas-motor.md#criterios-de-aceptación).

# Contexto mínimo

- `src/v2/bench.ts`, `src/bench-ui.ts`, `src/ui.ts`, `src/main.ts` y sus
  `*.test.ts`.
- REQ-028: [T-001 a T-003 y T-006 a T-008](../../../docs/requirements/REQ-028-ajuste-interactivo-balance.md#requisitos-técnicos)
  y [héroes R-011 a R-014](../../../docs/requirements/REQ-028-ajuste-interactivo-balance.md#tabla-3--héroes).

# Alcance técnico

- `HeroOverride`: `stats`, `maxHp`, `maxActions`, `magicLevel`, `armorId`,
  `shieldId`, `weaponId` (incluye `null`). `BenchOverrides.heroes`; helpers
  `withHeroOverride`, `resetHeroOverride`, `resetEnemies`, `resetWeapons`,
  `resetHeroes`; export lo incluye.
- `BenchSelection` gana `{ kind: 'hero'; heroId }`; `recalculateMatchups`
  conserva semilla y duelos.
- `bench-ui`: campos/límites de héroe (PV 1–999, stats −10–20, acciones 0–10,
  magia 0–4), validación, valor, parche, reset por campo y `pruneOverrides`.
- API: `setHeroField`, `resetHeroField`, `resetHero`, `resetEnemies`,
  `resetWeapons`, `resetHeroes`; `recalculate` acepta héroe. Mantener métodos y
  no tocar el DOM de las tablas.
- Tests unitarios en los archivos existentes, sin debilitar los actuales.

# Artefactos

- `artifacts/TASK-0069/attempt-1/report.md`, `test-output.txt`,
  `verify-output.txt`; commit SHA en `task/TASK-0069`.

Sin decisión creativa abierta. No añadas dependencias; si `main.ts` pide más que
cablear la API, limita el cambio y repórtalo.
