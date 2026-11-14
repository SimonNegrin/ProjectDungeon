---
type: Task Brief
title: "TASK-0100: brief del intento 1"
description: Pantalla en tres zonas con HUD izquierdo del jugador y derecho de detalle por cursor, sin HUD superior.
task: TASK-0100
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:30:00Z }
---

# Objetivo

Retirar el HUD superior y componer la pantalla en tres zonas dentro del marco
16:9: ficha del jugador activo a la izquierda, mapa de 13×13 intacto en el centro
y detalle por tipo de la casilla bajo el cursor a la derecha. Los mensajes,
avisos, banners y ayudas de REQ-017 siguen visibles y con el mismo
comportamiento, reanclados dentro del marco.

# No objetivos

- Panel de tres columnas, figura de equipo, ficha del objeto seleccionado y
  submenú contextual (TASK-0101).
- Cofres y contenedores de REQ-020, traits de REQ-019 y mecánica de fantasma de
  REQ-021: no inventar datos ni tocar `src/game/**`.
- Cambiar el viewport de 13×13, el 16:9, la resolución lógica, las teclas o las
  reglas del motor.

# Invariantes

- El mapa no encoge ni pierde casillas visibles a 1280×720 ni a 900×700.
- No queda HUD de juego fuera del marco; `[data-testid="hud"]` y sus campos
  siguen existiendo dentro del marco.
- `hud-message`, `hud-keys`, `hud-suggestion`, banners y marcadores conservan sus
  test IDs, visibilidad y comportamiento; no se debilita ningún test.
- Los estilos nuevos usan solo tokens y escalas de `src/host/ui.css`; sin
  literales nuevos de color o grosor y sin `rgba(...)` sueltos en lo tocado.
- La consulta del cursor es de solo lectura: no cambia snapshot, RNG, percepción
  ni costes.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0100-pantalla-tres-zonas-hud.md#criterios-de-aceptación`;
no se copian.

# Contexto mínimo

- `index.html`: barra superior actual y contenedor `[data-testid="hud"]`.
- `src/host/hud.ts`: modelo y vista del HUD; extrae composición pura por tipo.
- `src/host/layout.ts` y `src/host/main.ts`: marco, offsets, cámara, render,
  cursor y actualización por tile.
- `src/host/ui.css`: tokens, escalas y `--ui-line` de TASK-0099; migra el HUD.
- REQ-022/023 v3, REQ-017 y REQ-032; anclajes de feedback actuales.
- `tests/unit/host/hud.test.ts`, `layout.test.ts`, `ui-foundations.test.ts` y
  specs E2E que usan `data-testid` del HUD.

# Detalle obligatorio

Leer `brief-detalle.md`: estructura de las tres zonas, contenido por tipo,
inventario de test IDs, deuda de datos de REQ-019/021, pruebas y capturas.

# Artefactos

`artifacts/TASK-0100/attempt-1/`: `report.md`, `verify-output.txt`,
`test-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`; commit en
`task/TASK-0100`.

# Riesgos y decisiones abiertas

- Cambiar el DOM del HUD puede romper E2E existentes: conserva test IDs y
  semántica; si una información cambia de sitio, actualiza el test con una
  aserción equivalente, nunca la elimines.
- La columna derecha debe caber a 900×700 sin scroll ni recorte: recorta
  contenido secundario, no la escala tipográfica.
- Si un criterio exige una decisión creativa o un dato que no existe, para y
  devuelve `blocked` con evidencia.
