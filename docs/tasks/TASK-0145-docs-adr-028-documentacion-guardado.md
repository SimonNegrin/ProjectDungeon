---
type: Task
id: TASK-0145
title: "Docs: ADR-028 y documentación de guardado"
description: "Registrar ADR-028 del formato v1 y actualizar arquitectura, glosario, visión y alcance con la persistencia local por archivo."
status: stable
task_status: backlog
task_type: docs
requirement: REQ-024
requirement_ids: [T-011]
depends_on: [TASK-0138, TASK-0140, TASK-0141]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-lead
attempts: 0
artifacts: artifacts/TASK-0145/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que ADR-028 y la documentación de diseño describan el guardado v1 implementado
—zip, manifiesto, esquema estricto y persistencia local— sin dejar la
persistencia como pregunta abierta.

# Contexto

REQ-024
[T-011](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos) pide
ADR-028 y actualizar glosario, arquitectura, visión y alcance. TASK-0138 define
el esquema, TASK-0140 guarda y TASK-0141 carga. Las notas en hojas de requisitos
son TASK-0158.

# Criterios de aceptación

- [ ] ADR-028 registra el formato `.zip` con `manifiesto.json` y `partida.json`,
      `format_version: 1`, validación estricta, límites de 5/20 MB y 4 entradas,
      ausencia de presentación y carga sin nueva tirada de botín.
- [ ] ADR-028 anota que la v1 usa el `Container` actual y que se sube
      `format_version` si REQ-020 cambia el modelo antes de publicar.
- [ ] Arquitectura, glosario, visión y alcance describen la persistencia local
      por archivo, sin cuentas, nube ni guardado entre runs.
- [ ] `docs/decisions/index.md` y `docs/log.md` recogen ADR-028 y el cierre.
- [ ] No se editan hojas de `docs/requirements/**`; eso es TASK-0158.
- [ ] `pnpm run docs:check` y `pnpm run verify` pasan.

# Plan de test

- Documental: `pnpm run docs:check`.
- Integración: `pnpm run verify`.
- Manual: contrastar ADR-028, arquitectura y alcance con el archivo real.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0145/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check` y `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**`, `docs/vision.md`,
  `docs/scope.md` y `docs/log.md`.
- No cambiar reglas, formato ni límites.
- No reescribir requisitos aprobados ni evidencia histórica.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Notas en REQ-016 y REQ-031; van en TASK-0158.
- Cambios de código, UI o formato.
- Documentar botín, hotseat o arranque.
