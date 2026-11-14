---
type: Task
id: TASK-0157
title: "Requisitos: enmiendas de botín"
description: "Anotar en REQ-017, REQ-018, REQ-020, REQ-021, REQ-024 y REQ-026 las enmiendas de REQ-034 sobre cadáver condicionado, saqueo sin coste y campos de guardado."
status: stable
task_status: backlog
task_type: docs
requirement: REQ-034
requirement_ids: [T-012]
depends_on: [TASK-0130, TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135, TASK-0136, TASK-0138]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: requirements-writer
attempts: 0
artifacts: artifacts/TASK-0157/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que las seis hojas enmendadas por REQ-034 dejen constancia de la regla nueva sin
duplicar el detalle ni contradecir sus propias decisiones.

# Contexto

REQ-034
[T-012](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos)
pide anotar las enmiendas. La documentación de diseño, glosario y alcance es
TASK-0143; esta tarea es solo de `docs/requirements/**` para que tenga un único
ejecutor. REQ-020 sigue en `draft`: se anota la enmienda sin cerrarla.

# Criterios de aceptación

- [ ] REQ-017 anota que el cadáver de enemigo deja de ser universal y solo existe
      con al menos un objeto saqueable.
- [ ] REQ-020 anota que su R-002 se limita a cadáveres con saqueables y que R-008
      separa cofre (adyacente, 1 acción) y cadáver (mismo tile, 0 acciones); no
      se cierra el borrador.
- [ ] REQ-021 anota que su R-007 se concreta en mismo tile, coste 0 para el vivo
      y una acción por objeto para el fantasma; la resurrección sigue exigiendo
      adyacencia.
- [ ] REQ-024 anota que el esquema v1 incluye `lootable` y contenedores de
      cadáver, que cargar no tira de nuevo y que se sube `format_version` si la
      v1 ya se publicó.
- [ ] REQ-018 anota el coste 0 del cadáver y el 1 acción del cofre; REQ-026 anota
      la misma separación sin cambiar las transferencias gratuitas.
- [ ] Las notas remiten a REQ-034 v1 y no reescriben requisitos vigentes;
      `docs/log.md` lo registra.
- [ ] `pnpm run docs:check` pasa y no hay enlaces rotos.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar que las seis hojas no se contradicen entre sí ni con REQ-034.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0157/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |

# Restricciones

- Solo `docs/requirements/**` y `docs/log.md`.
- No cerrar REQ-020 ni cambiar sus preguntas abiertas.
- No editar ADR, glosario ni alcance; eso es TASK-0143.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Implementar botín, cadáveres o saqueo.
- Cambiar probabilidades, pool o reglas.
- Documentar hotseat, guardado o arranque.
