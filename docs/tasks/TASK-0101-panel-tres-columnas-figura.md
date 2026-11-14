---
type: Task
id: TASK-0101
title: "Panel de inventario en tres columnas con figura de equipo"
description: "Sustituir la rejilla actual por tres columnas: figura humana con ocho huecos, mochila de ocho casillas y columna de cadáveres y suelo con scroll, con navegación por proximidad."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-018
requirement_ids: [R-015, T-008]
depends_on: [TASK-0099, TASK-0100]
unlocks: [TASK-0102]
created_at: 2026-11-14T00:20:17Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0101/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:20:17Z }
verified:
---

# Objetivo

Que el panel de inventario se lea de un vistazo como una figura con equipo, una
mochila y un montón del suelo, y que se navegue con flechas o `WASD` saltando al
objeto más próximo, sin stats en la rejilla.

# Contexto

- El panel actual vive en `src/host/inventory-panel.ts` y
  `src/host/inventory-panel-view.ts`, con una rejilla de tres secciones y los
  stats dentro; los estilos, en `src/host/ui.css`.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md) v6 R-015/T-008 fija las
  tres columnas, la rejilla sin stats y el suelo siempre visible.
- [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) v2, apartado
  [Navegación del panel](../requirements/REQ-032-estilo-visual-interaccion-ui.md#navegación-del-panel)
  (N-001 a N-011), R-008 a R-010 y R-013.
- El modal ya se limita al mapa y deja visibles ambos HUD (TASK-0100); `Escape` e
  `I` cierran y el mapa queda bloqueado.
- Las operaciones y sus costes ya existen (TASK-0094): aquí cambian presentación y
  navegación, no reglas.

# Criterios de aceptación

- [ ] El panel tiene tres columnas de un tercio: equipamiento, mochila y
      cadáveres/suelo; sigue siendo modal solo sobre el mapa, con ambos HUD
      visibles, `I`/`Escape` y el mapa bloqueado.
- [ ] El equipamiento son ocho huecos en figura humana con posiciones absolutas
      —casco arriba, collar y anillo junto al cuello, armadura en el torso,
      guantes en las manos, arma y escudo en las manos y botas abajo—, cada uno
      con su icono, nombre accesible y estado; los vacíos se ven y no se
      seleccionan.
- [ ] La mochila son ocho casillas en el centro, y la rejilla no muestra stats ni
      traits.
- [ ] La columna derecha muestra los cadáveres del tile con su nombre apilados
      arriba y el suelo siempre abajo, con scroll propio; con el suelo vacío la
      zona sigue visible y el scroll no arrastra las otras columnas.
- [ ] La navegación cumple N-001 a N-011: flechas o `WASD` al objeto más próximo
      en cada dirección sobre un plano único, solo objetos existentes, sin rebote,
      empates por desviación y orden de lectura, foco conservado y `Tab` por zonas.
- [ ] El foco se ve con la línea de foco y la lista con scroll lo mantiene
      visible; el orden de tabulación no atrapa ni pierde el foco.
- [ ] A 1280×720 el panel completo con mochila llena y cuatro objetos en el suelo
      no hace scroll; a 900×700 se permite scroll en la columna derecha, no en
      todo el panel.
- [ ] Cada operación cuesta 1 MP al ejecutar y un rechazo explica el motivo sin
      mover nada; abrir, navegar y cerrar no gastan MP ni acción.
- [ ] `pnpm run verify` pasa con tests nuevos de navegación (empates, bordes,
      persistencia del foco), estructura del panel y E2E de teclado; sin tests
      debilitados.

# Plan de test

- Unitario: resolución del vecino más próximo en cada dirección, empates, bordes,
  persistencia y reubicación del foco; composición de las tres columnas.
- Integración: operaciones desde el panel con 1 MP y rechazos; estado del panel
  tras equipar, recoger y soltar; modal limitado al mapa.
- E2E / visual: recorrido completo con teclado, suelo vacío, mochila llena y
  capturas 1280×720 y 900×700.
- Manual: reconocer la figura sin leer etiquetas y comparar dos armas.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0101/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Capturas en `artifacts/TASK-0101/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0101`

# Restricciones

- No implementar la ficha del objeto ni el submenú: es TASK-0102.
- No inventar cadáveres con inventario (REQ-021) ni cofres (REQ-020).
- No cambiar reglas, costes, capacidad ni catálogo; el motor no se toca.
- Sin dependencias nuevas; usar los tokens y escalas de `ui.css`.

# No objetivos

- Ficha del seleccionado en el HUD derecho y submenú contextual (TASK-0102).
- E2E y QA visual final, y actualización de arquitectura y glosario.
