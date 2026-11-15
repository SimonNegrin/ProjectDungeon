---
type: Task
id: TASK-0136
title: "Host/panel: saqueo en el mismo tile y coste 0"
description: "Permitir abrir y transferir desde un cadáver en el mismo tile sin acción ni MP, con «coger todo», y mantener los cofres adyacentes con 1 acción."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-034
requirement_ids: [R-005, R-006, R-007, T-006]
depends_on: [TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135]
unlocks: [TASK-0142, TASK-0143, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0136/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que saquear un cadáver sea rápido y gratuito: desde el mismo tile, con
transferencia directa y «coger todo», sin gastar acción ni MP para un vivo y con
una acción por objeto para el fantasma.

# Contexto

TASK-0135 dibuja los cadáveres desde contenedores. REQ-034
[T-006](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos)
separa cadáver (mismo tile, coste 0) de cofre (adyacente, 1 acción). La
transferencia existente de `src/game/inventory.ts` y el panel de
`src/host/inventory-panel.ts` son la base; no se crea una segunda ruta.

# Criterios de aceptación

- [ ] El panel lista los cadáveres de la casilla actual y no los de casillas
      adyacentes.
- [ ] Abrir/registrar un cadáver y transferir objetos reutiliza la transferencia
      de contenedores existente; no hay una segunda ruta de saqueo.
- [ ] Un vivo saquea con 0 acciones y 0 MP y dispone de «coger todo».
- [ ] El fantasma mueve un objeto por acción; no puede usar ni equipar lo que
      coge.
- [ ] Los cofres conservan adyacencia y 1 acción de apertura; la UI anuncia
      «sin coste» para cadáver y «1 acción» para cofre.
- [ ] Al coger el último objeto de un cadáver de enemigo, el contenedor
      desaparece; el cadáver de jugador permanece.
- [ ] El panel solo se abre en el turno del activo y es público.
- [ ] Tests de mismo tile frente a adyacente, coste 0, «coger todo», fantasma,
      retirada al vaciar y cofre sin cambios; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/inventory-panel.test.ts` y `inventory-cursor.test.ts`.
- Integración: saquear un cadáver desde el mismo tile y desde uno adyacente.
- E2E / visual: captura del panel con cadáver y coste; la suite completa va en
  TASK-0142.
- Manual: comprobar que «coger todo» no gasta acción.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0136/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/inventory-panel.test.ts tests/unit/host/inventory-cursor.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar las reglas de botín ni el render de cadáveres.
- No implementar una transferencia paralela a la de contenedores.
- No tocar cofres, su adyacencia ni su coste.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Guardado o carga de `lootable` y contenedores.
- Entrega directa entre jugadores.
- Saqueo desde adyacente o a distancia.
- Animación de caída o anuncio de probabilidad.
