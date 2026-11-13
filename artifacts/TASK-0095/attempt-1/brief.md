---
type: Task Brief
title: "TASK-0095: brief del intento 1"
description: Panel modal DOM de inventario y equipo con I; retirada de G y 1-3.
task: TASK-0095
attempt: 1
status: stable
brief_bytes: 3317
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:33:26Z }
---

# Objetivo

Panel modal DOM sobre el marco 16:9, abierto con `I` solo en el turno del jugador
activo, con equipo, mochila y objetos del suelo del tile. Gestión completa por
teclado, foco visible, comparación antes de equipar, desglose de stats al
confirmar y motivo de rechazo en texto. `G` y `1`-`3` dejan de gestionar equipo.

# No objetivos

- Sprites, cues de inventario y `F1` (TASK-0096); documentación (TASK-0097);
  cobertura E2E/visual nueva (TASK-0098).
- Reglas, costes, catálogo, operaciones del motor, cofres, traits, REQ-019/020.

# Invariantes

- Host presenta; no valida huecos, manos ni capacidad ni recalcula reglas. Usa
  `effectiveStats`/`aggregateEffectiveStats` como único punto de agregación.
- Panel en DOM, nunca Canvas; `role="dialog"`, `aria-modal`, foco atrapado y
  visible, `Escape` cierra.
- Abrir no cuesta MP ni acción. Cada operación se despacha solo al confirmar; un
  rechazo no cambia estado y explica su motivo.
- Con el panel abierto el mapa no acepta comandos. No se abre en fase enemiga,
  con animación activa ni sin jugador vivo (preparado para fantasma).
- El panel se refresca con `presentationState`, no con el snapshot final; no
  adelanta el objeto de un cue de recogida/equipo.
- `src/game/` no importa `src/host/`; sin dependencias nuevas.

# Criterios de aceptación

En `../../../docs/tasks/TASK-0095-host-panel-inventario-equipo.md`, sección
«Criterios de aceptación»; no se copian.

# Contexto mínimo

- `index.html`: nodos del HUD y marco; añade panel y `data-testid`.
- `src/host/input.ts`: retira `G` y `1`-`3`, añade `I`/`Escape` del panel y
  actualiza `isManagedKey`.
- `src/host/main.ts`: teclado, `applyCommand`, `presentationState` y refresco;
  bloquea comandos del mapa y abre fuera del bucle de render.
- `src/host/hud.ts`: `KEYS_HELP` y `weaponHint` sin `G`.
- `src/host/presentation.ts`/`motion.ts`: cues `PickUp`/`SelectWeapon`;
  `UnequipItem`/`DropItem` no tienen cue propio.
- `src/game/{inventory,types,equipment,stats}.ts`: comandos, huecos, catálogo y
  stats. `SelectWeapon` puede quedar como tipo legacy para `tsc`, sin teclas.
- [REQ-018](../../../docs/requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-008/T-009 y R-015 a R-017; [panel](../../../docs/design/architecture.md#render-del-host);
  [controles](../../../docs/design/turn-economy.md#controles-provisionales).
- Tests: `tests/unit/host/{input,hud,equipment-integration}.test.ts`. No añadas
  E2E; TASK-0098 cubre navegador. No borres ni debilites specs E2E: los dejó
  desalineados TASK-0094 y se actualizan en TASK-0098.

# Artefactos

`report.md`, `verify-output.txt`, `focused-test-output.txt`, `logs/`; captura
manual opcional, no sustituye a TASK-0098.

# Riesgos y decisiones abiertas

- Foco y tabulación: estructura comprensible equipo → mochila → suelo, probada
  sin ratón.
- Refresco durante beats: leer `presentationState` también con animación activa.
- Sin decisiones creativas abiertas: no inventes estilos, iconos ni contenido.
