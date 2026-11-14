---
type: Task
id: TASK-0111
title: "UI: retrato del HUD por jugador activo"
description: "Hacer que la miniatura de la zona Personaje muestre el sprite del jugador activo y cambie con él, manteniendo la escala y la paleta de REQ-033."
status: stable
task_status: done
task_type: feature
requirement: REQ-022
requirement_ids: [R-002]
depends_on: [TASK-0105]
unlocks: []
created_at: 2026-11-14T14:39:33Z
completed_at: 2026-11-14T14:55:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0111/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:39:33Z }
verified:
  - by: task-lead
    at: 2026-11-14T14:55:00Z
    note: >-
      Intento 1 verificado (código `4bbbbf6`, informe `99a85c9`, evidencia
      `08ca631`; fusión `315533c`). Reejecutados `pnpm run verify` (93
      archivos, 1319/1319, tsc, build y bundle) y `pnpm run test:e2e`
      (187/187) con timeouts de 300 s y 360 s. `hud-portrait` pinta el recorte
      32×32 del arquetipo activo desde `PORTRAIT_RECTS`: guerrero `0,32`,
      mago `32,128` y pícaro `96,0`, distintos a 900×700 y 1280×720 y con
      `image-rendering: pixelated`. Retrato, nombre y arquetipo cambian en el
      mismo render con `window.__game.setup`, sin recarga; las cajas de
      retrato, nombre y zona Personaje quedan estables (±1 px). Revisado el
      diff completo: `src/host/hud.ts`, guarda de arquetipo desconocido en
      `src/host/hud-detail.ts`, tests nuevos y artefactos; sin cambios en
      `src/game/**`, `index.html`, requisitos, arnés, plantillas,
      dependencias ni render del mapa, y sin tests debilitados. Capturas de
      los tres personajes revisadas. Fricción del brief (`--ui-unit` × px)
      rechazada como cambio de arnés: es un error local del brief y la
      plantilla no fija fórmulas.
---

# Objetivo

Que la zona Personaje del HUD izquierdo muestre la miniatura del sprite del
jugador activo, de modo que miniatura, nombre y arquetipo cambien juntos al
cambiar de jugador.

# Contexto

REQ-022 R-002 exige una miniatura del sprite del personaje activo. El QA de
TASK-0109 detectó que el retrato no varía entre guerrero, mago y pícaro: el
nombre y el arquetipo sí cambian, pero la miniatura es estática. Es un defecto
previo a REQ-033 y queda fuera de su alcance; esta tarea lo corrige sobre el HUD
ya recompuesto en TASK-0105, sin tocar su disposición, escala ni paleta.

# Criterios de aceptación

- [x] La zona Personaje muestra la miniatura del sprite del jugador activo.
- [x] Al cambiar de jugador activo, la miniatura cambia en el mismo turno que el
      nombre y el arquetipo.
- [x] Guerrero, mago y pícaro muestran cada uno su miniatura correcta.
- [x] La miniatura usa el sprite existente del catálogo, sin interpolación
      (`image-rendering: pixelated`), y respeta la escala y la paleta de REQ-033.
- [x] No aparecen huecos, saltos de layout ni Content Shift al cambiar de
      jugador.
- [x] No cambian reglas, estado, inventario ni navegación.

# Plan de test

- Unitario: composición de la zona Personaje para cada jugador del roster, con
  sprite, nombre y arquetipo coherentes.
- Integración: `pnpm run verify`; árbol del HUD con la miniatura esperada y sin
  nodos vacíos.
- E2E / visual: cambiar de jugador activo y capturar guerrero, mago y pícaro a
  900×700 y 1280×720; comprobar que la miniatura cambia sin mover el layout.
- Manual: alternar jugadores y comparar la miniatura con el sprite del mapa.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0111/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas de los tres personajes a 900×700 y 1280×720
- [ ] Commit SHA

# Restricciones

- Sin arte nuevo: se usan los sprites existentes del roster.
- Sin cambios en `src/game/**`, reglas, costes, inventario ni navegación.
- Se conservan la disposición, la escala y los tokens de TASK-0104/TASK-0105.
- No se reabre el resto de REQ-033 ni se toca el retrato fuera de la zona
  Personaje.

# No objetivos

- Cambiar el nombre, el arquetipo o la condición fantasma, que ya funcionan.
- Rediseñar las otras zonas del HUD, la ficha o el panel.
- Añadir retratos o arte nuevos.
