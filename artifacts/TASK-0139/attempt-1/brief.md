---
type: Task Brief
title: "TASK-0139: brief del intento 1"
description: Pausa global con Esc, menú de cinco acciones, congelación y bloqueo de input.
task: TASK-0139
attempt: 1
status: stable
brief_bytes: 2621
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T16:59:14Z }
---

# Objetivo

Que `Esc` abra una pausa modal real en cualquier fase, congele animación y
feedback, ignore el input de juego y muestre el menú Reanudar, Nueva partida,
Cargar partida, Guardar partida y Controles. Contrato técnico en
`brief-detalle.md`.

# No objetivos

- Descargar, leer o validar archivos; guardado y carga funcionales.
- Resultado, audio, remapeo, pausa por jugador, cámara/paneo nuevos.
- Cambiar motor, requisitos, arnés, dependencias o reglas.

# Invariantes

- Pausa, menú y teclas en `src/host/**`; `src/game/**` no conoce el menú.
- Abrir/reanudar no despacha comandos ni altera el estado; los relojes de
  animación y feedback se congelan y siguen desde el mismo punto.
- `Esc`: panel abierto → ciérralo; lista de hechizos abierta → ciérrala; si no,
  abre/cierra pausa. En raíz reanuda; en submenú/aviso vuelve a raíz.
- Orden fijo, teclado y foco visible. Guardar desactivado con motivo textual
  fuera de fase de personajes, animación o paneo. `R` deja de reiniciar y no
  aparece en controles.
- Lista de controles y ayuda del HUD desde un único mapa de teclas.
- Cambia los E2E que pulsaban `R` a `restart(page)`/dispatch, conservando su
  intención, y añade el test de que `R` se ignora. No debilites tests.

# Criterios de aceptación

En `docs/tasks/TASK-0139-host-pausa-global-menu-cinco-botones.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/main.ts`: bucle, `tick`, `textTick`, `advanceForTest`, keydown,
  `startScreenView`, overlays y reset de presentación.
- `input.ts`, `notices.ts`, `hud.ts`, `start-screen-view.ts`, `index.html` y
  `ui.css`.
- REQ-024
  [R-001/R-002/R-003/R-007/R-011/R-013](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
  y [T-007/T-008/T-014](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos).

# Artefactos

`report.md`, `test-output.txt`, `e2e-output.txt`, `verify-output.txt`,
`commit.txt` y capturas E2E en `tests/e2e/<spec>/screenshots/`.
# Riesgos

- Foco atrapado y `Esc` sin doble listener que compita con el host.
- Guardar debe seguir desactivado al abrir la pausa a mitad de animación.
- En `?test=1` no hay pantalla de inicio: «Nueva partida» solo cierra la pausa.
- Timeouts: focalizados 120 s; `pnpm run verify` 240 s; E2E 180 s.
