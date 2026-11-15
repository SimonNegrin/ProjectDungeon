---
type: Task
id: TASK-0158
title: "Requisitos: notas de guardado en REQ-016 y REQ-031"
description: "Anotar en REQ-016 y REQ-031 las enmiendas de REQ-024 v3 sobre «Cargar» en el menú principal, guardado restringido, carga en el activo y ausencia de reinicio rápido."
status: stable
task_status: done
task_type: docs
requirement: REQ-024
requirement_ids: [T-011]
depends_on: [TASK-0138, TASK-0140, TASK-0141]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T18:51:34Z
assignee: requirements-writer
attempts: 1
artifacts: artifacts/TASK-0158/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T18:51:34Z
    note: >-
      Diff de `51e302c` revisado contra REQ-024 v3: cargador único, «Nueva» con
      confirmación, guardado en fase de personajes sin animación, carga en el
      activo y sin reinicio rápido; R-019, R-020 y T-010 sin reescribir y las
      decisiones de reinicio ya `sustituida`. Sin duplicar formato ni límites.
      `docs:check` 700/160 y `verify` 107/1678, tsc, build y bundle OK. Informe
      en `artifacts/TASK-0158/attempt-1/report.md`.
---

# Objetivo

Que REQ-016 y REQ-031 dejen constancia de cómo las enmienda REQ-024 v3, sin
duplicar el formato ni cambiar las reglas de pausa, guardado y carga.

# Contexto

REQ-024
[T-011](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos) pide
anotar REQ-016 y REQ-031. La documentación de diseño y ADR-028 es TASK-0145;
esta tarea es solo de `docs/requirements/**` para que tenga un único ejecutor.

# Criterios de aceptación

- [x] REQ-016 anota que «Cargar» del menú principal usa el cargador de REQ-024 y
      que «Nueva» desde la pausa descarta la partida tras confirmar.
- [x] REQ-031 anota que su pausa es la de REQ-024, que guardar solo se permite en
      fase de personajes y sin animación, que cargar devuelve el control al
      activo y que no existe reinicio rápido.
- [x] Las notas remiten a REQ-024 v3 y no reescriben R-019, R-020 ni T-010; se
      marcan como sustituidas las partes que correspondan.
- [x] No se adelanta el formato v1 ni se duplican límites o manifiesto.
- [x] `docs/log.md` registra la anotación.
- [x] `pnpm run docs:check` pasa y no hay enlaces rotos.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar que REQ-016 y REQ-031 no contradicen REQ-024 v3 ni el menú
  implementado.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0158/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check`
- [x] Commit SHA: implementación `51e302c`; cierre en el commit de cierre

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |

# Restricciones

- Solo `docs/requirements/**` y `docs/log.md`.
- No cambiar reglas, versiones ni requisitos creativos.
- No editar ADR, glosario, visión ni alcance; eso es TASK-0145.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Implementar guardado, carga o pausa.
- Cambiar el formato v1 o sus límites.
- Documentar botín, hotseat o arranque.
- Añadir preguntas abiertas nuevas.
