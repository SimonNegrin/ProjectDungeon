---
type: Task
id: TASK-0133
title: "Motor: cadáver de enemigo y descarte"
description: "Al morir un enemigo, crear un contenedor solo con sus objetos saqueables, descartar el resto y retirar el contenedor cuando se vacía."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-034
requirement_ids: [R-001, R-004, R-007, R-010, T-004, T-007]
depends_on: [TASK-0130, TASK-0131]
unlocks: [TASK-0134, TASK-0135, TASK-0136, TASK-0138, TASK-0142, TASK-0143, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0133/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que un enemigo muerto deje cadáver solo cuando conserva al menos un objeto
saqueable, que el cadáver contenga exactamente esos objetos y que desaparezca al
coger el último.

# Contexto

TASK-0130 decide `lootable` y TASK-0131 aporta el modelo de cadáver contenedor.
REQ-034 fija el filtrado en
[R-001 y R-004](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-creativos-decididos)
y el contenedor en
[T-004 y T-007](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos).
El render y el panel son TASK-0135 y TASK-0136.

# Criterios de aceptación

- [ ] Al morir un enemigo, se crea un `Container` de cadáver en su casilla solo
      con las instancias `lootable` de su equipo y mochila.
- [ ] Las instancias no saqueables se descartan con la unidad; no quedan
      visibles, recuperables ni en el contenedor.
- [ ] Si no hay ninguna instancia saqueable, no se crea contenedor.
- [ ] La unidad muerta permanece en `enemies` con 0 PV y sin objetos, para
      victoria, derrota y estado.
- [ ] El cadáver no bloquea el paso y puede compartir casilla con otros
      cadáveres o con un vivo.
- [ ] Al retirar el último objeto del cadáver de enemigo, el contenedor se
      elimina del estado; el cadáver de jugador no se elimina al vaciarse.
- [ ] Tests de enemigo con y sin botín, solo saqueables, descarte, retirada del
      vacío y persistencia del cadáver de jugador; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/inventory.test.ts` y `engine.test.ts`.
- Integración: muerte con espada y escudo, con uno saqueable y con ninguno.
- E2E / visual: no aplica; el render es TASK-0135.
- Manual: inspeccionar el snapshot tras vaciar un cadáver de enemigo.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0133/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/inventory.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el render ni el panel; eso es TASK-0135 y TASK-0136.
- No cambiar la tirada ni la política de botín.
- No tocar el cadáver de jugador más allá de compartir el modelo de contenedor.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Saqueo desde el mismo tile y coste 0.
- Guardado o migración de formato.
- Objetos nuevos, llaves o cofres.
- Animación de muerte o de caída de objetos.
