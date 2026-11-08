---
type: Task Brief
title: "TASK-0028: brief del intento 1"
description: Bestiario de combate y ataque enemigo con el resolvedor compartido.
task: TASK-0028
attempt: 1
status: stable
brief_bytes: 2573
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T18:40:00Z }
---

# Objetivo

Un catálogo único de bestiario (centinela, bruto, cobarde; tabla A) y el enemigo
actual como centinela; sus ataques usan `resolveAttack` y el catálogo, con TtK
dentro de ±0,3.

# No objetivos

- Percepción, alarma, huida, memoria o varios enemigos (`REQ-009`).
- Sprites, HUD, feedback, render, input, `src/host/`, `docs/`, dependencias.
- Fórmulas, economía de turno, victoria/derrota o valores de armas.

# Invariantes

- `src/game/` puro: sin DOM, red, relojes ni `Math.random`.
- Una tabla de valores y un resolvedor; la IA no duplica fórmulas.
- `pnpm run verify` pasa; tests existentes conservan intención, sin borrar,
  saltar ni debilitar.
- Un enemigo vivo hasta `hp === 0`; `evaluateStatus` no cambia.
- RNG sembrado y serializable.

# Criterios

Viven en [TASK-0028](../../../docs/tasks/TASK-0028-bestiario-combate-ataque-enemigo.md#criterios-de-aceptación).

# Contexto mínimo

- `src/game/equipment.ts`: catálogo estable de equipo.
- `src/game/combat.ts`: `resolveAttack` compartido.
- `src/game/ai.ts`, `turn.ts`, `engine.ts`: `createUnit` y fase enemiga.
- `src/game/types.ts`: `Unit` serializable; tipo de enemigo estable.
- Tabla A: [REQ-010](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#modificadores-y-equipo-aceptados)
  y [EXP-003](../../../experiments/EXP-003-mesa-combate/experiment.md#decisión).
- Visión/perfil: datos provisionales de la tabla propuesta de
  [REQ-009](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md#bestiario-mínimo-propuesto)
  (valiente 6 / valiente 4 / cobarde 5); sin comportamiento. Si lo ves como
  decisión creativa abierta, repórtalo; no la inventes.
- Tests: `tests/unit/game/{ai,combat,integration,turn}.test.ts` y `helpers.ts`;
  foco con `pnpm exec vitest run <archivos>`.

# Artefactos

- `artifacts/TASK-0028/attempt-1/{report.md,test-output.txt,verify-output.txt,e2e-output.txt,logs/}`.
- Commit en `task/TASK-0028` con brief e informe.

# Riesgos

- Visión/perfil de `REQ-009` son propuestos: datos provisionales, sin percepción.
- TtK con RNG sembrado y muchas repeticiones; si una celda sale de ±0,3, revisa
  equipo o valores, no la tolerancia.
- No debilites tests; si un E2E sembrado cambia, ajusta solo valores reales y
  documenta la intención.
