---
type: Task Brief
title: "TASK-0141: brief del intento 1"
description: Un cargador compartido para .zip/.json desde menú y pausa.
task: TASK-0141
attempt: 1
status: stable
brief_bytes: 2591
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:00:00Z }
---

# Objetivo

Un único módulo de carga en el host que acepte `.zip` y `.json`, valide y
sustituya la partida. Menú principal: carga directa; pausa: confirma antes. Tras
cargar, cierra la pausa y deja fase/ronda/activo, cámara en el activo y HUD
redibujado desde el estado.

# No objetivos

- Guardar, descargar o cambiar el esquema v1 (TASK-0137/0138/0140).
- Reinicio rápido, nube, migraciones, reparar archivos o cargar tras resultado.

# Invariantes

- Un solo módulo de carga/validación y un solo selector de archivo para ambos
  orígenes.
- `readSaveZip` ya aplica T-006 (límites, rutas y extras): no duplicar ni
  relajar.
- En `.zip`, cruzar manifiesto con estado: semilla, turno/ronda, fase y jugadores
  (nombre/arquetipo) deben coincidir; si no, rechazo.
- No restaurar animación, feedback, cámara, cursor ni panel: cancelar y limpiar;
  sin beats pendientes ni aviso de ronda.
- Archivo inválido: mensaje visible y partida en curso intacta.

# Criterios de aceptación

`docs/tasks/TASK-0141-host-cargar-zip-json-menu-pausa.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/main.ts`: `confirmLoadGame` y `onLoadRequested` son stubs; `render`,
  `setupState`, `resumeFromPause` y `startPartySession` marcan la limpieza.
- `src/host/save-zip.ts` (`readSaveZip`) y `src/game/save.ts` (`parseSave`,
  `readSaveFiles`, `parseManifest`).
- `pause-menu.ts` (efecto `confirm-load`), `pause-menu-view.ts` (región viva) y
  `start-screen-view.ts` (`start-load`, `start-status`); `index.html`.
- REQ-024 [R-005/R-006/R-008/R-009](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
  y [T-005/T-006/T-015/T-016](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos).
- `tests/e2e/pause-menu.spec.ts` afirma que no hay `input[type=file]` tras
  confirmar; actualízalo al selector nuevo.

# Artefactos

`artifacts/TASK-0141/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, `screenshots/`, `logs/`; test nuevo
`tests/unit/host/load-game.test.ts` y E2E de carga `.zip`/`.json`.

# Riesgos y decisiones abiertas

- `render()` sin animación centra en `players[0]`; al cargar con otro activo hay
  que centrar en el activo sin alterar el resto.
- Reconstruir HUD sin conservar selección de panel ni modales.
