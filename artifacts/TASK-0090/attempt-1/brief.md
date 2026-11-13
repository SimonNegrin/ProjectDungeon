---
type: Task Brief
title: "TASK-0090: brief del intento 1"
description: Matriz de tests de bandas y paquetes, no regresión y medición del coste de dos paquetes.
task: TASK-0090
attempt: 1
status: stable
brief_bytes: 2859
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T14:48:14Z }
---

# Objetivo

Cerrar la cobertura de REQ-029 con tests que lean del catálogo: matriz de bandas,
físico vs elemental, armadura y fuerza, recorte y mínimo 1, máximo de paquetes,
hechizos, determinismo y no regresión de REQ-010/014/025/027. Medir el coste de un
ataque de dos paquetes y registrarlo con comando y semilla.

# No objetivos

- No cambiar perfiles, armas, fórmulas ni contenido para hacer pasar tests.
- No tocar `src/game/**` salvo defecto real del motor, justificado en el informe.
- No E2E/QA visual (TASK-0092), docs de diseño (TASK-0091) ni rebalanceo.
- Sin dependencias ni herramientas de medición nuevas.

# Invariantes

- Los tests leen `ROSTER`, `BESTIARY`, `WEAPONS` y `SPELLS`; no duplican el
  resolvedor ni fijan cantidades de balance.
- Sin tests condicionales, `skip`, `todo` ni borrados; los existentes conservan
  su intención.
- Un ataque de dos paquetes consume como máximo dos tiradas de daño y dos de
  resistencia; `pnpm run verify` pasa.

# Criterios de aceptación

En [TASK-0090 § Criterios](../../../docs/tasks/TASK-0090-verificacion-matriz-tipos-regresion-coste.md#criterios-de-aceptación);
plan en [§ Plan de test](../../../docs/tasks/TASK-0090-verificacion-matriz-tipos-regresion-coste.md#plan-de-test).
Requisito: [REQ-029 T-009/T-012](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
y [REQ-015 § método](../../../docs/requirements/REQ-015-roster-arquetipos.md#cómo-ajustar-el-balance-método).

# Contexto mínimo

- `src/game/damage.ts`: `resolvePacket(s)`, `bandFor`, `validateDamagePackets`.
- `src/game/combat.ts`: `resolveAttack`, desglose y orden del RNG; `magic.ts`:
  hechizos tipados, curación sin paquete.
- `src/game/equipment.ts`: armas mixtas `electric-sword` y `arcane-dagger`.
- Tests: `tests/unit/game/{damage,resistances,combat,magic,equipment,roster,bestiary,engine,replica}.test.ts`;
  helpers `rngForDice`, `advanceRng`, `makeUnit`, `makeState`.

# Artefactos

`artifacts/TASK-0090/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt` y `cost-output.txt` con comando, semilla y resultado;
commit(s) en `task/TASK-0090` con SHA en el informe.

# Riesgos y decisiones abiertas

- Medición sin dependencias: script propio con `performance.now` o benchmark
  temporal con semilla fija; registrar comando exacto, semilla, repeticiones y
  comparación de un paquete frente a dos.
- Si falla un criterio por defecto del motor, corregirlo en su alcance sin
  relajar el test; si es de contenido o requisito, devolver `blocked`.
