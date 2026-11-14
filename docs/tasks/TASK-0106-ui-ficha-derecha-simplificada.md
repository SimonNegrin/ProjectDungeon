---
type: Task
id: TASK-0106
title: "UI: ficha derecha simplificada"
description: "Eliminar el tipo duplicado, subtítulos y descripciones de la ficha derecha; mostrar sprite y stats verticales y dejar los traits solo cuando existan."
status: draft
task_status: ready
task_type: feature
requirement: REQ-033
requirement_ids: [R-001, R-009, R-010, R-011, T-006]
depends_on: [TASK-0104]
unlocks: [TASK-0107, TASK-0109]
created_at: 2026-11-14T12:02:44Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0106/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
---

# Objetivo

Que la ficha del HUD derecho se lea como una ficha de objeto compacta: título,
sprite, stats en vertical y traits solo si existen, sin rótulos ni párrafos
redundantes.

# Contexto

La ficha actual repite el tipo en eyebrow y subtítulo, agrupa los stats en una
línea y muestra descripciones y estados vacíos. REQ-033 R-009/R-010/R-011 fija la
composición y TASK-0104 aporta la base visual.

# Criterios de aceptación

- [ ] Se elimina el tipo duplicado: no se repite el mismo dato en eyebrow, título
      y subtítulo; se conserva un único indicador cuando aporta.
- [ ] El objeto muestra su sprite además del título.
- [ ] Los stats van en lista vertical, uno por línea (`+3 Acierto`, `+8 Daño`,
      `+1 Absorción`, `+1 Defensa`), sin título «Stats».
- [ ] Los traits se muestran solo si existen; sin traits no queda hueco ni texto.
- [ ] Las descripciones de objeto desaparecen.
- [ ] Con el panel abierto, la ficha mantiene dos secciones enmarcadas y con fondo
      distinto: seleccionado y equipado; la primera no dice «Seleccionado» y la
      segunda conserva «Equipado».
- [ ] El bloque vacío dice «Vacío» y no inventa stats ni traits.
- [ ] El detalle del cursor sigue respetando la línea de visión y el tipo
      «Desconocido».

# Plan de test

- Unitario: composición por tipo (enemigo, aliado, objeto, terreno), con/sin
  traits, con/sin equipado y stats múltiples.
- Integración: `pnpm run verify`; DOM sin «Stats» ni «Seleccionado» visibles.
- E2E: navegar objetos con y sin traits; abrir/cerrar el panel; comprobar sprite y
  filas verticales.
- Manual: captura de la ficha a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0106/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas de objeto con/sin traits y de las dos secciones
- [ ] Commit SHA

# Restricciones

- Sin cambios en reglas, inventario, costes ni navegación.
- No se implementa el panel ni el cursor.
- Se conservan los tokens y la escala de TASK-0104.

# No objetivos

- HUD izquierdo, panel, cursor o QA visual final.
- Cambiar la información que revela la línea de visión.
