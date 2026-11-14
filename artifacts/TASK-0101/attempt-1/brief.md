---
type: Task Brief
title: "TASK-0101: brief del intento 1"
description: Panel de inventario en tres columnas con figura de equipo y navegación espacial.
task: TASK-0101
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:20:00Z }
---

# Objetivo

Sustituir la rejilla del panel por tres columnas de un tercio: figura de ocho
huecos, mochila de ocho casillas y cadáveres/suelo con scroll propio. Flechas o
`WASD` saltan al objeto más próximo de un plano único (REQ-032 N-001 a N-010).
No cambian reglas, costes ni catálogo.

# No objetivos

- Ficha en el HUD derecho y submenú con `Enter`: TASK-0102.
- Cadáveres con inventario (REQ-021), cofres (REQ-020), arte nuevo o reglas.
- E2E/QA visual final del hito, arquitectura y glosario.

# Invariantes

- Modal solo sobre la franja del mapa, ambos HUD visibles, `I`/`Escape` y mapa
  bloqueado.
- Tokens de `src/host/ui.css`; sin literales nuevos, radios ni sombras difusas en
  el panel.
- Motor, costes, capacidad, catálogo y snapshot intactos; abrir, navegar y cerrar
  no gastan MP ni acción.
- Sin dependencias nuevas. No se borra ni se salta ningún test: los de la
  presentación anterior se actualizan al contrato nuevo.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0101-panel-tres-columnas-figura.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/inventory-panel.ts`: modelo puro; conserva comparaciones y comandos
  aunque la rejilla deje de pintarlos.
- `src/host/inventory-panel-view.ts`: vista, foco y despacho; aquí vive la
  navegación.
- `index.html` y `src/host/ui.css`: marcado, estilos y tokens.
- `src/host/main.ts`: apertura, refresco y bloqueo; la selección es del host, no
  del motor.
- REQ-032 R-008 a R-010, R-013 y
  [`#navegación-del-panel`](../requirements/REQ-032-estilo-visual-interaccion-ui.md#navegación-del-panel);
  REQ-018 R-015/T-008.
- **Lee [brief-detalle.md](brief-detalle.md)**: layout, algoritmo de vecino,
  foco, puente de acciones y tests que cambian.

# Artefactos

`artifacts/TASK-0101/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/` (1280×720 y 900×700) y
commit en `task/TASK-0101`.

# Riesgos y decisiones del lead

- N-011 se verifica en TASK-0102; aquí N-001 a N-010 y `Tab` por zonas.
- Las operaciones siguen por teclado con una barra de acciones del seleccionado;
  no es el submenú y `Enter` no lo abre.
- Scroll: a 1280×720 sin desbordamiento; a 900×700 solo la columna derecha puede
  desplazarse.
