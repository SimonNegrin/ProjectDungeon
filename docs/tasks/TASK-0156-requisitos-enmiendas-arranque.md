---
type: Task
id: TASK-0156
title: "Requisitos: enmiendas del arranque en REQ-022, REQ-024 y REQ-031"
description: "Anotar en REQ-022, REQ-024 y REQ-031 las enmiendas de REQ-016 v3 sobre miniatura por variante, «Cargar» en el menú principal y «Nueva partida» al paso 1."
status: stable
task_status: backlog
task_type: docs
requirement: REQ-016
requirement_ids: [T-010]
depends_on: [TASK-0127]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: requirements-writer
attempts: 0
artifacts: artifacts/TASK-0156/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que las hojas afectadas por REQ-016 v3 dejen constancia de las tres enmiendas
aprobadas sin cambiar sus reglas ni duplicar el detalle del arranque.

# Contexto

REQ-016
[T-010](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos)
pide anotar las enmiendas a REQ-022, REQ-024 y REQ-031. La documentación de
diseño, glosario y alcance es TASK-0128; esta tarea es solo de
`docs/requirements/**` y se separa para que tenga un único ejecutor.

# Criterios de aceptación

- [ ] REQ-022 anota que la miniatura del HUD usa la variante elegida, no un
      retrato fijo del arquetipo.
- [ ] REQ-024 anota que «Cargar» aparece también en el menú principal y que la
      pausa conserva el suyo; la validación y la carga siguen en REQ-024.
- [ ] REQ-031 anota que «Nueva partida» del resultado lleva al paso 1 y que no
      existe reinicio rápido ni con la misma party y semilla.
- [ ] Las notas remiten a REQ-016 v3 y no reescriben requisitos ni decisiones
      vigentes.
- [ ] `docs/log.md` registra la anotación.
- [ ] `pnpm run docs:check` pasa y no hay enlaces rotos.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar que las tres hojas no contradicen REQ-016 v3 ni el menú
  implementado.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0156/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |

# Restricciones

- Solo `docs/requirements/**` y `docs/log.md`.
- No cambiar reglas, versiones ni requisitos creativos.
- No editar ADR, glosario ni alcance; eso es TASK-0128.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Implementar la miniatura, la carga o el resultado.
- Documentar hotseat, guardado o botín.
- Añadir preguntas abiertas nuevas.
