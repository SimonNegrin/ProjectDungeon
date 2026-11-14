---
type: Task
id: TASK-0117
title: "QA visual de la corrección de UI v7"
description: "Cubrir en navegador y capturas el relieve de 2×, las listas verticales, el panel alineado, las siluetas y el cursor nuevo a 900×700 y 1280×720."
status: stable
task_status: backlog
task_type: test
requirement: REQ-033
requirement_ids: [R-025, R-026, R-027, R-028, R-029, R-030, R-031, S-006, P-007, P-008, T-008]
depends_on: [TASK-0112, TASK-0113, TASK-0114, TASK-0115, TASK-0116]
unlocks: [TASK-0118]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0117/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Demostrar con Playwright, medidas y capturas que la corrección de UI v7 se ve y
se comporta como fija REQ-033, sin defectos de relieve, alineación, siluetas,
capas o movimiento.

# Contexto

Las tareas TASK-0112 a TASK-0116 cambian relieve, listas, composición del panel,
siluetas y cursor. Esta tarea es solo de verificación visual: no corrige código.
Si encuentra un defecto, lo documenta y devuelve `blocked` con evidencia.

# Criterios de aceptación

- [ ] Un spec E2E nuevo o ampliado cubre los estados clave a 900×700 y 1280×720.
- [ ] Se mide el bisel de cajas y slots, se comprueba el área interior y se
      verifica que no hay solapes ni CLS.
- [ ] Se comprueba que cada stat y trait ocupa su línea en ambos HUD, sin `·`.
- [ ] Se comprueba que las tres columnas empiezan arriba, que el casco es el
      primer slot y que no hay bloque de cabeza.
- [ ] Se comprueba que los ocho slots vacíos muestran su silueta y que el slot
      lleno no la muestra.
- [ ] Se comprueba el color y grosor del cursor, su orden bajo el submenú y su
      animación en horizontal, vertical y entre columnas.
- [ ] Se comprueba el modo `prefers-reduced-motion`.
- [ ] Las capturas y los logs JSON quedan en `artifacts/TASK-0117/attempt-1/`.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan sin debilitar tests.

# Plan de test

- Integración: `pnpm run verify`.
- E2E: spec de QA visual con capturas y logs de geometría, paleta, capas,
  transición y CLS.
- Manual: revisar las capturas de ambos tamaños y anotar cualquier defecto.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0117/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas en `<spec>/screenshots/` y logs en `<spec>/logs/`
- [ ] Commit SHA

# Restricciones

- Sin cambios en `src/**`, `index.html`, `public/**` ni reglas.
- Si un criterio falla, no se parchea aquí: se devuelve `blocked` con la captura
  o la medida que lo demuestra.
- No se debilitan ni se saltan tests existentes.

# No objetivos

- Implementar correcciones de UI.
- Documentación final (TASK-0118).
