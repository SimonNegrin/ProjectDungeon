---
type: Task Brief
title: "TASK-0055: brief del intento 1"
description: Catálogo de roster, Cuchillo +4/1, nombre por instancia y rechazo sin arma.
task: TASK-0055
attempt: 1
status: stable
brief_bytes: 3589
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:05:00Z }
---

# Objetivo

Añadir `ROSTER` con los nueve arquetipos de REQ-015, el arma Cuchillo +4/1,
`nombre` serializable por unidad con el nombre del arquetipo por defecto, y el
rechazo determinista de ataques sin arma. Tests unitarios y `pnpm run verify`.

# No objetivos

- Guerrero por defecto, host, docs y E2E del roster (TASK-0056).
- Pantalla de inicio, assets de sprite, edición del nombre (REQ-016).
- Cambiar la fórmula de combate, balance, enemigos ni armas existentes.
- Dependencias nuevas; `src/game/` sigue puro (sin DOM, Canvas, red ni relojes).

# Invariantes

- REQ-015 es la única tabla de valores; no dupliques stats/equipo en motor, host
  ni tests. Los tests pueden fijar los valores esperados de la tabla.
- Cuchillo `knife` +4/1; daga sin cambios (+4/2).
- `stats.magia` siempre `[]`; la identidad mágica es un texto sin efecto.
- No borrar, saltar ni debilitar tests. No tocar `experiments/` ni `public/`.

# Contrato propuesto

- `src/game/roster.ts`: `ArchetypeId` (nueve IDs estables), `ROSTER` y
  `rosterEntry(id)`. Entrada: `id`, `name`, `maxHp`, `maxMp`, `stats`,
  `equipment`, `futureWeapon: string | null`, `variants: [string, string]`
  (IDs de sprite sin género), `role` y `magic` (texto; `—` si none).
- `createPlayerFromArchetype(id, options?)` devuelve un `Unit` jugador con PV/MP
  llenos, acción disponible, `weapons` con el arma equipada o `[]`, y `nombre`
  por defecto `entry.name`; `options.name` lo sobrescribe.
- `UnitEquipment.weaponId: WeaponId | null` (`null` = sin arma). Ajusta el
  host solo para compilar (`Sin arma` en HUD); no añadas UI de roster.
- `Unit.nombre: string`; enemigos y jugador provisional reciben un nombre
  estable. El snapshot/serialización lo expone sin lógica extra.
- `RejectionReason` añade `'unarmed'`; `resolveAttack` rechaza sin consumir RNG
  si el arma equipada es `null` (mantén la precedencia de validaciones actual).

# Criterios de aceptación

En `docs/tasks/TASK-0055-motor-roster-cuchillo-nombre.md#criterios-de-aceptación`.

# Contexto mínimo

- [Stats e identidad](../../../docs/requirements/REQ-015-roster-arquetipos.md#stats-inherentes-balance-provisional-v1),
  [equipo](../../../docs/requirements/REQ-015-roster-arquetipos.md#equipo-inicial) e
  [identidad/magia](../../../docs/requirements/REQ-015-roster-arquetipos.md#identidad-y-magia).
- `src/game/types.ts` (`Unit`, `UnitStats`, `UnitEquipment`, `RejectionReason`).
- `src/game/equipment.ts` (`WEAPONS`, `weaponFor`), `combat.ts` (guarda de arma),
  `engine.ts` (`createPlayer`, `createEnemy`) e `index.ts` (exportar roster).
- `src/host/hud.ts`: `weaponLabel` debe tolerar `weaponId: null`.
- Tests: `tests/unit/game/helpers.ts`, `roster.test.ts` nuevo, `combat.test.ts`,
  `equipment`/`stats`; actualiza narrowing mecánico donde el fixture está armado.

# Artefactos

`artifacts/TASK-0055/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, commit SHA y, si aplica, `brief-detalle.md`.

# Riesgos y decisiones abiertas

- El cambio a `weaponId` nullable toca tests existentes: usa narrowing explícito,
  no borres aserciones.
- Sin cambio de comportamiento del jugador provisional ni de enemigos.
- Si el contrato propuesto choca con el código, decide lo mínimo y regístralo en
  el informe; no amplíes alcance.
