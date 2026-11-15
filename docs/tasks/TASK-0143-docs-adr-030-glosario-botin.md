---
type: Task
id: TASK-0143
title: "Docs: ADR-030 y glosario de botín"
description: "Registrar ADR-030 del modelo de saqueabilidad y RNG derivado, y actualizar glosario y alcance con cadáver condicionado y saqueo sin coste."
status: stable
task_status: blocked
task_type: docs
requirement: REQ-034
requirement_ids: [T-012]
depends_on: [TASK-0130, TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135, TASK-0136, TASK-0138]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-lead
attempts: 1
artifacts: artifacts/TASK-0143/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que ADR-030, el glosario y el alcance describan el botín implementado: qué hace
saqueable a un objeto, cómo se tira, qué cadáver queda y cuánto cuesta saquearlo.

# Contexto

REQ-034
[T-012](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos)
reparte la documentación. Esta tarea cubre decisiones, glosario y alcance; las
enmiendas a REQ-017/018/020/021/024/026 son TASK-0157. El modelo implementado
sale de TASK-0130 a TASK-0136 y del esquema de TASK-0138.

# Criterios de aceptación

- [ ] ADR-030 registra `lootable` por instancia, `lootPolicy`
      `common|progression`, la tirada 25 %/100 %, el RNG derivado, el cadáver
      como `Container` y la retirada al vaciarse.
- [ ] ADR-030 deja claro que cargar no vuelve a tirar y que el RNG principal no
      se consume.
- [ ] El glosario define «objeto saqueable» y actualiza «cadáver» y el coste de
      saqueo (mismo tile, 0 acción/MP; cofre 1 acción).
- [ ] El alcance refleja el cadáver de enemigo condicionado al botín y reserva
      llaves y progresión para su hoja.
- [ ] `docs/decisions/index.md` y `docs/log.md` recogen ADR-030 y el cierre.
- [ ] No se editan hojas de `docs/requirements/**`; eso es TASK-0157.
- [ ] `pnpm run docs:check` y `pnpm run verify` pasan.

# Plan de test

- Documental: `pnpm run docs:check`.
- Integración: `pnpm run verify`.
- Manual: contrastar ADR-030, glosario y alcance con REQ-034 v1 y el código.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0143/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check` y `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**` y `docs/log.md`.
- No cambiar reglas, probabilidad ni pool.
- No reescribir requisitos aprobados ni evidencia histórica.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Enmiendas en REQ-017/018/020/021/024/026; van en TASK-0157.
- Cambios de código, UI o arte.
- Documentar hotseat, guardado o arranque.
