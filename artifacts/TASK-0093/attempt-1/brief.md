---
type: Task Brief
title: "TASK-0093: brief del intento 1"
description: Catálogo ItemDefinition data-driven y validación, sin estado nuevo.
task: TASK-0093
attempt: 1
status: stable
brief_bytes: 2479
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:50:00Z }
---

# Objetivo

Catálogo único en `src/game/` con `ItemDefinition` completo para las 7 armas, 2
armaduras y 1 escudo actuales, IDs y valores intactos, más validación.

# No objetivos

- Instancias, mochila, operaciones, panel, suelo, HUD nuevo o E2E
  (TASK-0094 a TASK-0098).
- Cambiar balance; añadir traits con efecto, accesorios, consumibles, llaves,
  munición o monedas.
- `src/host/` solo lo necesario para compilar y dibujar igual.

# Invariantes

- `src/game/` puro: sin DOM, sin `src/host/`, sin dependencias nuevas.
- IDs: `sword`, `axe`, `dagger`, `knife`, `hammer`, `electric-sword`,
  `arcane-dagger`, `armor`, `plate`, `shield`.
- 7 armas a una mano; dos manos solo en test (la maza llega con REQ-019/020).
- `traits` vacío y sin efectos. Catálogo como única fuente.

# Criterios de aceptación

`../../docs/tasks/TASK-0093-motor-catalogo-objetos-definiciones.md#criterios-de-aceptación`.

# Contexto mínimo

- `equipment.ts`, `types.ts` (`DamagePacket`, `UnitEquipment`); consumidores:
  `combat.ts`, `damage.ts`, `magic.ts`, `engine.ts`, `roster.ts` y
  `src/host/{hud,feedback-events}.ts`.
- `public/assets/32rogues/items.txt`: etiquetas de recorte; hoja 352×832,
  celdas 32×32.
- REQ-018 T-001 y R-002/004/005/014; REQ-029 R-004/T-002; ADR-006.

# Enfoque esperado

- `ItemDefinition`: ID, nombre, categoría, hueco, manos, acierto, absorción,
  evasión, modificadores, paquetes, traits vacío, sprite (hoja, etiqueta,
  recorte) y descripción.
- Deriva `WEAPONS`/`ARMORS`/`SHIELDS` y helpers del catálogo; adapta imports y
  aserciones sin cambiar valores ni intención.
- Valida IDs únicos, categoría↔hueco, manos 1|2, paquetes (1 físico + 1
  elemental, máx. 2) y recorte dentro de la hoja y coherente con `items.txt`.
- Sprites: `1.d long sword`, `12.a buckler`, `13.e scale mail`; elige el resto
  de `items.txt` y anótalo.

# Artefactos

`artifacts/TASK-0093/attempt-1/`: informe, salidas y `logs/`; commit con SHA.

# Riesgos y decisiones abiertas

- EXP-004 falla intermitentemente por timeout bajo carga: no lo arregles;
  pásalo aislado y anótalo.
- Si hay que cambiar valores o debilitar tests, devuelve `blocked` con la
  alternativa.
