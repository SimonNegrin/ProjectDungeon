---
type: Task Brief
title: "TASK-0077: brief del intento 2"
description: Actualizar los E2E que asumen un ataque enemigo por fase al encadenado.
task: TASK-0077
attempt: 2
status: stable
brief_bytes: 1729
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T18:25:00Z }
---

# Objetivo

Dejar `pnpm run test:e2e` verde salvo el fallo preexistente de
`cursor-qa.spec.ts:628`, actualizando los specs que asumen **un** ataque enemigo
por fase al comportamiento encadenado de TASK-0077.

# Evidencia

- `pnpm run test:e2e`: 104 pasan, 5 fallan.
- Nuevos por el encadenado: `combat-equipment-qa.spec.ts:337`,
  `cursor-qa.spec.ts:423`, `flee-behavior-qa.spec.ts:130` y
  `game-input-hud.spec.ts:53`.
- Preexistente en `main` (TASK-0076): `cursor-qa.spec.ts:628`. No lo toques.

# Hipótesis

Los specs suman el daño de un solo `AttackPerformed` o esperan sobrevivir a una
fase enemiga de un ataque. Con Centinela (2) y Cobarde acorralado (2) hay dos
ataques y el RNG del escenario cambia. Hay que sumar todos los ataques del
enemigo, comprobar el contador a 0 y hacer robusto el escenario de
`game-input-hud` (p. ej. vida inicial del enemigo) sin cambiar el host.

# Restricciones

- Sin cambios en `src/host/**`, HUD, presentación, motor, bestiario ni
  experimentos.
- No debilitar los specs: conservan su intención (impacto, economía, huida,
  victoria, HUD) y añaden el encadenado.
- No tocar el fallo preexistente `cursor-qa.spec.ts:628`.
- Mantener `pnpm run verify` verde; si `EXP-004` vuelve a agotar 5 s por carga,
  documentarlo con la salida y el workaround de un worker.

# Artefactos

- `artifacts/TASK-0077/attempt-2/report.md`, `verify-output.txt`,
  `e2e-output.txt`; commit en `task/TASK-0077`.
