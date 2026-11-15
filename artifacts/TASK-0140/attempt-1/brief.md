---
type: Task Brief
title: "TASK-0140: brief del intento 1"
description: Cablear Guardar para descargar un único .zip construido desde el estado del motor.
task: TASK-0140
attempt: 1
status: stable
brief_bytes: 2378
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:37:09Z }
---

# Objetivo

Cablear el efecto `save` de la pausa (hoy no-op): construir `manifiesto.json` y
`partida.json` desde `session.state`, empaquetarlos con el contenedor existente y
descargar un único `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` UTC. Errores
visibles y sin descarga parcial. Solo en fase de personajes, sin animación ni
paneo.

# No objetivos

- Cargar `.zip`/`.json`, selector, confirmación, slots, nube o cifrado.
- Cambiar esquema v1, contenedor, dependencias o red.
- Cambiar el contrato del menú: cinco acciones, orden y estados.
- Guardar presentación, cámara, cursor, panel o tras el resultado.

# Invariantes

- `buildSaveFiles` (`src/game/save.ts`) es la única serialización; el host no
  duplica campos.
- `writeSaveZip` (`src/host/save-zip.ts`) es el único contenedor; no tocar
  límites ni nombres.
- La disponibilidad la decide `pause-menu.ts`; fuera de la pausa no hay atajo.
- Construir y comprimir antes de descargar: si falla, mensaje visible y nada se
  descarga.
- No debilitar ni borrar tests existentes.

# Criterios de aceptación

`docs/tasks/TASK-0140-host-guardar-zip.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/main.ts`: `handlePauseTransition`, caso `'save'`.
- `pause-menu.ts`, `pause-menu-view.ts`, `index.html`, `ui.css`: disponibilidad,
  foco y mensaje de error.
- `buildSaveFiles(state, { gameVersion, createdAt })` y
  `writeSaveZip({ manifest, save })`.
- REQ-024
  [R-003/R-004/R-015](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
  y [T-002/T-009](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos).
- `package.json` 0.1.0 como `game_version`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y el `.zip` de muestra o hash.

# Riesgos y decisiones abiertas

- Descarga con `Blob` + `a.download`; verificar nombre, `unzip`/hash y contenido.
- Mensaje de error sin romper foco ni las cinco acciones; región viva.
- Timeouts: focalizado 120 s; `verify` 240 s; E2E 180 s.
