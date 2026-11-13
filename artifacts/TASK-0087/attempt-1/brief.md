---
type: Task Brief
title: "TASK-0087: brief del intento 1"
description: Catálogo con martillo, espada electrizada y daga arcana; una de ellas colocada de forma determinista.
task: TASK-0087
attempt: 1
status: stable
brief_bytes: 2754
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T13:05:00Z }
---

# Objetivo

Añadir al catálogo las tres armas nuevas con sus `damagePackets` y los valores
estimados de REQ-029, y colocar solo el martillo en el mapa con el mecanismo
determinista existente. Sin cambiar el equipo inicial del roster.

# No objetivos

Los de la tarea, más: no tocar el resolvedor ni las fórmulas de TASK-0085, no
rebalancear armas/enemigos existentes, no añadir arte, iconos ni dependencias.

# Invariantes

- `src/game/equipment.ts` sigue siendo la fuente única; nada de listas paralelas.
- IDs estables propuestos: `hammer`, `electric-sword`, `arcane-dagger`; nombres
  «Martillo», «Espada electrizada», «Daga arcana».
- Paquetes: martillo `blunt 4` con acierto +2; espada electrizada `slash 3` +
  `electric 1` con acierto +3; daga arcana `pierce 2` + `magic 1` con acierto +4.
- Los tres valores quedan marcados como estimados v1 de REQ-029 en el catálogo.
- Añade el martillo al final de `MAP_WEAPON_SPECS` (`src/game/map.ts`) para no
  alterar las posiciones existentes del hacha y la daga con la semilla fija.
- Actualiza los tests que fijan «exactamente dos armas» a la nueva verdad (tres
  entidades con IDs y armas esperadas); no los borres, saltes ni debilites.
- No cambies el equipo inicial ni los stats de `src/game/roster.ts`.

# Criterios de aceptación

Viven en la tarea: [criterios](../../../docs/tasks/TASK-0087-motor-armas-nuevas-colocacion.md#criterios-de-aceptación).

# Contexto mínimo

- `src/game/equipment.ts`: `WeaponId`, `WEAPONS`, `validateDamagePackets`.
- `src/game/map.ts`: `MAP_WEAPON_SPECS`, `placeMapWeapons` y su PRNG con sal.
- `src/game/engine.ts`: recogida (`PickUp`) y cambio (`SelectWeapon`) ya existentes.
- `src/host/hud.ts` y `src/host/feedback-events.ts`: leen el catálogo por ID.
- Tabla y notas: [REQ-029 § contenido estimado v1](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#contenido-estimado-v1).
- Recogida/cambio: [REQ-018](../../../docs/requirements/REQ-018-inventario-equipo.md).

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `logs/` y commit SHA en
`artifacts/TASK-0087/attempt-1/`.

# Riesgos y decisiones abiertas

- Hay tests de mapa, growth, debug y HUD que asumen dos armas; adáptalos al
  contrato nuevo sin relajar sus invariantes.
- Demuestra con la semilla fija `279837264` que el martillo aparece y que otra
  semilla cambia la colocación; recogida y cambio por slot con las reglas vivas.
