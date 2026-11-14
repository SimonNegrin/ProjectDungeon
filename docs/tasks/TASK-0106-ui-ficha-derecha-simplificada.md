---
type: Task
id: TASK-0106
title: "UI: ficha derecha simplificada"
description: "Eliminar el tipo duplicado, subtítulos y descripciones de la ficha derecha; mostrar sprite y stats verticales y dejar los traits solo cuando existan."
status: stable
task_status: done
task_type: feature
requirement: REQ-033
requirement_ids: [R-001, R-009, R-010, R-011, T-006]
depends_on: [TASK-0104]
unlocks: [TASK-0107, TASK-0109]
created_at: 2026-11-14T12:02:44Z
completed_at: 2026-11-14T13:17:35Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0106/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
  - by: task-lead
    at: 2026-11-14T13:17:35Z
    note: >-
      Intento 1 verificado (código `e493472`, tests `b8f574e`, evidencia
      `5431fe8`; fusión `ad913e6`). La ficha elimina subtítulos, descripciones,
      la fila «Stats» y «Sin traits activos»; el objeto muestra sprite de
      `items.png` y stats verticales (`+2 Acierto`, `+5 Daño`, …) con valor
      delante. El eyebrow se oculta cuando repite el título; el terreno ya no
      repite su tipo en una fila. Con el panel abierto se mantienen dos
      secciones `ui-outset`: seleccionado sin «Seleccionado» y equipado con
      «Equipado»; el hueco vacío dice «Vacío» sin sprite, stats ni traits. La
      línea de visión y «Desconocido» siguen cubiertos. Reejecutados con timeout
      `pnpm run verify` (120 s: docs, config, 1309/1309, tsc, build y bundle) y
      `pnpm run test:e2e` (180 s: 166/166), sin procesos huérfanos. Revisado el
      diff completo: `src/host/**`, `index.html`, `tests/**` y artefactos; sin
      cambios en `src/game/**`, requisitos, arnés, plantillas, dependencias ni
      tareas 0107-0110. Las aserciones retiradas se sustituyeron por ausencia y
      cobertura equivalente, sin debilitar tests. Capturas revisadas a 900×700 y
      1280×720. La fricción del catálogo sin traits queda `deferred` a
      `harness-keeper` por ser un fixture de test.
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

- [x] Se elimina el tipo duplicado: no se repite el mismo dato en eyebrow, título
      y subtítulo; se conserva un único indicador cuando aporta.
- [x] El objeto muestra su sprite además del título.
- [x] Los stats van en lista vertical, uno por línea (`+3 Acierto`, `+8 Daño`,
      `+1 Absorción`, `+1 Defensa`), sin título «Stats».
- [x] Los traits se muestran solo si existen; sin traits no queda hueco ni texto.
- [x] Las descripciones de objeto desaparecen.
- [x] Con el panel abierto, la ficha mantiene dos secciones enmarcadas y con fondo
      distinto: seleccionado y equipado; la primera no dice «Seleccionado» y la
      segunda conserva «Equipado».
- [x] El bloque vacío dice «Vacío» y no inventa stats ni traits.
- [x] El detalle del cursor sigue respetando la línea de visión y el tipo
      «Desconocido».

# Plan de test

- Unitario: composición por tipo (enemigo, aliado, objeto, terreno), con/sin
  traits, con/sin equipado y stats múltiples.
- Integración: `pnpm run verify`; DOM sin «Stats» ni «Seleccionado» visibles.
- E2E: navegar objetos con y sin traits; abrir/cerrar el panel; comprobar sprite y
  filas verticales.
- Manual: captura de la ficha a 900×700 y 1280×720.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0106/attempt-1/report.md`
- [x] Salida de `pnpm run verify` y del test E2E
- [x] Capturas de objeto con/sin traits y de las dos secciones
- [x] Commit SHA

# Restricciones

- Sin cambios en reglas, inventario, costes ni navegación.
- No se implementa el panel ni el cursor.
- Se conservan los tokens y la escala de TASK-0104.

# No objetivos

- HUD izquierdo, panel, cursor o QA visual final.
- Cambiar la información que revela la línea de visión.
