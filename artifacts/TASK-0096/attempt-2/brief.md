---
type: Task Brief
title: "TASK-0096: brief del intento 2"
description: Corregir el pulso del HUD en soltar/desequipar y restaurar la aserción de capas.
task: TASK-0096
attempt: 2
status: stable
brief_bytes: 2083
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T21:05:00Z }
---

# Objetivo

Cerrar dos defectos detectados en la verificación independiente sin cambiar el
alcance: (1) el pulso del HUD del arma no debe activarse al soltar o desequipar
un objeto que no es un cambio de arma; (2) el test de capas del renderer debe
seguir comprobando que el objeto del suelo va después de los decals y antes de
las unidades.

# Hipótesis

`DropItem`/`UnequipItem` reutilizan el cue `select-weapon`; `weaponSlotPulseAt`
filtra por `cue.kind` y por eso devuelve pulso también para esos dos eventos.
Filtrar por `cue.eventType === 'PickUp' || 'SelectWeapon'` conserva el pulso de
recogida y cambio de arma y lo elimina para soltar/desequipar. En renderer, la
nueva prueba de objeto→unidad perdió la comprobación de decals del test anterior.

# No objetivos

- Reglas, catálogo, costes, operaciones, copy, banners ni cue kinds nuevos.
- TASK-0097/TASK-0098, E2E, documentación o arte.

# Criterios de aceptación

Los mismos de `../../../docs/tasks/TASK-0096-host-objetos-suelo-sprite-debug.md`;
no se copian. Este intento solo corrige los dos defectos anteriores.

# Contexto mínimo

- `src/host/feedback-events.ts`: `weaponSlotPulseAt`; deja pulso solo para
  `PickUp`/`SelectWeapon`.
- `tests/unit/host/feedback-events.test.ts`: añade regresión de que soltar y
  desequipar no producen pulso, y conserva el de recogida/cambio.
- `tests/unit/host/renderer.test.ts`: en el test de orden, vuelve a comprobar
  `itemIndex > decalIndex` además de `unitIndex > itemIndex`.

# Artefactos

`artifacts/TASK-0096/attempt-2/`: `report.md`, `verify-output.txt`,
`focused-test-output.txt`. Commit SHA en el informe.

# Riesgos

- No cambies la duración ni el banner de los cues; solo el filtro del pulso.
- No debilites otros tests; ejecuta `pnpm run verify`.
