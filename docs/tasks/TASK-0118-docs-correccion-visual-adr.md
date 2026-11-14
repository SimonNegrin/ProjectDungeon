---
type: Task
id: TASK-0118
title: "Docs: corrección visual, ADR y glosario"
description: "Reflejar en arquitectura, glosario y ADR el relieve de 2×, las listas verticales, el panel alineado, las siluetas y el cursor nuevo de REQ-033 v7."
status: stable
task_status: done
task_type: docs
requirement: REQ-033
requirement_ids: [T-009]
depends_on: [TASK-0117]
unlocks: []
created_at: 2026-11-14T15:30:34Z
completed_at: 2026-11-14T17:52:00Z
assignee: task-lead
attempts: 1
artifacts: artifacts/TASK-0118/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
  - by: task-lead
    at: 2026-11-14T17:52:00Z
    note: >-
      Intento 1 verificado (contenido pendiente al registrar esta nota; fusión
      pendiente). Reejecutados `pnpm run docs:check` (554 documentos, 118 tareas
      y 6 experimentos) y `pnpm run verify` (94 archivos, 1330/1330, tsc, build
      y bundle). Diff revisado: solo `docs/design/architecture.md`,
      `docs/glossary.md`, `docs/decisions/ADR-026`, ADR-027 nuevo, índice de
      decisiones, ficha y log; sin cambios en `src/**`, tests, requisitos,
      arnés ni plantillas. Arquitectura recoge bisel 2× exterior con la
      cuantización aceptada, listas verticales, panel arriba sin cabeza con
      piernas desbordando, siluetas y cursor 4×/150 ms bajo el submenú; glosario
      añade «silueta de equipamiento» y actualiza cursor/outset/inset; ADR-026
      lleva nota de vigencia y ADR-027 registra la v7. E2E no aplica: sin
      cambios de UI.
---

# Objetivo

Que la documentación de diseño, el glosario y las decisiones reflejen la UI
implementada de REQ-033 v7, sin contradicciones con el relieve, las listas, el
panel, las siluetas ni el cursor.

# Contexto

TASK-0112 a TASK-0117 implementan y verifican la v7. La arquitectura y el
glosario todavía describen el cursor de `--ui-focus`, la transición de 100 ms
solo horizontal y el relieve de 1×. ADR-026 sigue vigente con las decisiones
anteriores.

# Criterios de aceptación

- [x] `docs/design/architecture.md` describe el bisel de `2 × --ui-line` que
      crece hacia fuera, las listas verticales, el panel alineado arriba, la
      figura sin cabeza, las siluetas de slots vacíos y el cursor `--ui-text` de
      4× con transición de 140-160 ms.
- [x] `docs/glossary.md` define «silueta de equipamiento» y actualiza «cursor de
      selección»; «outset» e «inset» reflejan el grosor nuevo.
- [x] ADR-026 queda con una nota de vigencia y se registra ADR-027 con las
      decisiones de la v7, o una enmienda equivalente trazable.
- [x] `docs/decisions/index.md` incluye el ADR nuevo o la enmienda.
- [x] `docs/log.md` registra el cierre documental y enlaza a la evidencia.
- [x] `pnpm run docs:check` y `pnpm run verify` pasan.
- [x] No se reescriben requisitos ya aprobados ni evidencia histórica.

# Plan de test

- Documental: `pnpm run docs:check`.
- Integración: `pnpm run verify`.
- Manual: revisar que arquitectura, glosario y ADR no se contradicen entre sí ni
  con REQ-033 v7.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0118/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check` y `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**` y `docs/log.md`.
- Sin cambios en `src/**`, `tests/**`, `index.html` ni `public/**`.
- Sin cambios en requisitos, arnés ni plantillas.
- No se reescribe evidencia histórica.

# No objetivos

- Implementar o corregir UI.
- Cambiar reglas, alcance o valores.
- Sustituir la figura por un sprite PNG.
