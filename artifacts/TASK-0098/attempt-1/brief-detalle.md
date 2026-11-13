---
type: Task Brief Detail
title: "TASK-0098: detalle del brief del intento 1"
description: Baseline E2E, puntos obsoletos y selectores del panel para realinear los specs.
task: TASK-0098
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T21:25:00Z }
---

# Baseline observado en `c0fed9b` (main)

- `pnpm run verify`: OK, 1249/1249 unitarios, docs, config, tsc, build y bundle.
- `pnpm run test:e2e tests/e2e/equipment-hud-qa.spec.ts tests/e2e/combat-equipment-qa.spec.ts tests/e2e/damage-types-qa.spec.ts --reporter=line`:
  12 pasan, 3 fallan, todos por el mensaje/teclado antiguo:
  - `equipment-hud-qa.spec.ts:105` «arma en el mapa, pista de G y HUD de equipo»:
    `weapon-hint` ya reza «I panel · Hacha en el suelo»; el spec espera
    «G recoger» y pulsa `g`.
  - `combat-equipment-qa.spec.ts:216` «HUD con espada, armas en el mapa, recogida
    con G y cambio 1-3»: espera «G recoger Hacha», pulsa `g`, compara
    `weapons`/`equipment.weaponId` y cambia de arma con `1`-`3`.
  - `damage-types-qa.spec.ts:362` «arma nueva, bandas distintas y desglose por
    tipo en el feedback»: espera «G recoger Martillo» y pulsa `g`.

No se deben borrar estos casos: la recogida y el cambio de arma siguen
existiendo, ahora en el panel. La cobertura de combate, bandas y HUD posterior
debe conservarse tal cual.

# Realineado esperado de los tres specs

- Sustituir la pista `G recoger X` por la pista vigente de `weapon-hint`
  («I panel · X en el suelo») sin perder la comprobación de que el objeto está
  en el tile.
- Recoger: abrir con `I`, enfocar/activar el botón
  `inventory-action-pickup-ground-<item>` (o la fila del suelo) con teclado, y
  cerrar con `Escape`. Comprobar 1 MP y acciones intactas.
- Cambiar de arma: `EquipItem` desde la mochila en el panel; `1`-`3` deben ser
  no-op. Ya no existe `equipment.weaponId` como verdad: usar
  `players[0].equipment.weapon.itemId`; `weapons` es derivado de compatibilidad.

# Selectores y flujo del panel (TASK-0095/0096)

- `I` abre; `Escape` cierra; `Tab`/flechas recorren acciones; foco atrapado.
- Zonas: `inventory-equipment`, `inventory-backpack`, `inventory-ground-section`
  (oculta si el suelo está vacío), `inventory-ground-hint` (aviso si hay más de
  un objeto), `inventory-stats-total` y `inventory-stats-rows`.
- Filas: `inventory-<row>-name`, `inventory-<row>-icon`, comparación
  `Antes → después: …`; botones `inventory-action-<equip|unequip|pickup|drop>-<row>`.
- Mensajes de rechazo en `inventory-message` («La mochila está llena», «Sin MP
  para esta operación», «El arma a dos manos no admite escudo»).
- `F1` abre el overlay de debug; el snapshot expone `inventory`
  (`capacity`, `items` con localización), `equipment` por hueco y
  `groundItems` (`id`, `itemId`, `x`, `y`).
- Límite conocido: `PickUp` toma el primer objeto del tile; el panel lo advierte
  con `inventory-ground-hint`. `EquipItem` desde el suelo sí elige por `itemId`.

# Fixtures y ayudas

- `openBspState` admite `player`, `playerEquipment` (ocho huecos o forma legacy)
  y `playerWeapons` (IDs legacy). Para mochila llena, ocho IDs.
- `ensureMp` y `settle` evitan depender del MP restante tras caminar; `walkTo`
  usa comandos reales. Las capturas usan `artifactPath` y
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0098/attempt-1`.
- Viewports: fijar `page.setViewportSize({ width: 1280, height: 720 })` y
  `{ width: 900, height: 700 }`; no cambiar el layout para la captura.

# Alcance de archivos

- Nuevo spec de inventario/equipo en `tests/e2e/` (p. ej.
  `inventory-equipment-qa.spec.ts`).
- Actualizar solo los tres specs citados y, si hace falta, un helper compartido
  en `tests/e2e/support.ts` o `tests/e2e/artifacts.ts`.
- Prohibido tocar `src/**`, `index.html`, `public/**`, requisitos, arnés o
  plantillas en esta tarea.
