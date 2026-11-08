---
type: Task Brief
title: "TASK-0026: brief del intento 2"
description: Corregir regresiones de tests del intento 1 sin cambiar el motor.
task: TASK-0026
attempt: 2
status: stable
brief_bytes: 2547
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T18:20:00Z }
---

# Objetivo

Mantener el motor del intento 1 y corregir dos regresiones de test:

1. Restaurar aserciones exactas en `tests/unit/game/turn.test.ts` y
   `tests/unit/game/integration.test.ts`, que se sustituyeron por sumas
   tautológicas (`hp === 20 - totalDamage`). Fija las tiradas con
   `rngForDice`/`createRng` y vuelve a comprobar vida, daños y eventos exactos.
2. Actualizar solo las aserciones E2E existentes que asumen daño fijo 5/3, para
   que usen el combate sembrado de la semilla de referencia sin borrar, saltar,
   debilitar ni añadir cobertura E2E nueva.

# Evidencia del fallo

`attempt-2/lead-e2e-before.txt`: 7 fallos de E2E (48 pasan) por feedback `-5`,
vida 5/9 o victoria en 2 golpes. Ver informe del intento 1.

# No objetivos

- No cambiar fórmulas, catálogo, equipo, RNG ni el resolvedor del intento 1.
- No añadir specs E2E, capturas ni QA visual nuevos (TASK-0030).
- No tocar `src/host/`, `index.html`, `public/`, `docs/`, `experiments/`,
  `package.json` ni dependencias.

# Invariantes

- Conservar la intención; prohibido borrar, saltar o usar tautologías.
- Cada E2E roto fija el resultado real de la semilla `279837264` y afirma
  feedback, vida y eventos exactos, o amplía con comandos reales hasta la
  victoria sin reducir la aserción a "hay daño".
- `pnpm run test:e2e` completo y `pnpm run verify` deben pasar.

# Criterios de aceptación

`docs/tasks/TASK-0026-motor-combate-equipo-modificadores.md#criterios-de-aceptación`.

# Contexto mínimo

- Cambios del intento 1: commit `ac5e145`; informe en `attempt-1/report.md`.
- Tests débiles: `tests/unit/game/turn.test.ts` (línea ~92) y
  `tests/unit/game/integration.test.ts` (línea ~58).
- E2E afectados: `tests/e2e/{game-input-hud,cursor-qa,frame-qa,game-cursor,motion-qa}.spec.ts`.
- Helpers: `tests/unit/game/helpers.ts` (`rngForDice`, `advanceRng`).

# Artefactos

`attempt-2/report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`.
Commit en `task/TASK-0026`; no fusionar.

# Hipótesis

El motor es correcto; los fallos son expectativas obsoletas. Fijar tiradas y
actualizar solo E2E existentes debe dejar la suite verde sin tocar producción.
Si al fijar tiradas aparece un fallo real del motor, párate y devuélvelo con
evidencia.
