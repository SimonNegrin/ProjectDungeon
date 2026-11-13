---
type: Task Brief
title: "TASK-0092: brief del intento 1"
description: E2E y QA visual del ciclo de tipos de daño, bandas y desglose.
task: TASK-0092
attempt: 1
status: stable
brief_bytes: 2325
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T16:10:00Z }
---

# Objetivo

Un E2E determinista demuestra en Chromium el ciclo de REQ-029 —arma nueva,
bandas, total y desglose, mínimo 1, armadura/escudo, LOS y `F1`, hechizos— y deja
capturas a 1280×720 y 900×700 legibles sin depender del color.

# No objetivos

- Matriz unitaria y coste (TASK-0090) ni documentación de diseño (TASK-0091).
- Cambiar reglas, perfiles, armas, eventos, HUD o motor; añadir dependencias o
  arte; rebalancear.

# Invariantes

- `src/game/**` y `src/host/**` no cambian. El test lee `snapshot`, eventos y DOM;
  no duplica fórmulas ni recalcula daño, bandas o impacto.
- Sin tests borrados, saltados o expectativas relajadas; todo fixture nuevo se
  justifica en el informe.
- Timeouts: `test:e2e` 180 s; `verify` 120 s.

# Criterios

[TASK-0092 § Criterios](../../../docs/tasks/TASK-0092-e2e-qa-tipos-dano-bandas.md#criterios-de-aceptación)
y [REQ-029 T-008/T-009, R-010](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos).

# Contexto mínimo

- Base: `combat-equipment-qa.spec.ts` (martillo en la semilla 279837264, ataque y
  `F1`), `cursor-qa.spec.ts` (`F1`) y `spell-hud-qa.spec.ts` (Mago, dos viewports,
  hechizos y curación). Spec nueva sugerida: `tests/e2e/damage-types-qa.spec.ts`.
- Helpers de `support.ts` y `artifactPath` de `artifacts.ts`.
- DOM: `hud-cursor-bands`, `hud-cursor-band-<type>`, `damage-feedback`,
  `damage-feedback-detail`, `debug-content`.
- Recoge el martillo con `G`; ataca a centinela/bruto y a un enemigo
  `very-resistant` con `rng` fijo. El bestiario no trae esa banda ni variantes de
  armadura/escudo: el parche de fixture se explica y acota.
- Hechizos: lee `SpellCast.damageBreakdown` y el detalle DOM; curación y
  resurrección no muestran desglose.

# Artefactos

`report.md` (≤4 KB), `e2e-output.txt`, `verify-output.txt`, `screenshots/` y SHA
del commit en `task/TASK-0092`.

# Riesgos

- El escudo necesita una tirada decisiva: elige un estado RNG donde el impacto
  cambie con y sin escudo, leyendo solo estado y eventos.
