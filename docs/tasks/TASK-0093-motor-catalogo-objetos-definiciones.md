---
type: Task
id: TASK-0093
title: "Motor: catálogo de objetos y definiciones de equipo"
description: "Reunir armas, escudos y armaduras en un catálogo de objetos data-driven con ID estable, hueco, manos, paquetes de ataque, absorción, evasión, modificadores, sprite y traits vacío, sustituyendo las definiciones dispersas de REQ-010."
status: stable
task_status: done
task_type: feature
requirement: REQ-018
requirement_ids: [R-002, R-004, R-005, R-006, R-014, T-001, T-011]
depends_on: []
unlocks: [TASK-0094]
created_at: 2026-11-13T19:22:51Z
completed_at: 2026-11-13T19:50:06Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0093/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T19:50:06Z
    note: >-
      Verificación independiente en `task/TASK-0093` (tests `41ca4f4`, evidencia
      `fa194e6`). Diff completo: solo `src/game/equipment.ts`, el test nuevo y
      artefactos; sin cambios en consumidores, valores ni tests existentes.
      Reejecutados los tests focalizados (77/77) y `pnpm run verify`
      (1200/1200; docs, config, tsc, build y bundle). Comprobados los diez IDs,
      las vistas derivadas, los paquetes válidos e inválidos, los ocho huecos y
      los recortes contra `items.txt` y el PNG real (352×832). EXP-004 no falló.
---

# Objetivo

Que `src/game/` tenga un catálogo único de objetos con todo lo que el inventario,
el equipo, el combate y la UI necesitan leer de una pieza, sin valores repartidos
entre `equipment.ts`, `types.ts` y el host, y sin cambiar ningún número del juego.

# Contexto

- `src/game/equipment.ts` define `WeaponDefinition`, `ArmorDefinition`,
  `ShieldDefinition` y sus catálogos; `types.ts` guarda `UnitEquipment` y la lista
  `weapons`.
- `combat.ts`, `damage.ts`, `ai.ts` y el HUD leen esos campos directamente.
- `items.png` e `items.txt` ya están en `public/assets/32rogues/`; sus etiquetas
  (`1.d. long sword`, `12.a. buckler`, `13.e. scale mail`) dan el recorte de cada
  pieza.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-001 y T-011; [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md)
  R-004 y T-002; [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md).
- Esta tarea no introduce estado nuevo: solo el catálogo y su validación.

# Criterios de aceptación

- [x] Existe `ItemDefinition` con ID estable, nombre, categoría, hueco, manos,
      acierto, absorción, evasión, modificadores de atributos, paquetes de daño,
      traits, sprite (`sheet` y recorte) y descripción.
- [x] Los IDs actuales se conservan (`sword`, `axe`, `dagger`, `knife`, `hammer`,
      `electric-sword`, `arcane-dagger`, `armor`, `plate`, `shield`) y ningún
      valor de arma, armadura o escudo queda fuera del catálogo.
- [x] Solo hay contenido de las categorías del corte: armas, escudos y armaduras
      corporales. Casco, botas, guantes, collar y anillo existen como huecos sin
      objetos; consumibles, llaves, munición y monedas no entran.
- [x] Cada arma declara `hands` 1 o 2; las siete armas actuales quedan a una mano
      y el soporte de dos manos se prueba con una entrada de test, porque la maza
      a dos manos llega con `REQ-020`.
- [x] Cada entrada apunta a un recorte válido de `items.png` según `items.txt`; un
      test comprueba que todos los recortes caen dentro de la hoja.
- [x] Los paquetes de daño siguen validándose como en `REQ-029`: máximo un físico,
      máximo un elemental y máximo dos paquetes.
- [x] El campo de traits existe y está vacío; esta tarea no aplica efectos.
- [x] Combate, réplica, hechizos y recogida compilan y sus tests pasan sin cambiar
      valores; el HUD se adapta solo lo necesario para compilar.
- [x] `pnpm run verify` pasa y `src/game/` sigue puro, sin DOM ni dependencias.

# Plan de test

- Unitario: IDs únicos; categoría y hueco coherentes; manos válidas; recortes
  dentro de `items.png`; paquetes válidos e inválidos; traits vacío.
- Integración: espada, hacha, daga, cuchillo, martillo, espada electrizada y daga
  arcana dan los mismos números de acierto, daño y absorción que antes; armadura y
  escudo conservan absorción y evasión.
- E2E / visual: no aplica; el panel llega en TASK-0095 y el E2E en TASK-0098.
- Manual: comprobar que el juego se ve y se juega igual que antes de la tarea.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0093/attempt-1/report.md`
- [x] Salida de `pnpm run verify` y de los tests focalizados
- [x] Commit SHA en la rama `task/TASK-0093`

# Restricciones

- No crear instancias, mochila, huecos de estado ni operaciones de equipo.
- No cambiar valores de combate, balance ni economía de acciones.
- No tocar `src/host/` más allá de lo necesario para compilar y dibujar igual.
- Sin `I`, sin panel y sin retirar todavía `G` ni `1`-`3`.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# No objetivos

- Instancias, localizaciones y operaciones atómicas (TASK-0094).
- Panel modal, input y objetos del suelo (TASK-0095 y TASK-0096).
- Documentación (TASK-0097) y E2E (TASK-0098).
