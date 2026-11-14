---
type: Task
id: TASK-0116
title: "UI: cursor del panel alineado con el mapa"
description: "Pintar el cursor del panel en amarillo pálido con borde de 4×, por encima del panel salvo el submenú, y animar cualquier cambio de slot."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-033
requirement_ids: [R-024, R-030, R-031, T-014, T-018]
depends_on: [TASK-0112, TASK-0114]
unlocks: [TASK-0117]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0116/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Que el cursor del panel use el mismo amarillo pálido que el cursor del mapa, con
un borde claramente más grueso, se pinte por encima de todo el panel salvo el
submenú y se perciba al cambiar de slot en cualquier dirección.

# Contexto

El cursor actual usa `--ui-focus`, borde de 1× y una transición de 100 ms que solo
se aplica entre vecinos horizontales de la misma fila; el resto salta. REQ-033 v7
R-030 y R-031 fijan `--ui-text`, borde de 4×, orden de capas y 140-160 ms para
cualquier cambio de slot.

# Criterios de aceptación

- [ ] El cursor usa `--ui-text` (#fcffc0) y un borde de `4 × --ui-line`.
- [ ] El borde es claramente más grueso que el bisel de las cajas y el sprite y
      el bisel del slot siguen visibles.
- [ ] El cursor se pinta por encima de columnas, slots, títulos y figura, y por
      debajo del submenú contextual.
- [ ] Al cambiar de slot en horizontal, vertical o entre columnas, el cursor
      anima con una transición de 140-160 ms.
- [ ] Abrir el panel, hacer scroll, redimensionar, actualizar el modelo o usar
      `prefers-reduced-motion` coloca el cursor al instante.
- [ ] El foco DOM sigue en el slot activo y las pulsaciones rápidas no
      desincronizan el cursor.
- [ ] El cursor se mueve con `transform` y no produce Content Shift.
- [ ] Los tests de cursor existentes se adaptan a la nueva regla sin retirar
      cobertura.

# Plan de test

- Unitario: `cursorTransition` anima cualquier cambio entre slots y devuelve
  `instant` en reapertura, scroll, resize, actualización y movimiento reducido.
- Integración: `pnpm run verify`; comprobar color, grosor y `z-index` calculados.
- E2E: navegación horizontal, vertical y entre columnas con muestras de
  `transform`; abrir el submenú y comprobar que queda por encima; modo reducido.
- Manual: revisar que la animación se percibe sin sentirse lenta.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0116/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas o vídeo corto del cursor y del submenú
- [ ] Commit SHA

# Restricciones

- Sin cambios de navegación, foco, reglas ni contenido del panel.
- Sin tocar el cursor del mapa.
- Sin cambios en las siluetas ni en la figura.
- No se debilitan tests existentes.

# No objetivos

- QA visual final (TASK-0117) y documentación (TASK-0118).
- Cambiar el color o el ancho del cursor del mapa.
