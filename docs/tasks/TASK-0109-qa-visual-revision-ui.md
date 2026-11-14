---
type: Task
id: TASK-0109
title: "QA visual de la revisión de UI"
description: "Cubrir en navegador escala, paleta, tres zonas, ficha, panel, slots, cadáveres, cursor y CLS con capturas a 900×700 y 1280×720."
status: draft
task_status: in_progress
task_type: test
requirement: REQ-033
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, R-016, R-018, R-019, R-020, R-021, R-022, R-023, R-024, T-008]
depends_on: [TASK-0105, TASK-0106, TASK-0107, TASK-0108]
unlocks: [TASK-0110]
created_at: 2026-11-14T12:02:44Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0109/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
---

# Objetivo

Que la revisión visual de REQ-033 quede verificada en navegador real, con
capturas legibles a 900×700 y 1280×720 y sin regresiones de interacción.

# Contexto

TASK-0104 a TASK-0108 implementan escala, HUD, ficha, panel y cursor. Esta tarea
no rediseña: mide, captura y reporta. Si algo no encaja, el defecto vuelve a la
tarea correspondiente.

# Criterios de aceptación

- [ ] Capturas a 900×700 y 1280×720 de: tres zonas, HUD izquierdo con/sin maná y
      traits, ficha de objeto con/sin traits, panel con mochila llena, panel sin
      cadáveres, panel con cadáveres y suelo con objetos.
- [ ] La escala es continua: la relación entre tamaños y la altura del marco se
      mantiene; no hay saltos al redimensionar.
- [ ] La paleta y el relieve se ven: ocho colores, outset en marcos y zonas, inset
      en slots, sin radios ni sombras suaves.
- [ ] La ficha derecha no muestra «Seleccionado», tipo duplicado, «Stats» ni
      descripciones; el sprite se ve y los stats van en vertical.
- [ ] Los slots de item son cuadrados e iguales en las tres columnas; los sprites
      están centrados, completos y sin desborde.
- [ ] La sección de cadáveres no existe sin cadáveres; con cadáveres muestra sprite
      y nombre o tipo.
- [ ] El cursor superpuesto sigue al foco, no tapa sprite ni bisel, salta en
      cambios grandes/scroll y no anima con movimiento reducido.
- [ ] No hay CLS del marco, títulos ni columnas al abrir/cerrar, navegar, equipar,
      recoger/soltar o cambiar de tile.
- [ ] La distribución de tres columnas encaja a 900×700; si no, se reporta para
      abrir la tarea condicional del layout alternativo.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan; no se debilitan tests.

# Plan de test

- Integración: `pnpm run verify`.
- E2E / visual: suite completa y specs focalizados de HUD, ficha, panel, cursor y
  CLS; capturas con `E2E_ARTIFACTS_DIR` en `<spec>/screenshots/`.
- Manual: revisar las capturas y anotar cualquier desviación con ruta y estado.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0109/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y `pnpm run test:e2e`
- [ ] Capturas en `artifacts/TASK-0109/attempt-1/`
- [ ] Logs de CLS y geometría
- [ ] Commit SHA

# Restricciones

- No se cambia la UI ni los criterios para hacer pasar la tarea.
- Los defectos se reportan y vuelven a la tarea de implementación.
- Sin cambios en reglas, costes ni navegación.

# No objetivos

- Implementar la distribución alternativa.
- Actualizar documentación de diseño o ADR; eso va en TASK-0110.
