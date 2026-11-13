---
type: Task Brief
title: "TASK-0091: brief del intento 1"
description: Auditoría código↔documento y texto listo para aplicar en diseño, arquitectura, glosario y notas de vigencia.
task: TASK-0091
attempt: 1
status: stable
brief_bytes: 2889
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T16:20:00Z }
---

# Objetivo

Auditar el código de REQ-029 ya implementado y entregar en
`artifacts/TASK-0091/attempt-1/docs-plan.md` el texto listo para aplicar en
`docs/design/turn-economy.md#combate`, `docs/design/architecture.md` (combate y
magia), `docs/glossary.md` y las notas de vigencia de REQ-010/014/015/025, más
una lista de discrepancias código ↔ documento con archivo y línea. Tú no editas
`docs/**`; el lead aplica diseño y glosario, y requirements-writer las notas de
requisito.

# No objetivos

- Editar `docs/**`, `src/**` o `tests/**`; sin código de producción.
- Cambiar reglas, valores, perfiles, armas o hechizos; sin rebalanceo.
- Rehacer el historial de REQ-010/REQ-015 ni la tabla histórica de REQ-010.
- Bestiario completo, QA visual o E2E (TASK-0092) ni dependencias nuevas.

# Invariantes

- Fuente de verdad: `src/game/**` y REQ-029/ADR-023; el código manda sobre lo ya
  escrito. Cada valor del plan cita archivo y línea.
- Ninguna fórmula de daño único puede quedar presentada como vigente: solo como
  historia marcada.
- No copies la tarea ni los criterios; enlaza. No pegues salidas largas.

# Criterios de aceptación

En [TASK-0091 § Criterios](../../../docs/tasks/TASK-0091-docs-formulas-bandas-vigencia.md#criterios-de-aceptación).
Requisito: [REQ-029 T-010](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos).

# Contexto mínimo

- Código: `src/game/damage.ts` (resolvedor único), `equipment.ts` (7 armas con
  `damagePackets`), `roster.ts` y `bestiary.ts` (perfiles de 5 bandas),
  `spells.ts` (hechizos con `damagePacket`), `combat.ts`/`magic.ts` (orden del RNG
  y desglose), `types.ts` (tipos, bandas, `DamagePacketBreakdown`).
- Documentos: `turn-economy.md#combate` (fórmula/armas/tabla históricas),
  `architecture.md#combate-y-azar` y `##magia-y-maná`, `glossary.md`,
  `ADR-023`, notas de vigencia de REQ-010/014/015/025.
- Módulos de UI relevantes solo como referencia del desglose y bandas.

# Artefactos

`artifacts/TASK-0091/attempt-1/`: `report.md` (anexo B, ≤4 KB), `docs-plan.md`,
`docs-check-output.txt` y `verify-output.txt`.

# Riesgos y decisiones abiertas

- Sospechas a confirmar o descartar: el glosario no tiene entrada «perfil»;
  «Acción» incluye esperar y REQ-026 no la gasta; turn-economy dice que la magia
  «aún no está implementada»; architecture afirma que la armadura entra en el
  daño mágico.
- Si una discrepancia exige cambiar una regla o un valor, no la resuelvas: va en
  el informe como decisión para requirements-writer.
