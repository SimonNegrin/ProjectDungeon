---
type: Task Brief
title: "TASK-0094: brief del intento 1"
description: Instancias con localización única, 8 huecos de equipo y 8 de mochila, stats efectivos en un punto y operaciones atómicas de 1 MP.
task: TASK-0094
attempt: 1
status: stable
brief_bytes: 3132
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:10:00Z }
---

# Objetivo

Sustituir el modelo de tres armas y equipo fijo por instancias con ID único y
localización exclusiva, ocho huecos de equipo y ocho de mochila, stats efectivos
agregados en un punto y equipar, desequipar, recoger y soltar atómicos de 1 MP.

# No objetivos

- Panel, `I`, retirada de `G`/`1`-`3` (TASK-0095); sprites, efectos y debug
  visual (TASK-0096); E2E nuevo (TASK-0098).
- Cofres jugables o UI de saqueo; contenedor solo con estado sintético. Traits
  con efecto, anillo/collar/guantes (REQ-019).
- Balance, daño, economía de acciones, requisitos, guardado, red o dependencias.

# Invariantes

- `src/game/` puro: sin DOM, sin `src/host/`, sin red ni relojes.
- Una instancia, una localización (mochila, hueco, suelo o contenedor); sin
  copias, duplicados ni huérfanos. IDs estables y estado serializable.
- `Unit.weapons` y los campos fijos dejan de ser verdad; el arma sale del hueco.
- Ocho huecos y mochila de capacidad paramétrica (8 por defecto), independientes.
  Equipo inicial de REQ-015; secundarios vacíos; enemigos también con instancias.
- Un único punto agrega stats efectivos (inherentes + objetos + traits vacíos);
  combate, hechizos, IA y HUD lo consumen, sin sumas paralelas.
- Las cuatro operaciones cuestan 1 MP y 0 acciones, en fase de jugador con
  cualquier alarma; con 0 MP se rechazan.
- Validación atómica sobre el estado resultante: mochila llena + equipar desde
  mochila intercambia; desde suelo/contenedor se rechaza. Recoger llena no altera
  nada; soltar un equipado lo desequipa y lo deja en la casilla.
- Dos manos con escudo por ambos lados, rechazo entero; sin apilado.

# Criterios de aceptación

`../../../docs/tasks/TASK-0094-motor-instancias-mochila-equipo-operaciones.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/{types,equipment,engine,roster,bestiary,combat,magic,actions}.ts`.
- Host mínimo: `input.ts`, `presentation.ts`, `debug.ts`, `hud.ts`,
  `renderer.ts`, `feedback-events.ts`.
- Tests unitarios y helpers; `tests/e2e/support.ts` solo para typecheck.
- REQ-018 T-002 a T-006, REQ-026 R-010, REQ-015 y ADR-021. Alcance exacto,
  comandos y matriz de test en [brief-detalle.md](brief-detalle.md).

# Artefactos

`artifacts/TASK-0094/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `logs/` y salidas focalizadas; SHA en el informe.

# Riesgos y decisiones abiertas

- Refactor amplio: diff limitado a modelo, consumidores y host mínimo.
- `tsc` incluye `tests/e2e`: actualiza tipos/fixtures sin reescribir escenarios;
  no se ejecuta E2E. EXP-004 puede fallar por timeout bajo carga: aísla y anota.
- “Cualquier estado” = fase de jugador con cualquier alarma, no fase enemiga.
- Decisión de producto o contradicción: devuelve `blocked`, no decidas.
