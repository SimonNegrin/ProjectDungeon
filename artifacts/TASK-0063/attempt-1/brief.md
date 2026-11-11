---
type: Task Brief
title: "TASK-0063: brief del intento 1"
description: Motor v2.0 de EXP-003, escenarios 1v1 y medición de 12 emparejamientos.
task: TASK-0063
attempt: 1
status: stable
brief_bytes: 2524
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:30:00Z }
---

# Objetivo

Crear `experiments/EXP-003-mesa-combate/src/v2/` con el motor puro y
data-driven de la mesa v2.0 y generar `results/` con los 12 emparejamientos
(4 héroes × 3 enemigos), semilla 1017, 1.000 duelos y héroe con iniciativa.
Tests, resultados reproducibles y evidencia en `artifacts/TASK-0063/attempt-1/`.

# No objetivos

- Página, API y export (TASK-0064); 2v2; estados y resistencias por familia.
- Decidir o ajustar valores de balance: medir y recomendar.
- Tocar `src/`, `tests/`, `index.html`, `public/`, dependencias o la v1.
- Editar `experiment.md` o cualquier `docs/`.

# Invariantes

- Resolvedor aislado en `src/v2/`: puro, determinista y sin importar `src/` en
  runtime; los tests de equivalencia pueden importar `src/game/combat.ts`.
- Fórmulas de REQ-010/REQ-025 con resistencia; empate falla; daño mínimo 1.
- Réplica REQ-027: solo melé con arma, tras fallo, adyacente, gratis, inmediata,
  sin cadena ni tope, tiradas nuevas; dormido no atacable; regreso replica; huida
  solo acorralada; letal descarta acciones restantes.
- Catálogo con versión; alta de enemigo/hechizo por datos sin tocar el resolvedor.
- Sin `Math.random`; RNG sembrado.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0063-exp-003-v2-motor-medicion.md#criterios-de-aceptación`;
no se copian.

# Contexto mínimo

- `docs/design/exp-003-v2-brief.md` y `brief-detalle.md` (escenario, política,
  métricas y valores: leerlo).
- REQ-025 (magia/maná), REQ-026 (acciones), REQ-027 (réplica), REQ-009 (estados),
  REQ-010/REQ-014/REQ-015 (fórmulas y valores).
- V1: `experiments/EXP-003-mesa-combate/src/combat.ts` y `src/combat.test.ts`;
  `experiments/_shell/rng.ts`.
- Equivalencia: `src/game/combat.ts`, `src/game/bestiary.ts`,
  `src/game/equipment.ts`.

# Artefactos

- `report.md` (≤4 KB), `test-output.txt`, `docs-check-output.txt`,
  `verify-output.txt` en `artifacts/TASK-0063/attempt-1/`.
- `experiments/EXP-003-mesa-combate/results/v2-seed-1017-duels-1000.json`.
- Commit en `task/TASK-0063` con el SHA en el informe.

# Riesgos y decisiones abiertas

- Escenario y política del héroe: ver `brief-detalle.md`; son supuestos de
  medición, no valores de balance. Si algo no cuadra, medir y anotar.
