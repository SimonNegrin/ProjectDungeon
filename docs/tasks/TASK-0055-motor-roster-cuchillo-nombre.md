---
type: Task
id: TASK-0055
title: "Motor: catálogo de roster, Cuchillo y nombre de personaje"
description: "Catálogo de nueve arquetipos con stats, equipo, variantes y magia; Cuchillo +4/1; campo nombre por instancia; un arquetipo sin arma no ataca."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-015
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, T-001, T-002, T-004]
depends_on: [TASK-0053]
unlocks: [TASK-0056]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0055/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que exista el catálogo de roster de
[REQ-015](../requirements/REQ-015-roster-arquetipos.md): nueve arquetipos con
stats, equipo inicial, dos variantes de sprite y magia (identidad); el Cuchillo
+4/1 en el catálogo de armas; y el campo `nombre` por instancia, por defecto el
del arquetipo. Una unidad sin arma no puede atacar.

# Contexto

- Stats, equipo e identidad: REQ-015 «Stats inherentes», «Equipo inicial» e
  «Identidad y magia».
- Catálogos actuales: `src/game/bestiary.ts`, `equipment.ts`, `types.ts`.
- El campo `nombre` es de instancia (no del catálogo); por defecto, el nombre
  del arquetipo.

# Criterios de aceptación

- [ ] `ROSTER` declara los nueve arquetipos con los valores de REQ-015: stats,
  arma, armadura, escudo, dos variantes y magia (identidad).
- [ ] `WEAPONS` incluye el Cuchillo +4/1; la daga sigue +4/2.
- [ ] Cada unidad tiene un `nombre` serializable, por defecto el del arquetipo.
- [ ] Un ataque de una unidad sin arma se rechaza; el catálogo marca «sin arma».
- [ ] Tests unitarios de roster, Cuchillo, nombre y ataque sin arma;
  `pnpm run verify` pasa.

# Plan de test

- **Unitario:** los nueve arquetipos y sus valores; Cuchillo +4/1; nombre por
  defecto; ataque sin arma rechazado; serialización.
- **Integración:** crear un personaje desde un arquetipo con su nombre.
- **E2E / visual:** llega en TASK-0056.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0055/attempt-1/report.md`.
- [ ] Salidas de tests y `pnpm run verify`.
- [ ] Commit SHA.

# Restricciones

- No cambiar la fórmula de combate (TASK-0053).
- No añadir assets de sprite ni pantalla de inicio (REQ-016).
- Sin dependencias nuevas; `src/game/` sigue puro.

# No objetivos

- Guerrero por defecto y host (TASK-0056).
- Pantalla de inicio, sprites y edición del nombre (REQ-016).
