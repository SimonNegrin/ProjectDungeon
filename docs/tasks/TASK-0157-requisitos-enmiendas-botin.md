---
type: Task
id: TASK-0157
title: "Requisitos: enmiendas de botín"
description: "Anotar en REQ-017, REQ-018, REQ-020, REQ-021, REQ-024 y REQ-026 las enmiendas de REQ-034 sobre cadáver condicionado, saqueo sin coste y campos de guardado."
status: stable
task_status: done
task_type: docs
requirement: REQ-034
requirement_ids: [T-012]
depends_on: [TASK-0130, TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135, TASK-0136, TASK-0138]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T18:51:34Z
assignee: requirements-writer
attempts: 1
artifacts: artifacts/TASK-0157/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T18:51:34Z
    note: >-
      Diff de `b06ebd8` revisado contra REQ-034 v1 y las seis hojas: cadáver
      condicionado, coste 0 del cadáver y 1 acción del cofre, `lootable` y
      contenedores en la v1 sin nueva tirada; REQ-020 sigue `draft`. Sin cambios
      en `src/`, tests, ADR, glosario ni alcance. `docs:check` 700/160 y `verify`
      107/1678, tsc, build y bundle OK. Informe en
      `artifacts/TASK-0157/attempt-1/report.md`.
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

- [x] REQ-017 anota que el cadáver de enemigo deja de ser universal y solo existe
      con al menos un objeto saqueable.
- [x] REQ-020 anota que su R-002 se limita a cadáveres con saqueables y que R-008
      separa cofre (adyacente, 1 acción) y cadáver (mismo tile, 0 acciones); no
      se cierra el borrador.
- [x] REQ-021 anota que su R-007 se concreta en mismo tile, coste 0 para el vivo
      y una acción por objeto para el fantasma; la resurrección sigue exigiendo
      adyacencia.
- [x] REQ-024 anota que el esquema v1 incluye `lootable` y contenedores de
      cadáver, que cargar no tira de nuevo y que se sube `format_version` si la
      v1 ya se publicó.
- [x] REQ-018 anota el coste 0 del cadáver y el 1 acción del cofre; REQ-026 anota
      la misma separación sin cambiar las transferencias gratuitas.
- [x] Las notas remiten a REQ-034 v1 y no reescriben requisitos vigentes;
      `docs/log.md` lo registra.
- [x] `pnpm run docs:check` pasa y no hay enlaces rotos.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar que las seis hojas no se contradicen entre sí ni con REQ-034.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0157/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check`
- [x] Commit SHA: implementación `b06ebd8`; cierre en el commit de cierre

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
